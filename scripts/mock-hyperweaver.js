import fs from 'fs';
import http from 'http';
import path from 'path';

import { mountAccount } from './mock/account.js';
import { mountAgents, socketMachine, startFlapping } from './mock/agents.js';
import { SETUP_TOKEN, mountConfig } from './mock/config.js';
import { hostFor } from './mock/fleet.js';
import { mountInbox } from './mock/inbox.js';
import { PORT, SETUP_MODE, missing, problem } from './mock/kit.js';
import { startSampling } from './mock/monitoring.js';
import { mountOrgs } from './mock/orgs.js';
import {
  adminRoute,
  admit,
  agentRoute,
  matchRoute,
  matchSocket,
  publicRoute,
  sessionRoute,
  socketRoute,
} from './mock/router.js';
import { STATUS, mountSite, startHealth } from './mock/site.js';
import { refuseSocket } from './mock/socket.js';
import { openStream } from './mock/stream.js';
import { ticketFits } from './mock/terminal.js';

const DIST = path.resolve('dist');
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
const SIGN_IN_NAMES = 'user, admin, super, guest, or any other name';

const router = { publicRoute, sessionRoute, adminRoute, agentRoute, socketRoute };

mountSite(router);
mountAccount(router);
mountInbox(router);
mountOrgs(router);
mountConfig(router);
mountAgents(router);
sessionRoute('GET', '/api/events', openStream);

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

const send = (res, answer) => {
  const headers = { 'Cache-Control': 'no-store', ...answer.headers };
  if (answer.body === undefined) {
    res.writeHead(answer.status, headers);
    res.end();
    return;
  }
  res.writeHead(answer.status, {
    'Content-Type': answer.problem ? 'application/problem+json' : 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(answer.body));
};

const answerRoute = async ({ req, res, url, found, session }) => {
  const raw = await readBody(req);
  const answer = found.entry.handler({
    req,
    res,
    url,
    raw,
    body: parseBody(raw),
    params: found.params,
    person: session?.person || null,
    token: session?.payload || null,
  });
  if (answer) {
    send(res, answer);
  }
  return answer ? answer.status : 200;
};

const answerApi = (req, res, url) => {
  const found = matchRoute(req.method, url.pathname);
  const { refused, session } = found ? admit(found.entry.gate, req) : { refused: null };
  const refusal = found ? refused : missing('Not Found');
  if (refusal) {
    send(res, refusal);
    return refusal.status;
  }
  return answerRoute({ req, res, url, found, session });
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
  const found = matchSocket(url.pathname);
  const host = found ? hostFor(found.params.agent) : null;
  const ticket = url.searchParams.get('ticket') || '';
  if (!host?.online) {
    refuseSocket(socket, '404 Not Found');
  } else if (!ticketFits({ ticket, host, machine: socketMachine(host, found.params) })) {
    refuseSocket(socket, '401 Unauthorized');
  } else {
    found.entry.handler({ req, socket, host, params: found.params });
  }
  console.log(`ws ${url.pathname}`);
};

const announce = () => {
  console.log(`mock ${STATUS.role} listening on http://localhost:${PORT}`);
  console.log(`sign in as ${SIGN_IN_NAMES}, any password but wrong`);
  if (SETUP_MODE) {
    console.log(`setup token: ${SETUP_TOKEN}`);
  }
};

/**
 * A development-only mock of the hyperweaver family, so every surface the
 * shared UI draws for a hyperweaver backend has data behind it before a
 * real backend answers the shared `backend` wire. Its parts live under
 * `scripts/mock/`; this file mounts them and serves. Deleted when a real
 * backend answers, as the issuer's mock was.
 *
 * Run it inside WSL with `npm run mock`; the first word after `--` is the
 * role and the second the port, 9595 when absent, where config.yaml's
 * `api_target` points, so `npm run dev` on 8080 reaches it through the
 * dev proxy. It also serves `dist/` with the `index.html` fallback, so
 * `http://localhost:9595` is the UI as a backend serves it.
 *
 * - `npm run mock`: the `hyperweaver-server` role, the aggregated view
 *   over six hosts addressed as `/api/agents/{id}/…`.
 * - `npm run mock -- agent`: the `hyperweaver-agent` role, one VirtualBox
 *   agent at `/api/…`.
 * - `npm run mock -- zone`: the `zoneweaver-agent` role, one bhyve agent
 *   at `/api/…`.
 * - `npm run mock -- setup`: the server role with setup not complete, the
 *   whole app held at `/setup` until the setup page saves; the token is
 *   printed at start.
 *
 * The status starts from the role's fixture under `tests/fixtures` and
 * adds every token of the shared chrome a hyperweaver backend can answer:
 * `local-accounts`, `setup`, `admin`, `org-console`, `discover`,
 * `invitations`, `favorites`, `notifications`, `search`, `health` and
 * `events`, with `links.docs`, `links.contact`, `links.community`,
 * `brand.repo`, `brand.changelog`, the config names `app`, `auth`, `db`
 * and `mail`, and the topics `session`, `notifications`, `health`,
 * `profile`, `tasks`, `hosts` and `monitoring`. The ticket system answers
 * at `/api/config/ticket`.
 *
 * Sign in with a password, any but `wrong`, which answers 401; the
 * password `short` makes a token that lives 90 seconds, so a kept session
 * refreshes before its next request, and `expired` one that already
 * ended, so the next request answers 401. The name decides the person:
 *
 * - `user`: Sam Rivera, role `user`, a member of acme; start, stop and
 *   restart alone, no admin pages, the hosts of acme and the unassigned
 *   ones.
 * - `admin`: Dana Whitfield, role `admin` with `ROLE_ADMIN`; the zone
 *   verbs, kill, delete and host power, and the admin pages.
 * - `super`: Priya Natarajan, role `super-admin` with `ROLE_ADMIN`, an
 *   owner of two organizations, one of them managed at the provider.
 * - `guest`: a guest-only account, which draws no notifications.
 * - any other name: the fixture's person under that name, a super-admin
 *   with four memberships.
 *
 * Sign in through a provider on the sign-in page: `GET
 * /api/auth/oidc/{provider}` answers 302 to `/auth/callback?code=`, the
 * code is exchanged once for a token whose `provider` starts `oidc-` and
 * whose `id_token` names the issuer `https://auth.example.com` and the
 * client `hyperweaver`. STARTcloud signs the fixture's person in, GitHub
 * the admin, Google the user and Microsoft the guest; an unknown provider
 * lands on `/login?error=no_provider`. Tokens are unsigned JWTs the UI
 * reads and the mock trusts, so a session outlives a restart of the mock.
 *
 * Six hosts on the server role. Desk, VirtualBox on Windows from the
 * hosts fixtures, with launchers, suspend and the guest agent. Lab,
 * VirtualBox on Linux from the agent fixtures, without `host-terminal`.
 * Zones, bhyve on OmniOS from the zones fixtures, with the zone verbs;
 * Verify answers `valid: false` for `web-2`. Studio, macOS with `utm`
 * machines, without `host-power`. `store-1`, bhyve, without `tasks` and
 * without a label. Attic, which the server cannot reach: its row has no
 * capabilities and its routes answer 502, and every two minutes it comes
 * or goes, `servers-updated` sent and the admins notified.
 *
 * The organization filter has data on the server role. A person's
 * memberships ride the record in the identity provider's shape, keyed by
 * uuid. Desk and Attic belong to acme, Zones to acme and prominic, Studio
 * to nomad-field-team, and Lab and `store-1` to none, open to everyone.
 * Some machines of Desk, Lab, Zones and `store-1` belong to acme,
 * prominic or nomad-field-team in `org_uuids` of `GET machines`, the rest
 * to none. An admin reads every uuid of a row, every other person their
 * own of it.
 *
 * Every machine route answers as the agent of the host's kind answers
 * it, read from zoneweaver-agent's controllers and hyperweaver-agent's
 * handlers: a refusal is the agent's own status and body, `{ error,
 * current_status }`, a route one agent lacks answers 404 on its hosts,
 * and what the agent queues is a task here. A task is created pending,
 * runs on a timer, one output line and one `task-updated` a step, and
 * when it ends the machine's state changes and `stats-updated` is sent.
 * Restart is two tasks, the start waiting for the stop. Every host
 * starts with tasks of every status and priority, parents with their
 * subtasks, transfers with byte counts and failures with coloured
 * output; a seeded running task starts moving when its stream opens.
 *
 * The machines of a host and the machine page have data on both agent
 * kinds. `GET machines` answers the row the agent of the host's kind
 * answers, hyperweaver-agent's with `hypervisor`, `backing`, `home` and
 * `spec` and zoneweaver-agent's with `brand`, `zone_id` and the zone's
 * configuration, and `GET machines/{name}` its detail, the devices in
 * `knob_current.devices` on the hyperweaver kind and in `configuration`
 * on the zoneweaver kind. Every other machine was made by a provisioner,
 * a running machine carries `guest_info`, and every third machine's guest
 * agent stays silent, so Set up channel draws. Guest properties answer on
 * the hyperweaver kind alone; the guest agent's reads answer 503 on a
 * host that lists no `guest-agent`. Tags and notes are kept at once. The
 * screen is a PNG of coloured bands that move one step a frame, on Desk,
 * Zones, Studio and the agent roles, which list `machine-screenshot`;
 * Lab, `store-1` and Attic list none and draw no screen.
 *
 * Every host that lists `monitoring` answers the reads of the host page's
 * Overview and of its charts as the agent of its kind answers them, the
 * pools, the datasets, the pool I/O and the ARC on the hosts that list
 * `zfs` alone. A host keeps an hour of samples, one every five seconds,
 * and each sample is sent on the `monitoring` topic as `cpu-sample`,
 * `memory-sample`, `network-sample`, `pool-io-sample` and `arc-sample`.
 * Lab keeps no history and sends no sample: it answers the one sample it
 * took, `realtime`, so its charts draw one point until Refresh reads
 * another.
 *
 * The stream is the events contract's: `retry`, `ready`, ids of
 * `<epoch-ms>-<seq>`, a ring of 500 events or 5 minutes, `Last-Event-ID`
 * replayed from the ring or answered `reset`, `:hb` after 25 idle
 * seconds. `unread-count`, `profile-updated` and `session-terminated`
 * reach the one person they are for, in the ring as on the wire. The
 * health takes a new state every 45 seconds and is sent on `health`.
 *
 * The two WebSockets are hand-written over the upgrade, text frames
 * alone. A ticket of `GET ws-ticket` is good for 60 seconds, may be used
 * again inside them, and is bound to the machine it was asked for: a
 * task stream takes the ticket of the task's machine, the stream of a
 * host-level task and the shell an unbound one. `/tasks/{id}/stream`
 * replays the task's output, then sends each new line and a `status`
 * frame at the end. `/term/{id}` is a line shell that knows `help`,
 * `hostname`, `whoami`, `uptime`, `uname`, `machines`, `tasks`,
 * `features`, `clear` and `exit`, a resize frame read and dropped; on a
 * host of the zoneweaver kind the session keeps its shell and a new
 * socket is greeted with the last 50 lines between the agent's two
 * banners, as zoneweaver-agent does, and on a host of the hyperweaver
 * kind every socket starts a new shell and `exit` writes `Terminal
 * session closed.`, as hyperweaver-agent does.
 *
 * Writes are evaluated against the rules of `GET /api/rules` and refused
 * as the validation contract's problem body: 422 with pointers, 409 for
 * a taken name. A config test fails with the `reachable` rule while a
 * host value holds `unreachable.example.com`; the Rotate logs action of
 * the app configuration steps up first, and the step-up refuses the
 * password `wrong` and the code `000000`. The password
 * `correct horse battery staple` is on the blocklist.
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
  server.listen(PORT, announce);
  startHealth();
  startFlapping();
  startSampling();
  return server;
};

startMockHyperweaver();
