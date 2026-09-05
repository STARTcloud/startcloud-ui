import { client } from '../../../lib/runtime';

export const getFavorites = () => client.get('/api/favorites');

export const saveFavorites = favorites => client.post('/api/favorites/save', favorites);
