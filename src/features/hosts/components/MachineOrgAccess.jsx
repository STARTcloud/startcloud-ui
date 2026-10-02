import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuildingUser } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useMachineRow } from '../hooks/useHostMachines';
import { isServerRole } from '../utils/hosts';

import OrgAssignmentModal from './OrgAssignmentModal';

/**
 * The button that opens the organization assignment of one machine,
 * hyperweaver-ui's, drawn on the `hyperweaver-server` role alone, where
 * the assignment lives beside the registry; a save raises one notice and
 * reads the machine's row again, the row that carries its organizations.
 */
const MachineOrgAccess = ({ status, id, name, disabled = false, className = '' }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { refresh } = useMachineRow(id, name);
  const [open, setOpen] = useState(false);

  if (!isServerRole(status)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm btn-outline-info ${className}`}
        data-action="org-access"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <FaBuildingUser className="me-2" aria-hidden="true" />
        {t('machineEdit.machineSettings.orgAccess')}
      </button>
      {open ? (
        <OrgAssignmentModal
          serverId={id}
          machineName={name}
          targetLabel={name}
          onClose={saved => {
            if (saved) {
              notify(
                'success',
                t('machineEdit.machineSettings.orgsUpdated', { machineName: name })
              );
              refresh();
            }
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

MachineOrgAccess.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default MachineOrgAccess;
