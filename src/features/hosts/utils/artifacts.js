export const ARTIFACT_EXTENSIONS = ['.iso', '.img', '.vmdk', '.vhd', '.vhdx', '.qcow2'];

const IMAGE_EXTENSIONS = ['.vmdk', '.vhd', '.vhdx', '.qcow2', '.img'];

export const ARTIFACT_TYPES = ['iso', 'image'];

export const CHECKSUM_ALGORITHMS = ['md5', 'sha1', 'sha256'];

export const ARTIFACT_PAGE_SIZE = 25;

export const TRANSFER_STATUSES = ['queued', 'running', 'completed', 'failed'];

const TYPE_TONES = { iso: 'info', image: 'warning' };

const STATUS_TONES = { queued: 'info', running: 'primary', completed: 'success', failed: 'danger' };

const lower = value => String(value ?? '').toLowerCase();

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

/**
 * The extension of a file name with its dot, lower-cased, empty for a
 * name without one.
 *
 * @param {string} filename - The name
 * @returns {string} The extension
 */
export const extensionOf = filename => {
  const text = String(filename || '');
  const cut = text.lastIndexOf('.');
  return cut === -1 ? '' : text.slice(cut).toLowerCase();
};

/**
 * The type of an artifact, hyperweaver-ui's rule: `iso` for the type or
 * the `.iso` extension, `image` for the type or a disk image extension,
 * `file` otherwise.
 *
 * @param {string} [fileType] - The row's `file_type`
 * @param {string} [extension] - The row's `extension`
 * @returns {string} `iso`, `image` or `file`
 */
export const artifactTypeOf = (fileType, extension) => {
  const type = lower(fileType);
  const ext = lower(extension);
  if (type === 'iso' || ext === '.iso') {
    return 'iso';
  }
  return type === 'image' || IMAGE_EXTENSIONS.includes(ext) ? 'image' : 'file';
};

/**
 * The Bootstrap tone an artifact type draws in, info for an ISO,
 * warning for an image and light for anything else.
 *
 * @param {string} type - `iso`, `image` or `file`
 * @returns {string} The tone
 */
export const artifactTypeTone = type => TYPE_TONES[type] || 'light';

/**
 * Whether a file name is one the artifact storage takes.
 *
 * @param {string} filename - The name
 * @returns {boolean} True for an ISO or a disk image
 */
export const isArtifactName = filename => ARTIFACT_EXTENSIONS.includes(extensionOf(filename));

/**
 * The file name a URL ends with, empty while it ends with none or with
 * no extension.
 *
 * @param {string} url - The URL
 * @returns {string} The name
 */
export const extractFilenameFromUrl = url => {
  try {
    const name = new URL(url).pathname.split('/').pop();
    return name && name.includes('.') ? name : '';
  } catch {
    return '';
  }
};

/**
 * Whether a URL is one the agent downloads from, `http:` or `https:`.
 *
 * @param {string} url - The URL
 * @returns {boolean} True for a web URL
 */
export const isDownloadUrl = url => {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

/**
 * A disk usage percentage as its number, `65%` as 65.
 *
 * @param {string} usage - The `use_percent` text
 * @returns {number} The percentage
 */
export const parseUsagePercentage = usage => Number.parseInt(String(usage || ''), 10) || 0;

/**
 * The tone of a disk usage bar: danger from ninety percent, warning
 * from seventy-five and success under it.
 *
 * @param {number} percentage - The usage
 * @returns {string} The Bootstrap background class
 */
export const getDiskUsageColor = percentage => {
  if (percentage >= 90) {
    return 'bg-danger';
  }
  return percentage >= 75 ? 'bg-warning' : 'bg-success';
};

/**
 * What an artifact's checksum says, hyperweaver-ui's four states:
 * `verified`, `mismatch`, `calculated` for a checksum the agent computed
 * with none given, and `none`.
 *
 * @param {Object} artifact - The row
 * @returns {string} The state
 */
export const checksumStateOf = artifact => {
  if (artifact.checksum_verified === true) {
    return 'verified';
  }
  if (artifact.checksum_verified === false) {
    return 'mismatch';
  }
  return artifact.calculated_checksum && !artifact.user_provided_checksum ? 'calculated' : 'none';
};

/**
 * The tone of a transfer's status: info queued, primary running,
 * success completed, danger failed and secondary for anything else.
 *
 * @param {string} status - The task's status
 * @returns {string} The tone
 */
export const transferTone = status => STATUS_TONES[status] || 'secondary';

/**
 * The key of a transfer's status word under
 * `hosts.manage.artifacts.status`, the wire's own word for a status
 * the four do not name.
 *
 * @param {string} status - The task's status
 * @returns {string} The locale key, or the empty string
 */
export const transferStatusKey = status =>
  TRANSFER_STATUSES.includes(status) ? `hosts.manage.artifacts.status.${status}` : '';

/**
 * Whether a storage location takes a file, hyperweaver-ui's rule: an ISO
 * into an ISO location, an image into an image one, anything into a
 * generic `artifact` one.
 *
 * @param {Object} storagePath - The location
 * @param {string} extension - The file's extension
 * @returns {boolean} True when the file belongs there
 */
export const isStoragePathSuitable = (storagePath, extension) => {
  if (!storagePath || !extension) {
    return false;
  }
  const type = artifactTypeOf('', extension);
  if (type !== 'file' && storagePath.type === type) {
    return true;
  }
  return storagePath.type === 'artifact';
};

/**
 * The query of `GET artifacts`, hyperweaver-ui's: the page's size and
 * offset, the sort, and the type and the location where chosen; the
 * search the page's binding narrows on the client.
 *
 * @param {Object} params - `{ type, storage_location, sort_by, sort_order }`
 * @param {Object} pagination - `{ limit, offset }`
 * @returns {Object} The query
 */
export const artifactQuery = (params, pagination) => ({
  limit: pagination.limit,
  offset: pagination.offset,
  sort_by: params.sort_by,
  sort_order: params.sort_order,
  ...(params.type ? { type: params.type } : {}),
  ...(params.storage_location ? { storage_location_id: params.storage_location } : {}),
});

/**
 * The bytes of a selection of files added up.
 *
 * @param {Array<File>} files - The files
 * @returns {number} The total
 */
export const calculateTotalFileSize = files =>
  Array.from(files || []).reduce((total, file) => total + file.size, 0);

export const STORAGE_PATH_FORM = { name: '', path: '', type: 'iso', enabled: true };

/**
 * Why a storage location cannot be made, hyperweaver-ui's rules: a name
 * of two characters at least, an absolute path, and a type.
 *
 * @param {Object} form - The form, the shape of `STORAGE_PATH_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const storagePathProblem = form => {
  const name = form.name.trim();
  if (!name) {
    return 'artifacts.storagePathCreateModal.nameRequired';
  }
  if (name.length < 2) {
    return 'artifacts.storagePathCreateModal.nameMinLength';
  }
  const path = form.path.trim();
  if (!path) {
    return 'artifacts.storagePathCreateModal.pathRequired';
  }
  if (!path.startsWith('/')) {
    return 'artifacts.storagePathCreateModal.pathAbsoluteRequired';
  }
  return form.type ? '' : 'artifacts.storagePathCreateModal.typeRequired';
};

/**
 * The body of `POST artifacts/storage/paths`.
 *
 * @param {Object} form - The form, the shape of `STORAGE_PATH_FORM`
 * @returns {Object} The body
 */
export const storagePathBody = form => ({
  name: form.name.trim(),
  path: form.path.trim(),
  type: form.type,
  enabled: Boolean(form.enabled),
});

/**
 * Why a storage location's edit cannot be sent: a name of two
 * characters at least.
 *
 * @param {Object} form - `{ name, enabled }`
 * @returns {string} The locale key, or the empty string
 */
export const storagePathEditProblem = form => {
  const name = form.name.trim();
  if (!name) {
    return 'artifacts.storagePathEditModal.nameRequired';
  }
  return name.length < 2 ? 'artifacts.storagePathEditModal.nameMinLength' : '';
};

/**
 * The body of `PUT artifacts/storage/paths/{id}` the edit dialog sends.
 *
 * @param {Object} form - `{ name, enabled }`
 * @returns {Object} The body
 */
export const storagePathEditBody = form => ({
  name: form.name.trim(),
  enabled: Boolean(form.enabled),
});

export const DOWNLOAD_FORM = {
  url: '',
  storage_path_id: '',
  filename: '',
  checksum: '',
  checksum_algorithm: 'sha256',
  overwrite_existing: false,
};

/**
 * Why a download from a URL cannot start: a URL, a valid one, and a
 * storage location.
 *
 * @param {Object} form - The form, the shape of `DOWNLOAD_FORM`
 * @returns {string} The locale key, or the empty string
 */
export const downloadProblem = form => {
  const url = form.url.trim();
  if (!url) {
    return 'artifacts.artifactDownloadModal.urlRequired';
  }
  if (!isDownloadUrl(url)) {
    return 'artifacts.artifactDownloadModal.invalidUrl';
  }
  if (!form.storage_path_id) {
    return 'artifacts.artifactDownloadModal.storageLocationRequired';
  }
  return form.checksum.trim() && !form.checksum_algorithm
    ? 'artifacts.artifactDownloadModal.checksumAlgorithmRequired'
    : '';
};

/**
 * The body of `POST artifacts/download`: the URL, the location and
 * whether to overwrite, the file name where given, and the checksum
 * with its algorithm where given.
 *
 * @param {Object} form - The form, the shape of `DOWNLOAD_FORM`
 * @returns {Object} The body
 */
export const downloadBody = form => ({
  url: form.url.trim(),
  storage_path_id: form.storage_path_id,
  overwrite_existing: Boolean(form.overwrite_existing),
  ...(form.filename.trim() ? { filename: form.filename.trim() } : {}),
  ...(form.checksum.trim()
    ? { checksum: form.checksum.trim(), checksum_algorithm: form.checksum_algorithm }
    : {}),
});

export const UPLOAD_FORM = { storage_path_id: '', checksum: '', checksum_algorithm: 'sha256' };

/**
 * Why an upload cannot start: files, a storage location, and every file
 * an ISO or a disk image.
 *
 * @param {Object} form - The form, the shape of `UPLOAD_FORM`
 * @param {Array<File>} files - The files picked
 * @returns {{ key: string, values: Object }|null} The problem, or null
 */
export const uploadProblem = (form, files) => {
  if (files.length === 0) {
    return { key: 'artifacts.artifactUploadModal.filesRequired', values: {} };
  }
  if (!form.storage_path_id) {
    return { key: 'artifacts.artifactUploadModal.storageLocationRequired', values: {} };
  }
  const wrong = files.find(file => !isArtifactName(file.name));
  if (wrong) {
    return {
      key: 'artifacts.artifactUploadModal.unsupportedFileType',
      values: { filename: wrong.name, extensions: ARTIFACT_EXTENSIONS.join(', ') },
    };
  }
  return null;
};

/**
 * The body of `POST artifacts/upload/prepare` for one file: its name and
 * size, the location, no overwrite, and the checksum with its algorithm
 * where given.
 *
 * @param {File} file - The file
 * @param {Object} form - The form, the shape of `UPLOAD_FORM`
 * @returns {Object} The body
 */
export const uploadPrepareBody = (file, form) => ({
  filename: file.name,
  size: file.size,
  storage_path_id: form.storage_path_id,
  overwrite_existing: false,
  ...(form.checksum.trim()
    ? { checksum: form.checksum.trim(), checksum_algorithm: form.checksum_algorithm }
    : {}),
});

/**
 * The storage locations an artifact can move or copy to, the enabled
 * ones other than its own.
 *
 * @param {Array<Object>} storagePaths - The locations
 * @param {Object} artifact - The artifact
 * @returns {Array<Object>} The destinations
 */
export const destinationsOf = (storagePaths, artifact) =>
  storagePaths.filter(path => path.enabled && path.id !== artifact.storage_location?.id);

/**
 * The enabled storage locations, the ones an upload or a download may
 * land in.
 *
 * @param {Array<Object>} storagePaths - The locations
 * @returns {Array<Object>} The enabled ones
 */
export const enabledPaths = storagePaths => storagePaths.filter(path => path.enabled);

/**
 * The location a form opens on, the one enabled location when there is
 * exactly one, none otherwise.
 *
 * @param {Array<Object>} storagePaths - The locations
 * @returns {string} The location's id, or the empty string
 */
export const defaultPathOf = storagePaths => {
  const enabled = enabledPaths(storagePaths);
  return enabled.length === 1 ? enabled[0].id : '';
};

/**
 * A transfer row the artifacts section holds for a task it follows,
 * hyperweaver-ui's shape: the task, the file, the URL of a download,
 * whether it is an upload, its location and when it started.
 *
 * @param {Object} options - The transfer
 * @returns {Object} The row
 */
export const transferOf = ({ taskId, filename, url = '', isUpload = false, storageLocation }) => ({
  taskId,
  filename: filename || '',
  url,
  isUpload,
  storage_location: storageLocation || null,
  created_at: new Date().toISOString(),
  status: 'queued',
  progress_percent: 0,
  progress_info: {},
  error_message: '',
});

/**
 * A transfer row with a pushed task row's status, progress and error.
 *
 * @param {Object} transfer - The transfer row
 * @param {Object} task - The task row `task-updated` pushed
 * @returns {Object} The transfer row
 */
export const transferWithTask = (transfer, task) => ({
  ...transfer,
  status: task.status,
  error_message: task.error_message || '',
  progress_percent: Number(task.progress_percent) || 0,
  progress_info:
    task.progress_info && typeof task.progress_info === 'object' ? task.progress_info : {},
});

export const matchesStoragePath = matcher(row => [row.name, row.path, row.type]);

export const matchesArtifact = matcher(row => [
  row.filename,
  row.file_type,
  row.extension,
  row.storage_location?.name,
  row.storage_location?.path,
  row.source_url,
]);
