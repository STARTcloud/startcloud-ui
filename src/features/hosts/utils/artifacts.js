const IMAGE_EXTENSIONS = ['.vmdk', '.vhd', '.vhdx', '.qcow2', '.img'];

const TRANSFER_STATUSES = ['queued', 'running', 'completed', 'failed'];

const TYPE_TONES = { iso: 'info', image: 'warning' };

const STATUS_TONES = { queued: 'info', running: 'primary', completed: 'success', failed: 'danger' };

const lower = value => String(value ?? '').toLowerCase();

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

/**
 * A transfer row the Installer files page holds for a task it follows,
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
