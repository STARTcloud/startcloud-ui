import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';

const SHOWN_PEERS = 5;

const ACTIONS = {
  sync: { scope: 'sync', keyword: 'sync' },
  restart: { scope: 'restart', keyword: 'restart' },
  save: { scope: 'save', keyword: 'save' },
  'switch-ntp': { scope: 'switchNtp', keyword: 'switch' },
  'switch-chrony': { scope: 'switchChrony', keyword: 'switch' },
  'switch-ntpsec': { scope: 'switchNtpsec', keyword: 'switch' },
  timezone: { scope: 'changeTimezone', keyword: 'timezone' },
};

const STATUS_TONES = { available: 'success', disabled: 'warning' };

const serviceLabel = (service, t) => {
  if (service === 'ntp') {
    return t('host.ntpConfirmActionModal.ntp');
  }
  return service === 'chrony' ? t('host.ntpConfirmActionModal.chrony') : service.toUpperCase();
};

const capitalized = word => word.charAt(0).toUpperCase() + word.slice(1);

const timezoneRows = (service, t) => [
  {
    key: 'current',
    label: t('host.ntpConfirmActionModal.currentTimezone'),
    value: <code>{service.current || t('host.ntpConfirmActionModal.unknown')}</code>,
  },
  {
    key: 'next',
    label: t('host.ntpConfirmActionModal.newTimezone'),
    value: <code>{service.timezone || t('host.ntpConfirmActionModal.unknown')}</code>,
  },
];

const serviceRows = (service, t) => [
  ...(service.service
    ? [
        {
          key: 'type',
          label: t('host.ntpConfirmActionModal.serviceType'),
          value: <code>{serviceLabel(service.service, t)}</code>,
        },
      ]
    : []),
  ...(service.status
    ? [
        {
          key: 'status',
          label: t('host.ntpConfirmActionModal.serviceStatus'),
          value: (
            <span className={`badge text-bg-${STATUS_TONES[service.status] || 'danger'}`}>
              {capitalized(service.status)}
            </span>
          ),
        },
      ]
    : []),
  ...(service.config_file
    ? [
        {
          key: 'file',
          label: t('host.ntpConfirmActionModal.configFile'),
          value: <code>{service.config_file}</code>,
        },
      ]
    : []),
  ...(service.timezone
    ? [
        {
          key: 'timezone',
          label: t('host.ntpConfirmActionModal.currentTimezone'),
          value: <code>{service.timezone}</code>,
        },
      ]
    : []),
];

const PeerList = ({ peers }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('host.ntpConfirmActionModal.availableTimeServers')}</h6>
      <ul className="small">
        {peers.slice(0, SHOWN_PEERS).map(peer => (
          <li key={peer.remote} className="font-monospace">
            {peer.remote}
            {peer.indicator === '*' ? (
              <span className="badge text-bg-success ms-1">
                {t('host.ntpConfirmActionModal.primary')}
              </span>
            ) : null}
            {peer.indicator === '+' ? (
              <span className="badge text-bg-info ms-1">
                {t('host.ntpConfirmActionModal.backup')}
              </span>
            ) : null}
          </li>
        ))}
        {peers.length > SHOWN_PEERS ? (
          <li className="text-muted">
            {t('host.ntpConfirmActionModal.moreServers', { count: peers.length - SHOWN_PEERS })}
          </li>
        ) : null}
      </ul>
    </>
  );
};

PeerList.propTypes = {
  peers: PropTypes.arrayOf(
    PropTypes.shape({ remote: PropTypes.string.isRequired, indicator: PropTypes.string })
  ).isRequired,
};

const Note = ({ headingKey, tone, children }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t(headingKey)}</h6>
      <div className={`alert alert-${tone} mb-0`} role="note">
        {children}
      </div>
    </>
  );
};

Note.propTypes = {
  headingKey: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const Extra = ({ action, service }) => {
  const { t } = useTranslation();
  if (action === 'sync' && Array.isArray(service?.peers) && service.peers.length > 0) {
    return <PeerList peers={service.peers} />;
  }
  if (action === 'save' && service?.config_exists === false) {
    return (
      <Note headingKey="host.ntpConfirmActionModal.configFileCreation" tone="info">
        <strong>{t('host.ntpConfirmActionModal.newConfigFile')}:</strong>{' '}
        {t('host.ntpConfirmActionModal.configWillBeCreated')}
      </Note>
    );
  }
  if (action === 'timezone') {
    return (
      <Note headingKey="host.ntpConfirmActionModal.rebootRecommendation" tone="warning">
        <strong>{t('host.ntpConfirmActionModal.systemRebootRecommended')}:</strong>{' '}
        {t('host.ntpConfirmActionModal.rebootText')}
      </Note>
    );
  }
  if (action === 'restart') {
    return (
      <Note headingKey="host.ntpConfirmActionModal.serviceRestartInfo" tone="info">
        {t('host.ntpConfirmActionModal.restartWillOccur')}
      </Note>
    );
  }
  return null;
};

Extra.propTypes = {
  action: PropTypes.string.isRequired,
  service: PropTypes.object,
};

/**
 * The confirmation of a time action, hyperweaver-ui's dialog over the
 * typed confirmation of the pages contract: the service's or the time
 * zone's record, the sentence and the warning of the action, the peers
 * a sync will use, the note of a configuration file to be created, the
 * reboot recommended after a time zone change or the restart's note,
 * and the action's own word typed to confirm; `onConfirm` sends the
 * request.
 */
const NTPConfirmActionModal = ({ service = null, action, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const { scope, keyword } = ACTIONS[action] || { scope: '', keyword: 'confirm' };
  const title = scope
    ? t(`host.ntpConfirmActionModal.${scope}Title`)
    : t('host.ntpConfirmActionModal.confirmAction');
  const description = scope
    ? t(`host.ntpConfirmActionModal.${scope}Description`, { timezone: service?.timezone })
    : t('host.ntpConfirmActionModal.performActionDescription', { action });
  const warning = scope
    ? t(`host.ntpConfirmActionModal.${scope}Warning`)
    : t('host.ntpConfirmActionModal.confirmWarning');
  const timezone = action === 'timezone';
  const message = (
    <div data-dialog={`time-${action}`}>
      {service ? (
        <>
          <h6 className="fw-bold">
            {t(
              timezone
                ? 'host.ntpConfirmActionModal.timezoneInfo'
                : 'host.ntpConfirmActionModal.serviceInfo'
            )}
          </h6>
          <RecordRows rows={timezone ? timezoneRows(service, t) : serviceRows(service, t)} />
        </>
      ) : null}
      <div
        className={`alert alert-${timezone || action === 'restart' ? 'warning' : 'info'}`}
        role="note"
      >
        <p className="mb-1">
          <strong>{t('host.ntpConfirmActionModal.action')}:</strong> {description}
        </p>
        <p className="mb-0">{warning}</p>
      </div>
      <Extra action={action} service={service} />
    </div>
  );
  return (
    <ConfirmModal
      show
      handleClose={onClose}
      handleConfirm={onConfirm}
      title={title}
      confirmText={title}
      variant="restart"
      keyword={keyword}
      message={message}
    />
  );
};

NTPConfirmActionModal.propTypes = {
  service: PropTypes.shape({
    current: PropTypes.string,
    timezone: PropTypes.string,
    service: PropTypes.string,
    status: PropTypes.string,
    config_file: PropTypes.string,
    config_exists: PropTypes.bool,
    peers: PropTypes.arrayOf(PropTypes.object),
  }),
  action: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default NTPConfirmActionModal;
