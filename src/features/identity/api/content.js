import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const term = name => encodePath('api', 'admin', 'terms', name);

export const terms = () => client.get('/api/admin/terms');

export const placeholders = () => client.get('/api/admin/terms/placeholders');

export const createTerm = body => client.post('/api/admin/terms', body);

export const updateTerm = (name, patch) => client.patch(term(name), patch);

export const deleteTerm = name => client.delete(term(name));

export const reorderTerms = names => client.put('/api/admin/terms/order', { names });
