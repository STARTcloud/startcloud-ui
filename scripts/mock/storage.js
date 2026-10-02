import { featuresOf } from './fleet.js';
import { now, ok, problem, refusal } from './kit.js';
import { queue, settles } from './tasks.js';

const GIB = 1024 ** 3;
const TIB = 1024 ** 4;
const POOL_DEVICES = {
  rpool: ['c0t5000C500A1B2C3D4d0', 'c0t5000C500A1B2C3D5d0'],
  tank: [
    'c0t5000C500B2C3D4E6d0',
    'c0t5000C500B2C3D4E7d0',
    'c0t5000C500B2C3D4E8d0',
    'c0t5000C500B2C3D4E9d0',
  ],
};
const POOL_TYPES = { rpool: 'mirror', tank: 'raidz2' };
const FREE_DEVICES = ['c0t5000C500C3D4E5F0d0', 'c0t5000C500C3D4E5F1d0', 'c1t1d0'];
const IMPORTABLE = [{ name: 'backup', id: '1287463519022714821', state: 'ONLINE' }];
const POOL_PROPERTIES = {
  autoexpand: 'off',
  autoreplace: 'off',
  autotrim: 'off',
  comment: '-',
  delegation: 'on',
  failmode: 'wait',
  listsnapshots: 'off',
  multihost: 'off',
  version: '-',
  'feature@async_destroy': 'enabled',
};
const READONLY_POOL_PROPERTIES = ['version', 'feature@async_destroy'];
const SEEDED_DATASETS = [
  {
    name: 'rpool',
    type: 'filesystem',
    used: '41.2G',
    avail: '422G',
    refer: '96K',
    mountpoint: '/rpool',
  },
  {
    name: 'rpool/ROOT',
    type: 'filesystem',
    used: '6.05G',
    avail: '422G',
    refer: '96K',
    mountpoint: 'legacy',
  },
  {
    name: 'rpool/ROOT/omnios',
    type: 'filesystem',
    used: '6.05G',
    avail: '422G',
    refer: '5.71G',
    mountpoint: '/',
  },
  {
    name: 'rpool/zones',
    type: 'filesystem',
    used: '30.1G',
    avail: '422G',
    refer: '128K',
    mountpoint: '/zones',
  },
  {
    name: 'tank',
    type: 'filesystem',
    used: '5.31T',
    avail: '9.24T',
    refer: '128K',
    mountpoint: '/tank',
  },
  {
    name: 'tank/zones',
    type: 'filesystem',
    used: '4.80T',
    avail: '9.24T',
    refer: '128K',
    mountpoint: '/zones',
  },
  {
    name: 'tank/zones/db-1',
    type: 'filesystem',
    used: '2.11T',
    avail: '9.24T',
    refer: '96K',
    mountpoint: '/zones/db-1',
  },
  {
    name: 'tank/zones/db-1/boot',
    type: 'volume',
    used: '60.0G',
    avail: '9.24T',
    refer: '41.2G',
    mountpoint: '-',
  },
  {
    name: 'tank/zones/db-1/data',
    type: 'volume',
    used: '2.05T',
    avail: '9.24T',
    refer: '2.05T',
    mountpoint: '-',
  },
  {
    name: 'tank/backup',
    type: 'filesystem',
    used: '512G',
    avail: '9.24T',
    refer: '512G',
    mountpoint: '/tank/backup',
  },
  {
    name: 'tank/zones/db-1/boot@before-upgrade',
    type: 'snapshot',
    used: '829M',
    avail: '-',
    refer: '40.1G',
    mountpoint: '-',
  },
  {
    name: 'tank/zones/db-1/boot@daily-20260927',
    type: 'snapshot',
    used: '12.4M',
    avail: '-',
    refer: '41.2G',
    mountpoint: '-',
  },
  {
    name: 'tank/backup@weekly-20260921',
    type: 'snapshot',
    used: '4.20G',
    avail: '-',
    refer: '508G',
    mountpoint: '-',
  },
];
const BAYS = [
  {
    device_name: 'c0t5000C500A1B2C3D4d0',
    serial_number: 'ZA1F2G3H',
    model: 'ST2000NM0008',
    manufacturer: 'Seagate',
    capacity: '1.82T',
    capacity_bytes: '2000398934016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 0,
    pool_assignment: 'rpool',
    temperature: 34,
  },
  {
    device_name: 'c0t5000C500A1B2C3D5d0',
    serial_number: 'ZA1F2G3J',
    model: 'ST2000NM0008',
    manufacturer: 'Seagate',
    capacity: '1.82T',
    capacity_bytes: '2000398934016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 1,
    pool_assignment: 'rpool',
    temperature: 36,
  },
  {
    device_name: 'c0t5000C500B2C3D4E6d0',
    serial_number: 'WFK1A2B3',
    model: 'ST8000NM000A',
    manufacturer: 'Seagate',
    capacity: '7.28T',
    capacity_bytes: '8001563222016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 2,
    pool_assignment: 'tank',
    temperature: 38,
  },
  {
    device_name: 'c0t5000C500B2C3D4E7d0',
    serial_number: 'WFK1A2B4',
    model: 'ST8000NM000A',
    manufacturer: 'Seagate',
    capacity: '7.28T',
    capacity_bytes: '8001563222016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 3,
    pool_assignment: 'tank',
    temperature: 41,
  },
  {
    device_name: 'c0t5000C500B2C3D4E8d0',
    serial_number: 'WFK1A2B5',
    model: 'ST8000NM000A',
    manufacturer: 'Seagate',
    capacity: '7.28T',
    capacity_bytes: '8001563222016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 4,
    pool_assignment: 'tank',
    temperature: 47,
  },
  {
    device_name: 'c0t5000C500B2C3D4E9d0',
    serial_number: 'WFK1A2B6',
    model: 'ST8000NM000A',
    manufacturer: 'Seagate',
    capacity: '7.28T',
    capacity_bytes: '8001563222016',
    disk_type: 'HDD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 5,
    pool_assignment: 'tank',
    temperature: 39,
  },
  {
    device_name: 'c0t5000C500C3D4E5F0d0',
    serial_number: 'S4EWNX0N',
    model: 'MZILT1T9HBJR',
    manufacturer: 'Samsung',
    capacity: '1.75T',
    capacity_bytes: '1920383410176',
    disk_type: 'SSD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 6,
    pool_assignment: null,
    temperature: 29,
  },
  {
    device_name: 'c0t5000C500C3D4E5F1d0',
    serial_number: 'S4EWNX0P',
    model: 'MZILT1T9HBJR',
    manufacturer: 'Samsung',
    capacity: '1.75T',
    capacity_bytes: '1920383410176',
    disk_type: 'SSD',
    interface_type: 'SAS',
    chassis: 0,
    bay: 7,
    pool_assignment: null,
    temperature: 30,
  },
  {
    device_name: 'c1t1d0',
    serial_number: 'PHLN1234',
    model: 'INTEL SSDPE2KX010T8',
    manufacturer: 'Intel',
    capacity: '931G',
    capacity_bytes: '1000204886016',
    disk_type: 'NVMe',
    interface_type: 'NVMe',
    chassis: null,
    bay: null,
    pool_assignment: null,
    temperature: 33,
  },
];

const stores = new Map();

const seededPools = () => [
  {
    name: 'rpool',
    size: String(2 * TIB),
    alloc: String(41.2 * GIB),
    free: String(422 * GIB),
    capacity_percent: '9',
    dedup_ratio: '1.00x',
    health: 'ONLINE',
    altroot: null,
  },
  {
    name: 'tank',
    size: String(14.55 * TIB),
    alloc: String(5.31 * TIB),
    free: String(9.24 * TIB),
    capacity_percent: '36',
    dedup_ratio: '1.00x',
    health: 'DEGRADED',
    altroot: null,
  },
];

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, {
      pools: seededPools(),
      devices: new Map(Object.entries(POOL_DEVICES).map(([pool, list]) => [pool, [...list]])),
      types: { ...POOL_TYPES },
      free: [...FREE_DEVICES],
      scrubbing: new Set(),
      offline: new Set(),
      poolProps: new Map(),
      datasets: SEEDED_DATASETS.map(row => ({ ...row })),
      datasetProps: new Map(),
      exported: new Map(),
    });
  }
  return stores.get(host.id);
};

const offers = (host, token) => featuresOf(host).includes(token);

const behind = (token, handler) => ctx =>
  offers(ctx.host, token) ? handler(ctx) : problem(404, 'Not Found');

const poolNameOf = ctx => decodeURIComponent(ctx.params.pool);

const nameOf = ctx => ctx.url.searchParams.get('name') || '';

const pooled = handler => ctx => {
  const name = poolNameOf(ctx);
  const store = storeOf(ctx.host);
  const pool = store.pools.find(row => row.name === name);
  return pool ? handler({ ...ctx, store, pool }) : refusal(404, `Pool ${name} not found`);
};

const named = handler => ctx => {
  const name = nameOf(ctx);
  if (!name) {
    return refusal(400, 'Dataset name is required');
  }
  return handler({ ...ctx, store: storeOf(ctx.host), name });
};

const snapped = handler => ctx => {
  const name = nameOf(ctx);
  if (!name) {
    return refusal(400, 'Snapshot name is required');
  }
  if (!name.includes('@')) {
    return refusal(400, 'Snapshot must be in format dataset@snapshot');
  }
  return handler({ ...ctx, store: storeOf(ctx.host), name });
};

const queued = (ctx, { operation, message, metadata = {} }) => {
  const task = queue({
    host: ctx.host,
    by: ctx.person.username,
    operation,
    target: 'system',
    metadata,
  });
  return ok({ success: true, message, task_id: task.id, ...metadata }, 202);
};

const vdevList = body =>
  (Array.isArray(body.vdevs) ? body.vdevs : []).flatMap(entry =>
    typeof entry === 'string' ? [entry] : entry.devices || []
  );

const createdPool = ctx => {
  const { body, store } = { ...ctx, store: storeOf(ctx.host) };
  const name = String(body.pool_name || '').trim();
  const devices = vdevList(body);
  if (!name || devices.length === 0) {
    return refusal(400, 'pool_name and vdevs are required');
  }
  if (store.pools.some(pool => pool.name === name)) {
    return refusal(409, `Pool ${name} already exists`);
  }
  const typed = (body.vdevs || []).find(entry => typeof entry === 'object' && entry.type);
  return queued(ctx, {
    operation: 'zfs_pool_create',
    message: `Pool creation task created for ${name}`,
    metadata: {
      pool_name: name,
      devices,
      pool_type: typed?.type || 'stripe',
      force: Boolean(body.force),
    },
  });
};

const afterPoolCreate = (host, task) => {
  const store = storeOf(host);
  const { pool_name: name, devices, pool_type: type } = task.metadata;
  if (store.pools.some(pool => pool.name === name)) {
    return;
  }
  const size = devices.length * TIB;
  store.pools = [
    ...store.pools,
    {
      name,
      size: String(size),
      alloc: String(GIB),
      free: String(size - GIB),
      capacity_percent: '0',
      dedup_ratio: '1.00x',
      health: 'ONLINE',
      altroot: null,
    },
  ];
  store.devices.set(name, devices);
  store.types[name] = type;
  store.free = store.free.filter(device => !devices.includes(device));
  store.datasets = [
    ...store.datasets,
    {
      name,
      type: 'filesystem',
      used: '96K',
      avail: `${devices.length}T`,
      refer: '96K',
      mountpoint: `/${name}`,
    },
  ];
};

const scanOf = (store, pool) =>
  store.scrubbing.has(pool.name) ? { action: `scrub in progress since ${now()}`, pct: 42 } : null;

const deviceRows = (store, pool) =>
  (store.devices.get(pool.name) || []).map(name => ({
    name,
    state: store.offline.has(name) ? 'OFFLINE' : 'ONLINE',
    read: '0',
    write: '0',
    cksum: '0',
    note: '',
  }));

const healthOf = (store, pool) =>
  (store.devices.get(pool.name) || []).some(device => store.offline.has(device))
    ? 'DEGRADED'
    : pool.health;

const parsedOf = (store, pool) => {
  const devices = deviceRows(store, pool);
  const type = store.types[pool.name] || 'stripe';
  const state = healthOf(store, pool);
  const vdevs =
    type === 'stripe' || type === 'disk'
      ? [{ type: 'disk', state, devices }]
      : [{ type, state, devices }];
  return { vdevs, scan: scanOf(store, pool) };
};

const statusText = (store, pool) =>
  [
    `  pool: ${pool.name}`,
    ` state: ${pool.health}`,
    '  scan: none requested',
    'config:',
    '',
    '\tNAME                       STATE     READ WRITE CKSUM',
    `\t${pool.name.padEnd(26)} ${pool.health.padEnd(9)} 0     0     0`,
    ...deviceRows(store, pool).map(
      device => `\t  ${device.name.padEnd(24)} ${device.state.padEnd(9)} 0     0     0`
    ),
    '',
    'errors: No known data errors',
  ].join('\n');

const poolStatus = ({ store, pool }) =>
  ok({ name: pool.name, status: statusText(store, pool), parsed: parsedOf(store, pool) });

const poolProperties = ({ store, pool }) => {
  const edits = store.poolProps.get(pool.name) || {};
  const properties = Object.fromEntries(
    Object.entries({ ...POOL_PROPERTIES, ...edits }).map(([key, value]) => [
      key,
      { value, source: READONLY_POOL_PROPERTIES.includes(key) ? '-' : 'local' },
    ])
  );
  return ok({ name: pool.name, properties });
};

const poolPropertiesSet = ctx => {
  const { body, store, pool } = ctx;
  const { properties } = body;
  if (!properties || typeof properties !== 'object' || Object.keys(properties).length === 0) {
    return refusal(400, 'properties is required');
  }
  store.poolProps.set(pool.name, { ...(store.poolProps.get(pool.name) || {}), ...properties });
  return queued(ctx, {
    operation: 'zfs_pool_set_properties',
    message: `Property update task created for ${pool.name}`,
    metadata: { pool: pool.name, properties },
  });
};

const destroyedPool = ctx => {
  const { body, pool } = ctx;
  return queued(ctx, {
    operation: 'zfs_pool_destroy',
    message: `Pool destruction task created for ${pool.name}`,
    metadata: { pool: pool.name, force: Boolean(body?.force) },
  });
};

const afterPoolDestroy = (host, task) => {
  const store = storeOf(host);
  const { pool } = task.metadata;
  store.free = [...store.free, ...(store.devices.get(pool) || [])];
  store.devices.delete(pool);
  store.pools = store.pools.filter(row => row.name !== pool);
  store.datasets = store.datasets.filter(
    row => row.name !== pool && !row.name.startsWith(`${pool}/`)
  );
};

const scrubbed = ctx =>
  queued(ctx, {
    operation: 'zfs_pool_scrub',
    message: `Scrub task created for ${ctx.pool.name}`,
    metadata: { pool: ctx.pool.name },
  });

const afterScrub = (host, task) => storeOf(host).scrubbing.add(task.metadata.pool);

const scrubStopped = ctx =>
  queued(ctx, {
    operation: 'zfs_pool_scrub_stop',
    message: `Scrub stop task created for ${ctx.pool.name}`,
    metadata: { pool: ctx.pool.name },
  });

const afterScrubStop = (host, task) => storeOf(host).scrubbing.delete(task.metadata.pool);

const upgraded = ctx =>
  queued(ctx, {
    operation: 'zfs_pool_upgrade',
    message: `Upgrade task created for ${ctx.pool.name}`,
    metadata: { pool: ctx.pool.name },
  });

const exportedPool = ctx =>
  queued(ctx, {
    operation: 'zfs_pool_export',
    message: `Export task created for ${ctx.pool.name}`,
    metadata: { pool: ctx.pool.name, force: Boolean(ctx.body?.force) },
  });

const afterExport = (host, task) => {
  const store = storeOf(host);
  const { pool } = task.metadata;
  const row = store.pools.find(entry => entry.name === pool);
  if (!row) {
    return;
  }
  store.exported.set(pool, {
    row,
    devices: store.devices.get(pool) || [],
    type: store.types[pool],
  });
  store.devices.delete(pool);
  store.pools = store.pools.filter(entry => entry.name !== pool);
};

const importable = ctx => {
  const store = storeOf(ctx.host);
  const pools = [
    ...IMPORTABLE,
    ...[...store.exported.keys()].map(name => ({ name, id: '', state: 'ONLINE' })),
  ];
  return ok({
    pools,
    total: pools.length,
    output: pools.map(pool => `   pool: ${pool.name}\n  state: ${pool.state}`).join('\n\n'),
  });
};

const importedPool = ctx => {
  const { body } = ctx;
  const name = String(body.pool_name || body.pool_id || '').trim();
  if (!name) {
    return refusal(400, 'pool_name or pool_id is required');
  }
  const store = storeOf(ctx.host);
  const known = store.exported.has(name) || IMPORTABLE.some(pool => pool.name === name);
  if (!known) {
    return refusal(404, `Pool ${name} cannot be imported`);
  }
  return queued(ctx, {
    operation: 'zfs_pool_import',
    message: `Import task created for ${name}`,
    metadata: { pool: name, new_name: body.new_name || '', force: Boolean(body.force) },
  });
};

const afterImport = (host, task) => {
  const store = storeOf(host);
  const { pool, new_name: renamed } = task.metadata;
  const name = renamed || pool;
  if (store.pools.some(row => row.name === name)) {
    return;
  }
  const kept = store.exported.get(pool);
  store.exported.delete(pool);
  if (kept) {
    store.pools = [...store.pools, { ...kept.row, name }];
    store.devices.set(name, kept.devices);
    store.types[name] = kept.type;
    return;
  }
  store.pools = [
    ...store.pools,
    {
      name,
      size: String(4 * TIB),
      alloc: String(1.2 * TIB),
      free: String(2.8 * TIB),
      capacity_percent: '30',
      dedup_ratio: '1.00x',
      health: 'ONLINE',
      altroot: null,
    },
  ];
  store.devices.set(name, ['c2t0d0', 'c2t1d0']);
  store.types[name] = 'mirror';
};

const addedVdevs = ctx => {
  const { body, pool } = ctx;
  const devices = vdevList(body);
  if (devices.length === 0) {
    return refusal(400, 'vdevs is required');
  }
  return queued(ctx, {
    operation: 'zfs_pool_add_vdevs',
    message: `Add vdevs task created for ${pool.name}`,
    metadata: { pool: pool.name, devices, force: Boolean(body.force) },
  });
};

const afterAddVdevs = (host, task) => {
  const store = storeOf(host);
  const { pool, devices } = task.metadata;
  store.devices.set(pool, [...(store.devices.get(pool) || []), ...devices]);
  store.free = store.free.filter(device => !devices.includes(device));
};

const deviceOf = ({ store, pool, body }, member) => {
  const device = String(body?.[member] || '').trim();
  if (!device) {
    return { device: '', refused: refusal(400, `${member} is required`) };
  }
  if (!(store.devices.get(pool.name) || []).includes(device)) {
    return { device, refused: refusal(404, `Device ${device} is not part of ${pool.name}`) };
  }
  return { device, refused: null };
};

const removedVdev = ctx => {
  const { device, refused } = deviceOf(ctx, 'device');
  return (
    refused ||
    queued(ctx, {
      operation: 'zfs_pool_remove_vdev',
      message: `Remove task created for ${device} of ${ctx.pool.name}`,
      metadata: { pool: ctx.pool.name, device },
    })
  );
};

const afterRemove = (host, task) => {
  const store = storeOf(host);
  const { pool, device } = task.metadata;
  store.devices.set(
    pool,
    (store.devices.get(pool) || []).filter(entry => entry !== device)
  );
  store.offline.delete(device);
  store.free = [...store.free, device];
};

const replacedDevice = ctx => {
  const { device, refused } = deviceOf(ctx, 'old_device');
  if (refused) {
    return refused;
  }
  const replacement = String(ctx.body.new_device || '').trim();
  if (!replacement) {
    return refusal(400, 'new_device is required');
  }
  return queued(ctx, {
    operation: 'zfs_pool_replace_device',
    message: `Replace task created for ${device} of ${ctx.pool.name}`,
    metadata: {
      pool: ctx.pool.name,
      old_device: device,
      new_device: replacement,
      force: Boolean(ctx.body.force),
    },
  });
};

const afterReplace = (host, task) => {
  const store = storeOf(host);
  const { pool, old_device: old, new_device: fresh } = task.metadata;
  store.devices.set(
    pool,
    (store.devices.get(pool) || []).map(entry => (entry === old ? fresh : entry))
  );
  store.offline.delete(old);
  store.free = [...store.free.filter(entry => entry !== fresh), old];
};

const onlined = ctx => {
  const { device, refused } = deviceOf(ctx, 'device');
  return (
    refused ||
    queued(ctx, {
      operation: 'zfs_pool_online_device',
      message: `Online task created for ${device} of ${ctx.pool.name}`,
      metadata: { pool: ctx.pool.name, device, expand: Boolean(ctx.body.expand) },
    })
  );
};

const afterOnline = (host, task) => storeOf(host).offline.delete(task.metadata.device);

const offlined = ctx => {
  const { device, refused } = deviceOf(ctx, 'device');
  return (
    refused ||
    queued(ctx, {
      operation: 'zfs_pool_offline_device',
      message: `Offline task created for ${device} of ${ctx.pool.name}`,
      metadata: { pool: ctx.pool.name, device, temporary: Boolean(ctx.body.temporary) },
    })
  );
};

const afterOffline = (host, task) => storeOf(host).offline.add(task.metadata.device);

const disks = ctx => {
  const store = storeOf(ctx.host);
  const assignment = new Map(
    [...store.devices.entries()].flatMap(([pool, list]) => list.map(device => [device, pool]))
  );
  const rows = BAYS.map((bay, index) => {
    const pool = assignment.get(bay.device_name) || null;
    return {
      ...bay,
      id: index + 1,
      disk_index: index,
      pool_assignment: pool,
      is_available: pool === null && store.free.includes(bay.device_name),
      faulty: store.offline.has(bay.device_name),
      health: store.offline.has(bay.device_name) ? 'OFFLINE' : 'ONLINE',
      status: 'ok',
      device_path: `/dev/rdsk/${bay.device_name}`,
      removable: false,
      scan_timestamp: now(),
    };
  });
  return ok({ disks: rows, totalCount: rows.length });
};

const collected = () => ok({ success: true, message: 'Collection triggered' });

const createdDataset = ctx => {
  const { body } = ctx;
  const store = storeOf(ctx.host);
  const name = String(body.name || '').trim();
  if (!name || !name.includes('/')) {
    return refusal(400, 'name must be pool/dataset');
  }
  if (store.datasets.some(row => row.name === name)) {
    return refusal(409, `Dataset ${name} already exists`);
  }
  const type = body.type === 'volume' ? 'volume' : 'filesystem';
  if (type === 'volume' && !body.properties?.volsize) {
    return refusal(400, 'properties.volsize is required for a volume');
  }
  return queued(ctx, {
    operation: 'zfs_dataset_create',
    message: `Dataset creation task created for ${name}`,
    metadata: { name, type, properties: body.properties || {} },
  });
};

const afterDatasetCreate = (host, task) => {
  const store = storeOf(host);
  const { name, type, properties } = task.metadata;
  if (store.datasets.some(row => row.name === name)) {
    return;
  }
  const parent = store.datasets.find(row => row.name === name.split('/')[0]);
  store.datasets = [
    ...store.datasets,
    {
      name,
      type,
      used: type === 'volume' ? properties.volsize : '96K',
      avail: parent?.avail || '1T',
      refer: '96K',
      mountpoint: type === 'volume' ? '-' : properties.mountpoint || `/${name}`,
    },
  ];
  if (Object.keys(properties).length > 0) {
    store.datasetProps.set(name, properties);
  }
};

const destroyedDataset = ctx => {
  const { store, name, body } = ctx;
  if (!store.datasets.some(row => row.name === name)) {
    return refusal(404, `Dataset ${name} not found`);
  }
  const children = store.datasets.filter(row => row.name.startsWith(`${name}/`));
  if (children.length > 0 && !body?.recursive) {
    return refusal(400, `Dataset ${name} has children; use recursive`);
  }
  return queued(ctx, {
    operation: 'zfs_dataset_destroy',
    message: `Destroy task created for ${name}`,
    metadata: { name, recursive: Boolean(body?.recursive), force: Boolean(body?.force) },
  });
};

const afterDatasetDestroy = (host, task) => {
  const store = storeOf(host);
  const { name } = task.metadata;
  store.datasets = store.datasets.filter(
    row => row.name !== name && !row.name.startsWith(`${name}/`) && !row.name.startsWith(`${name}@`)
  );
};

const renamedDataset = ctx => {
  const { store, name, body } = ctx;
  const target = String(body?.new_name || '').trim();
  if (!store.datasets.some(row => row.name === name)) {
    return refusal(404, `Dataset ${name} not found`);
  }
  if (!target) {
    return refusal(400, 'new_name is required');
  }
  if (store.datasets.some(row => row.name === target)) {
    return refusal(409, `Dataset ${target} already exists`);
  }
  return queued(ctx, {
    operation: 'zfs_dataset_rename',
    message: `Rename task created for ${name}`,
    metadata: {
      name,
      new_name: target,
      recursive: Boolean(body.recursive),
      force: Boolean(body.force),
    },
  });
};

const afterDatasetRename = (host, task) => {
  const store = storeOf(host);
  const { name, new_name: target } = task.metadata;
  const moved = row => {
    if (row.name === name) {
      return { ...row, name: target };
    }
    if (row.name.startsWith(`${name}/`) || row.name.startsWith(`${name}@`)) {
      return { ...row, name: `${target}${row.name.slice(name.length)}` };
    }
    return row;
  };
  store.datasets = store.datasets.map(moved);
};

const cloned = ctx => {
  const { store, name, body } = ctx;
  const target = String(body?.target || '').trim();
  if (!store.datasets.some(row => row.name === name)) {
    return refusal(404, `Snapshot ${name} not found`);
  }
  if (!target) {
    return refusal(400, 'target is required');
  }
  if (store.datasets.some(row => row.name === target)) {
    return refusal(409, `Dataset ${target} already exists`);
  }
  return queued(ctx, {
    operation: 'zfs_dataset_clone',
    message: `Clone task created for ${name}`,
    metadata: { snapshot: name, target, properties: body.properties || {} },
  });
};

const afterClone = (host, task) => {
  const store = storeOf(host);
  const { snapshot, target } = task.metadata;
  const source = store.datasets.find(row => row.name === snapshot.split('@')[0]);
  if (store.datasets.some(row => row.name === target)) {
    return;
  }
  store.datasets = [
    ...store.datasets,
    {
      name: target,
      type: source?.type === 'volume' ? 'volume' : 'filesystem',
      used: '0',
      avail: source?.avail || '1T',
      refer: source?.refer || '96K',
      mountpoint: source?.type === 'volume' ? '-' : `/${target}`,
      origin: snapshot,
    },
  ];
};

const promoted = ctx => {
  const { store, name } = ctx;
  const row = store.datasets.find(entry => entry.name === name);
  if (!row) {
    return refusal(404, `Dataset ${name} not found`);
  }
  if (!row.origin) {
    return refusal(400, `Dataset ${name} is not a clone`);
  }
  return queued(ctx, {
    operation: 'zfs_dataset_promote',
    message: `Promote task created for ${name}`,
    metadata: { name },
  });
};

const afterPromote = (host, task) => {
  const store = storeOf(host);
  store.datasets = store.datasets.map(row =>
    row.name === task.metadata.name ? { ...row, origin: undefined } : row
  );
};

const destroyedSnapshot = ctx => {
  const { store, name, body } = ctx;
  if (!store.datasets.some(row => row.name === name)) {
    return refusal(404, `Snapshot ${name} not found`);
  }
  return queued(ctx, {
    operation: 'zfs_snapshot_destroy',
    message: `Destroy task created for ${name}`,
    metadata: { snapshot: name, recursive: Boolean(body?.recursive), defer: Boolean(body?.defer) },
  });
};

const afterSnapshotDestroy = (host, task) => {
  const store = storeOf(host);
  store.datasets = store.datasets.filter(row => row.name !== task.metadata.snapshot);
};

const rolledBack = ctx => {
  const { store, name, body } = ctx;
  if (!store.datasets.some(row => row.name === name)) {
    return refusal(404, `Snapshot ${name} not found`);
  }
  return queued(ctx, {
    operation: 'zfs_snapshot_rollback',
    message: `Rollback task created for ${name}`,
    metadata: { snapshot: name, recursive: Boolean(body?.recursive), force: Boolean(body?.force) },
  });
};

const afterSnapshot = (host, task) => {
  const store = storeOf(host);
  const { dataset, snapshot_name: snapshot } = task.metadata;
  const name = `${dataset}@${snapshot}`;
  const source = store.datasets.find(row => row.name === dataset);
  if (!source || store.datasets.some(row => row.name === name)) {
    return;
  }
  store.datasets = [
    ...store.datasets,
    { name, type: 'snapshot', used: '0', avail: '-', refer: source.refer, mountpoint: '-' },
  ];
};

/**
 * The storage page's ZFS management on a host that lists `zfs`, every
 * route hyperweaver-agent's storage controllers answer that no other
 * module of the mock answers already: the pools' writes, `POST
 * storage/pools`, the importable pools and `POST storage/pools/import`,
 * and under `storage/pools/{pool}` the properties read and written, the
 * status with its parsed vdev tree and scan, the scrub and its stop, the
 * upgrade, the export, the destroy, the added vdevs, the removed, the
 * replaced, the onlined and the offlined device; the datasets' writes,
 * `POST storage/datasets`, and by `?name=` the destroy, the rename, the
 * clone, the promote, and of a snapshot the destroy and the rollback;
 * each a queued task on the target `system` that changes the pools, the
 * devices or the datasets this module holds when it completes. The disk
 * inventory at `GET monitoring/storage/disks` behind `monitoring`,
 * tinted by the pools the devices belong to, and `POST monitoring/collect`.
 * The reads of the pools and the datasets belong to the create wizard's
 * module, a dataset's properties and its snapshot to the settings
 * page's, the holds to the machine tools'.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountStorage = agentRoute => {
  const zfs = handler => behind('zfs', handler);
  settles('zfs_pool_create', afterPoolCreate);
  settles('zfs_pool_destroy', afterPoolDestroy);
  settles('zfs_pool_scrub', afterScrub);
  settles('zfs_pool_scrub_stop', afterScrubStop);
  settles('zfs_pool_export', afterExport);
  settles('zfs_pool_import', afterImport);
  settles('zfs_pool_add_vdevs', afterAddVdevs);
  settles('zfs_pool_remove_vdev', afterRemove);
  settles('zfs_pool_replace_device', afterReplace);
  settles('zfs_pool_online_device', afterOnline);
  settles('zfs_pool_offline_device', afterOffline);
  settles('zfs_dataset_create', afterDatasetCreate);
  settles('zfs_dataset_destroy', afterDatasetDestroy);
  settles('zfs_dataset_rename', afterDatasetRename);
  settles('zfs_dataset_clone', afterClone);
  settles('zfs_dataset_promote', afterPromote);
  settles('zfs_snapshot_destroy', afterSnapshotDestroy);
  settles('dataset_snapshot', afterSnapshot);
  agentRoute('GET', 'monitoring/storage/disks', behind('monitoring', disks));
  agentRoute('POST', 'monitoring/collect', behind('monitoring', collected));
  agentRoute('POST', 'storage/pools', zfs(createdPool));
  agentRoute('GET', 'storage/pools/importable', zfs(importable));
  agentRoute('POST', 'storage/pools/import', zfs(importedPool));
  agentRoute('GET', 'storage/pools/:pool', zfs(pooled(poolProperties)));
  agentRoute('DELETE', 'storage/pools/:pool', zfs(pooled(destroyedPool)));
  agentRoute('GET', 'storage/pools/:pool/status', zfs(pooled(poolStatus)));
  agentRoute('PUT', 'storage/pools/:pool/properties', zfs(pooled(poolPropertiesSet)));
  agentRoute('POST', 'storage/pools/:pool/scrub', zfs(pooled(scrubbed)));
  agentRoute('POST', 'storage/pools/:pool/scrub/stop', zfs(pooled(scrubStopped)));
  agentRoute('POST', 'storage/pools/:pool/upgrade', zfs(pooled(upgraded)));
  agentRoute('POST', 'storage/pools/:pool/export', zfs(pooled(exportedPool)));
  agentRoute('POST', 'storage/pools/:pool/vdevs', zfs(pooled(addedVdevs)));
  agentRoute('POST', 'storage/pools/:pool/vdevs/remove', zfs(pooled(removedVdev)));
  agentRoute('POST', 'storage/pools/:pool/devices/replace', zfs(pooled(replacedDevice)));
  agentRoute('POST', 'storage/pools/:pool/devices/online', zfs(pooled(onlined)));
  agentRoute('POST', 'storage/pools/:pool/devices/offline', zfs(pooled(offlined)));
  agentRoute('POST', 'storage/datasets', zfs(createdDataset));
  agentRoute('DELETE', 'storage/dataset', zfs(named(destroyedDataset)));
  agentRoute('POST', 'storage/dataset/rename', zfs(named(renamedDataset)));
  agentRoute('POST', 'storage/dataset/clone', zfs(snapped(cloned)));
  agentRoute('POST', 'storage/dataset/promote', zfs(named(promoted)));
  agentRoute('DELETE', 'storage/snapshot', zfs(snapped(destroyedSnapshot)));
  agentRoute('POST', 'storage/snapshot/rollback', zfs(snapped(rolledBack)));
};
