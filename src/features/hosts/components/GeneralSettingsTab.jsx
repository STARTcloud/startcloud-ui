import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hostHasHypervisor } from '../utils/capabilities';
import { agentDefaultLabel } from '../utils/machineHelpers';

import {
  BootOrderEditor,
  OsTypeSelect,
  splitBhyveBootOrder,
  stepMemory,
} from './CreateWizardSteps';
import { VocabularySelect } from './HardwareEditor';
import SecureBootPanel from './SecureBootPanel';

const feedsShape = PropTypes.shape({
  knobValues: PropTypes.object,
  defaultsDoc: PropTypes.object,
  osTypes: PropTypes.array,
});

const bootOrderDefaultSuffix = (value, t) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? t('machineEdit.generalSettingsTab.bootOrderDefault', { value: value.join(',') })
      : '';
  }
  return t('machineEdit.generalSettingsTab.bootOrderDefault', { value });
};

const FieldControl = ({
  field,
  vocabulary = null,
  value,
  onValue,
  blankLabel,
  isCustom = false,
  onToggleCustom,
  disabled,
}) => {
  const { t } = useTranslation();
  const inputId = `machine-edit-${field.key}`;
  if (field.freeText && vocabulary && !isCustom) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        onChange={onValue}
        onCustom={() => onToggleCustom(true)}
        disabled={disabled}
      />
    );
  }
  if (field.freeText) {
    return (
      <>
        <input
          id={inputId}
          className="form-control"
          type="text"
          list={vocabulary ? `${inputId}-options` : undefined}
          placeholder={field.placeholder || blankLabel}
          title={field.hint}
          value={value}
          onChange={event => onValue(event.target.value)}
          disabled={disabled}
        />
        {vocabulary ? (
          <>
            <datalist id={`${inputId}-options`}>
              {vocabulary.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => onToggleCustom(false)}
            >
              {t('machineEdit.pickOrType.backToList')}
            </button>
          </>
        ) : null}
      </>
    );
  }
  if (vocabulary) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        onChange={onValue}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={inputId}
      className="form-control"
      type="text"
      placeholder={field.placeholder || blankLabel}
      title={field.hint}
      value={value}
      onChange={event => onValue(event.target.value)}
      disabled={disabled}
    />
  );
};

FieldControl.propTypes = {
  field: PropTypes.object.isRequired,
  vocabulary: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.string.isRequired,
  onValue: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  isCustom: PropTypes.bool,
  onToggleCustom: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const Stepper = ({
  id,
  value,
  onSet,
  placeholder,
  title,
  less,
  more,
  canLess,
  canMore,
  disabled,
}) => (
  <div className="input-group">
    <button
      type="button"
      className="btn btn-outline-secondary"
      aria-label={less.label}
      onClick={less.onClick}
      disabled={disabled || !canLess}
    >
      −
    </button>
    <input
      id={id}
      className="form-control text-center"
      type="text"
      placeholder={placeholder}
      title={title}
      value={value}
      onChange={event => onSet(event.target.value)}
      disabled={disabled}
    />
    <button
      type="button"
      className="btn btn-outline-secondary"
      aria-label={more.label}
      onClick={more.onClick}
      disabled={disabled || !canMore}
    >
      +
    </button>
  </div>
);

Stepper.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onSet: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  title: PropTypes.string,
  less: PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func }).isRequired,
  more: PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func }).isRequired,
  canLess: PropTypes.bool.isRequired,
  canMore: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
};

const MemoryStepper = ({ field, value, onSet, blankLabel, disabled }) => {
  const { t } = useTranslation();
  return (
    <Stepper
      id={`machine-edit-${field.key}`}
      value={value}
      onSet={onSet}
      placeholder={field.placeholder || blankLabel}
      less={{
        label: t('machineEdit.generalSettingsTab.lessMemory'),
        onClick: () => onSet(stepMemory(value, -1)),
      }}
      more={{
        label: t('machineEdit.generalSettingsTab.moreMemory'),
        onClick: () => onSet(stepMemory(value, 1)),
      }}
      canLess={Boolean(stepMemory(value, -1))}
      canMore={Boolean(stepMemory(value, 1))}
      disabled={disabled}
    />
  );
};

MemoryStepper.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onSet: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const VcpusStepper = ({ field, value, onSet, blankLabel, disabled }) => {
  const { t } = useTranslation();
  const count = /^\d+$/u.test(value.trim()) ? Number(value.trim()) : null;
  return (
    <Stepper
      id={`machine-edit-${field.key}`}
      value={value}
      onSet={onSet}
      placeholder={field.placeholder || blankLabel}
      title={t('machineEdit.generalSettingsTab.vcpusHint')}
      less={{
        label: t('machineEdit.generalSettingsTab.fewerVcpus'),
        onClick: () => onSet(String(count - 1)),
      }}
      more={{
        label: t('machineEdit.generalSettingsTab.moreVcpus'),
        onClick: () => onSet(String(count + 1)),
      }}
      canLess={count !== null && count > 1}
      canMore={count !== null}
      disabled={disabled}
    />
  );
};

VcpusStepper.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onSet: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const GeneralFieldCell = ({
  field,
  values,
  setValues,
  feeds,
  bhyveBootDevices,
  customFields,
  setCustomFields,
  formDisabled,
}) => {
  const vocabulary =
    field.key === 'bootnext' && bhyveBootDevices.length > 0
      ? bhyveBootDevices
      : feeds.knobValues?.[`zones.${field.key}`] || field.options || null;
  const value = values[field.key] ?? '';
  const blankLabel = agentDefaultLabel(feeds.defaultsDoc, field.key);
  const commit = next => setValues(prev => ({ ...prev, [field.key]: next }));
  const setValue = next => setValues(prev => ({ ...prev, [field.key]: next ?? prev[field.key] }));
  let control;
  if (field.key === 'ram') {
    control = (
      <MemoryStepper
        field={field}
        value={value}
        onSet={setValue}
        blankLabel={blankLabel}
        disabled={formDisabled}
      />
    );
  } else if (field.key === 'vcpus') {
    control = (
      <VcpusStepper
        field={field}
        value={value}
        onSet={setValue}
        blankLabel={blankLabel}
        disabled={formDisabled}
      />
    );
  } else if (field.key === 'os_type' && feeds.osTypes) {
    control = (
      <OsTypeSelect
        id={`machine-edit-${field.key}`}
        osTypes={feeds.osTypes}
        value={value}
        onChange={event => commit(event.target.value)}
        blankLabel={blankLabel}
        disabled={formDisabled}
      />
    );
  } else {
    control = (
      <FieldControl
        field={field}
        vocabulary={vocabulary}
        value={value}
        onValue={commit}
        blankLabel={blankLabel}
        isCustom={Boolean(customFields[field.key])}
        onToggleCustom={next => setCustomFields(prev => ({ ...prev, [field.key]: next }))}
        disabled={formDisabled}
      />
    );
  }
  return (
    <div className="col-12 col-md-4" data-field={field.key}>
      <label className="form-label" htmlFor={`machine-edit-${field.key}`}>
        {field.label}
      </label>
      {control}
      {field.hint ? <span className="form-text text-muted small">{field.hint}</span> : null}
    </div>
  );
};

GeneralFieldCell.propTypes = {
  field: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  setValues: PropTypes.func.isRequired,
  feeds: feedsShape.isRequired,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string).isRequired,
  customFields: PropTypes.object.isRequired,
  setCustomFields: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const CLOUD_INIT_FIELDS = [
  {
    key: 'dns_domain',
    labelKey: 'machineEdit.generalSettingsTab.dnsDomain',
    col: 'col-12 col-md-4',
    keepCurrent: true,
  },
  {
    key: 'resolvers',
    labelKey: 'machineEdit.generalSettingsTab.resolvers',
    col: 'col-12 col-md-4',
    placeholder: 'e.g. 1.1.1.1,8.8.8.8',
  },
  {
    key: 'password',
    labelKey: 'machineEdit.generalSettingsTab.rootPassword',
    col: 'col-12 col-md-4',
    type: 'password',
    keepCurrent: true,
  },
  {
    key: 'sshkey',
    labelKey: 'machineEdit.generalSettingsTab.sshPublicKey',
    col: 'col-12 col-md-8',
    placeholder: 'ssh-ed25519 AAAA… user@host',
    mono: true,
  },
];

const CloudInitEditor = ({
  cloudInit,
  setCloudInit,
  cloudInitCurrent,
  defaultsDoc,
  formDisabled,
}) => {
  const { t } = useTranslation();
  const [ciCustomUrl, setCiCustomUrl] = useState(false);
  const set = (key, value) => setCloudInit(prev => ({ ...prev, [key]: value }));
  return (
    <div className="col-12" data-editor="cloud-init">
      <span className="form-label d-block">
        {t('machineEdit.generalSettingsTab.cloudInit')}{' '}
        <span className="text-muted small fw-normal">
          {t('machineEdit.generalSettingsTab.cloudInitCurrent', {
            current: cloudInitCurrent || 'off',
          })}
        </span>
      </span>
      <div className="row g-2">
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1" htmlFor="machine-edit-ci-enabled">
            {t('machineEdit.generalSettingsTab.enabled')}
          </label>
          {ciCustomUrl ? (
            <>
              <input
                id="machine-edit-ci-enabled"
                className="form-control"
                type="text"
                placeholder="https://…"
                title={t('machineEdit.generalSettingsTab.cloudInitUrlHint')}
                value={cloudInit.enabled ?? ''}
                onChange={event => set('enabled', event.target.value)}
                disabled={formDisabled}
              />
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => {
                  setCiCustomUrl(false);
                  set('enabled', '');
                }}
              >
                {t('machineEdit.generalSettingsTab.backToOnOff')}
              </button>
            </>
          ) : (
            <VocabularySelect
              id="machine-edit-ci-enabled"
              value={cloudInit.enabled ?? ''}
              entries={[
                { value: 'on', label: t('machineEdit.generalSettingsTab.on') },
                { value: 'off', label: t('machineEdit.generalSettingsTab.off') },
              ]}
              blankLabel={agentDefaultLabel(defaultsDoc, 'cloud_init')}
              onChange={next => set('enabled', next)}
              onCustom={() => {
                setCiCustomUrl(true);
                set('enabled', '');
              }}
              customLabel={t('machineEdit.generalSettingsTab.configUrl')}
              disabled={formDisabled}
            />
          )}
        </div>
        {CLOUD_INIT_FIELDS.map(field => (
          <div className={field.col} key={field.key}>
            <label className="form-label small mb-1" htmlFor={`machine-edit-ci-${field.key}`}>
              {t(field.labelKey)}
            </label>
            <input
              id={`machine-edit-ci-${field.key}`}
              className={`form-control${field.mono ? ' font-monospace' : ''}`}
              type={field.type || 'text'}
              autoComplete={field.type === 'password' ? 'new-password' : undefined}
              placeholder={
                field.keepCurrent
                  ? t('machineEdit.generalSettingsTab.keepCurrent')
                  : field.placeholder
              }
              value={cloudInit[field.key] ?? ''}
              onChange={event => set(field.key, event.target.value)}
              disabled={formDisabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

CloudInitEditor.propTypes = {
  cloudInit: PropTypes.object.isRequired,
  setCloudInit: PropTypes.func.isRequired,
  cloudInitCurrent: PropTypes.string,
  defaultsDoc: PropTypes.object,
  formDisabled: PropTypes.bool,
};

const ZoneBootOrder = ({ field, values, setValues, bhyveBootDevices, formDisabled }) => {
  const { t } = useTranslation();
  const explicit = splitBhyveBootOrder(values.bootorder);
  const showingDevices = explicit.length === 0 && bhyveBootDevices.length > 0;
  return (
    <div className="col-12" data-field="bootorder">
      <span className="form-label d-block">
        {t('machineEdit.generalSettingsTab.bootOrderRequiresRestart')}
      </span>
      <BootOrderEditor
        bootOrder={showingDevices ? bhyveBootDevices : explicit}
        setBootOrder={list => setValues(prev => ({ ...prev, bootorder: list.join(',') }))}
        deviceOptions={bhyveBootDevices}
        maxSlots={Infinity}
        allowCustom
        loading={formDisabled}
      />
      <span className="form-text text-muted small">
        {showingDevices ? t('machineEdit.generalSettingsTab.showingZoneDevicesOrder') : field.hint}
      </span>
    </div>
  );
};

ZoneBootOrder.propTypes = {
  field: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  setValues: PropTypes.func.isRequired,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string).isRequired,
  formDisabled: PropTypes.bool,
};

const ScalarRows = ({ form, update, seed, defaultsDoc, isUtm, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <>
      {!isUtm ? (
        <div className="col-12 col-md-4" data-field="autoboot">
          <label className="form-label" htmlFor="machine-edit-autoboot">
            {t('machineEdit.generalSettingsTab.autoboot')}
          </label>
          <select
            id="machine-edit-autoboot"
            className="form-select"
            value={form.autoboot}
            onChange={event => update('autoboot', event.target.value)}
            disabled={formDisabled}
          >
            <option value="">{agentDefaultLabel(defaultsDoc, 'autoboot')}</option>
            <option value="true">{t('machineEdit.generalSettingsTab.on')}</option>
            <option value="false">{t('machineEdit.generalSettingsTab.off')}</option>
          </select>
        </div>
      ) : null}
      {seed.guestAgent !== null ? (
        <div className="col-12 col-md-4" data-field="guest_agent">
          <div className="form-check form-switch mt-4">
            <input
              id="machine-edit-guest_agent"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.guestAgent === true}
              onChange={event => update('guestAgent', event.target.checked)}
              disabled={formDisabled}
            />
            <label className="form-check-label" htmlFor="machine-edit-guest_agent">
              {t('machineEdit.generalSettingsTab.qemuGuestAgent')}
            </label>
          </div>
          <span className="form-text text-muted small">
            {t('machineEdit.generalSettingsTab.guestAgentHint')}
          </span>
        </div>
      ) : null}
      <div className="col-12 col-md-4" data-field="boot_priority">
        <label className="form-label" htmlFor="machine-edit-boot-priority">
          {t('machineEdit.generalSettingsTab.bootPriority')}
        </label>
        <input
          id="machine-edit-boot-priority"
          className="form-control"
          type="number"
          min="1"
          max="100"
          placeholder="95"
          value={form.bootPriority}
          onChange={event => update('bootPriority', event.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          {t('machineEdit.generalSettingsTab.appliesImmediatelyNoRestart')}
        </span>
      </div>
    </>
  );
};

ScalarRows.propTypes = {
  form: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  seed: PropTypes.object.isRequired,
  defaultsDoc: PropTypes.object,
  isUtm: PropTypes.bool.isRequired,
  formDisabled: PropTypes.bool,
};

const ConsoleFields = ({ form, update, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="col-12 col-md-4" data-field="consoleport">
        <label className="form-label" htmlFor="machine-edit-consoleport">
          {t('machineEdit.generalSettingsTab.vncWebPort')}
        </label>
        <input
          id="machine-edit-consoleport"
          className="form-control"
          type="text"
          placeholder="dynamic"
          title={t('machineEdit.generalSettingsTab.vncWebPortHint', { keyword: 'dynamic' })}
          value={form.consolePort}
          onChange={event => update('consolePort', event.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          {t('machineEdit.generalSettingsTab.appliesNextVncSessionType')} <code>dynamic</code>{' '}
          {t('machineEdit.generalSettingsTab.toClearPin')}
        </span>
      </div>
      <div className="col-12 col-md-4" data-field="consolehost">
        <label className="form-label" htmlFor="machine-edit-consolehost">
          {t('machineEdit.generalSettingsTab.vncBindAddress')}
        </label>
        <input
          id="machine-edit-consolehost"
          className="form-control"
          type="text"
          placeholder="0.0.0.0"
          value={form.consoleHost}
          onChange={event => update('consoleHost', event.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          {t('machineEdit.generalSettingsTab.appliesNextVncSession')}
        </span>
      </div>
    </>
  );
};

ConsoleFields.propTypes = {
  form: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const VboxBootOrder = ({ bootOrder, setBootOrder, feeds, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12" data-field="boot_order">
      <span className="form-label d-block">
        {t('machineEdit.generalSettingsTab.bootOrderBlankDefault')}
        {bootOrderDefaultSuffix(
          feeds.defaultsDoc?.settings?.boot_order ?? feeds.defaultsDoc?.zones?.boot_order,
          t
        )}
        {t('machineEdit.generalSettingsTab.requiresRestartSuffix')}
      </span>
      <BootOrderEditor
        bootOrder={bootOrder}
        setBootOrder={setBootOrder}
        deviceOptions={feeds.knobValues?.boot_order || null}
        loading={formDisabled}
      />
    </div>
  );
};

VboxBootOrder.propTypes = {
  bootOrder: PropTypes.array.isRequired,
  setBootOrder: PropTypes.func.isRequired,
  feeds: feedsShape.isRequired,
  formDisabled: PropTypes.bool,
};

/**
 * The General tab of the Settings page, hyperweaver-ui's: the scalar
 * knobs of `FIELDS` with the served vocabularies as selects and the
 * agent's own default as the blank label, the autoboot, the guest agent
 * switch, the boot priority, the console port and host of a zone, the
 * boot order of a VirtualBox machine and of a zone on the one draggable
 * editor, the cloud-init family of a zone and the Secure Boot panel of a
 * VirtualBox machine. `form` is the Settings form and `update` its
 * writer of one key.
 */
const GeneralSettingsTab = ({
  fields,
  feeds,
  form,
  update,
  seed,
  cloudInitCurrent = '',
  bhyveBootDevices = [],
  host,
  name,
  running,
  isUtm = false,
  formDisabled = false,
}) => {
  const hostVbox = hostHasHypervisor(host.server, 'virtualbox');
  const isVbox = hostVbox && !isUtm;
  const [customFields, setCustomFields] = useState({});
  const bootorderField = fields.find(field => field.key === 'bootorder') || null;
  const setValues = next => update('values', next);

  return (
    <div className="row g-3" data-tab-body="general">
      {fields
        .filter(field => field.key !== 'bootorder')
        .map(field => (
          <GeneralFieldCell
            key={field.key}
            field={field}
            values={form.values}
            setValues={setValues}
            feeds={feeds}
            bhyveBootDevices={bhyveBootDevices}
            customFields={customFields}
            setCustomFields={setCustomFields}
            formDisabled={formDisabled}
          />
        ))}
      <ScalarRows
        form={form}
        update={update}
        seed={seed}
        defaultsDoc={feeds.defaultsDoc}
        isUtm={isUtm}
        formDisabled={formDisabled}
      />
      {!hostVbox ? <ConsoleFields form={form} update={update} formDisabled={formDisabled} /> : null}
      {isVbox ? (
        <VboxBootOrder
          bootOrder={form.bootOrder}
          setBootOrder={list => update('bootOrder', list)}
          feeds={feeds}
          formDisabled={formDisabled}
        />
      ) : null}
      {bootorderField ? (
        <ZoneBootOrder
          field={bootorderField}
          values={form.values}
          setValues={setValues}
          bhyveBootDevices={bhyveBootDevices}
          formDisabled={formDisabled}
        />
      ) : null}
      {!hostVbox ? (
        <CloudInitEditor
          cloudInit={form.cloudInit}
          setCloudInit={next => update('cloudInit', next)}
          cloudInitCurrent={cloudInitCurrent}
          defaultsDoc={feeds.defaultsDoc}
          formDisabled={formDisabled}
        />
      ) : null}
      {isVbox ? (
        <div className="col-12">
          <SecureBootPanel
            status={host.status}
            hostId={host.hostId}
            name={name}
            running={running}
            bootrom={form.values.bootrom || seed.values.bootrom || ''}
            disabled={formDisabled}
          />
        </div>
      ) : null}
    </div>
  );
};

GeneralSettingsTab.propTypes = {
  fields: PropTypes.array.isRequired,
  feeds: feedsShape.isRequired,
  form: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  seed: PropTypes.object.isRequired,
  cloudInitCurrent: PropTypes.string,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string),
  host: PropTypes.shape({
    status: PropTypes.object.isRequired,
    hostId: PropTypes.string.isRequired,
    server: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  isUtm: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

export default GeneralSettingsTab;
