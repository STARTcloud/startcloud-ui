const lower = value => String(value ?? '').toLowerCase();

/**
 * The request filters the boot environments open with, hyperweaver-ui's:
 * no name pattern, no detail, no snapshots.
 */
export const BOOT_ENVIRONMENT_PARAMS = { name: '', showDetailed: false, showSnapshots: false };

/**
 * The query of `GET system/boot-environments`, hyperweaver-ui's:
 * `detailed`, `snapshots` and `name`, each only where set.
 *
 * @param {Object} params - The filters, the shape of `BOOT_ENVIRONMENT_PARAMS`
 * @returns {Object} The query
 */
export const bootEnvironmentParams = params => ({
  ...(params.showDetailed ? { detailed: true } : {}),
  ...(params.showSnapshots ? { snapshots: true } : {}),
  ...(params.name ? { name: params.name } : {}),
});

/**
 * The active status of a boot environment, hyperweaver-ui's: `both` while
 * it is active now and on reboot, `now`, `reboot` or `inactive`, each
 * with its short badge, the key of its word and its tone.
 *
 * @param {Object} environment - The environment's row
 * @returns {{ status: string, badge: string, key: string, tone: string }} The status
 */
export const bootEnvironmentStatus = environment => {
  if (environment.is_active_now && environment.is_active_on_reboot) {
    return {
      status: 'both',
      badge: 'NR',
      key: 'host.bootEnvironmentTable.activeReboot',
      tone: 'success',
    };
  }
  if (environment.is_active_now) {
    return {
      status: 'now',
      badge: 'N',
      key: 'host.bootEnvironmentTable.activeNow',
      tone: 'success',
    };
  }
  if (environment.is_active_on_reboot) {
    return {
      status: 'reboot',
      badge: 'R',
      key: 'host.bootEnvironmentTable.activeOnReboot',
      tone: 'info',
    };
  }
  return {
    status: 'inactive',
    badge: '-',
    key: 'host.bootEnvironmentTable.inactive',
    tone: 'secondary',
  };
};

/**
 * Whether a boot environment is mounted, a mountpoint other than a dash.
 *
 * @param {Object} environment - The environment's row
 * @returns {boolean} True when mounted
 */
export const isMounted = environment =>
  Boolean(environment.mountpoint) && environment.mountpoint !== '-';

/**
 * The actions a boot environment's row offers, hyperweaver-ui's:
 * Activate unless it is active on reboot, Mount or Unmount by its
 * mountpoint, and Delete unless it is active now or on reboot.
 *
 * @param {Object} environment - The environment's row
 * @returns {Array<string>} The action words
 */
export const bootEnvironmentActions = environment => {
  const actions = [];
  if (!environment.is_active_on_reboot) {
    actions.push('activate');
  }
  actions.push(isMounted(environment) ? 'unmount' : 'mount');
  if (!environment.is_active_now && !environment.is_active_on_reboot) {
    actions.push('delete');
  }
  return actions;
};

/**
 * The policy tone of a boot environment, hyperweaver-ui's: info for
 * static, warning for dynamic, secondary otherwise.
 *
 * @param {string} policy - The policy
 * @returns {string} The Bootstrap tone
 */
export const policyTone = policy => {
  switch (lower(policy)) {
    case 'static':
      return 'info';
    case 'dynamic':
      return 'warning';
    default:
      return 'secondary';
  }
};

const DATE_PATTERN = /(?:\d{4})-(?:\d{2})-(?:\d{2}) (?:\d{2}):(?:\d{2})/u;

/**
 * A boot environment's creation date as hyperweaver-ui drew it: the
 * locale date where the text parses, the `YYYY-MM-DD HH:MM` part where
 * it carries one, the text otherwise, `N/A` for none.
 *
 * @param {string} dateStr - The `created` text
 * @returns {string} The date
 */
export const formatBootEnvironmentDate = dateStr => {
  if (!dateStr) {
    return 'N/A';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    const match = DATE_PATTERN.exec(dateStr);
    return match ? match[0] : dateStr;
  }
  return date.toLocaleString();
};

const BE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;

/**
 * Whether a name is one `beadm` takes, hyperweaver-ui's rule: a letter or
 * a digit first, then letters, digits, dots, underscores and dashes.
 *
 * @param {string} name - The typed name
 * @returns {boolean} True when it can be sent
 */
export const isValidBootEnvironmentName = name => BE_NAME.test(String(name || '').trim());

/**
 * The form the create dialog opens with, every field empty and no
 * property.
 */
export const BOOT_ENVIRONMENT_FORM = {
  name: '',
  description: '',
  sourceBE: '',
  snapshot: '',
  activate: false,
  zpool: '',
  properties: [],
};

/**
 * Why the create form cannot be sent, the key of the sentence, empty for
 * a form that can: the name is required and must be valid.
 *
 * @param {Object} form - The form, the shape of `BOOT_ENVIRONMENT_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const bootEnvironmentProblem = form => {
  if (!form.name.trim()) {
    return 'host.createBEModal.errors.nameRequired';
  }
  return isValidBootEnvironmentName(form.name) ? '' : 'host.createBEModal.errors.nameInvalid';
};

/**
 * The body of `POST system/boot-environments`, hyperweaver-ui's: the
 * name, and the description, the source, the snapshot, the activation,
 * the pool and the properties each only where given.
 *
 * @param {Object} form - The form, the shape of `BOOT_ENVIRONMENT_FORM`
 * @returns {Object} The body
 */
export const bootEnvironmentCreateBody = form => {
  const properties = form.properties.reduce((acc, property) => {
    if (property.key.trim() && property.value.trim()) {
      acc[property.key.trim()] = property.value.trim();
    }
    return acc;
  }, {});
  return {
    name: form.name.trim(),
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.sourceBE.trim() ? { source_be: form.sourceBE.trim() } : {}),
    ...(form.snapshot.trim() ? { snapshot: form.snapshot.trim() } : {}),
    ...(form.activate ? { activate: true } : {}),
    ...(form.zpool.trim() ? { zpool: form.zpool.trim() } : {}),
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
  };
};

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesBootEnvironment = matcher(row => [
  row.name,
  row.mountpoint,
  row.policy,
  row.space,
  row.created,
]);

const STATUS_ROWS = {
  both: { is_active_now: true, is_active_on_reboot: true },
  now: { is_active_now: true },
  reboot: { is_active_on_reboot: true },
  inactive: {},
};

/**
 * The filter groups of the boot environments table: the active status
 * and the policy.
 */
export const BOOT_ENVIRONMENT_FILTERS = [
  {
    key: 'status',
    labelKey: 'host.bootEnvironmentTable.activeStatus',
    values: row => [bootEnvironmentStatus(row).status],
    order: ['both', 'now', 'reboot', 'inactive'],
    activeClass: 'bg-success',
    labelFor: (value, t) => t(bootEnvironmentStatus(STATUS_ROWS[value]).key),
  },
  {
    key: 'policy',
    labelKey: 'host.bootEnvironmentTable.policy',
    values: row => (row.policy ? [lower(row.policy)] : []),
    activeClass: 'bg-info',
    labelFor: value => value,
  },
];
