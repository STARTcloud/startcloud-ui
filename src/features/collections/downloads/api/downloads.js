import { encodePath } from '../../../../lib/apiClient';
import { client } from '../../../../lib/runtime';
import { uploadChunked } from '../../boxes/api/uploadChunked';

const org = organization => encodePath('api', 'organization', organization);
const product = (organization, name) => `${org(organization)}${encodePath('download', name)}`;
const release = (organization, name, number) =>
  `${product(organization, name)}${encodePath('release', number)}`;
const patch = (organization, name, number, patchName) =>
  `${release(organization, name, number)}${encodePath('patch', patchName)}`;
const file = (organization, name, number, patchName, key) =>
  `${patch(organization, name, number, patchName)}${encodePath('file', key)}`;

const pendingStore = organization => `${org(organization)}/download/pending`;
const pendingUpload = organization => `${pendingStore(organization)}/upload`;
const pendingItem = (organization, id) => `${pendingStore(organization)}${encodePath(id)}`;

const pendingBody = answer => {
  const body = answer?.id ? answer : answer?.details || {};
  return body.id ? body : null;
};

/**
 * The two-step upload of one download file: the bytes through the chunked
 * route into the organization's pending store, where nothing is validated
 * but the bytes, the assembled size polled through the pending upload's own
 * `info` route, and the answer of the last chunk, `{ id, file_name, size,
 * guess }`, handed back so the placing form can draw the words the file name
 * gave.
 *
 * @param {string} organization - The organization the file goes to
 * @param {Object} options - `file`, `onUploadProgress`
 * @returns {Promise<Object|null>} The pending upload, or null when the answer names none
 */
const uploadPending = (organization, { file: picked, onUploadProgress }) => {
  let held = null;
  const reader = answer => {
    held = pendingBody(answer);
    return held ? () => client.get(`${pendingItem(organization, held.id)}/info`) : null;
  };
  return uploadChunked({
    client,
    path: pendingUpload(organization),
    file: picked,
    onUploadProgress,
    info: reader,
  }).then(result => held || pendingBody(result));
};

/**
 * Every downloads call, one line each over the API client; every call
 * resolves to the response body and rejects with `ApiError`. Paths are built
 * from raw names through `encodePath`. A product owns releases, a release
 * owns patches and a patch owns files; a person's file lands in two steps
 * through `pending`, the bytes first and the placing form after them; the
 * level upload routes are a program's and no page calls them.
 */
export const api = {
  downloads: {
    discover: () => client.get('/api/downloads/discover'),
    list: organization => client.get(`${org(organization)}/download`),
    get: (organization, name) => client.get(product(organization, name)),
    update: (organization, name, body) => client.put(product(organization, name), body),
    remove: (organization, name) => client.delete(product(organization, name)),
    watch: (organization, name) => client.post(`${product(organization, name)}/watch`, {}),
    unwatch: (organization, name) => client.delete(`${product(organization, name)}/watch`),
    watches: () => client.get('/api/user/download-watches'),
  },
  releases: {
    get: (organization, name, number) => client.get(release(organization, name, number)),
    update: (organization, name, number, body) =>
      client.put(release(organization, name, number), body),
    remove: (organization, name, number) => client.delete(release(organization, name, number)),
  },
  patches: {
    get: (organization, name, number, patchName) =>
      client.get(patch(organization, name, number, patchName)),
    update: (organization, name, number, patchName, body) =>
      client.put(patch(organization, name, number, patchName), body),
    remove: (organization, name, number, patchName) =>
      client.delete(patch(organization, name, number, patchName)),
  },
  files: {
    update: (organization, name, number, patchName, key, body) =>
      client.put(file(organization, name, number, patchName, key), body),
    remove: (organization, name, number, patchName, key) =>
      client.delete(`${file(organization, name, number, patchName, key)}/delete`),
    downloadLink: (organization, name, number, patchName, key) =>
      client
        .post(`${file(organization, name, number, patchName, key)}/get-download-link`, {})
        .then(data => data.download_url),
  },
  pending: {
    upload: uploadPending,
    place: (organization, id, body) => client.post(`${pendingItem(organization, id)}/place`, body),
    discard: (organization, id) => client.delete(pendingItem(organization, id)),
  },
  bulk: {
    items: (organization, body) => client.post(`${org(organization)}/download/bulk`, body),
    versions: (organization, name, body) =>
      client.post(`${product(organization, name)}/release/bulk`, body),
    providers: (organization, name, number, body) =>
      client.post(`${release(organization, name, number)}/patch/bulk`, body),
    architectures: (organization, name, number, patchName, body) =>
      client.post(`${patch(organization, name, number, patchName)}/file/bulk`, body),
  },
};
