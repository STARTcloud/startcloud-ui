/**
 * The session bus every estate app shares: `login` when a session was
 * established by the app's own page or a change the profile must reflect,
 * `logout` when a call decided the session is invalid, `sessionEnded` with
 * the page to return to when the session died outside the app, and
 * whatever else an app emits. `emit` answers a promise over what every
 * listener returned, so an emitter awaits the hook's adoption before it
 * moves the page, and `endSession` answers the same promise for
 * `sessionEnded`.
 *
 * @returns {{ on: (event: string, callback: Function) => () => void, emit: (event: string, detail?: unknown) => Promise<unknown[]>, endSession: (detail?: { returnTo?: string }) => Promise<unknown[]> }} The bus
 */
export const createSessionEvents = () => {
  const listeners = new Map();

  const on = (event, callback) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);
    return () => {
      listeners.get(event)?.delete(callback);
    };
  };

  const emit = (event, detail = null) =>
    Promise.all([...(listeners.get(event) || [])].map(callback => callback(detail)));

  const endSession = ({ returnTo = `${window.location.pathname}${window.location.search}` } = {}) =>
    emit('sessionEnded', { returnTo });

  return { on, emit, endSession };
};
