import PropTypes from 'prop-types';

import { client } from '../../../lib/runtime';

export const acceptedTerms = () => client.get('/api/user/terms');

/**
 * The identity provider's `terms` adapter: the one read of the terms and
 * policies the person accepted across the estate's applications,
 * `GET /api/user/terms`.
 */
export const issuerTerms = { list: acceptedTerms };

export const termsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
});
