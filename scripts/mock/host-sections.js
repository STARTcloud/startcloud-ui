import { featuresOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { openSocket } from './socket.js';
import { queue, settles } from './tasks.js';

const GIB = 1024 ** 3;
const PHYSICAL_MEMORY = 64 * GIB;
const SYSLOG_RULES = [
  ['*.err;kern.notice;auth.notice', '/dev/sysmsg', 'file'],
  ['*.err;kern.debug;daemon.notice;mail.crit', '/var/adm/messages', 'file'],
  ['*.alert;kern.err;daemon.err', 'operator', 'user'],
  ['*.alert', 'root', 'user'],
  ['*.emerg', '*', 'all_users'],
  ['mail.debug', "ifdef(`LOGHOST', /var/log/syslog, @loghost)", 'conditional'],
];
const FACILITIES = [
  ['*', 'All facilities'],
  ['kern', 'Kernel messages'],
  ['user', 'User processes'],
  ['mail', 'Mail system'],
  ['daemon', 'System daemons'],
  ['auth', 'Authentication'],
  ['local0', 'Local use 0'],
];
const LEVELS = [
  ['emerg', 'System is unusable'],
  ['alert', 'Action must be taken immediately'],
  ['crit', 'Critical conditions'],
  ['err', 'Error conditions'],
  ['warning', 'Warning conditions'],
  ['notice', 'Normal but significant'],
  ['info', 'Informational'],
  ['debug', 'Debug-level messages'],
];
const LOG_FILES = [
  ['messages', 'system', '/var/adm/messages', 184320, '180.0 KB'],
  ['syslog', 'system', '/var/log/syslog', 92160, '90.0 KB'],
  ['authlog', 'authentication', '/var/log/authlog', 20480, '20.0 KB'],
];
const LOG_LINES = [
  'Sep 28 10:14:02 zone-1 sshd[1281]: [ID 800047 auth.info] Accepted publickey for mark',
  'Sep 28 10:14:05 zone-1 cron[912]: [ID 702911 cron.info] < mark 912 c Sun Sep 28 10:14:05 2026 >',
  'Sep 28 10:15:11 zone-1 zoneadmd[3310]: [ID 702911 daemon.notice] zone db-1 booted',
  'Sep 28 10:16:40 zone-1 fmd[210]: [ID 377184 daemon.error] SUNW-MSG-ID: ZFS-8000-8A, TYPE: Fault',
  'Sep 28 10:17:02 zone-1 in.ndpd[610]: [ID 702911 daemon.warning] interface vnic0 down',
  'Sep 28 10:18:30 zone-1 ntpd[801]: [ID 702911 daemon.debug] peer 0.pool.ntp.org reachable',
];
const FAULT_LINES = {
  faults:
    'TIME                 EVENT-ID                             MSG-ID         SEVERITY\nSep 28 10:16:40 e7a1c3d4-9b2f-4c1e-8d3a-5f6e7a8b9c0d ZFS-8000-8A    Major',
  errors: 'Sep 28 10:16:39 ereport.fs.zfs.checksum pool=tank vdev=c0t5000C500B2C3D4E8d0',
  info: 'Sep 28 10:16:41 list.suspect-fault ZFS-8000-8A',
  'info-hival': 'Sep 28 10:16:41 list.repaired ZFS-8000-8A',
};
const BOOT_ENVIRONMENTS = [
  ['omnios-r151054', true, true, '/', '6.05G', 'static', '2026-08-01 09:12', false],
  ['omnios-r151052', false, false, '-', '412M', 'static', '2026-03-14 18:40', false],
  ['test-be', false, false, '-', '96K', 'dynamic', '2026-09-20 02:14', true],
];
const FAULTS = [
  [
    'e7a1c3d4-9b2f-4c1e-8d3a-5f6e7a8b9c0d',
    'ZFS-8000-8A',
    'Major',
    'Sep 28 10:16:40',
    'zfs://pool=tank/vdev=c0t5000C500B2C3D4E8d0 faulted but still in service',
    'fault.fs.zfs.device',
    'A file or directory could not be read due to corrupt data.',
  ],
  [
    'b2c3d4e5-6f70-4a81-9b2c-3d4e5f6a7b8c',
    'CPU-8000-4E',
    'Critical',
    'Sep 27 22:01:12',
    'cpu:///cpuid=3 faulted and taken out of service',
    'fault.cpu.intel.internal',
    'The number of errors on this CPU has exceeded acceptable levels.',
  ],
  [
    'c3d4e5f6-7a8b-4c9d-8e0f-1a2b3c4d5e6f',
    'SMF-8000-YX',
    'Minor',
    'Sep 25 08:30:00',
    'svc:///network/http:apache24 degraded',
    'defect.sunos.smf.svc.maintenance',
    'A service failed to start and is in maintenance.',
  ],
];
const FAULT_MODULES = [
  ['cpumem-retire', '1.1', 'CPU/Memory Retire Agent'],
  ['disk-transport', '1.0', 'Disk Transport Agent'],
  ['zfs-diagnosis', '1.0', 'ZFS Diagnosis Engine'],
  ['zfs-retire', '1.0', 'ZFS Retire Agent'],
  ['eft', '1.16', 'eft diagnosis engine'],
  ['fmd-self-diagnosis', '1.0', 'Fault Manager Self-Diagnosis'],
  ['ip-transport', '2.0', 'IP Transport Agent'],
  ['syslog-msgs', '1.1', 'Syslog Messaging Agent'],
];
const DATABASES = {
  monitoring: {
    files: [
      ['monitoring.db', 52428800],
      ['monitoring.db-wal', 4194304],
    ],
    tables: [
      ['cpu_stats', 86400, 2],
      ['memory_stats', 86400, 2],
      ['network_usage', 259200, 3],
      ['disk_io', 172800, 3],
      ['arc_stats', 43200, 2],
    ],
  },
  tasks: {
    files: [['tasks.db', 8388608]],
    tables: [
      ['tasks', 1240, 4],
      ['task_output', 98210, 1],
    ],
  },
};
const REPOSITORIES = [
  ['omnios', 'origin', 'https://pkg.omnios.org/r151054/core/', true, 'F', true],
  ['omnios', 'mirror', 'https://mirror.omnios.org/r151054/core/', true, 'F', false],
  ['extra.omnios', 'origin', 'https://pkg.omnios.org/r151054/extra/', true, 'T', false],
  ['ooce', 'origin', 'https://pkg.omnios.org/r151054/braich/', false, 'F', false],
];
const ROW_COLUMNS = ['id', 'timestamp', 'value'];
const ROW_TOTAL = 120;

const states = new Map();

const offers = (host, token) => featuresOf(host).includes(token);

const behind = (tokens, handler) => ctx =>
  tokens.every(token => offers(ctx.host, token)) ? handler(ctx) : problem(404, 'Not Found');

const syslogRule = ([selector, action, type], index) => ({
  line_number: index + 1,
  selector,
  action,
  full_line: `${selector}\t\t\t${action}`,
  parsed: { action_type: type, action_target: action },
});

const syslogText = rules => rules.map(rule => rule.full_line).join('\n');

const bootEnvironmentRow = ([
  name,
  active,
  reboot,
  mountpoint,
  space,
  policy,
  created,
  temporary,
]) => ({
  name,
  is_active_now: active,
  is_active_on_reboot: reboot,
  mountpoint,
  space,
  policy,
  created,
  is_temporary: temporary,
});

const faultRow = ([uuid, msgId, severity, time, affects, faultClass, description]) => ({
  uuid,
  msgId,
  severity,
  time,
  details: {
    host: 'zone-1',
    platform: 'i86pc',
    faultClass,
    affects,
    problemIn: affects.split(' ')[0],
    description,
    response: 'The device has been offlined and marked as faulted.',
    impact: 'Fault tolerance of the pool may be compromised.',
    action: 'Run zpool status -x and replace the faulted device.',
  },
  raw_output: `--------------- ------------------------------------  -------------- ---------\nTIME            EVENT-ID                              MSG-ID         SEVERITY\n${time} ${uuid} ${msgId} ${severity}`,
});

const repositoryRow = ([name, type, location, enabled, proxy, sticky]) => ({
  name,
  type,
  status: 'online',
  location,
  enabled,
  proxy,
  sticky,
  search_first: false,
});

const stateOf = host => {
  if (!states.has(host.id)) {
    states.set(host.id, {
      service: 'syslog',
      rules: SYSLOG_RULES.map(syslogRule),
      streams: new Map(),
      bootEnvironments: BOOT_ENVIRONMENTS.map(bootEnvironmentRow),
      faults: FAULTS.map(faultRow),
      resolved: [],
      arc: {
        arc_max_gb: '',
        arc_min_gb: '',
        arc_max_percent: '',
        user_reserve_hint_pct: '',
        vdev_max_pending: '',
        prefetch_disable: false,
      },
      repositories: REPOSITORIES.map(repositoryRow),
    });
  }
  return states.get(host.id);
};

const paramOf = (ctx, name) => ctx.url.searchParams.get(name) || '';

const queued = ({ ctx, operation, target, metadata = null }) => {
  const task = queue({ host: ctx.host, by: ctx.person.username, operation, target, metadata });
  return ok(
    { success: true, message: `${operation} task created`, task_id: task.id, status: 'pending' },
    202
  );
};

const serviceFmri = service =>
  service === 'rsyslog' ? 'svc:/system/rsyslog:default' : 'svc:/system/system-log:default';

const syslogConfig = ctx => {
  const state = stateOf(ctx.host);
  return ok({
    service_fmri: serviceFmri(state.service),
    service_status: { state: 'online', fmri: serviceFmri(state.service) },
    config_file: state.service === 'rsyslog' ? '/etc/rsyslog.conf' : '/etc/syslog.conf',
    config_content: syslogText(state.rules),
    parsed_rules: state.rules,
  });
};

const parseRules = content =>
  String(content || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map((line, index) => {
      const [selector, ...rest] = line.split(/\s+/u);
      const action = rest.join(' ');
      return {
        line_number: index + 1,
        selector,
        action,
        full_line: line,
        parsed: { action_type: 'unknown', action_target: action },
      };
    });

const validateSyslog = ctx => {
  const rules = parseRules(ctx.body.config_content);
  const errors = rules
    .filter(rule => !rule.action)
    .map(rule => `Line ${rule.line_number}: no action`);
  const warnings = rules
    .filter(rule => rule.selector.startsWith('*.debug'))
    .map(rule => `Line ${rule.line_number}: logging every debug message`);
  return ok({ valid: errors.length === 0, errors, warnings, parsed_rules: rules });
};

const applySyslog = ctx => {
  const { body } = ctx;
  if (!body.config_content) {
    return refusal(400, 'config_content is required');
  }
  const state = stateOf(ctx.host);
  state.rules = parseRules(body.config_content);
  return ok({
    success: true,
    message: 'Configuration written',
    backup_created: Boolean(body.backup_existing),
    service_reloaded: Boolean(body.reload_service),
  });
};

const switchSyslog = ctx => {
  const { target } = ctx.body;
  if (target !== 'syslog' && target !== 'rsyslog') {
    return refusal(400, `Unknown logging service: ${target}`);
  }
  stateOf(ctx.host).service = target;
  return ok({ success: true, message: `Switched to ${target}` });
};

const logFiles = () =>
  ok({
    log_files: LOG_FILES.map(([name, type, path, size, sizeFormatted]) => ({
      name,
      displayName: name,
      type,
      path,
      size,
      sizeFormatted,
      modified: ago(3),
    })),
  });

const logContent = (lines, name, path) => ctx => {
  const wanted = Number(paramOf(ctx, 'lines')) || 100;
  const grep = paramOf(ctx, 'grep');
  const shown = lines.filter(line => !grep || line.includes(grep)).slice(-wanted);
  return ok({
    name,
    path,
    lines: shown,
    totalLines: shown.length,
    raw_output: shown.join('\n'),
    fileInfo: {
      size: shown.join('\n').length,
      sizeFormatted: `${shown.join('\n').length} B`,
      modified: ago(3),
    },
  });
};

const logOf = ctx => LOG_FILES.find(([name]) => name === ctx.params.name) || null;

const shownLog = ctx => {
  const file = logOf(ctx);
  if (!file) {
    return refusal(404, 'Log not found');
  }
  return logContent(LOG_LINES, file[0], file[2])(ctx);
};

const shownFaultLog = ctx => {
  const text = FAULT_LINES[ctx.params.subtype];
  if (!text) {
    return refusal(404, 'Log not found');
  }
  return logContent(text.split('\n'), ctx.params.subtype, `fmdump ${ctx.params.subtype}`)(ctx);
};

const startStream = ctx => {
  const file = logOf(ctx);
  if (!file) {
    return refusal(404, 'Log not found');
  }
  const session = {
    session_id: `log-${Date.now()}`,
    log: file[0],
    grep: ctx.body?.grep_pattern || null,
  };
  stateOf(ctx.host).streams.set(session.session_id, session);
  return ok(session);
};

const stopStream = ctx => {
  const state = stateOf(ctx.host);
  const session = state.streams.get(ctx.params.session);
  if (!session) {
    return refusal(404, 'Stream session not found');
  }
  state.streams.delete(ctx.params.session);
  session.connection?.close();
  return ok({ success: true, message: 'Stream stopped' });
};

/**
 * The `logs/stream/{session}` socket: a `status` frame, then one
 * `log_line` frame for each line of the log the session's grep keeps,
 * held open until the session is stopped, which closes it; an unknown
 * session gets an `error` frame and the close.
 *
 * @param {Object} options - `req`, `socket`, `host` and `params`
 * @returns {void}
 */
export const logStreamSocket = ({ req, socket, host, params }) => {
  const session = stateOf(host).streams.get(params.session);
  const connection = openSocket({
    req,
    socket,
    onText: () => null,
    onClose: () => null,
  });
  if (!session) {
    connection.send(JSON.stringify({ type: 'error', message: 'Stream session not found' }));
    connection.close();
    return;
  }
  session.connection = connection;
  connection.send(JSON.stringify({ type: 'status', message: `Following ${session.log}` }));
  LOG_LINES.filter(line => !session.grep || line.includes(session.grep)).forEach(line =>
    connection.send(JSON.stringify({ type: 'log_line', line, timestamp: now() }))
  );
};

const arcConfig = ctx => {
  const { arc } = stateOf(ctx.host);
  const maxBytes = arc.arc_max_gb
    ? Number(arc.arc_max_gb) * GIB
    : Math.floor(PHYSICAL_MEMORY * 0.85);
  const minBytes = arc.arc_min_gb
    ? Number(arc.arc_min_gb) * GIB
    : Math.floor(PHYSICAL_MEMORY * 0.01);
  const tunable = (value, unit) => ({
    effective_value: value,
    unit,
    source: value ? 'persistent' : 'default',
  });
  return ok({
    current_config: {
      arc_size_bytes: Math.floor(maxBytes * 0.62),
      arc_max_bytes: maxBytes,
      arc_min_bytes: minBytes,
    },
    system_constraints: {
      physical_memory_bytes: PHYSICAL_MEMORY,
      max_safe_arc_bytes: Math.floor(PHYSICAL_MEMORY * 0.85),
      min_recommended_arc_bytes: Math.floor(PHYSICAL_MEMORY * 0.01),
    },
    config_source: arc.arc_max_gb ? '/etc/system.d/zfs-arc' : 'auto-calculated',
    available_tunables: {
      zfs_arc_max: tunable(arc.arc_max_gb ? maxBytes : 0, 'bytes'),
      zfs_arc_min: tunable(arc.arc_min_gb ? minBytes : 0, 'bytes'),
      zfs_arc_max_percent: tunable(
        arc.arc_max_percent ? Number(arc.arc_max_percent) : 0,
        'percent'
      ),
      user_reserve_hint_pct: tunable(
        arc.user_reserve_hint_pct ? Number(arc.user_reserve_hint_pct) : 0,
        'percent'
      ),
      zfs_vdev_max_pending: tunable(
        arc.vdev_max_pending ? Number(arc.vdev_max_pending) : 0,
        'count'
      ),
      zfs_prefetch_disable: tunable(arc.prefetch_disable ? 1 : 0, 'flag'),
    },
  });
};

const validateArc = ctx => {
  const { body } = ctx;
  const safe = PHYSICAL_MEMORY / GIB;
  const errors = [];
  const warnings = [];
  if (body.arc_max_gb && body.arc_max_gb > safe * 0.85) {
    errors.push(`arc_max_gb ${body.arc_max_gb} exceeds 85% of physical memory`);
  }
  if (body.arc_min_gb && body.arc_max_gb && body.arc_min_gb > body.arc_max_gb) {
    errors.push('arc_min_gb exceeds arc_max_gb');
  }
  if (body.arc_max_gb && body.arc_max_gb > safe * 0.75) {
    warnings.push('Leaving under 25% of memory to applications');
  }
  return ok({
    valid: errors.length === 0,
    errors,
    warnings,
    proposed_settings: { arc_max_gb: body.arc_max_gb, arc_min_gb: body.arc_min_gb },
  });
};

const applyArc = ctx => {
  const { body } = ctx;
  const { arc } = stateOf(ctx.host);
  Object.keys(arc).forEach(key => {
    if (body[key] !== undefined) {
      arc[key] = key === 'prefetch_disable' ? Boolean(body[key]) : String(body[key]);
    }
  });
  return ok({
    success: true,
    message: 'ZFS tunables written',
    results: { reboot_required: body.apply_method !== 'runtime', apply_method: body.apply_method },
  });
};

const resetArc = ctx => {
  const state = stateOf(ctx.host);
  state.arc = {
    arc_max_gb: '',
    arc_min_gb: '',
    arc_max_percent: '',
    user_reserve_hint_pct: '',
    vdev_max_pending: '',
    prefetch_disable: false,
  };
  return ok({ success: true, message: 'ARC configuration reset to defaults' });
};

const bootEnvironments = ctx => {
  const name = paramOf(ctx, 'name');
  const rows = stateOf(ctx.host).bootEnvironments.filter(row => !name || row.name.includes(name));
  return ok({ boot_environments: rows, total: rows.length });
};

const bootEnvironmentOf = ctx =>
  stateOf(ctx.host).bootEnvironments.find(
    row => row.name === decodeURIComponent(ctx.params.name)
  ) || null;

const createBootEnvironment = ctx => {
  const { body, host } = ctx;
  if (!body.name) {
    return refusal(400, 'name is required');
  }
  if (stateOf(host).bootEnvironments.some(row => row.name === body.name)) {
    return refusal(409, `Boot environment ${body.name} already exists`);
  }
  return queued({ ctx, operation: 'be_create', target: body.name, metadata: body });
};

const settleCreate = (host, task) => {
  const state = stateOf(host);
  state.bootEnvironments = [
    ...state.bootEnvironments,
    bootEnvironmentRow([
      task.machine_name,
      false,
      Boolean(task.metadata?.activate),
      '-',
      '96K',
      'static',
      now().slice(0, 16).replace('T', ' '),
      false,
    ]),
  ];
};

const bootEnvironmentAction = operation => ctx => {
  const row = bootEnvironmentOf(ctx);
  if (!row) {
    return refusal(404, 'Boot environment not found');
  }
  const force = paramOf(ctx, 'force') === 'true' || Boolean(ctx.body?.force);
  return queued({ ctx, operation, target: row.name, metadata: { ...(ctx.body || {}), force } });
};

const settleActivate = (host, task) => {
  const state = stateOf(host);
  state.bootEnvironments = state.bootEnvironments.map(row => ({
    ...row,
    is_active_on_reboot: row.name === task.machine_name,
    is_temporary:
      row.name === task.machine_name ? Boolean(task.metadata?.temporary) : row.is_temporary,
  }));
};

const settleMount = (host, task) => {
  stateOf(host).bootEnvironments.forEach(row => {
    if (row.name === task.machine_name) {
      row.mountpoint = task.metadata?.mountpoint || `/mnt/${row.name}`;
    }
  });
};

const settleUnmount = (host, task) => {
  stateOf(host).bootEnvironments.forEach(row => {
    if (row.name === task.machine_name) {
      row.mountpoint = '-';
    }
  });
};

const settleDelete = (host, task) => {
  const state = stateOf(host);
  state.bootEnvironments = state.bootEnvironments.filter(row => row.name !== task.machine_name);
};

const faults = ctx => {
  const all = paramOf(ctx, 'all') === 'true';
  const limit = Number(paramOf(ctx, 'limit')) || 50;
  const state = stateOf(ctx.host);
  const rows = (all ? [...state.faults, ...state.resolved] : state.faults).slice(0, limit);
  return ok({
    faults: rows,
    summary: {
      totalFaults: rows.length,
      severityLevels: rows.map(row => row.severity),
      faultClasses: rows.map(row => row.details.faultClass),
    },
    cached: false,
  });
};

const faultAction = ctx => {
  const { action } = ctx.params;
  const state = stateOf(ctx.host);
  const key = action === 'acquit' ? ctx.body?.target : ctx.body?.fmri;
  if (!key) {
    return refusal(400, action === 'acquit' ? 'target is required' : 'fmri is required');
  }
  const row = state.faults.find(fault =>
    action === 'acquit' ? fault.uuid === key : fault.details.affects.startsWith(key)
  );
  if (!row) {
    return refusal(404, 'Fault not found');
  }
  state.faults = state.faults.filter(fault => fault !== row);
  state.resolved = [...state.resolved, { ...row, severity: 'Minor', resolved: action }];
  return ok({ success: true, message: `fmadm ${action} completed`, uuid: row.uuid });
};

const faultConfig = () =>
  ok({
    config: FAULT_MODULES.map(([module, version, description]) => ({
      module,
      version,
      description,
    })),
  });

const databaseStats = () => {
  const databases = Object.entries(DATABASES).map(([name, entry]) => ({
    name,
    files: entry.files.map(([file, size]) => ({ name: file, size })),
    size: entry.files.reduce((sum, [, size]) => sum + size, 0),
    tables: entry.tables.length,
    indexes: entry.tables.reduce((sum, [, , indexes]) => sum + indexes, 0),
  }));
  return ok({
    databases,
    total_size: databases.reduce((sum, row) => sum + row.size, 0),
    total_tables: databases.reduce((sum, row) => sum + row.tables, 0),
    total_rows: Object.values(DATABASES)
      .flatMap(entry => entry.tables)
      .reduce((sum, [, rows]) => sum + rows, 0),
  });
};

const databaseTables = ctx => {
  const entry = DATABASES[ctx.params.name];
  if (!entry) {
    return refusal(404, 'Database not found');
  }
  return ok({
    tables: entry.tables.map(([name, rows, indexes]) => ({ name, rows, indexes })),
  });
};

const databaseRows = ctx => {
  const entry = DATABASES[ctx.params.name];
  if (!entry || !entry.tables.some(([name]) => name === ctx.params.table)) {
    return refusal(404, 'Table not found');
  }
  const limit = Number(paramOf(ctx, 'limit')) || 50;
  const offset = Number(paramOf(ctx, 'offset')) || 0;
  const order = paramOf(ctx, 'order_by');
  const all = [...Array(ROW_TOTAL).keys()].map(index => [
    index + 1,
    ago(ROW_TOTAL - index),
    Number((Math.sin(index) * 50 + 50).toFixed(2)),
  ]);
  if (order) {
    const [column, direction] = order.split(':');
    const at = ROW_COLUMNS.indexOf(column);
    if (at < 0) {
      return refusal(400, `Unknown column: ${column}`);
    }
    all.sort(
      (first, second) => (first[at] > second[at] ? 1 : -1) * (direction === 'desc' ? -1 : 1)
    );
  }
  return ok({ columns: ROW_COLUMNS, rows: all.slice(offset, offset + limit), total: ROW_TOTAL });
};

const maintenance = action => () =>
  action === 'vacuum'
    ? ok({
        success: true,
        message: 'VACUUM completed',
        total_reclaimed: 6291456,
        databases: [
          { name: 'monitoring', space_reclaimed: 4194304 },
          { name: 'tasks', space_reclaimed: 2097152 },
        ],
      })
    : ok({ success: true, message: `${action.toUpperCase()} completed` });

const repositories = ctx => {
  const enabledOnly = paramOf(ctx, 'enabled_only') === 'true';
  const publisher = paramOf(ctx, 'publisher');
  const rows = stateOf(ctx.host)
    .repositories.filter(row => !enabledOnly || row.enabled)
    .filter(row => !publisher || row.name.includes(publisher));
  return ok({ publishers: rows, total: rows.length });
};

const addRepository = ctx => {
  const { body, host } = ctx;
  if (!body.name || !body.origin) {
    return refusal(400, 'name and origin are required');
  }
  const state = stateOf(host);
  if (state.repositories.some(row => row.name === body.name)) {
    return refusal(409, `Publisher ${body.name} already exists`);
  }
  return queued({ ctx, operation: 'repository_add', target: body.name, metadata: body });
};

const settleAdd = (host, task) => {
  const state = stateOf(host);
  const body = task.metadata || {};
  state.repositories = [
    ...state.repositories,
    repositoryRow([
      task.machine_name,
      'origin',
      body.origin,
      body.enabled !== false,
      body.proxy ? 'T' : 'F',
      Boolean(body.sticky),
    ]),
    ...(body.mirrors || []).map(mirror =>
      repositoryRow([
        task.machine_name,
        'mirror',
        mirror,
        body.enabled !== false,
        'F',
        Boolean(body.sticky),
      ])
    ),
  ];
};

const repositoryRowsOf = ctx =>
  stateOf(ctx.host).repositories.filter(row => row.name === decodeURIComponent(ctx.params.name));

const updateRepository = ctx => {
  const rows = repositoryRowsOf(ctx);
  if (rows.length === 0) {
    return refusal(404, 'Publisher not found');
  }
  return queued({ ctx, operation: 'repository_update', target: rows[0].name, metadata: ctx.body });
};

const settleUpdate = (host, task) => {
  const body = task.metadata || {};
  const state = stateOf(host);
  state.repositories = state.repositories
    .filter(
      row =>
        row.name !== task.machine_name || !(body.origins_to_remove || []).includes(row.location)
    )
    .filter(
      row =>
        row.name !== task.machine_name || !(body.mirrors_to_remove || []).includes(row.location)
    )
    .map(row =>
      row.name === task.machine_name
        ? {
            ...row,
            enabled: body.enabled !== false,
            sticky: Boolean(body.sticky),
            search_first: Boolean(body.search_first),
          }
        : row
    );
  state.repositories = [
    ...state.repositories,
    ...(body.origins_to_add || []).map(origin =>
      repositoryRow([
        task.machine_name,
        'origin',
        origin,
        body.enabled !== false,
        'F',
        Boolean(body.sticky),
      ])
    ),
    ...(body.mirrors_to_add || []).map(mirror =>
      repositoryRow([
        task.machine_name,
        'mirror',
        mirror,
        body.enabled !== false,
        'F',
        Boolean(body.sticky),
      ])
    ),
  ];
};

const toggleRepository = enabled => ctx => {
  const rows = repositoryRowsOf(ctx);
  if (rows.length === 0) {
    return refusal(404, 'Publisher not found');
  }
  rows.forEach(row => {
    row.enabled = enabled;
  });
  return ok({
    success: true,
    message: `Publisher ${rows[0].name} ${enabled ? 'enabled' : 'disabled'}`,
  });
};

const deleteRepository = ctx => {
  const rows = repositoryRowsOf(ctx);
  if (rows.length === 0) {
    return refusal(404, 'Publisher not found');
  }
  return queued({ ctx, operation: 'repository_remove', target: rows[0].name });
};

const settleRemove = (host, task) => {
  const state = stateOf(host);
  state.repositories = state.repositories.filter(row => row.name !== task.machine_name);
};

/**
 * The syslog, the system logs, the ARC configuration, the boot
 * environments, the faults, the database and the repositories sections
 * of the Manage page, each route answered as the agents answer it and
 * 404 on a host that lists no token of its section: the syslog
 * configuration, its facilities, validation, write, reload and switch
 * behind `fault-management` with `syslog`; the log list, a log's
 * content, the fault manager logs and the stream sessions behind
 * `fault-management` with `log-streaming`; the ARC configuration, its
 * validation, write and reset behind `zfs`; the boot environments and
 * their create, activate, mount, unmount and delete behind
 * `boot-environments`, each a queued task; the faults, their actions and
 * the fault manager's modules behind `fault-management`; the database
 * statistics, tables, rows and maintenance on every host; the
 * repositories, their add, update, enable, disable and remove behind
 * `packages` with `repositories`, the writes queued tasks.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountHostSections = agentRoute => {
  settles('be_create', settleCreate);
  settles('be_activate', settleActivate);
  settles('be_mount', settleMount);
  settles('be_unmount', settleUnmount);
  settles('be_delete', settleDelete);
  settles('repository_add', settleAdd);
  settles('repository_update', settleUpdate);
  settles('repository_remove', settleRemove);
  const syslog = ['fault-management', 'syslog'];
  const logs = ['fault-management', 'log-streaming'];
  const faultsOn = ['fault-management'];
  const repos = ['packages', 'repositories'];
  agentRoute('GET', 'system/syslog/config', behind(syslog, syslogConfig));
  agentRoute('PUT', 'system/syslog/config', behind(syslog, applySyslog));
  agentRoute(
    'GET',
    'system/syslog/facilities',
    behind(syslog, () =>
      ok({
        facilities: FACILITIES.map(([name, description]) => ({ name, description })),
        levels: LEVELS.map(([name, description]) => ({ name, description })),
      })
    )
  );
  agentRoute('POST', 'system/syslog/validate', behind(syslog, validateSyslog));
  agentRoute(
    'POST',
    'system/syslog/reload',
    behind(syslog, () => ok({ success: true, message: 'Syslog reloaded' }))
  );
  agentRoute('POST', 'system/syslog/switch', behind(syslog, switchSyslog));
  agentRoute('GET', 'system/logs/list', behind(logs, logFiles));
  agentRoute('GET', 'system/logs/fault-manager/:subtype', behind(logs, shownFaultLog));
  agentRoute('DELETE', 'system/logs/stream/:session/stop', behind(logs, stopStream));
  agentRoute('POST', 'system/logs/:name/stream/start', behind(logs, startStream));
  agentRoute('GET', 'system/logs/:name', behind(logs, shownLog));
  agentRoute('GET', 'system/zfs/arc/config', behind(['zfs'], arcConfig));
  agentRoute('PUT', 'system/zfs/arc/config', behind(['zfs'], applyArc));
  agentRoute('POST', 'system/zfs/arc/validate', behind(['zfs'], validateArc));
  agentRoute('POST', 'system/zfs/arc/reset', behind(['zfs'], resetArc));
  agentRoute('GET', 'system/boot-environments', behind(['boot-environments'], bootEnvironments));
  agentRoute(
    'POST',
    'system/boot-environments',
    behind(['boot-environments'], createBootEnvironment)
  );
  agentRoute(
    'POST',
    'system/boot-environments/:name/activate',
    behind(['boot-environments'], bootEnvironmentAction('be_activate'))
  );
  agentRoute(
    'POST',
    'system/boot-environments/:name/mount',
    behind(['boot-environments'], bootEnvironmentAction('be_mount'))
  );
  agentRoute(
    'POST',
    'system/boot-environments/:name/unmount',
    behind(['boot-environments'], bootEnvironmentAction('be_unmount'))
  );
  agentRoute(
    'DELETE',
    'system/boot-environments/:name',
    behind(['boot-environments'], bootEnvironmentAction('be_delete'))
  );
  agentRoute('GET', 'system/fault-management/faults', behind(faultsOn, faults));
  agentRoute('POST', 'system/fault-management/actions/:action', behind(faultsOn, faultAction));
  agentRoute('GET', 'system/fault-management/config', behind(faultsOn, faultConfig));
  agentRoute('GET', 'database/stats', databaseStats);
  agentRoute('GET', 'database/:name/tables', databaseTables);
  agentRoute('GET', 'database/:name/tables/:table/rows', databaseRows);
  agentRoute('POST', 'database/vacuum', maintenance('vacuum'));
  agentRoute('POST', 'database/analyze', maintenance('analyze'));
  agentRoute('POST', 'database/cleanup', maintenance('cleanup'));
  agentRoute('GET', 'system/repositories', behind(repos, repositories));
  agentRoute('POST', 'system/repositories', behind(repos, addRepository));
  agentRoute('PUT', 'system/repositories/:name', behind(repos, updateRepository));
  agentRoute('POST', 'system/repositories/:name/enable', behind(repos, toggleRepository(true)));
  agentRoute('POST', 'system/repositories/:name/disable', behind(repos, toggleRepository(false)));
  agentRoute('DELETE', 'system/repositories/:name', behind(repos, deleteRepository));
};
