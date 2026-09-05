import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaCircleHalfStroke, FaPowerOff, FaRegCircle } from 'react-icons/fa6';

import { vmIsStandby } from '../utils/vmStatus';

const formatIdle = (minutes, t) => {
  const value = Number(minutes) || 0;
  if (value >= 1440) {
    return t('vdi.duration.daysHours', {
      days: Math.floor(value / 1440),
      hours: Math.round((value % 1440) / 60),
    });
  }
  if (value >= 60) {
    return t('vdi.duration.hoursMinutes', { hours: Math.floor(value / 60), minutes: value % 60 });
  }
  return t('vdi.duration.minutes', { minutes: value });
};

/**
 * The session state of a VM: Standby for a powered-off cache entry,
 * Active, Idle with the idle time, No session, or a dash while unknown.
 */
const SessionBadge = ({ vm }) => {
  const { t } = useTranslation();
  if (vmIsStandby(vm) || !vm.last_checkin) {
    return (
      <span className="text-secondary">
        <FaPowerOff className="me-1" aria-hidden />
        {t('vdi.session.standby')}
      </span>
    );
  }
  const state = vm.user?.session_state;
  if (state === 'active') {
    return (
      <span className="text-success">
        <FaCircle className="me-1" aria-hidden />
        {t('vdi.session.active')}
      </span>
    );
  }
  if (state === 'idle') {
    return (
      <span className="text-warning">
        <FaCircleHalfStroke className="me-1" aria-hidden />
        {t('vdi.session.idleFor', { time: formatIdle(vm.user?.idle_minutes, t) })}
      </span>
    );
  }
  if (state === 'no_session') {
    return (
      <span className="text-secondary">
        <FaRegCircle className="me-1" aria-hidden />
        {t('vdi.session.no_session')}
      </span>
    );
  }
  return <span className="text-body-tertiary">—</span>;
};

SessionBadge.propTypes = {
  vm: PropTypes.object.isRequired,
};

export default SessionBadge;
