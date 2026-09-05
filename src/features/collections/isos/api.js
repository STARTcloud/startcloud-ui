import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const org = organization => encodePath('api', 'organization', organization);
const iso = (organization, isoId) => `${org(organization)}${encodePath('iso', isoId)}`;

/**
 * Every ISO call, one line each over the API client; every call resolves
 * to the response body and rejects with `ApiError`. Paths are built from
 * raw names through `encodePath`.
 */
export const api = {
  isos: {
    list: organization => client.get(`${org(organization)}/iso`),
    discover: () => client.get('/api/isos/discover'),
    upload: (organization, file, isPublic, onUploadProgress) =>
      client.post(`${org(organization)}/iso`, file, {
        contentType: 'octet-stream',
        headers: { 'x-file-name': file.name, 'x-is-public': String(isPublic) },
        onUploadProgress,
      }),
    remove: (organization, isoId) => client.delete(iso(organization, isoId)),
    removeAll: organization => client.delete(`${org(organization)}/iso`),
    downloadLink: (organization, isoId) =>
      client.post(`${iso(organization, isoId)}/download-link`, {}).then(data => data.downloadUrl),
    update: (organization, isoId, body) => client.put(iso(organization, isoId), body),
    watch: (organization, isoId) => client.post(`${iso(organization, isoId)}/watch`, {}),
    unwatch: (organization, isoId) => client.delete(`${iso(organization, isoId)}/watch`),
    watches: () => client.get('/api/user/iso-watches'),
  },
};
