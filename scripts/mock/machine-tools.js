import path from 'path';

import { featuresOf, machineOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { storedDocument } from './machine-provisioning.js';
import { modified as modifiedMachine } from './machine-settings.js';
import { setBootPriority, templateSourcesOf } from './manage.js';
import { queue, settles, stoppedWord } from './tasks.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DEFAULT_MEMORY = 32 * GIB;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,255}$/u;
const MEMORY_PATTERN = /^(?<amount>\d+(?:\.\d+)?)(?<unit>[GM])$/iu;
const POLICY_TYPES = ['none', 'simple', 'age', 'rotation'];
const SOURCES = ['current', 'template'];
const APPLIANCES = ['.ova', '.ovf'];
const MACHINE_MISSING = 'Machine not found';
const NO_SPEC =
  'Only machines this agent created can be cloned — this machine has no creation spec (discovered VM)';
const NO_HOSTNAME = 'settings.hostname is required — a clone must not reuse the source hostname';
const UTM_CLONE =
  'linked/snapshot clones are VirtualBox mechanisms — utm clones copy current state';
const UTM_OFFLINE = 'utm snapshots are offline (qemu-img) — stop the machine first';
const LINKED_ALONE = 'linked clones require a snapshot to link against';
const BAD_SOURCE =
  'source must be "current" (data-complete clonevm, the default) or "template" (explicit spec rebuild)';
const WORDS = {
  zoneweaver: {
    modified: 'zone_modify',
    kept: 'Zone metadata updated successfully.',
    exported: name => `Export task created for zone ${name}`,
    published: body => `Publish task created for ${body.machine_name || body.box_path}`,
  },
  hyperweaver: {
    modified: 'machine_modify',
    kept: 'Machine metadata updated successfully.',
    exported: name => `Export task created for machine ${name}`,
    published: body => `Publish task created for ${body.organization}/${body.box_name}`,
  },
};

const stores = new Map();

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, { snapshots: new Map(), holds: new Map() });
  }
  return stores.get(host.id);
};

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const snapshotOf = ctx => decodeURIComponent(ctx.params.snapshot);

const indexOf = (host, name) => host.machines.findIndex(row => row.name === name);

const pad = (number, width) => String(number).padStart(width, '0');

const uuidOf = (host, name, order) =>
  `3d1f6a20-7b41-4c58-9a0e-${pad(Number(host.id) || 0, 4)}${pad(indexOf(host, name), 4)}${pad(order, 4)}`;

const datasetsOf = name => [
  `rpool/zones/${name}`,
  `rpool/zones/${name}/boot`,
  `rpool/zones/${name}/data`,
];

const zoneSnapshot = ({ machine, name, description = null, created = now() }) => ({
  name,
  description,
  created,
  datasets: datasetsOf(machine).length,
  dataset_names: datasetsOf(machine),
  used_bytes: 0,
  holds: 0,
});

const seededFor = (host, row) => {
  if (indexOf(host, row.name) % 2 !== 0) {
    return [];
  }
  if (isZone(host)) {
    return [
      {
        ...zoneSnapshot({ machine: row.name, name: 'daily-20260927-0300', created: ago(540) }),
        used_bytes: MIB,
      },
      {
        ...zoneSnapshot({
          machine: row.name,
          name: 'before-upgrade',
          description: 'Before the upgrade',
          created: ago(9000),
        }),
        used_bytes: 700 * MIB,
      },
    ];
  }
  if (row.hypervisor === 'utm') {
    return [{ name: 'clean-install' }];
  }
  return [
    {
      name: 'clean-install',
      uuid: uuidOf(host, row.name, 1),
      description: 'Fresh from the box',
      node: 'SnapshotName',
      current: false,
    },
    {
      name: 'before-upgrade',
      uuid: uuidOf(host, row.name, 2),
      node: 'SnapshotName-1',
      current: true,
    },
  ];
};

const rowsOf = (host, row) => {
  const { snapshots } = storeOf(host);
  if (!snapshots.has(row.name)) {
    snapshots.set(row.name, seededFor(host, row));
  }
  return snapshots.get(row.name);
};

const keep = (host, name, rows) => storeOf(host).snapshots.set(name, rows);

const behind = (token, handler) => ctx =>
  offers(ctx.host, token) ? handler(ctx) : problem(404, 'Not Found');

const found = handler => ctx => {
  const row = machineOf(ctx.host, nameOf(ctx));
  return row ? handler({ ...ctx, row }) : refusal(404, MACHINE_MISSING);
};

const queued = (ctx, { operation, message, metadata, priority, status = 200 }) => {
  const { host, person, row } = ctx;
  const task = queue({
    host,
    by: person.username,
    operation,
    target: row.name,
    metadata,
    priority,
  });
  return ok(
    {
      success: true,
      task_id: task.id,
      machine_name: row.name,
      operation,
      status: 'pending',
      message,
    },
    status
  );
};

const listed = ctx => {
  const { host, row } = ctx;
  if (row.hypervisor === 'utm' && row.status !== 'stopped') {
    return refusal(400, UTM_OFFLINE);
  }
  const snapshots = rowsOf(host, row);
  return ok({ machine_name: row.name, snapshots, total: snapshots.length });
};

const stamped = prefix => {
  const at = new Date();
  const day = `${at.getFullYear()}${pad(at.getMonth() + 1, 2)}${pad(at.getDate(), 2)}`;
  return `${prefix}-${day}-${pad(at.getHours(), 2)}${pad(at.getMinutes(), 2)}`;
};

const taken = ctx => {
  const { body } = ctx;
  const label = body.name || body.prefix || '';
  if (!label) {
    return refusal(400, 'name or prefix is required');
  }
  if (!NAME_PATTERN.test(label)) {
    return refusal(400, 'snapshot name/prefix contains unsupported characters');
  }
  return queued(ctx, {
    operation: 'snapshot_take',
    message: 'Snapshot task queued successfully',
    metadata: {
      snapshot_name: body.name || '',
      prefix: body.prefix || '',
      retention: Math.max(0, Number(body.retention) || 0),
      description: body.description || '',
      quiesce: Boolean(body.quiesce),
      live: Boolean(body.live),
    },
  });
};

const named = (handler, refusalWord) => ctx =>
  NAME_PATTERN.test(snapshotOf(ctx)) ? handler(ctx) : refusal(400, refusalWord);

const restored = ctx =>
  queued(ctx, {
    operation: 'snapshot_restore',
    message: 'Snapshot restore task queued successfully',
    metadata: { snapshot_name: snapshotOf(ctx) },
    priority: 80,
  });

const deleted = ctx =>
  queued(ctx, {
    operation: 'snapshot_delete',
    message: 'Snapshot delete task queued successfully',
    metadata: { snapshot_name: snapshotOf(ctx) },
  });

const modified = ctx => {
  const { body } = ctx;
  if (body.new_name === undefined && body.description === undefined) {
    return refusal(400, 'new_name or description is required');
  }
  if (body.new_name !== undefined && !NAME_PATTERN.test(body.new_name)) {
    return refusal(400, 'snapshot name contains unsupported characters');
  }
  return queued(ctx, {
    operation: 'snapshot_modify',
    message: 'Snapshot modify task queued successfully',
    metadata: {
      snapshot_name: snapshotOf(ctx),
      ...(body.new_name === undefined ? {} : { new_name: body.new_name }),
      ...(body.description === undefined ? {} : { description: body.description }),
    },
  });
};

const takenName = metadata =>
  metadata?.snapshot_name || (metadata?.prefix ? stamped(metadata.prefix) : '');

const newRow = (host, machine, metadata) => {
  const name = takenName(metadata);
  const description = metadata.description || '';
  if (isZone(host)) {
    return zoneSnapshot({ machine: machine.name, name, description: description || null });
  }
  if (machine.hypervisor === 'utm') {
    return { name };
  }
  const held = rowsOf(host, machine);
  return {
    name,
    uuid: uuidOf(host, machine.name, held.length + 1),
    ...(description ? { description } : {}),
    node: held.length > 0 ? `SnapshotName${'-1'.repeat(held.length)}` : 'SnapshotName',
    current: true,
  };
};

const afterTake = (host, task) => {
  const machine = machineOf(host, task.machine_name);
  if (!machine || !takenName(task.metadata)) {
    return;
  }
  const row = newRow(host, machine, task.metadata);
  const held = rowsOf(host, machine).map(entry =>
    entry.current === undefined ? entry : { ...entry, current: false }
  );
  keep(host, machine.name, isZone(host) ? [row, ...held] : [...held, row]);
};

const changedRows = (host, task, change) => {
  const machine = machineOf(host, task.machine_name);
  if (machine) {
    keep(host, machine.name, change(rowsOf(host, machine), task.metadata));
  }
};

const afterRestore = (host, task) =>
  changedRows(host, task, (rows, metadata) =>
    rows.map(row =>
      row.current === undefined ? row : { ...row, current: row.name === metadata.snapshot_name }
    )
  );

const afterDelete = (host, task) =>
  changedRows(host, task, (rows, metadata) =>
    rows.filter(row => row.name !== metadata.snapshot_name)
  );

const describedAs = (row, description, zone) => {
  if (description) {
    return { ...row, description };
  }
  if (zone) {
    return { ...row, description: null };
  }
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'description'));
};

const afterModify = (host, task) =>
  changedRows(host, task, (rows, metadata) =>
    rows.map(row => {
      if (row.name !== metadata.snapshot_name) {
        return row;
      }
      const renamed = { ...row, name: metadata.new_name || row.name };
      return metadata.description === undefined
        ? renamed
        : describedAs(renamed, metadata.description, isZone(host));
    })
  );

const policy = ctx => {
  const { host, row, body } = ctx;
  const wanted = body.snapshots;
  if (body.provisioner !== undefined) {
    return storedDocument(ctx);
  }
  if (body.boot_priority !== undefined) {
    setBootPriority(host, row.name, Number(body.boot_priority));
    return ok({
      success: true,
      machine_name: row.name,
      operation: WORDS[host.kind].modified,
      status: 'completed',
      message: WORDS[host.kind].kept,
      requires_restart: false,
    });
  }
  if (wanted === undefined) {
    return modifiedMachine(ctx);
  }
  const typed = wanted && POLICY_TYPES.includes(wanted.type);
  if (wanted && wanted.type && !typed) {
    return refusal(400, 'snapshots.type must be none, simple, age, or rotation');
  }
  host.machines = host.machines.map(entry =>
    entry.name === row.name ? { ...entry, snapshots: typed ? wanted : null } : entry
  );
  const words = WORDS[host.kind];
  return ok({
    success: true,
    machine_name: row.name,
    operation: words.modified,
    status: 'completed',
    message: words.kept,
    requires_restart: false,
  });
};

const bytesOf = memory => {
  const match = MEMORY_PATTERN.exec(String(memory || ''));
  if (!match) {
    return 0;
  }
  return Number(match.groups.amount) * (match.groups.unit.toUpperCase() === 'G' ? GIB : MIB);
};

const shortOf = (host, body) => {
  const requested = bytesOf(body.overrides?.memory || body.settings?.memory);
  const total = Number(host.facts.totalmem) || DEFAULT_MEMORY;
  const free = Number(host.facts.freemem) || total / 4;
  if (requested <= free) {
    return [];
  }
  return [
    {
      resource: 'memory',
      strategy: 'actual',
      message: `Requested ${(requested / GIB).toFixed(2)} GB exceeds available host memory (${(free / GIB).toFixed(2)} GB free)`,
      host_total_bytes: total,
      host_free_bytes: free,
      requested_bytes: requested,
      projected_percent: Number((((total - free + requested) / total) * 100).toFixed(2)),
    },
  ];
};

const cloneNameOf = body => {
  const { hostname, domain } = body.settings;
  return body.name || `${hostname}.${domain || 'example.com'}`;
};

const zoneRefusal = ({ body }) => {
  if (!SOURCES.includes(body.source || 'current')) {
    return refusal(400, 'source must be "current" or "template"');
  }
  return body.settings?.hostname ? null : refusal(400, NO_HOSTNAME);
};

const machineRefusal = ({ host, row, body }) => {
  if (indexOf(host, row.name) % 2 !== 0) {
    return refusal(400, NO_SPEC);
  }
  if (!['', ...SOURCES].includes(body.source || '')) {
    return refusal(400, BAD_SOURCE);
  }
  if (row.hypervisor === 'utm' && (body.snapshot || body.linked)) {
    return refusal(400, UTM_CLONE);
  }
  return body.settings?.hostname ? null : refusal(400, NO_HOSTNAME);
};

const zoneClone = ctx => {
  const { host, person, row, body } = ctx;
  const short = shortOf(host, body);
  if (short.length > 0) {
    return refusal(400, 'Insufficient resources for clone', { details: short });
  }
  const name = cloneNameOf(body);
  if (machineOf(host, name)) {
    return refusal(409, `Zone ${name} already exists in database`);
  }
  const operation = 'zone_clone_orchestration';
  const metadata = { source: row.name, hypervisor: row.hypervisor, start: body.start_after_create };
  const task = queue({ host, by: person.username, operation, target: name, metadata });
  return ok(
    {
      success: true,
      parent_task_id: task.id,
      machine_name: name,
      source_machine: row.name,
      operation,
      status: 'pending',
      message: 'Zone clone queued',
      sub_tasks: {},
    },
    202
  );
};

const machineClone = ctx => {
  const { host, person, row, body } = ctx;
  const source = body.source || 'current';
  if (source === 'current' && body.linked && !body.snapshot) {
    return refusal(400, LINKED_ALONE);
  }
  const short = shortOf(host, body);
  if (short.length > 0) {
    return refusal(400, 'Insufficient resources', { details: short });
  }
  const name = cloneNameOf(body);
  if (machineOf(host, name)) {
    return refusal(409, `Machine ${name} already exists in database`);
  }
  const copied = source === 'current';
  const operation = copied ? 'machine_clone_current' : 'machine_create_orchestration';
  const metadata = { source: row.name, hypervisor: row.hypervisor, start: body.start_after_create };
  const task = queue({ host, by: person.username, operation, target: name, metadata });
  const shared = { machine_name: name, source_machine: row.name, operation, status: 'pending' };
  return ok(
    copied
      ? {
          success: true,
          task_id: task.id,
          ...shared,
          message: 'Current-state clone task queued (VBoxManage clonevm)',
        }
      : {
          success: true,
          parent_task_id: task.id,
          ...shared,
          message: 'Machine clone creation queued',
          requires_download: false,
          sub_tasks: {},
        }
  );
};

const cloned = ctx => {
  const zone = isZone(ctx.host);
  const refused = zone ? zoneRefusal(ctx) : machineRefusal(ctx);
  if (refused) {
    return refused;
  }
  return zone ? zoneClone(ctx) : machineClone(ctx);
};

const added = (host, name, hypervisor, status) => {
  if (!machineOf(host, name)) {
    host.machines = [
      ...host.machines,
      { name, status, brand: hypervisor, hypervisor, notes: '', tags: [] },
    ];
  }
};

const afterClone = (host, task) => {
  const { source, hypervisor, start } = task.metadata || {};
  if (source) {
    added(host, task.machine_name, hypervisor, start ? 'running' : stoppedWord(host));
  }
};

const imported = ctx => {
  const { host, person, body } = ctx;
  if (isZone(host)) {
    return problem(404, 'Not Found');
  }
  if (!body.path) {
    return refusal(400, 'path is required (an .ova or .ovf on the agent host)');
  }
  if (!APPLIANCES.includes(path.extname(String(body.path)).toLowerCase())) {
    return refusal(400, 'path must name an .ova or .ovf file');
  }
  if (body.name && machineOf(host, body.name)) {
    return refusal(409, `A machine named ${body.name} already exists`);
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'machine_import',
    target: body.name || 'system',
    metadata: { path: body.path, ...(body.name ? { name: body.name } : {}) },
  });
  return ok(
    {
      success: true,
      task_id: task.id,
      path: body.path,
      operation: 'machine_import',
      status: 'pending',
      message: 'Appliance import task queued successfully',
    },
    202
  );
};

const afterImport = (host, task) => {
  const { name, path: file } = task.metadata;
  const fallback = path.basename(String(file).replace(/\\/gu, '/'), path.extname(String(file)));
  added(host, name || fallback, 'virtualbox', 'stopped');
};

const accepted = ({ host, task, message }) =>
  ok(
    isZone(host)
      ? { success: true, message, task_id: task.id }
      : { success: true, task_id: task.id, status: 'pending', message },
    202
  );

const exported = ctx => {
  const { host, person, body } = ctx;
  if (!body.machine_name) {
    return refusal(400, 'machine_name is required');
  }
  if (!isZone(host) && !machineOf(host, body.machine_name)) {
    return refusal(404, MACHINE_MISSING);
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'template_export',
    target: isZone(host) ? 'system' : body.machine_name,
    metadata: isZone(host)
      ? {
          zone_name: body.machine_name,
          filename: body.filename,
          snapshot_name: body.snapshot_name,
        }
      : { filename: body.filename || '' },
  });
  return accepted({ host, task, message: WORDS[host.kind].exported(body.machine_name) });
};

const published = ctx => {
  const { host, person, body } = ctx;
  const target = body.machine_name || body.box_path;
  if (!target || !body.source_name || !body.organization || !body.box_name || !body.version) {
    return refusal(400, 'Missing required fields');
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'template_upload',
    target: isZone(host) || !body.machine_name ? 'system' : body.machine_name,
    metadata: { ...body },
  });
  return accepted({ host, task, message: WORDS[host.kind].published(body) });
};

const sources = ctx => ok({ sources: templateSourcesOf(ctx.host) });

const zfs = handler => ctx =>
  isZone(ctx.host) && offers(ctx.host, 'zfs') ? handler(ctx) : problem(404, 'Not Found');

const handleOf = ctx => ctx.url.searchParams.get('name') || '';

const handled = handler => ctx => {
  const snapshot = handleOf(ctx);
  if (!snapshot) {
    return refusal(400, 'Snapshot name is required');
  }
  if (!snapshot.includes('@')) {
    return refusal(400, 'Snapshot must be in format dataset@snapshot');
  }
  return handler({ ...ctx, snapshot });
};

const heldOn = (host, snapshot) => storeOf(host).holds.get(snapshot) || [];

const holds = ctx => {
  const { host, snapshot } = ctx;
  const list = heldOn(host, snapshot);
  if (list.length === 0) {
    return refusal(404, `Snapshot ${snapshot} not found or has no holds`, { details: '' });
  }
  return ok({ snapshot, holds: list, total: list.length });
};

const holdTask = (ctx, operation, tag) =>
  queue({
    host: ctx.host,
    by: ctx.person.username,
    operation,
    target: 'system',
    metadata: { snapshot: ctx.snapshot, tag, recursive: false },
  });

const held = ctx => {
  const { body, snapshot } = ctx;
  if (!body.tag) {
    return refusal(400, 'Hold tag is required');
  }
  const task = holdTask(ctx, 'zfs_hold_snapshot', body.tag);
  return ok(
    {
      success: true,
      message: `Hold task created for ${snapshot} with tag ${body.tag}`,
      task_id: task.id,
      snapshot,
      tag: body.tag,
    },
    202
  );
};

const released = ctx => {
  const { url, snapshot } = ctx;
  const tag = url.searchParams.get('tag') || '';
  if (!tag) {
    return refusal(400, 'Hold tag is required');
  }
  const task = holdTask(ctx, 'zfs_release_snapshot', tag);
  return ok(
    {
      success: true,
      message: `Release task created for ${snapshot} tag ${tag}`,
      task_id: task.id,
      snapshot,
      tag,
    },
    202
  );
};

const counted = host => {
  const { snapshots, holds: kept } = storeOf(host);
  snapshots.forEach((rows, machine) => {
    snapshots.set(
      machine,
      rows.map(row =>
        Array.isArray(row.dataset_names)
          ? {
              ...row,
              holds: row.dataset_names.reduce(
                (sum, dataset) => sum + (kept.get(`${dataset}@${row.name}`) || []).length,
                0
              ),
            }
          : row
      )
    );
  });
};

const afterHold = (host, task) => {
  const { snapshot, tag } = task.metadata;
  const list = heldOn(host, snapshot).filter(hold => hold.tag !== tag);
  storeOf(host).holds.set(snapshot, [
    ...list,
    { name: snapshot, tag, timestamp: new Date().toString() },
  ]);
  counted(host);
};

const afterRelease = (host, task) => {
  const { snapshot, tag } = task.metadata;
  storeOf(host).holds.set(
    snapshot,
    heldOn(host, snapshot).filter(hold => hold.tag !== tag)
  );
  counted(host);
};

/**
 * The tools of a machine on both agents, each answering as the agent of
 * the host's kind does, read from zoneweaver-agent's controllers and
 * hyperweaver-agent's handlers. The snapshots behind `machine-snapshots`:
 * `GET machines/{name}/snapshots`, the tree of VirtualBox on the
 * hyperweaver kind, the names alone of a machine on UTM, refused with
 * 400 while it runs, and the snapshots of the zone's datasets on the
 * zoneweaver kind; take, restore, modify and delete each a queued task
 * that changes the list when it completes, a seeded take whose task
 * names no snapshot and no prefix landing none. `PUT machines/{name}`
 * keeps a
 * machine's own retention policy at once, its provisioner document
 * through `storedDocument` while the body carries `provisioner`, its
 * boot priority through `setBootPriority` while it carries
 * `boot_priority`, and
 * hands every other body to the modify of `machine-settings.js`.
 * `POST machines/{name}/clone`
 * behind `machine-create`: the hyperweaver kind reads `snapshot` and
 * refuses a machine that carries no creation spec, the zoneweaver kind
 * reads `snapshot_name` and answers 202, either refuses with `details`
 * when the memory asked for exceeds the host's free memory, and the
 * clone joins the host's machines when its task completes.
 * `POST machines/import` on the hyperweaver kind alone, 404 on a
 * zoneweaver host. `POST templates/export`, `POST templates/publish` and
 * `GET templates/sources` behind `templates`. The holds of a dataset's
 * snapshot, `storage/snapshot/holds`, on a zoneweaver host that lists
 * `zfs` alone: 404 for a snapshot that carries no hold, and hold and
 * release each a queued task on the target `system`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMachineTools = agentRoute => {
  const snapshots = handler => behind('machine-snapshots', found(handler));
  settles('snapshot_take', afterTake);
  settles('snapshot_restore', afterRestore);
  settles('snapshot_delete', afterDelete);
  settles('snapshot_modify', afterModify);
  settles('machine_clone_current', afterClone);
  settles('machine_create_orchestration', afterClone);
  settles('zone_clone_orchestration', afterClone);
  settles('machine_import', afterImport);
  settles('zfs_hold_snapshot', afterHold);
  settles('zfs_release_snapshot', afterRelease);
  agentRoute('POST', 'machines/import', behind('machines', imported));
  agentRoute('GET', 'machines/:name/snapshots', snapshots(listed));
  agentRoute('POST', 'machines/:name/snapshots', snapshots(taken));
  agentRoute(
    'POST',
    'machines/:name/snapshots/:snapshot/restore',
    snapshots(named(restored, 'snapshot name contains unsupported characters'))
  );
  agentRoute('PUT', 'machines/:name/snapshots/:snapshot', snapshots(modified));
  agentRoute(
    'DELETE',
    'machines/:name/snapshots/:snapshot',
    snapshots(named(deleted, 'snapshot name contains unsupported characters'))
  );
  agentRoute('POST', 'machines/:name/clone', behind('machine-create', found(cloned)));
  agentRoute('PUT', 'machines/:name', behind('machine-modify', found(policy)));
  agentRoute('POST', 'templates/export', behind('templates', exported));
  agentRoute('POST', 'templates/publish', behind('templates', published));
  agentRoute('GET', 'templates/sources', behind('templates', sources));
  agentRoute('GET', 'storage/snapshot/holds', zfs(handled(holds)));
  agentRoute('POST', 'storage/snapshot/holds', zfs(handled(held)));
  agentRoute('DELETE', 'storage/snapshot/holds', zfs(handled(released)));
};
