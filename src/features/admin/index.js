import { lazy } from 'react';

export {
  adminConfig,
  appUpdate,
  resumeUser,
  roleNames,
  setUserRoles,
  storage,
  suspendUser,
} from './api/admin';
export { searchKinds, sidebar } from './sidebar';
export { organizationBodyOf, organizationRowOf, pageOf, usersOf } from './utils/accounts';

export const AdminPage = lazy(() => import('./components/AdminPage'));
