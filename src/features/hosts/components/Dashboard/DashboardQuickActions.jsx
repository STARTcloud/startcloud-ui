import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaGear, FaList, FaPlus, FaServer } from 'react-icons/fa6';

import { hostHasFeature } from '../../utils/capabilities';
import { hostLabel } from '../../utils/hosts';
import { hostCreates } from '../../utils/machineCreate';
import { nounKeyOf } from '../../utils/machines';
import UsageBar from '../UsageBar';

const PERCENT = 100;

const ZoneDistribution = ({ results, summary, label }) => {
  const { t } = useTranslation();
  const answered = results.filter(result => result.success && result.data);
  if (answered.length === 0) {
    return (
      <div className="text-center text-muted">
        <p className="mb-0">
          {t('dashboard.quickActions.noDataAvailable', { label: label.toLowerCase() })}
        </p>
      </div>
    );
  }
  return (
    <div data-panel="distribution">
      {answered.map(result => {
        const count = result.data.allmachines?.length || 0;
        const running = result.data.runningmachines?.length || 0;
        const percent = summary.totalZones > 0 ? (count / summary.totalZones) * PERCENT : 0;
        const noun = t(nounKeyOf([result.server], true)).toLowerCase();
        return (
          <div key={String(result.server.id)} data-host={String(result.server.id)}>
            <UsageBar
              name={`distribution-${result.server.id}`}
              icon={<FaServer />}
              label={hostLabel(result.server)}
              summary={`${count} ${noun}`}
              percent={percent}
              segments={[{ key: 'machines', percent, tone: 'primary' }]}
            />
            <p className="small text-muted mt-n2 mb-3">
              {t('dashboard.quickActions.machineStatus', {
                runningCount: running,
                stoppedCount: count - running,
              })}
            </p>
          </div>
        );
      })}
      <hr className="my-3" />
      <div className="text-center">
        <p className="text-uppercase small fw-semibold text-muted mb-1">
          {t('dashboard.quickActions.totalInfrastructure')}
        </p>
        <p className="h5 mb-1">
          {summary.totalZones} {label}
        </p>
        <p className="small text-muted mb-0">
          {t('dashboard.quickActions.acrossActiveHosts', { onlineServers: summary.onlineServers })}
        </p>
      </div>
    </div>
  );
};

ZoneDistribution.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  summary: PropTypes.shape({
    totalZones: PropTypes.number.isRequired,
    onlineServers: PropTypes.number.isRequired,
  }).isRequired,
  label: PropTypes.string.isRequired,
};

const ActionButton = ({ action, variant, icon: Icon, label, onClick }) => (
  <div className="col-12 col-sm-6">
    <button
      type="button"
      className={`btn btn-${variant} w-100`}
      data-action={action}
      onClick={onClick}
    >
      <Icon className="me-2" aria-hidden="true" />
      {label}
    </button>
  </div>
);

ActionButton.propTypes = {
  action: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The quick actions of the dashboard, hyperweaver-ui's: New machine while
 * a host offers the create wizard, Manage machines while a host lists
 * `machines`, Add host on the server role alone and Settings, each a
 * door to a page of this build; beside them the distribution of the
 * machines over the hosts, one bar a host, while a host lists
 * `machines`, every word the noun the hosts' hypervisors fix.
 */
const DashboardQuickActions = ({
  results,
  summary,
  servers,
  role = '',
  addHost,
  onNavigateCreate,
  onNavigateMachines,
  onNavigateAddHost,
  onNavigateSettings,
}) => {
  const { t } = useTranslation();
  const plural = t(nounKeyOf(servers, true));
  const singular = t(nounKeyOf(servers));
  const machinesAvailable = servers.some(server => hostHasFeature(server, 'machines'));
  const createAvailable = servers.some(server => hostCreates(server, role));

  return (
    <div className="row g-3 mb-3" data-panel="quick-actions">
      <div className={machinesAvailable ? 'col-12 col-lg-8' : 'col-12'}>
        <div className="card h-100">
          <div className="card-body">
            <h2 className="h4 mb-4">{t('dashboard.quickActions.title')}</h2>
            <div className="row g-3">
              {machinesAvailable && createAvailable ? (
                <ActionButton
                  action="new-machine"
                  variant="primary"
                  icon={FaPlus}
                  label={t('dashboard.quickActions.createNew', { singular })}
                  onClick={onNavigateCreate}
                />
              ) : null}
              {machinesAvailable ? (
                <ActionButton
                  action="manage-machines"
                  variant="info"
                  icon={FaList}
                  label={t('dashboard.quickActions.manage', { plural })}
                  onClick={onNavigateMachines}
                />
              ) : null}
              {addHost ? (
                <ActionButton
                  action="add-host"
                  variant="success"
                  icon={FaServer}
                  label={t('dashboard.quickActions.addNewHost')}
                  onClick={onNavigateAddHost}
                />
              ) : null}
              <ActionButton
                action="settings"
                variant="secondary"
                icon={FaGear}
                label={t('dashboard.quickActions.settings')}
                onClick={onNavigateSettings}
              />
            </div>
          </div>
        </div>
      </div>
      {machinesAvailable ? (
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4 mb-4">{t('dashboard.quickActions.distribution', { singular })}</h2>
              <ZoneDistribution results={results} summary={summary} label={plural} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

DashboardQuickActions.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  summary: PropTypes.shape({
    totalZones: PropTypes.number.isRequired,
    onlineServers: PropTypes.number.isRequired,
  }).isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  role: PropTypes.string,
  addHost: PropTypes.bool.isRequired,
  onNavigateCreate: PropTypes.func.isRequired,
  onNavigateMachines: PropTypes.func.isRequired,
  onNavigateAddHost: PropTypes.func.isRequired,
  onNavigateSettings: PropTypes.func.isRequired,
};

export default DashboardQuickActions;
