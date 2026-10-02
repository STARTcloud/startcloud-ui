const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

const listOf = value => (Array.isArray(value) ? value : []);

/**
 * The sign-ins of an agent the status lists, hyperweaver-agent's six
 * paths behind its words: the pasted key, the tray hand-off and the
 * desktop sign-in while the first word of `auth` is `apikey`, the
 * federated paths, the silent probe and the device flow, while its
 * second word is `oidc`, and the first-boot bootstrap while the status
 * says `bootstrapAvailable`.
 *
 * @param {Object|null} status - The payload from `probeStatus`
 * @returns {{ apiKey: boolean, deviceSso: boolean, tray: boolean, bootstrap: boolean }} The sign-ins
 */
export const agentSignInsOf = status => {
  const auth = listOf(status?.auth);
  const apiKey = auth[0] === 'apikey';
  return {
    apiKey,
    deviceSso: apiKey && auth.includes('oidc'),
    tray: apiKey,
    bootstrap: apiKey && Boolean(status?.bootstrapAvailable),
  };
};

/**
 * Whether the page is served from the machine it runs on, where the
 * `hwa://` desktop handoff can reach the agent.
 *
 * @param {string} hostname - `window.location.hostname`
 * @returns {boolean} True on a loopback host
 */
export const isLoopback = hostname => LOOPBACK_HOSTS.includes(hostname);
