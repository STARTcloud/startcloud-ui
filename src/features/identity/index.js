import { lazy } from 'react';

export { issuerOrganizations, issuerUsers } from './api/accounts';
export { IDENTITY_ADMIN_PAGES } from './pages';
export { sidebar } from './sidebar';

export const IdentityAdminPage = lazy(() => import('./components/IdentityAdminPage'));
