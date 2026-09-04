import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useContext } from 'react';

const StatusContext = createContext(null);

/**
 * The hosting backend's answer to `GET /api/status`, asked of the origin
 * that served the page before anything is rendered: `role` names the app
 * to boot and `version` is the backend's own version.
 *
 * @returns {Promise<{ role: string, version: string }>} The status payload
 */
export const probeStatus = () => axios.get('/api/status').then(({ data }) => data);

export const statusShape = PropTypes.shape({
  role: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
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
 * @returns {{ role: string, version: string }} The payload from `probeStatus`
 */
export const useStatus = () => useContext(StatusContext);
