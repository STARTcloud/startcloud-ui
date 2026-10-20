import { encodePath } from '../../../lib/apiClient';
import { client, hubClient } from '../../../lib/runtime';

const rowPath = id => encodePath('api', 'certs', id);

const PUBLIC = { auth: false };

export const fetchCerts = organization =>
  client.get('/api/certs', organization ? { params: { organization } } : {});

export const fetchCert = id => client.get(rowPath(id));

export const createCert = body => client.post('/api/certs', body);

export const updateCert = (id, body) => client.put(rowPath(id), body);

export const removeCert = id => client.delete(rowPath(id));

/**
 * The identity provider's own status, `GET /api/status` at the issuer,
 * read without a session.
 *
 * @returns {Promise<Object>} The status payload
 */
export const fetchIdpStatus = () => hubClient.get('/api/status', PUBLIC);

/**
 * The rows of the identity provider's store, `GET /api/certs` at the
 * issuer under the person's token, narrowed to one organization where
 * given.
 *
 * @param {string} organization - The organization, empty for the person's own rows
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchIdpCerts = organization =>
  hubClient.get('/api/certs', organization ? { params: { organization } } : {});

export const createIdpCert = body => hubClient.post('/api/certs', body);

export const updateIdpCert = (id, body) => hubClient.put(rowPath(id), body);

export const removeIdpCert = id => hubClient.delete(rowPath(id));
