import { canControlHosts, hasMinPermission } from './permissions';

const DRIVE = /^[A-Za-z]:/u;

const DRIVE_DISPLAY = /^\/(?<drive>[A-Za-z]:)(?<rest>\/.*)?$/u;

const TEXT_MIME_TYPES = [
  'application/json',
  'application/javascript',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/x-sh',
  'application/x-shellscript',
];

const OBVIOUS_TEXT_EXTENSIONS = ['txt', 'md', 'log'];

const TEXT_FILE_PATTERNS = [
  /^\.(?:bashrc|zshrc|kshrc|profile|bash_profile|zprofile)$/u,
  /^(?:bashrc|zshrc|kshrc|profile)$/u,
  /^\.(?:vimrc|gitconfig|gitignore)$/u,
  /^(?:Dockerfile|Makefile|Rakefile)$/iu,
];

const ARCHIVE_EXTENSIONS = ['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z'];

const ARCHIVE_SUFFIX = /\.(?:tar\.gz|tar\.bz2|zip|tar|gz)$/iu;

const GO_PLATFORMS = ['windows', 'darwin', 'linux'];

const OCTAL_MODE = /^[0-7]{3}$/u;

export const ARCHIVE_FORMATS = [
  { value: 'tar.gz', labelKey: 'hosts.manage.files.format.tarGz' },
  { value: 'tar', labelKey: 'hosts.manage.files.format.tar' },
  { value: 'zip', labelKey: 'hosts.manage.files.format.zip' },
];

const BZIP_FORMATS = [
  { value: 'tar.bz2', labelKey: 'hosts.manage.files.format.tarBz2' },
  { value: 'gz', labelKey: 'hosts.manage.files.format.gz' },
];

export const PERMISSION_CATEGORIES = ['owner', 'group', 'other'];

export const PERMISSION_TYPES = ['read', 'write', 'execute'];

export const PERMISSION_PRESETS = [
  { mode: '644', labelKey: 'hostTools.PermissionEditor.preset644' },
  { mode: '755', labelKey: 'hostTools.PermissionEditor.preset755' },
  { mode: '600', labelKey: 'hostTools.PermissionEditor.preset600' },
];

export const DEFAULT_MODE = '644';

export const DEFAULT_FOLDER_MODE = '755';

export const DEFAULT_OWNER = 1000;

export const EDITOR_SIZE_LIMIT = 100 * 1024 * 1024;

export const UPLOAD_SIZE_LIMIT = 50 * 1024 * 1024 * 1024;

const trimSlashes = path => path.replace(/\/+$/u, '');

/**
 * The agent's host OS as its row names it, `windows`, `darwin`, `linux`
 * or `omnios`, empty while the row names none.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {string} The platform
 */
export const platformOf = server => server?.capabilities?.platform || '';

/**
 * Whether the agent runs on Windows, where the file system's owner and
 * group are refused and a mode is the read-only attribute.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {boolean} True on a Windows agent
 */
export const isWindowsAgent = server => platformOf(server) === 'windows';

/**
 * The POSIX ownership hyperweaver-ui sends with a new folder, a written
 * file and an upload, left out on a Windows agent.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Object} `{ uid, gid }`, or nothing
 */
export const ownershipFields = server =>
  isWindowsAgent(server) ? {} : { uid: DEFAULT_OWNER, gid: DEFAULT_OWNER };

/**
 * The archive formats an agent creates, hyperweaver-ui's list: tar.gz,
 * tar and zip everywhere, tar.bz2 and gz on an agent that is not the Go
 * one, whose bzip2 decompresses alone.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @returns {Array<{ value: string, labelKey: string }>} The formats
 */
export const archiveFormats = server =>
  GO_PLATFORMS.includes(platformOf(server))
    ? ARCHIVE_FORMATS
    : [...ARCHIVE_FORMATS, ...BZIP_FORMATS];

/**
 * An agent path as the display path the file manager can match,
 * hyperweaver-ui's mapping: with no root every drive path mounts under
 * `/`, `C:/Users` to `/C:/Users`; with a named root the paths are
 * root-relative, `<root>/x` to `/x`, the root itself `/`; a root of `/`
 * is the identity.
 *
 * @param {string|null} root - The directory the agent's `/` resolved to
 * @param {string} agentPath - The path on the agent
 * @returns {string} The display path
 */
export const toDisplayPath = (root, agentPath) => {
  if (!agentPath) {
    return agentPath;
  }
  const base = root ? trimSlashes(root) : '';
  if (base === '') {
    return DRIVE.test(agentPath) ? `/${trimSlashes(agentPath)}` : agentPath;
  }
  if (agentPath === base || agentPath === root) {
    return '/';
  }
  return agentPath.startsWith(`${base}/`) ? agentPath.slice(base.length) : agentPath;
};

/**
 * A display path as the path the wire takes, the inverse of
 * `toDisplayPath`; a bare drive keeps its slash, because `C:` alone is
 * drive-relative on Windows.
 *
 * @param {string|null} root - The directory the agent's `/` resolved to
 * @param {string} displayPath - The display path
 * @returns {string} The agent path
 */
export const toAgentPath = (root, displayPath) => {
  const base = root ? trimSlashes(root) : '';
  if (base === '') {
    const match = DRIVE_DISPLAY.exec(displayPath);
    if (match) {
      return match.groups.rest
        ? `${match.groups.drive}${match.groups.rest}`
        : `${match.groups.drive}/`;
    }
    return displayPath;
  }
  return displayPath === '/' ? root : `${base}${displayPath}`;
};

/**
 * One item of `GET filesystem` as the file manager's file: its name,
 * path, whether it is a directory, its update time, its size, and the
 * agent's own metadata under `_hwMetadata`.
 *
 * @param {Object} item - The agent's item
 * @returns {Object} The file
 */
export const transformAgentToFile = item => ({
  name: item.name,
  path: item.path,
  isDirectory: Boolean(item.isDirectory),
  updatedAt: item.mtime || item.atime || new Date().toISOString(),
  size: item.size || 0,
  _hwMetadata: {
    permissions: item.permissions,
    uid: item.uid,
    gid: item.gid,
    mimeType: item.mimeType,
    isBinary: item.isBinary,
    syntax: item.syntax,
  },
});

/**
 * Every item of a listing as the file manager's files.
 *
 * @param {Array<Object>} items - The agent's items
 * @returns {Array<Object>} The files
 */
export const transformFilesToHierarchy = items =>
  Array.isArray(items) ? items.map(transformAgentToFile) : [];

export const getPathFromFile = file => file.path || '/';

/**
 * The extension of a file name without its dot, lower-cased, empty for
 * a name without one.
 *
 * @param {string} filename - The name
 * @returns {string} The extension
 */
export const getFileExtension = filename => {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Whether a file opens in the text editor, hyperweaver-ui's rule in
 * order: the agent said it is not binary, its MIME type is text or one
 * of the text-like application types, the agent named a syntax, its
 * extension is an obvious text one, or its name is a known shell or
 * build file.
 *
 * @param {Object} file - The file
 * @returns {boolean} True for a text file
 */
export const isTextFile = file => {
  if (!file || file.isDirectory) {
    return false;
  }
  const meta = file._hwMetadata || {};
  if (meta.isBinary === false) {
    return true;
  }
  if (
    meta.mimeType &&
    (meta.mimeType.startsWith('text/') || TEXT_MIME_TYPES.includes(meta.mimeType))
  ) {
    return true;
  }
  if (meta.syntax) {
    return true;
  }
  if (OBVIOUS_TEXT_EXTENSIONS.includes(getFileExtension(file.name))) {
    return true;
  }
  return TEXT_FILE_PATTERNS.some(pattern => pattern.test(file.name));
};

/**
 * Whether a file is an archive the agent extracts, by a compound
 * `.tar.` extension or one of the archive extensions.
 *
 * @param {Object} file - The file
 * @returns {boolean} True for an archive
 */
export const isArchiveFile = file => {
  if (!file || file.isDirectory) {
    return false;
  }
  const filename = String(file.name || '').toLowerCase();
  return filename.includes('.tar.') || ARCHIVE_EXTENSIONS.includes(getFileExtension(file.name));
};

/**
 * The archive format the wire names for a file name, `zip` when none
 * matches.
 *
 * @param {string} filename - The archive's name
 * @returns {string} The format
 */
export const getArchiveFormat = filename => {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'tar.gz';
  }
  if (lower.endsWith('.tar.bz2')) {
    return 'tar.bz2';
  }
  if (lower.endsWith('.tar')) {
    return 'tar';
  }
  if (lower.endsWith('.zip')) {
    return 'zip';
  }
  return lower.endsWith('.gz') ? 'gz' : 'zip';
};

/**
 * A file name without its archive extension.
 *
 * @param {string} filename - The archive's name
 * @returns {string} The name
 */
export const stripArchiveExtension = filename => String(filename || '').replace(ARCHIVE_SUFFIX, '');

/**
 * The name an archive of a selection opens with, the one file's name or
 * `archive`, and the format's extension.
 *
 * @param {Array<Object>} files - The selection
 * @param {string} format - The format
 * @returns {string} The name
 */
export const archiveNameOf = (files, format) =>
  `${files.length === 1 ? files[0].name : 'archive'}.${format}`;

/**
 * The files sorted the way hyperweaver-ui listed them, directories
 * first, then by name naturally.
 *
 * @param {Array<Object>} files - The files
 * @returns {Array<Object>} The sorted files
 */
export const sortFiles = files =>
  [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

const getParentPath = path => {
  if (!path || path === '/') {
    return '';
  }
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
};

/**
 * The directories as a tree by parent path.
 *
 * @param {Array<Object>} files - The files
 * @returns {Array<Object>} The roots, each with `children`
 */
export const buildFileTree = files => {
  const grouped = files
    .filter(file => file.isDirectory)
    .reduce((acc, dir) => {
      const parent = getParentPath(dir.path);
      return { ...acc, [parent]: [...(acc[parent] || []), dir] };
    }, {});
  const buildNode = (path = '') =>
    (grouped[path] || []).map(dir => ({ ...dir, children: buildNode(dir.path) }));
  return buildNode('');
};

/**
 * The ancestors of a display path above its own directory, the
 * directories whose listings the navigation pane needs, `/a/b/c` giving
 * `/a` and `/a/b`.
 *
 * @param {string} path - The display path
 * @returns {Array<string>} The parent paths
 */
export const parentPathsOf = path => {
  const parts = String(path || '')
    .split('/')
    .filter(Boolean);
  const parents = [];
  parts.slice(0, -1).reduce((acc, part) => {
    const full = `${acc}/${part}`;
    parents.push(full);
    return full;
  }, '');
  return parents;
};

/**
 * The files with every directory of the lists appended once, by path,
 * the way hyperweaver-ui fed the navigation pane the root's and the
 * parents' directories beside the current listing.
 *
 * @param {Array<Object>} files - The current listing
 * @param {Array<Array<Object>>} lists - The directories to append
 * @returns {Array<Object>} The combined files
 */
export const withDirectories = (files, lists) => {
  const combined = [...files];
  lists.flat().forEach(dir => {
    if (!combined.some(file => file.path === dir.path)) {
      combined.push(dir);
    }
  });
  return combined;
};

/**
 * The files of the current directory alone, the ones whose parent is
 * the path, the set hyperweaver-ui archived as the directory.
 *
 * @param {Array<Object>} files - The files
 * @param {string} path - The current display path
 * @returns {Array<Object>} The files in the directory
 */
export const filesInDirectory = (files, path) => {
  const base = path === '/' ? '' : trimSlashes(path);
  return files.filter(file => getParentPath(file.path) === (base || '/'));
};

/**
 * What the file manager lets a person do, hyperweaver-ui's map of the
 * role: every write for an admin and the download for every role.
 *
 * @param {string} [role] - The person's role
 * @returns {Object} cubone's `permissions` with `edit`, `archive` and `properties`
 */
export const filePermissions = role => {
  const manage = canControlHosts(role);
  return {
    create: manage,
    upload: manage,
    move: manage,
    copy: manage,
    rename: manage,
    download: hasMinPermission(role, 'user'),
    delete: manage,
    edit: manage,
    archive: manage,
    properties: manage,
  };
};

const digitOf = perms => (perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);

const permsOf = digit => {
  const value = Number.parseInt(digit, 10) || 0;
  return { read: (value & 4) !== 0, write: (value & 2) !== 0, execute: (value & 1) !== 0 };
};

export const DEFAULT_PERMISSIONS = {
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  other: { read: true, write: false, execute: false },
};

/**
 * The permission boxes of an octal mode, three digits each read, write
 * and execute; the default boxes for a mode that is no three digits.
 *
 * @param {string} octal - The mode
 * @returns {Object} The boxes by category
 */
export const permissionsOf = octal => {
  const text = String(octal || '');
  if (!OCTAL_MODE.test(text)) {
    return DEFAULT_PERMISSIONS;
  }
  return { owner: permsOf(text[0]), group: permsOf(text[1]), other: permsOf(text[2]) };
};

/**
 * The octal mode of the permission boxes.
 *
 * @param {Object} permissions - The boxes by category
 * @returns {string} The three digits
 */
export const octalOf = permissions =>
  `${digitOf(permissions.owner)}${digitOf(permissions.group)}${digitOf(permissions.other)}`;

/**
 * The body of `PATCH filesystem/permissions` the properties dialog
 * sends: the path, the owner and the group where chosen, the mode, and
 * `recursive` for a directory when asked; the owner and the group left
 * out on a Windows agent, which refuses them.
 *
 * @param {Object} options - The file, the form and the host's row
 * @param {Object} options.file - The file
 * @param {Object} options.form - `{ user, group, mode, recursive }`
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {Object} The body
 */
export const permissionBody = ({ file, form, server }) => ({
  path: getPathFromFile(file),
  ...(form.user && !isWindowsAgent(server) ? { uid: Number.parseInt(form.user, 10) } : {}),
  ...(form.group && !isWindowsAgent(server) ? { gid: Number.parseInt(form.group, 10) } : {}),
  mode: form.mode,
  recursive: Boolean(form.recursive && file.isDirectory),
});

/**
 * The fields cubone appends to an upload beside the file,
 * hyperweaver-ui's: the directory, no overwrite, the mode and the
 * ownership the agent takes.
 *
 * @param {Object} options - The directory and the host's row
 * @param {string} options.uploadPath - The agent path of the directory
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {Object} The fields
 */
export const uploadFields = ({ uploadPath, server }) => ({
  uploadPath,
  overwrite: false,
  mode: DEFAULT_MODE,
  ...ownershipFields(server),
});

/**
 * The size of a text as its bytes, the count the editor warns over.
 *
 * @param {string} content - The text
 * @returns {number} The bytes
 */
export const textBytes = content => new Blob([String(content ?? '')]).size;
