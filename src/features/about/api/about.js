import { hubClient } from '../../../lib/runtime';

const FAVORITES = '/api/user/favorites';

export const getFavorites = () => hubClient.get(FAVORITES);

export const saveFavorites = favorites => hubClient.put(FAVORITES, favorites);
