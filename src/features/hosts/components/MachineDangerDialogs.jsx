import PropTypes from 'prop-types';
import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';

import { ActionOptionsModal } from './HostActionOptions';

/**
 * The dialogs of the two machine actions that destroy, shared by the
 * Controls menu and the sidebar tree's menu: `kill` opens the typed
 * confirmation at once; `destroy` first opens the list dialog that
 * collects whether the agent's disks go with the machine, then the typed
 * confirmation; a confirmation hands `onRun` the action and its options.
 * Nothing shows while `action` is empty, and closing either dialog
 * returns the options to their defaults.
 */
const MachineDangerDialogs = ({ action, name, onClose, onRun }) => {
  const { t } = useTranslation();
  const [collected, setCollected] = useState(false);
  const [cleanupDisks, setCleanupDisks] = useState(true);
  const destroy = action === 'destroy';
  const title = destroy
    ? t('hosts.controls.destroyOptions.title', { name })
    : t('hosts.controls.forceKill');

  const close = () => {
    setCollected(false);
    setCleanupDisks(true);
    onClose();
  };

  const confirm = () => {
    if (destroy) {
      onRun('destroy', { cleanupDisks });
    } else {
      onRun('kill');
    }
  };

  return (
    <>
      <ActionOptionsModal
        show={destroy && !collected}
        title={title}
        onHide={close}
        onContinue={() => setCollected(true)}
      >
        <p>{t('hosts.controls.destroyOptions.message')}</p>
        <Form.Check
          type="checkbox"
          id="destroy-cleanup-disks"
          label={t('hosts.controls.destroyOptions.cleanupDisks')}
          checked={cleanupDisks}
          onChange={event => setCleanupDisks(event.target.checked)}
        />
      </ActionOptionsModal>
      <ConfirmModal
        show={action === 'kill' || (destroy && collected)}
        handleClose={close}
        handleConfirm={confirm}
        title={title}
        variant="delete"
      />
    </>
  );
};

MachineDangerDialogs.propTypes = {
  action: PropTypes.oneOf(['', 'kill', 'destroy']).isRequired,
  name: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onRun: PropTypes.func.isRequired,
};

export default MachineDangerDialogs;
