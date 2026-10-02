import { lazy } from 'react';

export {
  connectIntegration,
  disconnectIntegration,
  integrationsShape,
  issuerIntegrations,
  listIntegrations,
  saveIntegration,
} from './api/integrations';
export {
  default as HyperweaverServiceCard,
  hyperweaverServiceOf,
} from './components/HyperweaverServiceCard';

export const IntegrationsPage = lazy(() => import('./components/IntegrationsPage'));

export const HyperweaverServicePage = lazy(() => import('./components/HyperweaverServicePage'));
