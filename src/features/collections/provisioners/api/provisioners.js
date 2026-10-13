import { client } from '../../../../lib/runtime';

const AS_PERSON = { skipAuthRefresh: true };
const WATCHES_PATH = '/api/watches';

/**
 * Every catalog call, one line each over the API client against the
 * host's `/api/*` surface; every call resolves to the response body and
 * rejects with `ApiError`. The catalog and its health carry the person's
 * token whenever the session holds one and go anonymous otherwise, a
 * `401` there never ending the session.
 */
export const api = {
  catalog: {
    public: () => client.get('/api/catalog', AS_PERSON),
    health: () => client.get('/api/catalog/health', AS_PERSON),
  },
  watches: {
    list: () => client.get(WATCHES_PATH),
    add: id => client.post(WATCHES_PATH, { id }),
    remove: id => client.delete(WATCHES_PATH, { params: { id } }),
  },
  rebuild: {
    start: () => client.post('/api/admin/rebuild'),
  },
};
