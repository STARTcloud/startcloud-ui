import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { useStatus } from '../../../contexts/StatusContext';
import { SELF, isServerRole } from '../utils/hosts';

import { useServers } from './useServers';

const HOST_ROUTE = { path: '/hosts/:id', end: false };

const featuresOf = server => {
  const features = server?.capabilities?.features;
  return Array.isArray(features) ? features : [];
};

const oneHost = (id, server) => ({
  kind: 'host',
  key: `host:${id}`,
  id,
  server,
  features: featuresOf(server),
  hosts: [],
});

/**
 * The host in focus of the navbar contract's Footer status section: on an
 * agent role the one serving agent on every route, its tokens the
 * status's own; on the server role the host the route names, `/hosts/{id}`
 * and below, its tokens the registry row's `capabilities.features`, and
 * with no host in the route every host whose row lists `tasks`, `kind`
 * reading `all`. `key` names the focus, so a read is made again only when
 * the focus itself changed.
 *
 * @param {Object} options - The status, the servers of `useServers` and the pathname
 * @returns {{ kind: string, key: string, id: string, server: Object|null, features: Array<string>, hosts: Array<Object> }} The focus
 */
export const focusOf = ({ status, servers, pathname }) => {
  if (!isServerRole(status)) {
    return oneHost(SELF, servers[0] || null);
  }
  const match = matchPath(HOST_ROUTE, pathname);
  if (match) {
    const { id } = match.params;
    return oneHost(id, servers.find(row => String(row.id) === id) || null);
  }
  const hosts = servers.filter(row => featuresOf(row).includes('tasks'));
  return {
    kind: 'all',
    key: `all:${hosts.map(row => row.id).join(',')}`,
    id: '',
    server: null,
    features: [],
    hosts,
  };
};

/**
 * The host in focus for the route the person stands on, from the status,
 * the servers of `useServers` and the router's location.
 *
 * @returns {Object} The focus of `focusOf`
 */
export const useFocus = () => {
  const status = useStatus();
  const { pathname } = useLocation();
  const { servers } = useServers();
  return useMemo(() => focusOf({ status, servers, pathname }), [status, servers, pathname]);
};
