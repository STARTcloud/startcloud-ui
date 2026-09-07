import PropTypes from 'prop-types';

import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const INTEGRATIONS = '/api/user/integrations';

const at = (...segments) => `${INTEGRATIONS}${encodePath(...segments)}`;

export const listIntegrations = () => client.get(INTEGRATIONS);

export const providerStatus = providerId => client.get(at('providers', providerId, 'status'));

export const linkProvider = providerId => client.post(at('providers', providerId, 'link'), {});

export const unlinkProvider = providerId => client.delete(at('providers', providerId));

export const revokeApp = clientId => client.delete(at('apps', clientId));

export const removeAppScope = (clientId, scope) =>
  client.delete(at('apps', clientId, 'scopes', scope));

/**
 * The identity provider's `integrations` adapter: the one read of the
 * linked accounts, the available providers, the accepted terms and the
 * connected applications, the live provider status, and the four writes
 * of the identity contract's group 4 under `/api/user/integrations`.
 */
export const issuerIntegrations = {
  list: listIntegrations,
  providerStatus,
  link: linkProvider,
  unlink: unlinkProvider,
  revokeApp,
  removeScope: removeAppScope,
};

export const integrationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  providerStatus: PropTypes.func.isRequired,
  link: PropTypes.func.isRequired,
  unlink: PropTypes.func.isRequired,
  revokeApp: PropTypes.func.isRequired,
  removeScope: PropTypes.func.isRequired,
});
