import PropTypes from 'prop-types';

import { client } from '../../../lib/runtime';

export const listIntegrations = () => client.get('/api/user/integrations');

/**
 * The identity provider's `integrations` adapter: the one read of the
 * third-party services connected through the issuer,
 * `GET /api/user/integrations`, answering `services` only while the
 * issuer connects any; the issuer holds no write over a service, which is
 * managed where it lives through its `settings_url`.
 */
export const issuerIntegrations = { list: listIntegrations };

export const integrationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
});
