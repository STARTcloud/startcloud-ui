import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };
const WATCHES_PATH = '/api/watches';

/**
 * Every catalog call, one line each over the API client against the
 * host's `/api/*` surface; every call resolves to the response body and
 * rejects with `ApiError`.
 */
export const api = {
  catalog: {
    public: () => client.get('/api/catalog', PUBLIC),
    health: () => client.get('/api/catalog/health', PUBLIC),
    privateCatalog: uuid => client.get(encodePath('api', 'private', uuid, 'catalog')),
    privateHealth: uuid => client.get(encodePath('api', 'private', uuid, 'health')),
  },
  watches: {
    list: () => client.get(WATCHES_PATH),
    add: id => client.post(WATCHES_PATH, { id }),
    remove: id => client.delete(WATCHES_PATH, { params: { id } }),
  },
  rebuild: {
    start: () => client.post('/api/admin/rebuild'),
    status: () => client.get('/api/admin/rebuild/status'),
  },
  config: () => client.get('/api/config', PUBLIC),
};
