import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ADDRESS_FORM,
  addressObjectOf,
  addressProblem,
  addressTypesOf,
  isGoAgent,
} from '../utils/networkingManagement';

import ToolFormDialog from './ToolFormDialog';

const NETMASKS = [
  ['8', '255.0.0.0'],
  ['16', '255.255.0.0'],
  ['24', '255.255.255.0'],
  ['25', '255.255.255.128'],
  ['26', '255.255.255.192'],
  ['27', '255.255.255.224'],
  ['28', '255.255.255.240'],
  ['29', '255.255.255.248'],
  ['30', '255.255.255.252'],
];

const withField = (form, field, value) => {
  const next = { ...form, [field]: value };
  if (field === 'interface' || field === 'type' || field === 'address') {
    return { ...next, addrobj: addressObjectOf(next) };
  }
  return next;
};

const StaticFields = ({ form, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        <div className="mb-3">
          <label className="form-label" htmlFor="address-input">
            {t('host.ipAddressCreateModal.ipAddressLabel')} *
          </label>
          <input
            id="address-input"
            className="form-control"
            type="text"
            placeholder="192.168.1.100 or 2001:db8::1"
            value={form.address}
            onChange={event => onChange('address', event.target.value)}
            disabled={busy}
            required
          />
          <p className="form-text text-muted">{t('host.ipAddressCreateModal.ipAddressHelp')}</p>
        </div>
      </div>
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="netmask-select">
            {t('host.ipAddressCreateModal.netmaskLabel')} *
          </label>
          <select
            id="netmask-select"
            className="form-select"
            value={form.netmask}
            onChange={event => onChange('netmask', event.target.value)}
            disabled={busy}
            required
          >
            {NETMASKS.map(([bits, mask]) => (
              <option key={bits} value={bits}>
                /{bits} ({mask})
              </option>
            ))}
          </select>
          <p className="form-text text-muted">{t('host.ipAddressCreateModal.netmaskHelp')}</p>
        </div>
      </div>
    </div>
  );
};

StaticFields.propTypes = {
  form: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const Flag = ({ id, label, checked, busy, onChange }) => (
  <div className="mb-3">
    <div className="form-check">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={busy}
      />
      <label className="form-check-label" htmlFor={id}>
        {label}
      </label>
    </div>
  </div>
);

Flag.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The create dialog of an IP address, hyperweaver-ui's: the interface
 * among the host's VNICs and physical interfaces, the address object
 * named from the interface, the version and the type until a person
 * types one, the type, static everywhere, DHCP and addrconf as the host
 * offers them (`addressTypesOf`), the address and its netmask for a
 * static one, the wait, and the primary, temporary and down flags. The
 * form's problem draws over the fields and holds the send; the body is
 * `addressBody`.
 */
const IpAddressCreateModal = ({ server, interfaces, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(ADDRESS_FORM);
  const [tried, setTried] = useState(false);
  const types = addressTypesOf(server);
  const problem = addressProblem(form);
  const change = (field, value) => setForm(current => withField(current, field, value));

  const submit = () => {
    setTried(true);
    if (!problem) {
      onSubmit(form);
    }
  };

  return (
    <ToolFormDialog
      dialog="address-create"
      title={t('host.ipAddressCreateModal.title')}
      submitKey="host.ipAddressCreateModal.submit"
      problemKey={tried ? problem : ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="interface-select">
          {t('host.ipAddressCreateModal.interfaceLabel')} *
        </label>
        <select
          id="interface-select"
          className="form-select"
          value={form.interface}
          onChange={event => change('interface', event.target.value)}
          disabled={busy}
          required
        >
          <option value="">{t('host.ipAddressCreateModal.selectInterface')}</option>
          {interfaces.map(row => (
            <option key={row.name} value={row.name}>
              {row.name} ({row.type}
              {row.over ? t('host.ipAddressCreateModal.over', { over: row.over }) : ''})
            </option>
          ))}
        </select>
        <p className="form-text text-muted">{t('host.ipAddressCreateModal.interfaceHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="addrobj-input">
          {t('host.ipAddressCreateModal.addrobjLabel')} *
        </label>
        <input
          id="addrobj-input"
          className="form-control"
          type="text"
          placeholder="e.g., vnic0/v4static"
          value={form.addrobj}
          onChange={event => change('addrobj', event.target.value)}
          disabled={busy}
          required
        />
        <p className="form-text text-muted">{t('host.ipAddressCreateModal.addrobjHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="type-select">
          {t('host.ipAddressCreateModal.addressType')}
        </label>
        <select
          id="type-select"
          className="form-select"
          value={form.type}
          onChange={event => change('type', event.target.value)}
          disabled={busy}
        >
          <option value="static">{t('host.ipAddressCreateModal.typeStatic')}</option>
          {types.dhcp ? (
            <option value="dhcp">{t('host.ipAddressCreateModal.typeDhcp')}</option>
          ) : null}
          {types.addrconf ? (
            <option value="addrconf">{t('host.ipAddressCreateModal.typeAddrconf')}</option>
          ) : null}
        </select>
        {isGoAgent(server) ? (
          <p className="form-text text-muted">{t('host.ipAddressCreateModal.goTypeHelp')}</p>
        ) : null}
      </div>
      {form.type === 'static' ? <StaticFields form={form} busy={busy} onChange={change} /> : null}
      <div className="mb-3">
        <label className="form-label" htmlFor="wait-input">
          {t('host.ipAddressCreateModal.waitTimeout')}
        </label>
        <input
          id="wait-input"
          className="form-control"
          type="number"
          min="1"
          max="300"
          value={form.wait}
          onChange={event => change('wait', event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted">{t('host.ipAddressCreateModal.waitHelp')}</p>
      </div>
      <Flag
        id="primary-checkbox"
        label={t('host.ipAddressCreateModal.primaryAddress')}
        checked={form.primary}
        busy={busy}
        onChange={value => change('primary', value)}
      />
      <Flag
        id="temporary-checkbox"
        label={t('host.ipAddressCreateModal.temporary')}
        checked={form.temporary}
        busy={busy}
        onChange={value => change('temporary', value)}
      />
      <Flag
        id="down-checkbox"
        label={t('host.ipAddressCreateModal.downState')}
        checked={form.down}
        busy={busy}
        onChange={value => change('down', value)}
      />
    </ToolFormDialog>
  );
};

IpAddressCreateModal.propTypes = {
  server: PropTypes.object.isRequired,
  interfaces: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      over: PropTypes.string,
    })
  ).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default IpAddressCreateModal;
