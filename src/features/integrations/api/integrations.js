import PropTypes from 'prop-types';

import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const INTEGRATIONS = '/api/user/integrations';

const at = (...segments) => `${INTEGRATIONS}${encodePath(...segments)}`;

export const listIntegrations = () => client.get(INTEGRATIONS);

/**
 * Save a connected service's settings, `PATCH /api/user/integrations/{id}`
 * with the whole `settings` object as the body, the issuer answering the
 * updated row, `422` with `errors[]` pointers on a bad member and `404`
 * for an unknown service.
 *
 * @param {string} id - The service, `hyperweaver`
 * @param {Object} settings - The whole `settings` object
 * @returns {Promise<Object>} The updated row
 */
export const saveIntegration = (id, settings) => client.patch(at(id), settings);

/**
 * Attach a server to a service, `POST /api/user/integrations/{id}/connect`
 * with `{ origin, label }`, the register kind: the first server becomes
 * the default and the deploy target.
 *
 * @param {string} id - The service, `hyperweaver`
 * @param {{ origin: string, label: string }} server - The server typed
 * @returns {Promise<Object>} The row
 */
export const connectIntegration = (id, { origin, label }) =>
  client.post(at(id, 'connect'), { origin, label });

/**
 * Disconnect a service, `DELETE /api/user/integrations/{id}`, `204` done,
 * `404` while not connected.
 *
 * @param {string} id - The service, `hyperweaver`
 * @returns {Promise<void>} Nothing
 */
export const disconnectIntegration = id => client.delete(at(id));

/**
 * The identity provider's `integrations` adapter: the read of the
 * third-party services connected through the issuer,
 * `GET /api/user/integrations`, answering `services` only while the
 * issuer connects any, and the three writes of a service the issuer
 * stores settings for, the whole-settings `save`, the `connect` of a
 * server and the `disconnect`.
 */
export const issuerIntegrations = {
  list: listIntegrations,
  save: saveIntegration,
  connect: connectIntegration,
  disconnect: disconnectIntegration,
};

export const integrationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  save: PropTypes.func,
  connect: PropTypes.func,
  disconnect: PropTypes.func,
});
