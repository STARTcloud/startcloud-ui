import { lazy } from 'react';

export { setupApi } from './api/setup';
export { setupShape } from './shape';

export const SetupPage = lazy(() => import('./components/SetupPage'));
