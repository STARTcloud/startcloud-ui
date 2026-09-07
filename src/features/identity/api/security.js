import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

export const bruteForce = () => client.get('/api/admin/brute-force');

export const unblock = ip => client.delete(encodePath('api', 'admin', 'brute-force', ip));
