import { featuresOf, hypervisorsOf, machineOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { queue, settles } from './tasks.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const PACKAGES = [
  ['pkg:/system/library', 'omnios', '0.5.11-151054.0', true, false, false, '2.61 MB'],
  ['pkg:/network/ssh', 'omnios', '9.8p1-151054.0', true, false, true, '1.4 MB'],
  ['pkg:/ooce/text/vim', 'ooce', '9.1-151054.0', true, false, true, '12 MB'],
  ['pkg:/ooce/runtime/node-22', 'ooce', '22.9.0-151054.0', true, true, false, '48 MB'],
  [
    'pkg:/extra.omnios/database/postgresql-16',
    'extra.omnios',
    '16.4-151054.0',
    false,
    false,
    false,
    '24 MB',
  ],
  ['pkg:/ooce/editor/nano', 'ooce', '8.2-151054.0', false, false, false, '620 KB'],
];
const SEARCH_HITS = [
  ['pkg.fmri', 'pkg:/ooce/text/vim@9.1-151054.0'],
  ['pkg.fmri', 'pkg:/ooce/editor/nano@8.2-151054.0'],
  ['pkg.fmri', 'pkg:/ooce/editor/emacs@29.4-151054.0'],
  ['pkg.description', 'pkg:/ooce/text/vim@9.1-151054.0'],
];
const SECRETS = {
  hcl_download_portal_api_keys: [{ name: 'hcl-portal', value: 'hcl-token-value' }],
  custom_resource_url: [{ name: 'mirror-credentials', value: 'user:pass' }],
  git_api_keys: [{ name: 'github-startcloud', value: 'ghp_token' }],
};
const RECIPES = [
  {
    name: 'debian-console-setup',
    os_family: 'linux',
    brand: 'bhyve',
    is_default: true,
    description: 'Logs in over the console and sets the network up',
    boot_string: 'login:',
    login_prompt: 'login:',
    shell_prompt: ':~$',
    timeout_seconds: 300,
    variables: { username: 'root', password: 'changeme' },
    steps: [
      { type: 'wait', pattern: 'login:' },
      { type: 'send', value: '{{username}}' },
      { type: 'wait', pattern: 'Password:' },
      { type: 'send', value: '{{password}}' },
      { type: 'command', value: 'ip addr' },
    ],
  },
  {
    name: 'windows-first-boot',
    os_family: 'windows',
    brand: 'bhyve',
    is_default: false,
    description: 'Waits out the first boot',
    variables: {},
    steps: [{ type: 'delay', seconds: 120 }],
  },
  {
    name: 'omnios-lx-setup',
    os_family: 'solaris',
    brand: 'lx',
    is_default: false,
    description: '',
    variables: { hostname: 'lx-1' },
    steps: [
      { type: 'wait', pattern: '# ' },
      { type: 'template', content: 'hostname={{hostname}}', dest: '/etc/nodename' },
    ],
  },
];
const TEMPLATES = [
  ['startcloud', 'debian13', '13.1.0', 'amd64', 'virtualbox', 700 * MIB, 20],
  ['startcloud', 'debian13', '13.0.0', 'amd64', 'virtualbox', 690 * MIB, 4000],
  ['startcloud', 'ubuntu2404', '24.04.2', 'amd64', 'virtualbox', 1.1 * GIB, 900],
  ['acme', 'windows-server-2025', '2025.1', 'amd64', 'virtualbox', 9.4 * GIB, 300],
];
const CATALOG = {
  name: 'STARTcloud provisioner catalog',
  format_version: 1,
  updated: '2026-09-20T00:00:00.000Z',
  provisioners: [
    {
      name: 'startcloud',
      repo: 'https://github.com/STARTcloud/startcloud-provisioner',
      description: 'The STARTcloud provisioner',
      versions: [
        { version: '0.1.28', artifacts: [] },
        { version: '0.1.27', artifacts: [] },
        { version: '0.1.26', artifacts: [] },
      ],
    },
    {
      name: 'hcl-domino',
      repo: 'https://github.com/STARTcloud/hcl-domino-provisioner',
      description: 'HCL Domino on any box',
      versions: [{ version: '2.0.0', artifacts: [] }],
    },
  ],
};
const CATALOG_SOURCES = [
  { name: 'startcloud', url: 'https://catalog.startcloud.com/catalog.json', default: true },
  { name: 'staging', url: 'https://catalog-staging.startcloud.com/catalog.json', default: false },
];
const FAMILY_SOURCES = {
  startcloud: {
    source_type: 'git',
    url: 'https://github.com/STARTcloud/startcloud-provisioner',
    branch: 'main',
    token_name: 'github-startcloud',
  },
};
const NETWORK_COMPONENTS = {
  bridge: { exists: true, up: true, name: 'hwprov0' },
  dhcp: { running: true, leases: 3 },
  nat: { rules: true },
};
const NETWORK_CONFIG = {
  interface: 'hwprov0',
  subnet: '10.99.0.0/24',
  gateway: '10.99.0.1',
  dhcp_range: '10.99.0.100-10.99.0.200',
};

const stores = new Map();

const pad = (number, width) => String(number).padStart(width, '0');

const isZone = host => host.kind === 'zoneweaver';

const offers = (host, token) => featuresOf(host).includes(token);

const behind = (tokens, handler) => ctx =>
  tokens.every(token => offers(ctx.host, token)) ? handler(ctx) : problem(404, 'Not Found');

const bhyve = handler => ctx =>
  offers(ctx.host, 'provisioning') && hypervisorsOf(ctx.host).includes('bhyve')
    ? handler(ctx)
    : problem(404, 'Not Found');

const packageRow = ([name, publisher, version, installed, frozen, manual, size]) => ({
  name,
  publisher,
  version,
  installed,
  frozen,
  manually_installed: manual,
  obsolete: false,
  renamed: false,
  flags: `${installed ? 'i' : '-'}${frozen ? 'f' : '-'}${manual ? 'm' : '-'}`,
  size,
});

const recipeRow = (host, index, seed) => ({
  id: `r${pad(Number(host.id) || 0, 4)}${pad(index + 1, 4)}`,
  ...seed,
  created_at: ago(9000 - index * 700),
  updated_at: ago(400 - index * 90),
});

const templateRow = (host, index, [organization, box, version, arch, provider, size, minutes]) => ({
  id: `tpl-${pad(Number(host.id) || 0, 4)}-${pad(index + 1, 4)}`,
  organization,
  box_name: box,
  version,
  architecture: arch,
  provider,
  size: Math.round(size),
  size_bytes: Math.round(size),
  checksum: 'a1b2c3d4'.repeat(8),
  downloaded_at: ago(minutes),
  created_at: ago(minutes),
  dataset_path: `rpool/templates/${organization}/${box}/${version}`,
  available_pools: ['rpool'],
});

const familyRow = (name, versions, more = {}) => ({
  name,
  description: more.description || '',
  metadata: { label: more.label || name, description: more.description || '' },
  valid: more.valid !== false,
  source: FAMILY_SOURCES[name] || null,
  versions: versions.map(version => ({
    version,
    dir: `${name}/${version}`,
    name: more.label || name,
    description: more.description || '',
  })),
});

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, {
      packages: PACKAGES.map(packageRow),
      recipes: RECIPES.map((seed, index) => recipeRow(host, index, seed)),
      nextRecipe: RECIPES.length + 1,
      templates: TEMPLATES.map((seed, index) => templateRow(host, index, seed)),
      nextTemplate: TEMPLATES.length + 1,
      families: [
        familyRow('startcloud', ['0.1.27', '0.1.26'], {
          label: 'STARTcloud',
          description: 'The STARTcloud provisioner',
        }),
        familyRow('hcl-domino', ['2.0.0'], {
          label: 'HCL Domino',
          description: 'HCL Domino on any box',
        }),
        familyRow('broken-local', ['0.0.1'], { valid: false }),
      ],
      network: { enabled: !isZone(host), ready: false },
      registered: 0,
    });
  }
  return stores.get(host.id);
};

const paramOf = (ctx, name) => ctx.url.searchParams.get(name) || '';

const queued = ({ ctx, operation, target, metadata = null, message }) => {
  const task = queue({ host: ctx.host, by: ctx.person.username, operation, target, metadata });
  return ok({ success: true, message, task_id: task.id, status: 'pending', operation }, 202);
};

const packages = ctx => {
  const all = paramOf(ctx, 'all') === 'true';
  const filter = paramOf(ctx, 'filter').toLowerCase();
  const rows = storeOf(ctx.host)
    .packages.filter(row => all || row.installed)
    .filter(row => !filter || row.name.toLowerCase().includes(filter));
  return ok({ packages: rows, total: rows.length });
};

const searchedPackages = ctx => {
  const query = paramOf(ctx, 'query').toLowerCase();
  if (!query) {
    return refusal(400, 'query is required');
  }
  const results = SEARCH_HITS.filter(([, fmri]) => fmri.toLowerCase().includes(query)).map(
    ([index, fmri]) => ({ index, action: 'set', value: fmri.split('@')[0], package: fmri })
  );
  return ok({ results, total: results.length, query });
};

const packageInfo = ctx => {
  const name = paramOf(ctx, 'package');
  const row = storeOf(ctx.host).packages.find(entry => entry.name === name);
  if (!name) {
    return refusal(400, 'package is required');
  }
  return ok(
    [
      `Name: ${name.replace('pkg:/', '')}`,
      `Summary: ${row ? `${row.name.split('/').pop()} from ${row.publisher}` : 'A package of the repository'}`,
      `Publisher: ${row?.publisher || 'ooce'}`,
      `Version: ${row?.version || '1.0'}`,
      `State: ${row?.installed ? 'Installed' : 'Not installed'}`,
      `Size: ${row?.size || '1 MB'}`,
      'FMRI: pkg://omnios/library@0.5.11',
    ].join('\n')
  );
};

const packageTask = (operation, install) => ctx => {
  const { body } = ctx;
  const names = Array.isArray(body.packages) ? body.packages : [];
  if (names.length === 0) {
    return refusal(400, 'packages is required');
  }
  return queued({
    ctx,
    operation,
    target: 'system',
    metadata: { packages: names, dry_run: Boolean(body.dry_run), install },
    message: `${install ? 'Install' : 'Uninstall'} task created for ${names.join(', ')}`,
  });
};

const settlePackages = (host, task) => {
  const { packages: names, dry_run: dry, install } = task.metadata || {};
  if (dry) {
    return;
  }
  const store = storeOf(host);
  (names || []).forEach(name => {
    const row = store.packages.find(entry => entry.name === name);
    if (row) {
      row.installed = install;
      row.manually_installed = install;
    } else if (install) {
      store.packages = [
        ...store.packages,
        packageRow([name, 'ooce', '1.0-151054.0', true, false, true, '3 MB']),
      ];
    }
  });
};

const secrets = ctx =>
  isZone(ctx.host) || offers(ctx.host, 'provisioner-registry')
    ? ok(SECRETS)
    : problem(404, 'Not Found');

const recipes = ctx => {
  const family = paramOf(ctx, 'os_family');
  const brand = paramOf(ctx, 'brand');
  const rows = storeOf(ctx.host)
    .recipes.filter(row => !family || row.os_family === family)
    .filter(row => !brand || row.brand === brand);
  return ok({ recipes: rows, total: rows.length });
};

const recipeOf = ctx => storeOf(ctx.host).recipes.find(row => row.id === ctx.params.recipe) || null;

const unsetDefaults = (store, row) => {
  store.recipes.forEach(entry => {
    if (entry !== row && entry.os_family === row.os_family && entry.brand === row.brand) {
      entry.is_default = false;
    }
  });
};

const createdRecipe = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  if (!body.name || !Array.isArray(body.steps) || body.steps.length === 0) {
    return refusal(400, 'name and at least one step are required');
  }
  const row = recipeRow(host, store.nextRecipe - 1, {
    ...body,
    is_default: Boolean(body.is_default),
    variables: body.variables || {},
  });
  store.nextRecipe += 1;
  store.recipes = [...store.recipes, row];
  if (row.is_default) {
    unsetDefaults(store, row);
  }
  return ok({ success: true, message: `Recipe ${row.name} created`, recipe: row }, 201);
};

const updatedRecipe = ctx => {
  const row = recipeOf(ctx);
  if (!row) {
    return refusal(404, 'Recipe not found');
  }
  Object.assign(row, ctx.body, { updated_at: now() });
  if (ctx.body.is_default) {
    unsetDefaults(storeOf(ctx.host), row);
  }
  return ok({ success: true, message: `Recipe ${row.name} updated`, recipe: row });
};

const deletedRecipe = ctx => {
  const row = recipeOf(ctx);
  if (!row) {
    return refusal(404, 'Recipe not found');
  }
  const store = storeOf(ctx.host);
  store.recipes = store.recipes.filter(entry => entry !== row);
  return ok({ success: true, message: `Recipe ${row.name} deleted` });
};

const resolve = (text, variables) =>
  String(text).replace(/\{\{(?<name>[a-z_]+)\}\}/giu, (match, name) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match
  );

const testedRecipe = ctx => {
  const row = recipeOf(ctx);
  const { body, host } = ctx;
  if (!row) {
    return refusal(404, 'Recipe not found');
  }
  if (!body.machine_name || !machineOf(host, body.machine_name)) {
    return refusal(400, 'machine_name must name a machine of this host');
  }
  const variables = { ...row.variables, ...(body.variables || {}) };
  const resolved = row.steps.map(step =>
    Object.fromEntries(
      Object.entries(step).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolve(value, variables) : value,
      ])
    )
  );
  const unresolved = [
    ...new Set(
      resolved
        .flatMap(step => Object.values(step))
        .filter(value => typeof value === 'string')
        .flatMap(value =>
          [...value.matchAll(/\{\{(?<name>[a-z_]+)\}\}/giu)].map(m => m.groups.name)
        )
    ),
  ];
  if (body.dry_run) {
    return ok({
      success: true,
      dry_run: true,
      resolved_steps: resolved,
      unresolved_variables: unresolved,
    });
  }
  return ok({
    success: true,
    output: resolved.map(step => `> ${step.value || step.pattern || step.type}`).join('\n'),
    errors: [],
    log: `zlogin ${body.machine_name}: ${resolved.length} steps ran`,
  });
};

const templates = ctx => {
  const rows = storeOf(ctx.host).templates;
  return ok({ templates: rows, total: rows.length });
};

const pulledTemplate = ctx => {
  const { body } = ctx;
  if (!body.organization || !body.box_name || !body.version) {
    return refusal(400, 'organization, box_name and version are required');
  }
  return queued({
    ctx,
    operation: 'template_download',
    target: 'system',
    metadata: {
      organization: body.organization,
      box_name: body.box_name,
      version: body.version,
      architecture: body.architecture || 'amd64',
      source_name: body.source_name || 'boxvault',
    },
    message: `Download of ${body.organization}/${body.box_name} ${body.version} queued`,
  });
};

const afterPull = (host, task) => {
  const store = storeOf(host);
  const { organization, box_name: box, version, architecture } = task.metadata;
  if (
    store.templates.some(
      row => row.organization === organization && row.box_name === box && row.version === version
    )
  ) {
    return;
  }
  store.templates = [
    ...store.templates,
    templateRow(host, store.nextTemplate - 1, [
      organization,
      box,
      version,
      architecture,
      'virtualbox',
      800 * MIB,
      0,
    ]),
  ];
  store.nextTemplate += 1;
};

const templateOf = ctx =>
  storeOf(ctx.host).templates.find(row => row.id === ctx.params.template) || null;

const deletedTemplate = ctx => {
  const row = templateOf(ctx);
  if (!row) {
    return refusal(404, 'Template not found');
  }
  return queued({
    ctx,
    operation: 'template_delete',
    target: 'system',
    metadata: { template_id: row.id },
    message: `Delete of ${row.organization}/${row.box_name} ${row.version} queued`,
  });
};

const afterTemplateDelete = (host, task) => {
  const store = storeOf(host);
  store.templates = store.templates.filter(row => row.id !== task.metadata?.template_id);
};

const movedTemplate = ctx => {
  const row = templateOf(ctx);
  if (!row) {
    return refusal(404, 'Template not found');
  }
  if (!ctx.body.target_path) {
    return refusal(400, 'target_path is required');
  }
  return queued({
    ctx,
    operation: 'template_move',
    target: 'system',
    metadata: { template_id: row.id, target_path: ctx.body.target_path },
    message: `Move of ${row.organization}/${row.box_name} ${row.version} queued`,
  });
};

const afterTemplateMove = (host, task) => {
  const row = storeOf(host).templates.find(entry => entry.id === task.metadata?.template_id);
  if (row) {
    row.dataset_path = `${task.metadata.target_path}/${row.organization}/${row.box_name}/${row.version}`;
  }
};

const families = ctx => {
  const rows = storeOf(ctx.host).families;
  return ok({ provisioners: rows, total: rows.length });
};

const importedProvisioner = ctx => {
  const { body } = ctx;
  if (!['folder', 'archive', 'git'].includes(body.source_type)) {
    return refusal(400, 'source_type must be folder, archive or git');
  }
  if (body.source_type === 'git' ? !body.url : !body.path) {
    return refusal(400, body.source_type === 'git' ? 'url is required' : 'path is required');
  }
  return queued({
    ctx,
    operation: 'provisioner_import',
    target: 'system',
    metadata: { name: 'imported', version: '1.0.0', source: body },
    message: 'Provisioner import task created',
  });
};

const afterImport = (host, task) => {
  const store = storeOf(host);
  const { name, version, source } = task.metadata || {};
  const family = store.families.find(row => row.name === name);
  if (family) {
    if (!family.versions.some(row => row.version === version)) {
      family.versions = [
        { version, dir: `${name}/${version}`, name, description: '' },
        ...family.versions,
      ];
    }
    return;
  }
  store.families = [
    ...store.families,
    {
      ...familyRow(name, [version]),
      source: source?.source_type === 'git' ? { ...source } : null,
    },
  ];
};

const familyOf = ctx =>
  storeOf(ctx.host).families.find(row => row.name === decodeURIComponent(ctx.params.name)) || null;

const referencing = (host, name) =>
  name === 'startcloud'
    ? host.machines.map((row, index) => (index % 2 === 0 ? row.name : '')).filter(Boolean)
    : [];

const deletedFamily = ctx => {
  const family = familyOf(ctx);
  if (!family) {
    return refusal(404, 'Provisioner not found');
  }
  const machines = referencing(ctx.host, family.name);
  if (machines.length > 0) {
    return refusal(409, `Provisioner ${family.name} is referenced by ${machines.length} machines`, {
      machines,
    });
  }
  const store = storeOf(ctx.host);
  store.families = store.families.filter(row => row !== family);
  return ok({ success: true, message: `Provisioner ${family.name} deleted` });
};

const deletedVersion = ctx => {
  const family = familyOf(ctx);
  const version = decodeURIComponent(ctx.params.version);
  if (!family || !family.versions.some(row => row.version === version)) {
    return refusal(404, 'Provisioner version not found');
  }
  const machines = referencing(ctx.host, family.name);
  if (machines.length > 0 && family.versions.length === 1) {
    return refusal(409, `Provisioner ${family.name} is referenced by ${machines.length} machines`, {
      machines,
    });
  }
  family.versions = family.versions.filter(row => row.version !== version);
  return ok({ success: true, message: `Provisioner ${family.name} ${version} deleted` });
};

const catalog = ctx => {
  const source = paramOf(ctx, 'source');
  if (source && !CATALOG_SOURCES.some(row => row.name === source)) {
    return refusal(404, 'Catalog source not found');
  }
  return ok(CATALOG);
};

const installedFromCatalog = ctx => {
  const { body } = ctx;
  const family = CATALOG.provisioners.find(row => row.name === body.name);
  if (!family || !family.versions.some(row => row.version === body.version)) {
    return refusal(404, 'Catalog version not found');
  }
  return queued({
    ctx,
    operation: 'provisioner_import',
    target: 'system',
    metadata: { name: body.name, version: body.version, source: { source_type: 'catalog' } },
    message: `Install of ${body.name}/${body.version} queued`,
  });
};

const refreshedFamily = ctx => {
  const family = familyOf(ctx);
  if (!family) {
    return refusal(404, 'Provisioner not found');
  }
  if (family.source?.source_type !== 'git') {
    return refusal(400, 'Provisioner carries no git provenance');
  }
  return queued({
    ctx,
    operation: 'provisioner_import',
    target: 'system',
    metadata: { name: family.name, version: '0.1.28', source: family.source },
    message: `Refresh of ${family.name} from ${family.source.url} queued`,
  });
};

const networkStatus = ctx => {
  const { network } = storeOf(ctx.host);
  if (!network.enabled) {
    return ok({
      enabled: false,
      message: 'The provisioning network is disabled in the agent settings',
    });
  }
  return ok({
    enabled: true,
    ready: network.ready,
    components: network.ready
      ? NETWORK_COMPONENTS
      : { ...NETWORK_COMPONENTS, bridge: { exists: false, up: false } },
    config: NETWORK_CONFIG,
  });
};

const networkTask = (operation, ready) => ctx => {
  if (!storeOf(ctx.host).network.enabled) {
    return refusal(400, 'The provisioning network is disabled');
  }
  return queued({
    ctx,
    operation,
    target: 'system',
    metadata: { ready },
    message: `Provisioning network ${ready ? 'setup' : 'teardown'} queued`,
  });
};

const afterNetwork = (host, task) => {
  storeOf(host).network.ready = Boolean(task.metadata?.ready);
};

const registeredArtifact = ctx => {
  const { body } = ctx;
  if (!body.path || !body.storage_path_id) {
    return refusal(400, 'path and storage_path_id are required');
  }
  const store = storeOf(ctx.host);
  store.registered += 1;
  return ok(
    {
      success: true,
      message: `Registered ${body.path}${body.move ? ' (moved)' : ''}`,
      artifact: { id: `reg-${store.registered}`, filename: String(body.path).split('/').pop() },
    },
    201
  );
};

const hclDownload = ctx => {
  const { body } = ctx;
  if (!body.key_name || !body.filename || !body.role || !body.kind) {
    return refusal(400, 'key_name, filename, role and kind are required');
  }
  return queued({
    ctx,
    operation: 'hcl_download',
    target: 'artifact',
    metadata: { ...body },
    message: `HCL portal download of ${body.filename} queued`,
  });
};

/**
 * The catalog sections of the Manage page on both agents, each route
 * answered as the agents answer it and 404 on a host that lists no
 * token of its section: the packages, their remote search, one
 * package's info and the install and uninstall queued as tasks behind
 * `packages`; the secrets document on a zoneweaver host and a host that
 * lists `provisioner-registry`; the zlogin recipes and their test on a
 * bhyve host that lists `provisioning`; the templates with the pull,
 * the delete and the move queued as tasks behind `templates`; the
 * provisioner families with the import, the deletes refused 409 with
 * the referencing machines, the catalog, its sources, the install and
 * the refresh from source behind `provisioner-registry`; the
 * provisioning network's status, setup and teardown behind
 * `provisioning`; and the register and the HCL portal download of the
 * artifacts behind `artifacts`. Mounted before the create wizard's
 * module so its `GET templates` answers the whole template row.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountCatalog = agentRoute => {
  settles('system_packages_install', settlePackages);
  settles('system_packages_uninstall', settlePackages);
  settles('template_download', afterPull);
  settles('template_delete', afterTemplateDelete);
  settles('template_move', afterTemplateMove);
  settles('provisioner_import', afterImport);
  settles('provisioning_network_setup', afterNetwork);
  settles('provisioning_network_teardown', afterNetwork);
  const registry = ['provisioner-registry'];
  agentRoute('GET', 'system/packages', behind(['packages'], packages));
  agentRoute('GET', 'system/packages/search', behind(['packages'], searchedPackages));
  agentRoute('GET', 'system/packages/info', behind(['packages'], packageInfo));
  agentRoute(
    'POST',
    'system/packages/install',
    behind(['packages'], packageTask('system_packages_install', true))
  );
  agentRoute(
    'POST',
    'system/packages/uninstall',
    behind(['packages'], packageTask('system_packages_uninstall', false))
  );
  agentRoute('GET', 'secrets', secrets);
  agentRoute('GET', 'provisioning/recipes', bhyve(recipes));
  agentRoute('POST', 'provisioning/recipes', bhyve(createdRecipe));
  agentRoute('PUT', 'provisioning/recipes/:recipe', bhyve(updatedRecipe));
  agentRoute('DELETE', 'provisioning/recipes/:recipe', bhyve(deletedRecipe));
  agentRoute('POST', 'provisioning/recipes/:recipe/test', bhyve(testedRecipe));
  agentRoute('GET', 'templates', behind(['templates'], templates));
  agentRoute('POST', 'templates/pull', behind(['templates'], pulledTemplate));
  agentRoute('DELETE', 'templates/:template', behind(['templates'], deletedTemplate));
  agentRoute('POST', 'templates/:template/move', behind(['templates'], movedTemplate));
  agentRoute('GET', 'provisioning/provisioners', behind(registry, families));
  agentRoute('POST', 'provisioning/provisioners/import', behind(registry, importedProvisioner));
  agentRoute('DELETE', 'provisioning/provisioners/:name', behind(registry, deletedFamily));
  agentRoute(
    'DELETE',
    'provisioning/provisioners/:name/versions/:version',
    behind(registry, deletedVersion)
  );
  agentRoute(
    'POST',
    'provisioning/provisioners/:name/refresh-from-source',
    behind(registry, refreshedFamily)
  );
  agentRoute('GET', 'provisioning/catalog', behind(registry, catalog));
  agentRoute(
    'GET',
    'provisioning/catalog/sources',
    behind(registry, () => ok({ sources: CATALOG_SOURCES }))
  );
  agentRoute('POST', 'provisioning/catalog/install', behind(registry, installedFromCatalog));
  agentRoute('GET', 'provisioning/network/status', behind(['provisioning'], networkStatus));
  agentRoute(
    'POST',
    'provisioning/network/setup',
    behind(['provisioning'], networkTask('provisioning_network_setup', true))
  );
  agentRoute(
    'DELETE',
    'provisioning/network/teardown',
    behind(['provisioning'], networkTask('provisioning_network_teardown', false))
  );
  agentRoute('POST', 'artifacts/register', behind(['artifacts'], registeredArtifact));
  agentRoute('POST', 'artifacts/hcl-download', behind(['artifacts'], hclDownload));
};
