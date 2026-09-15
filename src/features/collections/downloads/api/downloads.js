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

const uploadTo = (base, { isPublic, file: picked, onUploadProgress }) =>
  uploadChunked({
    client,
    path: `${base}/file/upload?is_public=${isPublic ? 'true' : 'false'}`,
    file: picked,
    onUploadProgress,
  });

/**
 * Every downloads call, one line each over the API client; every call
 * resolves to the response body and rejects with `ApiError`. Paths are built
 * from raw names through `encodePath`. A product owns releases, a release
 * owns patches and a patch owns files; a file is uploaded through the box's
 * chunked route relative to the level the person stands on, the route
 * creating the levels the file name names when they are absent.
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
      client.delete(file(organization, name, number, patchName, key)),
    downloadLink: (organization, name, number, patchName, key) =>
      client
        .post(`${file(organization, name, number, patchName, key)}/get-download-link`, {})
        .then(data => data.downloadUrl),
  },
  uploads: {
    collection: (organization, options) => uploadTo(`${org(organization)}/download`, options),
    product: (organization, name, options) => uploadTo(product(organization, name), options),
    release: (organization, name, number, options) =>
      uploadTo(release(organization, name, number), options),
    patch: (organization, name, number, patchName, options) =>
      uploadTo(patch(organization, name, number, patchName), options),
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
