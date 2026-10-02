import { lazy } from 'react';

export { hasServerFault } from './utils/fault';

export const ErrorPage = lazy(() => import('./components/ErrorPage'));
