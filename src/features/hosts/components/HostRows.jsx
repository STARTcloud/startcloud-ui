import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPowerOff, FaRotate } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useHostActions } from '../hooks/useHostActions';
import { useHostStats } from '../hooks/useHostStats';
import { canControlHosts } from '../utils/permissions';

import {
  ActionOptionsModal,
  ActionRow,
  HostRestartOptions,
  HostShutdownOptions,
  PrivilegeLine,
} from './HostActionOptions';

const DEFAULT_OPTIONS = {
  restartType: 'standard',
  powerType: 'shutdown',
  gracePeriod: 60,
  message: '',
  bootEnvironment: '',
};

/**
 * The host rows of the Controls menu on `/hosts/{id}`: Restart host and
 * Power off host while `powered`, the role and the agent's `host-power`
 * token both allowing, each opening the list dialog of its options, then
 * the typed confirmation, then one request through `useHostActions`,
 * the host's stats read again once after a success; a role short of
 * controlling the host reads the privilege line instead.
 */
const HostRows = ({ status, id, powered, user = null }) => {
  const { t } = useTranslation();
  const role = user?.role;
  const { refresh } = useHostStats(status, id);
  const { run, busy } = useHostActions({ status, id, name: '', onDone: refresh });
  const [stage, setStage] = useState(null);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const restart = stage?.action === 'host-restart';
  const title = t(restart ? 'hosts.controls.restartHost' : 'hosts.controls.powerOffHost');

  const open = action => {
    setOptions(DEFAULT_OPTIONS);
    setStage({ action, step: 'options' });
  };

  const close = () => setStage(null);

  return (
    <>
      {powered ? (
        <>
          <ActionRow
            icon={FaRotate}
            tone="text-warning"
            labelKey="hosts.controls.restartHost"
            disabled={busy}
            onClick={() => open('host-restart')}
          />
          <ActionRow
            icon={FaPowerOff}
            tone="text-danger"
            labelKey="hosts.controls.powerOffHost"
            disabled={busy}
            onClick={() => open('host-shutdown')}
          />
        </>
      ) : null}
      {canControlHosts(role) ? null : (
        <>
          {powered ? <Dropdown.Divider /> : null}
          <PrivilegeLine />
        </>
      )}
      <ActionOptionsModal
        show={stage?.step === 'options'}
        title={title}
        onHide={close}
        onContinue={() => setStage({ action: stage.action, step: 'confirm' })}
      >
        {restart ? (
          <HostRestartOptions hostActionOptions={options} setHostActionOptions={setOptions} />
        ) : (
          <HostShutdownOptions hostActionOptions={options} setHostActionOptions={setOptions} />
        )}
      </ActionOptionsModal>
      <ConfirmModal
        show={stage?.step === 'confirm'}
        handleClose={close}
        handleConfirm={() => run(stage.action, options)}
        title={title}
        variant={restart ? 'restart' : 'delete'}
      />
    </>
  );
};

HostRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  powered: PropTypes.bool.isRequired,
  user: PropTypes.object,
};

export default HostRows;
