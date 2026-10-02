import { parse, stringify } from 'yaml';

import { featuresOf, machineOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { isAdmin } from './people.js';
import { queue, settles } from './tasks.js';

const RECENT_LIMIT = 5;
const PROVISION_STEPS = 3;
const PIPELINE_OPERATIONS = [
  'machine_provision_orchestration',
  'machine_sync_parent',
  'machine_provision_parent',
];
const HOOK_REASON =
  'This document runs host hooks (target: host) on the agent host itself; confirm to run them';
const NO_DOCUMENT = 'Machine has no provisioner configuration';
const ROLE_NAMES = ['domino', 'traveler', 'nomadweb', 'leap'];
const VERSIONS = ['0.1.27', '0.1.26'];
const ROLE_SPECS = {
  domino: {
    collection: 'startcloud.hcl_roles',
    short_description: 'Installs HCL Domino from the installer the role names',
    options: {
      domino_organization: {
        description: 'The Domino organization',
        default: 'STARTcloud',
        required: true,
      },
      domino_admin_notes_id_password: { description: 'The admin ID password', required: true },
    },
  },
  traveler: {
    collection: 'startcloud.hcl_roles',
    short_description: 'Installs HCL Traveler on a Domino server',
    options: { traveler_port: { description: 'The Traveler port', default: 443 } },
  },
  nomadweb: {
    collection: 'startcloud.hcl_roles',
    short_description: 'Installs HCL Nomad Web',
    options: {},
  },
  leap: {
    collection: 'startcloud.hcl_roles',
    short_description: 'Installs HCL Leap',
    options: {},
  },
  networking: {
    collection: 'startcloud.startcloud_roles',
    short_description: 'Configures the guest network',
    options: {},
  },
};
const ROLE_HINTS = {
  domino: [],
  traveler: ['domino'],
  nomadweb: ['domino'],
  leap: ['domino'],
  networking: [],
};
const CONFIGURATION = {
  groups: [
    { name: 'domino', label: 'Domino', show_if: { domino_enabled: true } },
    { name: 'advanced', label: 'Advanced', advanced: true },
  ],
  fields: [
    { name: 'hostname', label: 'Hostname', type: 'fqdn', required: true },
    { name: 'server_id', label: 'Server id', type: 'number', validate: { min: 1, max: 9999 } },
    {
      name: 'domino_organization',
      label: 'Organization',
      type: 'text',
      group: 'domino',
      default: 'STARTcloud',
      required: true,
    },
    {
      name: 'domino_admin_notes_id_password',
      label: 'Admin password',
      type: 'password',
      group: 'domino',
      generate: { length: 24 },
    },
    { name: 'debug', label: 'Debug', type: 'checkbox', group: 'advanced' },
    {
      name: 'communicator',
      label: 'Communicator',
      type: 'select',
      group: 'advanced',
      options: ['ssh', 'winrm'],
      default: 'ssh',
    },
  ],
};

const stores = new Map();

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, {
      documents: new Map(),
      yaml: new Map(),
      provisioned: new Map(),
      confirmed: new Set(),
    });
  }
  return stores.get(host.id);
};

const indexOf = (host, row) => host.machines.findIndex(entry => entry.name === row.name);

const pad = (number, width) => String(number).padStart(width, '0');

const seededDocument = (host, row) => {
  const index = indexOf(host, row);
  return {
    provisioner_name: 'startcloud',
    provisioner_version: VERSIONS[0],
    settings: {
      hostname: row.name,
      domain: 'example.com',
      server_id: pad(index + 1, 4),
      vcpus: 4,
      memory: '8G',
      box: 'STARTcloud/debian13-server',
    },
    vars: { debug: false, domino_organization: 'STARTcloud' },
    folders: [
      { map: './provisioners', to: '/vagrant/provisioners', type: 'rsync', syncback: false },
      { map: './logs', to: '/vagrant/logs', type: 'rsync', syncback: true },
    ],
    roles: ROLE_NAMES.map((name, order) => ({ name, order }))
      .filter(role => (index + role.order) % 2 === 0)
      .map(role => ({ name: `startcloud.hcl_roles.${role.name}` })),
    provisioning: {
      shell: { enabled: true, scripts: ['./scripts/aliases.sh'] },
      ansible: {
        playbooks: [
          {
            local: [
              {
                playbook: 'ansible/playbook.yml',
                run: 'once',
                collections: ['startcloud.hcl_roles'],
              },
              { playbook: 'ansible/always.yml', run: 'always' },
            ],
          },
        ],
      },
      ...(index % 4 === 0 ? { pre: [{ script: './scripts/snapshot.sh', target: 'host' }] } : {}),
    },
  };
};

const provisioned = (host, row) => indexOf(host, row) % 2 === 0;

/**
 * The provisioner document a machine's configuration carries, the
 * Hosts.yml host entry: the one stored by a Store or a saved Hosts.yml,
 * else the seeded one of every other machine, and null for a machine
 * made by hand.
 *
 * @param {Object} host - The host
 * @param {Object} row - The machine the mock holds
 * @returns {Object|null} The document
 */
export const documentOf = (host, row) => {
  const { documents } = storeOf(host);
  if (!documents.has(row.name)) {
    documents.set(row.name, provisioned(host, row) ? seededDocument(host, row) : null);
  }
  return documents.get(row.name);
};

const keepDocument = (host, name, document) => {
  storeOf(host).documents.set(name, document);
  storeOf(host).yaml.delete(name);
};

const stateOf = (host, row) => {
  const { provisioned: kept } = storeOf(host);
  if (!kept.has(row.name)) {
    kept.set(
      row.name,
      provisioned(host, row)
        ? { status: 'provisioned', at: ago(indexOf(host, row) * 90 + 180) }
        : { status: 'not_started', at: null }
    );
  }
  return kept.get(row.name);
};

const nameOf = ctx => decodeURIComponent(ctx.params.name);

const behind = (token, handler) => ctx =>
  featuresOf(ctx.host).includes(token) ? handler(ctx) : problem(404, 'Not Found');

const found = handler => ctx => {
  const row = machineOf(ctx.host, nameOf(ctx));
  return row ? handler({ ...ctx, row }) : refusal(404, 'Machine not found');
};

const documented = handler => ctx => {
  const document = documentOf(ctx.host, ctx.row);
  return document ? handler({ ...ctx, document }) : refusal(400, NO_DOCUMENT);
};

const recentOf = (host, row) =>
  host.tasks
    .filter(task => task.machine_name === row.name && PIPELINE_OPERATIONS.includes(task.operation))
    .slice(0, RECENT_LIMIT)
    .map(task => ({ id: task.id, operation: task.operation, status: task.status }));

const status = ctx => {
  const { host, row } = ctx;
  const document = documentOf(host, row);
  const state = stateOf(host, row);
  return ok({
    machine_name: row.name,
    provisioning_configured: document !== null,
    provisioning_status: document ? state.status : 'not_started',
    last_provisioned_at: document ? state.at : null,
    recent_tasks: recentOf(host, row),
  });
};

const hooksOf = document =>
  [...(document.provisioning?.pre || []), ...(document.provisioning?.post || [])].filter(
    hook => hook?.target === 'host'
  );

const queued = (ctx, { operation, message, metadata, more = {} }) => {
  const { host, person, row } = ctx;
  const task = queue({ host, by: person.username, operation, target: row.name, metadata });
  return ok({
    success: true,
    message,
    machine_name: row.name,
    parent_task_id: task.id,
    task_chain: [task.id],
    ...more,
  });
};

const provision = ctx => {
  const { host, row, document, body } = ctx;
  const { confirmed } = storeOf(host);
  if (hooksOf(document).length > 0 && !body.confirm_host_hooks && !confirmed.has(row.name)) {
    return ok(
      {
        error: 'Host hooks need confirmation',
        needs_confirmation: true,
        reason: HOOK_REASON,
        confirm_with: { confirm_host_hooks: true },
      },
      409
    );
  }
  if (body.confirm_host_hooks) {
    confirmed.add(row.name);
  }
  return queued(ctx, {
    operation: 'machine_provision_orchestration',
    message: 'Provisioning pipeline queued',
    metadata: { skip_boot: Boolean(body.skip_boot), steps: PROVISION_STEPS },
    more: { steps: PROVISION_STEPS },
  });
};

const sync = ctx => {
  const { document, body } = ctx;
  const folders = Array.isArray(document.folders) ? document.folders : [];
  const syncback = Boolean(body.syncback);
  const chosen = syncback ? folders.filter(folder => folder.syncback) : folders;
  return queued(ctx, {
    operation: 'machine_sync_parent',
    message: syncback ? 'Sync back queued' : 'Folder sync queued',
    metadata: { syncback, folder_count: chosen.length },
    more: { folder_count: chosen.length },
  });
};

const playbooksOf = document => {
  const playbooks = document.provisioning?.ansible?.playbooks;
  const group = (Array.isArray(playbooks) ? playbooks[0] : playbooks) || {};
  return [...(group.local || []), ...(group.remote || [])];
};

const runProvisioners = ctx => {
  const { host, row, document } = ctx;
  const state = stateOf(host, row);
  const playbooks = playbooksOf(document);
  const skipped = playbooks
    .filter(playbook => playbook.run === 'once' && state.status === 'provisioned')
    .map(playbook => playbook.playbook);
  const running = playbooks.length - skipped.length;
  if (playbooks.length > 0 && running === 0) {
    return ok({
      success: true,
      message: 'Nothing to run: every playbook was skipped by its run directive',
      playbook_count: 0,
      playbooks_skipped: skipped,
    });
  }
  return queued(ctx, {
    operation: 'machine_provision_parent',
    message: 'Provisioner run queued',
    metadata: { playbook_count: running, playbooks_skipped: skipped },
    more: { playbook_count: running, playbooks_skipped: skipped },
  });
};

const afterProvision = (host, task) => {
  const row = machineOf(host, task.machine_name);
  if (row) {
    storeOf(host).provisioned.set(row.name, { status: 'provisioned', at: now() });
  }
};

/**
 * Store a machine's provisioner document, the `PUT machines/{name}`
 * that carries `provisioner`: kept at once with no task, as both agents
 * keep it.
 *
 * @param {Object} ctx - The request's context with its `row`
 * @returns {Object} The answer
 */
export const storedDocument = ctx => {
  const { host, row, body } = ctx;
  if (body.provisioner === null || typeof body.provisioner !== 'object') {
    return refusal(400, 'provisioner must be an object');
  }
  keepDocument(host, row.name, body.provisioner);
  return ok({
    success: true,
    machine_name: row.name,
    operation: host.kind === 'zoneweaver' ? 'zone_modify' : 'machine_modify',
    status: 'completed',
    message: 'Provisioner configuration updated successfully.',
    requires_restart: false,
  });
};

const yamlOf = (host, row) => {
  const { yaml } = storeOf(host);
  if (!yaml.has(row.name)) {
    const document = documentOf(host, row) || { settings: { hostname: row.name } };
    yaml.set(row.name, stringify({ hosts: [{ [row.name]: document }] }));
  }
  return yaml.get(row.name);
};

const readHostsYml = ctx => {
  if (!isAdmin(ctx.person)) {
    return refusal(403, 'Hosts.yml is the manager’s alone');
  }
  return ok({ machine_name: ctx.row.name, yaml: yamlOf(ctx.host, ctx.row) });
};

const positionOf = error => {
  const [position] = Array.isArray(error.linePos) ? error.linePos : [];
  return position ? { line: position.line, column: position.col } : {};
};

const saveHostsYml = ctx => {
  const { host, row, body } = ctx;
  if (!isAdmin(ctx.person)) {
    return refusal(403, 'Hosts.yml is the manager’s alone');
  }
  if (typeof body.yaml !== 'string') {
    return refusal(400, 'yaml is required');
  }
  let parsed;
  try {
    parsed = parse(body.yaml);
  } catch (error) {
    return refusal(400, error.message.split('\n')[0], positionOf(error));
  }
  const entry = parsed?.hosts?.[0]?.[row.name];
  if (!entry || typeof entry !== 'object') {
    return refusal(400, `The document must carry hosts[0].${row.name}`);
  }
  storeOf(host).documents.set(row.name, entry);
  storeOf(host).yaml.set(row.name, body.yaml);
  const warnings = entry.settings ? [] : ['The entry carries no settings; the agent keeps its own'];
  return ok({ success: true, machine_name: row.name, warnings });
};

const provisioners = () =>
  ok({
    provisioners: [
      {
        name: 'startcloud',
        metadata: { label: 'STARTcloud', description: 'The STARTcloud provisioner' },
        versions: VERSIONS.map(version => ({ version, dir: `startcloud/${version}` })),
      },
    ],
    total: 1,
  });

const version = ctx => {
  const name = decodeURIComponent(ctx.params.name);
  const wanted = decodeURIComponent(ctx.params.version);
  if (name !== 'startcloud' || !VERSIONS.includes(wanted)) {
    return refusal(404, 'Provisioner version not found');
  }
  return ok({
    name,
    version: wanted,
    metadata: {
      name,
      version: wanted,
      description: 'The STARTcloud provisioner, generic edition',
      metadata: {
        label: 'STARTcloud',
        description: 'The STARTcloud provisioner, generic edition',
        roles: Object.keys(ROLE_SPECS).map(role => ({
          name: role,
          depends_on: ROLE_HINTS[role],
          defaultEnabled: role === 'domino' || role === 'networking',
        })),
        configuration: CONFIGURATION,
      },
    },
    role_specs: { roles: ROLE_SPECS },
    playbook_candidates: ['ansible/playbook.yml', 'ansible/always.yml', 'ansible/roles.yml'],
  });
};

/**
 * The provisioning of a machine on both agents, each answering as the
 * agent of the host's kind does, hyperweaver-ui's calls the truth of
 * every body. Behind `provisioning`: `GET machines/{name}/provision/status`,
 * `provisioning_configured` true while the machine carries a document;
 * `POST machines/{name}/provision`, refused 409 with `needs_confirmation`
 * and `reason` while the document runs host hooks not yet confirmed and
 * queued as one orchestration task otherwise, its `parent_task_id` the
 * task's; `POST machines/{name}/sync`, `syncback` choosing the flagged
 * folders; and `POST machines/{name}/run-provisioners`, a 200 no-op with
 * `playbooks_skipped` while every playbook runs once and the machine was
 * provisioned. `GET` and `PUT machines/{name}/hosts-yml` read and save the
 * whole document as YAML, 403 to a person who is no admin, a refused
 * YAML naming its `line` and `column`. Behind `provisioner-registry`:
 * `GET provisioning/provisioners` and one version's detail, the whole
 * provisioner.yml nested under `metadata` as both agents nest it, its own
 * `metadata.roles` and `metadata.configuration` inside, beside
 * `role_specs` and `playbook_candidates`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountMachineProvisioning = agentRoute => {
  const pipeline = handler => behind('provisioning', found(documented(handler)));
  settles('machine_provision_orchestration', afterProvision);
  settles('machine_provision_parent', afterProvision);
  agentRoute('GET', 'machines/:name/provision/status', behind('provisioning', found(status)));
  agentRoute('POST', 'machines/:name/provision', pipeline(provision));
  agentRoute('POST', 'machines/:name/sync', pipeline(sync));
  agentRoute('POST', 'machines/:name/run-provisioners', pipeline(runProvisioners));
  agentRoute('GET', 'machines/:name/hosts-yml', behind('machine-create', found(readHostsYml)));
  agentRoute('PUT', 'machines/:name/hosts-yml', behind('machine-create', found(saveHostsYml)));
  agentRoute('GET', 'provisioning/provisioners', behind('provisioner-registry', provisioners));
  agentRoute(
    'GET',
    'provisioning/provisioners/:name/versions/:version',
    behind('provisioner-registry', version)
  );
};
