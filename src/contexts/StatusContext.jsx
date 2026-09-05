import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useContext } from 'react';

const StatusContext = createContext(null);

/**
 * The hosting backend's answer to `GET /api/status`, asked of the origin
 * that served the page before anything is rendered: `role` names the host,
 * `version` is the backend's own version, `brand`, `auth`, `idp`,
 * `collections`, `config`, `events`, `features`, `links` and `ticket`
 * carry the rest of the status contract.
 *
 * @returns {Promise<Object>} The status payload
 */
export const probeStatus = () => axios.get('/api/status').then(({ data }) => data);

export const statusShape = PropTypes.shape({
  role: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  brand: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logoUrl: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
  }),
  auth: PropTypes.arrayOf(PropTypes.string),
  idp: PropTypes.shape({
    issuer: PropTypes.string.isRequired,
    clientId: PropTypes.string.isRequired,
    scopes: PropTypes.string.isRequired,
    storagePrefix: PropTypes.string.isRequired,
  }),
  collections: PropTypes.arrayOf(PropTypes.string),
  config: PropTypes.arrayOf(PropTypes.string),
  events: PropTypes.shape({
    path: PropTypes.string.isRequired,
    topics: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  features: PropTypes.arrayOf(PropTypes.string),
  links: PropTypes.shape({
    docs: PropTypes.string.isRequired,
    contact: PropTypes.string.isRequired,
  }),
  ticket: PropTypes.shape({
    baseUrl: PropTypes.string.isRequired,
    reqType: PropTypes.string.isRequired,
    fallbackCustomerId: PropTypes.string.isRequired,
  }),
});

export const StatusProvider = ({ status, children }) => (
  <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
);

StatusProvider.propTypes = {
  status: statusShape.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The status payload the app booted with.
 *
 * @returns {Object} The payload from `probeStatus`
 */
export const useStatus = () => useContext(StatusContext);
