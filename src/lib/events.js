/**
 * The session bus every estate app shares: `login` when a session was
 * established by the app's own page, `logout` when a call decided the
 * session is invalid, `sessionEnded` with the page to return to when the
 * session died outside the app, and whatever else an app emits.
 *
 * @returns {{ on: (event: string, callback: Function) => () => void, emit: (event: string, detail?: unknown) => void, endSession: (detail?: { returnTo?: string }) => void }} The bus
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

  const emit = (event, detail = null) => {
    [...(listeners.get(event) || [])].forEach(callback => callback(detail));
  };

  const endSession = ({ returnTo = `${window.location.pathname}${window.location.search}` } = {}) =>
    emit('sessionEnded', { returnTo });

  return { on, emit, endSession };
};
