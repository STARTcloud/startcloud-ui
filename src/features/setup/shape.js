import PropTypes from 'prop-types';

/**
 * The app's side of the shared setup page: the setup status, the token
 * check, the configuration files and their schemas read under that token,
 * the write of every file's merge patch, and the one
 * `action(token, route, method, body)` every schema-declared action calls.
 */
export const setupShape = PropTypes.shape({
  status: PropTypes.func.isRequired,
  verify: PropTypes.func.isRequired,
  get: PropTypes.func.isRequired,
  schema: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  action: PropTypes.func.isRequired,
});
