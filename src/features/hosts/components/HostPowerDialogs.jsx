import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';

import { ActionOptionsModal, HostRestartOptions, HostShutdownOptions } from './HostActionOptions';

const DEFAULT_OPTIONS = {
  restartType: 'standard',
  powerType: 'shutdown',
  gracePeriod: 60,
  message: '',
  bootEnvironment: '',
};

/**
 * The dialogs of the two host power actions, shared by the Controls menu
 * and the sidebar tree's menu: `host-restart` and `host-shutdown` each
 * open the list dialog of their options, the restart type with its boot
 * environment or the power type, the grace period and the message, then
 * the typed confirmation, which hands `onRun` the action and the options
 * collected. Nothing shows while `action` is empty, and closing either
 * dialog returns the options to their defaults.
 */
const HostPowerDialogs = ({ action, onClose, onRun }) => {
  const { t } = useTranslation();
  const [collected, setCollected] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const restart = action === 'host-restart';
  const title = t(restart ? 'hosts.controls.restartHost' : 'hosts.controls.powerOffHost');

  const close = () => {
    setCollected(false);
    setOptions(DEFAULT_OPTIONS);
    onClose();
  };

  return (
    <>
      <ActionOptionsModal
        show={Boolean(action) && !collected}
        title={title}
        onHide={close}
        onContinue={() => setCollected(true)}
      >
        {restart ? (
          <HostRestartOptions hostActionOptions={options} setHostActionOptions={setOptions} />
        ) : (
          <HostShutdownOptions hostActionOptions={options} setHostActionOptions={setOptions} />
        )}
      </ActionOptionsModal>
      <ConfirmModal
        show={Boolean(action) && collected}
        handleClose={close}
        handleConfirm={() => onRun(action, options)}
        title={title}
        variant={restart ? 'restart' : 'delete'}
      />
    </>
  );
};

HostPowerDialogs.propTypes = {
  action: PropTypes.oneOf(['', 'host-restart', 'host-shutdown']).isRequired,
  onClose: PropTypes.func.isRequired,
  onRun: PropTypes.func.isRequired,
};

export default HostPowerDialogs;
