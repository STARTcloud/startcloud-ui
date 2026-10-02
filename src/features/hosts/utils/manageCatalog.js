const lower = value => String(value ?? '').toLowerCase();

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

/**
 * A byte count as hyperweaver-ui's installer files and templates drew
 * it, a dash for none, whole bytes and one decimal above them.
 *
 * @param {number} bytes - The byte count
 * @returns {string} The size
 */
export const formatSize = bytes => {
  if (!bytes) {
    return '-';
  }
  const order = Math.min(SIZE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** order).toFixed(order === 0 ? 0 : 1)} ${SIZE_UNITS[order]}`;
};

/**
 * The state a table draws in, the Manage page's rule: loading until the
 * read answered, failed when it did not, rows while any is left,
 * filtered while a query or a filter left none and empty otherwise.
 *
 * @param {Object} options - The read, whether the page filters and the rows
 * @returns {string} `loading`, `failed`, `rows`, `filtered` or `empty`
 */
export const tableStateOf = ({ loaded, failed, filtering, rows }) => {
  if (!loaded) {
    return 'loading';
  }
  if (failed) {
    return 'failed';
  }
  if (rows > 0) {
    return 'rows';
  }
  return filtering ? 'filtered' : 'empty';
};

export const TABLE_STATE_KEYS = {
  loading: 'pages.loading',
  failed: 'hosts.overview.readError',
  filtered: 'pages.noMatches',
};

export const ARTIFACT_TYPES = ['iso', 'image', 'installer', 'fixpack', 'hotfix'];

export const ROLE_TYPES = ['installer', 'fixpack', 'hotfix'];

export const HCL_KINDS = ['installer', 'fixpack', 'hotfix'];

export const ARTIFACT_PAGE_SIZE = 200;

export const LOCATION_FORM = { name: '', path: '', type: 'iso', enabled: true };

export const LOCATION_DELETE_OPTIONS = { recursive: false, remove_db_records: true, force: false };

/**
 * The type of a storage location by its id, empty for an id the list
 * does not hold.
 *
 * @param {Array<Object>} locations - The storage locations
 * @param {string} id - The location's id
 * @returns {string} The type
 */
export const locationType = (locations, id) =>
  locations.find(entry => String(entry.id) === String(id))?.type || '';

/**
 * Whether a storage location stores per role, hyperweaver-ui's rule: the
 * installer family, installers, fixpacks and hotfixes.
 *
 * @param {Array<Object>} locations - The storage locations
 * @param {string} id - The location's id
 * @returns {boolean} True when a role is needed
 */
export const locationNeedsRole = (locations, id) =>
  ROLE_TYPES.includes(locationType(locations, id));

/**
 * Why a target of an upload, a registration or a download cannot be
 * sent, the key of the sentence, empty for a target that can: a location
 * is required and a role on a location of the installer family.
 *
 * @param {Array<Object>} locations - The storage locations
 * @param {string} locationId - The chosen location
 * @param {string} role - The typed role
 * @returns {string} The locale key, or the empty string
 */
export const targetProblem = (locations, locationId, role) => {
  if (!locationId) {
    return 'host.installerFilesModals.pickStorageLocation';
  }
  return locationNeedsRole(locations, locationId) && !role.trim()
    ? 'host.installerFilesModals.roleRequired'
    : '';
};

/**
 * What an artifact's row says of its file, hyperweaver-ui's five states:
 * missing while the file is gone, mismatch while its checksum differs
 * from the one expected, verified while it matched, unhashed while it
 * has no checksum and hashed otherwise; each its badge tone and the key
 * of its tooltip.
 *
 * @param {Object} artifact - The row
 * @returns {{ key: string, tone: string, values: Object }} The state
 */
export const artifactStatusOf = artifact => {
  if (artifact.file_exists === false) {
    return { key: 'missing', tone: 'secondary', values: {} };
  }
  if (artifact.checksum_verified === false) {
    return {
      key: 'mismatch',
      tone: 'danger',
      values: { checksum: artifact.checksum, expected: artifact.expected_sha256 || '' },
    };
  }
  if (artifact.checksum_verified === true) {
    return { key: 'verified', tone: 'success', values: {} };
  }
  return artifact.checksum
    ? { key: 'hashed', tone: 'info', values: {} }
    : { key: 'unhashed', tone: 'warning', values: {} };
};

/**
 * The body of a storage location's create or edit, hyperweaver-ui's: the
 * name and whether it is enabled on an edit, the path and the type with
 * them on a create.
 *
 * @param {Object} form - The form, the shape of `LOCATION_FORM`
 * @param {boolean} editing - Whether an existing location is edited
 * @returns {Object} The body
 */
export const locationBody = (form, editing) =>
  editing
    ? { name: form.name.trim(), enabled: form.enabled }
    : { name: form.name.trim(), path: form.path.trim(), type: form.type, enabled: form.enabled };

/**
 * Why a storage location form cannot be sent: a name, and a path on a
 * create.
 *
 * @param {Object} form - The form
 * @param {boolean} editing - Whether an existing location is edited
 * @returns {string} The locale key, or the empty string
 */
export const locationProblem = (form, editing) =>
  !form.name.trim() || (!editing && !form.path.trim())
    ? 'host.installerFiles.locationNamePathRequired'
    : '';

/**
 * The locations an artifact may move or copy to, hyperweaver-ui's rule:
 * the ones of its own type other than the one it is in.
 *
 * @param {Array<Object>} locations - The storage locations
 * @param {Object} artifact - The row
 * @returns {Array<Object>} The destinations
 */
export const transferOptionsOf = (locations, artifact) =>
  locations.filter(
    location =>
      location.type === artifact.file_type &&
      String(location.id) !== String(artifact.storage_location_id ?? artifact.storage_location?.id)
  );

/**
 * The roles the artifacts name, each once, sorted, the datalist of the
 * role fields.
 *
 * @param {Array<Object>} artifacts - The rows
 * @returns {Array<string>} The roles
 */
export const roleOptionsOf = artifacts =>
  [...new Set(artifacts.map(artifact => artifact.role).filter(Boolean))].sort();

/**
 * The query of `GET artifacts`, hyperweaver-ui's: the page size, the
 * type and the location where chosen.
 *
 * @param {Object} params - `{ type, storage_path_id, limit }`
 * @returns {Object} The query
 */
export const artifactFiltersOf = params => ({
  limit: params.limit,
  offset: 0,
  ...(params.type ? { type: params.type } : {}),
  ...(params.storage_path_id ? { storage_path_id: params.storage_path_id } : {}),
});

/**
 * The body of `POST artifacts/upload/prepare`, hyperweaver-ui's: the
 * file's name and size, the location, whether to overwrite, and the
 * checksum and the role where given.
 *
 * @param {File} file - The file
 * @param {Object} form - `{ locationId, role, checksum, overwrite }`
 * @returns {Object} The body
 */
export const uploadPrepareBody = (file, form) => ({
  filename: file.name,
  size: file.size,
  storage_path_id: form.locationId,
  overwrite_existing: form.overwrite,
  ...(form.checksum.trim() ? { checksum: form.checksum.trim() } : {}),
  ...(form.role.trim() ? { role: form.role.trim() } : {}),
});

/**
 * The body of `POST artifacts/register`: the path, the location, whether
 * to move, and the role where given.
 *
 * @param {Object} form - `{ locationId, role, path, move }`
 * @returns {Object} The body
 */
export const registerBody = form => ({
  path: form.path.trim(),
  storage_path_id: form.locationId,
  move: form.move,
  ...(form.role.trim() ? { role: form.role.trim() } : {}),
});

/**
 * The body of `POST artifacts/download`: the URL, the location, whether
 * to overwrite, and the file name, the checksum, the role and the
 * resource name where given.
 *
 * @param {Object} form - `{ locationId, role, url, filename, checksum, overwrite, resourceName }`
 * @returns {Object} The body
 */
export const downloadBody = form => ({
  url: form.url.trim(),
  storage_path_id: form.locationId,
  overwrite_existing: form.overwrite,
  ...(form.filename.trim() ? { filename: form.filename.trim() } : {}),
  ...(form.checksum.trim() ? { checksum: form.checksum.trim() } : {}),
  ...(form.role.trim() ? { role: form.role.trim() } : {}),
  ...(form.resourceName.trim() ? { resource_name: form.resourceName.trim() } : {}),
});

/**
 * The body of `POST artifacts/hcl-download`, the HCL portal's own
 * shape: the key, the file name, the role and the kind.
 *
 * @param {Object} form - `{ keyName, filename, role, kind }`
 * @returns {Object} The body
 */
export const hclBody = form => ({
  key_name: form.keyName.trim(),
  filename: form.filename.trim(),
  role: form.role.trim(),
  kind: form.kind,
});

/**
 * Why an HCL portal download cannot be queued: the role, the file name
 * and the key are each required.
 *
 * @param {Object} form - `{ keyName, filename, role }`
 * @returns {string} The locale key, or the empty string
 */
export const hclProblem = form =>
  !form.role.trim() || !form.filename.trim() || !form.keyName.trim()
    ? 'host.installerFilesModals.hclFieldsRequired'
    : '';

/**
 * The names of the secrets of one category, hyperweaver-ui's read of
 * `GET secrets`, null while the document could not be read, the dialogs
 * then taking a typed name.
 *
 * @param {Object|null} secrets - The secrets document
 * @param {string} category - `hcl_download_portal_api_keys`, `custom_resource_url` or `git_api_keys`
 * @returns {Array<string>|null} The names
 */
export const secretNamesOf = (secrets, category) =>
  secrets ? (secrets[category] || []).map(entry => entry.name) : null;

export const matchesLocation = matcher(row => [row.name, row.path, row.type]);

export const matchesArtifact = matcher(row => [
  row.filename,
  row.file_type,
  row.role,
  row.version,
  row.storage_location?.name,
]);

export const PACKAGE_PUBLISHERS = ['omnios', 'extra.omnios', 'ooce'];

export const PACKAGE_STATUSES = ['installed', 'frozen', 'manual'];

export const PACKAGE_PARAMS = { showAll: false, searchQuery: '' };

/**
 * The words a package's status reads as, hyperweaver-ui's filter: it is
 * installed, frozen and installed by hand, each while it is.
 *
 * @param {Object} pkg - The package row
 * @returns {Array<string>} The words
 */
export const packageStatuses = pkg => [
  ...(pkg.installed ? ['installed'] : []),
  ...(pkg.frozen ? ['frozen'] : []),
  ...(pkg.installed && pkg.manually_installed ? ['manual'] : []),
];

/**
 * The badge a package draws, hyperweaver-ui's: manual for one installed
 * by hand, installed, frozen, available in search mode and not installed
 * otherwise.
 *
 * @param {Object} pkg - The package row
 * @param {boolean} searchMode - Whether the rows are search results
 * @returns {{ key: string, tone: string }} The badge
 */
export const packageBadgeOf = (pkg, searchMode) => {
  if (pkg.installed && pkg.manually_installed) {
    return { key: 'manual', tone: 'warning' };
  }
  if (pkg.installed) {
    return { key: 'installed', tone: 'success' };
  }
  if (pkg.frozen) {
    return { key: 'frozen', tone: 'info' };
  }
  return { key: searchMode ? 'available' : 'notInstalled', tone: 'secondary' };
};

/**
 * The action a package's row offers, hyperweaver-ui's: uninstall for an
 * installed package that is not frozen, install for one not installed,
 * none for a frozen installed one.
 *
 * @param {Object} pkg - The package row
 * @returns {string} `install`, `uninstall` or the empty string
 */
export const packageActionOf = pkg => {
  if (pkg.installed) {
    return pkg.frozen ? '' : 'uninstall';
  }
  return 'install';
};

/**
 * A package's size as hyperweaver-ui drew it: a text that names its unit
 * as it is, a bare number of bytes converted, anything else as it is.
 *
 * @param {*} size - The row's `size`
 * @returns {string} The size
 */
export const formatPackageSize = size => {
  if (!size) {
    return '';
  }
  const text = String(size);
  if (text.includes('GB') || text.includes('MB') || text.includes('KB')) {
    return text;
  }
  const bytes = Number.parseInt(text, 10);
  if (Number.isNaN(bytes)) {
    return text;
  }
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  }
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(2)} KB` : `${bytes} B`;
};

/**
 * The rows of a remote package search as hyperweaver-ui shaped them: the
 * package names of the `pkg.fmri` hits, each once, as rows not installed
 * whose publisher reads Available and whose version reads Latest.
 *
 * @param {Array<Object>} results - The `results` of `GET system/packages/search`
 * @returns {Array<Object>} The rows
 */
export const searchRowsOf = results => {
  const names = [
    ...new Set(
      (Array.isArray(results) ? results : [])
        .filter(item => item.index === 'pkg.fmri')
        .map(item => String(item.package).split('@')[0].replace('pkg:/', ''))
    ),
  ];
  return names.map(name => ({
    name,
    publisher: 'Available',
    version: 'Latest',
    installed: false,
    frozen: false,
    manually_installed: false,
    flags: 'a--',
    remote: true,
  }));
};

/**
 * The body of a package install or uninstall, hyperweaver-ui's: the one
 * package, whether it is a dry run, whether licenses are accepted and
 * the boot environment's name.
 *
 * @param {string} name - The package
 * @param {Object} options - `{ dryRun, acceptLicenses, beName }`
 * @returns {Object} The body
 */
export const packageActionBody = (name, options) => ({
  packages: [name],
  dry_run: Boolean(options.dryRun),
  accept_licenses: Boolean(options.acceptLicenses),
  be_name: options.beName || '',
});

/**
 * A package's detail as label and value pairs, hyperweaver-ui's parse: a
 * text split at its lines and each line at its first colon, an object at
 * its members with the keys spelled out.
 *
 * @param {string|Object|null} details - The answer of `GET system/packages/info`
 * @returns {Array<{ label: string, value: string }>} The pairs
 */
export const packageDetailRows = details => {
  if (!details) {
    return [];
  }
  if (typeof details === 'string') {
    return details
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const colon = line.indexOf(':');
        return colon > 0
          ? { label: line.substring(0, colon).trim(), value: line.substring(colon + 1).trim() }
          : { label: 'Info', value: line.trim() };
      });
  }
  return Object.entries(details).map(([key, value]) => ({
    label: key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
  }));
};

export const matchesPackage = matcher(row => [row.name, row.publisher, row.version]);

let rowKeys = 0;

/**
 * A fresh key for a row of the step and variable editors.
 *
 * @returns {string} The key
 */
export const newRowKey = () => {
  rowKeys += 1;
  return `row-${rowKeys}`;
};

const optionalText = (member, value) => (value.trim() ? { [member]: value.trim() } : {});

export const OS_FAMILIES = ['linux', 'solaris', 'windows'];

export const BRANDS = ['bhyve', 'lx', 'kvm'];

export const STEP_TYPES = ['wait', 'send', 'command', 'template', 'delay'];

const STEP_FIELDS = {
  wait: ['pattern'],
  send: ['value'],
  command: ['value'],
  template: ['content', 'dest'],
  delay: ['seconds'],
};

export const RECIPE_PARAMS = { os_family: '', brand: '' };

/**
 * An empty step row, a command.
 *
 * @returns {Object} The row
 */
export const emptyStepRow = () => ({
  key: newRowKey(),
  type: 'command',
  pattern: '',
  value: '',
  content: '',
  dest: '',
  seconds: '',
});

/**
 * The step rows of a recipe's steps, hyperweaver-ui's seed: every field
 * as text, a type outside the five read as a command.
 *
 * @param {Array<Object>} steps - The recipe's `steps`
 * @returns {Array<Object>} The rows
 */
export const seedStepRows = steps =>
  (Array.isArray(steps) ? steps : []).map(step => ({
    key: newRowKey(),
    type: STEP_TYPES.includes(step.type) ? step.type : 'command',
    pattern: step.pattern ?? '',
    value: step.value ?? '',
    content: step.content ?? '',
    dest: step.dest ?? '',
    seconds: step.seconds === undefined || step.seconds === null ? '' : String(step.seconds),
  }));

/**
 * The variable rows of a recipe's variables map.
 *
 * @param {Object} variables - The recipe's `variables`
 * @returns {Array<Object>} The rows
 */
export const seedVariableRows = variables =>
  Object.entries(variables || {}).map(([name, value]) => ({
    key: newRowKey(),
    name,
    value: String(value),
  }));

/**
 * The steps a recipe body carries, hyperweaver-ui's build: each row its
 * type and the fields of that type that hold a value, the seconds as a
 * number.
 *
 * @param {Array<Object>} rows - The step rows
 * @returns {Array<Object>} The steps
 */
export const buildSteps = rows =>
  rows.map(row => {
    const entry = { type: row.type };
    STEP_FIELDS[row.type].forEach(field => {
      const value = String(row[field] ?? '').trim();
      if (value !== '') {
        entry[field] = field === 'seconds' ? Number(value) : value;
      }
    });
    return entry;
  });

/**
 * The variables map of the variable rows, the rows with a name.
 *
 * @param {Array<Object>} rows - The variable rows
 * @returns {Object} The map
 */
export const buildVariables = rows =>
  Object.fromEntries(
    rows.filter(row => row.name.trim() !== '').map(row => [row.name.trim(), row.value])
  );

/**
 * The form the recipe dialog opens with, hyperweaver-ui's: the recipe's
 * members, or the defaults for a new one.
 *
 * @param {Object|null} recipe - The recipe row, or null for a new one
 * @returns {Object} The form
 */
export const recipeFormOf = recipe => ({
  name: recipe?.name ?? '',
  description: recipe?.description ?? '',
  osFamily: recipe?.os_family ?? 'linux',
  brand: recipe?.brand ?? 'bhyve',
  isDefault: recipe?.is_default === true,
  bootString: recipe?.boot_string ?? '',
  loginPrompt: recipe?.login_prompt ?? '',
  shellPrompt: recipe?.shell_prompt ?? '',
  timeoutSeconds:
    recipe?.timeout_seconds === undefined || recipe?.timeout_seconds === null
      ? ''
      : String(recipe.timeout_seconds),
});

/**
 * Why a recipe cannot be saved: a name and at least one step.
 *
 * @param {Object} form - The form of `recipeFormOf`
 * @param {Array<Object>} stepRows - The step rows
 * @returns {string} The locale key, or the empty string
 */
export const recipeProblem = (form, stepRows) => {
  if (!form.name.trim()) {
    return 'host.recipeEditModal.nameRequired';
  }
  return stepRows.length === 0 ? 'host.recipeEditModal.stepRequired' : '';
};

/**
 * The body of a recipe's create or update, hyperweaver-ui's: the name,
 * the family, the brand, whether it is the default, the steps and the
 * variables, and the description, the prompts and the timeout where
 * given.
 *
 * @param {Object} form - The form of `recipeFormOf`
 * @param {Array<Object>} stepRows - The step rows
 * @param {Array<Object>} variableRows - The variable rows
 * @returns {Object} The body
 */
export const recipeBody = (form, stepRows, variableRows) => ({
  name: form.name.trim(),
  os_family: form.osFamily,
  brand: form.brand,
  is_default: form.isDefault,
  steps: buildSteps(stepRows),
  variables: buildVariables(variableRows),
  ...optionalText('description', form.description),
  ...optionalText('boot_string', form.bootString),
  ...optionalText('login_prompt', form.loginPrompt),
  ...optionalText('shell_prompt', form.shellPrompt),
  ...(form.timeoutSeconds !== '' ? { timeout_seconds: Number(form.timeoutSeconds) } : {}),
});

/**
 * The body of `POST provisioning/recipes/{id}/test`: the machine, the
 * variables while any was typed and `dry_run` on a dry run.
 *
 * @param {Object} options - The machine, the variable rows and whether it is a dry run
 * @returns {Object} The body
 */
export const recipeTestBody = ({ machineName, variableRows, dryRun }) => {
  const variables = buildVariables(variableRows);
  return {
    machine_name: machineName,
    ...(Object.keys(variables).length > 0 ? { variables } : {}),
    ...(dryRun ? { dry_run: true } : {}),
  };
};

/**
 * The recipes an answer carries, a bare list or one under `recipes`.
 *
 * @param {*} answer - The answer of `GET provisioning/recipes`
 * @returns {Array<Object>} The rows
 */
export const recipesOf = answer => {
  if (Array.isArray(answer)) {
    return answer;
  }
  return Array.isArray(answer?.recipes) ? answer.recipes : [];
};

export const matchesRecipe = matcher(row => [row.name, row.os_family, row.brand, row.description]);

export const SOURCE_FORM = {
  name: '',
  displayName: '',
  url: '',
  isDefault: false,
  auth_token: '',
  ca_file: '',
};

const SOURCE_ID = /^[a-z0-9_]+$/u;

export const PULL_FORM = { organization: '', boxName: '', version: '', architecture: '' };

export const EXPORT_FORM = { machine: '', filename: '' };

export const TEMPLATE_PUBLISH_FORM = {
  machine: '',
  source: '',
  organization: '',
  boxName: '',
  version: '',
  description: '',
  architecture: '',
};

/**
 * The key of a template's row, hyperweaver-ui's: the organization, the
 * box, the version and the architecture.
 *
 * @param {Object} template - The row
 * @returns {string} The key
 */
export const templateKey = template =>
  `${template.organization}/${template.box_name}/${template.version}/${template.architecture}`;

/**
 * A template's name as hyperweaver-ui drew it in a dialog's title.
 *
 * @param {Object} template - The row
 * @returns {string} The name
 */
export const templateLabel = template =>
  `${template.organization}/${template.box_name} ${template.version}`;

/**
 * The body of `POST templates/pull`: the organization, the box and the
 * version, the architecture and the source where given.
 *
 * @param {Object} form - The form, the shape of `PULL_FORM`
 * @param {string} source - The registry's name
 * @returns {Object} The body
 */
export const pullBody = (form, source) => ({
  organization: form.organization.trim(),
  box_name: form.boxName.trim(),
  version: form.version.trim(),
  ...optionalText('architecture', form.architecture),
  ...(source ? { source_name: source } : {}),
});

/**
 * Why a pull cannot be queued: the organization, the box and a specific
 * version.
 *
 * @param {Object} form - The form, the shape of `PULL_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const pullProblem = form =>
  !form.organization.trim() || !form.boxName.trim() || !form.version.trim()
    ? 'hosts.manage.templates.pullRequired'
    : '';

/**
 * The pull form filled from one row of the registry's catalog, its first
 * version and architecture chosen.
 *
 * @param {Object} entry - A row of `flattenBoxCatalog`
 * @returns {Object} The form
 */
export const pullFormOf = entry => ({
  organization: entry.organization,
  boxName: entry.boxName,
  version: entry.versions[0] || '',
  architecture: entry.architectures[0] || '',
});

/**
 * The body of `POST templates/publish` of the Templates section, the
 * machine's current state: the machine, the source, the organization,
 * the box and the version, the description and the architecture where
 * given.
 *
 * @param {Object} form - The form, the shape of `TEMPLATE_PUBLISH_FORM`
 * @returns {Object} The body
 */
export const templatePublishBody = form => ({
  machine_name: form.machine,
  source_name: form.source,
  organization: form.organization.trim(),
  box_name: form.boxName.trim(),
  version: form.version.trim(),
  ...optionalText('description', form.description),
  ...optionalText('architecture', form.architecture),
});

/**
 * Why a publish cannot be queued: a machine, a source and the
 * organization, box and version.
 *
 * @param {Object} form - The form, the shape of `TEMPLATE_PUBLISH_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const templatePublishProblem = form =>
  !form.machine ||
  !form.source ||
  !form.organization.trim() ||
  !form.boxName.trim() ||
  !form.version.trim()
    ? 'hosts.manage.templates.publishRequired'
    : '';

/**
 * Whether a machine's row can be exported, hyperweaver-ui's pre-check:
 * one that does not run.
 *
 * @param {Object} row - The machine's row
 * @returns {boolean} True while the machine is not running
 */
export const exportable = row => String(row.status || '').toLowerCase() !== 'running';

/**
 * The merge patch of `PUT config/storage` over the registries map,
 * `/template_sources/sources`, the given entries under their ids.
 *
 * @param {Object<string, Object|null>} entries - The entries by id, null for one removed
 * @returns {Object} The patch
 */
export const sourcesPatch = entries => ({ template_sources: { sources: entries } });

const undefaulted = (sources, keptId) =>
  Object.fromEntries(
    sources
      .filter(source => source.default === true && source.name !== keptId)
      .map(source => [source.name, { default: false }])
  );

/**
 * The patch that adds or edits one registry, the agent's entry keys:
 * `display_name`, `url` and `default` from the form, the API key and the
 * CA file where typed, a blank one leaving the stored value untouched;
 * an edit under a new id removes the old entry with `null`; while the
 * form makes it the default every other default entry is unset.
 *
 * @param {Array<Object>} sources - The sources of `GET templates/sources`
 * @param {Object} form - The form, the shape of `SOURCE_FORM`
 * @param {string} editing - The id of the source edited, empty for a new one
 * @returns {Object} The patch
 */
export const sourceEntryPatch = (sources, form, editing) => {
  const id = form.name.trim();
  const entry = {
    display_name: form.displayName.trim(),
    url: form.url.trim(),
    default: form.isDefault,
    ...optionalText('auth_token', form.auth_token),
    ...optionalText('ca_file', form.ca_file),
  };
  return sourcesPatch({
    ...(form.isDefault ? undefaulted(sources, id) : {}),
    ...(editing && editing !== id ? { [editing]: null } : {}),
    [id]: entry,
  });
};

/**
 * The patch that enables a disabled registry or disables an enabled one.
 *
 * @param {Object} source - The source toggled
 * @returns {Object} The patch
 */
export const sourceTogglePatch = source =>
  sourcesPatch({ [source.name]: { enabled: source.enabled === false } });

/**
 * The patch that makes one registry the default and unsets every other
 * that is.
 *
 * @param {Array<Object>} sources - The sources of `GET templates/sources`
 * @param {Object} source - The source made default
 * @returns {Object} The patch
 */
export const sourceDefaultPatch = (sources, source) =>
  sourcesPatch({ ...undefaulted(sources, source.name), [source.name]: { default: true } });

/**
 * The patch that removes one registry, `null` under its id.
 *
 * @param {Object} source - The source removed
 * @returns {Object} The patch
 */
export const sourceRemovePatch = source => sourcesPatch({ [source.name]: null });

/**
 * Why a source cannot be saved: an id, a display name and a URL, the id
 * lowercase letters, digits and underscores alone, the agent's key rule.
 *
 * @param {Object} form - The form, the shape of `SOURCE_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const sourceProblem = form => {
  if (!form.name.trim() || !form.url.trim()) {
    return 'hosts.manage.templates.sourceRequired';
  }
  if (!SOURCE_ID.test(form.name.trim())) {
    return 'hosts.manage.templates.sourceIdInvalid';
  }
  return form.displayName.trim() ? '' : 'hosts.manage.templates.sourceDisplayNameRequired';
};

export const matchesTemplate = matcher(row => [
  row.organization,
  row.box_name,
  row.version,
  row.architecture,
  row.provider,
]);

export const IMPORT_SOURCES = ['folder', 'archive', 'git'];

export const IMPORT_FORM = { sourceType: 'folder', path: '', url: '', branch: '', tokenName: '' };

/**
 * Whether the first dotted version is newer than the second,
 * hyperweaver-ui's compare, segment by segment, numbers as numbers and
 * anything else as text.
 *
 * @param {string} a - A version
 * @param {string} b - Another version
 * @returns {boolean} True while `a` is strictly newer
 */
export const versionNewer = (a, b) => {
  const partsA = String(a).split('.');
  const partsB = String(b).split('.');
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const segA = partsA[index] ?? '0';
    const segB = partsB[index] ?? '0';
    const numA = Number(segA);
    const numB = Number(segB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      if (segA !== segB) {
        return segA > segB;
      }
    } else if (numA !== numB) {
      return numA > numB;
    }
  }
  return false;
};

/**
 * The newest version of every family of the catalog, the catalog
 * serving them newest first; an empty map for an answer that carries
 * no family.
 *
 * @param {Object|null} catalog - The answer of `GET provisioning/catalog`
 * @returns {Object<string, string>} The newest version by family
 */
export const catalogNewestOf = catalog =>
  Object.fromEntries(
    (Array.isArray(catalog?.provisioners) ? catalog.provisioners : [])
      .filter(family => Array.isArray(family.versions) && family.versions.length > 0)
      .map(family => [family.name, family.versions[0].version])
  );

/**
 * The version a family can update to, hyperweaver-ui's rule: the
 * catalog's newest while it is strictly newer than every installed
 * version and none installed is it; null otherwise.
 *
 * @param {Object} family - The family row
 * @param {Object<string, string>} newest - The map of `catalogNewestOf`
 * @returns {string|null} The version
 */
export const updateFor = (family, newest) => {
  const version = newest[family.name];
  if (!version) {
    return null;
  }
  const installed = (family.versions || []).map(entry => entry.version);
  if (installed.includes(version)) {
    return null;
  }
  return installed.every(entry => versionNewer(version, entry)) ? version : null;
};

/**
 * The keys of every installed version, `family/version`.
 *
 * @param {Array<Object>} families - The family rows
 * @returns {Set<string>} The keys
 */
export const installedKeysOf = families =>
  new Set(
    families.flatMap(family =>
      (family.versions || []).map(version => `${family.name}/${version.version}`)
    )
  );

/**
 * The body of `POST provisioning/provisioners/import`, hyperweaver-ui's:
 * the source type, the URL with the branch and the key for git, the path
 * otherwise.
 *
 * @param {Object} form - The form, the shape of `IMPORT_FORM`
 * @returns {Object} The body
 */
export const importBody = form => ({
  source_type: form.sourceType,
  ...(form.sourceType === 'git'
    ? {
        url: form.url.trim(),
        ...optionalText('branch', form.branch),
        ...optionalText('token_name', form.tokenName),
      }
    : { path: form.path.trim() }),
});

/**
 * Why an import cannot be queued: a URL for git and a path otherwise.
 *
 * @param {Object} form - The form, the shape of `IMPORT_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const importProblem = form => {
  if (form.sourceType === 'git') {
    return form.url.trim() ? '' : 'host.provisionerManagement.repoUrlRequired';
  }
  return form.path.trim() ? '' : 'host.provisionerManagement.pathRequired';
};

/**
 * The machines a refused delete names, the 409 answer's `machines`.
 *
 * @param {Object|null} error - The failure of the request
 * @returns {Array<string>} The machine names
 */
export const referencingMachinesOf = error =>
  error?.status === 409 && Array.isArray(error?.data?.machines) ? error.data.machines : [];

export const matchesProvisioner = matcher(row => [
  row.name,
  row.metadata?.label,
  row.description,
  ...(row.versions || []).map(version => version.version),
]);

/**
 * The health of one component of the provisioning network, hyperweaver-ui's
 * rule: a boolean as it is, an object by every boolean it carries, unknown
 * for anything else.
 *
 * @param {*} value - The component's value
 * @returns {string} `ok`, `bad` or `unknown`
 */
export const componentHealth = value => {
  if (typeof value === 'boolean') {
    return value ? 'ok' : 'bad';
  }
  if (value && typeof value === 'object') {
    const flags = Object.values(value).filter(sub => typeof sub === 'boolean');
    if (flags.length === 0) {
      return 'unknown';
    }
    return flags.every(Boolean) ? 'ok' : 'bad';
  }
  return 'unknown';
};

/**
 * The detail of one component as a line, its members joined by a
 * middle dot, a boolean as the key of its word.
 *
 * @param {*} value - The component's value
 * @returns {{ key: string }|{ text: string }} The word's key or the text
 */
export const componentDetail = value => {
  if (typeof value === 'boolean') {
    return {
      key: value ? 'host.provisioningNetworkPanel.ok' : 'host.provisioningNetworkPanel.missing',
    };
  }
  if (value && typeof value === 'object') {
    return {
      text: Object.entries(value)
        .map(([key, sub]) => `${key}: ${String(sub)}`)
        .join(' · '),
    };
  }
  return { text: String(value) };
};

export const HEALTH_TONES = { ok: 'success', bad: 'danger', unknown: 'light' };
