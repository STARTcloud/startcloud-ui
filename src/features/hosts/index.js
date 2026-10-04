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
export { controlCommands } from './controlCommands';
export { footerPane } from './footerPane';
export { useHostSearchSources } from './hooks/useHostSearch';
export { hostCrumbs, searchKinds } from './pages';
export { sidebar } from './sidebar';
export { filtersByOrganization } from './utils/organizations';

export const HostsPage = lazy(() => import('./components/HostsPage'));
export const HostPage = lazy(() => import('./components/HostPage'));
export const MachinePage = lazy(() => import('./components/MachinePage'));
export const MachinesPage = lazy(() => import('./components/MachinesPage'));
export const HostSectionPage = lazy(() => import('./components/HostSectionPage'));
export const DashboardPage = lazy(() => import('./components/Dashboard'));
export const StandaloneConsole = lazy(() => import('./components/StandaloneConsole'));
export const StandaloneRdpConsole = lazy(() => import('./components/StandaloneRdpConsole'));
