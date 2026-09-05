import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const org = organization => encodePath('api', 'organization', organization);
const iso = (organization, name) => `${org(organization)}${encodePath('iso', name)}`;
const version = (organization, name, number) =>
  `${iso(organization, name)}${encodePath('version', number)}`;
const architecture = (organization, name, number, architectureName) =>
  `${version(organization, name, number)}${encodePath('architecture', architectureName)}`;
const file = (organization, name, number, architectureName) =>
  `${architecture(organization, name, number, architectureName)}/file`;

/**
 * Every ISO call, one line each over the API client; every call resolves
 * to the response body and rejects with `ApiError`. Paths are built from
 * raw names through `encodePath`. An ISO is versioned like a box without
 * providers: each version carries one file per architecture, uploaded raw
 * under its architecture with the file name in `x-file-name`, the server
 * computing the checksum.
 */
export const api = {
  isos: {
    discover: () => client.get('/api/isos/discover'),
    list: organization => client.get(`${org(organization)}/iso`),
    get: (organization, name) => client.get(iso(organization, name)),
    create: (organization, body) => client.post(`${org(organization)}/iso`, body),
    update: (organization, name, body) => client.put(iso(organization, name), body),
    remove: (organization, name) => client.delete(iso(organization, name)),
    removeAll: organization => client.delete(`${org(organization)}/iso`),
    watch: (organization, name) => client.post(`${iso(organization, name)}/watch`, {}),
    unwatch: (organization, name) => client.delete(`${iso(organization, name)}/watch`),
    watches: () => client.get('/api/user/iso-watches'),
  },
  versions: {
    list: (organization, name) => client.get(`${iso(organization, name)}/version`),
    get: (organization, name, number) => client.get(version(organization, name, number)),
    create: (organization, name, body) => client.post(`${iso(organization, name)}/version`, body),
    update: (organization, name, number, body) =>
      client.put(version(organization, name, number), body),
    remove: (organization, name, number) => client.delete(version(organization, name, number)),
  },
  files: {
    info: (organization, name, number, architectureName) =>
      client.get(`${file(organization, name, number, architectureName)}/info`),
    upload: (organization, name, number, architectureName, isoFile, onUploadProgress) =>
      client.post(`${file(organization, name, number, architectureName)}/upload`, isoFile, {
        contentType: 'octet-stream',
        headers: { 'x-file-name': isoFile.name },
        onUploadProgress,
      }),
    downloadLink: (organization, name, number, architectureName) =>
      client
        .post(`${file(organization, name, number, architectureName)}/get-download-link`, {})
        .then(data => data.downloadUrl),
    download: (organization, name, number, architectureName) =>
      client.get(`${file(organization, name, number, architectureName)}/download`, {
        responseType: 'blob',
      }),
    remove: (organization, name, number, architectureName) =>
      client.delete(`${file(organization, name, number, architectureName)}/delete`),
  },
};
