import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

export const bruteForce = () => client.get('/api/admin/brute-force');

export const unblock = ip => client.delete(encodePath('api', 'admin', 'brute-force', ip));

export const unblockAll = () => client.delete('/api/admin/brute-force');

export const unblockBulk = addresses =>
  client.post('/api/admin/brute-force/bulk', { action: 'unblock', addresses });
