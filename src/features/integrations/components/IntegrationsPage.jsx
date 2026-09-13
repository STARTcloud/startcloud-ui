import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlug } from 'react-icons/fa6';

import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import { useNotify } from '../../../contexts/NoticeContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { integrationsShape } from '../api/integrations';

const STATUS_CLASSES = {
  connected: 'bg-success',
  expired: 'bg-warning text-dark',
  error: 'bg-danger',
};

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const matches = (service, needle) =>
  String(service.name || '')
    .toLowerCase()
    .includes(needle);

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return null;
  }
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'bg-secondary'}`}>
      {t(`integrations.status.${status}`, { defaultValue: status })}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

const ConnectedSubline = ({ service }) => {
  const { t, i18n } = useTranslation();
  if (!service.connected_at) {
    return null;
  }
  return (
    <>
      {t('integrations.connected')}{' '}
      <span title={absoluteTime(service.connected_at, i18n.language)}>
        {formatRelativeTime(service.connected_at, i18n.language)}
      </span>
    </>
  );
};

ConnectedSubline.propTypes = {
  service: PropTypes.shape({ connected_at: PropTypes.string }).isRequired,
};

const ManageLink = ({ service }) => {
  const { t } = useTranslation();
  const url = httpsUrl(service.settings_url);
  if (!url) {
    return null;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-sm btn-outline-secondary"
    >
      {t('integrations.manage')}
    </a>
  );
};

ManageLink.propTypes = {
  service: PropTypes.shape({ settings_url: PropTypes.string }).isRequired,
};

const useServices = integrations => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [services, setServices] = useState(undefined);

  useEffect(() => {
    let mounted = true;
    integrations
      .list()
      .then(data => {
        if (mounted) {
          setServices(Array.isArray(data?.services) ? data.services : null);
        }
      })
      .catch(error => {
        log.api.error('Error loading integrations', { error: error.message });
        if (mounted) {
          setServices(null);
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [integrations, notify, t]);

  return services;
};

/**
 * The Integrations page of the identity contract at `/user/integrations`,
 * from `GET /api/user/integrations`: one row per third-party service
 * connected through the issuer (icon, name, the status badge, the
 * connection time with its absolute time in the tooltip, Manage following
 * `settings_url` in a new tab), drawn only while the answer carries
 * `services`; `fallback` is drawn in its place otherwise, because an
 * estate that connects no service has no page here; the navbar search is
 * bound with a query over the services by name.
 */
const IntegrationsPage = ({ integrations, fallback }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const services = useServices(integrations);
  const rows = Array.isArray(services) ? services : [];
  const needle = query.trim().toLowerCase();
  const shown = needle ? rows.filter(service => matches(service, needle)) : rows;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('integrations.search'),
    matched: shown.length,
    total: rows.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  useEffect(() => {
    if (services) {
      document.title = t('integrations.title');
    }
  }, [services, t]);

  if (services === undefined) {
    return <p>{t('loading')}</p>;
  }
  if (services === null) {
    return fallback;
  }

  return (
    <div className="list">
      <h3 className="mb-3">{t('integrations.title')}</h3>
      <MethodList empty={needle ? t('pages.noMatches') : t('integrations.none')}>
        {shown.map(service => (
          <MethodRow
            key={service.id}
            icon={<FaPlug aria-hidden />}
            iconUrl={service.icon_url || ''}
            label={service.name}
            badges={<StatusBadge status={service.status} />}
            subline={<ConnectedSubline service={service} />}
            actions={<ManageLink service={service} />}
          />
        ))}
      </MethodList>
    </div>
  );
};

IntegrationsPage.propTypes = {
  integrations: integrationsShape.isRequired,
  fallback: PropTypes.node.isRequired,
};

export default IntegrationsPage;
