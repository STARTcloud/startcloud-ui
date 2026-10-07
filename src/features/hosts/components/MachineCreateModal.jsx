import PropTypes from 'prop-types';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { fetchMachineDefaults, fetchMachineOsTypes } from '../api/machineCreate';
import { getKnownOrgs, managerOrgsOf } from '../api/orgAccessAPI';
import {
  createMachine,
  fetchArtifacts,
  fetchBridgedInterfaces,
  fetchIpSuggestions,
  fetchIsoArtifacts,
  fetchMediaList,
  fetchNextServerId,
  fetchProvisioners,
  fetchProvisionerVersion,
  fetchRemoteTemplates,
  fetchTemplates,
} from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { getZfsDatasets, getZfsPools } from '../api/zfsAPI';
import { HostMachinesContext } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useMachineTools } from '../hooks/useMachineTools';
import { useProvisionerInstall } from '../hooks/useProvisionerInstall';
import {
  flattenBoxCatalog,
  pickDefaultSource,
  sourceKeyOf,
  sourceLabelOf,
} from '../utils/boxCatalog';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import { isServerRole } from '../utils/hosts';
import {
  CREATE_STEPS,
  bridgeChoicesOf,
  buildSpec,
  createdOf,
  defaultExternalNetwork,
  emptyCloudInit,
  emptyDiskConfig,
  emptySettings,
  nextServerIdOf,
  seedFamilyOf,
  stepProblemOf,
} from '../utils/machineCreate';
import { flattenBridgedInterfaces, isoFilenames } from '../utils/machineHelpers';
import { nounKeyOf } from '../utils/machines';
import { resourceIssuesOf } from '../utils/machineTools';

import BoxVaultPickerModal from './BoxVaultPickerModal';
import {
  BoxStep,
  ConfirmStep,
  DisksStep,
  GeneralStep,
  NetworkStep,
  ProvisioningStep,
  ResourcesStep,
  SystemStep,
} from './CreateWizardSteps';
import { buildHardwarePayload, buildPortsPayload } from './HardwareEditor';
import { dslConfiguration, pruneHidden, seedAnswers, validateAnswers } from './ProvisionerFieldDsl';
import { seedRoles } from './ProvisionerFormFields';
import ResourceIssues from './ResourceIssues';
import TaskDialog from './TaskDialog';

const NO_ORGS = [];

const listOf = value => (Array.isArray(value) ? value : []);

const settle = promise => promise.then(data => data ?? null).catch(() => null);

const catalogFailure = (source, failure) =>
  `${sourceLabelOf(source)} (${failure.status || ''} ${failure.message || ''})`.trim();

const catalogNoteOf = ({ failures, counts, merged, t }) => {
  const notes = [];
  if (failures.length > 0) {
    notes.push(
      t('machineEdit.machineCreateModal.catalogUnreachable', { failures: failures.join('; ') })
    );
  }
  if (merged.length === 0 && counts.length > 0) {
    notes.push(t('machineEdit.machineCreateModal.noUsableBoxes', { counts: counts.join(', ') }));
  }
  return notes.join('. ');
};

const mergedCatalogs = ({ catalogs, defaultKey, t }) => {
  const merged = [];
  const failures = [];
  const counts = [];
  catalogs.forEach(({ source, catalog, failure }) => {
    if (failure) {
      failures.push(catalogFailure(source, failure));
      return;
    }
    const boxes = flattenBoxCatalog(catalog);
    counts.push(`${sourceLabelOf(source)}: ${boxes.length}`);
    boxes.forEach(entry => {
      merged.push({
        ...entry,
        source: sourceKeyOf(source),
        sourceUrl: source.url || '',
        isDefaultSource: sourceKeyOf(source) === defaultKey,
      });
    });
  });
  return { remoteBoxes: merged, catalogNote: catalogNoteOf({ failures, counts, merged, t }) };
};

const templateAvailablePoolsOf = ({ templates, settings, agentDefaults }) => {
  const row =
    templates.find(
      entry =>
        `${entry.organization}/${entry.box_name}` === settings.box &&
        (!settings.box_version || entry.version === settings.box_version)
    ) ||
    templates.find(entry => `${entry.organization}/${entry.box_name}` === settings.box) ||
    null;
  if (row?.available_pools) {
    return row.available_pools;
  }
  const landingPool = agentDefaults?.config?.template_pool;
  return landingPool ? [landingPool] : null;
};

/**
 * The feeds the wizard's pickers draw on, each one read of the host:
 * the provisioners, the defaults, the OS types, the next server id, the
 * local templates and every enabled registry's catalog, the artifacts
 * and the cached ISOs, all read once as the dialog opens; the pools,
 * datasets and volumes of a host that lists `zfs`, the registered media
 * of a VirtualBox host, the uplinks and the free addresses, each read
 * when its step is entered, so a picker is never older than the visit to
 * its step, the provisioners again through `loadProvisioners` once a
 * handed family is installed, and nothing reads on a clock.
 */
const useCreateFeeds = ({ status, id, server, t }) => {
  const [feeds, setFeeds] = useState({
    provisioners: [],
    provisionersLoaded: false,
    agentDefaults: null,
    osTypes: null,
    nextServerId: '',
    templates: [],
    remoteBoxes: [],
    sourceChoices: [],
    catalogNote: '',
    artifacts: null,
    isoOptions: [],
    zfsPools: [],
    zfsDatasets: [],
    zfsVolumes: [],
    vboxMedia: [],
    bridgeChoices: [],
    ipSuggestions: null,
    failure: '',
  });
  const patch = useCallback(next => setFeeds(current => ({ ...current, ...next })), []);
  const zfs = hostHasFeature(server, 'zfs');
  const vbox = hostHasHypervisor(server, 'virtualbox');
  const templated = hostHasFeature(server, 'templates');
  const cached = hostHasFeature(server, 'artifacts');

  const loadZfs = useCallback(() => {
    if (!zfs) {
      return;
    }
    settle(getZfsPools(status, id)).then(data => patch({ zfsPools: listOf(data?.pools) }));
    settle(getZfsDatasets(status, id, { type: 'filesystem' })).then(data =>
      patch({ zfsDatasets: listOf(data?.datasets) })
    );
    settle(getZfsDatasets(status, id, { type: 'volume' })).then(data =>
      patch({ zfsVolumes: listOf(data?.datasets) })
    );
  }, [zfs, status, id, patch]);

  const loadMedia = useCallback(() => {
    if (!vbox) {
      return;
    }
    settle(fetchMediaList(status, id)).then(data => patch({ vboxMedia: listOf(data?.media) }));
  }, [vbox, status, id, patch]);

  const loadUplinks = useCallback(
    () =>
      settle(fetchBridgedInterfaces(status, id)).then(data => {
        const rows = data ? flattenBridgedInterfaces(data) : [];
        patch({ bridgeChoices: bridgeChoicesOf(rows) });
        return rows;
      }),
    [status, id, patch]
  );

  const loadIpSuggestions = useCallback(() => {
    settle(fetchIpSuggestions(status, id)).then(data => patch({ ipSuggestions: data }));
  }, [status, id, patch]);

  const readCatalogs = useCallback(
    sources => {
      const enabled = sources.filter(source => source.enabled !== false);
      if (enabled.length === 0) {
        patch({ catalogNote: t('machineEdit.machineCreateModal.noTemplateSourcesConfigured') });
        return;
      }
      patch({
        sourceChoices: enabled.map(source => ({
          value: sourceKeyOf(source),
          label: sourceLabelOf(source),
        })),
      });
      Promise.all(
        enabled.map(source =>
          fetchRemoteTemplates(status, id, sourceKeyOf(source)).then(
            catalog => ({ source, catalog, failure: null }),
            failure => ({ source, catalog: null, failure })
          )
        )
      ).then(catalogs =>
        patch(mergedCatalogs({ catalogs, defaultKey: sourceKeyOf(pickDefaultSource(sources)), t }))
      );
    },
    [status, id, patch, t]
  );

  const loadCatalogs = useCallback(
    () =>
      fetchTemplateSources(status, id).then(readCatalogs, failure =>
        patch({
          catalogNote: t('machineEdit.machineCreateModal.templateSourcesUnavailable', {
            message: failure.message,
          }),
        })
      ),
    [status, id, patch, t, readCatalogs]
  );

  const loadProvisioners = useCallback(
    () =>
      fetchProvisioners(status, id).then(
        data => {
          const provisioners = listOf(data?.provisioners);
          patch({ provisioners, provisionersLoaded: true });
          return provisioners;
        },
        failure => {
          patch({
            failure: t('machineEdit.machineCreateModal.failedToLoadProvisioners', {
              message: failure.message,
            }),
          });
          return [];
        }
      ),
    [status, id, patch, t]
  );

  useEffect(() => {
    loadProvisioners();
    settle(fetchMachineDefaults(status, id)).then(data => patch({ agentDefaults: data }));
    settle(fetchMachineOsTypes(status, id)).then(data => {
      const list = listOf(data?.ostypes);
      patch({ osTypes: list.length > 0 ? list : null });
    });
    settle(fetchNextServerId(status, id)).then(data =>
      patch({ nextServerId: nextServerIdOf(data) })
    );
    if (templated) {
      settle(fetchTemplates(status, id)).then(data =>
        patch({ templates: listOf(data?.templates) })
      );
      loadCatalogs();
    }
    if (cached) {
      settle(fetchArtifacts(status, id)).then(data =>
        patch({ artifacts: data ? listOf(data.artifacts) : null })
      );
      settle(fetchIsoArtifacts(status, id)).then(data =>
        patch({ isoOptions: data ? isoFilenames(data) : [] })
      );
    }
    loadZfs();
    loadMedia();
  }, [status, id, templated, cached, patch, loadProvisioners, loadCatalogs, loadZfs, loadMedia]);

  return { ...feeds, loadProvisioners, loadZfs, loadMedia, loadUplinks, loadIpSuggestions };
};

/**
 * The wizard's own state, one member a field, opened empty on the
 * external network every provisioned machine begins with.
 */
const useCreateForm = () => {
  const [form, setForm] = useState(() => ({
    name: '',
    machineHypervisor: '',
    familyName: '',
    versionKey: '',
    settings: emptySettings(),
    bootSource: 'template',
    diskConfig: emptyDiskConfig(),
    bootOrder: [],
    zones: {},
    cloudInit: emptyCloudInit(),
    hardware: {},
    serialRows: [],
    parallelRows: [],
    vboxJson: '',
    tagsInput: '',
    notes: '',
    orgUuid: '',
    networks: [defaultExternalNetwork()],
    roles: [],
    properties: {},
    syncMethod: 'rsync',
    removeTransport: '',
    safeIdPath: '',
    startAfterCreate: false,
    sourceFilter: '',
    boxPickCustom: false,
  }));
  const set = useCallback(next => setForm(current => ({ ...current, ...next })), []);
  const update = useCallback(
    change => setForm(current => ({ ...current, ...change(current) })),
    []
  );
  const setter = key => value => set({ [key]: value });
  const setSetting = useCallback(
    (key, value) =>
      setForm(current => ({ ...current, settings: { ...current.settings, [key]: value } })),
    []
  );
  const setZone = useCallback(
    (key, value) => setForm(current => ({ ...current, zones: { ...current.zones, [key]: value } })),
    []
  );
  const setDisks = useCallback(
    next => setForm(current => ({ ...current, diskConfig: { ...current.diskConfig, ...next } })),
    []
  );
  return { form, set, update, setter, setSetting, setZone, setDisks };
};

const StepPills = ({ stepIndex, maxVisited, busy, onPick }) => {
  const { t } = useTranslation();
  return (
    <ul className="nav nav-pills mb-3 flex-wrap gap-1" data-list="create-steps">
      {CREATE_STEPS.map((step, index) => (
        <li key={step} className="nav-item">
          <button
            type="button"
            className={`nav-link py-1 px-2 ${index === stepIndex ? 'active' : ''}`}
            data-step={step}
            onClick={() => onPick(index)}
            disabled={busy || index > maxVisited}
          >
            {t(`machineEdit.machineCreateModal.step.${step}`)}
          </button>
        </li>
      ))}
    </ul>
  );
};

StepPills.propTypes = {
  stepIndex: PropTypes.number.isRequired,
  maxVisited: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

const HypervisorChoice = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-3">
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-create-hypervisor">
          {t('machineEdit.machineCreateModal.hypervisorLabel')}
        </label>
        <select
          id="machine-create-hypervisor"
          className="form-select"
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">{t('machineEdit.machineCreateModal.hypervisorAgentDefault')}</option>
          <option value="virtualbox">virtualbox</option>
          <option value="utm">utm</option>
        </select>
        <span className="form-text text-muted small">
          {t('machineEdit.machineCreateModal.hypervisorHint')}
        </span>
      </div>
    </div>
  );
};

HypervisorChoice.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const useProvisionerPick = ({ status, id, form, set, provisioners }) => {
  const fetchSeq = useRef(0);
  const [versionDetail, setVersionDetail] = useState(null);
  const [versionPending, setVersionPending] = useState(false);
  const family = useMemo(
    () => provisioners.find(collection => collection.name === form.familyName) || null,
    [provisioners, form.familyName]
  );
  const version = useMemo(
    () =>
      family?.versions?.find(
        entry => entry.version === form.versionKey || entry.dir === form.versionKey
      ) || null,
    [family, form.versionKey]
  );

  const changeFamily = value => {
    fetchSeq.current += 1;
    setVersionDetail(null);
    setVersionPending(false);
    set({ familyName: value, versionKey: '', roles: [], properties: {} });
  };

  const changeVersion = value => {
    const next =
      family?.versions?.find(entry => entry.version === value || entry.dir === value) || null;
    set({
      versionKey: value,
      roles: seedRoles(next),
      properties: seedAnswers(dslConfiguration(next)),
    });
    fetchSeq.current += 1;
    const seq = fetchSeq.current;
    setVersionDetail(null);
    if (!next || !form.familyName) {
      setVersionPending(false);
      return;
    }
    setVersionPending(true);
    settle(fetchProvisionerVersion(status, id, form.familyName, next.version || value)).then(
      data => {
        if (seq !== fetchSeq.current) {
          return;
        }
        setVersionPending(false);
        const manifest = data?.metadata || null;
        if (!manifest) {
          return;
        }
        setVersionDetail(manifest);
        set({ roles: seedRoles(manifest), properties: seedAnswers(dslConfiguration(manifest)) });
      }
    );
  };

  return {
    family,
    version,
    versionInfo: versionDetail || version,
    versionPending,
    changeFamily,
    changeVersion,
  };
};

const ProvisioningBody = ({ wizard }) => {
  const {
    form,
    feeds,
    set,
    setter,
    setSetting,
    showAdvanced,
    busy,
    picked,
    fieldConfig,
    fieldErrors,
    needsSafeId,
    fieldInventory,
    install,
  } = wizard;
  return (
    <ProvisioningStep
      install={install}
      provisioners={feeds.provisioners}
      familyName={form.familyName}
      onFamilyChange={picked.changeFamily}
      family={picked.family}
      versionKey={form.versionKey}
      onVersionChange={picked.changeVersion}
      version={picked.versionInfo}
      versionPending={picked.versionPending}
      showSafeId={needsSafeId}
      settings={form.settings}
      setSetting={setSetting}
      agentDefaults={feeds.agentDefaults}
      fieldConfig={fieldConfig}
      answers={form.properties}
      fieldErrors={fieldErrors}
      onAnswerChange={(key, value) => set({ properties: { ...form.properties, [key]: value } })}
      inventory={fieldInventory}
      roles={form.roles}
      onRolesChange={setter('roles')}
      artifacts={feeds.artifacts}
      syncMethod={form.syncMethod}
      setSyncMethod={setter('syncMethod')}
      syncMethodOptions={feeds.agentDefaults?.knob_values?.['settings.sync_method'] || null}
      removeTransport={form.removeTransport}
      setRemoveTransport={setter('removeTransport')}
      removeTransportDefault={
        feeds.agentDefaults?.knob_defaults?.['transport.remove_on_completion'] ?? null
      }
      safeIdPath={form.safeIdPath}
      setSafeIdPath={setter('safeIdPath')}
      advanced={showAdvanced}
      loading={busy}
    />
  );
};

ProvisioningBody.propTypes = {
  wizard: PropTypes.object.isRequired,
};

const StepBody = ({ wizard }) => {
  const {
    stepId,
    form,
    feeds,
    set,
    setter,
    setSetting,
    setZone,
    setDisks,
    host,
    bhyve,
    vbox,
    utmOffered,
    aggregated,
    orgChoices,
    showAdvanced,
    busy,
    availablePools,
    bhyveBootDevices,
    spec,
    openBoxVault,
  } = wizard;
  return (
    <>
      {stepId === 'general' && utmOffered ? (
        <HypervisorChoice
          value={form.machineHypervisor}
          onChange={setter('machineHypervisor')}
          disabled={busy}
        />
      ) : null}
      {stepId === 'general' ? (
        <GeneralStep
          name={form.name}
          setName={setter('name')}
          settings={form.settings}
          setSetting={setSetting}
          startAfterCreate={form.startAfterCreate}
          setStartAfterCreate={setter('startAfterCreate')}
          tagsInput={form.tagsInput}
          setTagsInput={setter('tagsInput')}
          notes={form.notes}
          setNotes={setter('notes')}
          orgChoices={orgChoices}
          orgUuid={form.orgUuid}
          setOrgUuid={aggregated ? setter('orgUuid') : null}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'box' ? (
        <BoxStep
          settings={form.settings}
          setSetting={setSetting}
          templates={feeds.templates}
          catalogNote={feeds.catalogNote}
          remoteBoxes={feeds.remoteBoxes}
          onBoxPicked={entry =>
            setSetting(
              'box_url',
              entry && entry.sourceUrl && !entry.isDefaultSource ? entry.sourceUrl : ''
            )
          }
          sourceChoices={feeds.sourceChoices}
          sourceFilter={form.sourceFilter}
          onSourceFilterChange={setter('sourceFilter')}
          boxPickCustom={form.boxPickCustom}
          setBoxPickCustom={setter('boxPickCustom')}
          bootSource={form.bootSource}
          setBootSource={setter('bootSource')}
          onBrowseBoxVault={aggregated ? openBoxVault : null}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'system' ? (
        <SystemStep
          zones={form.zones}
          setZone={setZone}
          settings={form.settings}
          setSetting={setSetting}
          agentDefaults={feeds.agentDefaults}
          osTypes={feeds.osTypes}
          hardware={form.hardware}
          onHardwareChange={(sectionId, key, value) =>
            set({
              hardware: {
                ...form.hardware,
                [sectionId]: { ...(form.hardware[sectionId] || {}), [key]: value },
              },
            })
          }
          serialRows={form.serialRows}
          setSerialRows={setter('serialRows')}
          parallelRows={form.parallelRows}
          setParallelRows={setter('parallelRows')}
          bhyveBootDevices={bhyveBootDevices}
          cloudInit={form.cloudInit}
          setCloudInit={patch => set({ cloudInit: { ...form.cloudInit, ...patch } })}
          vboxJson={form.vboxJson}
          setVboxJson={setter('vboxJson')}
          vbox={vbox}
          bhyve={bhyve}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'disks' ? (
        <DisksStep
          bootSource={form.bootSource}
          setBootSource={setter('bootSource')}
          disks={form.diskConfig}
          setDisks={setDisks}
          bootOrder={form.bootOrder}
          setBootOrder={setter('bootOrder')}
          diskif={form.zones.diskif ?? ''}
          setDiskif={value => setZone('diskif', value)}
          agentDefaults={feeds.agentDefaults}
          isoOptions={feeds.isoOptions}
          host={host}
          vbox={vbox}
          bhyve={bhyve}
          zfsPools={feeds.zfsPools}
          zfsDatasets={feeds.zfsDatasets}
          zfsVolumes={feeds.zfsVolumes}
          vboxMedia={feeds.vboxMedia}
          availablePools={availablePools}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'resources' ? (
        <ResourcesStep settings={form.settings} setSetting={setSetting} loading={busy} />
      ) : null}
      {stepId === 'network' ? (
        <NetworkStep
          networks={form.networks}
          onNetworksChange={setter('networks')}
          bridgeChoices={feeds.bridgeChoices}
          ipSuggestions={feeds.ipSuggestions}
          nicEnums={feeds.agentDefaults?.knob_values || null}
          loading={busy}
        />
      ) : null}
      {stepId === 'provisioning' ? <ProvisioningBody wizard={wizard} /> : null}
      {stepId === 'confirm' ? <ConfirmStep spec={spec()} /> : null}
    </>
  );
};

StepBody.propTypes = {
  wizard: PropTypes.object.isRequired,
};

/**
 * The dialog that creates one machine, hyperweaver-ui's create wizard, a
 * form dialog of eight steps: General, OS / Box, System, Disks, CPU &
 * Memory, Network, Provisioning and Confirm, each a pill, Next the
 * primary action until Confirm, where Create sends the one request,
 * `POST machines` with the spec of `buildSpec`, through
 * `useMachineTools`, one notice, the held copies read again once and
 * the task dialog offered from the notice; a step that cannot be left
 * says why over the fields, and what an agent short of resources
 * refused draws one line a resource. The steps a host draws are its
 * platform's: a bhyve host's zone fields, ZFS placement and lofs mounts,
 * a VirtualBox host's controllers, knobs and ports, the UTM choice on a
 * host that names `utm`. The pickers are fed by one read of each feed
 * as the dialog opens, the ones a step consumes read again as it is
 * entered. On the server role Browse BoxVault opens the picker of the
 * server's per-user proxy and the owning organization is chosen among
 * the ones the person manages; `seed`, the Deploy hand-off's query, lands
 * its box members on the box fields as a custom pick and its provisioner
 * on the Provisioning step, the host's family named by the part after the
 * handed `provisioner`'s slash, picked once the provisioners have
 * answered, and the version named, or the family's first, picked once the
 * family is, so the version's manifest is read as a person's pick reads
 * it; a family the host does not hold puts `useProvisionerInstall`'s card
 * on the Provisioning step, its press installing the family through the
 * host's catalog and the provisioners read again, so the same picks land.
 * Create stays the one machine write.
 */
const CreateWizard = ({ status, id, user, seed, tools, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const server = useHostRow(id);
  const { organization } = useContext(HostMachinesContext) || { organization: '' };
  const { form, set, update, setter, setSetting, setZone, setDisks } = useCreateForm();
  const feeds = useCreateFeeds({ status, id, server, t });
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [problem, setProblem] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [issues, setIssues] = useState([]);
  const [orgChoices, setOrgChoices] = useState(NO_ORGS);
  const [boxVaultOpen, setBoxVaultOpen] = useState(false);
  const aggregated = isServerRole(status);
  const bhyve = hostHasHypervisor(server, 'bhyve');
  const vbox = hostHasHypervisor(server, 'virtualbox');
  const utmOffered = hostHasHypervisor(server, 'utm');
  const noun = t(nounKeyOf(server ? [server] : []));
  const { busy } = tools;
  const stepId = CREATE_STEPS[stepIndex];
  const host = useMemo(() => ({ status, hostId: id, server }), [status, id, server]);
  const picked = useProvisionerPick({ status, id, form, set, provisioners: feeds.provisioners });
  const fieldConfig = useMemo(() => dslConfiguration(picked.versionInfo), [picked.versionInfo]);
  const needsSafeId = Boolean(picked.versionInfo?.id_files);
  const seeded = useRef(false);
  const provisionerSeeded = useRef('');
  const seedFamily = seedFamilyOf(seed?.provisioner);
  const install = useProvisionerInstall({
    status,
    id,
    server,
    seed,
    provisioners: feeds.provisioners,
    loaded: feeds.provisionersLoaded,
    onInstalled: feeds.loadProvisioners,
  });

  useEffect(() => {
    if (feeds.nextServerId) {
      setSetting('server_id', feeds.nextServerId);
    }
  }, [feeds.nextServerId, setSetting]);

  useEffect(() => {
    if (!aggregated) {
      return undefined;
    }
    let mounted = true;
    getKnownOrgs().then(orgs => {
      if (!mounted) {
        return;
      }
      const managers = managerOrgsOf(orgs);
      setOrgChoices(managers);
      if (organization && managers.some(org => org.uuid === organization)) {
        set({ orgUuid: organization });
      }
    });
    return () => {
      mounted = false;
    };
  }, [aggregated, organization, set]);

  useEffect(() => {
    if (!seed?.box || seeded.current) {
      return;
    }
    seeded.current = true;
    update(current => ({
      boxPickCustom: true,
      settings: {
        ...current.settings,
        box: seed.box,
        box_version: seed.box_version || '',
        box_arch: seed.box_arch || '',
        box_url: seed.box_url || '',
      },
    }));
  }, [seed, update]);

  const { changeFamily, changeVersion, family: pickedFamily } = picked;

  useEffect(() => {
    if (!seedFamily || provisionerSeeded.current) {
      return;
    }
    if (!feeds.provisioners.some(collection => collection.name === seedFamily)) {
      return;
    }
    provisionerSeeded.current = 'family';
    changeFamily(seedFamily);
  }, [seedFamily, feeds.provisioners, changeFamily]);

  useEffect(() => {
    if (provisionerSeeded.current !== 'family' || !pickedFamily) {
      return;
    }
    const versions = pickedFamily.versions || [];
    const named = seed?.provisioner_version || '';
    const chosen =
      versions.find(entry => entry.version === named || entry.dir === named) || versions[0];
    provisionerSeeded.current = 'version';
    if (chosen) {
      changeVersion(chosen.version);
    }
  }, [seed, pickedFamily, changeVersion]);

  const { loadZfs, loadMedia, loadUplinks, loadIpSuggestions } = feeds;
  const loadedStep = useRef('');

  useEffect(() => {
    if (loadedStep.current === stepId) {
      return;
    }
    loadedStep.current = stepId;
    if (stepId === 'disks') {
      loadZfs();
      loadMedia();
    }
    if (stepId === 'network') {
      loadUplinks().then(rows => {
        if (rows.length > 0) {
          update(current => ({
            networks: current.networks.map((network, index) =>
              index === 0 && !network.bridge ? { ...network, bridge: rows[0].name } : network
            ),
          }));
        }
      });
      loadIpSuggestions();
    }
  }, [stepId, loadZfs, loadMedia, loadUplinks, loadIpSuggestions, update]);

  const fieldInventory = useMemo(
    () => ({
      networks: feeds.bridgeChoices.map(choice => choice.value),
      images: [...new Set(feeds.templates.map(row => `${row.organization}/${row.box_name}`))],
    }),
    [feeds.bridgeChoices, feeds.templates]
  );

  const availablePools = useMemo(
    () =>
      templateAvailablePoolsOf({
        templates: feeds.templates,
        settings: form.settings,
        agentDefaults: feeds.agentDefaults,
      }),
    [feeds.templates, form.settings, feeds.agentDefaults]
  );

  const bhyveBootDevices = useMemo(() => {
    if (!bhyve) {
      return [];
    }
    return [
      ...(form.bootSource !== 'none' ? ['bootdisk'] : []),
      ...[...form.diskConfig.additional.keys()].map(index => `disk${index}`),
      ...[...form.diskConfig.cdroms.keys()].map(index => `cdrom${index}`),
      ...[...form.networks.keys()].map(index => `net${index}`),
    ];
  }, [bhyve, form.bootSource, form.diskConfig.additional, form.diskConfig.cdroms, form.networks]);

  const spec = () => {
    const hardwarePayload = buildHardwarePayload(form.hardware) || {};
    const serial = buildPortsPayload(form.serialRows);
    if (serial.length > 0) {
      hardwarePayload.serial = serial;
    }
    const parallel = buildPortsPayload(form.parallelRows);
    if (parallel.length > 0) {
      hardwarePayload.parallel = parallel;
    }
    return buildSpec({
      ...form,
      version: picked.version,
      properties: pruneHidden(fieldConfig, form.properties, form.roles),
      hardwarePayload,
      needsSafeId,
      bhyve,
      vbox,
    });
  };

  const problemOf = step => {
    const key = stepProblemOf(step, form);
    if (key) {
      return t(key);
    }
    if (step === 'provisioning' && fieldConfig) {
      const errors = validateAnswers(fieldConfig, form.properties, form.roles, t);
      setFieldErrors(errors);
      const names = Object.keys(errors);
      if (names.length > 0) {
        return t('machineEdit.machineCreateModal.fixHighlightedFields', {
          count: names.length,
          names: names.join(', '),
        });
      }
    }
    return '';
  };

  const goTo = index => {
    setProblem('');
    setStepIndex(index);
    setMaxVisited(current => Math.max(current, index));
  };

  const next = () => {
    const refused = problemOf(stepId);
    if (refused) {
      setProblem(refused);
      return;
    }
    goTo(Math.min(stepIndex + 1, CREATE_STEPS.length - 1));
  };

  const create = async () => {
    const failing = CREATE_STEPS.map(step => ({ step, refused: problemOf(step) })).find(
      entry => entry.refused
    );
    if (failing) {
      setProblem(failing.refused);
      setStepIndex(CREATE_STEPS.indexOf(failing.step));
      return;
    }
    setProblem('');
    const body = spec();
    const fallback = body.name || `${form.settings.hostname}.${form.settings.domain}`;
    const { answer, error } = await tools.send({
      id,
      name: fallback,
      call: () => createMachine(status, id, body),
      doneKey: 'machineEdit.machineCreateModal.creationQueued',
      inline: true,
    });
    setIssues(resourceIssuesOf(error));
    if (error) {
      return;
    }
    const made = createdOf(answer, fallback);
    if (made.names.length > 0) {
      notify(
        'info',
        t('machineEdit.machineCreateModal.createdInOrder', { names: made.names.join(', ') })
      );
    }
    onClose();
  };

  const wizard = {
    stepId,
    form,
    feeds,
    set,
    setter,
    setSetting,
    setZone,
    setDisks,
    host,
    bhyve,
    vbox,
    utmOffered,
    aggregated,
    orgChoices,
    showAdvanced,
    busy,
    picked,
    fieldConfig,
    fieldErrors,
    needsSafeId,
    fieldInventory,
    install,
    availablePools,
    bhyveBootDevices,
    spec,
    openBoxVault: () => setBoxVaultOpen(true),
  };

  const submit = event => {
    event.preventDefault();
    if (stepId === 'confirm') {
      create();
    } else {
      next();
    }
  };

  return (
    <>
      <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
        <form onSubmit={submit} noValidate data-dialog="machine-create" data-step={stepId}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {t('machineEdit.machineCreateModal.createTitle', { resource: noun })}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <StepPills stepIndex={stepIndex} maxVisited={maxVisited} busy={busy} onPick={goTo} />
            {feeds.failure ? (
              <div className="alert alert-warning" role="status" data-note="feeds-failed">
                {feeds.failure}
              </div>
            ) : null}
            {problem ? (
              <div className="alert alert-danger" role="alert" data-note="problem">
                {problem}
              </div>
            ) : null}
            {issues.length > 0 ? <ResourceIssues issues={issues} /> : null}
            <StepBody wizard={wizard} />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              {t('pages.confirm.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-action="back"
              onClick={() => goTo(Math.max(stepIndex - 1, 0))}
              disabled={busy || stepIndex === 0}
            >
              {t('machineEdit.machineCreateModal.back')}
            </button>
            <div className="form-check form-switch ms-2 me-auto">
              <input
                id="machine-create-advanced"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={showAdvanced}
                onChange={event => setShowAdvanced(event.target.checked)}
                disabled={busy}
              />
              <label className="form-check-label" htmlFor="machine-create-advanced">
                {t('machineEdit.machineCreateModal.advanced')}
              </label>
            </div>
            <button type="submit" className="btn btn-primary" data-action="submit" disabled={busy}>
              {t(
                stepId === 'confirm'
                  ? 'machineEdit.machineCreateModal.create'
                  : 'machineEdit.machineCreateModal.next'
              )}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
      {boxVaultOpen ? (
        <BoxVaultPickerModal
          user={user}
          onClose={() => setBoxVaultOpen(false)}
          onPicked={pick => {
            set({
              boxPickCustom: true,
              settings: {
                ...form.settings,
                box: `${pick.orgSlug}/${pick.boxName}`,
                box_version: pick.version,
                box_arch: pick.architecture,
                box_url: pick.downloadUrl,
              },
            });
            setBoxVaultOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

const seedShape = PropTypes.shape({
  box: PropTypes.string,
  box_version: PropTypes.string,
  box_arch: PropTypes.string,
  box_url: PropTypes.string,
  provisioner: PropTypes.string,
  provisioner_version: PropTypes.string,
  provisioner_url: PropTypes.string,
  provisioner_catalog: PropTypes.string,
});

CreateWizard.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  user: PropTypes.object,
  seed: seedShape,
  tools: PropTypes.shape({
    send: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The create wizard and the task dialog of its queued create, held the
 * way `MachineToolDialogs` holds a tool's: the wizard draws while
 * `open`, and the task dialog, opened from the notice's View task,
 * outlives the wizard that queued the create. `seed` is what the Deploy
 * hand-off's query seeds the wizard with, and `user` the session's user,
 * whose provider decides whether BoxVault can be browsed.
 */
const MachineCreateModal = ({ status, id, open, user = null, seed = null, onClose }) => {
  const tools = useMachineTools();
  return (
    <>
      {open ? (
        <CreateWizard
          key={id}
          status={status}
          id={id}
          user={user}
          seed={seed}
          tools={tools}
          onClose={onClose}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog
          status={status}
          id={tools.task.id}
          task={tools.task.row}
          onHide={tools.closeTask}
        />
      ) : null}
    </>
  );
};

MachineCreateModal.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  user: PropTypes.object,
  seed: seedShape,
  onClose: PropTypes.func.isRequired,
};

export default MachineCreateModal;
