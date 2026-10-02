import { featuresOf, machineOf } from './fleet.js';
import { ago, copyOf, failure, now, ok, problem, refusal, typedProblem } from './kit.js';
import { queue, settles } from './tasks.js';

const SYSTEM_ID = 100;
const ZONE_SERVICES = [
  ['svc:/network/ssh:default', 'online'],
  ['svc:/system/filesystem/local:default', 'online'],
  ['svc:/network/ntp:default', 'online'],
  ['svc:/system/cron:default', 'online'],
  ['svc:/network/http:apache24', 'disabled'],
  ['svc:/system/zones:default', 'online'],
  ['svc:/application/database/postgresql:default', 'maintenance'],
  ['svc:/network/dns/client:default', 'online'],
  ['svc:/network/smb/server:default', 'offline'],
  ['lrc:/etc/rc2_d/S20sysetup', 'legacy_run'],
];
const AGENT_SERVICES = [
  ['sshd.service', 'online'],
  ['cron.service', 'online'],
  ['vboxdrv.service', 'online'],
  ['chrony.service', 'online'],
  ['docker.service', 'disabled'],
  ['nginx.service', 'offline'],
];
const ZONE_USERS = [
  ['root', 0, 0, 'Super-User', '/root', '/usr/bin/bash'],
  ['daemon', 1, 1, '', '/', '/bin/sh'],
  ['sys', 3, 3, '', '/', '/bin/sh'],
  ['mark', 1001, 1001, 'Mark Gilbert', '/export/home/mark', '/usr/bin/bash'],
  ['deploy', 1002, 1002, 'Deployment User', '/export/home/deploy', '/usr/bin/bash'],
  ['backup', 1003, 1003, 'Backup User', '/export/home/backup', '/bin/false'],
];
const AGENT_USERS = [
  ['root', 0, 0, 'root', '/root', '/bin/bash'],
  ['daemon', 1, 1, 'daemon', '/usr/sbin', '/usr/sbin/nologin'],
  ['mark', 1000, 1000, 'Mark Gilbert', '/home/mark', '/bin/bash'],
  ['ci', 1001, 1001, 'CI User', '/home/ci', '/bin/bash'],
];
const ZONE_GROUPS = [
  ['root', 0, []],
  ['sys', 3, ['root', 'bin', 'adm']],
  ['staff', 10, []],
  ['mark', 1001, []],
  ['deploy', 1002, ['mark']],
  ['operators', 1100, ['mark', 'deploy', 'backup', 'ci']],
];
const AGENT_GROUPS = [
  ['root', 0, []],
  ['sudo', 27, ['mark']],
  ['mark', 1000, []],
  ['docker', 999, ['mark', 'ci']],
];
const ROLES = [
  [
    'zoneadm',
    'Zone Administrator',
    '/bin/pfsh',
    '/export/home/zoneadm',
    ['solaris.zone.manage'],
    ['Zone Management'],
  ],
  [
    'netadm',
    'Network Administrator',
    '/bin/pfsh',
    '/export/home/netadm',
    ['solaris.network.*'],
    ['Network Management', 'Network Security'],
  ],
  ['dbadm', 'RBAC Role', '/bin/bash', '/export/home/dbadm', [], ['Service Operator']],
];
const AUTHORIZATIONS = [
  ['solaris.zone.manage', 'Manage zones', 'Grants the ability to manage zones on the system.'],
  ['solaris.zone.login', 'Log in to zones', 'Grants the ability to log in to any zone.'],
  [
    'solaris.network.interface.config',
    'Configure network interfaces',
    'Grants the ability to configure network interfaces, including creating and deleting them.',
  ],
  [
    'solaris.smf.manage.ssh',
    'Manage SSH',
    'Grants the ability to enable, disable and restart the SSH service.',
  ],
  [
    'solaris.system.shutdown',
    'Shut down the system',
    'Grants the ability to shut down, reboot or halt the system.',
  ],
];
const PROFILES = [
  ['Zone Management', 'Manage zones'],
  ['Network Management', 'Manage the host and network configuration'],
  ['Network Security', 'Manage network and host security'],
  ['Service Operator', 'Administer services'],
  ['System Administrator', 'Can perform most non-security administrative tasks'],
];
const RBAC_ROLES = [
  ['root', 'Super-User'],
  ['zoneadm', 'Zone Administrator'],
  ['netadm', 'Network Administrator'],
];
const TIMEZONES = [
  'UTC',
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Africa/Nairobi',
  'Atlantic/Azores',
  'Indian/Maldives',
  'Antarctica/McMurdo',
];
const PEERS = [
  ['0.pool.ntp.org', '*', 'reach', 2, 12.4, 1.2, 0.8, 100],
  ['1.pool.ntp.org', '+', 'reach', 2, 18.9, -2.4, 1.1, 100],
  ['time.cloudflare.com', '-', 'reach', 3, 220.5, 130.2, 60.4, 62],
  ['ntp.example.com', ' ', 'candidate', 4, 60.1, 9.8, 12.3, 87],
];
const NTP_CONFIG = [
  'driftfile /var/ntp/ntp.drift',
  'server 0.pool.ntp.org iburst',
  'server 1.pool.ntp.org iburst',
  'pool time.cloudflare.com iburst',
  'restrict default kod nomodify notrap nopeer noquery',
].join('\n');
const CONFIG_TEMPLATE = [
  'driftfile /var/ntp/ntp.drift',
  'pool 0.omnios.pool.ntp.org iburst',
  'pool 1.omnios.pool.ntp.org iburst',
  'restrict default kod nomodify notrap nopeer noquery',
].join('\n');
const UPDATE_HISTORY = [
  ['2026-09-20T02:14:00.000Z', 'update', 'mark', 'Succeeded'],
  ['2026-09-06T01:50:00.000Z', 'install', 'admin', 'Succeeded'],
  ['2026-08-23T03:02:00.000Z', 'update', 'mark', 'Failed'],
  ['2026-08-09T02:40:00.000Z', 'refresh', 'system', 'Succeeded'],
];
const RAW_OUTPUT = 'Packages to update: 6\nPackages to install: 1\nEstimated space: 184.2 MB';
const RAW_LOW_SPACE =
  'Insufficient disk space for the update. Available space: 1.2 GB. Estimated required: 3.4 GB.';
const LOW_SPACE_HOST = '5';
const RUNLEVELS = ['0', '1', '2', '3', '5', '6', 's', 'S'];
const STRATEGIES = ['parallel_by_priority', 'sequential', 'staggered'];
const SOURCE_ID = /^[a-z0-9_]+$/u;
const SOURCE_REQUIRED = ['display_name', 'url'];
const CONFIG_TITLE = 'The configuration did not pass validation.';
const TEMPLATE_SOURCES = {
  mirror: {
    display_name: 'Mirror',
    url: 'https://mirror.example.com',
    enabled: true,
    default: false,
  },
  boxvault: {
    display_name: 'BoxVault',
    url: 'https://boxvault.example.com',
    enabled: true,
    default: true,
  },
};
const TIME_SYSTEMS = ['ntp', 'chrony', 'ntpsec'];
const PRIORITY_TOP = 100;
const PRIORITY_STEP = 5;
const PRIORITY_BAND = 20;
const PROCESS_COMMANDS = [
  ['/usr/lib/inet/inetd start', 'root', 0.1, '4M'],
  ['/usr/sbin/sshd', 'root', 0.0, '9M'],
  ['/usr/sbin/cron', 'root', 0.0, '2M'],
  ['/usr/lib/ntp/ntpd', 'ntp', 0.2, '3M'],
  ['/usr/bin/bhyve -c 4 -m 8G', 'root', 42.5, '7434M'],
  ['/usr/lib/postgres/bin/postgres -D /var/pg', 'postgres', 3.4, '512M'],
  ['/opt/hyperweaver/bin/agent serve', 'hyperweaver', 1.8, '96M'],
  ['/usr/bin/bash', 'mark', 0.0, '3M'],
  ['/usr/bin/node /opt/app/server.js', 'deploy', 7.9, '210M'],
  ['/usr/sbin/nscd', 'root', 0.0, '5M'],
];
const ACTED = { enable: 'online', disable: 'disabled', restart: 'online', refresh: null };
const EXTRAS = {
  files: () => [
    { fd: 0, description: 'S_IFCHR mode:0666 dev:0,0 ino:0', details: '/dev/null' },
    { fd: 1, description: 'S_IFREG mode:0644 dev:182,65546 ino:4230', details: '/var/log/app.log' },
    { fd: 3, description: 'S_IFSOCK mode:0666', details: 'AF_INET 10.0.0.31:22' },
  ],
  limits: () => ({
    nofile: '65536',
    nproc: '29995',
    stack: '10485760',
    core: 'unlimited',
    cpu: 'unlimited',
  }),
  stack: () =>
    [
      'libc.so.1`__pollsys+0xa',
      'libc.so.1`poll+0x52',
      'sshd`server_loop+0x1b4',
      'sshd`main+0x1e0c',
    ].join('\n'),
};

const states = new Map();

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const behind = (tokens, handler) => ctx =>
  tokens.every(token => offers(ctx.host, token)) ? handler(ctx) : problem(404, 'Not Found');

const serviceRow = ([fmri, state], index) => ({
  fmri,
  state,
  stime: state === 'disabled' ? '-' : ago(400 + index * 37).slice(11, 19),
});

const userRow = ([username, uid, gid, comment, home, shell]) => ({
  username,
  uid,
  gid,
  comment,
  home,
  shell,
});

const groupRow = ([groupname, gid, members]) => ({ groupname, gid, members: [...members] });

const roleRow = ([rolename, comment, shell, home, authorizations, profiles]) => ({
  rolename,
  comment,
  shell,
  home,
  authorizations: [...authorizations],
  profiles: [...profiles],
});

const processRows = host => {
  const zones = isZone(host) ? ['global', ...host.machines.map(row => row.name)] : [];
  return PROCESS_COMMANDS.map(([command, username, cpu, rss], index) => ({
    pid: 100 + index * 7,
    ppid: index === 0 ? 1 : 100,
    username,
    ...(isZone(host) ? { zone: zones[index % zones.length] } : {}),
    cpu_percent: cpu,
    rss,
    vsz: `${Number.parseInt(rss, 10) * 3}M`,
    command,
  }));
};

const prioritiesOf = host =>
  host.machines.map((row, index) => ({
    name: row.name,
    priority: Math.max(1, PRIORITY_TOP - index * PRIORITY_STEP),
    state: row.status,
    has_custom_priority: index % 3 === 0,
  }));

const homeOf = (host, name) => `${isZone(host) ? '/export/home' : '/home'}/${name}`;

const stateOf = host => {
  if (!states.has(host.id)) {
    const zone = isZone(host);
    states.set(host.id, {
      services: (zone ? ZONE_SERVICES : AGENT_SERVICES).map(serviceRow),
      processes: processRows(host),
      users: (zone ? ZONE_USERS : AGENT_USERS).map(userRow),
      groups: (zone ? ZONE_GROUPS : AGENT_GROUPS).map(groupRow),
      roles: ROLES.map(roleRow),
      locked: new Set(),
      timezone: zone ? 'America/Chicago' : 'Europe/Berlin',
      timeService: zone ? 'ntp' : 'chrony',
      config: NTP_CONFIG,
      configExists: true,
      lastSync: ago(15),
      history: UPDATE_HISTORY.map(([date, operation, user, status]) => ({
        date,
        operation,
        user,
        status,
      })),
      orchestration: { enabled: zone, strategy: 'parallel_by_priority' },
      priorities: prioritiesOf(host),
      runlevel: '3',
      templateSources: copyOf(TEMPLATE_SOURCES),
    });
  }
  return states.get(host.id);
};

const paramOf = (ctx, name) => ctx.url.searchParams.get(name) || '';

const limitOf = (ctx, fallback) => Number(paramOf(ctx, 'limit')) || fallback;

const matching = (rows, text, member) =>
  text ? rows.filter(row => String(row[member]).toLowerCase().includes(text.toLowerCase())) : rows;

const queued = ({ ctx, operation, target, metadata = null }) => {
  const task = queue({ host: ctx.host, by: ctx.person.username, operation, target, metadata });
  return ok(
    { success: true, message: `${operation} task created`, task_id: task.id, status: 'pending' },
    202
  );
};

const services = ctx => {
  const all = paramOf(ctx, 'all') === 'true';
  const zone = paramOf(ctx, 'zone');
  const pattern = paramOf(ctx, 'pattern');
  const rows = stateOf(ctx.host)
    .services.filter(row => all || row.state !== 'disabled')
    .filter(() => !zone || zone === 'global')
    .filter(row => !pattern || row.fmri.includes(pattern));
  return ok(rows);
};

const serviceOf = (ctx, fmri) =>
  stateOf(ctx.host).services.find(row => row.fmri === decodeURIComponent(fmri)) || null;

const shownService = ctx => {
  const row = serviceOf(ctx, ctx.params.fmri);
  if (!row) {
    return refusal(404, 'Service not found');
  }
  return ok({
    fmri: row.fmri,
    name: row.fmri.split('/').pop(),
    state: row.state,
    next_state: 'none',
    enabled: row.state !== 'disabled',
    restarter: 'svc:/system/svc/restarter:default',
    contract_id: row.state === 'online' ? 118 : null,
    dependencies: ['svc:/milestone/network:default', 'svc:/system/filesystem/local:default'],
    log_file: `/var/svc/log/${row.fmri.replace('svc:/', '').replace(/[/:]/g, '-')}.log`,
  });
};

const shownProperties = ctx => {
  const row = serviceOf(ctx, ctx.params.fmri);
  if (!row) {
    return refusal(404, 'Service not found');
  }
  return ok({
    'general/enabled': String(row.state !== 'disabled'),
    'general/entity_stability': 'Unstable',
    'restarter/state': row.state,
    'start/exec': `/lib/svc/method/${row.fmri.split('/').pop().split(':')[0]} start`,
    'start/timeout_seconds': '60',
    'stop/exec': ':kill',
    'config/manpage': 'https://illumos.org/man/8/svcadm',
    'config/notes': 'Line one of the notes\nLine two of the notes',
  });
};

const serviceAction = ctx => {
  const { body } = ctx;
  const row = serviceOf(ctx, body.fmri || '');
  if (!row) {
    return refusal(404, 'Service not found');
  }
  if (!(body.action in ACTED)) {
    return refusal(400, `Unknown action: ${body.action}`);
  }
  if (ACTED[body.action]) {
    row.state = ACTED[body.action];
  }
  return ok({ success: true, message: `Service ${body.action} completed`, fmri: row.fmri });
};

const processes = ctx => {
  const zone = paramOf(ctx, 'zone');
  const user = paramOf(ctx, 'user');
  const command = paramOf(ctx, 'command');
  const detailed = paramOf(ctx, 'detailed') === 'true';
  const rows = stateOf(ctx.host)
    .processes.filter(row => !zone || row.zone === zone)
    .filter(row => !user || row.username === user)
    .filter(row => !command || row.command.includes(command))
    .slice(0, limitOf(ctx, 5000))
    .map(row => (detailed ? row : { ...row, cpu_percent: undefined, rss: undefined }));
  return ok(rows);
};

const processOf = ctx =>
  stateOf(ctx.host).processes.find(row => String(row.pid) === ctx.params.pid) || null;

const shownProcess = ctx => {
  const row = processOf(ctx);
  if (!row) {
    return refusal(404, 'Process not found');
  }
  return ok({
    pid: row.pid,
    ppid: row.ppid,
    zone: row.zone,
    uid: row.username === 'root' ? 0 : 1001,
    vsz: Number.parseInt(row.vsz, 10) * 1024 * 1024,
    rss: Number.parseInt(row.rss, 10) * 1024 * 1024,
    command: row.command,
    open_files_sample: ['/dev/null', '/var/log/app.log', '/etc/passwd'],
  });
};

const shownExtra = kind => ctx =>
  processOf(ctx) ? ok(EXTRAS[kind]()) : refusal(404, 'Process not found');

const dropProcess = (host, pid) => {
  const state = stateOf(host);
  state.processes = state.processes.filter(row => String(row.pid) !== String(pid));
};

const killProcess = ctx => {
  const row = processOf(ctx);
  if (!row) {
    return refusal(404, 'Process not found');
  }
  dropProcess(ctx.host, row.pid);
  return ok({
    success: true,
    message: `Process ${row.pid} killed`,
    pid: row.pid,
    force: Boolean(ctx.body.force),
  });
};

const signalProcess = ctx => {
  const row = processOf(ctx);
  if (!row) {
    return refusal(404, 'Process not found');
  }
  const signal = ctx.body.signal || 'TERM';
  if (signal === 'KILL' || signal === 'TERM') {
    dropProcess(ctx.host, row.pid);
  }
  return ok({
    success: true,
    message: `Signal ${signal} sent to ${row.pid}`,
    pid: row.pid,
    signal,
  });
};

const batchKill = ctx => {
  const { body, host } = ctx;
  if (!body.pattern) {
    return refusal(400, 'pattern is required');
  }
  const killed = stateOf(host)
    .processes.filter(row => row.command.includes(body.pattern))
    .filter(row => !body.zone || row.zone === body.zone)
    .map(row => row.pid);
  killed.forEach(pid => dropProcess(host, pid));
  return ok({
    success: true,
    message: `${killed.length} processes killed`,
    killed,
    signal: body.signal,
  });
};

const users = ctx => {
  const system = paramOf(ctx, 'include_system') === 'true';
  const rows = matching(stateOf(ctx.host).users, paramOf(ctx, 'username'), 'username')
    .filter(row => system || row.uid >= SYSTEM_ID || row.username === 'root')
    .slice(0, limitOf(ctx, 50));
  return ok({ users: rows, total: rows.length });
};

const userOf = ctx => stateOf(ctx.host).users.find(row => row.username === ctx.params.name) || null;

const userAttributes = ctx => {
  const row = userOf(ctx);
  if (!row) {
    return refusal(404, 'User not found');
  }
  const state = stateOf(ctx.host);
  const mark = row.username === 'mark';
  return ok({
    username: row.username,
    groups: state.groups
      .filter(group => group.members.includes(row.username))
      .map(group => group.groupname),
    authorizations: mark ? ['solaris.zone.manage', 'solaris.smf.manage.ssh'] : [],
    profiles: mark ? ['Zone Management'] : [],
    roles: mark ? ['zoneadm'] : [],
    project: 'default',
    account_status: state.locked.has(row.username) ? 'locked' : 'active',
    password_status: row.shell === '/bin/false' ? 'no-login' : 'set',
    last_login: mark ? ago(120) : '',
  });
};

const createUser = ctx => {
  const { body, host } = ctx;
  if (!body.username) {
    return refusal(400, 'username is required');
  }
  if (stateOf(host).users.some(row => row.username === body.username)) {
    return refusal(409, `User ${body.username} already exists`);
  }
  return queued({ ctx, operation: 'user_create', target: body.username, metadata: body });
};

const settleUserCreate = (host, task) => {
  const state = stateOf(host);
  const body = task.metadata || {};
  const uid = body.uid || Math.max(...state.users.map(row => row.uid)) + 1;
  state.users = [
    ...state.users,
    {
      username: task.machine_name,
      uid,
      gid: body.create_personal_group === false ? SYSTEM_ID : uid,
      comment: body.comment || '',
      home: body.create_home === false ? '/' : homeOf(host, task.machine_name),
      shell: body.shell || '/bin/bash',
    },
  ];
};

const updateUser = ctx => {
  const row = userOf(ctx);
  if (!row) {
    return refusal(404, 'User not found');
  }
  const { body } = ctx;
  if (body.new_comment !== undefined) {
    row.comment = body.new_comment || '';
  }
  if (body.new_shell) {
    row.shell = body.new_shell;
  }
  return ok({ success: true, message: `User ${row.username} updated`, username: row.username });
};

const deleteUser = ctx => {
  const row = userOf(ctx);
  if (!row) {
    return refusal(404, 'User not found');
  }
  return queued({ ctx, operation: 'user_delete', target: row.username });
};

const settleUserDelete = (host, task) => {
  const state = stateOf(host);
  state.users = state.users.filter(user => user.username !== task.machine_name);
};

const lockUser = locked => ctx => {
  const row = userOf(ctx);
  if (!row) {
    return refusal(404, 'User not found');
  }
  const state = stateOf(ctx.host);
  if (locked) {
    state.locked.add(row.username);
  } else {
    state.locked.delete(row.username);
  }
  return ok({ success: true, message: `User ${row.username} ${locked ? 'locked' : 'unlocked'}` });
};

const setPassword = ctx => {
  const row = userOf(ctx);
  if (!row) {
    return refusal(404, 'User not found');
  }
  if (!ctx.body.password) {
    return refusal(400, 'password is required');
  }
  if (ctx.body.unlock_account) {
    stateOf(ctx.host).locked.delete(row.username);
  }
  return ok({ success: true, message: `Password set for ${row.username}` });
};

const groups = ctx => {
  const system = paramOf(ctx, 'include_system') === 'true';
  const rows = matching(stateOf(ctx.host).groups, paramOf(ctx, 'groupname'), 'groupname')
    .filter(row => system || row.gid >= SYSTEM_ID)
    .slice(0, limitOf(ctx, 50));
  return ok({ groups: rows, total: rows.length });
};

const createGroup = ctx => {
  const { body, host } = ctx;
  if (!body.groupname) {
    return refusal(400, 'groupname is required');
  }
  if (stateOf(host).groups.some(row => row.groupname === body.groupname)) {
    return refusal(409, `Group ${body.groupname} already exists`);
  }
  return queued({ ctx, operation: 'group_create', target: body.groupname, metadata: body });
};

const settleGroupCreate = (host, task) => {
  const state = stateOf(host);
  const gid = task.metadata?.gid || Math.max(...state.groups.map(row => row.gid)) + 1;
  state.groups = [...state.groups, { groupname: task.machine_name, gid, members: [] }];
};

const deleteGroup = ctx => {
  const row = stateOf(ctx.host).groups.find(group => group.groupname === ctx.params.name);
  if (!row) {
    return refusal(404, 'Group not found');
  }
  return queued({ ctx, operation: 'group_delete', target: row.groupname });
};

const settleGroupDelete = (host, task) => {
  const state = stateOf(host);
  state.groups = state.groups.filter(group => group.groupname !== task.machine_name);
};

const roles = ctx => {
  const rows = matching(stateOf(ctx.host).roles, paramOf(ctx, 'rolename'), 'rolename').slice(
    0,
    limitOf(ctx, 50)
  );
  return ok({ roles: rows, total: rows.length });
};

const createRole = ctx => {
  const { body, host } = ctx;
  if (!body.rolename) {
    return refusal(400, 'rolename is required');
  }
  if (stateOf(host).roles.some(row => row.rolename === body.rolename)) {
    return refusal(409, `Role ${body.rolename} already exists`);
  }
  return queued({ ctx, operation: 'role_create', target: body.rolename, metadata: body });
};

const settleRoleCreate = (host, task) => {
  const state = stateOf(host);
  const body = task.metadata || {};
  state.roles = [
    ...state.roles,
    {
      rolename: task.machine_name,
      comment: body.comment || 'RBAC Role',
      shell: body.shell || '/bin/pfsh',
      home: body.create_home ? `/export/home/${task.machine_name}` : '',
      authorizations: body.authorizations || [],
      profiles: body.profiles || [],
    },
  ];
};

const deleteRole = ctx => {
  const row = stateOf(ctx.host).roles.find(role => role.rolename === ctx.params.name);
  if (!row) {
    return refusal(404, 'Role not found');
  }
  return queued({ ctx, operation: 'role_delete', target: row.rolename });
};

const settleRoleDelete = (host, task) => {
  const state = stateOf(host);
  state.roles = state.roles.filter(role => role.rolename !== task.machine_name);
};

const rbacList = (rows, member) => ctx => {
  const filter = paramOf(ctx, 'filter').toLowerCase();
  const listed = rows
    .filter(row => !filter || row.name.toLowerCase().includes(filter))
    .slice(0, limitOf(ctx, 100));
  return ok({ [member]: listed, total: listed.length });
};

const authorizationRows = AUTHORIZATIONS.map(([name, short, long]) => ({
  name,
  short_description: short,
  long_description: long,
}));

const profileRows = PROFILES.map(([name, description]) => ({ name, description }));

const rbacRoleRows = RBAC_ROLES.map(([name, description]) => ({ name, description }));

const timezone = ctx =>
  ok({ timezone: stateOf(ctx.host).timezone, local_time: now(), utc_offset: '-05:00' });

const setTimezone = ctx => {
  const { body } = ctx;
  if (!body.timezone) {
    return refusal(400, 'timezone is required');
  }
  stateOf(ctx.host).timezone = body.timezone;
  return ok({
    success: true,
    message: `Timezone set to ${body.timezone}`,
    timezone: body.timezone,
  });
};

const peerRows = () =>
  PEERS.map(([remote, indicator, status, stratum, delay, offset, jitter, reach]) => ({
    remote,
    indicator,
    status,
    stratum,
    delay,
    offset,
    jitter,
    reachability_percent: reach,
  }));

const fmriOf = (host, service) =>
  isZone(host) ? `svc:/network/${service}:default` : `${service}.service`;

const timeStatus = ctx => {
  const state = stateOf(ctx.host);
  return ok({
    service: state.timeService,
    status: 'available',
    available: true,
    timezone: state.timezone,
    last_checked: now(),
    service_details: { state: 'online', fmri: fmriOf(ctx.host, state.timeService) },
    peers: peerRows(),
    last_sync: state.lastSync,
  });
};

const systemRow = (installed, enabled, canSwitch, name) => ({
  installed,
  enabled,
  can_switch_to: canSwitch,
  package_name: name,
});

const timeSystems = ctx => {
  const { timeService } = stateOf(ctx.host);
  return ok({
    available: {
      ntp: systemRow(true, timeService === 'ntp', true, 'service/network/ntp'),
      chrony: systemRow(
        timeService === 'chrony',
        timeService === 'chrony',
        true,
        'service/network/chrony'
      ),
      ntpsec: systemRow(false, false, false, 'service/network/ntpsec'),
    },
    current: { service: timeService },
  });
};

const syncTime = ctx => {
  stateOf(ctx.host).lastSync = now();
  return ok({ success: true, message: 'Time synchronization initiated' });
};

const switchTime = ctx => {
  const { body } = ctx;
  if (!TIME_SYSTEMS.includes(body.target_system)) {
    return refusal(400, 'Unknown time synchronization system');
  }
  if (body.target_system === 'ntpsec') {
    return refusal(400, 'Cannot switch to ntpsec: the package is not available');
  }
  stateOf(ctx.host).timeService = body.target_system;
  return ok({ success: true, message: `Switched to ${body.target_system}` });
};

const timeConfig = ctx => {
  const state = stateOf(ctx.host);
  return ok({
    service: state.timeService,
    config_file: `/etc/inet/${state.timeService}.conf`,
    config_exists: state.configExists,
    current_config: state.config,
    suggested_defaults: { config_template: CONFIG_TEMPLATE },
  });
};

const saveTimeConfig = ctx => {
  const { body } = ctx;
  if (!body.config_content) {
    return refusal(400, 'config_content is required');
  }
  const state = stateOf(ctx.host);
  state.config = body.config_content;
  state.configExists = true;
  return ok({
    success: true,
    message: 'Configuration updated',
    backup_created: Boolean(body.backup_existing),
  });
};

const checkUpdates = ctx =>
  ok({
    updates_available: true,
    total_updates: 7,
    last_checked: now(),
    plan_summary: {
      packages_to_install: 1,
      packages_to_update: 6,
      packages_to_remove: 0,
      total_download_size: '184.2 MB',
    },
    raw_output: String(ctx.host.id) === LOW_SPACE_HOST ? RAW_LOW_SPACE : RAW_OUTPUT,
  });

const updateHistory = ctx => {
  const rows = stateOf(ctx.host).history.slice(0, limitOf(ctx, 20));
  return ok({ history: rows, total: rows.length });
};

const updateTask = operation => ctx =>
  queued({ ctx, operation, target: 'system', metadata: ctx.body });

const settleUpdate = word => (host, task) => {
  const state = stateOf(host);
  state.history = [
    { date: now(), operation: word, user: task.created_by, status: 'Succeeded' },
    ...state.history,
  ];
};

const orchestrationStatus = ctx => {
  const state = stateOf(ctx.host);
  return ok({
    orchestration_enabled: state.orchestration.enabled,
    strategy: state.orchestration.strategy,
    machines_with_priority: state.priorities.filter(row => row.has_custom_priority).length,
  });
};

const setOrchestration = enabled => ctx => {
  stateOf(ctx.host).orchestration.enabled = enabled;
  return ok({
    success: true,
    message: enabled
      ? 'Orchestration enabled, applies at the next agent start'
      : 'Orchestration disabled',
  });
};

const priorities = ctx => ok({ machines: stateOf(ctx.host).priorities });

const bandOf = priority => {
  const floor = Math.floor(priority / PRIORITY_BAND) * PRIORITY_BAND;
  return `${floor}-${floor + PRIORITY_BAND - 1}`;
};

const testOrchestration = ctx => {
  const state = stateOf(ctx.host);
  const strategy = ctx.body?.strategy || state.orchestration.strategy;
  const sorted = [...state.priorities].sort((first, second) => second.priority - first.priority);
  const bands = new Map();
  sorted.forEach(row => {
    const band = bandOf(row.priority);
    bands.set(band, [...(bands.get(band) || []), { name: row.name, priority: row.priority }]);
  });
  return ok({
    strategy,
    total_machines: sorted.length,
    estimated_duration: `${sorted.length * 15}s`,
    execution_plan: [...bands.entries()].map(([priority_range, machines]) => ({
      priority_range,
      machines,
    })),
  });
};

/**
 * The boot priority written through `PUT machines/{name}` with
 * `boot_priority`, kept beside the machine's row so the priorities read
 * it back at once.
 *
 * @param {Object} host - The host
 * @param {string} name - The machine name
 * @param {number} priority - The priority
 * @returns {boolean} Whether the machine is known
 */
export const setBootPriority = (host, name, priority) => {
  if (!machineOf(host, name)) {
    return false;
  }
  const state = stateOf(host);
  state.priorities = state.priorities.map(row =>
    row.name === name ? { ...row, priority, has_custom_priority: true } : row
  );
  return true;
};

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const configRefused = errors =>
  typedProblem({ status: 422, name: 'validation', title: CONFIG_TITLE, more: { errors } });

const configSaved = () => ok({ message: 'Configuration saved.', requires_restart: [] });

const machinesFile = ctx => {
  const { orchestration } = stateOf(ctx.host);
  return ok({
    schemaVersion: 1,
    machines: {
      orchestration: { enabled: orchestration.enabled, strategy: orchestration.strategy },
    },
  });
};

const patchMachines = ctx => {
  const strategy = ctx.body?.machines?.orchestration?.strategy;
  if (strategy !== undefined && !STRATEGIES.includes(strategy)) {
    return configRefused([
      failure({
        pointer: '/machines/orchestration/strategy',
        rule: 'enum',
        params: { enum: STRATEGIES },
      }),
    ]);
  }
  if (strategy !== undefined) {
    stateOf(ctx.host).orchestration.strategy = strategy;
  }
  return configSaved();
};

const storageFile = ctx =>
  ok({
    schemaVersion: 1,
    template_sources: { sources: copyOf(stateOf(ctx.host).templateSources) },
  });

const sourceFailure = (held, [id, entry]) => {
  const pointer = `/template_sources/sources/${id}`;
  if (!SOURCE_ID.test(id)) {
    return failure({ pointer, rule: 'propertyNames', params: { pattern: SOURCE_ID.source } });
  }
  if (entry === null) {
    return null;
  }
  const merged = { ...(held[id] || {}), ...entry };
  const missing = SOURCE_REQUIRED.filter(member => !merged[member]);
  return missing.length > 0
    ? failure({ pointer, rule: 'required', params: { required: missing } })
    : null;
};

const patchStorage = ctx => {
  const entries = ctx.body?.template_sources?.sources;
  const held = stateOf(ctx.host).templateSources;
  if (!isObject(entries)) {
    return configSaved();
  }
  const errors = Object.entries(entries)
    .map(pair => sourceFailure(held, pair))
    .filter(Boolean);
  if (errors.length > 0) {
    return configRefused(errors);
  }
  Object.entries(entries).forEach(([id, entry]) => {
    if (entry === null) {
      delete held[id];
    } else {
      held[id] = { ...(held[id] || {}), ...entry };
    }
  });
  return configSaved();
};

/**
 * The registries of a host as `GET templates/sources` answers them, read
 * from the `storage` file the config routes patch, the schema's defaults
 * filled: `enabled` true and `default` false while the entry says nothing.
 *
 * @param {Object} host - The host
 * @returns {Array<Object>} The rows, `{ name, url, enabled, default }`
 */
export const templateSourcesOf = host =>
  Object.entries(stateOf(host).templateSources).map(([name, entry]) => ({
    name,
    url: entry.url,
    enabled: entry.enabled !== false,
    default: entry.default === true,
  }));

const runlevel = ctx =>
  ok({ current_runlevel: stateOf(ctx.host).runlevel, available_runlevels: RUNLEVELS });

const runlevelTask = (operation, levelOf) => ctx => {
  const level = String(levelOf(ctx.body));
  if (!RUNLEVELS.includes(level)) {
    return refusal(400, `Unknown runlevel: ${level}`);
  }
  return queued({ ctx, operation, target: 'system', metadata: { runlevel: level } });
};

const settleRunlevel = (host, task) => {
  stateOf(host).runlevel = String(task.metadata?.runlevel || '3');
};

const multiUserLevel = body => (body.network_services === false ? '2' : '3');

/**
 * The system group of the Manage page, each route answered as the agents
 * answer it and 404 on a host that lists no token of its section: the
 * services and their actions behind `services`, the processes, their
 * detail, files, limits and stack, the kill, the signal and the batch
 * kill behind `processes`, the users, groups, roles and the three RBAC
 * lists behind `system-users`, the account creates and deletes queued as
 * tasks the way zoneweaver-agent queues them, the time zone, the
 * synchronization status, systems, sync, switch and configuration
 * behind `time-sync`, the update check, history, refresh and install
 * behind `packages`, the orchestration, the priorities and the dry run
 * behind `machines`, the `machines` and `storage` configuration files of
 * the config contract with their merge patches, the strategy and the
 * registries map, and the runlevel with its three queued
 * tasks behind `host-power`. Mounted before the machine routes so
 * `machines/orchestration/...` and `machines/priorities` are not taken
 * for a machine's name. Nothing here runs on a clock but the tasks.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountManage = agentRoute => {
  settles('user_create', settleUserCreate);
  settles('user_delete', settleUserDelete);
  settles('group_create', settleGroupCreate);
  settles('group_delete', settleGroupDelete);
  settles('role_create', settleRoleCreate);
  settles('role_delete', settleRoleDelete);
  settles('system_updates_refresh', settleUpdate('refresh'));
  settles('system_updates_install', settleUpdate('update'));
  settles('system_host_runlevel', settleRunlevel);
  settles('system_host_single_user', settleRunlevel);
  settles('system_host_multi_user', settleRunlevel);
  const rbac = ['system-users'];
  const time = ['time-sync'];
  const power = ['host-power'];
  agentRoute('GET', 'services', behind(['services'], services));
  agentRoute('GET', 'services/:fmri', behind(['services'], shownService));
  agentRoute('GET', 'services/:fmri/properties', behind(['services'], shownProperties));
  agentRoute('POST', 'services/action', behind(['services'], serviceAction));
  agentRoute('GET', 'system/processes', behind(['processes'], processes));
  agentRoute('GET', 'system/processes/:pid', behind(['processes'], shownProcess));
  agentRoute('GET', 'system/processes/:pid/files', behind(['processes'], shownExtra('files')));
  agentRoute('GET', 'system/processes/:pid/limits', behind(['processes'], shownExtra('limits')));
  agentRoute('GET', 'system/processes/:pid/stack', behind(['processes'], shownExtra('stack')));
  agentRoute('POST', 'system/processes/batch-kill', behind(['processes'], batchKill));
  agentRoute('POST', 'system/processes/:pid/kill', behind(['processes'], killProcess));
  agentRoute('POST', 'system/processes/:pid/signal', behind(['processes'], signalProcess));
  agentRoute('GET', 'system/users', behind(rbac, users));
  agentRoute('POST', 'system/users', behind(rbac, createUser));
  agentRoute('GET', 'system/users/:name/attributes', behind(rbac, userAttributes));
  agentRoute('PUT', 'system/users/:name', behind(rbac, updateUser));
  agentRoute('DELETE', 'system/users/:name', behind(rbac, deleteUser));
  agentRoute('POST', 'system/users/:name/lock', behind(rbac, lockUser(true)));
  agentRoute('POST', 'system/users/:name/unlock', behind(rbac, lockUser(false)));
  agentRoute('POST', 'system/users/:name/password', behind(rbac, setPassword));
  agentRoute('GET', 'system/groups', behind(rbac, groups));
  agentRoute('POST', 'system/groups', behind(rbac, createGroup));
  agentRoute('DELETE', 'system/groups/:name', behind(rbac, deleteGroup));
  agentRoute('GET', 'system/roles', behind(rbac, roles));
  agentRoute('POST', 'system/roles', behind(rbac, createRole));
  agentRoute('DELETE', 'system/roles/:name', behind(rbac, deleteRole));
  agentRoute(
    'GET',
    'system/rbac/authorizations',
    behind(rbac, rbacList(authorizationRows, 'authorizations'))
  );
  agentRoute('GET', 'system/rbac/profiles', behind(rbac, rbacList(profileRows, 'profiles')));
  agentRoute('GET', 'system/rbac/roles', behind(rbac, rbacList(rbacRoleRows, 'roles')));
  agentRoute('GET', 'system/timezone', behind(time, timezone));
  agentRoute('PUT', 'system/timezone', behind(time, setTimezone));
  agentRoute(
    'GET',
    'system/timezones',
    behind(time, () => ok({ timezones: TIMEZONES }))
  );
  agentRoute('GET', 'system/time-sync/status', behind(time, timeStatus));
  agentRoute('GET', 'system/time-sync/available-systems', behind(time, timeSystems));
  agentRoute('POST', 'system/time-sync/sync', behind(time, syncTime));
  agentRoute('POST', 'system/time-sync/switch', behind(time, switchTime));
  agentRoute('GET', 'system/time-sync/config', behind(time, timeConfig));
  agentRoute('PUT', 'system/time-sync/config', behind(time, saveTimeConfig));
  agentRoute('GET', 'system/updates/check', behind(['packages'], checkUpdates));
  agentRoute('GET', 'system/updates/history', behind(['packages'], updateHistory));
  agentRoute(
    'POST',
    'system/updates/refresh',
    behind(['packages'], updateTask('system_updates_refresh'))
  );
  agentRoute(
    'POST',
    'system/updates/install',
    behind(['packages'], updateTask('system_updates_install'))
  );
  agentRoute('GET', 'machines/orchestration/status', behind(['machines'], orchestrationStatus));
  agentRoute('POST', 'machines/orchestration/enable', behind(['machines'], setOrchestration(true)));
  agentRoute(
    'POST',
    'machines/orchestration/disable',
    behind(['machines'], setOrchestration(false))
  );
  agentRoute('POST', 'machines/orchestration/test', behind(['machines'], testOrchestration));
  agentRoute('GET', 'machines/priorities', behind(['machines'], priorities));
  agentRoute('GET', 'config/machines', machinesFile);
  agentRoute('PUT', 'config/machines', patchMachines);
  agentRoute('GET', 'config/storage', storageFile);
  agentRoute('PUT', 'config/storage', patchStorage);
  agentRoute('GET', 'system/host/runlevel', behind(power, runlevel));
  agentRoute(
    'POST',
    'system/host/runlevel',
    behind(
      power,
      runlevelTask('system_host_runlevel', body => body.runlevel)
    )
  );
  agentRoute(
    'POST',
    'system/host/single-user',
    behind(
      power,
      runlevelTask('system_host_single_user', () => 's')
    )
  );
  agentRoute(
    'POST',
    'system/host/multi-user',
    behind(power, runlevelTask('system_host_multi_user', multiUserLevel))
  );
};
