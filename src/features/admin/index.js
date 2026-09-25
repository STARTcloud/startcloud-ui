import { lazy } from 'react';

export {
  adminConfig,
  resumeUser,
  roleNames,
  setUserRoles,
  storage,
  suspendUser,
  updateStatus,
} from './api/admin';
export { sidebar } from './sidebar';
export { organizationBodyOf, organizationRowOf, pageOf, usersOf } from './utils/accounts';

export const AdminPage = lazy(() => import('./components/AdminPage'));
