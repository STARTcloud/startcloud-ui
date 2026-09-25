import { lazy } from 'react';

export { acceptedTerms, issuerTerms, termsShape } from './api/terms';

export const UserTermsPage = lazy(() => import('./components/UserTermsPage'));
