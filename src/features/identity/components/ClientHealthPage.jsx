import HealthPage from './HealthPage';

/**
 * Health › Client health: the shared `HealthPage` over the `clients` of
 * `GET /api/admin/client-health`, its preferences under
 * `table_prefs_admin_client_health`.
 */
const ClientHealthPage = () => <HealthPage kind="client" />;

export default ClientHealthPage;
