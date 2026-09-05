import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa6';

const driveClass = status => {
  if (status === 'healthy') {
    return 'bg-success bg-opacity-25 text-success-emphasis';
  }
  if (status === 'disconnected' || status === 'timeout') {
    return 'bg-danger bg-opacity-25 text-danger-emphasis';
  }
  return 'bg-warning bg-opacity-25 text-warning-emphasis';
};

/**
 * One badge per mapped drive, tinted by its status, the UNC path or the
 * local-drive note as its tooltip; a dash when the VM reports none.
 */
const DriveBadges = ({ drives = [] }) => {
  const { t } = useTranslation();
  if (drives.length === 0) {
    return <span className="text-body-tertiary">—</span>;
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {drives.map(drive => (
        <span
          key={drive.letter}
          className={`badge ${driveClass(drive.status)}`}
          title={
            drive.unc_path ? t('vdi.drives.share', { path: drive.unc_path }) : t('vdi.drives.local')
          }
        >
          {drive.letter}: {drive.status === 'healthy' ? <FaCheck aria-hidden /> : drive.status}
        </span>
      ))}
    </span>
  );
};

DriveBadges.propTypes = {
  drives: PropTypes.arrayOf(
    PropTypes.shape({
      letter: PropTypes.string,
      status: PropTypes.string,
      unc_path: PropTypes.string,
    })
  ),
};

export default DriveBadges;
