import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

import { uploadChunked } from './uploadChunked';

const PUBLIC = { auth: false };

const org = organization => encodePath('api', 'organization', organization);
const box = (organization, name) => `${org(organization)}${encodePath('box', name)}`;
const version = (organization, name, number) =>
  `${box(organization, name)}${encodePath('version', number)}`;
const provider = (organization, name, number, providerName) =>
  `${version(organization, name, number)}${encodePath('provider', providerName)}`;
const architecture = (organization, name, number, providerName, architectureName) =>
  `${provider(organization, name, number, providerName)}${encodePath('architecture', architectureName)}`;

const fileInfo = (organization, name, number, providerName, architectureName) =>
  client.get(
    `${architecture(organization, name, number, providerName, architectureName)}/file/info`
  );

const uploadBoxFile = (file, options, onUploadProgress) => {
  const { organization, name, version: number, provider: providerName } = options;
  const { architecture: architectureName, checksum, checksumType } = options;
  return uploadChunked({
    client,
    path: `${architecture(organization, name, number, providerName, architectureName)}/file/upload`,
    file,
    checksum,
    checksumType,
    info: () => fileInfo(organization, name, number, providerName, architectureName),
    onUploadProgress,
  });
};

/**
 * Every box call, one line each over the API client; every call resolves
 * to the response body and rejects with `ApiError`. Paths are built from
 * raw names through `encodePath`.
 */
export const api = {
  boxes: {
    discover: () => client.get('/api/discover'),
    list: organization => client.get(`${org(organization)}/box`),
    get: (organization, name) => client.get(box(organization, name)),
    create: (organization, body) => client.post(`${org(organization)}/box`, body),
    update: (organization, name, body) => client.put(box(organization, name), body),
    remove: (organization, name) => client.delete(box(organization, name)),
    removeAll: organization => client.delete(`${org(organization)}/box`),
    watch: (organization, name) => client.post(`${box(organization, name)}/watch`, {}),
    unwatch: (organization, name) => client.delete(`${box(organization, name)}/watch`),
    watches: () => client.get('/api/user/watches'),
  },
  versions: {
    list: (organization, name) => client.get(`${box(organization, name)}/version`),
    get: (organization, name, number) => client.get(version(organization, name, number)),
    create: (organization, name, body) => client.post(`${box(organization, name)}/version`, body),
    update: (organization, name, number, body) =>
      client.put(version(organization, name, number), body),
    remove: (organization, name, number) => client.delete(version(organization, name, number)),
  },
  providers: {
    list: (organization, name, number) =>
      client.get(`${version(organization, name, number)}/provider`),
    get: (organization, name, number, providerName) =>
      client.get(provider(organization, name, number, providerName)),
    create: (organization, name, number, body) =>
      client.post(`${version(organization, name, number)}/provider`, body),
    update: (organization, name, number, providerName, body) =>
      client.put(provider(organization, name, number, providerName), body),
    remove: (organization, name, number, providerName) =>
      client.delete(provider(organization, name, number, providerName)),
  },
  architectures: {
    list: (organization, name, number, providerName) =>
      client.get(`${provider(organization, name, number, providerName)}/architecture`),
    create: (organization, name, number, providerName, body) =>
      client.post(`${provider(organization, name, number, providerName)}/architecture`, body),
    remove: (organization, name, number, providerName, architectureName) =>
      client.delete(architecture(organization, name, number, providerName, architectureName)),
  },
  files: {
    info: fileInfo,
    remove: (organization, name, number, providerName, architectureName) =>
      client.delete(
        `${architecture(organization, name, number, providerName, architectureName)}/file/delete`
      ),
    downloadLink: (organization, name, number, providerName, architectureName) =>
      client
        .post(
          `${architecture(organization, name, number, providerName, architectureName)}/file/get-download-link`,
          {}
        )
        .then(data => data.downloadUrl),
    upload: uploadBoxFile,
  },
  config: {
    hyperweaver: () => client.get('/api/config/hyperweaver', PUBLIC),
  },
};
