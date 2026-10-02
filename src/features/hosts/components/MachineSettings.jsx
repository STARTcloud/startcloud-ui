import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaHourglassHalf } from 'react-icons/fa6';

import RevealInput from '../../../components/common/RevealInput';
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
  CRED_FIELDS,
  editableFields,
  filesystemsOf,
  knobValuesOf,
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
import { PathInput } from './PathPicker';
import ResourceControlsEditor from './ResourceControlsEditor';
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
        <summary className="small">{t('machineEdit.machineSettings.showPendingValues')}</summary>
        <pre className="small mb-0">{JSON.stringify(pendingChanges, null, 2)}</pre>
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

const CredentialField = ({ field, value, onChange, host, disabled }) => {
  const { t } = useTranslation();
  const inputId = `machine-cred-${field.key}`;
  const placeholder = t('machineEdit.machineSettings.unchangedPlaceholder');
  let control;
  if (field.isPath) {
    control = (
      <PathInput
        id={inputId}
        value={value}
        onChange={onChange}
        status={host.status}
        hostId={host.hostId}
        server={host.server}
        mode="file"
        pickTitle={t('machineEdit.machineSettings.pickPrivateKeyFile')}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  } else if (field.isSecret) {
    control = (
      <RevealInput
        id={inputId}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  } else {
    control = (
      <input
        id={inputId}
        className="form-control"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }
  return (
    <div className="col-12 col-md-4" data-field={field.key}>
      <label className="form-label" htmlFor={inputId}>
        {t(`machineEdit.machineSettings.credField.${field.key}`)}
      </label>
      {control}
    </div>
  );
};

CredentialField.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  host: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
};

const CredentialsTab = ({ page }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3" data-tab-body="credentials">
      <p className="form-text text-muted mt-0 mb-0">
        {t('machineEdit.machineSettings.credentialsHint')}
      </p>
      {CRED_FIELDS.map(field => (
        <CredentialField
          key={field.key}
          field={field}
          value={page.form.creds[field.key] ?? ''}
          onChange={value => page.tools.setCred(field.key, value)}
          host={page.host}
          disabled={page.formDisabled}
        />
      ))}
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
 * tabs over every editor, each seeded from `knob_current` over the
 * configuration, and Apply sending the changed members alone as one
 * `PUT machines/{name}`, the modify wire of both agents, through
 * `useSettingsApply`. The form seeds itself again from the detail the
 * held copies answer after a write, and Reset seeds it again by hand.
 */
const MachineSettings = ({
  status,
  id: hostId,
  server = null,
  name,
  hypervisor = '',
  configuration = null,
  knobCurrent = null,
  pendingChanges = null,
  rawDetails = null,
  running,
  onDone,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [tab, setTab] = useState('general');
  const [seeded, setSeeded] = useState(() => ({
    configuration,
    knobCurrent,
    ...seededForm(configuration, knobCurrent),
  }));
  const [form, setForm] = useState(seeded.form);
  const [resourceChanges, setResourceChanges] = useState(null);
  const [resourceNonce, setResourceNonce] = useState(0);
  const [manageDisk, setManageDisk] = useState(null);
  const tools = useMemo(() => formTools(setForm), []);
  const feeds = useSettingsFeeds({ status, hostId, server });

  const resetForm = () => {
    const next = { configuration, knobCurrent, ...seededForm(configuration, knobCurrent) };
    setSeeded(next);
    setForm(next.form);
    setResourceChanges(null);
    setResourceNonce(nonce => nonce + 1);
  };

  if (seeded.configuration !== configuration || seeded.knobCurrent !== knobCurrent) {
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

  const submit = () => {
    if (apply.phase !== 'form') {
      return;
    }
    const { changes, problemKey } = changesOf({
      form,
      seed: seeded.seed,
      isUtm,
      server,
      knobCurrent,
      configuration,
      resourceChanges,
    });
    if (problemKey) {
      notify('warning', t(problemKey));
      return;
    }
    apply.submit(changes);
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
  const tabs = visibleTabs(isUtm, server).map(entry => ({
    key: entry.id,
    label: t(`machineEdit.machineSettings.tab.${entry.id}`),
  }));

  return (
    <div data-settings={name}>
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
      <div className="d-flex justify-content-end mb-2">
        <MachineOrgAccess status={status} id={hostId} name={name} disabled={formDisabled} />
      </div>
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
      <div className="d-flex gap-2 mt-3 border-top pt-3">
        <button
          type="button"
          className="btn btn-primary"
          data-action="apply-settings"
          onClick={submit}
          disabled={formDisabled}
        >
          <FaCheck className="me-2" aria-hidden="true" />
          {t('machineEdit.machineSettings.apply')}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          data-action="reset-settings"
          onClick={resetForm}
          disabled={formDisabled}
        >
          {t('machineEdit.machineSettings.reset')}
        </button>
      </div>
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
  pendingChanges: PropTypes.object,
  rawDetails: PropTypes.object,
  running: PropTypes.bool.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default MachineSettings;
