import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  hostOnlyIfBody,
  hostOnlyIfReady,
  hostOnlyNetBody,
  hostOnlyNetReady,
} from '../../utils/networkingManagement';
import ToolFormDialog from '../ToolFormDialog';

const DEFAULT_NETMASK = '255.255.255.0';

const Field = ({ id, labelKey, value, placeholder, required, onChange, className = 'col-4' }) => {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        className="form-control font-monospace"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
};

Field.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

const Switch = ({ id, labelKey, checked, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12">
      <div className="form-check form-switch">
        <input
          id={id}
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
        />
        <label className="form-check-label" htmlFor={id}>
          {t(labelKey)}
        </label>
      </div>
    </div>
  );
};

Switch.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The host-only interface dialog of the network spaces, hyperweaver-ui's:
 * the static address and its netmask, and the DHCP server behind its
 * switch, its server address and its range; VirtualBox names a new
 * interface itself, and a server switched off on an interface that had
 * one is removed. The body is `hostOnlyIfBody`.
 */
export const HostOnlyIfModal = ({ space = null, busy, onSave, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    ip: space?.ip_address || '',
    netmask: space?.network_mask || DEFAULT_NETMASK,
    dhcpOn: Boolean(space?.dhcp?.exists),
    serverIp: space?.dhcp?.server_ip || '',
    lowerIp: space?.dhcp?.lower_ip || '',
    upperIp: space?.dhcp?.upper_ip || '',
  });
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  return (
    <ToolFormDialog
      dialog="space-hostonly"
      title={space ? space.name : t('host.networkSpaces.newHostonlyIf')}
      submitKey={space ? 'host.networkSpaces.save' : 'host.networkSpaces.createBtn'}
      busy={busy}
      disabled={!hostOnlyIfReady(form)}
      onClose={onClose}
      onSubmit={() => onSave(hostOnlyIfBody(form, space))}
    >
      <div className="row g-3">
        <Field
          id="hw-hoif-ip"
          labelKey="host.networkSpaces.ip"
          value={form.ip}
          placeholder="192.168.56.1"
          onChange={value => change('ip', value)}
          className="col-6"
        />
        <Field
          id="hw-hoif-mask"
          labelKey="host.networkSpaces.netmask"
          value={form.netmask}
          onChange={value => change('netmask', value)}
          className="col-6"
        />
        <Switch
          id="hw-hoif-dhcp"
          labelKey="host.networkSpaces.dhcpToggle"
          checked={form.dhcpOn}
          onChange={value => change('dhcpOn', value)}
        />
        {form.dhcpOn ? (
          <>
            <Field
              id="hw-hoif-dhcpip"
              labelKey="host.networkSpaces.dhcpServerIp"
              value={form.serverIp}
              onChange={value => change('serverIp', value)}
            />
            <Field
              id="hw-hoif-lower"
              labelKey="host.networkSpaces.lowerIp"
              value={form.lowerIp}
              onChange={value => change('lowerIp', value)}
            />
            <Field
              id="hw-hoif-upper"
              labelKey="host.networkSpaces.upperIp"
              value={form.upperIp}
              onChange={value => change('upperIp', value)}
            />
          </>
        ) : null}
      </div>
    </ToolFormDialog>
  );
};

HostOnlyIfModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The host-only network dialog of the network spaces, hyperweaver-ui's
 * VirtualBox 7 network: named at create, its netmask, its range and
 * whether it is enabled. The body is `hostOnlyNetBody`.
 */
export const HostOnlyNetModal = ({ space = null, busy, onSave, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: space?.name || '',
    netmask: space?.network_mask || DEFAULT_NETMASK,
    lowerIp: space?.lower_ip || '',
    upperIp: space?.upper_ip || '',
    enabled: space ? space.enabled !== false : true,
  });
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  return (
    <ToolFormDialog
      dialog="space-hostonlynet"
      title={space ? space.name : t('host.networkSpaces.newHostonlyNet')}
      submitKey={space ? 'host.networkSpaces.save' : 'host.networkSpaces.createBtn'}
      busy={busy}
      disabled={!hostOnlyNetReady(form, space)}
      onClose={onClose}
      onSubmit={() => onSave(hostOnlyNetBody(form, space))}
    >
      <div className="row g-3">
        {space ? null : (
          <Field
            id="hw-honet-name"
            labelKey="host.networkSpaces.name"
            value={form.name}
            required
            onChange={value => change('name', value)}
            className="col-12"
          />
        )}
        <Field
          id="hw-honet-mask"
          labelKey="host.networkSpaces.netmask"
          value={form.netmask}
          onChange={value => change('netmask', value)}
        />
        <Field
          id="hw-honet-lower"
          labelKey="host.networkSpaces.lowerIp"
          value={form.lowerIp}
          onChange={value => change('lowerIp', value)}
        />
        <Field
          id="hw-honet-upper"
          labelKey="host.networkSpaces.upperIp"
          value={form.upperIp}
          onChange={value => change('upperIp', value)}
        />
        <Switch
          id="hw-honet-enabled"
          labelKey="host.networkSpaces.enabledLabel"
          checked={form.enabled}
          onChange={value => change('enabled', value)}
        />
      </div>
    </ToolFormDialog>
  );
};

HostOnlyNetModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
