const lower = value => String(value ?? '').toLowerCase();

/**
 * The request filters the repositories open with, hyperweaver-ui's: no
 * publisher pattern, every repository, every type.
 */
export const REPOSITORY_PARAMS = { publisher: '', enabledOnly: false, type: '' };

/**
 * The query of `GET system/repositories`, hyperweaver-ui's:
 * `enabled_only` and `publisher`, each only where set; the type is
 * narrowed on the client.
 *
 * @param {Object} params - The filters, the shape of `REPOSITORY_PARAMS`
 * @returns {Object} The query
 */
export const repositoryParams = params => ({
  ...(params.enabledOnly ? { enabled_only: true } : {}),
  ...(params.publisher ? { publisher: params.publisher } : {}),
});

/**
 * Whether a repository is enabled, every value but false.
 *
 * @param {Object} repository - The repository's row
 * @returns {boolean} True unless disabled
 */
export const isEnabled = repository => repository.enabled !== false;

/**
 * The status of a repository, hyperweaver-ui's: online, disabled or
 * offline, each with the key of its word and its tone.
 *
 * @param {Object} repository - The repository's row
 * @returns {{ status: string, key: string, tone: string }} The status
 */
export const repositoryStatus = repository => {
  if (repository.status === 'online' && isEnabled(repository)) {
    return { status: 'online', key: 'host.repositoryTable.online', tone: 'success' };
  }
  if (repository.status === 'online') {
    return { status: 'disabled', key: 'host.repositoryTable.disabled', tone: 'warning' };
  }
  return { status: 'offline', key: 'host.repositoryTable.offline', tone: 'danger' };
};

/**
 * The type of a repository, origin or mirror, hyperweaver-ui's: the key
 * of its word and its tone, the type itself for any other word.
 *
 * @param {string} type - The type
 * @returns {{ key: string, text: string, tone: string }} The type
 */
export const repositoryType = type => {
  switch (lower(type)) {
    case 'origin':
      return { key: 'host.repositoryTable.origin', text: '', tone: 'primary' };
    case 'mirror':
      return { key: 'host.repositoryTable.mirror', text: '', tone: 'info' };
    default:
      return {
        key: type ? '' : 'host.repositoryTable.unknown',
        text: type || '',
        tone: 'secondary',
      };
  }
};

/**
 * Whether a repository goes through a proxy, `T` or true.
 *
 * @param {*} proxy - The row's `proxy`
 * @returns {boolean} True when it does
 */
export const usesProxy = proxy => proxy === 'T' || proxy === true;

const LOCATION_LENGTH = 50;

/**
 * A repository's location cut to hyperweaver-ui's fifty characters,
 * `N/A` for none.
 *
 * @param {string} location - The location
 * @returns {string} The text
 */
export const formatLocation = location => {
  if (!location) {
    return 'N/A';
  }
  return location.length > LOCATION_LENGTH
    ? `${location.substring(0, LOCATION_LENGTH)}...`
    : location;
};

/**
 * The key of one repository row, its publisher and its type.
 *
 * @param {Object} repository - The repository's row
 * @returns {string} The key
 */
export const repositoryKey = repository => `${repository.name}-${repository.type}`;

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesRepository = matcher(row => [row.name, row.type, row.status, row.location]);

/**
 * The filter groups of the repositories table: the type and the status.
 */
export const REPOSITORY_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.repositoryTable.type',
    values: row => (row.type ? [lower(row.type)] : []),
    order: ['origin', 'mirror'],
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
  {
    key: 'status',
    labelKey: 'host.repositoryTable.status',
    values: row => [repositoryStatus(row).status],
    order: ['online', 'disabled', 'offline'],
    activeClass: 'bg-success',
    labelFor: value => value,
  },
];

/**
 * The form the add dialog opens with, hyperweaver-ui's: one empty
 * mirror, enabled, not sticky, not first.
 */
export const ADD_REPOSITORY_FORM = {
  name: '',
  origin: '',
  mirrors: [{ id: 0, url: '' }],
  enabled: true,
  sticky: false,
  searchFirst: false,
  searchBefore: '',
  searchAfter: '',
  sslCert: '',
  sslKey: '',
  proxy: '',
};

const optional = (member, value) => (value.trim() ? { [member]: value.trim() } : {});

/**
 * The body of `POST system/repositories`, hyperweaver-ui's: the name,
 * the origin, the mirrors that hold a URL, the three switches, and the
 * search order, the certificate, the key and the proxy each only where
 * given.
 *
 * @param {Object} form - The form, the shape of `ADD_REPOSITORY_FORM`
 * @returns {Object} The body
 */
export const addRepositoryBody = form => ({
  name: form.name.trim(),
  origin: form.origin.trim(),
  mirrors: form.mirrors.map(mirror => mirror.url.trim()).filter(Boolean),
  enabled: form.enabled,
  sticky: form.sticky,
  search_first: form.searchFirst,
  ...optional('search_before', form.searchBefore),
  ...optional('search_after', form.searchAfter),
  ...optional('ssl_cert', form.sslCert),
  ...optional('ssl_key', form.sslKey),
  ...optional('proxy', form.proxy),
});

/**
 * Why the add form cannot be sent, the key of the sentence, empty for a
 * form that can: the name and the origin are required.
 *
 * @param {Object} form - The form, the shape of `ADD_REPOSITORY_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const addRepositoryProblem = form =>
  form.name.trim() && form.origin.trim() ? '' : 'host.addRepositoryModal.errors.nameOriginRequired';

const entry = () => [{ id: 0, value: '' }];

/**
 * The form the edit dialog opens with for one repository,
 * hyperweaver-ui's: one empty entry in each of the four URL lists, the
 * switches and the search order from the row.
 *
 * @param {Object} repository - The repository's row
 * @returns {Object} The form
 */
export const editRepositoryFormOf = repository => ({
  originsToAdd: entry(),
  originsToRemove: entry(),
  mirrorsToAdd: entry(),
  mirrorsToRemove: entry(),
  enabled: repository.enabled !== false,
  sticky: repository.sticky || false,
  searchFirst: repository.search_first || false,
  searchBefore: repository.search_before || '',
  searchAfter: repository.search_after || '',
  sslCert: '',
  sslKey: '',
  proxy: repository.proxy || '',
  refresh: false,
});

const values = entries => entries.map(item => item.value.trim()).filter(Boolean);

const list = (member, entries) => {
  const listed = values(entries);
  return listed.length > 0 ? { [member]: listed } : {};
};

/**
 * The body of `PUT system/repositories/{name}`, hyperweaver-ui's: the
 * four switches, the URLs to add and to remove where any, and the search
 * order, the certificate, the key and the proxy each only where given.
 *
 * @param {Object} form - The form of `editRepositoryFormOf`
 * @returns {Object} The body
 */
export const editRepositoryBody = form => ({
  enabled: form.enabled,
  sticky: form.sticky,
  search_first: form.searchFirst,
  refresh: form.refresh,
  ...list('origins_to_add', form.originsToAdd),
  ...list('origins_to_remove', form.originsToRemove),
  ...list('mirrors_to_add', form.mirrorsToAdd),
  ...list('mirrors_to_remove', form.mirrorsToRemove),
  ...optional('search_before', form.searchBefore),
  ...optional('search_after', form.searchAfter),
  ...optional('ssl_cert', form.sslCert),
  ...optional('ssl_key', form.sslKey),
  ...optional('proxy', form.proxy),
});
