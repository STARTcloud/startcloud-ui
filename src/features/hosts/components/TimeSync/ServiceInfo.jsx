import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../../components/common/RecordRows';

const STATUS_KEYS = {
  available: { key: 'statusOnline', tone: 'success' },
  disabled: { key: 'statusDisabled', tone: 'warning' },
  unavailable: { key: 'statusUnavailable', tone: 'danger' },
};

const serviceLabel = service => {
  if (service === 'ntp') {
    return 'NTP';
  }
  return service === 'chrony' ? 'Chrony' : String(service || '').toUpperCase();
};

const ServiceBadge = ({ statusInfo }) => {
  const { t } = useTranslation();
  if (statusInfo.service === 'none' || !statusInfo.available) {
    return (
      <span className="badge text-bg-secondary">
        {t('hostTime.timeSyncServiceInfo.notAvailable')}
      </span>
    );
  }
  const { key, tone } = STATUS_KEYS[statusInfo.status] || {
    key: 'statusUnknown',
    tone: 'secondary',
  };
  return (
    <span className={`badge text-bg-${tone}`}>
      {t(`hostTime.timeSyncServiceInfo.${key}`, { service: serviceLabel(statusInfo.service) })}
    </span>
  );
};

ServiceBadge.propTypes = {
  statusInfo: PropTypes.shape({
    service: PropTypes.string,
    status: PropTypes.string,
    available: PropTypes.bool,
  }).isRequired,
};

/**
 * The service information of the time synchronization, hyperweaver-ui's
 * card as a record: the service and its status as a badge, the time
 * zone, the last check and, where the agent names them, the service's
 * state and FMRI, with the warning of a host that has no service.
 */
const TimeSyncServiceInfo = ({ statusInfo }) => {
  const { t } = useTranslation();
  const unknown = t('hostTime.timeSyncServiceInfo.unknown');
  const details = statusInfo.service_details;
  return (
    <div data-panel="time-service">
      <h6 className="fw-bold">{t('hostTime.timeSyncServiceInfo.heading')}</h6>
      <RecordRows
        rows={[
          {
            key: 'service',
            label: t('hostTime.timeSyncServiceInfo.serviceType'),
            value: <ServiceBadge statusInfo={statusInfo} />,
          },
          {
            key: 'timezone',
            label: t('hostTime.timeSyncServiceInfo.currentTimezone'),
            value: <code>{statusInfo.timezone || unknown}</code>,
          },
          {
            key: 'checked',
            label: t('hostTime.timeSyncServiceInfo.lastStatusCheck'),
            value: statusInfo.last_checked
              ? new Date(statusInfo.last_checked).toLocaleString()
              : unknown,
          },
          ...(details
            ? [
                {
                  key: 'state',
                  label: t('hostTime.timeSyncServiceInfo.serviceState'),
                  value: <code>{details.state || unknown}</code>,
                },
                {
                  key: 'fmri',
                  label: t('hostTime.timeSyncServiceInfo.serviceFmri'),
                  value: <code>{details.fmri || unknown}</code>,
                },
              ]
            : []),
        ]}
      />
      {statusInfo.available ? null : (
        <div className="alert alert-warning" role="alert">
          <strong>{t('hostTime.timeSyncServiceInfo.noServiceAvailableTitle')}</strong>
          <br />
          {t('hostTime.timeSyncServiceInfo.noServiceAvailableMessage')}
        </div>
      )}
    </div>
  );
};

TimeSyncServiceInfo.propTypes = {
  statusInfo: PropTypes.shape({
    service: PropTypes.string,
    status: PropTypes.string,
    available: PropTypes.bool,
    timezone: PropTypes.string,
    last_checked: PropTypes.string,
    service_details: PropTypes.shape({ state: PropTypes.string, fmri: PropTypes.string }),
  }).isRequired,
};

export default TimeSyncServiceInfo;
