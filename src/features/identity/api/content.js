import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const term = name => encodePath('api', 'admin', 'terms', name);

export const terms = () => client.get('/api/admin/terms');

export const placeholders = () => client.get('/api/admin/terms/placeholders');

export const createTerm = body => client.post('/api/admin/terms', body);

const variant = region => ({ params: region ? { region } : undefined });

export const updateTerm = (name, patch, region = '') =>
  client.patch(term(name), patch, variant(region));

export const deleteTerm = (name, region = '') => client.delete(term(name), variant(region));

export const reorderTerms = ids => client.put('/api/admin/terms/order', { ids });
