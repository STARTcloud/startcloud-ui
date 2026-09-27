import { lazy } from 'react';

export {
  SELF,
  agentPath,
  fetchAgentStatus,
  fetchMachines,
  fetchServers,
  fetchStats,
  isServerRole,
} from './api/agents';
export { actionMenu } from './actionMenu';
export { apiReference } from './apiReference';
export { default as ServersProvider } from './components/ServersProvider';
export { footerPane } from './footerPane';
export { sidebar } from './sidebar';
export { filtersByOrganization } from './utils/organizations';

export const HostsPage = lazy(() => import('./components/HostsPage'));
export const HostPage = lazy(() => import('./components/HostPage'));
export const MachinePage = lazy(() => import('./components/MachinePage'));
