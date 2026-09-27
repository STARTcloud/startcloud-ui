import { featuresOf, machineOf, setStatus, verdictOf } from './fleet.js';
import { ok, problem, refusal } from './kit.js';
import { announceStats, queue, stoppedWord } from './tasks.js';

const GUEST_MODES = ['powerdown', 'reboot', 'halt'];
const GUEST_SETTLE_MS = 1800;
const LAUNCH_PATH = 'machines/:name/applications/:application/launch';
const NOT_RUNNING = 'Machine is not running';
const MACHINE_MISSING = 'Machine not found';
const NO_APPLICATION =
  'No application by that name is configured (applications[] in the agent configuration)';
const NO_EXECUTABLE = 'Application executable does not exist on the agent host: ';
const NO_CHECKPOINT = 'Machine has no suspend checkpoint — nothing to resume';
const NOT_PAUSED = 'Can only resume a paused machine';
const UTM_POWERDOWN = 'Guest powerdown requested — rides utmctl stop (graceful)';
const READY_ONLY = 'ready applies to installed (halted) machines only';
const DETACH_ONLY = 'detach applies to installed (halted) machines only';
const ATTACH_ONLY = 'attach applies to configured (detached) machines only';
const INCOMPLETE_RUNNING = 'mark incomplete refuses on a running machine — stop it first';
const RELATIVE_PATH = 'target_path must be an absolute path';
const WORDS = {
  zoneweaver: {
    missing: 'Zone not found',
    running: 'Zone is already running',
    stopped: 'Zone is already stopped',
    reset: 'Machine is not running — reset applies to running machines only',
    suspend: 'Can only suspend a running machine',
    nmi: 'Machine is not running — NMI applies to running machines only',
    deleting: 'Zone is running. Use force=true to stop and delete',
    halted: ['installed', 'configured'],
    movable: ['installed', 'configured'],
    unmovable: 'move applies to halted machines only',
    moving: 'zone_move',
    moved: 'Move task queued',
    status: true,
  },
  hyperweaver: {
    missing: MACHINE_MISSING,
    running: 'Machine is already running',
    stopped: 'Machine is already stopped',
    reset: 'Can only reset a running machine',
    suspend: 'Can only suspend a running machine',
    pause: 'Can only pause a running machine',
    nmi: 'Can only inject an NMI into a running machine',
    deleting: 'Machine is running. Use force=true to stop and delete',
    halted: ['stopped', 'configured', 'installed', 'not_found'],
    movable: ['stopped', 'aborted', 'installed'],
    unmovable: 'Machine must be powered off to move its files',
    moving: 'machine_move',
    moved: 'Move task queued successfully',
    status: false,
  },
};

const utmRefusal = mode =>
  `guest ${mode} is not supported on utm machines — only powerdown (rides utmctl stop)`;

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const statusOf = row => ({ current_status: row.status });

const found =
  (handler, missing = '') =>
  ctx => {
    const words = WORDS[ctx.host.kind];
    const row = machineOf(ctx.host, nameOf(ctx));
    return row ? handler({ ...ctx, row, words }) : refusal(404, missing || words.missing);
  };

const only = (kind, handler) => ctx => {
  if (ctx.host.kind !== kind) {
    return problem(404, 'Not Found');
  }
  return handler(ctx);
};

const zone = handler => only('zoneweaver', found(handler, MACHINE_MISSING));

const queued = (ctx, { operation, message, metadata, more = {} }) => {
  const { host, person, row } = ctx;
  const task = queue({ host, by: person.username, operation, target: row.name, metadata });
  return ok({
    success: true,
    task_id: task.id,
    machine_name: row.name,
    operation,
    status: 'pending',
    message,
    ...more,
  });
};

const already = ({ row, operation, status, message }) =>
  ok({ success: true, machine_name: row.name, operation, status, message });

const refusedState = ({ row, words }, error) => {
  const more = words.status ? statusOf(row) : {};
  return refusal(400, error, more);
};

const start = ctx => {
  const { row, words } = ctx;
  if (row.status === 'running') {
    return already({
      row,
      operation: 'start',
      status: 'already_running',
      message: words.running,
    });
  }
  return queued(ctx, { operation: 'start', message: 'Start task queued successfully' });
};

const stopping = ctx => {
  const { host, row, words, url } = ctx;
  const force = url.searchParams.get('force') === 'true';
  if (words.halted.includes(row.status)) {
    return already({
      row,
      operation: 'stop',
      status: 'already_stopped',
      message: words.stopped,
    });
  }
  return queued(ctx, {
    operation: 'stop',
    message: 'Stop task queued successfully',
    metadata: { force },
    more: host.kind === 'zoneweaver' ? { force } : {},
  });
};

const restart = ctx => {
  const { host, person, row } = ctx;
  const by = person.username;
  const target = row.name;
  const stopTask = queue({ host, by, operation: 'stop', target });
  const startTask = queue({ host, by, operation: 'start', target, after: stopTask.id });
  return ok({
    success: true,
    restart_tasks: { stop_task_id: stopTask.id, start_task_id: startTask.id },
    machine_name: target,
    operation: 'restart',
    status: 'pending',
    message: 'Restart tasks queued successfully',
  });
};

const whileRunning = (operation, label) => ctx => {
  if (ctx.row.status !== 'running') {
    return refusedState(ctx, ctx.words[operation]);
  }
  return queued(ctx, { operation, message: `${label} task queued successfully` });
};

const reset = whileRunning('reset', 'Reset');

const suspend = whileRunning('suspend', 'Suspend');

const pause = whileRunning('pause', 'Pause');

const resumeRefusal = ({ host, row }) => {
  if (host.kind === 'hyperweaver') {
    return row.status === 'paused' ? null : refusal(400, NOT_PAUSED);
  }
  if (row.status === 'running') {
    return refusal(400, 'Machine is already running', statusOf(row));
  }
  return row.status === 'suspended' ? null : refusal(400, NO_CHECKPOINT);
};

const resume = ctx => {
  const refused = resumeRefusal(ctx);
  if (refused) {
    return refused;
  }
  return queued(ctx, { operation: 'resume', message: 'Resume task queued successfully' });
};

const nmi = ctx => {
  const { host, row, words } = ctx;
  if (row.status !== 'running') {
    return refusedState(ctx, words.nmi);
  }
  const into = host.kind === 'zoneweaver' ? ` into ${row.name}` : '';
  return ok({ success: true, machine_name: row.name, message: `NMI injected${into}` });
};

const powerDownSoon = (host, name) => {
  const timer = setTimeout(() => {
    if (machineOf(host, name)) {
      setStatus(host, name, stoppedWord(host));
      announceStats(host);
    }
  }, GUEST_SETTLE_MS);
  timer.unref();
};

const guestAnswer = mode => ctx => {
  const { host, row } = ctx;
  const utm = row.hypervisor === 'utm';
  if (utm && mode !== 'powerdown') {
    return refusal(400, utmRefusal(mode));
  }
  if (row.status !== 'running') {
    return refusal(400, NOT_RUNNING);
  }
  if (mode !== 'reboot') {
    powerDownSoon(host, row.name);
  }
  return ok({
    success: true,
    machine_name: row.name,
    mode,
    message: utm ? UTM_POWERDOWN : `Guest ${mode} requested through the guest agent`,
  });
};

const guestShutdown = ctx => {
  const mode = ctx.body.mode || 'powerdown';
  if (!featuresOf(ctx.host).includes('guest-agent')) {
    return refusal(503, 'Guest agent channel is disabled');
  }
  if (!GUEST_MODES.includes(mode)) {
    return refusal(400, 'mode must be powerdown, reboot, or halt');
  }
  return found(guestAnswer(mode), MACHINE_MISSING)(ctx);
};

const applications = ctx => {
  const rows = ctx.host.applications;
  return ok({ applications: rows, total: rows.length });
};

const launched = application => ctx => {
  const { row } = ctx;
  if (row.status !== 'running') {
    return refusal(400, NOT_RUNNING);
  }
  return ok({
    success: true,
    machine_name: row.name,
    application: application.name,
    host: '127.0.0.1',
    port: 3389,
    message: `${application.name} launch requested on the agent host`,
  });
};

const launch = ctx => {
  const wanted = decodeURIComponent(ctx.params.application);
  const application = ctx.host.applications.find(entry => entry.name === wanted);
  if (!application) {
    return refusal(404, NO_APPLICATION);
  }
  if (!application.exists) {
    return refusal(400, `${NO_EXECUTABLE}${application.path}`);
  }
  return found(launched(application))(ctx);
};

const changed = ({ host, row }, status, message) => {
  setStatus(host, row.name, status);
  announceStats(host);
  return ok({ success: true, machine_name: row.name, message });
};

const ready = ctx => {
  const { row } = ctx;
  if (row.status !== 'installed') {
    return refusal(400, READY_ONLY, statusOf(row));
  }
  return changed(ctx, 'ready', 'Machine readied');
};

const verify = ctx => {
  const { name } = ctx.row;
  return ok({ success: true, machine_name: name, ...verdictOf(name) });
};

const markIncomplete = ctx => {
  const { row } = ctx;
  if (row.status === 'running') {
    return refusal(400, INCOMPLETE_RUNNING, statusOf(row));
  }
  return changed(ctx, 'incomplete', 'Machine marked incomplete');
};

const detach = ctx => {
  const { row } = ctx;
  if (row.status !== 'installed') {
    return refusal(400, DETACH_ONLY, statusOf(row));
  }
  return queued(ctx, { operation: 'zone_detach', message: 'Detach task queued' });
};

const attach = ctx => {
  const { row, body } = ctx;
  if (row.status !== 'configured') {
    return refusal(400, ATTACH_ONLY, statusOf(row));
  }
  return queued(ctx, {
    operation: 'zone_attach',
    message: 'Attach task queued',
    metadata: { update: Boolean(body.update), force: Boolean(body.force) },
  });
};

const pathRefusal = (host, target) => {
  if (host.kind === 'hyperweaver') {
    return target ? null : refusal(400, 'target_path is required');
  }
  return target.startsWith('/') ? null : refusal(400, RELATIVE_PATH);
};

const move = ctx => {
  const { host, row, words, body } = ctx;
  const target = typeof body.target_path === 'string' ? body.target_path.trim() : '';
  const refused = pathRefusal(host, target);
  if (refused) {
    return refused;
  }
  if (!words.movable.includes(row.status)) {
    return refusedState(ctx, words.unmovable);
  }
  return queued(ctx, {
    operation: words.moving,
    message: words.moved,
    metadata: { target_path: target },
  });
};

const destroy = ctx => {
  const { host, person, row, words, url } = ctx;
  const force = url.searchParams.get('force') === 'true';
  const cleanup = url.searchParams.get('cleanup_disks') === 'true';
  const running = row.status === 'running';
  if (running && !force) {
    return refusal(400, words.deleting, statusOf(row));
  }
  const by = person.username;
  const target = row.name;
  const metadata = { force, cleanup_disks: cleanup };
  const first = running ? queue({ host, by, operation: 'stop', target, priority: 100 }) : null;
  const last = queue({ host, by, operation: 'delete', target, metadata, after: first?.id });
  return ok({
    success: true,
    delete_tasks: [first, last].filter(Boolean).map(task => task.id),
    machine_name: target,
    operation: 'delete',
    status: 'pending',
    message: 'Delete tasks queued successfully',
    force,
    ...(host.kind === 'hyperweaver' ? { cleanup_disks: cleanup } : {}),
  });
};

/**
 * The machine routes of both agents, each answering as the agent of the
 * host's kind does: the power verbs, pause, suspend and resume as queued
 * tasks, the interrupt, the guest shutdown and the launch at once, the
 * zone verbs on the zoneweaver kind alone, pause and the applications on
 * the hyperweaver kind alone, and every refusal in the agent's own status
 * and words, `{ error, current_status }`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMachines = agentRoute => {
  agentRoute('POST', 'machines/:name/start', found(start));
  agentRoute('POST', 'machines/:name/stop', found(stopping));
  agentRoute('POST', 'machines/:name/restart', found(restart));
  agentRoute('POST', 'machines/:name/reset', found(reset));
  agentRoute('POST', 'machines/:name/suspend', found(suspend));
  agentRoute('POST', 'machines/:name/pause', only('hyperweaver', found(pause)));
  agentRoute('POST', 'machines/:name/resume', found(resume));
  agentRoute('POST', 'machines/:name/nmi', found(nmi));
  agentRoute('POST', 'machines/:name/guest/shutdown', guestShutdown);
  agentRoute('GET', 'applications', only('hyperweaver', applications));
  agentRoute('POST', LAUNCH_PATH, only('hyperweaver', launch));
  agentRoute('POST', 'machines/:name/ready', zone(ready));
  agentRoute('POST', 'machines/:name/verify', zone(verify));
  agentRoute('POST', 'machines/:name/mark-incomplete', zone(markIncomplete));
  agentRoute('POST', 'machines/:name/detach', zone(detach));
  agentRoute('POST', 'machines/:name/attach', zone(attach));
  agentRoute('POST', 'machines/:name/move', found(move, MACHINE_MISSING));
  agentRoute('DELETE', 'machines/:name', found(destroy));
};
