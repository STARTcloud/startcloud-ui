import PropTypes from 'prop-types';

import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const APPLICATIONS = '/api/user/applications';
const APPS = '/api/user/integrations/apps';

const at = (...segments) => `${APPS}${encodePath(...segments)}`;

export const listApplications = () => client.get(APPLICATIONS);

export const revokeApp = clientId => client.delete(at(clientId));

export const removeAppScope = (clientId, scope) => client.delete(at(clientId, 'scopes', scope));

/**
 * The identity provider's `applications` adapter: the read of the
 * estate's applications the person authorized, `GET /api/user/applications`,
 * and the two writes of the identity contract's group 4 under
 * `/api/user/integrations/apps`, the revoke and the scope removal.
 */
export const issuerApplications = {
  list: listApplications,
  revoke: revokeApp,
  removeScope: removeAppScope,
};

export const applicationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  revoke: PropTypes.func.isRequired,
  removeScope: PropTypes.func.isRequired,
});
