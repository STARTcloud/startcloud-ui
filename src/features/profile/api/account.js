import { encodePath } from '../../../lib/apiClient';
import { client, hubClient } from '../../../lib/runtime';

const USER = '/api/user';

const at = (...segments) => `${USER}${encodePath(...segments)}`;

export const stepUp = body => client.post(`${USER}/step-up`, body);

export const profile = () => client.get(USER);

export const updateDetails = body => client.patch(USER, body);

export const updateAddress = body => client.put(`${USER}/address`, body);

export const sendPhoneCode = mobileNumber =>
  client.post(`${USER}/phone/send`, { mobile_number: mobileNumber });

export const verifyPhone = (mobileNumber, code) =>
  client.post(`${USER}/phone/verify`, { mobile_number: mobileNumber, code });

export const requestEmailChange = newEmail =>
  client.post(`${USER}/email/request`, { new_email: newEmail });

export const verifyEmailChange = code => client.post(`${USER}/email/verify`, { code });

export const changePassword = body => client.put(`${USER}/password`, body);

export const tfaMethods = () => client.get(`${USER}/tfa/methods`);

export const tfaEnroll = () => client.get(`${USER}/tfa/enroll`);

export const sendTfaSms = mobileNumber =>
  client.post(`${USER}/tfa/sms/send`, { mobile_number: mobileNumber });

export const verifyTfaSms = body => client.post(`${USER}/tfa/sms/verify`, body);

export const verifyTfaApp = body => client.post(`${USER}/tfa/app/verify`, body);

export const preferTfa = body => client.put(`${USER}/tfa/preferred`, body);

export const removeTfaMethod = id => client.delete(at('tfa', 'methods', id));

export const setTfa = body => client.put(`${USER}/tfa`, body);

export const passkeys = () => client.get(`${USER}/passkeys`);

export const passkeyCreationOptions = () => client.post('/webauthn/register/options', null);

export const registerPasskey = body => client.post('/webauthn/register', body);

export const renamePasskey = (id, label) => client.patch(at('passkeys', id), { label });

export const removePasskey = id => client.delete(at('passkeys', id));

export const backupCodesCount = () => client.get(`${USER}/backup-codes/count`);

export const generateBackupCodes = () => client.post(`${USER}/backup-codes`, {});

export const sessions = () => client.get(`${USER}/sessions`);

export const revokeSession = id => client.delete(at('sessions', id));

export const revokeSessions = () => client.delete(`${USER}/sessions`);

export const favorites = () => client.get(`${USER}/favorites`);

/**
 * The favorites the user menu draws, `GET /api/user/favorites` through the
 * hub client: the issuer itself on a `cookie` or `idp` host and the app's
 * own proxying backend on a `backend` host.
 *
 * @returns {Promise<Array>} The ordered favorites
 */
export const menuFavorites = () => hubClient.get(`${USER}/favorites`);

export const saveFavorites = list => client.put(`${USER}/favorites`, list);

export const connectedApps = () => client.get(`${USER}/integrations`).then(data => data.apps || []);

export const savePreferences = patch => client.patch(`${USER}/preferences`, patch);

export const deleteAccount = emailConfirmation =>
  client.post(`${USER}/deletion`, { email_confirmation: emailConfirmation });

export const placesKey = () => client.get('/api/config/places');

/**
 * The identity provider's own `account` adapter of the shared profile
 * page: the reads and writes of the identity contract's group 4 under
 * `/api/user/*`, JSON in snake_case, grouped by the tab that draws them;
 * the page draws a tab only while the adapter carries its calls, so an
 * adapter without `sessions` draws no Sessions tab. `stepUp` arms the
 * five-minute window a sensitive call needs and `places` answers the
 * Google Places key the address block loads its autocomplete with.
 */
export const issuerAccount = {
  profile,
  stepUp,
  details: updateDetails,
  address: updateAddress,
  places: placesKey,
  phone: { send: sendPhoneCode, verify: verifyPhone },
  email: { request: requestEmailChange, verify: verifyEmailChange },
  password: changePassword,
  tfa: {
    methods: tfaMethods,
    enroll: tfaEnroll,
    sms: { send: sendTfaSms, verify: verifyTfaSms },
    app: { verify: verifyTfaApp },
    prefer: preferTfa,
    remove: removeTfaMethod,
    set: setTfa,
  },
  passkeys: {
    list: passkeys,
    rename: renamePasskey,
    remove: removePasskey,
    creationOptions: passkeyCreationOptions,
    register: registerPasskey,
  },
  backupCodes: { count: backupCodesCount, generate: generateBackupCodes },
  sessions: { list: sessions, revoke: revokeSession, revokeAll: revokeSessions },
  favorites: { list: favorites, save: saveFavorites, apps: connectedApps },
  preferences: savePreferences,
  deletion: deleteAccount,
};
