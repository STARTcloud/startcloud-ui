import { Buffer } from 'buffer';
import { createHash, randomBytes, randomUUID } from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import process from 'process';

const [, , ROLE_WORD = 'server', PORT_WORD = ''] = process.argv;
const AGENT_MODE = ROLE_WORD === 'agent';
const PORT = Number(PORT_WORD) || 9595;
const FIXTURES = path.resolve('tests/fixtures');
const DIST = path.resolve('dist');
const SELF = 'self';
const TOPICS = ['health', 'tasks', 'hosts'];
const STREAM_FEATURES = ['health', 'events'];
const AGENT_FEATURES = ['machines', 'tasks', 'host-terminal', 'host-power'];
const AGENT_PREFIX = AGENT_MODE ? '/api' : '/api/agents/:agent';
const RETRY_MS = 3000;
const HEARTBEAT_MS = 25000;
const RING_MAX_EVENTS = 500;
const RING_MAX_AGE_MS = 5 * 60 * 1000;
const STEP_MS = 900;
const TASK_LIMIT = 50;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP_TEXT = 1;
const OP_BINARY = 2;
const OP_CLOSE = 8;
const OP_PING = 9;
const OP_PONG = 10;
const ACTIVE = ['pending', 'running'];
const GREEN = '\u001b[32m';
const BLUE = '\u001b[34m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};
const LINES = {
  start: [
    'Powering the machine on',
    `${GREEN}ok${RESET} the hypervisor accepted the start`,
    'Waiting for the guest agent',
    `${GREEN}ok${RESET} the guest agent answered`,
  ],
  stop: [
    'Asking the guest to shut down',
    'Waiting for the machine to power off',
    `${GREEN}ok${RESET} the machine is off`,
  ],
  restart: [
    'Asking the guest to restart',
    'Waiting for the machine to power off',
    'Powering the machine on',
    `${GREEN}ok${RESET} the guest agent answered`,
  ],
  reset: [`${YELLOW}Hard reset${RESET} of the machine`, `${GREEN}ok${RESET} the machine is up`],
  delete: [
    'Stopping the machine',
    'Removing the media the agent created',
    `${GREEN}ok${RESET} the machine is gone`,
  ],
  host: [
    'Warning every signed-in person',
    'Waiting out the grace period',
    `${YELLOW}The mock keeps the host up${RESET}`,
  ],
};

const now = () => new Date().toISOString();

const fixture = (folder, file) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, folder, file), 'utf8'));

const uniqueOf = list => [...new Set(list)];

const STATUS = (() => {
  const base = fixture(AGENT_MODE ? 'agent' : 'hosts', 'status.json');
  const own = AGENT_MODE ? AGENT_FEATURES : [];
  return {
    ...base,
    features: uniqueOf([...base.features, ...own, ...STREAM_FEATURES]),
    events: { path: '/api/events', topics: TOPICS },
  };
})();

const USER = fixture(AGENT_MODE ? 'agent' : 'hosts', 'user.json');

const hostFrom = ({ id, folder, stats, machines, tasks = [], outputs = [] }) => ({
  id,
  stats: fixture(folder, stats),
  machines: fixture(folder, machines).machines,
  tasks,
  outputs: new Map(outputs),
  runs: new Map(),
  streams: new Map(),
  terminals: new Map(),
});

const fixtureTasks = () => fixture('hosts', 'tasks-200.json').tasks;

const fixtureOutputs = () => {
  const answer = fixture('hosts', 'task-output-200.json');
  return [[answer.task_id, answer.output]];
};

const hosts = new Map(
  AGENT_MODE
    ? [
        [
          SELF,
          hostFrom({
            id: SELF,
            folder: 'agent',
            stats: 'stats.json',
            machines: 'machines.json',
            tasks: fixtureTasks(),
            outputs: fixtureOutputs(),
          }),
        ],
      ]
    : [
        [
          '1',
          hostFrom({
            id: 1,
            folder: 'hosts',
            stats: 'agents-1-stats.json',
            machines: 'agents-1-machines.json',
            tasks: fixtureTasks(),
            outputs: fixtureOutputs(),
          }),
        ],
        [
          '2',
          hostFrom({ id: 2, folder: 'agent', stats: 'stats.json', machines: 'machines.json' }),
        ],
      ]
);

const REGISTRY = (() => {
  if (AGENT_MODE) {
    return [];
  }
  const [first] = fixture('hosts', 'servers.json').servers;
  const agent = fixture('agent', 'status.json');
  const desk = {
    ...first,
    capabilities: {
      ...first.capabilities,
      features: uniqueOf([...first.capabilities.features, ...AGENT_FEATURES]),
    },
  };
  const lab = {
    ...first,
    id: 2,
    hostname: 'lab-1.example.com',
    entityName: 'Lab',
    capabilities: {
      role: 'agent',
      agent: agent.agent,
      hypervisors: agent.hypervisors,
      platform: agent.platform,
      arch: agent.arch,
      version: agent.version,
      hostname: agent.hostname,
      features: AGENT_FEATURES,
    },
  };
  return [desk, lab];
})();

const tickets = new Set();
const ring = [];
const subscribers = new Set();

let lastMs = 0;
let seq = 0;

const nextId = () => {
  const current = Math.max(Date.now(), lastMs);
  if (current === lastMs) {
    seq += 1;
  } else {
    lastMs = current;
    seq = 0;
  }
  return `${current}-${seq}`;
};

const floorId = nextId();

const newestId = () => `${lastMs}-${seq}`;

const parseId = id => {
  const [ms, sequence] = String(id).split('-');
  return [Number(ms), Number(sequence)];
};

const compareIds = (first, second) => {
  const [firstMs, firstSeq] = parseId(first);
  const [secondMs, secondSeq] = parseId(second);
  return firstMs === secondMs ? firstSeq - secondSeq : firstMs - secondMs;
};

const isValidId = id => parseId(id).every(Number.isFinite);

const oldestId = () => (ring.length ? ring[0].id : floorId);

const sseFrame = (id, event, data) =>
  `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const requestedTopics = query => {
  const requested = String(query || '')
    .split(',')
    .map(topic => topic.trim())
    .filter(topic => TOPICS.includes(topic));
  return new Set(requested.length ? requested : TOPICS);
};

const armHeartbeat = subscriber => {
  clearInterval(subscriber.heartbeat);
  subscriber.heartbeat = setInterval(() => {
    subscriber.res.write(':hb\n\n');
  }, HEARTBEAT_MS);
  subscriber.heartbeat.unref();
};

const writeStream = (subscriber, text) => {
  subscriber.res.write(text);
  armHeartbeat(subscriber);
};

const trimRing = () => {
  const cutoff = Date.now() - RING_MAX_AGE_MS;
  while (ring.length > RING_MAX_EVENTS && ring[0].at < cutoff) {
    ring.shift();
  }
};

const replay = (subscriber, lastEventId) => {
  if (!lastEventId) {
    return;
  }
  if (
    !isValidId(lastEventId) ||
    compareIds(lastEventId, oldestId()) < 0 ||
    compareIds(lastEventId, newestId()) > 0
  ) {
    writeStream(subscriber, sseFrame(nextId(), 'reset', { topics: [...subscriber.topics] }));
    return;
  }
  ring
    .filter(entry => compareIds(entry.id, lastEventId) > 0 && subscriber.topics.has(entry.topic))
    .forEach(entry => writeStream(subscriber, sseFrame(entry.id, entry.event, entry.data)));
};

const openStream = ctx => {
  const { req, res, url } = ctx;
  const topics = requestedTopics(url.searchParams.get('topics'));
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  req.setTimeout(0);
  res.setTimeout(0);
  const subscriber = { res, topics, heartbeat: null };
  subscribers.add(subscriber);
  res.on('close', () => {
    clearInterval(subscriber.heartbeat);
    subscribers.delete(subscriber);
  });
  const id = nextId();
  writeStream(
    subscriber,
    `retry: ${RETRY_MS}\n${sseFrame(id, 'ready', { id, topics: [...topics] })}`
  );
  replay(subscriber, req.headers['last-event-id']);
  return null;
};

const broadcast = (topic, event, data) => {
  const entry = { id: nextId(), at: Date.now(), topic, event, data };
  ring.push(entry);
  trimRing();
  subscribers.forEach(subscriber => {
    if (subscriber.topics.has(topic)) {
      writeStream(subscriber, sseFrame(entry.id, event, data));
    }
  });
};

const emit = ({ host, topic, event, data }) =>
  broadcast(topic, event, AGENT_MODE ? { ...data } : { ...data, agent_id: host.id });

const acceptKey = key => createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');

const encodeFrame = (payload, opcode) => {
  const body = Buffer.from(payload);
  const first = 0x80 | opcode;
  if (body.length < 126) {
    return Buffer.concat([Buffer.from([first, body.length]), body]);
  }
  if (body.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = first;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }
  const header = Buffer.alloc(10);
  header[0] = first;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(body.length), 2);
  return Buffer.concat([header, body]);
};

const lengthOf = buffer => {
  const short = buffer[1] & 0x7f;
  if (short === 126) {
    return buffer.length < 4 ? null : { length: buffer.readUInt16BE(2), offset: 4 };
  }
  if (short === 127) {
    return buffer.length < 10 ? null : { length: Number(buffer.readBigUInt64BE(2)), offset: 10 };
  }
  return { length: short, offset: 2 };
};

const readFrame = buffer => {
  const size = buffer.length < 2 ? null : lengthOf(buffer);
  if (!size) {
    return null;
  }
  const masked = (buffer[1] & 0x80) !== 0;
  const start = size.offset + (masked ? 4 : 0);
  const end = start + size.length;
  if (buffer.length < end) {
    return null;
  }
  const payload = Buffer.from(buffer.subarray(start, end));
  if (masked) {
    const mask = buffer.subarray(size.offset, size.offset + 4);
    payload.forEach((byte, index) => {
      payload[index] = byte ^ mask[index % 4];
    });
  }
  return { opcode: buffer[0] & 0x0f, payload, rest: buffer.subarray(end) };
};

const openSocket = ({ req, socket, onText, onClose }) => {
  let pending = Buffer.alloc(0);
  const send = (payload, opcode = OP_TEXT) => {
    if (!socket.destroyed) {
      socket.write(encodeFrame(payload, opcode));
    }
  };
  const close = () => {
    send('', OP_CLOSE);
    socket.end();
  };
  const dispatch = received => {
    if (received.opcode === OP_CLOSE) {
      close();
    } else if (received.opcode === OP_PING) {
      send(received.payload, OP_PONG);
    } else if (received.opcode === OP_TEXT || received.opcode === OP_BINARY) {
      onText(received.payload.toString('utf8'));
    }
  };
  const drain = () => {
    let received = readFrame(pending);
    while (received) {
      pending = received.rest;
      dispatch(received);
      received = readFrame(pending);
    }
  };
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(req.headers['sec-websocket-key'])}`,
      '',
      '',
    ].join('\r\n')
  );
  socket.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    drain();
  });
  socket.on('close', onClose);
  socket.on('error', () => socket.destroy());
  return { send, close };
};

const refuseSocket = (socket, line) => {
  socket.write(`HTTP/1.1 ${line}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

const setRunning = (host, name, running) => {
  const others = host.stats.runningmachines.filter(entry => entry !== name);
  host.stats = { ...host.stats, runningmachines: running ? [...others, name] : others };
  host.machines = host.machines.map(machine =>
    machine.name === name ? { ...machine, status: running ? 'running' : 'installed' } : machine
  );
};

const removeMachine = (host, name) => {
  host.stats = {
    ...host.stats,
    allmachines: host.stats.allmachines.filter(entry => entry !== name),
    runningmachines: host.stats.runningmachines.filter(entry => entry !== name),
  };
  host.machines = host.machines.filter(machine => machine.name !== name);
};

const SETTLES = {
  start: (host, name) => setRunning(host, name, true),
  stop: (host, name) => setRunning(host, name, false),
  restart: (host, name) => setRunning(host, name, true),
  reset: (host, name) => setRunning(host, name, true),
  delete: removeMachine,
};

const pushOutput = (host, task, text) => {
  const entry = { stream: 'stdout', data: text, timestamp: Date.now() };
  host.outputs.set(task.id, [...(host.outputs.get(task.id) || []), entry]);
  (host.streams.get(task.id) || []).forEach(connection =>
    connection.send(JSON.stringify({ type: 'output', ...entry }))
  );
};

const finish = (host, task, status) => {
  const run = host.runs.get(task.id);
  if (run) {
    clearInterval(run.timer);
    host.runs.delete(task.id);
  }
  task.status = status;
  task.completed_at = now();
  emit({ host, topic: 'tasks', event: 'task-updated', data: task });
  (host.streams.get(task.id) || []).forEach(connection => {
    connection.send(JSON.stringify({ type: 'status', status }));
    connection.close();
  });
  host.streams.delete(task.id);
};

const settle = (host, task) => {
  const change = SETTLES[task.operation];
  if (!change || !host.stats.allmachines.includes(task.machine_name)) {
    return;
  }
  change(host, task.machine_name);
  emit({ host, topic: 'hosts', event: 'stats-updated', data: host.stats });
};

const runTask = ({ host, task, lines, from = 0 }) => {
  const run = { index: from, timer: null };
  const step = () => {
    pushOutput(host, task, lines[run.index]);
    run.index += 1;
    task.progress_percent = Math.round((run.index / lines.length) * 100);
    if (run.index < lines.length) {
      emit({ host, topic: 'tasks', event: 'task-updated', data: task });
      return;
    }
    finish(host, task, 'completed');
    settle(host, task);
  };
  run.timer = setInterval(step, STEP_MS);
  host.runs.set(task.id, run);
};

const resume = (host, task) => {
  if (task.status !== 'running' || host.runs.has(task.id)) {
    return;
  }
  const lines = LINES[task.operation] || LINES.host;
  const from = Math.min(
    lines.length - 1,
    Math.floor((Number(task.progress_percent) / 100) * lines.length)
  );
  runTask({ host, task, lines, from });
};

const ok = (body, status = 200) => ({ status, body });

const problem = (status, title) => ({
  status,
  problem: true,
  body: { type: 'about:blank', title, status },
});

const queue = ({ host, operation, target, priority, lines }) => {
  const stamp = now();
  const task = {
    id: randomUUID(),
    machine_name: target,
    operation,
    status: 'running',
    priority,
    created_by: USER.username,
    depends_on: null,
    parent_task_id: null,
    error_message: null,
    progress_percent: 0,
    progress_info: null,
    metadata: null,
    created_at: stamp,
    started_at: stamp,
    completed_at: null,
  };
  host.tasks = [task, ...host.tasks];
  emit({ host, topic: 'tasks', event: 'task-updated', data: task });
  runTask({ host, task, lines });
  return ok({ success: true, task_id: task.id, message: 'queued' });
};

const machineAction = operation => ctx => {
  const { host, params } = ctx;
  const name = decodeURIComponent(params.name);
  if (!host.stats.allmachines.includes(name)) {
    return problem(404, `No machine named ${name}`);
  }
  return queue({ host, operation, target: name, priority: 60, lines: LINES[operation] });
};

const hostAction = operation => ctx =>
  queue({ host: ctx.host, operation, target: 'system', priority: 100, lines: LINES.host });

const listedTasks = ctx => {
  const { host, url } = ctx;
  const floor = Number(url.searchParams.get('min_priority')) || 0;
  const parent = url.searchParams.get('parent_task_id') || '';
  const limit = Number(url.searchParams.get('limit')) || TASK_LIMIT;
  const tasks = host.tasks
    .filter(task => Number(task.priority) >= floor)
    .filter(task => (parent ? task.parent_task_id === parent : true))
    .slice(0, limit);
  return ok({
    tasks,
    running_count: host.tasks.filter(task => task.status === 'running').length,
  });
};

const taskOf = ctx => ctx.host.tasks.find(task => task.id === ctx.params.task) || null;

const cancelled = ctx => {
  const task = taskOf(ctx);
  if (!task) {
    return problem(404, 'No such task');
  }
  if (!ACTIVE.includes(task.status)) {
    return problem(409, 'The task already ended');
  }
  finish(ctx.host, task, 'cancelled');
  return ok({ success: true, task_id: task.id, message: 'Task cancellation requested' });
};

const promptOf = host => `${GREEN}mark@${host.stats.hostname}${RESET}:${BLUE}~${RESET}$ `;

const machineLines = host =>
  host.machines.map(machine =>
    machine.status === 'running'
      ? `${GREEN}running${RESET}    ${machine.name}`
      : `installed  ${machine.name}`
  );

const taskLines = host =>
  host.tasks.map(
    task => `${String(task.progress_percent).padStart(3)}%  ${task.status.padEnd(10)} ${task.operation} ${task.machine_name}`
  );

const COMMANDS = {
  help: () => ['help  hostname  whoami  uptime  machines  tasks  clear  exit'],
  hostname: host => [host.stats.hostname],
  whoami: () => [USER.username],
  uptime: host => [`up ${host.stats.uptime} seconds`],
  machines: machineLines,
  tasks: taskLines,
};

const runCommand = ({ host, connection, line }) => {
  const word = line.trim();
  if (word === 'exit') {
    connection.send('\r\nlogout\r\n');
    connection.close();
    return;
  }
  if (word === 'clear') {
    connection.send(`\u001b[2J\u001b[H${promptOf(host)}`);
    return;
  }
  const answer = COMMANDS[word];
  const lines = answer ? answer(host) : [`mock: ${word}: command not found`];
  const body = word ? `${lines.join('\r\n')}\r\n` : '';
  connection.send(`\r\n${body}${promptOf(host)}`);
};

const shellInput = ({ host, connection, shell }) => {
  const keys = {
    '\r': () => {
      const { line } = shell;
      shell.line = '';
      runCommand({ host, connection, line });
    },
    '\u007f': () => {
      if (shell.line) {
        shell.line = shell.line.slice(0, -1);
        connection.send('\b \b');
      }
    },
    '\u0003': () => {
      shell.line = '';
      connection.send(`^C\r\n${promptOf(host)}`);
    },
  };
  keys['\n'] = keys['\r'];
  return text => {
    if (text.startsWith('\0')) {
      return;
    }
    [...text].forEach(key => {
      if (keys[key]) {
        keys[key]();
      } else if (key >= ' ') {
        shell.line += key;
        connection.send(key);
      }
    });
  };
};

const openShell = ({ req, socket, host, session }) => {
  const shell = { line: '' };
  const held = { connection: null };
  const connection = openSocket({
    req,
    socket,
    onText: text => shellInput({ host, connection: held.connection, shell })(text),
    onClose: () => host.terminals.set(session, null),
  });
  held.connection = connection;
  host.terminals.set(session, connection);
  connection.send(`Host terminal ready on ${host.stats.hostname}, a mock, try help\r\n`);
};

const openTaskStream = ({ req, socket, host, task }) => {
  const held = { connection: null };
  const connection = openSocket({
    req,
    socket,
    onText: () => null,
    onClose: () => host.streams.get(task.id)?.delete(held.connection),
  });
  held.connection = connection;
  (host.outputs.get(task.id) || []).forEach(entry =>
    connection.send(JSON.stringify({ type: 'output', ...entry }))
  );
  if (!ACTIVE.includes(task.status)) {
    connection.send(JSON.stringify({ type: 'status', status: task.status }));
    connection.close();
    return;
  }
  host.streams.set(task.id, new Set([...(host.streams.get(task.id) || []), connection]));
  resume(host, task);
};

const routes = [];
const sockets = [];

const toRegex = pattern =>
  new RegExp(`^${pattern.replace(/:(?<name>[a-z_]+)/g, '(?<$<name>>[^/]+)')}$`);

const route = (method, pattern, handler, gate = {}) => {
  routes.push({ method, regex: toRegex(pattern), handler, gate });
};

const publicRoute = (method, pattern, handler) => route(method, pattern, handler);

const sessionRoute = (method, pattern, handler) =>
  route(method, pattern, handler, { session: true });

const hostOf = params => hosts.get(AGENT_MODE ? SELF : params.agent) || null;

const agentRoute = (method, pattern, handler) =>
  sessionRoute(method, `${AGENT_PREFIX}/${pattern}`, ctx => {
    const host = hostOf(ctx.params);
    return host ? handler({ ...ctx, host }) : problem(404, 'No such agent');
  });

const socketRoute = (pattern, handler) => {
  sockets.push({ regex: toRegex(`${AGENT_PREFIX}/${pattern}`), handler });
};

const issueToken = () => `mock.${randomBytes(24).toString('hex')}`;

publicRoute('GET', '/api/status', () => ok(STATUS));
publicRoute('GET', '/api/health', () => ok({ ...fixture('hosts', 'health.json'), timestamp: now() }));
publicRoute('GET', '/api/config/ticket', () => ok({ ticket_system: { enabled: false } }));
publicRoute('GET', '/api/auth/oidc/issuers', () => ok({ issuers: [] }));
publicRoute('GET', '/api/auth/methods', () =>
  ok({
    methods: [{ id: 'local', name: 'Password', enabled: true }],
    default_provider: null,
    silent_login: false,
    local_registration_enabled: false,
  })
);
publicRoute('POST', '/api/auth/signin', ctx => {
  if (!ctx.body.username || !ctx.body.password || ctx.body.password === 'wrong') {
    return problem(401, 'The name or the password is wrong');
  }
  return ok({ ...USER, username: String(ctx.body.username), access_token: issueToken() });
});
publicRoute('POST', '/api/client-errors', ctx => {
  (Array.isArray(ctx.body.entries) ? ctx.body.entries : []).forEach(entry => {
    console.log(`client error [${entry.category}] ${entry.url}: ${entry.message}`);
  });
  return { status: 204 };
});

sessionRoute('POST', '/api/auth/refresh-token', ctx =>
  ok({ access_token: issueToken(), stay_logged_in: Boolean(ctx.body.stay_logged_in) })
);
sessionRoute('GET', '/api/user', () => ok(USER));
sessionRoute('GET', '/api/userinfo/claims', () =>
  ok({ name: USER.name, email: USER.email, preferred_username: USER.username })
);
sessionRoute('GET', '/api/user/favorites', () => ok([]));
sessionRoute('PATCH', '/api/user/preferences', () => ok(USER));
sessionRoute('GET', '/api/events', openStream);

if (!AGENT_MODE) {
  sessionRoute('GET', '/api/servers', () => ok({ success: true, servers: REGISTRY }));
}

agentRoute('GET', 'stats', ctx => ok(ctx.host.stats));
agentRoute('GET', 'machines', ctx =>
  ok({ machines: ctx.host.machines, total: ctx.host.machines.length })
);
agentRoute('POST', 'machines/:name/start', machineAction('start'));
agentRoute('POST', 'machines/:name/stop', machineAction('stop'));
agentRoute('POST', 'machines/:name/restart', machineAction('restart'));
agentRoute('POST', 'machines/:name/reset', machineAction('reset'));
agentRoute('DELETE', 'machines/:name', machineAction('delete'));
agentRoute('POST', 'system/host/restart', hostAction('host_restart'));
agentRoute('POST', 'system/host/shutdown', hostAction('host_shutdown'));
agentRoute('POST', 'system/host/poweroff', hostAction('host_poweroff'));
agentRoute('POST', 'system/host/halt', hostAction('host_halt'));
agentRoute('POST', 'system/host/reboot/fast', hostAction('host_fast_reboot'));
agentRoute('GET', 'tasks', listedTasks);
agentRoute('GET', 'tasks/:task', ctx => {
  const task = taskOf(ctx);
  return task ? ok({ ...task, output: null }) : problem(404, 'No such task');
});
agentRoute('GET', 'tasks/:task/output', ctx => {
  const task = taskOf(ctx);
  return task
    ? ok({ task_id: task.id, status: task.status, output: ctx.host.outputs.get(task.id) || [] })
    : problem(404, 'No such task');
});
agentRoute('DELETE', 'tasks/:task', cancelled);
agentRoute('GET', 'ws-ticket', () => {
  const ticket = randomBytes(16).toString('hex');
  tickets.add(ticket);
  return ok({ ticket, expires_in: 30 });
});
agentRoute('POST', 'term/start', ctx => {
  const id = randomUUID();
  ctx.host.terminals.set(id, null);
  return ok({ id, status: 'active', created_at: now() });
});
agentRoute('DELETE', 'term/sessions/:session/stop', ctx => {
  ctx.host.terminals.get(ctx.params.session)?.close();
  ctx.host.terminals.delete(ctx.params.session);
  return ok({ success: true });
});

socketRoute('term/:session', ({ req, socket, host, params }) => {
  if (!host.terminals.has(params.session)) {
    refuseSocket(socket, '404 Not Found');
    return;
  }
  openShell({ req, socket, host, session: params.session });
});
socketRoute('tasks/:task/stream', ({ req, socket, host, params }) => {
  const task = host.tasks.find(entry => entry.id === params.task);
  if (!task) {
    refuseSocket(socket, '404 Not Found');
    return;
  }
  openTaskStream({ req, socket, host, task });
});

const readBody = req =>
  new Promise(resolve => {
    let text = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      text += chunk;
    });
    req.on('end', () => resolve(text));
  });

const parseBody = text => {
  try {
    return JSON.parse(text || 'null') ?? {};
  } catch {
    return {};
  }
};

const matchRoute = (method, pathname) => {
  const entry = routes.find(
    candidate => candidate.method === method && candidate.regex.test(pathname)
  );
  return entry ? { entry, params: entry.regex.exec(pathname).groups || {} } : null;
};

const send = (res, answer) => {
  if (answer.body === undefined) {
    res.writeHead(answer.status, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  res.writeHead(answer.status, {
    'Content-Type': answer.problem ? 'application/problem+json' : 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(answer.body));
};

const answerApi = async (req, res, url) => {
  const found = matchRoute(req.method, url.pathname);
  if (!found) {
    send(res, problem(404, 'Not Found'));
    return 404;
  }
  if (found.entry.gate.session && !req.headers['x-access-token']) {
    send(res, problem(401, 'Sign in first'));
    return 401;
  }
  const body = parseBody(await readBody(req));
  const answer = found.entry.handler({ req, res, url, body, params: found.params });
  if (answer) {
    send(res, answer);
  }
  return answer ? answer.status : 200;
};

const fileFor = pathname => {
  const wanted = path.join(DIST, decodeURIComponent(pathname));
  const inside = wanted === DIST || wanted.startsWith(`${DIST}${path.sep}`);
  if (inside && fs.existsSync(wanted) && fs.statSync(wanted).isFile()) {
    return wanted;
  }
  return path.extname(pathname) ? '' : path.join(DIST, 'index.html');
};

const answerFile = (req, res, url) => {
  const file = req.method === 'GET' ? fileFor(url.pathname) : '';
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not in dist. Run npm run build first, or use npm run dev.\n');
    return 404;
  }
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
  return 200;
};

const handle = async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const status = url.pathname.startsWith('/api/')
    ? await answerApi(req, res, url)
    : answerFile(req, res, url);
  console.log(`${status} ${req.method} ${url.pathname}`);
};

const upgrade = (req, socket) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const entry = sockets.find(candidate => candidate.regex.test(url.pathname));
  const params = entry ? entry.regex.exec(url.pathname).groups || {} : {};
  const host = entry ? hostOf(params) : null;
  const ticket = url.searchParams.get('ticket') || '';
  if (!host) {
    refuseSocket(socket, '404 Not Found');
  } else if (!tickets.delete(ticket)) {
    refuseSocket(socket, '401 Unauthorized');
  } else {
    entry.handler({ req, socket, host, params });
  }
  console.log(`ws ${url.pathname}`);
};

/**
 * A development-only mock of the hyperweaver family so the shared UI's
 * hosts feature can be clicked through before a real backend answers the
 * status payload: the registry, the agents' stats, machines, tasks, power
 * routes, host terminal and task output, the backend session's sign-in,
 * and the one event stream of the events contract with the `tasks` and
 * `hosts` topics. Deleted when a real backend answers, as the issuer's
 * mock was.
 *
 * Run it inside WSL with `npm run mock` for the `hyperweaver-server` role,
 * the aggregated view over two agents, Desk and Lab, addressed as
 * `/api/agents/{id}/…`, or `npm run mock -- agent` for the
 * `hyperweaver-agent` role, the one serving agent at `/api/…`; a second
 * word is the port, 9595 when absent, where config.yaml's `api_target`
 * points, so `npm run dev` on 8080 reaches it through the dev proxy. It
 * also serves `dist/` with the `index.html` fallback, so
 * `http://localhost:9595` is the UI as a backend serves it.
 *
 * Every answer starts from the test fixtures under `tests/fixtures/hosts`
 * and `tests/fixtures/agent`, the same JSON the scenarios read, so the
 * mock and the tests cannot drift apart: the status with `health`,
 * `events` and, on the agent role, the agent's pane tokens added; the
 * registry's first row with `host-power` added and a second row made of
 * the agent fixture; the three tasks and the one task's output. Sign in
 * with any name and any password; the password `wrong` answers 401.
 *
 * State lives in memory and moves like the real thing: a power row
 * queues a task, the task runs on a timer, one output line and one
 * `task-updated` event a step, and when it ends the machine's state
 * changes and `stats-updated` is sent, so the tasks pane, the page, the
 * Controls menu and the tree's dots follow by push. The fixture's running
 * task starts moving when its dialog opens its stream. Cancel task ends a
 * running task as `cancelled`. On the server role every event carries
 * `agent_id`.
 *
 * The stream is the contract's: `retry`, `ready`, ids of
 * `<epoch-ms>-<seq>`, a ring of 500 events or 5 minutes, `Last-Event-ID`
 * replayed from the ring or answered `reset`, `:hb` after 25 idle
 * seconds. The two WebSockets are hand-written over the upgrade, text
 * frames alone: `/term/{id}` is a line shell that knows `help`,
 * `hostname`, `whoami`, `uptime`, `machines`, `tasks`, `clear` and
 * `exit`, a resize frame read and dropped; `/tasks/{id}/stream` replays
 * the task's output, then sends each new line and a `status` frame at
 * the end. Each upgrade spends one ticket of `GET ws-ticket`.
 *
 * @returns {http.Server} The listening server
 */
export const startMockHyperweaver = () => {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(error => {
      console.error(error);
      send(res, problem(500, 'The mock failed'));
    });
  });
  server.on('upgrade', upgrade);
  server.listen(PORT, () => {
    console.log(`mock ${STATUS.role} listening on http://localhost:${PORT}`);
  });
  return server;
};

startMockHyperweaver();
