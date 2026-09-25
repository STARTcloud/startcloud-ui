import { lazy } from 'react';

export {
  applicationsShape,
  issuerApplications,
  listApplications,
  removeAppScope,
  revokeApp,
} from './api/applications';

export const ApplicationsPage = lazy(() => import('./components/ApplicationsPage'));
