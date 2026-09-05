import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaTriangleExclamation } from 'react-icons/fa6';

import { formatRelativeTime } from '../../../utils/relativeTime';
import {
  WARN_AGE_SEC,
  ageSeconds,
  noCheckinLabel,
  vmIsStandby,
  vmStaleInfo,
} from '../utils/vmStatus';

const seenClass = ({ score, age }) => {
  if (score >= 1) {
    return 'text-danger';
  }
  if (score > 0 || age > WARN_AGE_SEC) {
    return 'text-warning';
  }
  return 'text-body-secondary';
};

/**
 * When a VM last checked in as a relative time, coloured by its staleness,
 * with a half-stale mark naming the agent that fell silent when one of
 * two did; Powered off or No check-in for a VM that never reported.
 */
const LastSeen = ({ vm, now }) => {
  const { t, i18n } = useTranslation();
  if (vmIsStandby(vm) || !vm.last_checkin) {
    return <span className="text-secondary">{t(noCheckinLabel(vm))}</span>;
  }
  const info = vmStaleInfo(vm, now);
  const age = ageSeconds(vm.last_checkin, now);
  return (
    <span className={seenClass({ score: info.score, age })}>
      {formatRelativeTime(vm.last_checkin, i18n.language)}
      {info.score === 0.5 ? (
        <FaTriangleExclamation
          className="ms-1 text-warning"
          title={t(info.startupStale ? 'vdi.seen.startupStale' : 'vdi.seen.userStale')}
          aria-label={t(info.startupStale ? 'vdi.seen.startupStale' : 'vdi.seen.userStale')}
        />
      ) : null}
    </span>
  );
};

LastSeen.propTypes = {
  vm: PropTypes.object.isRequired,
  now: PropTypes.number.isRequired,
};

export default LastSeen;
