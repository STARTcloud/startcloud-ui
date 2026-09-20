import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

import { exportUrl } from './activity';

const user = userId => encodePath('api', 'admin', 'users', userId);

const organization = organizationId => encodePath('api', 'admin', 'organizations', organizationId);

const rateLimitOf = userId => encodePath('api', 'admin', 'rate-limit', userId);

export const users = params => client.get('/api/admin/users', { params });

export const getUser = userId => client.get(user(userId));

export const roles = () => client.get('/api/admin/roles');

export const updateUser = (userId, patch) => client.patch(user(userId), patch);

export const updateUserAddress = (userId, body) => client.put(`${user(userId)}/address`, body);

export const setUserEmail = (userId, email) => client.put(`${user(userId)}/email`, { email });

export const setUserPhone = (userId, mobileNumber) =>
  client.put(`${user(userId)}/phone`, { mobile_number: mobileNumber });

export const updateUserPreferences = (userId, patch) =>
  client.patch(`${user(userId)}/preferences`, patch);

export const userTfaMethods = userId => client.get(`${user(userId)}/tfa/methods`);

export const removeUserTfaMethod = (userId, methodId) =>
  client.delete(`${user(userId)}${encodePath('tfa', 'methods', methodId)}`);

export const placesKey = () => client.get('/api/config/places');

export const setRoles = (userId, roleNames) =>
  client.put(`${user(userId)}/roles`, { roles: roleNames });

export const deleteUser = userId => client.delete(user(userId));

export const bulk = body => client.post('/api/admin/users/bulk', body);

export const rateLimit = userId => client.get(rateLimitOf(userId));

export const unlockSignIn = userId => client.post(`${rateLimitOf(userId)}/unlock`, {});

export const unlockMethod = (userId, method) =>
  client.post(`${rateLimitOf(userId)}/tfa-unlock`, { method });

export const ban = userId => client.post(`${rateLimitOf(userId)}/ban`, {});

export const unban = userId => client.post(`${rateLimitOf(userId)}/unban`, {});

export const organizations = () => client.get('/api/admin/organizations');

export const updateOrganization = (organizationId, patch) =>
  client.patch(organization(organizationId), patch);

export const deleteOrganization = organizationId => client.delete(organization(organizationId));

export const organizationsBulk = body => client.post('/api/admin/organizations/bulk', body);

/**
 * The identity provider's own `users` adapter of the shared Users page
 * and the user record page: the paged list, the single record by id, the
 * role catalog, the record patch, the whole-set roles write, suspend and
 * resume as `enabled` patches, the stepped-up delete, the bulk route, the
 * rate-limit gates and the export URL of the panel's action; the record
 * page's writes over another account, every one behind the step-up
 * window and refused `403 own_account` on the admin's own id: the detail
 * members and `password_change_required` through `update`, the address
 * `PUT`, the email `PUT` (`409` on a taken address), the plain phone
 * `PUT`, the preferences `PATCH` (language, theme, timezone, region,
 * ciba_channel) and, under `tfa`, the read of the account's second-factor
 * methods (passkeys included, no step-up) and the `DELETE` of an SMS or
 * APP method (`409 last_method` on the last while two-factor is on);
 * `places` answers the Google Places key the address block loads with.
 * The page draws an action or a column only while the adapter carries
 * its call.
 */
export const issuerUsers = {
  list: users,
  get: getUser,
  roles,
  update: updateUser,
  address: updateUserAddress,
  email: setUserEmail,
  phone: setUserPhone,
  preferences: updateUserPreferences,
  tfa: { methods: userTfaMethods, remove: removeUserTfaMethod },
  places: placesKey,
  setRoles,
  suspend: userId => updateUser(userId, { enabled: false }),
  resume: userId => updateUser(userId, { enabled: true }),
  remove: deleteUser,
  bulk,
  rateLimit: { read: rateLimit, unlockSignIn, unlockMethod, ban, unban },
  exportUrl: params => exportUrl('users', params),
};

/**
 * The identity provider's own `organizations` adapter of the shared All
 * organizations page: the list with every editable field riding it, the
 * record patch, the delete and the bulk route; suspend and resume are the
 * bulk route's on the issuer, so the adapter carries no per-row pair.
 */
export const issuerOrganizations = {
  list: organizations,
  update: updateOrganization,
  remove: deleteOrganization,
  bulk: organizationsBulk,
};
