import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaClock, FaRightLeft, FaShieldHalved, FaStopwatch } from 'react-icons/fa6';

const SYSTEMS = {
  ntp: { Icon: FaClock, scope: 'ntp' },
  chrony: { Icon: FaStopwatch, scope: 'chrony' },
  ntpsec: { Icon: FaShieldHalved, scope: 'ntpsec' },
};

const FEATURES = ['Feature1', 'Feature2', 'Feature3'];

const buttonLabel = ({ isCurrent, data, name, t }) => {
  if (isCurrent) {
    return t('hostTime.timeSyncServiceManagement.buttonCurrentService');
  }
  if (!data?.can_switch_to) {
    return t('hostTime.timeSyncServiceManagement.buttonCannotSwitch');
  }
  if (!data?.installed) {
    return t('hostTime.timeSyncServiceManagement.buttonInstallSwitch');
  }
  return t('hostTime.timeSyncServiceManagement.buttonSwitchTo', { service: name });
};

const SystemCard = ({ systemKey, data, isCurrent, busy, onSwitch }) => {
  const { t } = useTranslation();
  const { Icon, scope } = SYSTEMS[systemKey] || SYSTEMS.ntp;
  const name = t(`hostTime.timeSyncServiceManagement.${scope}Name`);
  const SwitchIcon = isCurrent ? FaCheck : FaRightLeft;
  return (
    <div className="col-lg-4" data-system={systemKey}>
      <div className={`card h-100${isCurrent ? ' bg-info-subtle' : ''}`}>
        <div className="card-header d-flex align-items-center">
          <Icon className="me-2" aria-hidden="true" />
          {name}
          {isCurrent ? (
            <span className="badge text-bg-success ms-2">
              {t('hostTime.timeSyncServiceManagement.badgeCurrent')}
            </span>
          ) : null}
        </div>
        <div className="card-body">
          <p>{t(`hostTime.timeSyncServiceManagement.${scope}Description`)}</p>
          <ul className="small">
            {FEATURES.map(feature => (
              <li key={feature}>{t(`hostTime.timeSyncServiceManagement.${scope}${feature}`)}</li>
            ))}
          </ul>
          {data ? (
            <div className="mt-3">
              <div className="d-flex gap-1 flex-wrap">
                <span className={`badge text-bg-${data.installed ? 'success' : 'warning'}`}>
                  {t(
                    data.installed
                      ? 'hostTime.timeSyncServiceManagement.badgeInstalled'
                      : 'hostTime.timeSyncServiceManagement.badgeNotInstalled'
                  )}
                </span>
                {data.installed ? (
                  <span className={`badge text-bg-${data.enabled ? 'info' : 'secondary'}`}>
                    {t(
                      data.enabled
                        ? 'hostTime.timeSyncServiceManagement.badgeEnabled'
                        : 'hostTime.timeSyncServiceManagement.badgeDisabled'
                    )}
                  </span>
                ) : null}
              </div>
              {data.package_name ? (
                <p className="small text-muted mb-0 mt-1">
                  {t('hostTime.timeSyncServiceManagement.packageLabel', {
                    name: data.package_name,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="card-footer">
          <button
            type="button"
            className={`btn btn-sm w-100 ${isCurrent ? 'btn-success' : 'btn-outline-info'}`}
            data-action={`time-switch-${systemKey}`}
            onClick={() => onSwitch(systemKey)}
            disabled={isCurrent || !data?.can_switch_to || busy}
          >
            <SwitchIcon className="me-1" aria-hidden="true" />
            {buttonLabel({ isCurrent, data, name, t })}
          </button>
        </div>
      </div>
    </div>
  );
};

SystemCard.propTypes = {
  systemKey: PropTypes.string.isRequired,
  data: PropTypes.shape({
    installed: PropTypes.bool,
    enabled: PropTypes.bool,
    can_switch_to: PropTypes.bool,
    package_name: PropTypes.string,
  }),
  isCurrent: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
};

/**
 * The time synchronization systems a host offers, hyperweaver-ui's
 * cards: one a system of `GET system/time-sync/available-systems`, its
 * description and features, whether it is installed and enabled, its
 * package, and the switch button, held for the current system and for
 * one the host cannot switch to; the warning while the host names
 * none.
 */
const TimeSyncServiceManagement = ({ availableSystems, loaded, busy, onSwitch }) => {
  const { t } = useTranslation();
  const available = availableSystems?.available;
  return (
    <div data-panel="time-systems">
      <h6 className="fw-bold">{t('hostTime.timeSyncServiceManagement.heading')}</h6>
      {available ? (
        <div className="row g-3">
          {Object.keys(available).map(systemKey => (
            <SystemCard
              key={systemKey}
              systemKey={systemKey}
              data={available[systemKey]}
              isCurrent={availableSystems.current?.service === systemKey}
              busy={busy}
              onSwitch={onSwitch}
            />
          ))}
        </div>
      ) : null}
      {!available && loaded ? (
        <div className="alert alert-warning mb-0" role="alert">
          <strong>{t('hostTime.timeSyncServiceManagement.noSystemsAvailableTitle')}</strong>
          <br />
          {t('hostTime.timeSyncServiceManagement.noSystemsAvailableMessage')}
        </div>
      ) : null}
    </div>
  );
};

TimeSyncServiceManagement.propTypes = {
  availableSystems: PropTypes.shape({
    available: PropTypes.object,
    current: PropTypes.shape({ service: PropTypes.string }),
  }),
  loaded: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
};

export default TimeSyncServiceManagement;
