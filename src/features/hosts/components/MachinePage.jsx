import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import RecordRows from '../../../components/common/RecordRows';
import { useStatus } from '../../../contexts/StatusContext';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostLabel, isRunning, isServerRole } from '../utils/hosts';

const hostPath = id => `/hosts/${id}`;

const labelOf = ({ status, servers, id, stats }) => {
  if (isServerRole(status)) {
    const server = servers.find(row => String(row.id) === String(id));
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

/**
 * One machine at `/hosts/{id}/machines/{name}`: the machine's name as the
 * title and, as record rows, the name, the host as a link back to the
 * host's page and the state, running or stopped, from the host's stats
 * through `useHostStats`; the loading line while the stats have not
 * answered and the danger alert when they failed.
 */
const MachinePage = ({ id, name }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { servers } = useServers(status);
  const { stats, loaded, failed } = useHostStats(status, id);
  const host = labelOf({ status, servers, id, stats });

  useEffect(() => {
    document.title = name;
  }, [name]);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  return (
    <div className="list row">
      <PageHeader title={name} />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
      <RecordRows
        rows={[
          { key: 'name', label: t('hosts.page.name'), value: name },
          {
            key: 'host',
            label: t('hosts.machine.host'),
            value: <Link to={hostPath(id)}>{host}</Link>,
          },
          {
            key: 'state',
            label: t('hosts.machine.state'),
            value: t(isRunning(stats, name) ? 'hosts.state.running' : 'hosts.state.stopped'),
          },
        ]}
      />
    </div>
  );
};

MachinePage.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default MachinePage;
