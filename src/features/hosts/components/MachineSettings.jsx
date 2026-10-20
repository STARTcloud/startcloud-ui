import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaHourglassHalf, FaPlus, FaTrash } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import TabStrip from '../../../components/common/TabStrip';
import { useNotify } from '../../../contexts/NoticeContext';
import { fetchMachineDefaults, fetchOsTypes } from '../api/machines';
import { fetchVnics } from '../api/network';
import { fetchBridgedInterfaces, fetchIsoArtifacts } from '../api/provisioning';
import { getZfsPools } from '../api/zfsAPI';
import { useSettingsApply } from '../hooks/useSettingsApply';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import { flattenBridgedInterfaces, isoFilenames, zfsPoolOptions } from '../utils/machineHelpers';
import { hardwareOf } from '../utils/machines';
import {
  CREDENTIAL_USES,
  editableFields,
  filesystemsOf,
  knobValuesOf,
  pendingCount,
  pendingRowsOf,
  sectionForTab,
  visibleTabs,
  zoneBootDevicesOf,
} from '../utils/machineSettings';
import { changesOf, formTools, isMarkedAttachment, seededForm } from '../utils/settingsForm';

import FilesystemsEditor from './FilesystemsEditor';
import GeneralSettingsTab from './GeneralSettingsTab';
import {
  CpuTopologyInputs,
  HARDWARE_SECTIONS,
  HardwareSectionForm,
  ParallelPortsEditor,
  SerialPortsEditor,
} from './HardwareEditor';
import MachineOrgAccess from './MachineOrgAccess';
import MachineSettingsStatus from './MachineSettingsStatus';
import NetworkAdaptersEditor from './NetworkAdaptersEditor';
import ResourceControlsEditor from './ResourceControlsEditor';
import SecretPickModal from './SecretPickModal';
import SnapshotPolicyTab from './SnapshotPolicyTab';
import StorageDevicesEditor from './StorageDevicesEditor';
import TaskDialog from './TaskDialog';
import UsbPanel from './UsbPanel';
import ZvolManageModal from './ZvolManageModal';

const settledValue = answer => (answer.status === 'fulfilled' ? answer.value : null);

const listOf = (answer, member) => (Array.isArray(answer?.[member]) ? answer[member] : []);

const AUTOSTART_SECTION = HARDWARE_SECTIONS.find(section => section.id === 'autostart');

const PendingChangesPanel = ({ pendingChanges, running, busy, onApplyNow, onCancel }) => {
  const { t } = useTranslation();
  const keys = Object.keys(pendingChanges || {});
  if (keys.length === 0) {
    return null;
  }
  return (
    <div className="alert alert-warning py-2" role="status" data-note="pending-changes">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>
          <FaHourglassHalf className="me-2" aria-hidden="true" />
          <strong>{keys.length}</strong>{' '}
          {t('machineEdit.machineSettings.pendingChangeGroups', {
            count: keys.length,
            list: keys.join(', '),
          })}
        </span>
        <div className="d-flex gap-2">
          {!running ? (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              data-action="apply-pending"
              onClick={onApplyNow}
              disabled={busy}
              title={t('machineEdit.machineSettings.applyPendingNowTitle')}
            >
              {t('machineEdit.machineSettings.applyNow')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="cancel-pending"
            onClick={onCancel}
            disabled={busy}
            title={t('machineEdit.machineSettings.discardPendingTitle')}
          >
            {t('machineEdit.machineSettings.cancelPending')}
          </button>
        </div>
      </div>
      <details className="mt-1">
        <summary className="small" data-action="show-pending">
          {t('machineEdit.machineSettings.showPendingValues')}
        </summary>
        <div className="small mt-2" data-list="pending-values">
          <RecordRows
            className="mb-0"
            rows={pendingRowsOf(pendingChanges).map(row => ({
              key: row.path,
              label: row.path,
              value: <code>{row.value}</code>,
            }))}
          />
        </div>
      </details>
    </div>
  );
};

PendingChangesPanel.propTypes = {
  pendingChanges: PropTypes.object,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onApplyNow: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const CpuTopologySection = ({ server, seed, cpuMode, cpuTopo, update, disabled }) => {
  const { t } = useTranslation();
  if (!hostHasHypervisor(server, 'bhyve')) {
    return null;
  }
  const currentTopo = seed.cpuTopology;
  const currentLabel = () => {
    if (currentTopo) {
      return t('machineEdit.machineSettings.cpuTopoComplex', {
        sockets: currentTopo.sockets,
        cores: currentTopo.cores,
        threads: currentTopo.threads,
      });
    }
    return seed.values.vcpus
      ? t('machineEdit.machineSettings.cpuTopoSimpleWithVcpus', { vcpus: seed.values.vcpus })
      : t('machineEdit.machineSettings.cpuTopoSimple');
  };
  return (
    <div className="mt-3" data-section="cpu-topology">
      <h6 className="fw-bold">{t('machineEdit.machineSettings.cpuTopology')}</h6>
      <p className="form-text text-muted mt-0 mb-2">
        {t('machineEdit.machineSettings.cpuTopoCurrentPrefix')} {currentLabel()}
        {t('machineEdit.machineSettings.cpuTopoApplyNote')}
      </p>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-cpu-mode">
            {t('machineEdit.machineSettings.mode')}
          </label>
          <select
            id="machine-cpu-mode"
            className="form-select"
            value={cpuMode}
            onChange={event => {
              const mode = event.target.value;
              update('cpuMode', mode);
              if (mode === 'complex' && !cpuTopo.sockets) {
                update(
                  'cpuTopo',
                  currentTopo || { sockets: 1, cores: Number(seed.values.vcpus) || 1, threads: 1 }
                );
              }
            }}
            disabled={disabled}
          >
            <option value="">{t('machineEdit.machineSettings.unchanged')}</option>
            <option value="simple">{t('machineEdit.machineSettings.simpleVcpus')}</option>
            <option value="complex">{t('machineEdit.machineSettings.complexTopo')}</option>
          </select>
        </div>
        {cpuMode === 'complex' ? (
          <CpuTopologyInputs
            idPrefix="machine-cpu-topo"
            topo={cpuTopo}
            onField={(key, next) => update('cpuTopo', prev => ({ ...prev, [key]: next }))}
            disabled={disabled}
          />
        ) : null}
      </div>
    </div>
  );
};

CpuTopologySection.propTypes = {
  server: PropTypes.object,
  seed: PropTypes.object.isRequired,
  cpuMode: PropTypes.string.isRequired,
  cpuTopo: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const pendingText = (pendingChanges, t) => {
  const count = pendingCount({ pending_changes: pendingChanges });
  return count > 0 ? t('machineEdit.machineSettings.pendingCount', { count }) : null;
};

const SettingsPane = ({ org, held, onApply, onReset, actions = null }) => {
  const { t } = useTranslation();
  return (
    <>
      {org}
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="apply-settings"
        onClick={onApply}
        disabled={held}
      >
        <FaCheck className="me-2" aria-hidden="true" />
        {t('machineEdit.machineSettings.apply')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="reset-settings"
        onClick={onReset}
        disabled={held}
      >
        {t('machineEdit.machineSettings.reset')}
      </button>
      {actions}
    </>
  );
};

SettingsPane.propTypes = {
  org: PropTypes.node.isRequired,
  held: PropTypes.bool.isRequired,
  onApply: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  actions: PropTypes.node,
};

const CREDENTIAL_PROFILE = 'machine_login';

/**
 * One credential of the machine, a row of the host's store: its name,
 * its kind as a badge, the username it signs in as while the row
 * carries one, the Use select over plain words, the Default switch of
 * that use and Remove.
 */
const CredentialRow = ({ row, disabled, onPatch, onRemove }) => {
  const { t } = useTranslation();
  const useId = `machine-cred-use-${row.key}`;
  const defaultId = `machine-cred-default-${row.key}`;
  return (
    <div
      className="row g-2 align-items-center"
      data-credential-row={row.key}
      data-credential={row.id}
      data-credential-use={row.use}
    >
      <div className="col-12 col-md-5 d-flex align-items-center gap-2 flex-wrap">
        <span className="d-inline-flex align-items-center gap-2" data-credential-pick={row.key}>
          <code className="small">{row.name || row.id}</code>
        </span>
        <span className="badge text-bg-secondary" data-credential-kind={row.kind}>
          {t(`certs.kind.${row.kind}`)}
        </span>
        {row.username ? (
          <span className="small text-muted" data-credential-username={row.username}>
            {t('machineEdit.machineSettings.credentialUsername', { username: row.username })}
          </span>
        ) : null}
      </div>
      <div className="col-12 col-md-3">
        <label className="visually-hidden" htmlFor={useId}>
          {t('machineEdit.machineSettings.credentialUse')}
        </label>
        <select
          id={useId}
          className="form-select form-select-sm"
          value={row.use}
          disabled={disabled}
          onChange={event => onPatch({ use: event.target.value })}
        >
          {CREDENTIAL_USES.map(use => (
            <option key={use} value={use}>
              {t(`machineEdit.machineSettings.credentialUseOption.${use}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="col-6 col-md-2">
        <div className="form-check form-switch mb-0">
          <input
            id={defaultId}
            className="form-check-input"
            type="checkbox"
            role="switch"
            data-action="credential-default"
            checked={row.default}
            disabled={disabled}
            onChange={event => onPatch({ default: event.target.checked })}
          />
          <label className="form-check-label" htmlFor={defaultId}>
            {t('machineEdit.machineSettings.credentialDefault')}
          </label>
        </div>
      </div>
      <div className="col-6 col-md-2 text-end">
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          data-action="credential-remove"
          title={t('machineEdit.machineSettings.credentialRemove')}
          aria-label={t('machineEdit.machineSettings.credentialRemove')}
          disabled={disabled}
          onClick={onRemove}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

CredentialRow.propTypes = {
  row: PropTypes.shape({
    key: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    use: PropTypes.string.isRequired,
    default: PropTypes.bool.isRequired,
    kind: PropTypes.string,
    name: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Credentials tab: the machine's credentials as rows of the host's
 * store, Add credential opening the secret pick dialog over the store's
 * password, SSH key and key pair rows with the machine login preset, a
 * pick landing one row with the use its kind suggests.
 */
const CredentialsTab = ({ page }) => {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const { form, tools, formDisabled } = page;
  return (
    <div data-tab-body="credentials">
      <p className="form-text text-muted mt-0">
        {t('machineEdit.machineSettings.credentialsHint')}
      </p>
      <div className="d-flex flex-column gap-2 mb-2" data-list="credentials">
        {form.credentials.map(row => (
          <CredentialRow
            key={row.key}
            row={row}
            disabled={formDisabled}
            onPatch={patch => tools.patchCredential(row.key, patch)}
            onRemove={() => tools.removeCredential(row.key)}
          />
        ))}
      </div>
      {form.credentials.length === 0 ? (
        <p className="text-muted small" data-note="no-credentials">
          {t('machineEdit.machineSettings.noCredentials')}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="credential-add"
        disabled={formDisabled}
        onClick={() => setPicking(true)}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('machineEdit.machineSettings.addCredential')}
      </button>
      {picking ? (
        <SecretPickModal
          kind="credential"
          profile={CREDENTIAL_PROFILE}
          host={page.host}
          title={t('machineEdit.machineSettings.pickCredentialTitle')}
          disabled={formDisabled}
          onPick={secret => {
            tools.addCredential(secret);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
};

CredentialsTab.propTypes = {
  page: PropTypes.object.isRequired,
};

const UtmSection = ({ page }) => {
  const { t } = useTranslation();
  const { form, tools, formDisabled } = page;
  return (
    <div className="row g-3" data-tab-body="utm">
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-edit-utm-notes">
          {t('machineEdit.machineSettings.utmNotes')}
        </label>
        <textarea
          id="machine-edit-utm-notes"
          className="form-control"
          rows={3}
          value={form.utmNotes}
          onChange={event => tools.update('utmNotes', event.target.value)}
          disabled={formDisabled}
        />
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-edit-utm-qemu-args">
          {t('machineEdit.machineSettings.utmQemuArgs')}
        </label>
        <textarea
          id="machine-edit-utm-qemu-args"
          className="form-control font-monospace"
          rows={3}
          spellCheck={false}
          value={form.utmQemuArgs}
          onChange={event => tools.update('utmQemuArgs', event.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          {t('machineEdit.machineSettings.utmQemuArgsHint')}
        </span>
      </div>
    </div>
  );
};

UtmSection.propTypes = {
  page: PropTypes.object.isRequired,
};

const AdvancedTab = ({ page }) => {
  const { t } = useTranslation();
  return (
    <div data-tab-body="advanced">
      <label className="form-label" htmlFor="machine-edit-vbox-json">
        {t('machineEdit.machineSettings.hypervisorPassthroughPrefix')} <code>vbox</code>
        {t('machineEdit.machineSettings.hypervisorPassthroughMiddle')}{' '}
        <code>{'{"directives": [{"directive": "--vram", "value": "64"}]}'}</code>
        {t('machineEdit.machineSettings.hypervisorPassthroughTail')}
      </label>
      <textarea
        id="machine-edit-vbox-json"
        className="form-control font-monospace"
        rows={3}
        value={page.form.vboxJson}
        onChange={event => page.tools.update('vboxJson', event.target.value)}
        disabled={page.formDisabled}
      />
    </div>
  );
};

AdvancedTab.propTypes = {
  page: PropTypes.object.isRequired,
};

const HardwareTab = ({ page, section }) => {
  const { t } = useTranslation();
  const { form, tools, knobValues, formDisabled } = page;
  return (
    <div data-tab-body={section.id}>
      <HardwareSectionForm
        section={section}
        values={form.hardware[section.id] || {}}
        onChange={tools.setHardwareValue}
        knobValues={knobValues}
        disabled={formDisabled}
      />
      {section.id === 'platform' ? (
        <>
          <h6 className="fw-bold mt-3">{t('machineEdit.hardwareSections.autostart')}</h6>
          <HardwareSectionForm
            section={AUTOSTART_SECTION}
            values={form.hardware.autostart || {}}
            onChange={tools.setHardwareValue}
            knobValues={knobValues}
            disabled={formDisabled}
          />
        </>
      ) : null}
    </div>
  );
};

HardwareTab.propTypes = {
  page: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
};

const PortsTab = ({ page }) => {
  const { t } = useTranslation();
  const { form, tools, formDisabled } = page;
  return (
    <div data-tab-body="ports">
      <h6 className="fw-bold">{t('machineEdit.machineSettings.serialPorts')}</h6>
      <SerialPortsEditor
        rows={form.serialRows}
        onRowsChange={tools.set('serialRows')}
        disabled={formDisabled}
      />
      <h6 className="fw-bold mt-3">{t('machineEdit.machineSettings.parallelPorts')}</h6>
      <ParallelPortsEditor
        rows={form.parallelRows}
        onRowsChange={tools.set('parallelRows')}
        disabled={formDisabled}
      />
    </div>
  );
};

PortsTab.propTypes = {
  page: PropTypes.object.isRequired,
};

const KnobTabs = ({ page }) => {
  const { tab, form, tools, feeds, seed, host, isUtm, formDisabled } = page;
  const section = sectionForTab(tab);
  const bhyve = !isUtm && hostHasHypervisor(host.server, 'bhyve');
  return (
    <>
      {tab === 'general' ? (
        <>
          <GeneralSettingsTab
            fields={editableFields(isUtm, host.server, page.t)}
            feeds={{
              knobValues: page.knobValues,
              defaultsDoc: feeds.agentDefaults,
              osTypes: feeds.osTypes,
            }}
            form={form}
            update={tools.update}
            seed={seed}
            cloudInitCurrent={page.configuration?.['cloud-init']}
            bhyveBootDevices={zoneBootDevicesOf(page.currentHardware)}
            host={host}
            name={page.name}
            running={page.running}
            isUtm={isUtm}
            formDisabled={formDisabled}
          />
          <CpuTopologySection
            server={host.server}
            seed={seed}
            cpuMode={form.cpuMode}
            cpuTopo={form.cpuTopo}
            update={tools.update}
            disabled={formDisabled}
          />
        </>
      ) : null}
      {tab === 'credentials' ? <CredentialsTab page={page} /> : null}
      {section ? <HardwareTab page={page} section={section} /> : null}
      {tab === 'ports' ? <PortsTab page={page} /> : null}
      {bhyve ? (
        <div className={tab === 'resources' ? '' : 'd-none'} data-tab-body="resources">
          <ResourceControlsEditor
            key={`${page.name}-${page.resourceNonce}`}
            knobCurrent={page.knobCurrent}
            onChanges={page.setResourceChanges}
            disabled={formDisabled}
          />
        </div>
      ) : null}
      {tab === 'utm' ? <UtmSection page={page} /> : null}
      {tab === 'advanced' ? <AdvancedTab page={page} /> : null}
      {tab === 'snapshots' ? (
        <SnapshotPolicyTab
          form={form.snapshotPolicy}
          disabled={formDisabled}
          onChange={patch => tools.update('snapshotPolicy', current => ({ ...current, ...patch }))}
        />
      ) : null}
    </>
  );
};

KnobTabs.propTypes = {
  page: PropTypes.object.isRequired,
};

const zoneNicFeed = (feeds, knobCurrent) => ({
  zoneNicCurrent: Array.isArray(knobCurrent?.nics) ? knobCurrent.nics : [],
  nicPropsByNetif: feeds.agentDefaults?.nic_props_by_netif || null,
  knobDefaults: feeds.agentDefaults?.knob_defaults || {},
});

const DeviceTabs = ({ page }) => {
  const { tab, form, tools, feeds, host, isUtm, formDisabled, currentHardware } = page;
  return (
    <>
      {tab === 'storage' ? (
        <StorageDevicesEditor
          currentHardware={currentHardware}
          addDisks={form.addDisks}
          onAddDisksChange={tools.set('addDisks')}
          addCdroms={form.addCdroms}
          onAddCdromsChange={tools.set('addCdroms')}
          addControllers={form.addControllers}
          onAddControllersChange={tools.set('addControllers')}
          marked={entry => isMarkedAttachment(form, entry)}
          onToggleAttachment={tools.toggleAttachment}
          controllerMarked={controllerName => form.removeControllerNames.includes(controllerName)}
          onToggleController={tools.toggleIn('removeControllerNames')}
          addZoneDisks={form.addZoneDisks}
          onAddZoneDisksChange={tools.set('addZoneDisks')}
          poolChoices={zfsPoolOptions(feeds.pools)}
          zoneName={page.name}
          zoneDiskRemovals={form.removeZoneDisks}
          onToggleZoneDisk={tools.toggleIn('removeZoneDisks')}
          onManageZoneDisk={page.onManageDisk}
          zoneCdromRemovals={form.removeZoneCdroms}
          onToggleZoneCdrom={tools.toggleIn('removeZoneCdroms')}
          isoOptions={feeds.isoOptions}
          controllerTypes={page.knobValues?.['disks.controller_type'] || null}
          status={host.status}
          hostId={host.hostId}
          server={host.server}
          formDisabled={formDisabled}
        />
      ) : null}
      {tab === 'nics' ? (
        <NetworkAdaptersEditor
          nics={currentHardware.nics}
          nicRows={form.nicRows}
          onNicRowsChange={tools.set('nicRows')}
          addNics={form.addNics}
          onAddNicsChange={tools.set('addNics')}
          nicMarked={adapter => form.removeNicAdapters.includes(adapter)}
          onToggleNic={tools.toggleIn('removeNicAdapters')}
          nicEnums={page.knobValues}
          zoneNics={currentHardware.zone?.nics || null}
          machineNetif={form.values.netif || ''}
          status={host.status}
          hostId={host.hostId}
          hostVnics={feeds.hostVnics}
          bridgeOptions={feeds.bridgeOptions}
          zoneNicRemovals={form.removeZoneNics}
          onToggleZoneNic={tools.toggleIn('removeZoneNics')}
          zoneNicEdits={form.zoneNicEdits}
          onZoneNicEdit={tools.editZoneNic}
          onZoneNicPropEdit={tools.editZoneNicProp}
          utmMode={isUtm}
          formDisabled={formDisabled}
          {...zoneNicFeed(feeds, page.knobCurrent)}
        />
      ) : null}
      {tab === 'usb' ? (
        <UsbPanel
          status={host.status}
          hostId={host.hostId}
          name={page.name}
          running={page.running}
          disabled={formDisabled}
        />
      ) : null}
      {tab === 'filesystems' ? (
        <FilesystemsEditor
          currentFilesystems={filesystemsOf(page.configuration)}
          addFilesystems={form.addFilesystems}
          onAddChange={tools.set('addFilesystems')}
          removeFilesystems={form.removeFilesystems}
          onRemoveChange={tools.set('removeFilesystems')}
          disabled={formDisabled}
        />
      ) : null}
    </>
  );
};

DeviceTabs.propTypes = {
  page: PropTypes.object.isRequired,
};

/**
 * The reads the Settings page makes once of the host: the OS types, the
 * cached ISOs, the defaults document with its knob vocabularies, the
 * bridged interfaces, and on a bhyve host the pools and the live VNICs;
 * a read that fails leaves its list empty.
 *
 * @param {Object} options - The status, the host id and the host's row
 * @returns {{ osTypes: Array|null, isoOptions: Array, agentDefaults: Object|null, bridgeOptions: Array, pools: Array, hostVnics: Array }} The feeds
 */
const useSettingsFeeds = ({ status, hostId, server }) => {
  const [feeds, setFeeds] = useState({
    osTypes: null,
    isoOptions: [],
    agentDefaults: null,
    bridgeOptions: [],
    pools: [],
    hostVnics: [],
  });
  const bhyve = hostHasHypervisor(server, 'bhyve');
  const vnics = hostHasFeature(server, 'vnics');
  const zfs = hostHasFeature(server, 'zfs');

  useEffect(() => {
    let live = true;
    Promise.allSettled([
      fetchOsTypes(status, hostId),
      fetchIsoArtifacts(status, hostId),
      fetchMachineDefaults(status, hostId),
      fetchBridgedInterfaces(status, hostId),
      bhyve && zfs ? getZfsPools(status, hostId) : Promise.resolve(null),
      bhyve && vnics ? fetchVnics(status, hostId) : Promise.resolve(null),
    ]).then(([types, isos, defaults, bridged, pools, hostVnics]) => {
      if (!live) {
        return;
      }
      const osTypes = listOf(settledValue(types), 'ostypes');
      setFeeds({
        osTypes: osTypes.length > 0 ? osTypes : null,
        isoOptions: isos.status === 'fulfilled' ? isoFilenames(isos.value) : [],
        agentDefaults: settledValue(defaults),
        bridgeOptions:
          bridged.status === 'fulfilled'
            ? flattenBridgedInterfaces(bridged.value).map(entry => entry.name)
            : [],
        pools: listOf(settledValue(pools), 'pools'),
        hostVnics: listOf(settledValue(hostVnics), 'vnics'),
      });
    });
    return () => {
      live = false;
    };
  }, [status, hostId, bhyve, vnics, zfs]);

  return feeds;
};

/**
 * The Settings page of one machine, hyperweaver-ui's Settings tab: the
 * page's one heading, `title` with the count of the accrued
 * `pending_changes` groups as muted text while any waits, and in its
 * pane Organization access on the `hyperweaver-server` role, Apply,
 * Reset, then `actions`; under it the
 * tabs over every editor, each seeded from `knob_current` over the
 * configuration, the Credentials tab the machine's credentials from
 * `credentials`, each a row of the host's store with its name, kind and
 * username, its use, its Default switch, one default a use, and Remove,
 * Add credential picking a password, SSH key or key pair row through the
 * secret pick dialog, sent whole as `credentials` while the list
 * changed, the Snapshots tab while `snapshots` offers it, the retention
 * policy of `SnapshotPolicyTab` seeded from the configuration's
 * `snapshots` and sent as `snapshots` while it changed, and Apply
 * sending the changed members alone as one
 * `PUT machines/{name}`, the modify wire of both agents, through
 * `useSettingsApply`. The form seeds itself again from the detail the
 * held copies answer after a write, and Reset seeds it again by hand;
 * Apply and Reset are held while no member differs from the seed. The
 * accrued set of `pending_changes` draws its group count, and behind
 * Show pending values one record row a leaf member.
 */
const MachineSettings = ({
  status,
  id: hostId,
  server = null,
  name,
  hypervisor = '',
  configuration = null,
  knobCurrent = null,
  credentials = null,
  pendingChanges = null,
  rawDetails = null,
  snapshots = false,
  running,
  onDone,
  title,
  actions = null,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [tab, setTab] = useState('general');
  const [seeded, setSeeded] = useState(() => ({
    configuration,
    knobCurrent,
    credentials,
    ...seededForm(configuration, knobCurrent, credentials),
  }));
  const [form, setForm] = useState(seeded.form);
  const [resourceChanges, setResourceChanges] = useState(null);
  const [resourceNonce, setResourceNonce] = useState(0);
  const [manageDisk, setManageDisk] = useState(null);
  const tools = useMemo(() => formTools(setForm), []);
  const feeds = useSettingsFeeds({ status, hostId, server });

  const resetForm = () => {
    const next = {
      configuration,
      knobCurrent,
      credentials,
      ...seededForm(configuration, knobCurrent, credentials),
    };
    setSeeded(next);
    setForm(next.form);
    setResourceChanges(null);
    setResourceNonce(nonce => nonce + 1);
  };

  if (
    seeded.configuration !== configuration ||
    seeded.knobCurrent !== knobCurrent ||
    seeded.credentials !== credentials
  ) {
    resetForm();
  }

  const apply = useSettingsApply({
    status,
    hostId,
    server,
    name,
    running,
    onReset: resetForm,
    onDone,
  });
  const isUtm = hypervisor === 'utm';
  const formDisabled = apply.busy || apply.phase !== 'form';
  const host = { status, hostId, server };

  const draft = changesOf({
    form,
    seed: seeded.seed,
    isUtm,
    server,
    knobCurrent,
    configuration,
    resourceChanges,
  });
  const unchanged = !draft.problemKey && Object.keys(draft.changes).length === 0;

  const submit = () => {
    if (apply.phase !== 'form') {
      return;
    }
    if (draft.problemKey) {
      notify('warning', t(draft.problemKey));
      return;
    }
    apply.submit(draft.changes);
  };

  const page = {
    t,
    tab,
    form,
    tools,
    feeds,
    seed: seeded.seed,
    host,
    name,
    running,
    isUtm,
    formDisabled,
    configuration,
    knobCurrent,
    knobValues: knobValuesOf(feeds.agentDefaults),
    currentHardware: hardwareOf({ configuration, knob_current: knobCurrent }),
    resourceNonce,
    setResourceChanges,
    onManageDisk: setManageDisk,
  };
  const tabs = [...visibleTabs(isUtm, server), ...(snapshots ? [{ id: 'snapshots' }] : [])].map(
    entry => ({
      key: entry.id,
      label: t(`machineEdit.machineSettings.tab.${entry.id}`),
    })
  );

  const pane = (
    <SettingsPane
      org={<MachineOrgAccess status={status} id={hostId} name={name} disabled={formDisabled} />}
      held={formDisabled || unchanged}
      onApply={submit}
      onReset={resetForm}
      actions={actions}
    />
  );

  return (
    <div data-settings={name}>
      <SectionHeading title={title} count={pendingText(pendingChanges, t)} actions={pane} />
      <MachineSettingsStatus
        issues={apply.issues}
        phase={apply.phase}
        step={apply.step}
        name={name}
        onRestart={apply.stopThenApply}
        onQueue={apply.queueNow}
        onBack={apply.back}
      />
      <PendingChangesPanel
        pendingChanges={pendingChanges}
        running={running}
        busy={apply.busy}
        onApplyNow={apply.applyPendingNow}
        onCancel={apply.cancelPending}
      />
      <TabStrip tabs={tabs} active={tab} onSelect={setTab} className="mb-3" />
      <p className="form-text text-muted">{t('machineEdit.machineSettings.fieldsHint')}</p>
      <KnobTabs page={page} />
      <DeviceTabs page={page} />
      {manageDisk ? (
        <ZvolManageModal
          status={status}
          hostId={hostId}
          name={name}
          disk={manageDisk}
          running={running}
          pools={feeds.pools}
          onClose={() => setManageDisk(null)}
          onResized={onDone}
        />
      ) : null}
      {rawDetails ? (
        <details className="mt-3" data-raw="details">
          <summary className="fs-6 fw-bold">
            {t('machineEdit.machineSettings.rawDataDebug')}
          </summary>
          <div className="card">
            <div className="card-body">
              <pre className="small">{JSON.stringify(rawDetails, null, 2)}</pre>
            </div>
          </div>
        </details>
      ) : null}
      {apply.task ? (
        <TaskDialog status={status} id={hostId} task={apply.task} onHide={apply.closeTask} />
      ) : null}
    </div>
  );
};

MachineSettings.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  name: PropTypes.string.isRequired,
  hypervisor: PropTypes.string,
  configuration: PropTypes.object,
  knobCurrent: PropTypes.object,
  credentials: PropTypes.arrayOf(PropTypes.object),
  pendingChanges: PropTypes.object,
  rawDetails: PropTypes.object,
  snapshots: PropTypes.bool,
  running: PropTypes.bool.isRequired,
  onDone: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default MachineSettings;
