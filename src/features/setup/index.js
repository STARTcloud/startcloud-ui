import { lazy } from 'react';

export { setupApi } from './api/setup';
export { setupShape } from './shape';

export const SetupPage = lazy(() => import('./components/SetupPage'));
export const ServerSetup = lazy(() => import('./components/ServerSetup'));
export const ZoneRegister = lazy(() => import('./components/ZoneRegister'));
