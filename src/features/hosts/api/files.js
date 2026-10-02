import { client, session } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * One directory of the host's file system for the file manager,
 * `GET filesystem`, hyperweaver-ui's read: the path, whether hidden
 * entries are listed, and the sort, answered `{ items, current_path }`,
 * `current_path` the directory the agent resolved the path to.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} options - `path`, `showHidden`, `sortBy` and `sortOrder`
 * @returns {Promise<Object>} The listing
 */
export const listFiles = (
  status,
  id,
  { path, showHidden = false, sortBy = 'name', sortOrder = 'asc' }
) =>
  client.get(agentPath(status, id, 'filesystem'), {
    params: { path, show_hidden: showHidden, sort_by: sortBy, sort_order: sortOrder },
  });

/**
 * Make a folder, `POST filesystem/folder` with the parent, the name,
 * the mode and the ownership, answered `{ item }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const createFolder = (status, id, body) =>
  client.post(agentPath(status, id, 'filesystem/folder'), body);

/**
 * Rename a file or a folder, `PATCH filesystem/rename` with the path and
 * the new name, answered `{ item }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ path, new_name }`
 * @returns {Promise<Object>} The agent's answer
 */
export const renameFile = (status, id, body) =>
  client.patch(agentPath(status, id, 'filesystem/rename'), body);

/**
 * Delete one file or folder, `DELETE filesystem` with the path,
 * `recursive` for a folder and `force` false.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ path, recursive, force }`
 * @returns {Promise<Object>} The agent's answer
 */
export const deleteFile = (status, id, body) =>
  client.delete(agentPath(status, id, 'filesystem'), { body });

/**
 * Copy one file, `POST filesystem/copy` with the source and the
 * destination, a queued task where the agent names one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ source, destination }`
 * @returns {Promise<Object>} The agent's answer
 */
export const copyFile = (status, id, body) =>
  client.post(agentPath(status, id, 'filesystem/copy'), body);

/**
 * Move one file, `PUT filesystem/move` with the source and the
 * destination, a queued task where the agent names one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ source, destination }`
 * @returns {Promise<Object>} The agent's answer
 */
export const moveFile = (status, id, body) =>
  client.put(agentPath(status, id, 'filesystem/move'), body);

/**
 * The text of a file, `GET filesystem/content` with the path, answered
 * `{ content }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The file's path
 * @returns {Promise<Object>} The agent's answer
 */
export const fetchFileContent = (status, id, path) =>
  client.get(agentPath(status, id, 'filesystem/content'), { params: { path } });

/**
 * Write the text of a file, `PUT filesystem/content`, hyperweaver-ui's
 * body: the path, the content, no backup, the mode and the ownership.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const writeFileContent = (status, id, body) =>
  client.put(agentPath(status, id, 'filesystem/content'), body);

/**
 * Make an archive, `POST filesystem/archive/create` with the sources,
 * the archive's path and the format, a queued task where the agent
 * names one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ sources, archive_path, format }`
 * @returns {Promise<Object>} The agent's answer
 */
export const createArchive = (status, id, body) =>
  client.post(agentPath(status, id, 'filesystem/archive/create'), body);

/**
 * Extract an archive, `POST filesystem/archive/extract` with the
 * archive's path and the directory, a queued task where the agent names
 * one.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `{ archive_path, extract_path }`
 * @returns {Promise<Object>} The agent's answer
 */
export const extractArchive = (status, id, body) =>
  client.post(agentPath(status, id, 'filesystem/archive/extract'), body);

/**
 * Change the owner, the group and the mode of a file,
 * `PATCH filesystem/permissions` with the body of `permissionBody`,
 * answered `{ item }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const updatePermissions = (status, id, body) =>
  client.patch(agentPath(status, id, 'filesystem/permissions'), body);

/**
 * The accounts the properties dialog offers as owner and group,
 * hyperweaver-ui's `GET system/users` and `GET system/groups` with no
 * filter, answered `{ users }` and `{ groups }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<{ users: Array<Object>, groups: Array<Object> }>} The accounts
 */
export const fetchOwnerChoices = (status, id) =>
  Promise.all([
    client.get(agentPath(status, id, 'system/users')),
    client.get(agentPath(status, id, 'system/groups')),
  ]).then(([users, groups]) => ({
    users: Array.isArray(users?.users) ? users.users : [],
    groups: Array.isArray(groups?.groups) ? groups.groups : [],
  }));

/**
 * One file as a blob, `GET filesystem/download` with the path through
 * the client's raw fetch, the session's headers on it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The file's path
 * @returns {Promise<Blob>} The file
 */
export const downloadFile = (status, id, path) =>
  client
    .raw('GET', `${agentPath(status, id, 'filesystem/download')}?path=${encoded(path)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText || String(response.status));
      }
      return response.blob();
    });

/**
 * The upload the file manager's own uploader sends, `POST
 * filesystem/upload` at the agent's path with the session's headers,
 * cubone's `fileUploadConfig`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<{ url: string, method: string, headers: Object }>} The config
 */
export const uploadConfig = (status, id) => {
  const path = agentPath(status, id, 'filesystem/upload');
  return session
    .headers('POST', client.resolve(path))
    .then(headers => ({ url: path, method: 'POST', headers }));
};
