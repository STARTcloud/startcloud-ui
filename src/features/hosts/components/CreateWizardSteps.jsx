import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGripVertical, FaPlus, FaTrash } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import { boxOptionsOf } from '../utils/machineCreate';
import { agentDefaultLabel, zfsDatasetOptions, zfsPoolOptions } from '../utils/machineHelpers';
import { humanSize } from '../utils/zfsUtils';

import {
  CpuTopologyInputs,
  HARDWARE_SECTIONS,
  HardwareSectionForm,
  ParallelPortsEditor,
  SerialPortsEditor,
  VocabularySelect,
} from './HardwareEditor';
import {
  CdromSourceFields,
  ControllerPortFields,
  DiskSourceFields,
  RemoveRowButton,
} from './MediaRowFields';
import NetworksEditor from './NetworksEditor';
import { PathInput } from './PathPicker';
import PickOrType from './PickOrType';
import DslConfigForm from './ProvisionerFieldDsl';
import { RolesEditor } from './ProvisionerFormFields';

const BOOT_SOURCES = ['template', 'scratch', 'existing', 'none'];
const BOOT_ORDER_DEVICES = ['disk', 'dvd', 'net', 'floppy', 'none'];
const DISKIF_OPTIONS = ['ide', 'sata', 'scsi', 'sas', 'nvme', 'virtio'];
const SYSTEM_FIELDS = [
  { key: 'hostbridge', options: ['i440fx'], freeText: true },
  { key: 'vnc', options: ['on', 'off'] },
  { key: 'acpi', options: ['on', 'off'] },
  { key: 'xhci', options: ['on', 'off'] },
  { key: 'netif', options: ['virtio', 'e1000'] },
];
const BOOLEAN_OVERRIDES = [
  { key: 'show_console', labelKey: 'machineEdit.createWizardSteps.showConsole' },
  { key: 'debug_build', labelKey: 'machineEdit.createWizardSteps.debugBuild' },
  { key: 'post_provision', labelKey: 'machineEdit.createWizardSteps.postProvisionTriggers' },
];

const hostShape = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  server: PropTypes.object,
};

let rowKeys = 0;

const nextRowKey = () => {
  rowKeys += 1;
  return `row-${rowKeys}`;
};

const SettingInput = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  list,
  min,
  max,
}) => (
  <div className="col-12 col-md-4">
    <label className="form-label" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className="form-control"
      type={type}
      placeholder={placeholder}
      list={list}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
    />
  </div>
);

SettingInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  list: PropTypes.string,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const Switch = ({ id, labelKey, checked, disabled, onChange, small = false }) => {
  const { t } = useTranslation();
  return (
    <div className="form-check form-switch">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
      />
      <label className={small ? 'form-check-label small' : 'form-check-label'} htmlFor={id}>
        {t(labelKey)}
      </label>
    </div>
  );
};

Switch.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  small: PropTypes.bool,
};

const OrgChoice = ({ orgChoices, orgUuid, setOrgUuid, loading }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-md-4">
      <label className="form-label" htmlFor="machine-setting-org">
        {t('machineEdit.createWizardSteps.owningOrg')}
      </label>
      <select
        id="machine-setting-org"
        className="form-select"
        value={orgUuid}
        onChange={event => setOrgUuid(event.target.value)}
        disabled={loading}
      >
        <option value="">{t('machineEdit.createWizardSteps.primaryOrgDefault')}</option>
        {orgChoices.map(org => (
          <option key={org.uuid} value={org.uuid}>
            {org.name || org.uuid}
          </option>
        ))}
      </select>
      <span className="form-text text-muted">
        {t('machineEdit.createWizardSteps.owningOrgHint')}
      </span>
    </div>
  );
};

OrgChoice.propTypes = {
  orgChoices: PropTypes.array.isRequired,
  orgUuid: PropTypes.string.isRequired,
  setOrgUuid: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

/**
 * The General step: the server id, the hostname and the domain, the tags,
 * the owning organization on the server role, and under Advanced the
 * notes and the boot priority; the derived name with its override, and
 * whether the machine starts when it is made.
 */
export const GeneralStep = ({
  name,
  setName,
  settings,
  setSetting,
  startAfterCreate,
  setStartAfterCreate,
  tagsInput,
  setTagsInput,
  notes,
  setNotes,
  orgChoices = [],
  orgUuid = '',
  setOrgUuid = null,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const [overrideName, setOverrideName] = useState(Boolean(name.trim()));
  const derivedName = `${settings.server_id ? `${settings.server_id}--` : ''}${settings.hostname || '…'}.${settings.domain || '…'}`;
  const computedName = name.trim() ? name.trim() : derivedName;

  return (
    <div className="row g-3">
      <SettingInput
        id="machine-setting-server_id"
        label={t('machineEdit.createWizardSteps.serverId')}
        value={settings.server_id}
        onChange={event => setSetting('server_id', event.target.value)}
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-hostname"
        label={t('machineEdit.createWizardSteps.hostname')}
        value={settings.hostname}
        onChange={event => setSetting('hostname', event.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-domain"
        label={t('machineEdit.createWizardSteps.domain')}
        value={settings.domain}
        onChange={event => setSetting('domain', event.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-create-tags"
        label={t('machineEdit.createWizardSteps.tags')}
        placeholder="e.g. dev, domino"
        value={tagsInput}
        onChange={event => setTagsInput(event.target.value)}
        disabled={loading}
      />
      {setOrgUuid && orgChoices.length > 0 ? (
        <OrgChoice
          orgChoices={orgChoices}
          orgUuid={orgUuid}
          setOrgUuid={setOrgUuid}
          loading={loading}
        />
      ) : null}
      {advanced ? (
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-create-notes">
            {t('machineEdit.createWizardSteps.notes')}
          </label>
          <textarea
            id="machine-create-notes"
            className="form-control"
            rows={2}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            disabled={loading}
          />
        </div>
      ) : null}
      {advanced ? (
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-boot_priority">
            {t('machineEdit.createWizardSteps.bootPriority')}
          </label>
          <input
            id="machine-setting-boot_priority"
            className="form-control"
            type="number"
            min="1"
            max="100"
            placeholder="95"
            value={settings.boot_priority ?? ''}
            onChange={event => setSetting('boot_priority', event.target.value)}
            disabled={loading}
          />
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.bootPriorityHint')}
          </span>
        </div>
      ) : null}
      <div className="col-12">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="form-text text-muted mt-0">
            {t('machineEdit.createWizardSteps.computedName')}{' '}
            <code data-field="computed-name">{computedName}</code>
          </span>
          <Switch
            id="machine-create-name-override"
            labelKey="machineEdit.createWizardSteps.overrideName"
            checked={overrideName}
            disabled={loading}
            small
            onChange={checked => {
              setOverrideName(checked);
              setName(checked ? derivedName : '');
            }}
          />
        </div>
        {overrideName ? (
          <div className="col-12 col-md-6 mt-2">
            <input
              id="machine-create-name"
              className="form-control"
              type="text"
              aria-label={t('machineEdit.createWizardSteps.machineNameAria')}
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={loading}
            />
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.overrideNameHint')}
            </span>
          </div>
        ) : null}
      </div>
      <div className="col-12">
        <Switch
          id="machine-create-start-after"
          labelKey="machineEdit.createWizardSteps.startAfterCreate"
          checked={startAfterCreate}
          disabled={loading}
          onChange={setStartAfterCreate}
        />
      </div>
    </div>
  );
};

GeneralStep.propTypes = {
  name: PropTypes.string.isRequired,
  setName: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  startAfterCreate: PropTypes.bool.isRequired,
  setStartAfterCreate: PropTypes.func.isRequired,
  tagsInput: PropTypes.string.isRequired,
  setTagsInput: PropTypes.func.isRequired,
  notes: PropTypes.string.isRequired,
  setNotes: PropTypes.func.isRequired,
  orgChoices: PropTypes.array,
  orgUuid: PropTypes.string,
  setOrgUuid: PropTypes.func,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const BoxImageFields = ({
  settings,
  setSetting,
  templates,
  catalogEntry,
  visibleOptions,
  boxPickCustom,
  setBoxPickCustom,
  onBoxSelect,
  onBoxPicked,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="col-12 col-md-8">
        <label className="form-label" htmlFor="machine-setting-box">
          {t('machineEdit.createWizardSteps.image')}
        </label>
        {boxPickCustom ? (
          <input
            id="machine-setting-box"
            className="form-control"
            type="text"
            list={templates.length > 0 ? 'machine-box-options' : undefined}
            value={settings.box ?? ''}
            onChange={event => setSetting('box', event.target.value)}
            disabled={loading}
          />
        ) : (
          <VocabularySelect
            id="machine-setting-box"
            value={catalogEntry ? catalogEntry.key : ''}
            entries={visibleOptions.map(entry => ({ value: entry.key, label: entry.value }))}
            blankLabel={t(
              visibleOptions.length > 0
                ? 'machineEdit.createWizardSteps.selectAnImage'
                : 'machineEdit.createWizardSteps.noImagesFound'
            )}
            onChange={onBoxSelect}
            onCustom={() => {
              setBoxPickCustom(true);
              setSetting('box', '');
              onBoxPicked(null);
            }}
            customLabel={t('machineEdit.createWizardSteps.customOrgName')}
            disabled={loading}
          />
        )}
        {boxPickCustom ? (
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={() => setBoxPickCustom(false)}
          >
            {t('machineEdit.createWizardSteps.backToImageList')}
          </button>
        ) : null}
        {templates.length > 0 ? (
          <datalist id="machine-box-options">
            {templates.map(template => (
              <option
                key={`${template.organization}/${template.box_name}/${template.version}/${template.architecture}`}
                value={`${template.organization}/${template.box_name}`}
              >
                {`${template.version} (${template.architecture})`}
              </option>
            ))}
          </datalist>
        ) : null}
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-setting-box_version">
          {t('machineEdit.createWizardSteps.boxVersion')}
        </label>
        {boxPickCustom ? (
          <input
            id="machine-setting-box_version"
            className="form-control"
            type="text"
            placeholder={t('machineEdit.createWizardSteps.specificVersionPlaceholder')}
            value={settings.box_version ?? ''}
            onChange={event => setSetting('box_version', event.target.value)}
            disabled={loading}
          />
        ) : (
          <select
            id="machine-setting-box_version"
            className="form-select"
            value={settings.box_version ?? ''}
            onChange={event => setSetting('box_version', event.target.value)}
            disabled={loading || !catalogEntry}
          >
            <option value="">
              {t(
                catalogEntry
                  ? 'machineEdit.createWizardSteps.unpinnedResolvesLocally'
                  : 'machineEdit.createWizardSteps.pickAnImageFirst'
              )}
            </option>
            {(catalogEntry?.versions || []).map(versionNumber => (
              <option key={versionNumber} value={versionNumber}>
                {versionNumber}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
};

BoxImageFields.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  templates: PropTypes.array.isRequired,
  catalogEntry: PropTypes.object,
  visibleOptions: PropTypes.array.isRequired,
  boxPickCustom: PropTypes.bool.isRequired,
  setBoxPickCustom: PropTypes.func.isRequired,
  onBoxSelect: PropTypes.func.isRequired,
  onBoxPicked: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const BoxAdvancedFields = ({ settings, setSetting, catalogEntry, loading }) => {
  const { t } = useTranslation();
  const architectures = catalogEntry?.architectures || [];
  return (
    <>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-setting-box_arch">
          {t('machineEdit.createWizardSteps.boxArchitecture')}
        </label>
        {architectures.length > 0 ? (
          <select
            id="machine-setting-box_arch"
            className="form-select"
            value={settings.box_arch ?? ''}
            onChange={event => setSetting('box_arch', event.target.value)}
            disabled={loading}
          >
            <option value="">{t('machineEdit.common.na')}</option>
            {architectures.map(arch => (
              <option key={arch} value={arch}>
                {arch}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="machine-setting-box_arch"
            className="form-control"
            type="text"
            placeholder="amd64"
            value={settings.box_arch ?? ''}
            onChange={event => setSetting('box_arch', event.target.value)}
            disabled={loading}
          />
        )}
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-setting-box_url">
          {t('machineEdit.createWizardSteps.boxRegistryUrl')}
        </label>
        <input
          id="machine-setting-box_url"
          className="form-control"
          type="text"
          value={settings.box_url ?? ''}
          onChange={event => setSetting('box_url', event.target.value)}
          disabled={loading}
        />
      </div>
    </>
  );
};

BoxAdvancedFields.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  catalogEntry: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * The OS / Box step: the boot media, a box template, a blank disk, an
 * existing image or no disk; on a template boot the registry filter, the
 * one merged image list of every registry's catalog and the local
 * templates with Custom for a hand-typed image, the version, under
 * Advanced the architecture and the registry URL, and Browse BoxVault
 * where the server role offers it.
 */
export const BoxStep = ({
  settings,
  setSetting,
  templates,
  catalogNote,
  remoteBoxes,
  onBoxPicked,
  sourceNames,
  sourceFilter,
  onSourceFilterChange,
  boxPickCustom,
  setBoxPickCustom,
  bootSource,
  setBootSource,
  onBrowseBoxVault = null,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const boxOptions = boxOptionsOf(remoteBoxes, templates);
  const visibleOptions = sourceFilter
    ? boxOptions.filter(entry => entry.source === sourceFilter)
    : boxOptions;
  const catalogEntry = boxOptions.find(entry => entry.value === settings.box) || null;

  const handleBoxSelect = key => {
    const entry = boxOptions.find(row => row.key === key);
    if (!entry) {
      return;
    }
    setSetting('box', entry.value);
    setSetting('box_version', entry.versions[0] || '');
    if (entry.architectures.length > 0) {
      setSetting('box_arch', entry.architectures[0]);
    }
    onBoxPicked(entry);
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <span className="form-label d-block">{t('machineEdit.createWizardSteps.bootMedia')}</span>
        {BOOT_SOURCES.map(source => (
          <div className="form-check" key={source}>
            <input
              id={`machine-boot-source-${source}`}
              className="form-check-input"
              type="radio"
              name="machine-boot-source"
              checked={bootSource === source}
              onChange={() => setBootSource(source)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor={`machine-boot-source-${source}`}>
              {t(`machineEdit.createWizardSteps.bootSource.${source}.label`)}{' '}
              <span className="text-muted small">
                — {t(`machineEdit.createWizardSteps.bootSource.${source}.hint`)}
              </span>
            </label>
          </div>
        ))}
      </div>
      {bootSource === 'template' ? null : (
        <p className="form-text text-muted mb-0">
          {t('machineEdit.createWizardSteps.noBoxTemplateHint')}
        </p>
      )}
      {bootSource === 'template' ? (
        <>
          {catalogNote ? (
            <div className="col-12">
              <p className="form-text text-warning mb-0" data-note="catalog">
                {catalogNote}
              </p>
            </div>
          ) : null}
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-box-registry">
              {t('machineEdit.createWizardSteps.registry')}
            </label>
            <select
              id="machine-box-registry"
              className="form-select"
              value={sourceFilter}
              onChange={event => onSourceFilterChange(event.target.value)}
              disabled={loading}
            >
              <option value="">{t('machineEdit.createWizardSteps.allRegistries')}</option>
              {sourceNames.map(sourceName => (
                <option key={sourceName} value={sourceName}>
                  {sourceName}
                </option>
              ))}
            </select>
          </div>
          <BoxImageFields
            settings={settings}
            setSetting={setSetting}
            templates={templates}
            catalogEntry={catalogEntry}
            visibleOptions={visibleOptions}
            boxPickCustom={boxPickCustom}
            setBoxPickCustom={setBoxPickCustom}
            onBoxSelect={handleBoxSelect}
            onBoxPicked={onBoxPicked}
            loading={loading}
          />
          {advanced ? (
            <BoxAdvancedFields
              settings={settings}
              setSetting={setSetting}
              catalogEntry={catalogEntry}
              loading={loading}
            />
          ) : null}
          {onBrowseBoxVault ? (
            <div className="col-12">
              <button
                type="button"
                className="btn btn-sm btn-outline-info"
                data-action="browse-boxvault"
                onClick={onBrowseBoxVault}
                disabled={loading}
              >
                {t('machineEdit.createWizardSteps.browseBoxVault')}
              </button>
              <span className="form-text text-muted ms-2">
                {t('machineEdit.createWizardSteps.browseBoxVaultHint')}
              </span>
            </div>
          ) : null}
          <p className="form-text text-muted mb-0">
            {t('machineEdit.createWizardSteps.boxDownloadHint')}
          </p>
        </>
      ) : null}
    </div>
  );
};

BoxStep.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  templates: PropTypes.array.isRequired,
  catalogNote: PropTypes.string.isRequired,
  remoteBoxes: PropTypes.array.isRequired,
  onBoxPicked: PropTypes.func.isRequired,
  sourceNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  sourceFilter: PropTypes.string.isRequired,
  onSourceFilterChange: PropTypes.func.isRequired,
  boxPickCustom: PropTypes.bool.isRequired,
  setBoxPickCustom: PropTypes.func.isRequired,
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  onBrowseBoxVault: PropTypes.func,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * The memory field's stepper in whole gigabytes: `2G` steps to `3G` and
 * `1G`, any other spelling answers null and the buttons hold.
 *
 * @param {string} value - The memory as typed
 * @param {number} delta - The step, 1 or -1
 * @returns {string|null} The next value, or null
 */
export const stepMemory = (value, delta) => {
  const match = /^(?<gigs>\d+)\s*G$/i.exec(String(value || '').trim());
  if (!match) {
    return null;
  }
  const current = Number(match.groups.gigs);
  if (delta < 0 && current <= 1) {
    return null;
  }
  return `${current + delta}G`;
};

const Stepper = ({
  id,
  labelKey,
  lessKey,
  moreKey,
  children,
  onLess,
  onMore,
  lessHeld,
  moreHeld,
}) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-md-4">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <div className="input-group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          aria-label={t(lessKey)}
          onClick={onLess}
          disabled={lessHeld}
        >
          −
        </button>
        {children}
        <button
          type="button"
          className="btn btn-outline-secondary"
          aria-label={t(moreKey)}
          onClick={onMore}
          disabled={moreHeld}
        >
          +
        </button>
      </div>
    </div>
  );
};

Stepper.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  lessKey: PropTypes.string.isRequired,
  moreKey: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onLess: PropTypes.func.isRequired,
  onMore: PropTypes.func.isRequired,
  lessHeld: PropTypes.bool.isRequired,
  moreHeld: PropTypes.bool.isRequired,
};

/**
 * The CPU & Memory step: the processors and the memory, each with its
 * stepper.
 */
export const ResourcesStep = ({ settings, setSetting, loading }) => {
  const vcpus = Number(settings.vcpus) || 0;
  const bumpMemory = delta => {
    const next = stepMemory(settings.memory, delta);
    if (next) {
      setSetting('memory', next);
    }
  };

  return (
    <div className="row g-3">
      <Stepper
        id="machine-setting-vcpus"
        labelKey="machineEdit.createWizardSteps.vcpus"
        lessKey="machineEdit.createWizardSteps.fewerVcpus"
        moreKey="machineEdit.createWizardSteps.moreVcpus"
        onLess={() => setSetting('vcpus', Math.max(1, vcpus - 1))}
        onMore={() => setSetting('vcpus', Math.max(1, vcpus + 1))}
        lessHeld={Boolean(loading) || vcpus <= 1}
        moreHeld={Boolean(loading)}
      >
        <input
          id="machine-setting-vcpus"
          className="form-control text-center"
          type="number"
          min="1"
          value={settings.vcpus ?? ''}
          onChange={event =>
            setSetting('vcpus', event.target.value === '' ? '' : Number(event.target.value))
          }
          disabled={loading}
        />
      </Stepper>
      <Stepper
        id="machine-setting-memory"
        labelKey="machineEdit.createWizardSteps.memory"
        lessKey="machineEdit.createWizardSteps.lessMemory"
        moreKey="machineEdit.createWizardSteps.moreMemory"
        onLess={() => bumpMemory(-1)}
        onMore={() => bumpMemory(1)}
        lessHeld={Boolean(loading) || !stepMemory(settings.memory, -1)}
        moreHeld={Boolean(loading) || !stepMemory(settings.memory, 1)}
      >
        <input
          id="machine-setting-memory"
          className="form-control text-center"
          type="text"
          placeholder="e.g. 2G"
          value={settings.memory ?? ''}
          onChange={event => setSetting('memory', event.target.value)}
          disabled={loading}
        />
      </Stepper>
    </div>
  );
};

ResourcesStep.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

/**
 * The boot-order editor, the same on both hypervisors: the devices in
 * order, dragged to reorder, each removable; a fixed pick list of four
 * slots on VirtualBox and free-typed device tokens without a cap on bhyve.
 */
export const BootOrderEditor = ({
  bootOrder,
  setBootOrder,
  deviceOptions = null,
  maxSlots = 4,
  allowCustom = false,
  loading,
}) => {
  const { t } = useTranslation();
  const devices = deviceOptions || BOOT_ORDER_DEVICES;
  const [dragDevice, setDragDevice] = useState(null);
  const [customDevice, setCustomDevice] = useState('');

  const addCustom = () => {
    const device = customDevice.trim();
    if (!device || bootOrder.includes(device)) {
      return;
    }
    setBootOrder([...bootOrder, device]);
    setCustomDevice('');
  };

  const handleDragOverRow = device => {
    if (!dragDevice || dragDevice === device) {
      return;
    }
    const next = bootOrder.filter(entry => entry !== dragDevice);
    next.splice(next.indexOf(device), 0, dragDevice);
    setBootOrder(next);
  };

  return (
    <>
      <div className="d-flex flex-column gap-1 mb-2" data-list="boot-order">
        {bootOrder.map((device, index) => (
          <div
            className={`boot-order-row d-flex align-items-center gap-2 border rounded px-2 py-1 ${dragDevice === device ? 'opacity-50 border-primary' : ''}`}
            key={device}
            role="listitem"
            draggable={!loading}
            onDragStart={() => setDragDevice(device)}
            onDragEnd={() => setDragDevice(null)}
            onDragOver={event => {
              event.preventDefault();
              handleDragOverRow(device);
            }}
          >
            <FaGripVertical className="text-muted" aria-hidden="true" />
            <span className="badge text-bg-secondary">{index + 1}</span>
            <code>{device}</code>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger py-0 ms-auto"
              aria-label={t('machineEdit.createWizardSteps.removeBootDevice')}
              onClick={() => setBootOrder(bootOrder.filter(entry => entry !== device))}
              disabled={loading}
            >
              <FaTrash aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {bootOrder.length < maxSlots ? (
        <div className="d-flex flex-wrap gap-2">
          {devices.some(device => !bootOrder.includes(device)) ? (
            <select
              className="form-select form-select-sm w-auto"
              aria-label={t('machineEdit.createWizardSteps.addBootDevice')}
              value=""
              onChange={event =>
                event.target.value && setBootOrder([...bootOrder, event.target.value])
              }
              disabled={loading}
            >
              <option value="">{t('machineEdit.createWizardSteps.addDeviceToBootOrder')}</option>
              {devices
                .filter(device => !bootOrder.includes(device))
                .map(device => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
            </select>
          ) : null}
          {allowCustom ? (
            <div className="input-group input-group-sm w-auto">
              <input
                className="form-control"
                type="text"
                placeholder="device — e.g. bootdisk, cdrom0, net0=pxe"
                aria-label={t('machineEdit.createWizardSteps.bootDeviceToken')}
                value={customDevice}
                onChange={event => setCustomDevice(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustom();
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                title={t('machineEdit.createWizardSteps.addThisDeviceTitle')}
                onClick={addCustom}
                disabled={loading || !customDevice.trim()}
              >
                <FaPlus aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

BootOrderEditor.propTypes = {
  bootOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  setBootOrder: PropTypes.func.isRequired,
  deviceOptions: PropTypes.arrayOf(PropTypes.string),
  maxSlots: PropTypes.number,
  allowCustom: PropTypes.bool,
  loading: PropTypes.bool,
};

const CloneStrategySelect = ({ value, strategies, onChange, disabled }) => {
  const { t } = useTranslation();
  const current = strategies.includes(value) ? value : 'copy';
  return (
    <div className="col-6 col-md-4">
      <label className="form-label" htmlFor="machine-disk-clone-strategy">
        {t('machineEdit.createWizardSteps.cloneStrategy')}
      </label>
      <select
        id="machine-disk-clone-strategy"
        className="form-select"
        value={current}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        {strategies.map(strategy => (
          <option key={strategy} value={strategy}>
            {t(`machineEdit.createWizardSteps.cloneStrategyLabel.${strategy}`)}
          </option>
        ))}
      </select>
      <span className="form-text text-muted">
        {t(`machineEdit.createWizardSteps.cloneStrategyHint.${current}`)}
      </span>
    </div>
  );
};

CloneStrategySelect.propTypes = {
  value: PropTypes.string.isRequired,
  strategies: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const BootZfsPlacement = ({
  disks,
  setDisks,
  zfsPools,
  zfsDatasets,
  showClone,
  availablePools,
  defaultPool,
  loading,
}) => {
  const { t } = useTranslation();
  const fallbackPool = defaultPool || 'rpool';
  const poolOptions = zfsPoolOptions(zfsPools);
  const datasetOptions = zfsDatasetOptions(
    zfsDatasets,
    (disks.bootPool || '').trim() || fallbackPool
  );
  const strategiesFor = pool =>
    availablePools && !availablePools.includes(pool) ? ['copy', 'localize'] : ['clone', 'copy'];
  const strategies = strategiesFor((disks.bootPool || '').trim() || fallbackPool);
  const handlePoolChange = next => {
    const patch = { bootPool: next };
    if (!strategiesFor((next || '').trim() || fallbackPool).includes(disks.bootCloneStrategy)) {
      patch.bootCloneStrategy = 'copy';
    }
    setDisks(patch);
  };
  return (
    <>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-pool">
          {t('machineEdit.createWizardSteps.zfsPool')}
        </label>
        <PickOrType
          id="machine-disk-boot-pool"
          value={disks.bootPool}
          onChange={handlePoolChange}
          options={poolOptions}
          blankLabel={fallbackPool}
          placeholder={t('machineEdit.createWizardSteps.poolNamePlaceholder')}
          disabled={loading}
        />
      </div>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-dataset">
          {t('machineEdit.createWizardSteps.parentDataset')}
        </label>
        <PickOrType
          id="machine-disk-boot-dataset"
          value={disks.bootDataset}
          onChange={next => setDisks({ bootDataset: next })}
          options={datasetOptions}
          blankLabel="zones"
          placeholder="e.g. zones/companyA"
          disabled={loading}
        />
        <span className="form-text text-muted">
          {t('machineEdit.createWizardSteps.bootZvolLandsHint')}
        </span>
      </div>
      {showClone ? (
        <CloneStrategySelect
          value={disks.bootCloneStrategy}
          strategies={strategies}
          onChange={next => setDisks({ bootCloneStrategy: next })}
          disabled={loading}
        />
      ) : null}
    </>
  );
};

BootZfsPlacement.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  showClone: PropTypes.bool,
  availablePools: PropTypes.arrayOf(PropTypes.string),
  defaultPool: PropTypes.string,
  loading: PropTypes.bool,
};

const ExistingBootPath = ({
  disks,
  setDisks,
  host,
  bhyve,
  volumeOptions,
  mediaOptions,
  loading,
}) => {
  const { t } = useTranslation();
  const picker = bhyve
    ? {
        options: volumeOptions,
        blankLabel: t('machineEdit.createWizardSteps.selectAZvol'),
        placeholder: 'e.g. rpool/vms/old-server/root',
      }
    : {
        options: mediaOptions,
        blankLabel: t('machineEdit.createWizardSteps.selectRegisteredDiskImage'),
        placeholder: t('machineEdit.createWizardSteps.pathOnAgentHost'),
      };
  return (
    <div className="col-12 col-md-8">
      <label className="form-label" htmlFor="machine-disk-boot-path">
        {t(
          bhyve
            ? 'machineEdit.createWizardSteps.existingZvolDatasetPath'
            : 'machineEdit.createWizardSteps.existingDiskImagePath'
        )}
      </label>
      {bhyve || mediaOptions.length > 0 ? (
        <PickOrType
          id="machine-disk-boot-path"
          value={disks.bootPath}
          onChange={next => setDisks({ bootPath: next })}
          options={picker.options}
          blankLabel={picker.blankLabel}
          placeholder={picker.placeholder}
          disabled={loading}
        />
      ) : (
        <PathInput
          id="machine-disk-boot-path"
          value={disks.bootPath}
          onChange={next => setDisks({ bootPath: next })}
          {...host}
          mode="file"
          pickTitle={t('machineEdit.createWizardSteps.pickDiskImage')}
          disabled={loading}
        />
      )}
      <p className="form-text text-muted mb-0">
        {t('machineEdit.createWizardSteps.attachedAsIsHint')}
      </p>
    </div>
  );
};

ExistingBootPath.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  bhyve: PropTypes.bool,
  volumeOptions: PropTypes.array.isRequired,
  mediaOptions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

const CreatedBootFields = ({
  bootSource,
  disks,
  setDisks,
  bhyve,
  vbox,
  zfsPools,
  zfsDatasets,
  availablePools,
  defaultPool,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-size">
          {t(
            bootSource === 'template'
              ? 'machineEdit.createWizardSteps.diskSizeBlankTemplate'
              : 'machineEdit.createWizardSteps.diskSize'
          )}
        </label>
        <input
          id="machine-disk-boot-size"
          className="form-control"
          type="text"
          placeholder="e.g. 32G"
          value={disks.bootSize}
          onChange={event => setDisks({ bootSize: event.target.value })}
          disabled={loading}
        />
      </div>
      {advanced ? (
        <>
          <div className="col-6 col-md-4">
            <div className="mt-4">
              <Switch
                id="machine-disk-boot-sparse"
                labelKey="machineEdit.createWizardSteps.sparse"
                checked={disks.bootSparse}
                disabled={loading}
                onChange={checked => setDisks({ bootSparse: checked })}
              />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="machine-disk-boot-volume">
              {t('machineEdit.createWizardSteps.volumeName')}
            </label>
            <input
              id="machine-disk-boot-volume"
              className="form-control"
              type="text"
              value={disks.bootVolumeName}
              onChange={event => setDisks({ bootVolumeName: event.target.value })}
              disabled={loading}
            />
          </div>
          {bhyve ? (
            <BootZfsPlacement
              disks={disks}
              setDisks={setDisks}
              zfsPools={zfsPools}
              zfsDatasets={zfsDatasets}
              showClone={bootSource === 'template'}
              availablePools={availablePools}
              defaultPool={defaultPool}
              loading={loading}
            />
          ) : null}
          {vbox && bootSource === 'template' ? (
            <CloneStrategySelect
              value={disks.bootCloneStrategy}
              strategies={['clone', 'copy']}
              onChange={next => setDisks({ bootCloneStrategy: next })}
              disabled={loading}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
};

CreatedBootFields.propTypes = {
  bootSource: PropTypes.string.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  bhyve: PropTypes.bool,
  vbox: PropTypes.bool,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  availablePools: PropTypes.arrayOf(PropTypes.string),
  defaultPool: PropTypes.string,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const VboxBootPlacement = ({ bootSource, disks, setDisks, host, loading }) => {
  const { t } = useTranslation();
  return (
    <>
      {bootSource === 'template' || bootSource === 'scratch' ? (
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="machine-disk-boot-directory">
            {t('machineEdit.createWizardSteps.directoryWhereCreatedDiskLands')}
          </label>
          <PathInput
            id="machine-disk-boot-directory"
            className="form-control font-monospace"
            value={disks.bootDirectory}
            onChange={next => setDisks({ bootDirectory: next })}
            {...host}
            mode="directory"
            pickTitle={t('machineEdit.createWizardSteps.pickFolderForCreatedDisk')}
            placeholder={t('machineEdit.createWizardSteps.machineFolderPlaceholder')}
            list="machine-media-dirs"
            disabled={loading}
          />
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.browsePickOrTypeHint')}
          </span>
        </div>
      ) : null}
      {bootSource === 'none' ? null : (
        <>
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="machine-disk-boot-controller">
              {t('machineEdit.controllerPortFields.controller')}
            </label>
            <input
              id="machine-disk-boot-controller"
              className="form-control"
              list="machine-controller-names"
              placeholder={t('machineEdit.common.na')}
              value={disks.bootController}
              onChange={event => setDisks({ bootController: event.target.value })}
              disabled={loading}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="machine-disk-boot-port">
              {t('machineEdit.controllerPortFields.port')}
            </label>
            <input
              id="machine-disk-boot-port"
              className="form-control"
              type="number"
              min="0"
              placeholder={t('machineEdit.createWizardSteps.nextFreePlaceholder')}
              value={disks.bootPort}
              onChange={event => setDisks({ bootPort: event.target.value })}
              disabled={loading}
            />
          </div>
        </>
      )}
    </>
  );
};

VboxBootPlacement.propTypes = {
  bootSource: PropTypes.string.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  loading: PropTypes.bool,
};

const BootDiskSection = ({
  bootSource,
  setBootSource,
  disks,
  setDisks,
  host,
  bhyve,
  vbox,
  volumeOptions,
  mediaOptions,
  zfsPools,
  zfsDatasets,
  availablePools,
  defaultPool,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const created = bootSource === 'template' || bootSource === 'scratch';
  return (
    <div className="row g-3 mb-3">
      <div className="col-12">
        <div
          className="btn-group"
          role="group"
          aria-label={t('machineEdit.createWizardSteps.bootDiskType')}
        >
          {BOOT_SOURCES.map(source => (
            <button
              type="button"
              key={source}
              className={`btn btn-sm ${bootSource === source ? 'btn-primary' : 'btn-outline-secondary'}`}
              title={t(`machineEdit.createWizardSteps.bootSource.${source}.hint`)}
              data-boot-source={source}
              onClick={() => setBootSource(source)}
              disabled={loading}
            >
              {t(`machineEdit.createWizardSteps.bootSource.${source}.label`)}
            </button>
          ))}
        </div>
      </div>
      {bootSource === 'none' ? (
        <p className="form-text text-muted mb-0">
          {t('machineEdit.createWizardSteps.disklessHint')}
        </p>
      ) : null}
      {bootSource === 'existing' ? (
        <ExistingBootPath
          disks={disks}
          setDisks={setDisks}
          host={host}
          bhyve={bhyve}
          volumeOptions={volumeOptions}
          mediaOptions={mediaOptions}
          loading={loading}
        />
      ) : null}
      {created ? (
        <CreatedBootFields
          bootSource={bootSource}
          disks={disks}
          setDisks={setDisks}
          bhyve={bhyve}
          vbox={vbox}
          zfsPools={zfsPools}
          zfsDatasets={zfsDatasets}
          availablePools={availablePools}
          defaultPool={defaultPool}
          advanced={advanced}
          loading={loading}
        />
      ) : null}
      {vbox && advanced ? (
        <VboxBootPlacement
          bootSource={bootSource}
          disks={disks}
          setDisks={setDisks}
          host={host}
          loading={loading}
        />
      ) : null}
    </div>
  );
};

BootDiskSection.propTypes = {
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  bhyve: PropTypes.bool,
  vbox: PropTypes.bool,
  volumeOptions: PropTypes.array.isRequired,
  mediaOptions: PropTypes.array.isRequired,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  availablePools: PropTypes.arrayOf(PropTypes.string),
  defaultPool: PropTypes.string,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const buildVolumeOptions = (zfsVolumes, t) =>
  zfsVolumes.map(volume => ({
    value: volume.name,
    label: volume.in_use_by
      ? t('machineEdit.createWizardSteps.inUseByLabel', {
          name: volume.name,
          user: volume.in_use_by,
        })
      : volume.name,
  }));

const buildMediaOptions = (vboxMedia, t) =>
  vboxMedia.map(medium => {
    const size = Number.isFinite(medium.size_bytes) ? ` — ${humanSize(medium.size_bytes)}` : '';
    const holders =
      Array.isArray(medium.in_use_by) && medium.in_use_by.length > 0
        ? t('machineEdit.createWizardSteps.inUseByListSuffix', {
            list: medium.in_use_by.join(', '),
          })
        : '';
    return { value: medium.path, label: `${medium.path}${size}${holders}` };
  });

const buildMediaDirs = vboxMedia => [
  ...new Set(
    vboxMedia
      .map(medium => {
        const path = String(medium.path || '');
        const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return cut > 0 ? path.slice(0, cut) : '';
      })
      .filter(Boolean)
  ),
];

const existingDiskPickerFor = (bhyve, volumeOptions, mediaOptions, t) => {
  if (bhyve) {
    return {
      options: volumeOptions,
      blankLabel: t('machineEdit.createWizardSteps.selectAZvol'),
      placeholder: 'e.g. rpool/vols/data',
    };
  }
  return mediaOptions.length > 0
    ? {
        options: mediaOptions,
        blankLabel: t('machineEdit.createWizardSteps.selectRegisteredDiskImage'),
        placeholder: t('machineEdit.createWizardSteps.pathOnAgentHost'),
      }
    : null;
};

const AddButton = ({ labelKey, onClick, disabled }) => {
  const { t } = useTranslation();
  return (
    <div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={onClick}
        disabled={disabled}
      >
        <FaPlus className="me-2" aria-hidden="true" />
        {t(labelKey)}
      </button>
    </div>
  );
};

AddButton.propTypes = {
  labelKey: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const BhyveDiskPlacement = ({ rowKey, row, index, onPatch, poolOptions, zfsDatasets, loading }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="col-3 col-md-2">
        <label className="form-label small mb-1" htmlFor={`${rowKey}-volume`}>
          {t('machineEdit.createWizardSteps.volumeName')}
        </label>
        <input
          id={`${rowKey}-volume`}
          className="form-control form-control-sm"
          type="text"
          placeholder={`disk${index}`}
          value={row.volume_name ?? ''}
          onChange={event => onPatch({ volume_name: event.target.value })}
          disabled={loading}
        />
      </div>
      <div className="col-3 col-md-2">
        <label className="form-label small mb-1" htmlFor={`${rowKey}-pool`}>
          {t('machineEdit.storageDevicesEditor.pool')}
        </label>
        <PickOrType
          id={`${rowKey}-pool`}
          value={row.pool ?? ''}
          onChange={next => onPatch({ pool: next })}
          options={poolOptions}
          blankLabel="rpool"
          placeholder="pool name"
          small
          disabled={loading}
        />
      </div>
      <div className="col-3 col-md-2">
        <label className="form-label small mb-1" htmlFor={`${rowKey}-dataset`}>
          {t('machineEdit.createWizardSteps.dataset')}
        </label>
        <PickOrType
          id={`${rowKey}-dataset`}
          value={row.dataset ?? ''}
          onChange={next => onPatch({ dataset: next })}
          options={zfsDatasetOptions(zfsDatasets, (row.pool || '').trim() || 'rpool')}
          blankLabel="zones"
          placeholder="e.g. zones/companyA"
          small
          disabled={loading}
        />
      </div>
      <div className="col-auto">
        <div className="mt-4">
          <Switch
            id={`${rowKey}-sparse`}
            labelKey="machineEdit.createWizardSteps.sparse"
            checked={row.sparse !== false}
            disabled={loading}
            small
            onChange={checked => onPatch({ sparse: checked })}
          />
        </div>
      </div>
    </>
  );
};

BhyveDiskPlacement.propTypes = {
  rowKey: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onPatch: PropTypes.func.isRequired,
  poolOptions: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

const AdditionalDiskRow = ({
  row,
  index,
  onPatch,
  onRemove,
  host,
  bhyve,
  vbox,
  picker,
  poolOptions,
  zfsDatasets,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const rowKey = `additional-disk-${row.key}`;
  return (
    <div className="row g-2 align-items-end" data-row="additional-disk">
      <DiskSourceFields
        idPrefix={rowKey}
        sourceLabel={t('machineEdit.createWizardSteps.source')}
        valueCol="col-6 col-md-5"
        sizeLabel={t('machineEdit.createWizardSteps.size')}
        sizePlaceholder="e.g. 20G"
        existingLabel={t(
          bhyve
            ? 'machineEdit.createWizardSteps.existingZvol'
            : 'machineEdit.createWizardSteps.existingDiskImage'
        )}
        row={row}
        onPatch={onPatch}
        picker={picker}
        {...host}
        disabled={loading}
      />
      {advanced && vbox ? (
        <ControllerPortFields
          idPrefix={rowKey}
          row={row}
          onPatch={onPatch}
          controllerList="machine-controller-names"
          disabled={loading}
        />
      ) : null}
      {advanced && vbox && row.mode === 'new' ? (
        <div className="col-4 col-md-3">
          <label className="form-label small mb-1" htmlFor={`${rowKey}-directory`}>
            {t('machineEdit.createWizardSteps.directory')}
          </label>
          <PathInput
            id={`${rowKey}-directory`}
            className="form-control form-control-sm font-monospace"
            value={row.directory ?? ''}
            onChange={next => onPatch({ directory: next })}
            {...host}
            mode="directory"
            pickTitle={t('machineEdit.createWizardSteps.pickFolderForCreatedDisk')}
            placeholder={t('machineEdit.createWizardSteps.machineFolderPlaceholder')}
            list="machine-media-dirs"
            disabled={loading}
          />
        </div>
      ) : null}
      {advanced && bhyve && row.mode === 'new' ? (
        <BhyveDiskPlacement
          rowKey={rowKey}
          row={row}
          index={index}
          onPatch={onPatch}
          poolOptions={poolOptions}
          zfsDatasets={zfsDatasets}
          loading={loading}
        />
      ) : null}
      <RemoveRowButton
        label={t('machineEdit.createWizardSteps.removeDisk')}
        onClick={onRemove}
        disabled={loading}
      />
    </div>
  );
};

AdditionalDiskRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onPatch: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  bhyve: PropTypes.bool,
  vbox: PropTypes.bool,
  picker: PropTypes.object,
  poolOptions: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const newDiskRow = () => ({
  key: nextRowKey(),
  mode: 'new',
  size: '',
  path: '',
  volume_name: '',
  pool: '',
  dataset: '',
  directory: '',
  sparse: true,
});

const AdditionalDisksSection = ({ disks, setDisks, ...rowProps }) => {
  const setAdditional = (index, patch) =>
    setDisks({
      additional: disks.additional.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  return (
    <>
      <h6 className="fw-bold">
        {useTranslation().t('machineEdit.createWizardSteps.additionalDisks')}
      </h6>
      <div className="d-flex flex-column gap-2 mb-3" data-list="additional-disks">
        {disks.additional.map((row, index) => (
          <AdditionalDiskRow
            key={row.key}
            row={row}
            index={index}
            onPatch={patch => setAdditional(index, patch)}
            onRemove={() =>
              setDisks({ additional: disks.additional.filter(entry => entry.key !== row.key) })
            }
            {...rowProps}
          />
        ))}
        <AddButton
          labelKey="machineEdit.createWizardSteps.addDisk"
          onClick={() => setDisks({ additional: [...disks.additional, newDiskRow()] })}
          disabled={rowProps.loading}
        />
      </div>
    </>
  );
};

AdditionalDisksSection.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const CdromsSection = ({ disks, setDisks, host, isoList, advanced, loading }) => {
  const { t } = useTranslation();
  const setCdrom = (index, patch) =>
    setDisks({
      cdroms: disks.cdroms.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.cdDvdIso')}</h6>
      <div className="d-flex flex-column gap-2" data-list="cdroms">
        {disks.cdroms.map((row, index) => {
          const rowKey = `cdrom-${row.key}`;
          return (
            <div className="row g-2 align-items-end" key={row.key} data-row="cdrom">
              <CdromSourceFields
                idPrefix={rowKey}
                sourceLabel={t('machineEdit.createWizardSteps.source')}
                sourceCol="col-4 col-md-2"
                isoCol="col-6 col-md-6"
                pathCol="col-10 col-md-6"
                row={row}
                onPatch={patch => setCdrom(index, patch)}
                isoOptions={isoList}
                {...host}
                disabled={loading}
              />
              {advanced ? (
                <ControllerPortFields
                  idPrefix={rowKey}
                  row={row}
                  onPatch={patch => setCdrom(index, patch)}
                  controllerList="machine-controller-names"
                  disabled={loading}
                />
              ) : null}
              <RemoveRowButton
                label={t('machineEdit.createWizardSteps.removeIso')}
                onClick={() =>
                  setDisks({ cdroms: disks.cdroms.filter(entry => entry.key !== row.key) })
                }
                disabled={loading}
              />
            </div>
          );
        })}
        <AddButton
          labelKey="machineEdit.createWizardSteps.addIso"
          onClick={() =>
            setDisks({
              cdroms: [
                ...disks.cdroms,
                {
                  key: nextRowKey(),
                  source: isoList.length > 0 ? 'iso' : 'path',
                  path: '',
                  iso: '',
                },
              ],
            })
          }
          disabled={loading}
        />
      </div>
    </>
  );
};

CdromsSection.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  isoList: PropTypes.arrayOf(PropTypes.string).isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const FILESYSTEM_FIELDS = [
  { key: 'special', col: 'col-6 col-md-3', labelKey: 'machineEdit.filesystemsEditor.hostDir' },
  { key: 'dir', col: 'col-6 col-md-3', labelKey: 'machineEdit.filesystemsEditor.mountPoint' },
  {
    key: 'type',
    col: 'col-4 col-md-2',
    labelKey: 'machineEdit.filesystemsEditor.type',
    placeholder: 'lofs',
  },
  {
    key: 'options',
    col: 'col-6 col-md-3',
    labelKey: 'machineEdit.filesystemsEditor.options',
    placeholder: 'e.g. ro',
  },
];

const FilesystemsSection = ({ disks, setDisks, loading }) => {
  const { t } = useTranslation();
  const rows = disks.filesystems || [];
  return (
    <>
      <h6 className="fw-bold mt-3">{t('machineEdit.createWizardSteps.filesystemsLofsMounts')}</h6>
      <div className="d-flex flex-column gap-2" data-list="filesystems">
        {rows.map(row => {
          const setRow = patch =>
            setDisks({
              filesystems: rows.map(entry =>
                entry.key === row.key ? { ...entry, ...patch } : entry
              ),
            });
          return (
            <div className="row g-2 align-items-end" key={row.key} data-row="filesystem">
              {FILESYSTEM_FIELDS.map(field => (
                <div className={field.col} key={field.key}>
                  <label
                    className="form-label small mb-1"
                    htmlFor={`create-fs-${field.key}-${row.key}`}
                  >
                    {t(field.labelKey)}
                  </label>
                  <input
                    id={`create-fs-${field.key}-${row.key}`}
                    className="form-control form-control-sm"
                    placeholder={field.placeholder}
                    value={row[field.key]}
                    onChange={event => setRow({ [field.key]: event.target.value })}
                    disabled={loading}
                  />
                </div>
              ))}
              <RemoveRowButton
                label={t('machineEdit.createWizardSteps.removeMount')}
                onClick={() =>
                  setDisks({ filesystems: rows.filter(entry => entry.key !== row.key) })
                }
                disabled={loading}
              />
            </div>
          );
        })}
        <AddButton
          labelKey="machineEdit.filesystemsEditor.addMount"
          onClick={() =>
            setDisks({
              filesystems: [
                ...rows,
                { key: nextRowKey(), special: '', dir: '', type: '', options: '' },
              ],
            })
          }
          disabled={loading}
        />
      </div>
    </>
  );
};

FilesystemsSection.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const ControllersSection = ({ disks, setDisks, controllerTypeOptions, loading }) => {
  const { t } = useTranslation();
  const rows = disks.controllers || [];
  const controllerNames = rows.map(row => row.name.trim()).filter(Boolean);
  const setController = (index, patch) =>
    setDisks({ controllers: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.storageControllers')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.vboxStorageSurfaceHint')} <code>controller/port</code>{' '}
        {t('machineEdit.createWizardSteps.explicitlySuffix')}
      </p>
      <div className="d-flex flex-column gap-2 mb-2" data-list="controllers">
        {rows.map((row, index) => (
          <div className="row g-2 align-items-end" key={row.key} data-row="controller">
            <div className="col-4 col-md-3">
              <label className="form-label small mb-1" htmlFor={`controller-type-${row.key}`}>
                {t('machineEdit.createWizardSteps.type')}
              </label>
              <select
                id={`controller-type-${row.key}`}
                className="form-select form-select-sm"
                value={row.type}
                onChange={event => setController(index, { type: event.target.value })}
                disabled={loading}
              >
                {controllerTypeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-4 col-md-3">
              <label className="form-label small mb-1" htmlFor={`controller-name-${row.key}`}>
                {t('machineEdit.storageDevicesEditor.nameOptional')}
              </label>
              <input
                id={`controller-name-${row.key}`}
                className="form-control form-control-sm"
                value={row.name}
                onChange={event => setController(index, { name: event.target.value })}
                disabled={loading}
              />
            </div>
            <div className="col-2 col-md-2">
              <label className="form-label small mb-1" htmlFor={`controller-ports-${row.key}`}>
                {t('machineEdit.createWizardSteps.ports')}
              </label>
              <input
                id={`controller-ports-${row.key}`}
                className="form-control form-control-sm"
                type="number"
                min="1"
                placeholder="auto"
                value={row.ports}
                onChange={event => setController(index, { ports: event.target.value })}
                disabled={loading}
              />
            </div>
            <div className="col-auto">
              <div className="form-check mt-3">
                <input
                  id={`controller-bootable-${row.key}`}
                  className="form-check-input"
                  type="checkbox"
                  checked={row.bootable}
                  onChange={event => setController(index, { bootable: event.target.checked })}
                  disabled={loading}
                />
                <label
                  className="form-check-label small"
                  htmlFor={`controller-bootable-${row.key}`}
                >
                  {t('machineEdit.createWizardSteps.bootable')}
                </label>
              </div>
            </div>
            <RemoveRowButton
              label={t('machineEdit.createWizardSteps.removeController')}
              onClick={() => setDisks({ controllers: rows.filter(entry => entry.key !== row.key) })}
              disabled={loading}
            />
          </div>
        ))}
      </div>
      <AddButton
        labelKey="machineEdit.createWizardSteps.addController"
        onClick={() =>
          setDisks({
            controllers: [
              ...rows,
              { key: nextRowKey(), name: '', type: 'sata', ports: '', bootable: false },
            ],
          })
        }
        disabled={loading}
      />
      {controllerNames.length > 0 ? (
        <datalist id="machine-controller-names">
          {controllerNames.map(controllerName => (
            <option key={controllerName} value={controllerName} />
          ))}
        </datalist>
      ) : null}
    </>
  );
};

ControllersSection.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  controllerTypeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  loading: PropTypes.bool,
};

const DisksAdvanced = ({
  disks,
  setDisks,
  diskif,
  setDiskif,
  agentDefaults,
  bhyve,
  vbox,
  loading,
}) => {
  const { t } = useTranslation();
  const knobValues = agentDefaults?.knob_values || null;
  return (
    <>
      {bhyve ? (
        <div className="row g-3 mt-1 mb-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-zones-diskif">
              {t('machineEdit.createWizardSteps.defaultControllerType')}
            </label>
            <VocabularySelect
              id="machine-zones-diskif"
              value={diskif}
              entries={knobValues?.['zones.diskif'] || DISKIF_OPTIONS}
              blankLabel={agentDefaultLabel(agentDefaults, 'diskif')}
              onChange={setDiskif}
              disabled={loading}
            />
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.singleControllerShapeHint')}
            </span>
          </div>
        </div>
      ) : null}
      {vbox ? (
        <ControllersSection
          disks={disks}
          setDisks={setDisks}
          controllerTypeOptions={
            knobValues?.['disks.controller_type'] || [...DISKIF_OPTIONS, 'usb', 'floppy']
          }
          loading={loading}
        />
      ) : null}
    </>
  );
};

DisksAdvanced.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  diskif: PropTypes.string.isRequired,
  setDiskif: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  bhyve: PropTypes.bool,
  vbox: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * The Disks step, the device model both agents read: the boot disk by
 * its type, the additional disks, the CD/DVD images, on a bhyve host the
 * lofs mounts, the boot order, and under Advanced the default controller
 * type of a bhyve host and the storage controllers of a VirtualBox host,
 * the pickers fed by the host's pools, datasets, volumes and registered
 * media.
 */
export const DisksStep = ({
  bootSource,
  setBootSource,
  disks,
  setDisks,
  bootOrder,
  setBootOrder,
  diskif,
  setDiskif,
  agentDefaults,
  isoOptions,
  host,
  vbox,
  bhyve,
  zfsPools,
  zfsDatasets,
  zfsVolumes,
  vboxMedia,
  availablePools,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const knobValues = agentDefaults?.knob_values || null;
  const poolOptions = zfsPoolOptions(zfsPools);
  const volumeOptions = buildVolumeOptions(zfsVolumes, t);
  const mediaOptions = buildMediaOptions(vboxMedia, t);
  const mediaDirs = buildMediaDirs(vboxMedia);

  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.bootDisk')}</h6>
      <BootDiskSection
        bootSource={bootSource}
        setBootSource={setBootSource}
        disks={disks}
        setDisks={setDisks}
        host={host}
        bhyve={bhyve}
        vbox={vbox}
        volumeOptions={volumeOptions}
        mediaOptions={mediaOptions}
        zfsPools={zfsPools}
        zfsDatasets={zfsDatasets}
        availablePools={availablePools}
        defaultPool={agentDefaults?.disks?.boot?.pool || null}
        advanced={advanced}
        loading={loading}
      />
      {bhyve && volumeOptions.length > 0 ? (
        <datalist id="machine-zvol-options">
          {volumeOptions.map(option => (
            <option key={option.value} value={option.value} />
          ))}
        </datalist>
      ) : null}
      {vbox && mediaDirs.length > 0 ? (
        <datalist id="machine-media-dirs">
          {mediaDirs.map(dir => (
            <option key={dir} value={dir} />
          ))}
        </datalist>
      ) : null}
      <AdditionalDisksSection
        disks={disks}
        setDisks={setDisks}
        host={host}
        bhyve={bhyve}
        vbox={vbox}
        picker={existingDiskPickerFor(bhyve, volumeOptions, mediaOptions, t)}
        poolOptions={poolOptions}
        zfsDatasets={zfsDatasets}
        advanced={advanced}
        loading={loading}
      />
      <CdromsSection
        disks={disks}
        setDisks={setDisks}
        host={host}
        isoList={isoOptions}
        advanced={advanced}
        loading={loading}
      />
      {bhyve ? <FilesystemsSection disks={disks} setDisks={setDisks} loading={loading} /> : null}
      <h6 className="fw-bold mt-3">{t('machineEdit.createWizardSteps.bootOrder')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.bootOrderIsoHintPrefix')} <code>dvd</code>{' '}
        {t('machineEdit.createWizardSteps.bootOrderIsoHintMiddle')} <code>disk</code>{' '}
        {t('machineEdit.createWizardSteps.bootOrderIsoHintTail')}
      </p>
      <BootOrderEditor
        bootOrder={bootOrder}
        setBootOrder={setBootOrder}
        deviceOptions={knobValues?.boot_order || null}
        loading={loading}
      />
      {advanced ? (
        <DisksAdvanced
          disks={disks}
          setDisks={setDisks}
          diskif={diskif}
          setDiskif={setDiskif}
          agentDefaults={agentDefaults}
          bhyve={bhyve}
          vbox={vbox}
          loading={loading}
        />
      ) : null}
    </>
  );
};

DisksStep.propTypes = {
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  bootOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  setBootOrder: PropTypes.func.isRequired,
  diskif: PropTypes.string.isRequired,
  setDiskif: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  isoOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  host: PropTypes.shape(hostShape).isRequired,
  vbox: PropTypes.bool,
  bhyve: PropTypes.bool,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  zfsVolumes: PropTypes.array.isRequired,
  vboxMedia: PropTypes.array.isRequired,
  availablePools: PropTypes.arrayOf(PropTypes.string),
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * The bhyve boot order as a list of device tokens, the wire's
 * comma-joined string split.
 *
 * @param {string} value - The `zones.bootorder` text
 * @returns {Array<string>} The tokens
 */
export const splitBhyveBootOrder = value =>
  String(value || '')
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);

/**
 * The guest OS type picker fed by `GET machines/ostypes`, grouped by
 * family, the value the id `settings.os_type` takes; a value the list
 * does not know stays selectable.
 */
export const OsTypeSelect = ({ id, osTypes, value, onChange, blankLabel, disabled }) => {
  const families = [];
  const byFamily = new Map();
  osTypes.forEach(entry => {
    const family = entry.family_description || entry.family || 'Other';
    if (!byFamily.has(family)) {
      byFamily.set(family, []);
      families.push(family);
    }
    byFamily.get(family).push(entry);
  });
  const known = osTypes.some(entry => entry.id === value);
  return (
    <select id={id} className="form-select" value={value} onChange={onChange} disabled={disabled}>
      <option value="">{blankLabel}</option>
      {value && !known ? <option value={value}>{value}</option> : null}
      {families.map(family => (
        <optgroup key={family} label={family}>
          {byFamily.get(family).map(entry => (
            <option key={entry.id} value={entry.id}>
              {entry.description || entry.id}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

OsTypeSelect.propTypes = {
  id: PropTypes.string.isRequired,
  osTypes: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const bootromLocksUefiFor = (bhyve, bootromValue) =>
  bhyve && bootromValue !== '' && !bootromValue.toUpperCase().endsWith('_CSM');

const bootromChoicesFor = (knobValues, firmwareType) => {
  const list = knobValues?.['zones.bootrom'] || [];
  return firmwareType === 'BIOS'
    ? list.filter(rom => String(rom).toUpperCase().endsWith('_CSM'))
    : list;
};

const firmwareChoicesFor = (knobValues, locksUefi) =>
  locksUefi ? ['UEFI'] : knobValues?.['settings.firmware_type'] || ['UEFI', 'BIOS'];

const ZoneSystemField = ({ field, zones, setZone, knobValues, defaultLabel, loading }) => {
  const { t } = useTranslation();
  const vocabulary = knobValues?.[`zones.${field.key}`] || null;
  const current = zones[field.key] ?? '';
  return (
    <div className="col-6 col-md-4">
      <label className="form-label" htmlFor={`machine-zones-${field.key}`}>
        {t(`machineEdit.createWizardSteps.systemField.${field.key}`)}
      </label>
      {field.freeText && !vocabulary ? (
        <>
          <input
            id={`machine-zones-${field.key}`}
            className="form-control"
            type="text"
            list={`machine-zones-${field.key}-options`}
            placeholder={defaultLabel(field.key)}
            value={current}
            onChange={event => setZone(field.key, event.target.value)}
            disabled={loading}
          />
          <datalist id={`machine-zones-${field.key}-options`}>
            {field.options.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </>
      ) : (
        <VocabularySelect
          id={`machine-zones-${field.key}`}
          value={current}
          entries={vocabulary || field.options}
          blankLabel={defaultLabel(field.key)}
          onChange={next => setZone(field.key, next)}
          disabled={loading}
        />
      )}
    </div>
  );
};

ZoneSystemField.propTypes = {
  field: PropTypes.object.isRequired,
  zones: PropTypes.object.isRequired,
  setZone: PropTypes.func.isRequired,
  knobValues: PropTypes.object,
  defaultLabel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const ZoneBootFields = ({ zones, setZone, settings, agentDefaults, bhyveBootDevices, loading }) => {
  const { t } = useTranslation();
  const cpuTopo = Array.isArray(zones.complex_cpu_conf) ? zones.complex_cpu_conf[0] || {} : {};
  const setCpuTopo = patch => setZone('complex_cpu_conf', [{ ...cpuTopo, ...patch }]);
  return (
    <>
      <div className="col-12">
        <span className="form-label d-block">
          {t('machineEdit.createWizardSteps.bootOrderBlank')}{' '}
          {agentDefaults?.zones?.bootorder
            ? t('machineEdit.createWizardSteps.defaultValue', {
                value: agentDefaults.zones.bootorder,
              })
            : t('machineEdit.createWizardSteps.agentDefault')}
          )
        </span>
        <BootOrderEditor
          bootOrder={splitBhyveBootOrder(zones.bootorder)}
          setBootOrder={list => setZone('bootorder', list.join(','))}
          deviceOptions={bhyveBootDevices}
          maxSlots={Infinity}
          allowCustom
          loading={loading}
        />
        <span className="form-text text-muted">
          {t('machineEdit.createWizardSteps.deviceTokensHint')}
        </span>
      </div>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-zones-bootnext">
          {t('machineEdit.createWizardSteps.bootNext')}
        </label>
        <input
          id="machine-zones-bootnext"
          className="form-control"
          type="text"
          list={bhyveBootDevices.length > 0 ? 'machine-zones-bootnext-options' : undefined}
          placeholder="e.g. cdrom0"
          title={t('machineEdit.createWizardSteps.bootNextHint')}
          value={zones.bootnext ?? ''}
          onChange={event => setZone('bootnext', event.target.value)}
          disabled={loading}
        />
        {bhyveBootDevices.length > 0 ? (
          <datalist id="machine-zones-bootnext-options">
            {bhyveBootDevices.map(device => (
              <option key={device} value={device} />
            ))}
          </datalist>
        ) : null}
      </div>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-zones-cpu-config">
          {t('machineEdit.machineSettings.cpuTopology')}
        </label>
        <select
          id="machine-zones-cpu-config"
          className="form-select"
          value={zones.cpu_configuration ?? ''}
          onChange={event => {
            const mode = event.target.value;
            setZone('cpu_configuration', mode);
            if (mode !== 'complex') {
              setZone('complex_cpu_conf', '');
            } else if (!Array.isArray(zones.complex_cpu_conf)) {
              setZone('complex_cpu_conf', [
                { sockets: 1, cores: Number(settings.vcpus) || 1, threads: 1 },
              ]);
            }
          }}
          disabled={loading}
        >
          <option value="">{t('machineEdit.createWizardSteps.simpleDefault')}</option>
          <option value="complex">{t('machineEdit.machineSettings.complexTopo')}</option>
        </select>
      </div>
      {zones.cpu_configuration === 'complex' ? (
        <CpuTopologyInputs
          idPrefix="machine-cpu"
          topo={cpuTopo}
          onField={(key, next) => setCpuTopo({ [key]: next })}
          disabled={loading}
        />
      ) : null}
    </>
  );
};

ZoneBootFields.propTypes = {
  zones: PropTypes.object.isRequired,
  setZone: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  agentDefaults: PropTypes.object,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string).isRequired,
  loading: PropTypes.bool,
};

const CLOUD_INIT_FIELDS = [
  { key: 'dns_domain', labelKey: 'machineEdit.generalSettingsTab.dnsDomain' },
  { key: 'password', labelKey: 'machineEdit.createWizardSteps.password' },
  {
    key: 'resolvers',
    labelKey: 'machineEdit.createWizardSteps.resolversCommaSeparated',
    placeholder: '1.1.1.1, 8.8.8.8',
  },
];

const CloudInitSection = ({ cloudInit, setCloudInit, loading }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.cloudInit')}</h6>
      <div className="row g-3 mb-3">
        <div className="col-12">
          <Switch
            id="machine-cloudinit-enabled"
            labelKey="machineEdit.createWizardSteps.enableCloudInit"
            checked={cloudInit.enabled}
            disabled={loading}
            onChange={checked => setCloudInit({ enabled: checked })}
          />
        </div>
        {cloudInit.enabled ? (
          <>
            {CLOUD_INIT_FIELDS.map(field => (
              <div className="col-12 col-md-4" key={field.key}>
                <label className="form-label" htmlFor={`machine-cloudinit-${field.key}`}>
                  {t(field.labelKey)}
                </label>
                <input
                  id={`machine-cloudinit-${field.key}`}
                  className="form-control"
                  type="text"
                  placeholder={field.placeholder}
                  value={cloudInit[field.key]}
                  onChange={event => setCloudInit({ [field.key]: event.target.value })}
                  disabled={loading}
                />
              </div>
            ))}
            <div className="col-12">
              <label className="form-label" htmlFor="machine-cloudinit-sshkey">
                {t('machineEdit.generalSettingsTab.sshPublicKey')}
              </label>
              <textarea
                id="machine-cloudinit-sshkey"
                className="form-control font-monospace"
                rows={2}
                value={cloudInit.sshkey}
                onChange={event => setCloudInit({ sshkey: event.target.value })}
                disabled={loading}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

CloudInitSection.propTypes = {
  cloudInit: PropTypes.object.isRequired,
  setCloudInit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const VboxHardwareSection = ({
  hardware,
  onHardwareChange,
  knobValues,
  serialRows,
  setSerialRows,
  parallelRows,
  setParallelRows,
  vboxJson,
  setVboxJson,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.hardware')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.hypervisorKnobSurfaceHint')}{' '}
        <code>vbox.&lt;section&gt;.&lt;key&gt;</code>{' '}
        {t('machineEdit.createWizardSteps.unvalidatedErrorHint')}
      </p>
      {HARDWARE_SECTIONS.map(section => (
        <details className="mb-2" key={section.id}>
          <summary className="fw-semibold">
            {t(`machineEdit.hardwareSections.${section.id}`)}
          </summary>
          <div className="mt-2 mb-2">
            <HardwareSectionForm
              section={section}
              values={hardware[section.id] || {}}
              onChange={onHardwareChange}
              knobValues={knobValues}
              blankLabel={t('machineEdit.common.na')}
              disabled={loading}
            />
          </div>
        </details>
      ))}
      <details className="mb-3">
        <summary className="fw-semibold">
          {t('machineEdit.createWizardSteps.serialParallelPorts')}
        </summary>
        <div className="mt-2">
          <SerialPortsEditor rows={serialRows} onRowsChange={setSerialRows} disabled={loading} />
          <div className="mt-2">
            <ParallelPortsEditor
              rows={parallelRows}
              onRowsChange={setParallelRows}
              disabled={loading}
            />
          </div>
        </div>
      </details>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.hypervisorPassthroughVbox')}</h6>
      <label className="form-label" htmlFor="machine-vbox-json">
        <code>vbox</code> {t('machineEdit.createWizardSteps.vboxSectionRawJsonHint')}
      </label>
      <textarea
        id="machine-vbox-json"
        className="form-control font-monospace"
        rows={4}
        placeholder='{"directives": {}}'
        value={vboxJson}
        onChange={event => setVboxJson(event.target.value)}
        disabled={loading}
      />
    </>
  );
};

VboxHardwareSection.propTypes = {
  hardware: PropTypes.object.isRequired,
  onHardwareChange: PropTypes.func.isRequired,
  knobValues: PropTypes.object,
  serialRows: PropTypes.array.isRequired,
  setSerialRows: PropTypes.func.isRequired,
  parallelRows: PropTypes.array.isRequired,
  setParallelRows: PropTypes.func.isRequired,
  vboxJson: PropTypes.string.isRequired,
  setVboxJson: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

/**
 * The System step: the `zones` fields of a bhyve host, the guest agent
 * channel, the firmware and the boot ROM linked to it, the guest OS
 * type from the host's own list where it answers one, the bhyve boot
 * order, boot next and CPU topology, cloud-init, and under Advanced on a
 * VirtualBox host the whole `vbox` knob surface, the serial and parallel
 * ports and the raw JSON passthrough.
 */
export const SystemStep = ({
  zones,
  setZone,
  settings,
  setSetting,
  cloudInit,
  setCloudInit,
  vboxJson,
  setVboxJson,
  agentDefaults,
  osTypes,
  hardware,
  onHardwareChange,
  serialRows,
  setSerialRows,
  parallelRows,
  setParallelRows,
  bhyveBootDevices = [],
  vbox,
  bhyve,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const defaultLabel = key => agentDefaultLabel(agentDefaults, key);
  const knobValues = agentDefaults?.knob_values || null;
  const bootromLocksUefi = bootromLocksUefiFor(bhyve, String(zones.bootrom ?? '').trim());
  const bootromChoices = bootromChoicesFor(knobValues, settings.firmware_type);
  const firmwareChoices = firmwareChoicesFor(knobValues, bootromLocksUefi);

  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.system')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.emptyFieldsHint')}
      </p>
      <div className="row g-3 mb-3">
        {bhyve
          ? SYSTEM_FIELDS.map(field => (
              <ZoneSystemField
                key={field.key}
                field={field}
                zones={zones}
                setZone={setZone}
                knobValues={knobValues}
                defaultLabel={defaultLabel}
                loading={loading}
              />
            ))
          : null}
        <div className="col-6 col-md-4">
          <div className="mt-4">
            <Switch
              id="machine-zones-guest_agent"
              labelKey="machineEdit.generalSettingsTab.qemuGuestAgent"
              checked={zones.guest_agent === true}
              disabled={loading}
              onChange={checked => setZone('guest_agent', checked ? true : '')}
            />
          </div>
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.guestAgentChannelHint')}
          </span>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-system-firmware">
            {t('machineEdit.createWizardSteps.firmware')}
          </label>
          <VocabularySelect
            id="machine-system-firmware"
            value={settings.firmware_type ?? ''}
            entries={firmwareChoices}
            blankLabel={defaultLabel('firmware_type')}
            onChange={next => setSetting('firmware_type', next)}
            disabled={loading}
          />
          {bootromLocksUefi ? (
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.lockedToUefiHint')}
            </span>
          ) : null}
        </div>
        {advanced && bhyve ? (
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="machine-zones-bootrom">
              {t('machineEdit.createWizardSteps.bootRomOverride')}
            </label>
            <VocabularySelect
              id="machine-zones-bootrom"
              value={zones.bootrom ?? ''}
              entries={bootromChoices}
              blankLabel={defaultLabel('bootrom')}
              onChange={next => {
                setZone('bootrom', next);
                if (next && !next.toUpperCase().endsWith('_CSM')) {
                  setSetting('firmware_type', 'UEFI');
                }
              }}
              disabled={loading}
            />
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.explicitRomWinsHint')}
            </span>
          </div>
        ) : null}
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-setting-os_type">
            {t('machineEdit.createWizardSteps.guestOsType')}
          </label>
          {osTypes ? (
            <OsTypeSelect
              id="machine-setting-os_type"
              osTypes={osTypes}
              value={settings.os_type ?? ''}
              onChange={event => setSetting('os_type', event.target.value)}
              blankLabel={defaultLabel('os_type')}
              disabled={loading}
            />
          ) : (
            <input
              id="machine-setting-os_type"
              className="form-control"
              type="text"
              placeholder={defaultLabel('os_type')}
              value={settings.os_type ?? ''}
              onChange={event => setSetting('os_type', event.target.value)}
              disabled={loading}
            />
          )}
        </div>
        {bhyve ? (
          <ZoneBootFields
            zones={zones}
            setZone={setZone}
            settings={settings}
            agentDefaults={agentDefaults}
            bhyveBootDevices={bhyveBootDevices}
            loading={loading}
          />
        ) : null}
      </div>
      <CloudInitSection cloudInit={cloudInit} setCloudInit={setCloudInit} loading={loading} />
      {advanced && vbox ? (
        <VboxHardwareSection
          hardware={hardware}
          onHardwareChange={onHardwareChange}
          knobValues={knobValues}
          serialRows={serialRows}
          setSerialRows={setSerialRows}
          parallelRows={parallelRows}
          setParallelRows={setParallelRows}
          vboxJson={vboxJson}
          setVboxJson={setVboxJson}
          loading={loading}
        />
      ) : null}
    </>
  );
};

SystemStep.propTypes = {
  zones: PropTypes.object.isRequired,
  setZone: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  cloudInit: PropTypes.object.isRequired,
  setCloudInit: PropTypes.func.isRequired,
  vboxJson: PropTypes.string.isRequired,
  setVboxJson: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  osTypes: PropTypes.array,
  hardware: PropTypes.object.isRequired,
  onHardwareChange: PropTypes.func.isRequired,
  serialRows: PropTypes.array.isRequired,
  setSerialRows: PropTypes.func.isRequired,
  parallelRows: PropTypes.array.isRequired,
  setParallelRows: PropTypes.func.isRequired,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string),
  vbox: PropTypes.bool,
  bhyve: PropTypes.bool,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * The Network step, the one networks editor over the wizard's rows.
 */
export const NetworkStep = ({
  networks,
  onNetworksChange,
  bridgeChoices,
  ipSuggestions,
  nicEnums,
  loading,
}) => (
  <NetworksEditor
    networks={networks}
    onNetworksChange={onNetworksChange}
    bridgeChoices={bridgeChoices}
    ipSuggestions={ipSuggestions}
    nicEnums={nicEnums}
    loading={loading}
  />
);

NetworkStep.propTypes = {
  networks: PropTypes.array.isRequired,
  onNetworksChange: PropTypes.func.isRequired,
  bridgeChoices: PropTypes.array.isRequired,
  ipSuggestions: PropTypes.object,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

const removeTransportBlankKey = value => {
  if (value === null) {
    return 'machineEdit.common.na';
  }
  return value
    ? 'machineEdit.networkAdaptersEditor.remove'
    : 'machineEdit.networkAdaptersEditor.keep';
};

const BooleanOverride = ({ id, labelKey, value, blankLabel, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-md-4">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{blankLabel}</option>
        <option value="true">{t('machineEdit.createWizardSteps.trueValue')}</option>
        <option value="false">{t('machineEdit.createWizardSteps.falseValue')}</option>
      </select>
    </div>
  );
};

BooleanOverride.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string,
  blankLabel: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const PackageOverrides = ({ settings, setSetting, defaultLabel, loading }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold mt-3">{t('machineEdit.createWizardSteps.packageSettingOverrides')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.packageOverridesHint')}
      </p>
      <div className="row g-3">
        <SettingInput
          id="machine-setting-provider_type"
          label={t('machineEdit.createWizardSteps.providerType')}
          placeholder={defaultLabel('provider_type')}
          value={settings.provider_type}
          onChange={event => setSetting('provider_type', event.target.value)}
          disabled={loading}
        />
        <SettingInput
          id="machine-setting-setup_wait"
          label={t('machineEdit.createWizardSteps.setupWaitSeconds')}
          type="number"
          placeholder={defaultLabel('setup_wait')}
          value={settings.setup_wait}
          onChange={event => setSetting('setup_wait', event.target.value)}
          disabled={loading}
        />
        {BOOLEAN_OVERRIDES.map(field => (
          <BooleanOverride
            key={field.key}
            id={`machine-setting-${field.key}`}
            labelKey={field.labelKey}
            value={settings[field.key]}
            blankLabel={defaultLabel(field.key)}
            onChange={next => setSetting(field.key, next)}
            disabled={loading}
          />
        ))}
        <SettingInput
          id="machine-setting-consoleport"
          label={t('machineEdit.createWizardSteps.consolePort')}
          type="number"
          min={1025}
          max={65535}
          placeholder={defaultLabel('consoleport')}
          value={settings.consoleport}
          onChange={event => setSetting('consoleport', event.target.value)}
          disabled={loading}
        />
        <SettingInput
          id="machine-setting-vagrant_user"
          label={t('machineEdit.createWizardSteps.guestSshUser')}
          placeholder={defaultLabel('vagrant_user')}
          value={settings.vagrant_user}
          onChange={event => setSetting('vagrant_user', event.target.value)}
          disabled={loading}
        />
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-vagrant_user_pass">
            {t('machineEdit.createWizardSteps.guestSshPassword')}
          </label>
          <input
            id="machine-setting-vagrant_user_pass"
            className="form-control"
            type="password"
            autoComplete="new-password"
            placeholder={defaultLabel('vagrant_user_pass')}
            value={settings.vagrant_user_pass ?? ''}
            onChange={event => setSetting('vagrant_user_pass', event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-4">
          <BooleanOverride
            id="machine-setting-vagrant_ssh_insert_key"
            labelKey="machineEdit.createWizardSteps.rotateSshKey"
            value={settings.vagrant_ssh_insert_key}
            blankLabel={defaultLabel('vagrant_ssh_insert_key')}
            onChange={next => setSetting('vagrant_ssh_insert_key', next)}
            disabled={loading}
          />
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.rotateSshKeyHint')}
          </span>
        </div>
      </div>
    </>
  );
};

PackageOverrides.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  defaultLabel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const ProvisionerPickers = ({
  provisioners,
  familyName,
  onFamilyChange,
  family,
  versionKey,
  onVersionChange,
  syncMethod,
  setSyncMethod,
  syncMethodOptions,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-3">
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-create-provisioner">
          {t('machineEdit.createWizardSteps.provisioner')}
        </label>
        <select
          id="machine-create-provisioner"
          className="form-select"
          value={familyName}
          onChange={event => onFamilyChange(event.target.value)}
          disabled={loading}
        >
          <option value="">{t('machineEdit.createWizardSteps.noProvisioning')}</option>
          {provisioners.map(collection => (
            <option key={collection.name} value={collection.name}>
              {collection.metadata?.label || collection.name}
              {collection.valid ? '' : t('machineEdit.createWizardSteps.invalidSuffix')}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-create-version">
          {t('machineEdit.createWizardSteps.version')}
        </label>
        <select
          id="machine-create-version"
          className="form-select"
          value={versionKey}
          onChange={event => onVersionChange(event.target.value)}
          disabled={loading || !family}
        >
          <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
          {(family?.versions || []).map(entry => (
            <option key={entry.dir || entry.version} value={entry.version}>
              {entry.version}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-setting-sync-method">
          {t('machineEdit.createWizardSteps.syncMethod')}
        </label>
        <select
          id="machine-setting-sync-method"
          className="form-select"
          value={syncMethod}
          onChange={event => setSyncMethod(event.target.value)}
          disabled={loading}
        >
          {(syncMethodOptions || ['rsync', 'scp']).map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

ProvisionerPickers.propTypes = {
  provisioners: PropTypes.array.isRequired,
  familyName: PropTypes.string.isRequired,
  onFamilyChange: PropTypes.func.isRequired,
  family: PropTypes.object,
  versionKey: PropTypes.string.isRequired,
  onVersionChange: PropTypes.func.isRequired,
  syncMethod: PropTypes.string.isRequired,
  setSyncMethod: PropTypes.func.isRequired,
  syncMethodOptions: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
};

const VersionFields = ({
  fieldConfig,
  versionPending,
  answers,
  fieldErrors,
  onAnswerChange,
  roles,
  inventory,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  if (fieldConfig) {
    return (
      <div className="mb-3">
        <DslConfigForm
          config={fieldConfig}
          answers={answers}
          errors={fieldErrors}
          onChange={onAnswerChange}
          roles={roles}
          inventory={inventory}
          showAdvanced={advanced}
          idPrefix="prov-field"
          disabled={loading}
        />
      </div>
    );
  }
  if (versionPending) {
    return (
      <p className="form-text text-muted" data-note="version-pending">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        {t('machineEdit.createWizardSteps.loadingVersionConfig')}
      </p>
    );
  }
  return (
    <p className="form-text text-muted" data-note="predates-dsl">
      {t('machineEdit.createWizardSteps.manifestPredatesDslPrefix')}{' '}
      <code>metadata.configuration.groups/fields</code>
      {t('machineEdit.createWizardSteps.manifestPredatesDslMiddle')} <code>vars</code>
      {t('machineEdit.createWizardSteps.manifestPredatesDslTail')}
    </p>
  );
};

VersionFields.propTypes = {
  fieldConfig: PropTypes.object,
  versionPending: PropTypes.bool,
  answers: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object,
  onAnswerChange: PropTypes.func.isRequired,
  roles: PropTypes.array.isRequired,
  inventory: PropTypes.object,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/**
 * The Provisioning step: the provisioner family, none by default, its
 * version and the sync method; while a family is picked, whether the
 * provisioning transport is removed when the pipeline ends; the
 * version's field DSL, its roles, the Safe ID path where the manifest
 * declares id files, and under Advanced the package setting overrides.
 */
export const ProvisioningStep = ({
  provisioners,
  familyName,
  onFamilyChange,
  family,
  versionKey,
  onVersionChange,
  version,
  versionPending,
  showSafeId,
  settings,
  setSetting,
  agentDefaults = null,
  fieldConfig,
  answers,
  fieldErrors,
  onAnswerChange,
  inventory,
  roles,
  onRolesChange,
  artifacts,
  syncMethod,
  setSyncMethod,
  syncMethodOptions = null,
  removeTransport,
  setRemoveTransport,
  removeTransportDefault = null,
  safeIdPath,
  setSafeIdPath,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const defaultLabel = key => agentDefaultLabel(agentDefaults, key);
  return (
    <>
      <ProvisionerPickers
        provisioners={provisioners}
        familyName={familyName}
        onFamilyChange={onFamilyChange}
        family={family}
        versionKey={versionKey}
        onVersionChange={onVersionChange}
        syncMethod={syncMethod}
        setSyncMethod={setSyncMethod}
        syncMethodOptions={syncMethodOptions}
        loading={loading}
      />
      {version?.description ? <p className="form-text text-muted">{version.description}</p> : null}
      {familyName ? (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="machine-create-remove-transport">
              {t('machineEdit.createWizardSteps.removeProvisioningNetwork')}
            </label>
            <select
              id="machine-create-remove-transport"
              className="form-select"
              value={removeTransport}
              onChange={event => setRemoveTransport(event.target.value)}
              disabled={loading}
            >
              <option value="">{t(removeTransportBlankKey(removeTransportDefault))}</option>
              <option value="true">
                {t('machineEdit.createWizardSteps.removeTransportOption')}
              </option>
              <option value="false">
                {t('machineEdit.createWizardSteps.keepTransportOption')}
              </option>
            </select>
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.removalPipelineHint')}
            </span>
          </div>
        </div>
      ) : null}
      {version ? (
        <VersionFields
          fieldConfig={fieldConfig}
          versionPending={versionPending}
          answers={answers}
          fieldErrors={fieldErrors}
          onAnswerChange={onAnswerChange}
          roles={roles}
          inventory={inventory}
          advanced={advanced}
          loading={loading}
        />
      ) : null}
      {roles.length > 0 || (version && !versionPending) ? (
        <>
          <h6 className="fw-bold">{t('machineEdit.createWizardSteps.roles')}</h6>
          <div className="mb-3">
            <RolesEditor
              roles={roles}
              onRolesChange={onRolesChange}
              loading={loading}
              artifacts={artifacts}
            />
          </div>
        </>
      ) : null}
      {showSafeId ? (
        <div className="row g-3">
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="machine-setting-safe-id">
              {t('machineEdit.createWizardSteps.safeIdPath')}
            </label>
            <input
              id="machine-setting-safe-id"
              className="form-control"
              type="text"
              value={safeIdPath}
              onChange={event => setSafeIdPath(event.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      ) : null}
      {version && advanced ? (
        <PackageOverrides
          settings={settings}
          setSetting={setSetting}
          defaultLabel={defaultLabel}
          loading={loading}
        />
      ) : null}
    </>
  );
};

ProvisioningStep.propTypes = {
  provisioners: PropTypes.array.isRequired,
  familyName: PropTypes.string.isRequired,
  onFamilyChange: PropTypes.func.isRequired,
  family: PropTypes.object,
  versionKey: PropTypes.string.isRequired,
  onVersionChange: PropTypes.func.isRequired,
  version: PropTypes.object,
  versionPending: PropTypes.bool,
  showSafeId: PropTypes.bool,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  fieldConfig: PropTypes.object,
  answers: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object,
  onAnswerChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  roles: PropTypes.array.isRequired,
  onRolesChange: PropTypes.func.isRequired,
  artifacts: PropTypes.array,
  syncMethod: PropTypes.string.isRequired,
  setSyncMethod: PropTypes.func.isRequired,
  syncMethodOptions: PropTypes.arrayOf(PropTypes.string),
  removeTransport: PropTypes.string.isRequired,
  setRemoveTransport: PropTypes.func.isRequired,
  removeTransportDefault: PropTypes.bool,
  safeIdPath: PropTypes.string.isRequired,
  setSafeIdPath: PropTypes.func.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

const networkSummary = (network, t) =>
  [
    network.type || t('machineEdit.createWizardSteps.netFallback'),
    network.bridge && t('machineEdit.createWizardSteps.onBridge', { bridge: network.bridge }),
    network.dhcp4
      ? t('machineEdit.createWizardSteps.dhcp')
      : network.address || t('machineEdit.createWizardSteps.unaddressed'),
    network.mac &&
      network.mac !== 'auto' &&
      t('machineEdit.createWizardSteps.macValue', { mac: network.mac }),
  ]
    .filter(Boolean)
    .join(' · ');

const bootSummary = (spec, t) => {
  if (spec.settings?.box) {
    const arrow = spec.disks?.boot?.size
      ? t('machineEdit.createWizardSteps.arrowSize', { size: spec.disks.boot.size })
      : '';
    return `${t('machineEdit.createWizardSteps.bootTemplate', { box: spec.settings.box })}${arrow}`;
  }
  if (spec.disks?.boot?.path) {
    return t('machineEdit.createWizardSteps.bootExisting', { path: spec.disks.boot.path });
  }
  if (spec.disks?.boot?.size) {
    return t('machineEdit.createWizardSteps.bootBlank', { size: spec.disks.boot.size });
  }
  return t('machineEdit.createWizardSteps.bootDiskless');
};

const optionalRows = (spec, t) =>
  [
    [
      'additional',
      'machineEdit.createWizardSteps.confirmAdditionalDisks',
      spec.disks?.additional_disks?.length
        ? spec.disks.additional_disks.map(disk => disk.size || disk.path).join(', ')
        : '',
    ],
    [
      'cdroms',
      'machineEdit.createWizardSteps.confirmCdDvd',
      spec.disks?.cdroms?.length ? spec.disks.cdroms.map(cd => cd.iso || cd.path).join(', ') : '',
    ],
    [
      'zones',
      'machineEdit.createWizardSteps.confirmSystem',
      spec.zones
        ? Object.entries(spec.zones)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' · ')
        : '',
    ],
    [
      'tags',
      'machineEdit.createWizardSteps.confirmTags',
      spec.tags?.length ? spec.tags.join(', ') : '',
    ],
    [
      'notes',
      'machineEdit.createWizardSteps.confirmNotes',
      spec.notes ? t('machineEdit.createWizardSteps.setValue') : '',
    ],
    [
      'vbox',
      'machineEdit.createWizardSteps.confirmVbox',
      spec.vbox ? Object.keys(spec.vbox).join(', ') : '',
    ],
    [
      'cloud_init',
      'machineEdit.createWizardSteps.confirmCloudInit',
      spec.cloud_init ? t('machineEdit.createWizardSteps.enabledValue') : '',
    ],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

/**
 * The rows of the Confirm step, label and value pairs of the spec: the
 * name, the provisioner, the boot, then the disks, the media, the zone
 * fields, the tags, the notes, the `vbox` keys and cloud-init where the
 * spec carries them, every setting, every network, the roles enabled,
 * the sync method and whether the machine starts.
 *
 * @param {Object} spec - The spec of `buildSpec`
 * @param {Function} t - The translator
 * @returns {Array<{ key: string, label: string, value: string }>} The rows
 */
export const confirmRowsOf = (spec, t) => [
  {
    key: 'name',
    label: t('machineEdit.createWizardSteps.confirmName'),
    value: spec.name || t('machineEdit.createWizardSteps.derivedName'),
  },
  {
    key: 'provisioner',
    label: t('machineEdit.createWizardSteps.confirmProvisioner'),
    value: spec.provisioner?.name
      ? `${spec.provisioner.name}/${spec.provisioner.version}`
      : t('machineEdit.createWizardSteps.noneNoProvisioning'),
  },
  {
    key: 'boot',
    label: t('machineEdit.createWizardSteps.confirmBoot'),
    value: bootSummary(spec, t),
  },
  ...optionalRows(spec, t),
  ...Object.entries(spec.settings || {}).map(([key, value]) => ({
    key: `setting:${key}`,
    label: key,
    value: String(value),
  })),
  ...(spec.networks || []).map((network, index) => ({
    key: `network:${index + 1}`,
    label: t('machineEdit.createWizardSteps.confirmNetwork', { index: index + 1 }),
    value: networkSummary(network, t),
  })),
  {
    key: 'roles',
    label: t('machineEdit.createWizardSteps.confirmRolesEnabled'),
    value:
      (spec.roles || [])
        .filter(role => role?.enabled && role.name)
        .map(role => role.name)
        .join(', ') || t('machineEdit.createWizardSteps.noneValue'),
  },
  {
    key: 'sync_method',
    label: t('machineEdit.createWizardSteps.confirmSyncMethod'),
    value: spec.sync_method || 'rsync',
  },
  {
    key: 'start_after_create',
    label: t('machineEdit.createWizardSteps.confirmStartAfterCreate'),
    value: t(
      spec.start_after_create
        ? 'machineEdit.createWizardSteps.yesValue'
        : 'machineEdit.createWizardSteps.noValue'
    ),
  },
];

/**
 * The Confirm step: exactly what Create sends, one record row a member
 * in the one record shape, and the whole body as JSON under a fold.
 */
export const ConfirmStep = ({ spec }) => {
  const { t } = useTranslation();
  const rows = confirmRowsOf(spec, t).map(row => ({
    ...row,
    value: <code className="small">{row.value}</code>,
  }));
  return (
    <>
      <p className="form-text text-muted">
        {t('machineEdit.createWizardSteps.exactlyWhatWillBeSent')}
      </p>
      <div data-list="confirm-rows">
        <RecordRows rows={rows} className="mb-0" />
      </div>
      <details>
        <summary className="small">{t('machineEdit.createWizardSteps.fullRequestBody')}</summary>
        <pre className="small mt-2" data-field="request-body">
          {JSON.stringify(spec, null, 2)}
        </pre>
      </details>
    </>
  );
};

ConfirmStep.propTypes = {
  spec: PropTypes.object.isRequired,
};
