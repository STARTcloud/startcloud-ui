import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const rowPath = id => encodePath('api', 'certs', id);

export const fetchCerts = organization =>
  client.get('/api/certs', organization ? { params: { organization } } : {});

export const fetchCert = id => client.get(rowPath(id));

export const createCert = body => client.post('/api/certs', body);

export const updateCert = (id, body) => client.put(rowPath(id), body);

export const removeCert = id => client.delete(rowPath(id));
