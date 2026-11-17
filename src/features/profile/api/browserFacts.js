import { hubClient } from '../../../lib/runtime';

const PREFERENCES = '/api/user/preferences';
const GEO = '/api/public/geo/country';
const PUBLIC = { auth: false };

/**
 * The identity provider's reads and writes the browser-facts hook uses,
 * each through the hub client, the issuer itself on an `idp` host and the
 * serving origin on a `cookie` one: the account's preferences, their
 * patch, and the country of the request, read with no session.
 */
export const browserFactsApi = {
  read: () => hubClient.get(PREFERENCES),
  save: patch => hubClient.patch(PREFERENCES, patch),
  geo: () => hubClient.get(GEO, PUBLIC),
};
