import { lazy } from 'react';

export {
  fetchFleet,
  fetchGrafana,
  fetchHistory,
  fetchPools,
  fetchStats,
  fetchVm,
} from './api/fleet';
export { sidebar } from './sidebar';

export const FleetPage = lazy(() => import('./components/FleetPage'));
export const VmPage = lazy(() => import('./components/VmPage'));
