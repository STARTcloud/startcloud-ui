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

const STATES = {
  standby: { Icon: FaPowerOff, className: 'text-secondary' },
  active: { Icon: FaCircle, className: 'text-success' },
  idle: { Icon: FaCircleHalfStroke, className: 'text-warning' },
  no_session: { Icon: FaRegCircle, className: 'text-secondary' },
};

/**
 * The session state of a VM as one key: `standby` for a powered-off cache
 * entry or a VM that never checked in, else the agent's `session_state`
 * where it is one of `active`, `idle` and `no_session`, empty while
 * unknown.
 *
 * @param {Object} vm - The vm object
 * @returns {string} The key, or ''
 */
const sessionState = vm => {
  if (vmIsStandby(vm) || !vm.last_checkin) {
    return 'standby';
  }
  const state = vm.user?.session_state;
  return state in STATES ? state : '';
};

/**
 * The text the Session cell shows: Standby, Active, Idle with the idle
 * time, No session, or empty while the state is unknown.
 *
 * @param {Object} vm - The vm object
 * @param {Function} t - The translator
 * @returns {string} The text
 */
export const sessionText = (vm, t) => {
  const state = sessionState(vm);
  if (state === 'idle') {
    return t('vdi.session.idleFor', { time: formatIdle(vm.user?.idle_minutes, t) });
  }
  return state ? t(`vdi.session.${state}`) : '';
};

/**
 * The session state of a VM: Standby for a powered-off cache entry,
 * Active, Idle with the idle time, No session, or a dash while unknown,
 * the text `sessionText` answers beside the state's glyph.
 */
const SessionBadge = ({ vm }) => {
  const { t } = useTranslation();
  const state = sessionState(vm);
  if (!state) {
    return <span className="text-body-tertiary">—</span>;
  }
  const { Icon, className } = STATES[state];
  return (
    <span className={className}>
      <Icon className="me-1" aria-hidden />
      {sessionText(vm, t)}
    </span>
  );
};

SessionBadge.propTypes = {
  vm: PropTypes.object.isRequired,
};

export default SessionBadge;
