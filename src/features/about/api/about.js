import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const fetchPublicContent = lang =>
  client.get('/api/users/all', { ...PUBLIC, params: { lang } });

export const getFavorites = () => client.get('/api/favorites');

export const saveFavorites = favorites => client.post('/api/favorites/save', favorites);
