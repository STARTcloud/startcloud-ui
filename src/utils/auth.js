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

/**
 * The sign-in affordances a host may close, answered per Host by the
 * methods answer for the page being drawn: Create an account, Forgot
 * password, the emailed sign-in link and Keep me logged in. Registration
 * is closed until `local_registration_enabled` opens it, as it has always
 * been; the others are open unless `password_reset_enabled`,
 * `sign_in_link_enabled` or `remember_me_enabled` says false, each the
 * answer's word for a client's `hide-*` key. The answer hides a control,
 * it does not forbid the act, so a host that must refuse one refuses it on
 * its own routes as well.
 *
 * @param {Object|null} answer - The methods answer
 * @returns {{ registration: boolean, passwordReset: boolean, signInLink: boolean, rememberMe: boolean }}
 */
export const signInAffordances = answer => ({
  registration: Boolean(answer?.local_registration_enabled),
  passwordReset: answer?.password_reset_enabled !== false,
  signInLink: answer?.sign_in_link_enabled !== false,
  rememberMe: answer?.remember_me_enabled !== false,
});

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
