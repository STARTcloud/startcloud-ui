import { linesFor, taskRow } from './fleet-tasks.js';
import { machineOf, removeMachine, setStatus, statsOf } from './fleet.js';
import { now, ok, refusal } from './kit.js';
import { openSocket } from './socket.js';
import { emit } from './stream.js';

const TASK_LIMIT = 50;
const ACTIVE = ['pending', 'running'];
const ENDED = ['completed', 'completed_with_errors', 'failed', 'cancelled'];
const STOPPED = { zoneweaver: 'installed', hyperweaver: 'stopped' };
const SETTLED = {
  start: () => 'running',
  stop: host => STOPPED[host.kind],
  reset: () => 'running',
  pause: () => 'paused',
  suspend: () => 'suspended',
  resume: () => 'running',
  zone_detach: () => 'configured',
  zone_attach: () => 'installed',
};
const steps = { begin: null, finish: null };
const effects = new Map();
const endListeners = new Set();

/**
 * Adds a listener called with the host and the task each time a task ends.
 *
 * @param {Function} listener - Called with the host and the task
 * @returns {void}
 */
export const onTaskEnd = listener => {
  endListeners.add(listener);
};

export const stoppedWord = host => STOPPED[host.kind];

/**
 * What a completed task of one operation changes beyond a machine's
 * state: `effect(host, task)` runs once when a task of `operation`
 * completes, before the host's stats are announced.
 *
 * @param {string} operation - The task's `operation`
 * @param {Function} effect - Called with the host and the task
 * @returns {void}
 */
export const settles = (operation, effect) => {
  effects.set(operation, effect);
};

const frame = (type, task, more) => JSON.stringify({ type, task_id: task.id, ...more });

const listenersOf = (host, task) => [...(host.streams.get(task.id) || [])];

/**
 * One task row as the host's own agent answers it: hyperweaver-agent's
 * row with `updatedAt`, zoneweaver-agent's with the machine under
 * `zone_name` and `updatedAt`.
 *
 * @param {Object} host - The host
 * @param {Object} task - The row the mock holds
 * @returns {Object} The row on the wire
 */
export const wireTask = (host, task) => {
  const updatedAt = task.completed_at || task.started_at || task.created_at;
  if (host.kind !== 'zoneweaver') {
    return { ...task, updatedAt };
  }
  const { machine_name: zone, ...rest } = task;
  return { ...rest, zone_name: zone, updatedAt };
};

const announceTask = (host, task) =>
  emit({ host, topic: 'tasks', event: 'task-updated', data: wireTask(host, task) });

export const announceStats = host =>
  emit({ host, topic: 'hosts', event: 'stats-updated', data: statsOf(host) });

const pushOutput = (host, task, data) => {
  const entry = { stream: 'stdout', data, timestamp: Date.now() };
  host.outputs.set(task.id, [...(host.outputs.get(task.id) || []), entry]);
  listenersOf(host, task).forEach(connection => connection.send(frame('output', task, entry)));
};

const movedInfo = task => {
  const info = task.progress_info;
  if (!info || typeof info !== 'object') {
    return info;
  }
  if (Number.isFinite(info.total_bytes)) {
    const received = Math.round((info.total_bytes * task.progress_percent) / 100);
    return { ...info, received_bytes: received };
  }
  if (Number.isFinite(info.ansible_percent)) {
    return { ...info, ansible_percent: task.progress_percent };
  }
  return info;
};

const refreshParent = (host, task) => {
  const parent = host.tasks.find(row => row.id === task.parent_task_id);
  if (!parent) {
    return;
  }
  const children = host.tasks.filter(row => row.parent_task_id === parent.id);
  const done = children.filter(row => ENDED.includes(row.status)).length;
  const failed = children.filter(row => row.status === 'failed').length;
  parent.progress_percent = Math.round((done / children.length) * 100);
  if (done === children.length && !ENDED.includes(parent.status)) {
    parent.status = failed ? 'failed' : 'completed';
    parent.completed_at = now();
  }
  parent.progress_info = {
    completed_tasks: children.filter(row => row.status === 'completed').length,
    failed_tasks: failed,
    total_tasks: children.length,
    status: parent.status,
  };
  announceTask(host, parent);
};

const release = (host, task) => {
  const held = host.tasks.filter(row => row.depends_on === task.id && row.status === 'pending');
  held.forEach(row => {
    if (task.status === 'completed') {
      steps.begin(host, row);
    } else {
      steps.finish(host, row, 'cancelled');
    }
  });
};

const finish = (host, task, status) => {
  task.status = status;
  task.completed_at = now();
  announceTask(host, task);
  listenersOf(host, task).forEach(connection => {
    connection.send(frame('status', task, { status }));
    connection.close();
  });
  host.streams.delete(task.id);
  release(host, task);
  refreshParent(host, task);
  endListeners.forEach(listener => listener(host, task));
};

const settle = (host, task) => {
  const name = task.machine_name;
  const settled = SETTLED[task.operation];
  const effect = effects.get(task.operation);
  if (effect) {
    effect(host, task);
    announceStats(host);
    return;
  }
  if (!machineOf(host, name) || (!settled && task.operation !== 'delete')) {
    return;
  }
  if (settled) {
    setStatus(host, name, settled(host));
  } else {
    removeMachine(host, name);
  }
  announceStats(host);
};

const begin = (host, task, from = 0) => {
  const lines = linesFor(task.operation);
  task.status = 'running';
  task.started_at ||= now();
  announceTask(host, task);
  lines.slice(from).forEach((line, offset) => {
    const written = from + offset + 1;
    pushOutput(host, task, line);
    task.progress_percent = Math.round((written / lines.length) * 100);
    task.progress_info = movedInfo(task);
    if (written < lines.length) {
      announceTask(host, task);
    }
  });
  finish(host, task, 'completed');
  settle(host, task);
};

steps.begin = begin;
steps.finish = finish;

const isParent = (host, task) => host.tasks.some(row => row.parent_task_id === task.id);

const resume = (host, task) => {
  if (task.status !== 'running' || isParent(host, task)) {
    return;
  }
  const lines = linesFor(task.operation);
  const from = Math.min(
    lines.length - 1,
    Math.floor((Number(task.progress_percent) / 100) * lines.length)
  );
  begin(host, task, from);
};

/**
 * Queue one task on a host as the agents do: the row is created pending,
 * announced on the `tasks` topic, and runs to its end at once, one output
 * line and one `task-updated` a step, unless it waits for the task `after`
 * names, which releases it when it completes and cancels it when it does
 * not, at once when that task has already ended.
 *
 * @param {Object} options - `host`, `by`, `operation`, `target`, and optionally `metadata`, `after` and `priority`
 * @returns {Object} The task row
 */
export const queue = ({ host, by, operation, target, metadata, after, priority }) => {
  const task = taskRow({
    machine: target,
    operation,
    status: 'pending',
    by,
    more: {
      created_at: now(),
      metadata: metadata ?? null,
      depends_on: after ?? null,
      ...(priority ? { priority } : {}),
    },
  });
  host.tasks = [task, ...host.tasks];
  announceTask(host, task);
  const held = after ? host.tasks.find(row => row.id === after) : null;
  if (!after) {
    begin(host, task);
  } else if (held && ENDED.includes(held.status)) {
    release(host, held);
  }
  return task;
};

const byNewest = (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at);

const wanted = url => {
  const floor = Number(url.searchParams.get('min_priority')) || 0;
  const parent = url.searchParams.get('parent_task_id') || '';
  const status = url.searchParams.get('status') || '';
  const machine = url.searchParams.get('machine_name') || '';
  return task =>
    Number(task.priority) >= floor &&
    (!parent || task.parent_task_id === parent) &&
    (!status || task.status === status) &&
    (!machine || task.machine_name === machine);
};

export const listedTasks = ctx => {
  const { host, url } = ctx;
  const limit = Number(url.searchParams.get('limit')) || TASK_LIMIT;
  const tasks = host.tasks.filter(wanted(url)).sort(byNewest);
  return ok({
    tasks: tasks.slice(0, limit).map(task => wireTask(host, task)),
    running_count: host.tasks.filter(task => task.status === 'running').length,
  });
};

const taskOf = ctx => ctx.host.tasks.find(task => task.id === ctx.params.task) || null;

const activeChildren = (host, task) =>
  host.tasks.filter(row => row.parent_task_id === task.id && ACTIVE.includes(row.status));

const cancel = (host, task) => {
  const children = activeChildren(host, task);
  finish(host, task, 'cancelled');
  children.forEach(row => {
    if (ACTIVE.includes(row.status)) {
      finish(host, row, 'cancelled');
    }
  });
};

export const shownTask = ctx => {
  const task = taskOf(ctx);
  return task ? ok({ ...wireTask(ctx.host, task), output: null }) : refusal(404, 'Task not found');
};

export const shownOutput = ctx => {
  const task = taskOf(ctx);
  return task
    ? ok({ task_id: task.id, status: task.status, output: ctx.host.outputs.get(task.id) || [] })
    : refusal(404, 'Task not found');
};

/**
 * Cancel one task as the agents answer it: a pending or running task ends
 * `cancelled`, a parent taking its running and pending subtasks with it,
 * a task that already ended is refused with 400 and its `current_status`,
 * and the zoneweaver kind adds `was_running`.
 *
 * @param {Object} ctx - The request's context
 * @returns {Object} The answer
 */
export const cancelledTask = ctx => {
  const task = taskOf(ctx);
  if (!task) {
    return refusal(404, 'Task not found');
  }
  if (!ACTIVE.includes(task.status)) {
    return refusal(400, 'Can only cancel pending or running tasks', {
      current_status: task.status,
    });
  }
  const running = task.status === 'running';
  cancel(ctx.host, task);
  return ok({
    success: true,
    task_id: task.id,
    ...(ctx.host.kind === 'zoneweaver' ? { was_running: running } : {}),
    message: running ? 'Task cancellation requested' : 'Task cancelled successfully',
  });
};

/**
 * The `/tasks/{id}/stream` socket: the output the task already wrote, then
 * every new line as an `output` frame and a `status` frame at the end; a
 * task that already ended gets the replay and the status at once, and a
 * seeded running task runs to its end when its first stream opens.
 *
 * @param {Object} options - `req`, `socket`, `host` and `task`
 * @returns {void}
 */
export const openTaskStream = ({ req, socket, host, task }) => {
  const held = { connection: null };
  const connection = openSocket({
    req,
    socket,
    onText: () => null,
    onClose: () => host.streams.get(task.id)?.delete(held.connection),
  });
  held.connection = connection;
  const written = host.outputs.get(task.id) || [];
  written.forEach(entry => connection.send(frame('output', task, entry)));
  if (!ACTIVE.includes(task.status)) {
    connection.send(frame('status', task, { status: task.status }));
    connection.close();
    return;
  }
  host.streams.set(task.id, new Set([...(host.streams.get(task.id) || []), connection]));
  resume(host, task);
};
