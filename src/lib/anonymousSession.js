const nothing = () => Promise.resolve(null);

const noop = () => undefined;

/**
 * The session of a host that needs none: everyone sees everything, no
 * sign-in exists, every request carries no headers, and a call that
 * decides the session is gone still ends it on the bus so the API client
 * and the stream keep one contract.
 *
 * @param {Object} options - The app's side of the session
 * @param {Object} options.events - The bus from `createSessionEvents`
 * @returns {Object} The session provider `useSession` drives
 */
export const createAnonymousSession = ({ events }) => ({
  id: 'none',
  issuerUrl: '',
  restore: () => null,
  load: nothing,
  reload: nothing,
  refresh: nothing,
  begin: noop,
  headers: () => Promise.resolve({}),
  retryAuth: () => Promise.resolve(false),
  endSession: () => events.endSession(),
  claims: nothing,
  savePreferences: () => Promise.resolve(),
  signOut: noop,
  signOutEverywhere: () => Promise.resolve(),
});
