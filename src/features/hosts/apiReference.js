import { matchPath } from 'react-router-dom';

import { hasFeatureStrict } from '../../utils/capabilities';

import { isServerRole } from './utils/hosts';

const AGENT_REFERENCE = '/agent/api-docs';

const HOST_ROUTE = { path: '/hosts/:id', end: false };

/**
 * The hosts feature's `apiReference` export, the API reference rows of
 * the user menu's app section on the `hyperweaver-server` role, as
 * hyperweaver-ui's menu drew them: Server API, the server's own reference
 * at `links.api`, and on a host's route, `/hosts/{id}` and below, Agent
 * API after it, the reference of the host the route names, which the
 * server relays at `/agent/api-docs?server={id}`. Null on every other
 * role, without the `hosts` token and while the server answers no
 * `links.api`, where the shell draws the one API reference row of
 * `links.api` or none.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} pathname - The current path
 * @returns {Array<{ key: string, labelKey: string, href: string }>|null} The rows, or null
 */
export const apiReference = (status, pathname) => {
  const own = status.links?.api || '';
  if (!own || !isServerRole(status) || !hasFeatureStrict(status, 'hosts')) {
    return null;
  }
  const server = { key: 'server-api', labelKey: 'hosts.api.server', href: own };
  const match = matchPath(HOST_ROUTE, pathname);
  if (!match) {
    return [server];
  }
  const id = encodeURIComponent(match.params.id);
  return [
    server,
    { key: 'agent-api', labelKey: 'hosts.api.agent', href: `${AGENT_REFERENCE}?server=${id}` },
  ];
};
