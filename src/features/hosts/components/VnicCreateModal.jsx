import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { VNIC_FORM, suggestVnicName, vnicProblem } from '../utils/networkingManagement';

import ToolFormDialog from './ToolFormDialog';
import VnicBasicFields from './VNIC/VnicBasicFields';
import VnicOptionalFields from './VNIC/VnicOptionalFields';
import VnicOptionsFields from './VNIC/VnicOptionsFields';
import VnicPropertiesFields from './VNIC/VnicPropertiesFields';

/**
 * The create dialog of a VNIC, hyperweaver-ui's: the name, suggested by
 * `suggestVnicName` from the VNICs held when a link is picked, the link
 * among the host's interfaces, etherstubs, aggregates and bridges, the
 * VLAN id and the MAC address, the link properties and the temporary
 * flag. The form's problem draws over the fields and holds the send; the
 * body is `vnicBody`.
 */
const VnicCreateModal = ({ links, vnics, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(VNIC_FORM);
  const [tried, setTried] = useState(false);
  const problem = vnicProblem(form);

  const change = (field, value) =>
    setForm(current => ({
      ...current,
      [field]: value,
      ...(field === 'link' && value ? { name: suggestVnicName(vnics) } : {}),
    }));

  const addProperty = (key, value) =>
    setForm(current => ({ ...current, properties: { ...current.properties, [key]: value } }));

  const removeProperty = key =>
    setForm(current => ({
      ...current,
      properties: Object.fromEntries(
        Object.entries(current.properties).filter(([held]) => held !== key)
      ),
    }));

  const submit = () => {
    setTried(true);
    if (!problem) {
      onSubmit(form);
    }
  };

  return (
    <ToolFormDialog
      dialog="vnic-create"
      title={t('host.vnicCreateModal.createVnic')}
      submitKey="host.vnicCreateModal.createVnic"
      problemKey={tried ? problem : ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <VnicBasicFields
        name={form.name}
        link={form.link}
        availableLinks={links}
        onChange={change}
        disabled={busy}
      />
      <VnicOptionalFields
        vlanId={form.vlan_id}
        macAddress={form.mac_address}
        onChange={change}
        disabled={busy}
      />
      <VnicPropertiesFields
        properties={form.properties}
        onAddProperty={addProperty}
        onRemoveProperty={removeProperty}
        disabled={busy}
      />
      <VnicOptionsFields temporary={form.temporary} onChange={change} disabled={busy} />
    </ToolFormDialog>
  );
};

VnicCreateModal.propTypes = {
  links: PropTypes.array.isRequired,
  vnics: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default VnicCreateModal;
