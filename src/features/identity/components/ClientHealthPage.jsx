import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import { clientHealth } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { CLIENT_HEALTH } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const HTTPS = /^https?:/;

const stateOf = probe => {
  if (probe.healthy === null || probe.healthy === undefined) {
    return 'unknown';
  }
  return probe.healthy ? 'healthy' : 'unhealthy';
};

const TONES = { healthy: 'success', unhealthy: 'danger', unknown: 'secondary' };

const probeShape = PropTypes.shape({
  client_id: PropTypes.string.isRequired,
  client_name: PropTypes.string.isRequired,
  description: PropTypes.string,
  base_url: PropTypes.string,
  healthy: PropTypes.bool,
  status: PropTypes.string,
  response_time_ms: PropTypes.number,
  last_checked: PropTypes.string,
  error_message: PropTypes.string,
});

const BaseUrl = ({ url }) => {
  if (!url) {
    return null;
  }
  if (HTTPS.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
  }
  return <span>{url}</span>;
};

BaseUrl.propTypes = {
  url: PropTypes.string,
};

const Probe = ({ probe }) => {
  const { t } = useTranslation();
  return (
    <span>
      {typeof probe.response_time_ms === 'number'
        ? t('admin.health.clients.responseTime', { ms: probe.response_time_ms })
        : t('admin.health.clients.noResponse')}
      {probe.last_checked ? (
        <>
          {' · '}
          {t('admin.health.clients.checked')} <DateCell value={probe.last_checked} />
        </>
      ) : null}
    </span>
  );
};

Probe.propTypes = {
  probe: probeShape.isRequired,
};

const HealthCard = ({ probe, kind }) => {
  const { t } = useTranslation();
  const state = stateOf(probe);
  const tone = TONES[state];
  return (
    <div className={`card h-100 border-${tone}`}>
      <div
        className={`card-header d-flex justify-content-between align-items-center bg-${tone}-subtle`}
      >
        <strong>{probe.client_name}</strong>
        <span className={`badge bg-${tone}`}>{t(`admin.health.status.${state}`)}</span>
      </div>
      <div className="card-body small d-flex flex-column gap-1">
        <span>
          {kind === 'provider' ? `${t('admin.health.providers.one')} ` : ''}
          <code>{probe.client_id}</code>
        </span>
        {probe.description ? <span>{probe.description}</span> : null}
        <BaseUrl url={probe.base_url} />
        {state !== 'unknown' ? <Probe probe={probe} /> : null}
        {probe.error_message ? (
          <details>
            <summary>{t('admin.health.clients.errorDetails')}</summary>
            <pre className="mb-0 mt-1 small">{probe.error_message}</pre>
          </details>
        ) : null}
      </div>
    </div>
  );
};

HealthCard.propTypes = {
  probe: probeShape.isRequired,
  kind: PropTypes.oneOf(['client', 'provider']).isRequired,
};

const CardGrid = ({ probes, kind }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-4">
      {probes.map(probe => (
        <div key={probe.client_id} className="col-md-6 col-xl-4">
          <HealthCard probe={probe} kind={kind} />
        </div>
      ))}
      {probes.length === 0 ? <div className="col text-muted">{t('pages.empty')}</div> : null}
    </div>
  );
};

CardGrid.propTypes = {
  probes: PropTypes.arrayOf(probeShape).isRequired,
  kind: PropTypes.oneOf(['client', 'provider']).isRequired,
};

const anyUnhealthy = probes => probes.some(probe => probe.healthy === false);

/**
 * Health › Client health: the summary line at the top, drawn as a
 * warning while any client or provider is unhealthy, one card per client
 * and provider in three states with one status each and the error behind
 * a collapse; Refresh re-fetches, nothing reloads.
 */
const ClientHealthPage = () => {
  const { t } = useTranslation();
  const { data, loading, reload } = useAdminRead({ read: clientHealth, example: CLIENT_HEALTH });

  useEffect(() => {
    document.title = t('admin.health.clients.title');
  }, [t]);

  if (loading && !data) {
    return <AdminLoading />;
  }
  if (!data) {
    return null;
  }

  const clients = data.clients || [];
  const providers = data.providers || [];
  const summary = data.summary || {};
  const warn = anyUnhealthy(clients) || anyUnhealthy(providers);
  const healthyProviders = providers.filter(probe => probe.healthy === true).length;

  return (
    <div>
      <div
        className={`alert d-flex flex-wrap align-items-center gap-2 ${warn ? 'alert-warning' : 'alert-success'}`}
        role="status"
      >
        <span className="flex-grow-1">
          <strong>
            {t('admin.health.clients.summary', {
              healthy: summary.healthy ?? 0,
              total: summary.total ?? clients.length,
            })}
          </strong>
          {' · '}
          {t('admin.health.providers.summary', {
            healthy: healthyProviders,
            total: providers.length,
          })}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={reload}
          disabled={loading}
        >
          <FaRotate className="me-1" aria-hidden="true" />
          {t('admin.health.refresh')}
        </button>
      </div>
      <h5>{t('admin.health.clients.heading')}</h5>
      <CardGrid probes={clients} kind="client" />
      <h5>{t('admin.health.providers.heading')}</h5>
      <CardGrid probes={providers} kind="provider" />
    </div>
  );
};

export default ClientHealthPage;
