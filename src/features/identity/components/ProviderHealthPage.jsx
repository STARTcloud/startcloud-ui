import HealthPage from './HealthPage';

/**
 * Health › Provider health: the shared `HealthPage` over the `providers`
 * of `GET /api/admin/client-health`, its preferences under
 * `table_prefs_admin_provider_health`.
 */
const ProviderHealthPage = () => <HealthPage kind="provider" />;

export default ProviderHealthPage;
