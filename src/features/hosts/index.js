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
export const MachinesPage = lazy(() => import('./components/MachinesPage'));
export const ManagePage = lazy(() => import('./components/ManagePage'));
export const NetworkingPage = lazy(() => import('./components/NetworkingPage'));
export const StoragePage = lazy(() => import('./components/StoragePage'));
export const DevicesPage = lazy(() => import('./components/DevicesPage'));
export const AgentSettings = lazy(() => import('./components/AgentSettings'));
export const DashboardPage = lazy(() => import('./components/Dashboard'));
export const StandaloneConsole = lazy(() => import('./components/StandaloneConsole'));
export const StandaloneRdpConsole = lazy(() => import('./components/StandaloneRdpConsole'));
