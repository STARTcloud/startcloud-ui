import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCubes,
  FaDice,
  FaEthernet,
  FaNetworkWired,
  FaPlus,
  FaRotateLeft,
  FaTrash,
  FaTriangleExclamation,
  FaWaveSquare,
} from 'react-icons/fa6';

import CopyButton from '../../../components/common/CopyButton';
import { nicSummary } from '../utils/machines';
import { markButtonClass } from '../utils/machineSettings';

import { VocabularySelect } from './HardwareEditor';
import VnicLinkPropsEditor from './VnicLinkPropsEditor';

const TRANSPORT_ADAPTER = 1;

const TUNING_FIELDS = [
  { key: 'cable_connected', options: ['on', 'off'] },
  { key: 'promisc', enumKey: 'promisc' },
  { key: 'speed', type: 'number' },
  { key: 'boot_prio', type: 'number' },
  { key: 'bandwidth_group' },
  { key: 'nic_type', enumKey: 'nic_type' },
  { key: 'remove_on_completion', options: ['true', 'false'] },
];

const FALLBACK_ENUMS = {
  promisc: ['deny', 'allow-vms', 'allow-all'],
  nic_type: ['Am79C970A', 'Am79C973', '82540EM', '82543GC', '82545EM', 'virtio'],
};

const ZONE_NIC_EDIT_FIELDS = [
  { key: 'global_nic', currentOf: nic => nic.globalNic, liveOf: live => live?.over || '' },
  {
    key: 'vlan_id',
    type: 'number',
    currentOf: nic => nic.vlanId,
    liveOf: live => (live?.vid === undefined || live?.vid === null ? '' : String(live.vid)),
  },
  { key: 'mac_addr', currentOf: nic => nic.mac, liveOf: live => live?.macaddress || '' },
  { key: 'allowed_address', currentOf: nic => nic.allowedAddress, liveOf: () => '' },
  { key: 'address', currentOf: nic => nic.address, liveOf: () => '' },
  { key: 'defrouter', currentOf: nic => nic.defrouter, liveOf: () => '' },
];

const ADD_ZONE_FIELDS = [
  { key: 'vlan_id', type: 'number', min: '0', placeholder: 'none', col: 'col-6 col-md-2' },
  { key: 'allowed_address', placeholder: 'e.g. 10.0.0.12/24', mono: true, col: 'col-6 col-md-3' },
  {
    key: 'physical',
    placeholder: 'blank, or a physical link e.g. igb2',
    mono: true,
    col: 'col-6 col-md-3',
    labelKey: 'machineEdit.networkAdaptersEditor.vnicNameOrHwNic',
  },
  { key: 'address', placeholder: 'none', mono: true, col: 'col-6 col-md-3' },
  { key: 'defrouter', placeholder: 'none', mono: true, col: 'col-6 col-md-3' },
];

const PROP_WARNING_KEYS = new Set(['promiscphys']);

const UNDOCUMENTED_PROPS = new Set(['mtu', 'backend']);

const propLabel = key => key.replace(/_/gu, ' ');

/**
 * A locally administered unicast MAC, `02:xx:xx:xx:xx:xx`.
 *
 * @returns {string} The address
 */
export const randomMac = () => {
  const octet = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  return ['02', octet(), octet(), octet(), octet(), octet()].join(':');
};

const MarkIcon = ({ marked }) =>
  marked ? <FaRotateLeft aria-hidden="true" /> : <FaTrash aria-hidden="true" />;

MarkIcon.propTypes = {
  marked: PropTypes.bool.isRequired,
};

const NicPropField = ({ idPrefix, propKey, value, blankLabel, vocabulary, onChange, disabled }) => {
  const { t } = useTranslation();
  const inputId = `${idPrefix}-prop-${propKey}`;
  const warning = PROP_WARNING_KEYS.has(propKey)
    ? t(`machineEdit.networkAdaptersEditor.propWarning.${propKey}`)
    : '';
  return (
    <div className="col-6 col-md-3">
      <label className="form-label small mb-1 text-capitalize" htmlFor={inputId}>
        {propLabel(propKey)}
        {warning ? (
          <FaTriangleExclamation
            className="text-warning ms-1"
            title={warning}
            aria-label={warning}
          />
        ) : null}
      </label>
      {vocabulary ? (
        <select
          id={inputId}
          className="form-select form-select-sm"
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">
            {vocabulary.some(option => String(option) === blankLabel)
              ? `${blankLabel} - Default`
              : blankLabel}
          </option>
          {vocabulary
            .filter(option => String(option) !== blankLabel)
            .map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
      ) : (
        <input
          id={inputId}
          className="form-control form-control-sm"
          placeholder={blankLabel}
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
      {warning ? <span className="form-text text-warning small">{warning}</span> : null}
    </div>
  );
};

NicPropField.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  propKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  blankLabel: PropTypes.string.isRequired,
  vocabulary: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const blankLabelOf = ({ key, current, fallback, t }) => {
  if (current !== undefined && current !== '') {
    return String(current);
  }
  if (fallback === undefined) {
    return UNDOCUMENTED_PROPS.has(key)
      ? t('machineEdit.networkAdaptersEditor.undocumentedProp')
      : t('machineEdit.common.na');
  }
  return String(fallback);
};

/**
 * The zonecfg net-resource properties the bhyve brand consumes for one
 * NIC, the ones its backend takes as `nic_props_by_netif` says; a blank
 * field shows the value it runs with.
 */
const NicPropsEditor = ({
  idPrefix,
  netif = '',
  props,
  currentProps = {},
  propsByNetif = null,
  propDefaults = {},
  propValues = {},
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const applicable = propsByNetif?.[netif] || null;
  if (!applicable || applicable.length === 0) {
    return null;
  }
  return (
    <div className="device-row device-child device-child-form">
      <details className="w-100">
        <summary className="small fw-semibold">
          {t('machineEdit.networkAdaptersEditor.brandNetProperties')}
          {netif ? ` — ${netif}` : ''}
        </summary>
        <div className="row g-2 align-items-end mt-0">
          {applicable.map(key => (
            <NicPropField
              key={key}
              idPrefix={idPrefix}
              propKey={key}
              value={props[key] ?? ''}
              blankLabel={blankLabelOf({
                key,
                current: currentProps[key],
                fallback: propDefaults[`nics.props.${key}`],
                t,
              })}
              vocabulary={propValues[`nics.props.${key}`] || null}
              onChange={value => onChange(key, value)}
              disabled={disabled}
            />
          ))}
        </div>
      </details>
    </div>
  );
};

NicPropsEditor.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  netif: PropTypes.string,
  props: PropTypes.object.isRequired,
  currentProps: PropTypes.object,
  propsByNetif: PropTypes.object,
  propDefaults: PropTypes.object,
  propValues: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const removeOnCompletionLabel = (current, t) => {
  if (current?.remove_on_completion === undefined) {
    return t('machineEdit.common.na');
  }
  return current.remove_on_completion
    ? t('machineEdit.networkAdaptersEditor.remove')
    : t('machineEdit.networkAdaptersEditor.keep');
};

const zoneNicPlaceholder = (field, nic, live, t) => {
  const current = field.currentOf(nic);
  if (current) {
    return current;
  }
  const liveValue = field.liveOf(live);
  return liveValue
    ? t('machineEdit.networkAdaptersEditor.unsetLive', { live: liveValue })
    : t('machineEdit.networkAdaptersEditor.unset');
};

const liveSpeed = speed => {
  if (!speed) {
    return null;
  }
  return speed >= 1000 ? `${speed / 1000}G` : `${speed}M`;
};

const LiveVnicLine = ({ live = null }) => {
  const { t } = useTranslation();
  if (!live) {
    return (
      <span className="text-muted small">
        {t('machineEdit.networkAdaptersEditor.noLiveVnicRecord')}
      </span>
    );
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1 align-items-center small">
      <span
        className={`badge ${live.state === 'up' ? 'text-bg-success' : 'text-bg-secondary'}`}
        title={t('machineEdit.networkAdaptersEditor.linkState')}
      >
        {live.state || t('machineEdit.networkAdaptersEditor.unknown')}
      </span>
      {live.over ? (
        <span
          className="badge text-bg-secondary"
          title={t('machineEdit.networkAdaptersEditor.physicalLinkTitle')}
        >
          {t('machineEdit.networkAdaptersEditor.over', { over: live.over })}
        </span>
      ) : null}
      {liveSpeed(live.speed) ? (
        <span
          className="badge text-bg-info"
          title={t('machineEdit.networkAdaptersEditor.linkSpeed')}
        >
          {liveSpeed(live.speed)}
        </span>
      ) : null}
      <code
        className="small"
        title={t('machineEdit.networkAdaptersEditor.liveMacTitle', {
          type: live.macaddrtype || t('machineEdit.networkAdaptersEditor.unknownType'),
        })}
      >
        {live.macaddress}
      </code>
      {live.macaddress ? (
        <CopyButton
          text={live.macaddress}
          label={t('machineEdit.networkAdaptersEditor.copyLabel', {
            label: t('machineEdit.networkAdaptersEditor.liveMac'),
          })}
          className="btn btn-link btn-sm p-0 small"
        />
      ) : null}
      {live.macaddrtype ? <span className="text-muted">({live.macaddrtype})</span> : null}
      <span
        className="badge text-bg-light border"
        title={t('machineEdit.networkAdaptersEditor.vlanId')}
      >
        {t('machineEdit.networkAdaptersEditor.vid', { vid: live.vid ?? 0 })}
      </span>
      {live.mtu ? (
        <span
          className="badge text-bg-light border"
          title={t('machineEdit.networkAdaptersEditor.mtu')}
        >
          {t('machineEdit.networkAdaptersEditor.mtuValue', { mtu: live.mtu })}
        </span>
      ) : null}
    </span>
  );
};

LiveVnicLine.propTypes = {
  live: PropTypes.object,
};

/**
 * A tuning row of an adapter `knob_current` did not seed.
 *
 * @param {number|string} adapter - The adapter's slot
 * @returns {Object} The row
 */
export const blankNicRow = adapter => ({
  key: `nic-${adapter}`,
  adapter: String(adapter),
  cable_connected: '',
  promisc: '',
  speed: '',
  boot_prio: '',
  bandwidth_group: '',
  nic_type: '',
  remove_on_completion: '',
});

const NicTuningField = ({ inputId, field, value, nicEnums = null, onChange, disabled }) => {
  const { t } = useTranslation();
  let vocabulary = null;
  if (field.options) {
    vocabulary = field.options.map(option => ({
      value: option,
      label: t(`machineEdit.networkAdaptersEditor.tuningOption.${field.key}.${option}`),
    }));
  } else if (field.enumKey) {
    vocabulary = nicEnums?.[`nics.${field.enumKey}`] || FALLBACK_ENUMS[field.enumKey];
  }
  if (vocabulary) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={t('machineEdit.common.na')}
        small
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={inputId}
      className="form-control form-control-sm"
      type={field.type || 'text'}
      placeholder={t('machineEdit.common.na')}
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    />
  );
};

NicTuningField.propTypes = {
  inputId: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  nicEnums: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const TuningGrid = ({ idPrefix, row, nicEnums, onPatch, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-2 align-items-end mt-0">
      {TUNING_FIELDS.map(field => {
        const inputId = `${idPrefix}-${field.key}`;
        return (
          <div className="col-6 col-md-2" key={field.key}>
            <label className="form-label small mb-1" htmlFor={inputId}>
              {t(`machineEdit.networkAdaptersEditor.tuningField.${field.key}`)}
            </label>
            <NicTuningField
              inputId={inputId}
              field={field}
              value={row[field.key] ?? ''}
              nicEnums={nicEnums}
              onChange={value => onPatch({ [field.key]: value })}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
};

TuningGrid.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  nicEnums: PropTypes.object,
  onPatch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const MacField = ({ id, value, onChange, disabled, small = true }) => {
  const { t } = useTranslation();
  return (
    <div className={small ? 'input-group input-group-sm' : 'input-group'}>
      <input
        id={id}
        className="form-control"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        title={t('machineEdit.networkAdaptersEditor.generateRandomMac')}
        onClick={() => onChange(randomMac())}
        disabled={disabled}
      >
        <FaDice aria-hidden="true" />
      </button>
    </div>
  );
};

MacField.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  small: PropTypes.bool,
};

const ZoneNicFields = ({ nic, live, edits, isProvisional, bridgeOptions, onEdit, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      {ZONE_NIC_EDIT_FIELDS.map(field => {
        const inputId = `zone-nic-${nic.physical}-${field.key}`;
        const isBridge = field.key === 'global_nic';
        const control = (
          <input
            id={inputId}
            className="form-control form-control-sm"
            type={field.type || 'text'}
            list={isBridge && bridgeOptions.length > 0 ? `${inputId}-options` : undefined}
            placeholder={zoneNicPlaceholder(field, nic, live, t)}
            title={
              isProvisional
                ? t('machineEdit.networkAdaptersEditor.lockedProvisioning')
                : t('machineEdit.networkAdaptersEditor.blankKeepsCurrent')
            }
            value={edits[field.key] ?? ''}
            onChange={event => onEdit(field.key, event.target.value)}
            disabled={disabled || isProvisional}
          />
        );
        return (
          <div className="col-6 col-md-3" key={field.key}>
            <label className="form-label small mb-1" htmlFor={inputId}>
              {t(`machineEdit.networkAdaptersEditor.zoneNicField.${field.key}`)}
            </label>
            {field.key === 'mac_addr' ? (
              <div className="input-group input-group-sm">
                {control}
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  title={t('machineEdit.networkAdaptersEditor.generateRandomMac')}
                  onClick={() => onEdit(field.key, randomMac())}
                  disabled={disabled}
                >
                  <FaDice aria-hidden="true" />
                </button>
              </div>
            ) : (
              control
            )}
            {isBridge && bridgeOptions.length > 0 ? (
              <datalist id={`${inputId}-options`}>
                {bridgeOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

ZoneNicFields.propTypes = {
  nic: PropTypes.object.isRequired,
  live: PropTypes.object,
  edits: PropTypes.object.isRequired,
  isProvisional: PropTypes.bool.isRequired,
  bridgeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEdit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ZoneNicHead = ({ editor, nic, isMarked, isProvisional }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`device-row device-group ${isMarked ? 'device-removed' : ''}`}
      data-zone-nic={nic.physical}
    >
      <FaEthernet className="text-muted" aria-hidden="true" />
      <span>{nic.name}</span>
      {nic.physical ? (
        <>
          <code className="small">{nic.physical}</code>
          <CopyButton
            text={nic.physical}
            label={t('machineEdit.networkAdaptersEditor.copyLabel', {
              label: t('machineEdit.networkAdaptersEditor.vnicName'),
            })}
            className="btn btn-link btn-sm p-0 small"
          />
        </>
      ) : null}
      {isProvisional ? (
        <span
          className="badge text-bg-warning"
          title={t('machineEdit.networkAdaptersEditor.provisionalTitle')}
        >
          <FaCubes className="me-1" aria-hidden="true" />
          {t('machineEdit.networkAdaptersEditor.provisional')}
        </span>
      ) : null}
      {nic.allowedAddress ? (
        <span className="badge text-bg-light border" title="zonecfg allowed-address">
          {nic.allowedAddress}
        </span>
      ) : null}
      {nic.physical && !isProvisional ? (
        <div className="device-actions">
          <button
            type="button"
            className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
            data-action="mark-zone-nic"
            title={
              isMarked
                ? t('machineEdit.networkAdaptersEditor.unmark')
                : t('machineEdit.networkAdaptersEditor.detachZoneNicTitle')
            }
            onClick={() => editor.onToggleZoneNic(nic.physical)}
            disabled={editor.formDisabled}
          >
            <MarkIcon marked={isMarked} />
          </button>
        </div>
      ) : null}
    </div>
  );
};

ZoneNicHead.propTypes = {
  editor: PropTypes.object.isRequired,
  nic: PropTypes.object.isRequired,
  isMarked: PropTypes.bool.isRequired,
  isProvisional: PropTypes.bool.isRequired,
};

const ZoneNicForm = ({ editor, nic, live, current, edits, isProvisional }) => {
  const { t } = useTranslation();
  return (
    <div className="device-row device-child device-child-form">
      <div className="row g-2 align-items-end">
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1" htmlFor={`zone-nic-${nic.physical}-roc`}>
            {t('machineEdit.networkAdaptersEditor.removeOnCompletion')}
          </label>
          <select
            id={`zone-nic-${nic.physical}-roc`}
            className="form-select form-select-sm"
            value={edits.remove_on_completion ?? ''}
            onChange={event =>
              editor.onZoneNicEdit(nic.physical, 'remove_on_completion', event.target.value)
            }
            disabled={editor.formDisabled}
          >
            <option value="">{removeOnCompletionLabel(current, t)}</option>
            <option value="true">{t('machineEdit.networkAdaptersEditor.remove')}</option>
            <option value="false">{t('machineEdit.networkAdaptersEditor.keep')}</option>
          </select>
        </div>
        <ZoneNicFields
          nic={nic}
          live={live}
          edits={edits}
          isProvisional={isProvisional}
          bridgeOptions={editor.bridgeOptions}
          onEdit={(key, value) => editor.onZoneNicEdit(nic.physical, key, value)}
          disabled={editor.formDisabled}
        />
      </div>
    </div>
  );
};

ZoneNicForm.propTypes = {
  editor: PropTypes.object.isRequired,
  nic: PropTypes.object.isRequired,
  live: PropTypes.object,
  current: PropTypes.object,
  edits: PropTypes.object.isRequired,
  isProvisional: PropTypes.bool.isRequired,
};

const ZoneNicExtras = ({ editor, nic, current, edits }) => (
  <>
    <NicPropsEditor
      idPrefix={`zone-nic-${nic.physical}`}
      netif={current?.netif || ''}
      props={edits.props || {}}
      currentProps={current?.props || {}}
      propsByNetif={editor.nicPropsByNetif}
      propDefaults={editor.knobDefaults}
      propValues={editor.nicEnums || {}}
      onChange={(propKey, value) => editor.onZoneNicPropEdit(nic.physical, propKey, value)}
      disabled={editor.formDisabled}
    />
    {editor.status ? (
      <VnicLinkPropsEditor
        status={editor.status}
        hostId={editor.hostId}
        vnic={nic.physical}
        disabled={editor.formDisabled}
      />
    ) : null}
  </>
);

ZoneNicExtras.propTypes = {
  editor: PropTypes.object.isRequired,
  nic: PropTypes.object.isRequired,
  current: PropTypes.object,
  edits: PropTypes.object.isRequired,
};

const ZoneNicRows = ({ editor, nic }) => {
  const { t } = useTranslation();
  const isMarked = editor.zoneNicRemovals.includes(nic.physical);
  const edits = editor.zoneNicEdits[nic.physical] || {};
  const live = editor.hostVnics.find(vnic => vnic.link === nic.physical) || null;
  const current = editor.zoneNicCurrent.find(entry => entry.physical === nic.physical) || null;
  const isProvisional = current?.provisional === true;
  const editable = !isMarked && Boolean(nic.physical);
  return (
    <Fragment key={nic.name}>
      <ZoneNicHead editor={editor} nic={nic} isMarked={isMarked} isProvisional={isProvisional} />
      <div className="device-row device-child">
        <FaWaveSquare
          className="text-muted"
          title={t('machineEdit.networkAdaptersEditor.liveDladmState')}
        />
        <LiveVnicLine live={live} />
      </div>
      {editable ? (
        <ZoneNicForm
          editor={editor}
          nic={nic}
          live={live}
          current={current}
          edits={edits}
          isProvisional={isProvisional}
        />
      ) : null}
      {editable ? (
        <ZoneNicExtras editor={editor} nic={nic} current={current} edits={edits} />
      ) : null}
    </Fragment>
  );
};

ZoneNicRows.propTypes = {
  editor: PropTypes.object.isRequired,
  nic: PropTypes.object.isRequired,
};

const AdapterRows = ({ editor, nic }) => {
  const { t } = useTranslation();
  const isMarked = editor.nicMarked(nic.adapter);
  const row = editor.rowFor(nic.adapter) || blankNicRow(nic.adapter);
  return (
    <Fragment key={nic.adapter}>
      <div
        className={`device-row device-group ${isMarked ? 'device-removed' : ''}`}
        data-adapter={nic.adapter}
      >
        <FaEthernet className="text-muted" aria-hidden="true" />
        <span>{t('machineEdit.networkAdaptersEditor.adapter', { adapter: nic.adapter })}</span>
        <span className="device-meta">{nicSummary(nic, t)}</span>
        {nic.adapter === TRANSPORT_ADAPTER ? (
          <span
            className="badge text-bg-light"
            title={t('machineEdit.networkAdaptersEditor.provisioningNatTitle')}
          >
            {t('machineEdit.networkAdaptersEditor.provisioningNat')}
          </span>
        ) : null}
        <div className="device-actions">
          <button
            type="button"
            className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
            data-action="mark-adapter"
            title={
              isMarked
                ? t('machineEdit.networkAdaptersEditor.unmark')
                : t('machineEdit.networkAdaptersEditor.markAdapterForRemoval')
            }
            onClick={() => editor.onToggleNic(nic.adapter)}
            disabled={editor.formDisabled}
          >
            <MarkIcon marked={isMarked} />
          </button>
        </div>
      </div>
      {!isMarked && !editor.utmMode ? (
        <div className="device-row device-child device-child-form">
          <TuningGrid
            idPrefix={`nic-${nic.adapter}`}
            row={row}
            nicEnums={editor.nicEnums}
            onPatch={patch => editor.patchAdapter(nic.adapter, patch)}
            disabled={editor.formDisabled}
          />
        </div>
      ) : null}
    </Fragment>
  );
};

AdapterRows.propTypes = {
  editor: PropTypes.object.isRequired,
  nic: PropTypes.object.isRequired,
};

const NewAdapterRows = ({ editor, row }) => {
  const { t } = useTranslation();
  const disabled = editor.formDisabled;
  const patch = change => editor.patchAddNic(row.key, change);
  return (
    <Fragment key={row.key}>
      <div className="device-row device-group" data-new-adapter={row.key}>
        <FaPlus className="text-success" aria-hidden="true" />
        <span>{t('machineEdit.networkAdaptersEditor.newAdapter')}</span>
        <span className="device-meta">{t('machineEdit.networkAdaptersEditor.bridgedHint')}</span>
        <div className="device-actions">
          <button
            type="button"
            className="btn btn-sm py-0 btn-outline-danger"
            aria-label={t('machineEdit.networkAdaptersEditor.dropNewAdapter')}
            onClick={() =>
              editor.onAddNicsChange(editor.addNics.filter(entry => entry.key !== row.key))
            }
            disabled={disabled}
          >
            <FaTrash aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="device-row device-child device-child-form">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-4">
            <label className="form-label small mb-1" htmlFor={`add-nic-bridge-${row.key}`}>
              {t('machineEdit.networkAdaptersEditor.bridgeInterface')}
            </label>
            <input
              id={`add-nic-bridge-${row.key}`}
              className="form-control form-control-sm"
              list={
                editor.bridgeOptions.length > 0 ? `add-nic-bridge-${row.key}-options` : undefined
              }
              value={row.bridge}
              onChange={event => patch({ bridge: event.target.value })}
              disabled={disabled}
            />
            {editor.bridgeOptions.length > 0 ? (
              <datalist id={`add-nic-bridge-${row.key}-options`}>
                {editor.bridgeOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor={`add-nic-mac-${row.key}`}>
              {t('machineEdit.networkAdaptersEditor.macBlankAuto')}
            </label>
            <MacField
              id={`add-nic-mac-${row.key}`}
              value={row.mac}
              onChange={mac => patch({ mac })}
              disabled={disabled}
            />
          </div>
          {editor.isZone
            ? ADD_ZONE_FIELDS.map(field => (
                <div className={field.col} key={field.key}>
                  <label
                    className="form-label small mb-1"
                    htmlFor={`add-nic-${field.key}-${row.key}`}
                  >
                    {t(
                      field.labelKey ||
                        `machineEdit.networkAdaptersEditor.zoneNicField.${field.key}`
                    )}
                  </label>
                  <input
                    id={`add-nic-${field.key}-${row.key}`}
                    className={`form-control form-control-sm${field.mono ? ' font-monospace' : ''}`}
                    type={field.type || 'text'}
                    min={field.min}
                    placeholder={field.placeholder}
                    value={row[field.key] ?? ''}
                    onChange={event => patch({ [field.key]: event.target.value })}
                    disabled={disabled}
                  />
                </div>
              ))
            : null}
        </div>
        {editor.isZone ? (
          <NicPropsEditor
            idPrefix={`add-nic-${row.key}`}
            netif={editor.machineNetif}
            props={row.props || {}}
            propsByNetif={editor.nicPropsByNetif}
            propDefaults={editor.knobDefaults}
            propValues={editor.nicEnums || {}}
            onChange={(propKey, value) =>
              patch({ props: { ...(row.props || {}), [propKey]: value } })
            }
            disabled={disabled}
          />
        ) : null}
        {!editor.isZone && !editor.utmMode ? (
          <TuningGrid
            idPrefix={`add-nic-${row.key}`}
            row={row}
            nicEnums={editor.nicEnums}
            onPatch={patch}
            disabled={disabled}
          />
        ) : null}
      </div>
    </Fragment>
  );
};

NewAdapterRows.propTypes = {
  editor: PropTypes.object.isRequired,
  row: PropTypes.object.isRequired,
};

const EDITOR_DEFAULTS = {
  nicEnums: null,
  zoneNics: null,
  hostVnics: [],
  bridgeOptions: [],
  zoneNicRemovals: [],
  onToggleZoneNic: () => {},
  zoneNicEdits: {},
  onZoneNicEdit: () => {},
  onZoneNicPropEdit: () => {},
  zoneNicCurrent: [],
  nicPropsByNetif: null,
  knobDefaults: {},
  machineNetif: '',
  status: null,
  hostId: '',
  utmMode: false,
  formDisabled: false,
};

const given = props =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

const editorOf = props => {
  const editor = { ...EDITOR_DEFAULTS, ...given(props) };
  editor.isZone = editor.zoneNics !== null;
  editor.rowFor = adapter => editor.nicRows.find(row => row.adapter === String(adapter));
  editor.patchAdapter = (adapter, patch) => {
    const existing = editor.rowFor(adapter);
    editor.onNicRowsChange(
      existing
        ? editor.nicRows.map(row => (row === existing ? { ...row, ...patch } : row))
        : [...editor.nicRows, { ...blankNicRow(adapter), ...patch }]
    );
  };
  editor.patchAddNic = (key, patch) =>
    editor.onAddNicsChange(
      editor.addNics.map(row => (row.key === key ? { ...row, ...patch } : row))
    );
  return editor;
};

/**
 * The NICs tab of the Settings page, hyperweaver-ui's network adapters
 * editor as one device tree: every existing adapter a group row with its
 * mark for removal and its tuning under it, an adapter of a zone with its
 * live dladm line, its in-place zonecfg fields, its brand properties and
 * its link properties; Adapter appends a new adapter to be added on
 * Apply. Tuning seeds from `knob_current` and only what changed rides.
 */
const NetworkAdaptersEditor = ({
  nics,
  nicRows,
  onNicRowsChange,
  addNics,
  onAddNicsChange,
  nicMarked,
  onToggleNic,
  nicEnums,
  zoneNics,
  hostVnics,
  bridgeOptions,
  zoneNicRemovals,
  onToggleZoneNic,
  zoneNicEdits,
  onZoneNicEdit,
  onZoneNicPropEdit,
  zoneNicCurrent,
  nicPropsByNetif,
  knobDefaults,
  machineNetif,
  status,
  hostId,
  utmMode,
  formDisabled,
}) => {
  const { t } = useTranslation();
  const editor = editorOf({
    nics,
    nicRows,
    onNicRowsChange,
    addNics,
    onAddNicsChange,
    nicMarked,
    onToggleNic,
    nicEnums,
    zoneNics,
    hostVnics,
    bridgeOptions,
    zoneNicRemovals,
    onToggleZoneNic,
    zoneNicEdits,
    onZoneNicEdit,
    onZoneNicPropEdit,
    zoneNicCurrent,
    nicPropsByNetif,
    knobDefaults,
    machineNetif,
    status,
    hostId,
    utmMode,
    formDisabled,
  });
  const { isZone } = editor;

  return (
    <div className="device-tree" data-editor="network-adapters">
      <div className="device-tree-head">
        <FaNetworkWired aria-hidden="true" />
        <span>{t('machineEdit.networkAdaptersEditor.networkAdapters')}</span>
      </div>
      {isZone
        ? editor.zoneNics.map(nic => <ZoneNicRows key={nic.name} editor={editor} nic={nic} />)
        : null}
      {isZone ? (
        <div className="device-row device-meta">
          {t('machineEdit.networkAdaptersEditor.editsApplyInPlace')}
        </div>
      ) : null}
      {!isZone && nics.length === 0 && addNics.length === 0 ? (
        <div className="device-row device-meta">
          {t('machineEdit.networkAdaptersEditor.noAdaptersReported')}
        </div>
      ) : null}
      {nics.map(nic => (
        <AdapterRows key={nic.adapter} editor={editor} nic={nic} />
      ))}
      {addNics.map(row => (
        <NewAdapterRows key={row.key} editor={editor} row={row} />
      ))}
      <div className="device-tree-foot">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="add-adapter"
          onClick={() => onAddNicsChange([...addNics, { key: Date.now(), bridge: '', mac: '' }])}
          disabled={editor.formDisabled}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('machineEdit.networkAdaptersEditor.adapterButton')}
        </button>
      </div>
    </div>
  );
};

NetworkAdaptersEditor.propTypes = {
  nics: PropTypes.array.isRequired,
  nicRows: PropTypes.array.isRequired,
  onNicRowsChange: PropTypes.func.isRequired,
  addNics: PropTypes.array.isRequired,
  onAddNicsChange: PropTypes.func.isRequired,
  nicMarked: PropTypes.func.isRequired,
  onToggleNic: PropTypes.func.isRequired,
  nicEnums: PropTypes.object,
  zoneNics: PropTypes.array,
  hostVnics: PropTypes.array,
  bridgeOptions: PropTypes.arrayOf(PropTypes.string),
  zoneNicRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneNic: PropTypes.func,
  zoneNicEdits: PropTypes.object,
  onZoneNicEdit: PropTypes.func,
  onZoneNicPropEdit: PropTypes.func,
  zoneNicCurrent: PropTypes.array,
  nicPropsByNetif: PropTypes.object,
  knobDefaults: PropTypes.object,
  machineNetif: PropTypes.string,
  status: PropTypes.object,
  hostId: PropTypes.string,
  utmMode: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

export default NetworkAdaptersEditor;
