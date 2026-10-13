export const FILE_KINDS = ['installer', 'fixpack', 'hotfix'];

export const FILE_SOURCES_WORDS = ['boxvault', 'hcl', 'custom'];

const REST_API_SUFFIX = /_R[0-9.]+$/u;

const SHORT_HASH = 8;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The bare name of a role, the part after its last dot.
 *
 * @param {string} name - The role name, dotted or bare
 * @returns {string} The bare name
 */
export const bareRoleName = name =>
  String(name || '')
    .split('.')
    .pop();

/**
 * The file kinds a manifest role declares under `files`, in the fixed
 * order installer, fixpack, hotfix.
 *
 * @param {Object|null} manifestRole - The manifest's role
 * @returns {Array<string>} The kinds
 */
export const fileKindsOf = manifestRole =>
  FILE_KINDS.filter(kind => isObject(manifestRole?.files) && isObject(manifestRole.files[kind]));

/**
 * The artifact rows of one role and one kind, the rows whose `role` is
 * the role's `installer_dir` and whose `file_type` is the kind, the ones
 * on the host first and the known-but-missing ones after them.
 *
 * @param {Array<Object>|null} artifacts - The host's artifact rows
 * @param {Object|null} manifestRole - The manifest's role
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @returns {Array<Object>} The rows
 */
export const roleArtifactsOf = (artifacts, manifestRole, kind) => {
  const dir = manifestRole?.installer_dir;
  if (!dir || !Array.isArray(artifacts)) {
    return [];
  }
  const rows = artifacts.filter(row => row && row.role === dir && row.file_type === kind);
  return [
    ...rows.filter(row => row.file_exists !== false),
    ...rows.filter(row => row.file_exists === false),
  ];
};

/**
 * Whether an artifact row is on the host.
 *
 * @param {Object|null} row - The artifact row
 * @returns {boolean} True while the file is there
 */
export const artifactPresent = row => Boolean(row) && row.file_exists !== false;

/**
 * The source a missing artifact can be fetched from, `boxvault`, `hcl` or
 * `custom`, the empty string for a row that names none.
 *
 * @param {Object|null} row - The artifact row
 * @returns {string} The source word
 */
export const artifactSourceOf = row => (FILE_SOURCES_WORDS.includes(row?.source) ? row.source : '');

/**
 * The file an installer picker opens on: the first row on the host, the
 * first known row otherwise, none for a fixpack or a hotfix.
 *
 * @param {Array<Object>} rows - The rows of `roleArtifactsOf`
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @returns {Object|null} The row
 */
export const defaultPickOf = (rows, kind) => {
  if (kind !== 'installer') {
    return null;
  }
  return rows.find(artifactPresent) || rows[0] || null;
};

/**
 * The sha256 an artifact row is known by, the recorded expectation first
 * and the file's own checksum otherwise.
 *
 * @param {Object|null} row - The artifact row
 * @returns {string} The hash
 */
export const artifactHashOf = row => row?.expected_sha256 || row?.checksum || '';

/**
 * A hash shortened for a line beside a picker, its first eight and last
 * six characters.
 *
 * @param {string} hash - The hash
 * @returns {string} The short form, empty for none
 */
export const shortHashOf = hash => {
  const text = String(hash || '');
  return text.length > SHORT_HASH * 2 ? `${text.slice(0, SHORT_HASH)}…${text.slice(-6)}` : text;
};

/**
 * A row's version as structured members, `major`, `minor`, `patch`,
 * `fix_pack` and `full_version`, from the structured version the agent
 * answers or from the one string it answers otherwise, split at its dots.
 *
 * @param {Object|null} row - The artifact row
 * @returns {{ major: string, minor: string, patch: string, fix_pack: string, full_version: string }} The version
 */
export const artifactVersionOf = row => {
  const version = row?.version;
  if (isObject(version)) {
    return {
      major: String(version.major ?? ''),
      minor: String(version.minor ?? ''),
      patch: String(version.patch ?? ''),
      fix_pack: String(version.fix_pack ?? ''),
      full_version: String(version.full_version ?? ''),
    };
  }
  const text = String(version ?? '');
  const [major = '', minor = '', patch = ''] = text.split('_')[0].split('.');
  return { major, minor, patch, fix_pack: '', full_version: text };
};

/**
 * A version with the Domino REST API's `_R<release>` suffix taken off,
 * the number the role's own variable takes.
 *
 * @param {string} version - The version
 * @returns {string} The version without the suffix
 */
export const withoutRestApiSuffix = version => String(version || '').replace(REST_API_SUFFIX, '');

/**
 * The text a picker draws beside its pick, the version and the short hash.
 *
 * @param {Object|null} row - The artifact row
 * @returns {{ version: string, hash: string }} The texts
 */
export const pickTextOf = row => ({
  version: artifactVersionOf(row).full_version,
  hash: shortHashOf(artifactHashOf(row)),
});

/**
 * The `files` members of a role row for one kind: the file name, its
 * hash and its version under the agent's own names, `installer`,
 * `installer_hash` and `installer_version`, `fixpack_*` and `hotfix_*`;
 * cleared members for no pick.
 *
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @param {Object|null} row - The artifact row picked
 * @returns {Object} The members
 */
export const roleFilesPatch = (kind, row) => ({
  [kind]: row ? String(row.filename || '') : '',
  [`${kind}_hash`]: row ? artifactHashOf(row) : '',
  [`${kind}_version`]: row ? withoutRestApiSuffix(artifactVersionOf(row).full_version) : '',
});

const answerValues = row => {
  const version = artifactVersionOf(row);
  return {
    name: String(row.filename || ''),
    hash: artifactHashOf(row),
    major: version.major,
    minor: version.minor,
    patch: version.patch,
    version: withoutRestApiSuffix(version.full_version),
    install: true,
  };
};

/**
 * The manifest fields a pick fills, the `files.<kind>.answers` of the
 * manifest's role: each answer's field set to the row's name, hash,
 * major, minor, patch or version, and `install` to true; every named
 * field cleared, `install` to false, for no pick.
 *
 * @param {Object|null} manifestRole - The manifest's role
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @param {Object|null} row - The artifact row picked
 * @returns {Object} The answers by field name
 */
export const pickAnswersOf = (manifestRole, kind, row) => {
  const answers = manifestRole?.files?.[kind]?.answers;
  if (!isObject(answers)) {
    return {};
  }
  const values = row ? answerValues(row) : null;
  const filled = {};
  Object.entries(answers).forEach(([member, field]) => {
    if (typeof field !== 'string' || !field) {
      return;
    }
    if (member === 'install') {
      filled[field] = Boolean(values);
      return;
    }
    filled[field] = values ? values[member] : undefined;
  });
  return filled;
};

/**
 * The names of every manifest field a role's file picks answer, the
 * fields the form never draws because the pickers are their one source.
 *
 * @param {Array<Object>} manifestRoles - The manifest's roles
 * @returns {Set<string>} The field names
 */
export const answeredFieldNames = manifestRoles => {
  const names = new Set();
  (Array.isArray(manifestRoles) ? manifestRoles : []).forEach(role => {
    fileKindsOf(role).forEach(kind => {
      Object.values(role.files[kind].answers || {}).forEach(field => {
        if (typeof field === 'string' && field) {
          names.add(field);
        }
      });
    });
  });
  return names;
};

/**
 * The artifact row a role row's pick of one kind names among the host's
 * rows, by file name.
 *
 * @param {Array<Object>} rows - The rows of `roleArtifactsOf`
 * @param {Object|null} roleRow - The role row with its `files`
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @returns {Object|null} The row
 */
export const pickedArtifactOf = (rows, roleRow, kind) => {
  const name = roleRow?.files?.[kind];
  return name ? rows.find(row => row.filename === name) || null : null;
};

/**
 * Whether a role still needs an answer: it is on and its installer has no
 * pick, or a pick of any kind is not on the host and no download of it is
 * queued, or a spec option of it is required with no default and no value.
 *
 * @param {Object} options - The role, its manifest entry, the rows, the queue and the spec
 * @param {Object} options.roleRow - The role row
 * @param {Object|null} options.manifestRole - The manifest's role
 * @param {Array<Object>|null} options.artifacts - The host's artifact rows
 * @param {Object} options.queued - The queued downloads by `<role>/<kind>`
 * @param {Object|null} options.spec - The role's argument spec
 * @returns {boolean} True while the role needs attention
 */
export const roleNeedsAttention = ({ roleRow, manifestRole, artifacts, queued, spec }) => {
  if (roleRow.enabled === false) {
    return false;
  }
  const filesWanting = fileKindsOf(manifestRole).some(kind => {
    const rows = roleArtifactsOf(artifacts, manifestRole, kind);
    const picked = pickedArtifactOf(rows, roleRow, kind);
    if (kind === 'installer' && !picked) {
      return true;
    }
    return Boolean(picked) && !artifactPresent(picked) && !queued?.[`${roleRow.name}/${kind}`];
  });
  if (filesWanting) {
    return true;
  }
  const options = isObject(spec?.options) ? spec.options : {};
  return Object.entries(options).some(
    ([name, option]) =>
      isObject(option) &&
      option.required === true &&
      option.default === undefined &&
      (roleRow.vars?.[name] === undefined || roleRow.vars?.[name] === '')
  );
};

/**
 * The role rows with each file-taking role's installer picked to its
 * default among the host's rows, and the manifest answers those picks
 * fill; a role whose installer is already picked keeps its pick.
 *
 * @param {Array<Object>} rows - The role rows
 * @param {Array<Object>} manifestRoles - The manifest's roles
 * @param {Array<Object>|null} artifacts - The host's artifact rows
 * @returns {{ roles: Array<Object>, answers: Object }} The rows and the answers
 */
export const seedRolePicks = (rows, manifestRoles, artifacts) => {
  const answers = {};
  const roles = rows.map(row => {
    const manifestRole = (Array.isArray(manifestRoles) ? manifestRoles : []).find(
      role => bareRoleName(role.name) === bareRoleName(row.name)
    );
    if (!manifestRole || !fileKindsOf(manifestRole).includes('installer') || row.files?.installer) {
      return row;
    }
    const picked = defaultPickOf(
      roleArtifactsOf(artifacts, manifestRole, 'installer'),
      'installer'
    );
    if (!picked) {
      return row;
    }
    Object.assign(answers, pickAnswersOf(manifestRole, 'installer', picked));
    return { ...row, files: { ...(row.files || {}), ...roleFilesPatch('installer', picked) } };
  });
  return { roles, answers };
};

/**
 * The key of a queued download, `<role>/<kind>`.
 *
 * @param {string} role - The role name
 * @param {string} kind - `installer`, `fixpack` or `hotfix`
 * @returns {string} The key
 */
export const downloadKeyOf = (role, kind) => `${role}/${kind}`;

/**
 * The task ids of the queued downloads, the create body's `wait_for`.
 *
 * @param {Object} queued - The queued downloads by key, each `{ task_id }`
 * @returns {Array<string>} The task ids
 */
export const waitForOf = queued =>
  Object.values(queued || {})
    .map(entry => entry?.task_id)
    .filter(Boolean);
