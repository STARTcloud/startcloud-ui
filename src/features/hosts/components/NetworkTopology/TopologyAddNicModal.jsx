import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ToolFormDialog from '../ToolFormDialog';

const VLAN_MAX = 4094;

/**
 * The add-NIC dialog, hyperweaver-ui's: opened when a bhyve add chip
 * lands on a network or a carrier, it asks the VNIC name, which the
 * agent creates on demand, and the VLAN id, and hands them to the
 * staging tray.
 */
const TopologyAddNicModal = ({ draft, onStage, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [vlan, setVlan] = useState(draft.vlanId || 0);
  return (
    <ToolFormDialog
      dialog="topology-add-nic"
      title={t('hostTools.topology.addModalTitle', { machine: draft.drag.machineName })}
      submitKey="hostTools.topology.addModalStage"
      busy={false}
      disabled={!name.trim()}
      onClose={onClose}
      onSubmit={() => onStage({ name: name.trim(), vlanId: vlan })}
    >
      <p className="font-monospace mb-3">
        {t('hostTools.topology.overCarrier', { carrier: draft.carrier })}
      </p>
      <div className="mb-3">
        <label className="form-label" htmlFor="hw-add-nic-name">
          {t('hostTools.topology.trayName')}
        </label>
        <input
          id="hw-add-nic-name"
          className="form-control font-monospace"
          type="text"
          required
          value={name}
          onChange={event => setName(event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="hw-add-nic-vlan">
          {t('hostTools.topology.trayVlan')}
        </label>
        <input
          id="hw-add-nic-vlan"
          className="form-control font-monospace"
          type="number"
          min={0}
          max={VLAN_MAX}
          value={vlan}
          onChange={event =>
            setVlan(Math.max(0, Math.min(VLAN_MAX, parseInt(event.target.value, 10) || 0)))
          }
        />
        <div className="form-text">{t('hostTools.topology.addModalVlanHelp')}</div>
      </div>
      <div className="form-text">{t('hostTools.topology.trayNote')}</div>
    </ToolFormDialog>
  );
};

TopologyAddNicModal.propTypes = {
  draft: PropTypes.shape({
    carrier: PropTypes.string.isRequired,
    vlanId: PropTypes.number,
    drag: PropTypes.shape({ machineName: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
  onStage: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TopologyAddNicModal;
