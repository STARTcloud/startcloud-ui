import { hostHasFeature, hostHasHypervisor } from './capabilities';
import { canCreateMachines } from './permissions';

const SOURCES = ['template', 'current'];

const CLONE_WIRES = {
  utm: { platform: 'utm', member: '', linked: false, bare: false, live: true },
  zfs: { platform: 'zfs', member: 'snapshot_name', linked: true, bare: true, live: true },
  virtualbox: {
    platform: 'virtualbox',
    member: 'snapshot',
    linked: false,
    bare: false,
    live: false,
  },
};

/**
 * The form the clone dialog opens with before the machine's platform is
 * known, hyperweaver-ui's: a fresh build from the template, no snapshot,
 * no linked clone and every field empty; `cloneFormOf` sets `linked` to
 * what the platform's agent takes it as.
 */
export const CLONE_FORM = {
  source: 'template',
  snapshot: '',
  linked: false,
  name: '',
  hostname: '',
  domain: '',
  memory: '',
  vcpus: '',
  startAfter: false,
};

/**
 * The form the publish dialog opens with, every field empty.
 */
export const PUBLISH_FORM = {
  source: '',
  organization: '',
  boxName: '',
  version: '',
  architecture: '',
  description: '',
};

/**
 * Whether the agent of a host makes a template of one snapshot: while
 * the host's own row lists `machine-snapshots` and `zfs`, the agent
 * whose export and publish read the snapshot they are handed; the
 * export and the publish of the agent of VirtualBox read none and make
 * the template of the machine's current state. No agent lists a token
 * for it, so `zfs`, the closest member of the host's row, tells.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when a template is made of a snapshot
 */
export const hostTemplatesSnapshots = server =>
  hostHasFeature(server, 'machine-snapshots') && hostHasFeature(server, 'zfs');

/**
 * What the host's own row, the machine's own row and the person's role
 * allow of the machine's tools, the one rule the machine page, the
 * Controls menu, the machines list and the sidebar tree's menu share:
 * `snapshots`, the read of the snapshots, while the host lists
 * `machine-snapshots`; `snapshot`, every write of one, for a person who
 * may create machines; `rename` and `policy` never of a machine on UTM,
 * which has neither, the policy while the host lists `machine-modify`
 * too; `holds` while the host lists `zfs`, the token of the agent whose
 * snapshots are those of datasets, and `rollback` with it, because a
 * restore on that agent is a rollback that destroys every snapshot taken
 * after the one restored, where the restore of VirtualBox keeps the
 * tree; `templates` while the host lists `templates`;
 * `snapshotTemplates`, the template made of one snapshot, while the host
 * lists `templates` and its agent makes one (`hostTemplatesSnapshots`);
 * `clone` while it lists `machine-create`; `move`, the move of a
 * machine's files, and `install`, the unattended install of an OS from
 * an ISO, on a host that names `virtualbox` and never of a machine on
 * UTM. No agent lists a token for the holds, for the rollback, for the
 * template of a snapshot, for the move or for the install, so each is
 * gated by what the host's row lists today.
 *
 * @param {Object} options - The host's row, the machine's row and the role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @param {string} [options.role] - The person's role
 * @returns {{ utm: boolean, snapshots: boolean, snapshot: boolean, rename: boolean, policy: boolean, holds: boolean, rollback: boolean, templates: boolean, snapshotTemplates: boolean, clone: boolean, move: boolean, install: boolean }} The gates
 */
export const machineToolGates = ({ server, machine, role }) => {
  const create = canCreateMachines(role);
  const utm = machine?.hypervisor === 'utm';
  const snapshots = hostHasFeature(server, 'machine-snapshots');
  const zfs = hostHasFeature(server, 'zfs');
  const templates = create && hostHasFeature(server, 'templates');
  const writes = snapshots && create;
  return {
    utm,
    snapshots,
    snapshot: writes,
    rename: writes && !utm,
    policy: writes && !utm && hostHasFeature(server, 'machine-modify'),
    holds: snapshots && zfs,
    rollback: snapshots && zfs,
    templates,
    snapshotTemplates: templates && hostTemplatesSnapshots(server),
    clone: create && hostHasFeature(server, 'machine-create'),
    move: create && !utm && hostHasHypervisor(server, 'virtualbox'),
    install: create && !utm && hostHasHypervisor(server, 'virtualbox'),
  };
};

const streamsTopic = (row, topic) =>
  Array.isArray(row?.features) &&
  row.features.includes('events') &&
  Array.isArray(row.events?.topics) &&
  row.events.topics.includes(topic);

/**
 * Whether one topic of a host reaches the tab's event stream: while the
 * host that serves the page streams it and the host's own row says its
 * agent does, `events` among its features and the topic among its
 * `events.topics`. On an agent role the two are the one status.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} topic - The topic, e.g. `tasks` or `hosts`
 * @returns {boolean} True when the topic's events arrive
 */
export const hostStreamsTopic = (status, server, topic) =>
  streamsTopic(status, topic) && streamsTopic(server?.capabilities, topic);

/**
 * Whether the end of a task of one host reaches the tab's event stream,
 * `hostStreamsTopic` of `tasks`. An agent that streams nothing sends no
 * word of a task's end, so what waits for that end is handed to the
 * person there.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True when a task's end arrives as an event
 */
export const hostStreamsTasks = (status, server) => hostStreamsTopic(status, server, 'tasks');

/**
 * Whether Import draws in the heading of a host's machines list: for a
 * person who may create machines on a host that lists `machines` and
 * names `virtualbox`, the one agent that reads an appliance; no agent
 * lists a token for the route, so the host's hypervisors gate it.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} [role] - The person's role
 * @returns {boolean} True when Import draws
 */
export const hostImports = (server, role) =>
  canCreateMachines(role) &&
  hostHasFeature(server, 'machines') &&
  hostHasHypervisor(server, 'virtualbox');

/**
 * Which charts the machine page draws of a machine, both behind
 * `monitoring`: `zone`, the usage, the disk I/O and the links of a zone,
 * on a host that names `bhyve`; `machine`, the usage of a VirtualBox
 * machine, on a host that names `virtualbox`, only while the machine
 * runs and never of a machine on UTM, because the agent answers a sample
 * of a running VirtualBox machine alone. No agent lists a token for
 * either route, so the host's hypervisors gate them.
 *
 * @param {Object} options - The host's row, the machine's row and whether it runs
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @param {boolean} options.running - Whether the machine runs
 * @returns {{ zone: boolean, machine: boolean }} The gates
 */
export const machineChartGates = ({ server, machine, running }) => {
  const monitoring = hostHasFeature(server, 'monitoring');
  return {
    zone: monitoring && hostHasHypervisor(server, 'bhyve'),
    machine:
      monitoring &&
      running &&
      machine?.hypervisor !== 'utm' &&
      hostHasHypervisor(server, 'virtualbox'),
  };
};

/**
 * The task a queued answer names as the row the task dialog opens on:
 * its id, `task_id` or the `parent_task_id` of an orchestration, its
 * operation and the machine it is for; null for an answer that names no
 * task, the write an agent keeps at once.
 *
 * @param {Object|null} answer - The agent's answer
 * @param {string} name - The machine the write was for
 * @returns {{ id: string, operation: string, machine_name: string, status: string, parent_task_id: null }|null} The task
 */
export const queuedTaskOf = (answer, name) => {
  const id = answer?.task_id || answer?.parent_task_id || '';
  if (!id) {
    return null;
  }
  return {
    id: String(id),
    operation: answer.operation || '',
    machine_name: answer.machine_name || name,
    status: answer.status || 'pending',
    parent_task_id: null,
  };
};

/**
 * How the clone of one machine is offered and sent, the one place the
 * clone of the two agents is told apart, by the machine's own row and
 * its host's own row: `platform`, `utm` for a machine whose hypervisor
 * is UTM, `zfs` for a machine of a host that lists `zfs`, whose clone is
 * made of the snapshots of datasets, and `virtualbox` for every other;
 * `picks`, whether the dialog offers the snapshot a copy is made from,
 * on a host that lists `machine-snapshots` and never on UTM; `member`,
 * the body member that agent reads the snapshot under, `snapshot_name`
 * on `zfs` and `snapshot` on `virtualbox`, none on UTM, whose clone
 * takes no snapshot; `linked`, what that agent takes a clone as when the
 * body says nothing, which the box opens as; `bare`, whether a linked
 * clone needs no snapshot picked, true on `zfs`, where the agent
 * snapshots every dataset itself; and `live`, whether a machine that
 * runs is copied with no snapshot picked.
 *
 * @param {Object} options - The host's row and the machine's row
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @param {Object|null} options.machine - The machine's own row
 * @returns {{ platform: string, picks: boolean, member: string, linked: boolean, bare: boolean, live: boolean }} The wire
 */
export const cloneWireOf = ({ server, machine }) => {
  if (machine?.hypervisor === 'utm') {
    return { ...CLONE_WIRES.utm, picks: false };
  }
  const wire = hostHasFeature(server, 'zfs') ? CLONE_WIRES.zfs : CLONE_WIRES.virtualbox;
  return { ...wire, picks: hostHasFeature(server, 'machine-snapshots') };
};

/**
 * The form the clone dialog opens with on one platform, `CLONE_FORM`
 * with `linked` as that platform's agent takes it.
 *
 * @param {Object} wire - The wire of `cloneWireOf`
 * @returns {Object} The form
 */
export const cloneFormOf = wire => ({ ...CLONE_FORM, linked: wire.linked });

/**
 * Whether the clone dialog draws the panel of a copy, the snapshot and
 * the linked clone: for a copy of the current state where the platform
 * offers the snapshots or links a clone with none picked.
 *
 * @param {Object} form - The form, the shape of `CLONE_FORM`
 * @param {Object} wire - The wire of `cloneWireOf`
 * @returns {boolean} True when the panel draws
 */
export const cloneCopies = (form, wire) => form.source === 'current' && (wire.picks || wire.bare);

/**
 * Whether the linked clone can be chosen: with a snapshot picked, and
 * with none on a platform that links a clone to the snapshot the agent
 * takes itself.
 *
 * @param {Object} form - The form, the shape of `CLONE_FORM`
 * @param {Object} wire - The wire of `cloneWireOf`
 * @returns {boolean} True when the box can be ticked
 */
export const cloneLinks = (form, wire) => wire.bare || Boolean(wire.picks && form.snapshot);

/**
 * Why a clone form cannot be sent, the key of the sentence that says
 * so, empty for a form that can: the hostname is required; where the
 * dialog offers the snapshots, a copy of the current state of a machine
 * that runs needs one to copy from on a platform that copies no running
 * machine, and a linked clone the one it links to on a platform that
 * links to a picked snapshot alone.
 *
 * @param {Object} form - The form, the shape of `CLONE_FORM`
 * @param {Object} machine - Whether the machine runs and its wire
 * @param {boolean} machine.running - Whether the machine runs
 * @param {Object} machine.wire - The wire of `cloneWireOf`
 * @returns {string} The locale key, or the empty string
 */
export const cloneProblem = (form, { running, wire }) => {
  if (!form.hostname.trim()) {
    return 'machine.cloneMachineModal.hostnameRequired';
  }
  const copied = form.source === 'current' && wire.picks;
  if (copied && running && !wire.live && !form.snapshot) {
    return 'machine.cloneMachineModal.snapshotRequiredWhileRunning';
  }
  if (copied && form.linked && !wire.bare && !form.snapshot) {
    return 'machine.cloneMachineModal.linkedRequiresSnapshot';
  }
  return '';
};

const copiedMembers = (form, wire) => {
  const copied = form.source === 'current' && Boolean(wire.member);
  const snapshot = copied && wire.picks ? form.snapshot : '';
  return {
    ...(snapshot ? { [wire.member]: snapshot } : {}),
    linked: copied && Boolean(form.linked) && (wire.bare || Boolean(snapshot)),
  };
};

/**
 * The body of `POST machines/{name}/clone` a clone form sends: the name
 * where given, the hostname and the domain as `settings`, the memory and
 * the processors as `overrides`, the source, `template` or `current`,
 * and whether the clone starts when it is made; a copy of the current
 * state carries the snapshot it is made from under the member the
 * machine's agent reads, `wire.member`; and every body says `linked`,
 * because the two agents take a body that says nothing differently: true
 * only of a copy of the current state, and only with a snapshot picked
 * where the platform links to a picked snapshot alone.
 *
 * @param {Object} form - The form, the shape of `CLONE_FORM`
 * @param {Object} wire - The wire of `cloneWireOf`
 * @returns {Object} The body
 */
export const cloneBody = (form, wire) => {
  const name = form.name.trim();
  const domain = form.domain.trim();
  return {
    ...(name ? { name } : {}),
    settings: { hostname: form.hostname.trim(), ...(domain ? { domain } : {}) },
    overrides: {
      ...(form.memory.trim() ? { memory: form.memory.trim() } : {}),
      ...(form.vcpus === '' ? {} : { vcpus: Number(form.vcpus) }),
    },
    source: SOURCES.includes(form.source) ? form.source : CLONE_FORM.source,
    start_after_create: Boolean(form.startAfter),
    ...copiedMembers(form, wire),
  };
};

/**
 * What a refusal for want of resources names, the `details` of the
 * agent's 400, each `{ resource, message }`; none for every other
 * failure.
 *
 * @param {Object|null} error - The failure of the request
 * @returns {Array<Object>} The details
 */
export const resourceIssuesOf = error =>
  Array.isArray(error?.data?.details)
    ? error.data.details.filter(detail => detail && typeof detail.message === 'string')
    : [];

/**
 * The warnings a queued clone answers beside its task,
 * `resource_warnings`, each `{ resource, level, message,
 * projected_percent }`; none for an answer that carries no list.
 *
 * @param {Object|null} answer - The agent's answer
 * @returns {Array<Object>} The warnings
 */
export const resourceWarningsOf = answer =>
  Array.isArray(answer?.resource_warnings)
    ? answer.resource_warnings.filter(warning => warning && typeof warning.message === 'string')
    : [];

/**
 * The body of `POST templates/export`: the machine, the file's name
 * where given and the snapshot the template is made from where one is
 * chosen.
 *
 * @param {Object} options - The machine, the file's name and the snapshot
 * @param {string} options.name - The machine name
 * @param {string} [options.filename] - The file's name
 * @param {string} [options.snapshot] - The snapshot's name
 * @returns {Object} The body
 */
export const exportBody = ({ name, filename = '', snapshot = '' }) => ({
  machine_name: name,
  ...(filename.trim() ? { filename: filename.trim() } : {}),
  ...(snapshot ? { snapshot_name: snapshot } : {}),
});

/**
 * Whether a publish form can be sent: the registry, the organization,
 * the box and the version are each required.
 *
 * @param {Object} form - The form, the shape of `PUBLISH_FORM`
 * @returns {boolean} True when the form is complete
 */
export const canPublish = form =>
  [form.source, form.organization, form.boxName, form.version].every(value =>
    Boolean(String(value).trim())
  );

/**
 * The body of `POST templates/publish`: the machine and the snapshot the
 * template is made from, the registry as `source_name`, the
 * organization, the box and the version, and the description and the
 * architecture where given.
 *
 * @param {Object} options - The machine, the snapshot and the form
 * @param {string} options.name - The machine name
 * @param {string} options.snapshot - The snapshot's name
 * @param {Object} options.form - The form, the shape of `PUBLISH_FORM`
 * @returns {Object} The body
 */
export const publishBody = ({ name, snapshot, form }) => ({
  machine_name: name,
  snapshot_name: snapshot,
  source_name: form.source,
  organization: form.organization.trim(),
  box_name: form.boxName.trim(),
  version: form.version.trim(),
  ...(form.description.trim() ? { description: form.description.trim() } : {}),
  ...(form.architecture.trim() ? { architecture: form.architecture.trim() } : {}),
});

/**
 * The registry a publish form opens on: the one the host marks
 * `default`, the first otherwise, and none while the host lists none.
 *
 * @param {Array<Object>} sources - The sources of `GET templates/sources`
 * @returns {string} The source's name, or the empty string
 */
export const defaultSourceOf = sources =>
  (sources.find(source => source.default) || sources[0])?.name || '';

/**
 * The body of `POST machines/import`: the appliance's path on the host
 * and the machine's name where given.
 *
 * @param {Object} options - The path and the name
 * @param {string} options.path - The path of the appliance on the host
 * @param {string} [options.name] - The machine's name
 * @returns {Object} The body
 */
export const importBody = ({ path, name = '' }) => ({
  path: path.trim(),
  ...(name.trim() ? { name: name.trim() } : {}),
});
