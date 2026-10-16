import { randomBytes, randomUUID } from 'crypto';

import { featuresOf, runningOf } from './fleet.js';
import { BLUE, GREEN, RESET, YELLOW, now, ok, refusal, secondsUp } from './kit.js';
import { openSocket } from './socket.js';
import { broadcast } from './stream.js';

const TICKET_MS = 60 * 1000;
const BUFFER_LINES = 1000;
const REPLAY_LINES = 50;
const EOL = '\r\n';
const HOST_LEVEL_TARGETS = ['system', 'artifact', 'filesystem'];
const RECONNECTED = `${EOL}=== Session Reconnected - Last ${REPLAY_LINES} lines ===${EOL}`;
const LIVE = `${EOL}=== Live Terminal ===${EOL}`;
const CLOSED = `${EOL}Terminal session closed.${EOL}`;
const HELP = 'help  hostname  whoami  uptime  uname  machines  tasks  features  clear  exit';

const tickets = new Map();

/**
 * One ticket of `GET ws-ticket` as the agents mint it: 64 hex characters,
 * good for 60 seconds, reusable inside that window and bound to the
 * machine the query names, or to no machine for a host-level stream.
 *
 * @param {Object} ctx - The request's context
 * @returns {Object} `{ ticket }`
 */
export const issueTicket = ctx => {
  const ticket = randomBytes(32).toString('hex');
  tickets.set(ticket, {
    host: String(ctx.host.id),
    machine: ctx.url.searchParams.get('machine') || '',
    expires: Date.now() + TICKET_MS,
  });
  return ok({ ticket });
};

export const ticketFits = ({ ticket, host, machine }) => {
  const held = tickets.get(ticket);
  if (!held) {
    return false;
  }
  if (held.expires < Date.now()) {
    tickets.delete(ticket);
    return false;
  }
  return held.host === String(host.id) && held.machine === machine;
};

export const ticketMachineOf = task =>
  task.machine_name && !HOST_LEVEL_TARGETS.includes(task.machine_name) ? task.machine_name : '';

const onWindows = host => Boolean(host.facts.platform?.startsWith('win'));

const shellOf = host => (onWindows(host) ? 'powershell.exe' : '/bin/bash');

const uptimeOf = host => Number(host.facts.uptime) + secondsUp();

const promptOf = (host, session) => {
  if (onWindows(host)) {
    return `PS C:\\Users\\${session.by}> `;
  }
  return `${GREEN}${session.by}@${host.facts.hostname}${RESET}:${BLUE}~${RESET}$ `;
};

const machineLine = row => {
  const state = row.status.padEnd(11);
  return row.status === 'running' ? `${GREEN}${state}${RESET}${row.name}` : `${state}${row.name}`;
};

const taskLine = task => {
  const percent = `${String(task.progress_percent).padStart(3)}%`;
  return `${percent}  ${task.status.padEnd(22)} ${task.operation} ${task.machine_name}`;
};

const COMMANDS = {
  help: () => [HELP],
  hostname: ({ host }) => [host.facts.hostname],
  whoami: ({ session }) => [session.by],
  uptime: ({ host }) => [`up ${uptimeOf(host)} seconds, ${runningOf(host).length} running`],
  uname: ({ host }) => [`${host.facts.platform} ${host.facts.arch} ${host.kind}-agent`],
  machines: ({ host }) => host.machines.map(machineLine),
  tasks: ({ host }) => host.tasks.slice(0, 20).map(taskLine),
  features: ({ host }) => [`${YELLOW}${featuresOf(host).join(' ')}${RESET}`],
};

const say = (session, text) => {
  const lines = `${session.buffer}${text}`.split(EOL);
  session.buffer = lines.slice(-BUFFER_LINES).join(EOL);
  session.last_activity = now();
  session.connection?.send(text);
};

const leave = (host, session) => {
  say(session, host.kind === 'zoneweaver' ? `${EOL}logout${EOL}` : CLOSED);
  session.buffer = '';
  session.line = '';
  session.connection?.close();
};

const runCommand = (host, session) => {
  const word = session.line.trim();
  session.line = '';
  if (word === 'exit') {
    leave(host, session);
    return;
  }
  if (word === 'clear') {
    session.buffer = '';
    say(session, `\u001b[2J\u001b[H${promptOf(host, session)}`);
    return;
  }
  const answer = COMMANDS[word];
  const lines = answer ? answer({ host, session }) : [`mock: ${word}: command not found`];
  const body = word ? `${lines.join(EOL)}${EOL}` : '';
  say(session, `${EOL}${body}${promptOf(host, session)}`);
};

const typed = (host, session, key) => {
  if (key === '\r' || key === '\n') {
    runCommand(host, session);
  } else if (key === '\u007f') {
    if (session.line) {
      session.line = session.line.slice(0, -1);
      say(session, '\b \b');
    }
  } else if (key === '\u0003') {
    session.line = '';
    say(session, `^C${EOL}${promptOf(host, session)}`);
  } else if (key >= ' ') {
    session.line += key;
    say(session, key);
  }
};

const greet = (host, session) => {
  if (session.buffer) {
    const tail = session.buffer.split(EOL).slice(-REPLAY_LINES).join(EOL);
    session.connection.send(`${RECONNECTED}${tail}${LIVE}`);
    return;
  }
  session.line = '';
  say(session, `Host terminal ready on ${host.facts.hostname}, a mock, try help${EOL}`);
};

/**
 * The sessions event of one terminal session, `session-started` or
 * `session-ended` on the `sessions` topic, `{ kind, id, machine_name }`.
 *
 * @param {string} event - The event name
 * @param {string} kind - `host_shell` or `ssh`
 * @param {Object} session - The session
 * @returns {void}
 */
export const announceSession = (event, kind, session) =>
  broadcast('sessions', event, { kind, id: session.id, machine_name: session.machine_name || '' });

/**
 * The `/term/{id}` socket, a line shell that reconnects as both agents
 * do: the shell of a session runs on across sockets, every new socket
 * greeted with the last 50 lines it wrote between its two banners, and
 * `Terminal session closed.` written when the shell exits.
 *
 * @param {Object} options - `req`, `socket`, `host` and `session`
 * @returns {void}
 */
export const openShell = ({ req, socket, host, session }) => {
  session.connection?.close();
  const connection = openSocket({
    req,
    socket,
    onText: text => {
      if (!text.startsWith('\0')) {
        [...text].forEach(key => typed(host, session, key));
      }
    },
    onClose: () => {
      if (session.connection === connection) {
        session.connection = null;
      }
    },
  });
  session.connection = connection;
  session.status = 'active';
  greet(host, session);
};

const termRow = session => ({
  id: session.id,
  status: session.status,
  shell: session.shell,
  created_by: session.by,
  created_at: session.created_at,
  last_activity: session.last_activity,
});

const startTerminal = ctx => {
  const { host, person } = ctx;
  const stamp = now();
  const session = {
    id: randomUUID(),
    by: person.username,
    status: 'active',
    shell: shellOf(host),
    created_at: stamp,
    last_activity: stamp,
    buffer: '',
    line: '',
    connection: null,
  };
  host.terminals.set(session.id, session);
  announceSession('session-started', 'host_shell', session);
  return ok(termRow(session));
};

const termSessions = ctx => ok([...ctx.host.terminals.values()].map(termRow));

const stopTerminal = ctx => {
  const session = ctx.host.terminals.get(ctx.params.session);
  if (!session) {
    return refusal(404, 'Terminal session not found');
  }
  session.connection?.close();
  ctx.host.terminals.delete(session.id);
  announceSession('session-ended', 'host_shell', session);
  return ok({ success: true, message: 'Terminal session stopped.' });
};

/**
 * The host terminal's routes: the ticket, the session's start, answered
 * `active` at once with `created_by` the calling person, the list of the
 * sessions the host holds and the stop, each start and stop sent on the
 * `sessions` topic, as both agents answer them.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountTerminal = agentRoute => {
  agentRoute('GET', 'ws-ticket', issueTicket);
  agentRoute('POST', 'term/start', startTerminal);
  agentRoute('GET', 'term/sessions', termSessions);
  agentRoute('DELETE', 'term/sessions/:session/stop', stopTerminal);
};
