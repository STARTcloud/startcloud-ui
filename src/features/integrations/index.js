import { lazy } from 'react';

export { integrationsShape, issuerIntegrations, listIntegrations } from './api/integrations';

export const IntegrationsPage = lazy(() => import('./components/IntegrationsPage'));
