import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaXmark } from 'react-icons/fa6';

import {
  FORWARD_DRAFT,
  forwardLineOf,
  forwardOf,
  forwardReady,
  natNetworkBody,
  natNetworkReady,
} from '../../utils/networkingManagement';
import ToolFormDialog from '../ToolFormDialog';

const forwardKey = forward => `${forward.name}|${forward.ipv6}`;

const ForwardLine = ({ forward, tone, onRemove }) => (
  <div className={`d-flex align-items-center gap-2 font-monospace small py-1${tone}`}>
    <span className={`badge ${tone ? 'text-bg-warning' : 'text-bg-secondary'}`}>
      {forward.protocol}
    </span>
    {forward.ipv6 ? <span className="badge text-bg-info">v6</span> : null}
    <span className="text-truncate">{forwardLineOf(forward)}</span>
    <button
      type="button"
      className="btn btn-sm btn-outline-danger ms-auto"
      onClick={onRemove}
      data-tool="remove-forward"
    >
      <FaXmark aria-hidden="true" />
    </button>
  </div>
);

ForwardLine.propTypes = {
  forward: PropTypes.object.isRequired,
  tone: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const DraftField = ({ labelKey, value, onChange, className }) => {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <input
        className="form-control form-control-sm font-monospace"
        placeholder={t(labelKey)}
        aria-label={t(labelKey)}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
};

DraftField.propTypes = {
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
};

const Forwards = ({ space, removed, added, onRemoveExisting, onRemoveAdded, onAdd }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(FORWARD_DRAFT);
  const existing = (space.port_forwards || []).filter(
    forward => !removed.some(gone => gone.name === forward.name && gone.ipv6 === forward.ipv6)
  );
  const change = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const stage = () => {
    onAdd(forwardOf(draft));
    setDraft(FORWARD_DRAFT);
  };
  return (
    <div className="col-12">
      <h6 className="mb-2">{t('host.networkSpaces.forwards')}</h6>
      {existing.length === 0 && added.length === 0 ? (
        <p className="text-muted small mb-2">{t('host.networkSpaces.noForwards')}</p>
      ) : null}
      {existing.map(forward => (
        <ForwardLine
          key={forwardKey(forward)}
          forward={forward}
          tone=""
          onRemove={() => onRemoveExisting({ name: forward.name, ipv6: Boolean(forward.ipv6) })}
        />
      ))}
      {added.map(forward => (
        <ForwardLine
          key={`added-${forwardKey(forward)}`}
          forward={forward}
          tone=" text-warning"
          onRemove={() => onRemoveAdded(forward)}
        />
      ))}
      <div className="row g-2 align-items-end mt-1">
        <DraftField
          labelKey="host.networkSpaces.fwName"
          value={draft.name}
          onChange={value => change('name', value)}
          className="col-3"
        />
        <div className="col-2">
          <select
            className="form-select form-select-sm"
            aria-label={t('host.networkSpaces.fwProto')}
            value={draft.protocol}
            onChange={event => change('protocol', event.target.value)}
          >
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
          </select>
        </div>
        <DraftField
          labelKey="host.networkSpaces.fwHostPort"
          value={draft.host_port}
          onChange={value => change('host_port', value)}
          className="col-2"
        />
        <DraftField
          labelKey="host.networkSpaces.fwGuestIp"
          value={draft.guest_ip}
          onChange={value => change('guest_ip', value)}
          className="col-2"
        />
        <DraftField
          labelKey="host.networkSpaces.fwGuestPort"
          value={draft.guest_port}
          onChange={value => change('guest_port', value)}
          className="col-2"
        />
        <div className="col-1">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={!forwardReady(draft)}
            title={t('host.networkSpaces.addForward')}
            onClick={stage}
            data-tool="add-forward"
          >
            <FaPlus aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

Forwards.propTypes = {
  space: PropTypes.object.isRequired,
  removed: PropTypes.array.isRequired,
  added: PropTypes.array.isRequired,
  onRemoveExisting: PropTypes.func.isRequired,
  onRemoveAdded: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

const TOGGLES = [
  { id: 'hw-nat-enabled', field: 'enabled', labelKey: 'host.networkSpaces.enabledLabel' },
  { id: 'hw-nat-dhcp', field: 'dhcp', labelKey: 'host.networkSpaces.dhcpToggle' },
  { id: 'hw-nat-ipv6', field: 'ipv6', labelKey: 'host.networkSpaces.ipv6Label' },
];

/**
 * The NAT network dialog of the network spaces, hyperweaver-ui's: the
 * name at create, the CIDR, the enabled, DHCP and IPv6 switches, and on
 * an edit the port forwards, an existing one marked for removal and a
 * new one staged, the body carrying the removals then the additions so
 * a same-named rule replaces in one call. The body is `natNetworkBody`.
 */
const NatNetworkModal = ({ space = null, busy, onSave, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: space?.name || '',
    cidr: space?.cidr || '',
    enabled: space ? space.enabled !== false : true,
    dhcp: space ? Boolean(space.dhcp_enabled) : true,
    ipv6: space ? Boolean(space.ipv6) : false,
    removedForwards: [],
    addedForwards: [],
  });
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  return (
    <ToolFormDialog
      dialog="space-natnetwork"
      title={space ? space.name : t('host.networkSpaces.newNat')}
      submitKey={space ? 'host.networkSpaces.save' : 'host.networkSpaces.createBtn'}
      busy={busy}
      disabled={!natNetworkReady(form, space)}
      onClose={onClose}
      onSubmit={() => onSave(natNetworkBody(form, space))}
    >
      <div className="row g-3">
        {space ? null : (
          <div className="col-6">
            <label className="form-label" htmlFor="hw-nat-name">
              {t('host.networkSpaces.name')}
            </label>
            <input
              id="hw-nat-name"
              className="form-control font-monospace"
              value={form.name}
              required
              onChange={event => change('name', event.target.value)}
            />
          </div>
        )}
        <div className="col-6">
          <label className="form-label" htmlFor="hw-nat-cidr">
            {t('host.networkSpaces.cidr')}
          </label>
          <input
            id="hw-nat-cidr"
            className="form-control font-monospace"
            value={form.cidr}
            required
            onChange={event => change('cidr', event.target.value)}
            placeholder="10.0.5.0/24"
          />
        </div>
        <div className="col-12 d-flex gap-4 flex-wrap">
          {TOGGLES.map(toggle => (
            <div className="form-check form-switch" key={toggle.id}>
              <input
                id={toggle.id}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={form[toggle.field]}
                onChange={event => change(toggle.field, event.target.checked)}
              />
              <label className="form-check-label" htmlFor={toggle.id}>
                {t(toggle.labelKey)}
              </label>
            </div>
          ))}
        </div>
        {space ? (
          <Forwards
            space={space}
            removed={form.removedForwards}
            added={form.addedForwards}
            onRemoveExisting={gone => change('removedForwards', [...form.removedForwards, gone])}
            onRemoveAdded={forward =>
              change(
                'addedForwards',
                form.addedForwards.filter(held => held !== forward)
              )
            }
            onAdd={forward => change('addedForwards', [...form.addedForwards, forward])}
          />
        ) : null}
      </div>
    </ToolFormDialog>
  );
};

NatNetworkModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default NatNetworkModal;
