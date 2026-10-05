const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

const CODE_SSO_TOKEN = 'oidc-code';

const listOf = value => (Array.isArray(value) ? value : []);

/**
 * The sign-ins of an agent the status lists, hyperweaver-agent's paths
 * behind its words: the pasted key, the tray hand-off and the desktop
 * sign-in while the first word of `auth` is `apikey`; the federated
 * sign-in, the silent probe and the authorization-code flow with a
 * pasted code, while its second word is `oidc` and `features` lists
 * `oidc-code`; and the first-boot bootstrap while the status says
 * `bootstrapAvailable`.
 *
 * @param {Object|null} status - The payload from `probeStatus`
 * @returns {{ apiKey: boolean, sso: boolean, tray: boolean, bootstrap: boolean }} The sign-ins
 */
export const agentSignInsOf = status => {
  const auth = listOf(status?.auth);
  const apiKey = auth[0] === 'apikey';
  return {
    apiKey,
    sso: apiKey && auth.includes('oidc') && listOf(status?.features).includes(CODE_SSO_TOKEN),
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
