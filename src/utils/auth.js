import PropTypes from 'prop-types';

import { rules as hostRules } from '../lib/runtime';

const DEFAULT_PASSWORD_MINIMUM = 15;

/**
 * The app's side of the shared sign-in, registration and invitation pages:
 * the backend calls those pages make and the two localStorage keys they
 * remember the chosen sign-in method and the one silent SSO attempt under.
 */
export const authShape = PropTypes.shape({
  methods: PropTypes.func.isRequired,
  register: PropTypes.func.isRequired,
  validateInvitation: PropTypes.func.isRequired,
  acceptInvitation: PropTypes.func.isRequired,
  loginMethodKey: PropTypes.string.isRequired,
  silentSsoKey: PropTypes.string.isRequired,
});

export const returnToShape = PropTypes.shape({
  remember: PropTypes.func.isRequired,
  consume: PropTypes.func.isRequired,
  fromParams: PropTypes.func.isRequired,
  onAuthPage: PropTypes.func.isRequired,
  signInTo: PropTypes.func.isRequired,
});

const HIDE_PARAM = 'hide';

const hiddenSet = params =>
  new Set(
    (params?.get(HIDE_PARAM) || '')
      .split(',')
      .map(token => token.trim())
      .filter(Boolean)
  );

/**
 * The three sign-in affordances a host may close, answered for the page
 * being drawn: Create an account, Forgot password and the emailed
 * sign-in link. Each is open unless the methods answer says otherwise or
 * the login address names it in `hide`, the comma list a client composes
 * from its own configuration the way it already composes
 * `oidc_provider`; registration alone is closed until the answer opens
 * it, as it has always been. The list hides a control, it does not
 * forbid the act, so a host that must refuse one refuses it on its own
 * routes as well.
 *
 * @param {Object} options - The page's side
 * @param {Object|null} [options.answer] - The methods answer
 * @param {URLSearchParams|null} [options.params] - The login address's query
 * @returns {{ registration: boolean, passwordReset: boolean, signInLink: boolean }}
 */
export const signInAffordances = ({ answer = null, params = null }) => {
  const hidden = hiddenSet(params);
  return {
    registration: Boolean(answer?.local_registration_enabled) && !hidden.has('registration'),
    passwordReset: answer?.password_reset_enabled !== false && !hidden.has('password_reset'),
    signInLink: answer?.sign_in_link_enabled !== false && !hidden.has('sign_in_link'),
  };
};

export const sortMethodsByDefault = (methods, defaultProvider) => {
  if (!defaultProvider) {
    return methods;
  }
  const defaultId = `oidc-${defaultProvider}`;
  return [...methods].sort((a, b) => {
    if (a.id === defaultId) {
      return -1;
    }
    if (b.id === defaultId) {
      return 1;
    }
    return 0;
  });
};

export const readStoredLoginMethod = key =>
  localStorage.getItem(key) === 'password' ? 'password' : 'sso';

export const storeLoginMethod = (key, method) => {
  localStorage.setItem(key, method);
};

/**
 * The minimum length the issuer publishes for a password, 15 by default.
 * @returns {number}
 */
export const passwordMinimum = () =>
  hostRules?.forms?.password?.properties?.password?.minLength || DEFAULT_PASSWORD_MINIMUM;
