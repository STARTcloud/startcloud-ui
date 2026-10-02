import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaTriangleExclamation } from 'react-icons/fa6';

import { VocabularySelect } from './HardwareEditor';
import PickOrType from './PickOrType';

const ADDRESS_FIELDS = ['address', 'netmask', 'gateway'];

const DNS_SLOTS = [0, 1];

const TUNING_FIELDS = [
  { key: 'promisc', suggest: ['deny', 'allow-vms', 'allow-all'] },
  { key: 'speed', type: 'number' },
  { key: 'boot_prio', type: 'number' },
  { key: 'bandwidth_group' },
  {
    key: 'nic_type',
    suggest: ['Am79C970A', 'Am79C973', '82540EM', '82543GC', '82545EM', 'virtio'],
  },
];

const NEW_NETWORK = { type: '', dhcp4: true, mac: 'auto', dns: ['', ''] };

const TuningField = ({ rowKey, field, network, nicEnums, onPatch, loading }) => {
  const { t } = useTranslation();
  const vocabulary = nicEnums?.[`nics.${field.key}`] || field.suggest;
  return (
    <div className="col-6 col-md-2">
      <label className="form-label small mb-1" htmlFor={`${rowKey}-${field.key}`}>
        {t(`machineEdit.networksEditor.tuningField.${field.key}`)}
      </label>
      {vocabulary ? (
        <VocabularySelect
          id={`${rowKey}-${field.key}`}
          value={network[field.key] ?? ''}
          entries={vocabulary}
          blankLabel={t('machineEdit.common.na')}
          small
          onChange={next => onPatch({ [field.key]: next })}
          disabled={loading}
        />
      ) : (
        <input
          id={`${rowKey}-${field.key}`}
          className="form-control form-control-sm"
          type={field.type || 'text'}
          placeholder={t('machineEdit.common.na')}
          value={network[field.key] ?? ''}
          onChange={event => onPatch({ [field.key]: event.target.value })}
          disabled={loading}
        />
      )}
    </div>
  );
};

TuningField.propTypes = {
  rowKey: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  network: PropTypes.object.isRequired,
  nicEnums: PropTypes.object,
  onPatch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const NetworkRow = ({
  index,
  network,
  onPatch,
  onDrop,
  bridgeChoices,
  ipSuggestions,
  nicEnums,
  loading,
}) => {
  const { t } = useTranslation();
  const rowKey = `network-${index}`;
  const dns = Array.isArray(network.dns) ? network.dns : [];
  const ipOptions = Array.isArray(ipSuggestions?.suggestions) ? ipSuggestions.suggestions : [];
  const setDns = (dnsIndex, value) => {
    const next = [...dns];
    while (next.length < 2) {
      next.push('');
    }
    next[dnsIndex] = value;
    onPatch({ dns: next });
  };
  const onProvisioningLink = bridgeChoices.some(
    choice => choice.provisioning && choice.value === network.bridge
  );
  return (
    <div className="border rounded p-2" data-network-row={index}>
      {index === 0 ? (
        <p className="form-text text-muted mt-0 mb-2">
          {t('machineEdit.networksEditor.firstNetworkHint')}
        </p>
      ) : null}
      <div className="row g-2 align-items-end">
        <div className="col-6 col-md-2">
          <label className="form-label small mb-1" htmlFor={`${rowKey}-type`}>
            {t('machineEdit.networksEditor.type')}
          </label>
          <input
            id={`${rowKey}-type`}
            className="form-control form-control-sm"
            type="text"
            list={`${rowKey}-type-options`}
            value={network.type ?? ''}
            onChange={event => onPatch({ type: event.target.value })}
            disabled={loading}
          />
          <datalist id={`${rowKey}-type-options`}>
            <option value="external" />
            <option value="host" />
          </datalist>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1" htmlFor={`${rowKey}-bridge`}>
            {t('machineEdit.networksEditor.bridgeUplink')}
          </label>
          {bridgeChoices.length > 0 ? (
            <PickOrType
              id={`${rowKey}-bridge`}
              value={network.bridge ?? ''}
              onChange={next => onPatch({ bridge: next })}
              options={bridgeChoices}
              blankLabel={t('machineEdit.networksEditor.selectUplink')}
              placeholder="link name"
              small
              disabled={loading}
            />
          ) : (
            <input
              id={`${rowKey}-bridge`}
              className="form-control form-control-sm"
              type="text"
              value={network.bridge ?? ''}
              onChange={event => onPatch({ bridge: event.target.value })}
              disabled={loading}
            />
          )}
          {onProvisioningLink ? (
            <span className="form-text text-warning small">
              <FaTriangleExclamation className="me-1" aria-hidden="true" />
              {t('machineEdit.networksEditor.provisioningEtherstubWarning')}
            </span>
          ) : null}
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small mb-1" htmlFor={`${rowKey}-mac`}>
            {t('machineEdit.networksEditor.mac')}
          </label>
          <input
            id={`${rowKey}-mac`}
            className="form-control form-control-sm"
            type="text"
            placeholder="auto"
            value={network.mac ?? ''}
            onChange={event => onPatch({ mac: event.target.value })}
            disabled={loading}
          />
        </div>
        <div className="col-6 col-md-2">
          <div className="form-check form-switch mb-1">
            <input
              id={`${rowKey}-dhcp`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={Boolean(network.dhcp4)}
              onChange={event => onPatch({ dhcp4: event.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label small" htmlFor={`${rowKey}-dhcp`}>
              {t('machineEdit.networksEditor.dhcp')}
            </label>
          </div>
        </div>
        <div className="col-auto ms-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label={t('machineEdit.networksEditor.removeNetwork')}
            onClick={onDrop}
            disabled={loading}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="row g-2 align-items-end mt-0">
        {ADDRESS_FIELDS.map(key => (
          <div className="col-6 col-md-2" key={key}>
            <label className="form-label small mb-1" htmlFor={`${rowKey}-${key}`}>
              {t(`machineEdit.networksEditor.addressField.${key}`)}
            </label>
            <input
              id={`${rowKey}-${key}`}
              className="form-control form-control-sm"
              type="text"
              list={
                key === 'address' && !network.dhcp4 && ipOptions.length > 0
                  ? 'machine-ip-suggestions'
                  : undefined
              }
              placeholder={
                key === 'gateway' && ipSuggestions?.gateway
                  ? `e.g. ${ipSuggestions.gateway}`
                  : undefined
              }
              value={network[key] ?? ''}
              onChange={event => onPatch({ [key]: event.target.value })}
              disabled={loading || Boolean(network.dhcp4)}
            />
          </div>
        ))}
        {DNS_SLOTS.map(dnsIndex => (
          <div className="col-6 col-md-2" key={`dns-${dnsIndex}`}>
            <label className="form-label small mb-1" htmlFor={`${rowKey}-dns-${dnsIndex}`}>
              {t('machineEdit.networksEditor.dns', { index: dnsIndex + 1 })}
            </label>
            <input
              id={`${rowKey}-dns-${dnsIndex}`}
              className="form-control form-control-sm"
              type="text"
              placeholder={dnsIndex === 0 ? '1.1.1.1' : '1.0.0.1'}
              value={dns[dnsIndex] ?? ''}
              onChange={event => setDns(dnsIndex, event.target.value)}
              disabled={loading}
            />
          </div>
        ))}
        <div className="col-6 col-md-2">
          <label className="form-label small mb-1" htmlFor={`${rowKey}-route`}>
            {t('machineEdit.networksEditor.route')}
          </label>
          <input
            id={`${rowKey}-route`}
            className="form-control form-control-sm font-monospace"
            type="text"
            placeholder={t('machineEdit.networksEditor.default')}
            title={t('machineEdit.networksEditor.routeHint')}
            value={network.route ?? ''}
            onChange={event => onPatch({ route: event.target.value })}
            disabled={loading}
          />
        </div>
      </div>
      <details className="mt-1">
        <summary className="small text-muted">
          {t('machineEdit.networksEditor.adapterTuning')}
        </summary>
        <div className="row g-2 align-items-end mt-0">
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor={`${rowKey}-cable`}>
              {t('machineEdit.networksEditor.cable')}
            </label>
            <VocabularySelect
              id={`${rowKey}-cable`}
              value={network.cable_connected ?? ''}
              entries={[
                { value: 'on', label: t('machineEdit.networksEditor.connected') },
                { value: 'off', label: t('machineEdit.networksEditor.disconnected') },
              ]}
              blankLabel={t('machineEdit.common.na')}
              small
              onChange={next => onPatch({ cable_connected: next })}
              disabled={loading}
            />
          </div>
          {TUNING_FIELDS.map(field => (
            <TuningField
              key={field.key}
              rowKey={rowKey}
              field={field}
              network={network}
              nicEnums={nicEnums}
              onPatch={onPatch}
              loading={loading}
            />
          ))}
        </div>
      </details>
    </div>
  );
};

NetworkRow.propTypes = {
  index: PropTypes.number.isRequired,
  network: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  bridgeChoices: PropTypes.array.isRequired,
  ipSuggestions: PropTypes.object,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * The networks of the create wizard, hyperweaver-ui's networks editor:
 * one row a `networks[]` entry with its type, its uplink from the host's
 * bridged interfaces, its MAC, DHCP or static addressing with two DNS
 * entries and a route, and the adapter tuning under a fold; an entry
 * passes to the agent as it is, so members beyond these fields survive.
 */
const NetworksEditor = ({
  networks,
  onNetworksChange,
  bridgeChoices = [],
  ipSuggestions = null,
  nicEnums = null,
  loading = false,
}) => {
  const { t } = useTranslation();
  const ipOptions = Array.isArray(ipSuggestions?.suggestions) ? ipSuggestions.suggestions : [];
  const setNetwork = (index, patch) =>
    onNetworksChange(
      networks.map((network, at) => (at === index ? { ...network, ...patch } : network))
    );
  const rows = networks.map((network, index) => ({ network, index }));

  return (
    <div className="d-flex flex-column gap-2" data-editor="networks">
      {ipOptions.length > 0 ? (
        <datalist id="machine-ip-suggestions">
          {ipOptions.map(ip => (
            <option key={ip} value={ip} />
          ))}
        </datalist>
      ) : null}
      {networks.length === 0 ? (
        <p className="text-muted small mb-0">{t('machineEdit.networksEditor.noNetworksDefined')}</p>
      ) : null}
      {rows.map(({ network, index }) => (
        <NetworkRow
          key={`network-${index}`}
          index={index}
          network={network}
          onPatch={patch => setNetwork(index, patch)}
          onDrop={() => onNetworksChange(networks.filter(entry => entry !== network))}
          bridgeChoices={bridgeChoices}
          ipSuggestions={ipSuggestions}
          nicEnums={nicEnums}
          loading={loading}
        />
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onNetworksChange([...networks, { ...NEW_NETWORK, dns: ['', ''] }])}
          disabled={loading}
        >
          <FaPlus className="me-2" aria-hidden="true" />
          {t('machineEdit.networksEditor.addNetwork')}
        </button>
      </div>
    </div>
  );
};

NetworksEditor.propTypes = {
  networks: PropTypes.array.isRequired,
  onNetworksChange: PropTypes.func.isRequired,
  bridgeChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  ipSuggestions: PropTypes.object,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

export default NetworksEditor;
