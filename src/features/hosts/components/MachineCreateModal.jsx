import PropTypes from 'prop-types';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import DiscardPrompt, { useDiscardGuard } from '../../../components/common/DiscardPrompt';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchMachineDefaults, fetchMachineOsTypes } from '../api/machineCreate';
import { getKnownOrgs, managerOrgsOf } from '../api/orgAccessAPI';
import {
  createMachine,
  fetchArtifacts,
  fetchBridgedInterfaces,
  fetchIpSuggestions,
  fetchIsoArtifacts,
  fetchMediaList,
  fetchMissingArtifact,
  fetchNextServerId,
  fetchProvisioners,
  fetchProvisionerVersion,
  fetchProvisioningNetworkStatus,
  fetchRemoteTemplates,
  fetchTemplates,
  installFromCatalog,
  previewMachine,
} from '../api/provisioning';
import { fetchTemplateSources } from '../api/templates';
import { getZfsDatasets, getZfsPools } from '../api/zfsAPI';
import { HostMachinesContext } from '../hooks/useHostMachines';
import { useManageRead, useTaskEnds, useTaskFollow } from '../hooks/useHostManage';
import { useHostPrefs } from '../hooks/useHostPrefs';
import { useHostRow } from '../hooks/useHostRow';
import { readSecretRowsOf } from '../hooks/useHostSecrets';
import { useMachineTools } from '../hooks/useMachineTools';
import { readCatalogSources, useProvisionerInstall } from '../hooks/useProvisionerInstall';
import { useTemplateSource } from '../hooks/useTemplateSource';
import {
  flattenBoxCatalog,
  pickDefaultSource,
  sourceKeyOf,
  sourceLabelOf,
} from '../utils/boxCatalog';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import { hostLabel, isServerRole } from '../utils/hosts';
import {
  BOX_SETTING_KEYS,
  PROVISIONER_INSTALL_OPERATIONS,
  bridgeChoicesOf,
  buildSpec,
  createdOf,
  defaultDomainOf,
  defaultExternalNetwork,
  domainChoicesOf,
  domainConfigRouteOf,
  emptyCloudInit,
  emptyDiskConfig,
  emptySettings,
  highestVersionOf,
  nameParts,
  nextServerIdOf,
  packageDefaultsOf,
  defaultUplinkOf,
  fillProvisioningNetwork,
  provisioningNetworkOf,
  withDefaultUplink,
  withProvisioningNetwork,
  prefilledFrom,
  seedBoxOf,
  seedFamilyOf,
  sourceFilterDefaultOf,
  stepOpen,
  stepProblemOf,
  stepsFor,
} from '../utils/machineCreate';
import { flattenBridgedInterfaces, isoFilenames } from '../utils/machineHelpers';
import { nounKeyOf } from '../utils/machines';
import { queuedTaskOf, resourceIssuesOf } from '../utils/machineTools';
import { hypervisorRowsOf, secretKindsOf } from '../utils/provisionerFieldDsl';
import { manifestRolesOf, roleHintsOf, seedRoles, stripTag, tagRow } from '../utils/provisioning';
import { answeredFieldNames, seedRolePicks } from '../utils/roleFiles';

import BoxVaultPickerModal from './BoxVaultPickerModal';
import {
  ConfirmStep,
  CpuStep,
  GeneralStep,
  MemoryStep,
  NetworkStep,
  OsDisksStep,
  ProvisioningStep,
  SystemStep,
} from './CreateWizardSteps';
import { buildHardwarePayload, buildPortsPayload } from './HardwareEditor';
import { heldStateOf } from './HostCatalogInstall';
import {
  dslConfiguration,
  pruneHidden,
  seedAnswers,
  seedInventoryAnswers,
  seedSecretAnswers,
  validateAnswers,
} from './ProvisionerFieldDsl';
import ProvisionerPickModal from './ProvisionerPickModal';
import ResourceIssues from './ResourceIssues';
import TaskDialog from './TaskDialog';
import VersionCatalogModal from './VersionCatalogModal';

const NO_ORGS = [];

const CREATE_MODES = {
  create: { startAfterCreate: false, provisionAfterCreate: false },
  start: { startAfterCreate: true, provisionAfterCreate: false },
  provision: { startAfterCreate: true, provisionAfterCreate: true },
};

const NO_FAMILIES = [];

const NO_ROLES = [];

const NO_CATALOGS = { sources: [], reads: [] };

const NO_FIELDS = {};

const PREVIEW_EMPTY = { body: '', yaml: '', warnings: [], error: '', fields: NO_FIELDS };

const previewStateOf = (answer, body) => {
  if (answer.body !== body) {
    return 'loading';
  }
  return answer.error ? 'failed' : 'ready';
};

const REFUSED = 422;

const DISK_PATHS = {
  bootSize: 'disks.boot.size',
  bootVolumeName: 'disks.boot.volume_name',
  bootCloneStrategy: 'disks.boot.clone_strategy',
  bootMount: 'disks.boot.mount',
  additional: 'disks.additional',
};

const seededRows = manifest => seedRoles(manifest).map(tagRow);

const pickOwnerOf = (server, appStatus, id) =>
  server ? hostLabel(server) : appStatus?.hostname || id;

const pickedOf = form =>
  form.familyName ? { name: form.familyName, version: form.versionKey } : null;

const listOf = value => (Array.isArray(value) ? value : []);

const familiesOf = data => (Array.isArray(data?.provisioners) ? data.provisioners : NO_FAMILIES);

const settle = promise => promise.then(data => data ?? null).catch(() => null);

const withTyped = (typed, paths) => {
  const next = new Set(typed);
  paths.forEach(path => next.add(path));
  return next;
};

const marksOf = (fromPackage, typed) => new Set([...fromPackage].filter(path => !typed.has(path)));

const SEEDED_PATHS = ['settings.server_id'];

const BOX_PATHS = BOX_SETTING_KEYS.map(key => `settings.${key}`);

/**
 * Whether the wizard holds a draft a close would lose: a name, or a member
 * the person typed, the next server id and a handed box's fields, which
 * the wizard fills itself, left out.
 *
 * @param {Object} form - The wizard's form
 * @param {boolean} seeded - Whether a handed box filled the box fields
 * @returns {boolean} Whether the wizard is dirty
 */
const dirtyOf = (form, seeded) => {
  const own = seeded ? [...SEEDED_PATHS, ...BOX_PATHS] : SEEDED_PATHS;
  return Boolean(form.nameText || form.name) || [...form.typed].some(path => !own.includes(path));
};

const fieldMapOf = error =>
  error?.status === REFUSED &&
  error.data &&
  typeof error.data === 'object' &&
  !Array.isArray(error.data)
    ? Object.fromEntries(
        Object.entries(error.data).filter(([, value]) => typeof value === 'string')
      )
    : {};

const catalogEntriesOf = (catalogs, name) =>
  catalogs.reads.flatMap(read =>
    listOf(read.catalog?.provisioners)
      .filter(entry => entry?.name === name)
      .map(entry => ({ source: read.source.id, versions: listOf(entry.versions) }))
  );

/**
 * The update the version select's dot offers for the picked family: the
 * newest version the host's catalogs list and the source listing it,
 * while that version is newer than every one the host holds, read through
 * `heldStateOf`; null while nothing is newer or no catalog answers.
 *
 * @param {{ sources: Array<Object>, reads: Array<Object> }} catalogs - The catalogs read as the dialog opened
 * @param {Object|null} family - The host's family row with its `versions`
 * @returns {{ version: string, source: string }|null} The update
 */
const catalogUpdateOf = (catalogs, family) => {
  if (!family) {
    return null;
  }
  const entries = catalogEntriesOf(catalogs, family.name);
  const versions = entries.flatMap(entry => entry.versions);
  if (versions.length === 0) {
    return null;
  }
  const held = listOf(family.versions)
    .map(entry => entry.version)
    .filter(Boolean);
  const { state, newest } = heldStateOf(
    { name: family.name, versions },
    { held: { versionsOf: () => held } }
  );
  if (state !== 'behind' || !newest) {
    return null;
  }
  const listing = entries.find(entry => entry.versions.some(row => row.version === newest));
  return { version: newest, source: listing?.source || '' };
};

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
 * the defaults, the OS types, the next server id, the local templates
 * and every enabled registry's catalog, the artifacts and the cached
 * ISOs, all read once as the dialog opens; the provisioners through the
 * one read the Provisioners page uses, asked as the dialog opens, again
 * when the event stream opens fresh or answers `reset`, at the end of
 * every provisioner install task of the host on `task-updated`, whoever
 * queued it, and through `loadProvisioners`, which answers the families;
 * the pools, datasets and volumes of a host that lists `zfs`, the
 * registered media of a VirtualBox host, the uplinks, the free
 * addresses and, on a VirtualBox host that lists `provisioning`,
 * `GET provisioning/network/status` for the Network step's provisioning
 * adapter, each read when its step is entered, so a picker is never
 * older than the visit to its step, the registries and their catalogs
 * again through `loadCatalogs` once a handed box's registry is added,
 * the provisioner catalog sources and each one's catalog once as the
 * dialog opens on a host that lists `provisioner-registry`, held as
 * `catalogs` and answered again by `loadCatalogSources`, fresh while
 * asked, and nothing reads on a clock.
 */
const useCreateFeeds = ({ status, id, server, t }) => {
  const [feeds, setFeeds] = useState({
    agentDefaults: null,
    osTypes: null,
    nextServerId: '',
    templates: [],
    remoteBoxes: [],
    sourceChoices: [],
    templateSources: [],
    sourcesLoaded: false,
    catalogNote: '',
    artifacts: null,
    isoOptions: [],
    zfsPools: [],
    zfsDatasets: [],
    zfsVolumes: [],
    vboxMedia: [],
    bridgeChoices: [],
    ipSuggestions: null,
    provisioningNetwork: null,
    catalogs: NO_CATALOGS,
  });
  const patch = useCallback(next => setFeeds(current => ({ ...current, ...next })), []);
  const catalogRead = useRef(null);
  const held = useManageRead(
    useCallback(() => fetchProvisioners(status, id), [status, id]),
    true
  );
  const { refresh: refreshProvisioners } = held;
  const provisioners = useMemo(() => familiesOf(held.data), [held.data]);

  useTaskEnds({ id, operations: PROVISIONER_INSTALL_OPERATIONS, onEnd: refreshProvisioners });
  const zfs = hostHasFeature(server, 'zfs');
  const vbox = hostHasHypervisor(server, 'virtualbox');
  const templated = hostHasFeature(server, 'templates');
  const cached = hostHasFeature(server, 'artifacts');
  const catalogued = hostHasFeature(server, 'provisioner-registry');
  const provisioned = vbox && hostHasFeature(server, 'provisioning');

  const loadCatalogSources = useCallback(
    (fresh = false) => {
      if (!fresh && catalogRead.current) {
        return catalogRead.current;
      }
      const reading = readCatalogSources(status, id);
      catalogRead.current = reading;
      reading.then(
        catalogs => patch({ catalogs }),
        () => patch({ catalogs: NO_CATALOGS })
      );
      return reading;
    },
    [status, id, patch]
  );

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
        return { rows, uplink: defaultUplinkOf(data, rows) };
      }),
    [status, id, patch]
  );

  const loadIpSuggestions = useCallback(() => {
    settle(fetchIpSuggestions(status, id)).then(data => patch({ ipSuggestions: data }));
  }, [status, id, patch]);

  const loadProvisioningNetwork = useCallback(() => {
    if (!provisioned) {
      return;
    }
    settle(fetchProvisioningNetworkStatus(status, id)).then(data =>
      patch({ provisioningNetwork: data })
    );
  }, [provisioned, status, id, patch]);

  const readCatalogs = useCallback(
    sources => {
      const enabled = sources.filter(source => source.enabled !== false);
      if (enabled.length === 0) {
        patch({
          templateSources: sources,
          sourcesLoaded: true,
          catalogNote: t('machineEdit.machineCreateModal.noTemplateSourcesConfigured'),
        });
        return;
      }
      patch({
        templateSources: sources,
        sourcesLoaded: true,
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
    () => refreshProvisioners().then(familiesOf),
    [refreshProvisioners]
  );

  const loadArtifacts = useCallback(() => {
    if (!cached) {
      return Promise.resolve(null);
    }
    return settle(fetchArtifacts(status, id)).then(data => {
      patch({ artifacts: data ? listOf(data.artifacts) : null });
      return data;
    });
  }, [cached, status, id, patch]);

  useEffect(() => {
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
      loadArtifacts();
      settle(fetchIsoArtifacts(status, id)).then(data =>
        patch({ isoOptions: data ? isoFilenames(data) : [] })
      );
    }
    if (catalogued) {
      loadCatalogSources().catch(() => null);
    }
    loadZfs();
    loadMedia();
    loadProvisioningNetwork();
  }, [
    status,
    id,
    templated,
    cached,
    catalogued,
    patch,
    loadCatalogs,
    loadCatalogSources,
    loadArtifacts,
    loadZfs,
    loadMedia,
    loadProvisioningNetwork,
  ]);

  return {
    ...feeds,
    provisioners,
    provisionersLoaded: held.loaded && !held.failed,
    failure: held.failed
      ? t('machineEdit.machineCreateModal.failedToLoadProvisioners', { message: held.message })
      : '',
    loadProvisioners,
    loadArtifacts,
    loadCatalogs,
    loadCatalogSources,
    loadZfs,
    loadMedia,
    loadUplinks,
    loadIpSuggestions,
    loadProvisioningNetwork,
  };
};

/**
 * The wizard's own state, one member a field, opened empty on the
 * external network every provisioned machine begins with;
 * `typed` the member paths the person edited, `settings.<key>`,
 * `disks.boot.<member>`, `disks.additional`, `networks`, `tags` and
 * `sourceFilter`, which a package's prefill and the registry default
 * never overwrite, and `fromPackage` the member paths the package filled.
 */
const useCreateForm = () => {
  const [form, setForm] = useState(() => ({
    name: '',
    nameText: '',
    machineHypervisor: '',
    useProvisioner: false,
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
    downloads: {},
    provisioningRow: null,
    packageDomain: '',
    syncMethod: 'rsync',
    removeTransport: '',
    sourceFilter: '',
    boxPickCustom: false,
    typed: new Set(),
    fromPackage: new Set(),
  }));
  const set = useCallback(next => setForm(current => ({ ...current, ...next })), []);
  const update = useCallback(
    change => setForm(current => ({ ...current, ...change(current) })),
    []
  );
  const setter = key => value => set({ [key]: value });
  const setSetting = useCallback(
    (key, value) =>
      setForm(current => ({
        ...current,
        settings: { ...current.settings, [key]: value },
        typed: withTyped(current.typed, [`settings.${key}`]),
      })),
    []
  );
  const setZone = useCallback(
    (key, value) => setForm(current => ({ ...current, zones: { ...current.zones, [key]: value } })),
    []
  );
  const setDisks = useCallback(
    next =>
      setForm(current => ({
        ...current,
        diskConfig: { ...current.diskConfig, ...next },
        typed: withTyped(
          current.typed,
          Object.keys(next)
            .map(key => DISK_PATHS[key])
            .filter(Boolean)
        ),
      })),
    []
  );
  const setNetworks = useCallback(
    networks =>
      setForm(current => ({ ...current, networks, typed: withTyped(current.typed, ['networks']) })),
    []
  );
  const setTyped = useCallback(
    (key, value) =>
      setForm(current => ({ ...current, [key]: value, typed: withTyped(current.typed, [key]) })),
    []
  );
  return { form, set, update, setter, setSetting, setZone, setDisks, setNetworks, setTyped };
};

const StepPills = ({ steps, stepId, open, busy, onPick }) => {
  const { t } = useTranslation();
  return (
    <ul className="nav nav-pills mb-3 flex-wrap gap-1" data-list="create-steps">
      {steps.map(step => (
        <li key={step} className="nav-item">
          <button
            type="button"
            className={`nav-link py-1 px-2 ${step === stepId ? 'active' : ''}`}
            data-step={step}
            onClick={() => onPick(step)}
            disabled={busy || !open(step)}
          >
            {t(`machineEdit.machineCreateModal.step.${step}`)}
          </button>
        </li>
      ))}
    </ul>
  );
};

StepPills.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
  stepId: PropTypes.string.isRequired,
  open: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * The wizard's one fixed set of moves, drawn at the right end of the bar
 * under the dialog's title on every step in the same order: Back, Next or
 * on Confirm the Create split button with Create and start and Create and
 * provision, then Cancel.
 */
const WizardNav = ({
  busy,
  backHeld,
  onBack,
  onCancel,
  submitButton,
  confirming,
  onCreate,
  provisionHeld,
}) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex align-items-center gap-2 ms-auto" data-pane="wizard-nav">
      <button
        type="button"
        className="btn btn-outline-secondary"
        data-action="back"
        onClick={onBack}
        disabled={busy || backHeld}
      >
        {t('machineEdit.machineCreateModal.back')}
      </button>
      {confirming ? (
        <Dropdown as="div" className="btn-group" align="end">
          {submitButton}
          <Dropdown.Toggle
            split
            variant="primary"
            data-action="submit-menu"
            aria-label={t('machineEdit.machineCreateModal.createOptions')}
            disabled={busy}
          />
          <Dropdown.Menu>
            <Dropdown.Item
              as="button"
              type="button"
              data-action="submit-start"
              onClick={() => onCreate(CREATE_MODES.start)}
              disabled={busy}
            >
              {t('machineEdit.machineCreateModal.createAndStart')}
            </Dropdown.Item>
            <Dropdown.Item
              as="button"
              type="button"
              data-action="submit-provision"
              onClick={() => onCreate(CREATE_MODES.provision)}
              disabled={busy || provisionHeld}
            >
              {t('machineEdit.machineCreateModal.createAndProvision')}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      ) : (
        submitButton
      )}
      <button
        type="button"
        className="btn btn-secondary"
        data-action="cancel"
        onClick={onCancel}
        disabled={busy}
      >
        {t('pages.confirm.cancel')}
      </button>
    </div>
  );
};

WizardNav.propTypes = {
  busy: PropTypes.bool.isRequired,
  backHeld: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitButton: PropTypes.node.isRequired,
  confirming: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  provisionHeld: PropTypes.bool.isRequired,
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

const seededAnswers = (manifest, inventory) => {
  const config = dslConfiguration(manifest);
  return { ...seedAnswers(config), ...seedInventoryAnswers(config, inventory) };
};

/**
 * The default domain chain of the General step: the rows of the domain
 * input's list from the browser's `hosts_prefs` preference, the host's
 * `settings.domain_choices` and the picked provisioner's default domain,
 * `form.packageDomain`, the domain a bare name takes, the first
 * non-empty of the chain, whether a bare name is left without a domain,
 * and the route of the host's `machines` configuration where it has one.
 */
const useDomainChain = ({ agentDefaults, form, aggregated, status, server, id }) => {
  const prefs = useHostPrefs();
  const { packageDomain } = form;
  const choices = useMemo(
    () => domainChoicesOf(agentDefaults, prefs.defaultDomain, packageDomain),
    [agentDefaults, prefs.defaultDomain, packageDomain]
  );
  const defaultDomain = defaultDomainOf({
    preference: prefs.defaultDomain,
    choices,
    agentDomain: agentDefaults?.settings?.domain || '',
  });
  const bare = Boolean(form.nameText) && !form.nameText.includes('.');
  return {
    choices,
    defaultDomain,
    missing: bare && !form.settings.domain && !defaultDomain,
    configRoute: domainConfigRouteOf({ aggregated, status, server, id }),
  };
};

const versionEntryOf = (family, value) =>
  family?.versions?.find(entry => entry.version === value || entry.dir === value) || null;

/**
 * The provisioner picked on General: the family and the version, the
 * version's detail read once per pick, its roles, its field answers and
 * its package defaults landing on the form as it answers, every `secret`
 * field then preselected through `seedSecretAnswers` from one read of
 * the host's store a kind the configuration names, an answer the person
 * already made never overwritten. `pickProvisioner(name, version)` picks
 * a family and its version at once and turns `useProvisioner` on,
 * `clearProvisioner` drops both and turns it off, and `changeVersion`
 * picks another version of the family held.
 */
const useProvisionerPick = ({ status, id, form, set, update, provisioners, inventory }) => {
  const fetchSeq = useRef(0);
  const [versionDetail, setVersionDetail] = useState(null);
  const [versionPending, setVersionPending] = useState(false);
  const family = useMemo(
    () => provisioners.find(collection => collection.name === form.familyName) || null,
    [provisioners, form.familyName]
  );
  const version = useMemo(() => versionEntryOf(family, form.versionKey), [family, form.versionKey]);

  const familyReset = {
    roles: [],
    properties: {},
    downloads: {},
    fromPackage: new Set(),
    packageDomain: '',
  };

  const clearProvisioner = () => {
    fetchSeq.current += 1;
    setVersionDetail(null);
    setVersionPending(false);
    set({ ...familyReset, familyName: '', versionKey: '', useProvisioner: false });
  };

  const loadVersion = (familyName, next, value) => {
    set({
      versionKey: value,
      roles: seededRows(next),
      properties: seededAnswers(next, inventory),
      downloads: {},
    });
    fetchSeq.current += 1;
    const seq = fetchSeq.current;
    setVersionDetail(null);
    if (!next || !familyName) {
      setVersionPending(false);
      return;
    }
    setVersionPending(true);
    settle(fetchProvisionerVersion(status, id, familyName, next.version || value)).then(data => {
      if (seq !== fetchSeq.current) {
        return;
      }
      setVersionPending(false);
      const manifest = data?.metadata || null;
      if (!manifest) {
        return;
      }
      setVersionDetail(data);
      const defaults = packageDefaultsOf(manifest);
      update(current => ({
        roles: seededRows(manifest),
        properties: seededAnswers(manifest, inventory),
        ...(defaults ? prefilledFrom(defaults, current) : {}),
      }));
      const config = dslConfiguration(manifest);
      if (secretKindsOf(config).length === 0) {
        return;
      }
      readSecretRowsOf(status, id, config).then(rows => {
        if (seq !== fetchSeq.current) {
          return;
        }
        update(current => ({
          properties: { ...seedSecretAnswers(config, rows), ...current.properties },
        }));
      });
    });
  };

  const changeVersion = value => loadVersion(form.familyName, versionEntryOf(family, value), value);

  const pickProvisioner = (name, value) => {
    const held = provisioners.find(collection => collection.name === name) || null;
    set({ ...familyReset, familyName: name, versionKey: '', useProvisioner: true });
    loadVersion(name, versionEntryOf(held, value), value);
  };

  return {
    family,
    version,
    versionInfo: versionDetail?.metadata || version,
    roleSpecs: versionDetail?.role_specs?.roles || null,
    versionPending,
    pickProvisioner,
    clearProvisioner,
    changeVersion,
  };
};

const ProvisioningBody = ({ wizard }) => {
  const {
    form,
    feeds,
    set,
    update,
    setter,
    setSetting,
    showAdvanced,
    busy,
    picked,
    fieldConfig,
    fieldErrors,
    fieldInventory,
    install,
    host,
    manifestRoles,
    roleHints,
    omit,
    fetchArtifact,
    marks,
  } = wizard;
  return (
    <ProvisioningStep
      install={install}
      familyName={form.familyName}
      version={picked.versionInfo}
      versionPending={picked.versionPending}
      settings={form.settings}
      setSetting={setSetting}
      agentDefaults={feeds.agentDefaults}
      fieldConfig={fieldConfig}
      answers={form.properties}
      fieldErrors={fieldErrors}
      onAnswerChange={(key, value) => set({ properties: { ...form.properties, [key]: value } })}
      onAnswers={answers =>
        update(current => ({ properties: { ...current.properties, ...answers } }))
      }
      inventory={fieldInventory}
      roles={form.roles}
      onRolesChange={setter('roles')}
      manifestRoles={manifestRoles}
      roleSpecs={picked.roleSpecs}
      roleHints={roleHints}
      artifacts={feeds.artifacts}
      queued={form.downloads}
      onFetch={fetchArtifact}
      makeRoleRow={(roleName, copyFrom) =>
        copyFrom
          ? tagRow(stripTag(copyFrom))
          : tagRow({ name: roleName || '', enabled: true, files: {}, vars: {} })
      }
      syncMethod={form.syncMethod}
      setSyncMethod={setter('syncMethod')}
      syncMethodOptions={feeds.agentDefaults?.knob_values?.['settings.sync_method'] || null}
      removeTransport={form.removeTransport}
      setRemoveTransport={setter('removeTransport')}
      removeTransportDefault={
        feeds.agentDefaults?.knob_defaults?.['transport.remove_on_completion'] ?? null
      }
      onArtifactsReload={feeds.loadArtifacts}
      host={host}
      omit={omit}
      marks={marks}
      advanced={showAdvanced}
      loading={busy}
    />
  );
};

ProvisioningBody.propTypes = {
  wizard: PropTypes.object.isRequired,
};

const ResourceBody = ({ wizard, Step }) => {
  const { form, feeds, set, setSetting, setZone, bhyve, vbox, showAdvanced, busy, marks } = wizard;
  return (
    <Step
      settings={form.settings}
      setSetting={setSetting}
      zones={form.zones}
      setZone={setZone}
      hardware={form.hardware}
      onHardwareChange={(sectionId, key, value) =>
        set({
          hardware: {
            ...form.hardware,
            [sectionId]: { ...(form.hardware[sectionId] || {}), [key]: value },
          },
        })
      }
      agentDefaults={feeds.agentDefaults}
      vbox={vbox}
      bhyve={bhyve}
      marks={marks}
      advanced={showAdvanced}
      loading={busy}
    />
  );
};

ResourceBody.propTypes = {
  wizard: PropTypes.object.isRequired,
  Step: PropTypes.elementType.isRequired,
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
    setNetworks,
    setTyped,
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
    source,
    seedBox,
    naming,
    domain,
    provisioner,
    preview,
    marks,
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
          nameText={form.nameText}
          setNameText={naming.setNameText}
          onPartChange={naming.setNamePart}
          domain={domain}
          name={form.name}
          setName={setter('name')}
          settings={form.settings}
          setSetting={setSetting}
          tagsInput={form.tagsInput}
          setTagsInput={value => setTyped('tagsInput', value)}
          notes={form.notes}
          setNotes={setter('notes')}
          orgChoices={orgChoices}
          orgUuid={form.orgUuid}
          setOrgUuid={aggregated ? setter('orgUuid') : null}
          provisioner={provisioner}
          marks={marks}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'os-disks' ? (
        <OsDisksStep
          box={{
            settings: form.settings,
            setSetting,
            templates: feeds.templates,
            catalogNote: feeds.catalogNote,
            remoteBoxes: feeds.remoteBoxes,
            onBoxPicked: entry =>
              setSetting(
                'box_url',
                entry && entry.sourceUrl && !entry.isDefaultSource ? entry.sourceUrl : ''
              ),
            sourceChoices: feeds.sourceChoices,
            sourceFilter: form.sourceFilter,
            onSourceFilterChange: value => setTyped('sourceFilter', value),
            boxPickCustom: form.boxPickCustom,
            setBoxPickCustom: setter('boxPickCustom'),
            registry: source,
            seededBox: seedBox,
            onBrowseBoxVault: aggregated ? openBoxVault : null,
          }}
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
          marks={marks}
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
          marks={marks}
          advanced={showAdvanced}
          loading={busy}
        />
      ) : null}
      {stepId === 'cpu' ? <ResourceBody wizard={wizard} Step={CpuStep} /> : null}
      {stepId === 'memory' ? <ResourceBody wizard={wizard} Step={MemoryStep} /> : null}
      {stepId === 'network' ? (
        <NetworkStep
          networks={form.networks}
          onNetworksChange={setNetworks}
          bridgeChoices={feeds.bridgeChoices}
          ipSuggestions={feeds.ipSuggestions}
          nicEnums={feeds.agentDefaults?.knob_values || null}
          marks={marks}
          loading={busy}
        />
      ) : null}
      {stepId === 'provisioning' ? <ProvisioningBody wizard={wizard} /> : null}
      {stepId === 'confirm' ? <ConfirmStep spec={spec()} preview={preview} /> : null}
    </>
  );
};

StepBody.propTypes = {
  wizard: PropTypes.object.isRequired,
};

/**
 * The dialog that creates one machine, hyperweaver-ui's create wizard, a
 * form dialog of eight steps: General, OS & Disks, System, CPU, Memory,
 * Network, Provisioning and Confirm, each a pill that opens while every
 * step before it is clean, the Provisioning pill drawn while a
 * provisioner is picked or handed, Next the primary action until Confirm, where the
 * split button sends the one request, `POST machines` with the spec of
 * `buildSpec`, Create with `start_after_create` and
 * `provision_after_create` false, Create and start with the first true
 * and Create and provision with both true, through `useMachineTools`,
 * one notice, the held copies read again once
 * and the task dialog offered from the notice; a step that cannot be
 * left says why over the fields, and what an agent short of resources
 * refused draws one line a resource. The steps a host draws are its
 * platform's: a bhyve host's zone fields, ZFS placement and lofs mounts,
 * a VirtualBox host's controllers, knobs and ports, the UTM choice on a
 * host that names `utm`. The pickers are fed by one read of each feed
 * as the dialog opens, the ones a step consumes read again as it is
 * entered. General's Pick provisioner opens `ProvisionerPickModal` over
 * the families the host holds, a card's Pick landing the family at its
 * highest version by `highestVersionOf` and a version's Pick that
 * version. A provisioner version picked on General prefills the steps
 * from its manifest's `metadata.defaults`, its `settings`, `disks`,
 * `networks`, `tags` and `guest_agent`, a value the person typed
 * never overwritten and every filled value marked from package until
 * typed over, seeds each file-taking role's installer to the row the
 * configuration's default names through `seedRolePicks`, and preselects
 * every `secret` field whose kind and
 * profile exactly one row of the host's store matches, the store read
 * once a kind as the version answers; the picked chip carries the
 * warning glyph and the catalog link while the host's catalogs list a
 * newer version, the link opening `VersionCatalogModal` over the
 * family's catalog versions, a version's Install sending
 * `POST provisioning/catalog/install`, the task followed to its end and
 * the new version picked once the families answer it. The Registry
 * filter of OS & Disks opens on the one enabled registry, else on the
 * registry the package's `box_url` names, through `sourceFilterDefaultOf`
 * as the registries answer, a filter the person picked kept. Confirm reads
 * `POST machines/preview` with both flags false as it is entered and
 * again on every change of the body while on it, its 422 drawn as the
 * field errors of the
 * Provisioning step. On the server role Browse BoxVault opens the picker
 * of the server's per-user proxy and the owning organization is chosen
 * among the ones the person manages; `seed`, the Deploy hand-off's
 * query, lands its box on the box fields as a custom pick, BoxVault's
 * `box` members or the catalog's `box_<provider>` member the host's
 * hypervisors pick through `seedBoxOf`, and its provisioner on General,
 * the host's family named by the part after the handed `provisioner`'s
 * slash, picked once the provisioners have answered at the version
 * named, else at the family's highest, so the version's manifest is read
 * as a person's pick reads it; a family the host does not hold puts `useProvisionerInstall`'s card
 * on the Provisioning step, its press installing the family through the
 * host's catalog and the provisioners read again, so the same picks land,
 * and a family installed elsewhere while the dialog is open, on the
 * Provisioners page or in another tab, lands the same way at its task's
 * end on `task-updated`, the card gone and the family picked;
 * a handed box whose registry the host does not hold puts
 * `useTemplateSource`'s card on the OS & Disks step, its press writing
 * the registry and the registries read again, so the agent's create
 * downloads the box, which the notice says when the answer carries
 * `requires_download`. Create stays the one machine write.
 */
const CreateWizard = ({ status, id, user, seed, tools, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const appStatus = useStatus();
  const server = useHostRow(id);
  const { organization } = useContext(HostMachinesContext) || { organization: '' };
  const { form, set, update, setter, setSetting, setZone, setDisks, setNetworks, setTyped } =
    useCreateForm();
  const feeds = useCreateFeeds({ status, id, server, t });
  const [stepIndex, setStepIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [problem, setProblem] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [issues, setIssues] = useState([]);
  const [orgChoices, setOrgChoices] = useState(NO_ORGS);
  const [boxVaultOpen, setBoxVaultOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [previewAnswer, setPreviewAnswer] = useState(PREVIEW_EMPTY);
  const wantedVersion = useRef('');
  const aggregated = isServerRole(status);
  const bhyve = hostHasHypervisor(server, 'bhyve');
  const vbox = hostHasHypervisor(server, 'virtualbox');
  const utmOffered = hostHasHypervisor(server, 'utm');
  const noun = t(nounKeyOf(server ? [server] : []));
  const { busy } = tools;
  const steps = stepsFor(form);
  const stepId = steps[Math.min(stepIndex, steps.length - 1)];
  const host = useMemo(() => ({ status, hostId: id, server }), [status, id, server]);
  const chain = useDomainChain({
    agentDefaults: feeds.agentDefaults,
    form,
    aggregated,
    status: appStatus,
    server,
    id,
  });
  const { defaultDomain } = chain;
  const fieldInventory = useMemo(
    () => ({
      networks: feeds.bridgeChoices.map(choice => choice.value),
      images: [...new Set(feeds.templates.map(row => `${row.organization}/${row.box_name}`))],
      hypervisor: hypervisorRowsOf(server?.capabilities?.hypervisors),
    }),
    [feeds.bridgeChoices, feeds.templates, server]
  );
  const picked = useProvisionerPick({
    status,
    id,
    form,
    set,
    update,
    provisioners: feeds.provisioners,
    inventory: fieldInventory,
  });
  const fieldConfig = useMemo(() => dslConfiguration(picked.versionInfo), [picked.versionInfo]);
  const manifestRoles = useMemo(
    () => (picked.versionInfo ? manifestRolesOf(picked.versionInfo) : NO_ROLES),
    [picked.versionInfo]
  );
  const roleHints = useMemo(() => roleHintsOf(picked.versionInfo), [picked.versionInfo]);
  const omit = useMemo(() => answeredFieldNames(manifestRoles), [manifestRoles]);
  const { artifacts, loadArtifacts } = feeds;

  useEffect(() => {
    if (manifestRoles.length === 0 || !Array.isArray(artifacts)) {
      return;
    }
    update(current => {
      const seeded = seedRolePicks(current.roles, manifestRoles, artifacts, fieldConfig);
      return { roles: seeded.roles, properties: { ...current.properties, ...seeded.answers } };
    });
  }, [manifestRoles, artifacts, fieldConfig, update]);

  const { templateSources, sourcesLoaded } = feeds;
  const packageBoxUrl = form.fromPackage.has('settings.box_url') ? form.settings.box_url : '';

  useEffect(() => {
    if (!sourcesLoaded) {
      return;
    }
    update(current =>
      current.typed.has('sourceFilter')
        ? {}
        : { sourceFilter: sourceFilterDefaultOf(templateSources, packageBoxUrl) }
    );
  }, [sourcesLoaded, templateSources, packageBoxUrl, update]);

  const follow = useTaskFollow({
    id,
    onEnd: row => {
      update(current => ({
        downloads: Object.fromEntries(
          Object.entries(current.downloads).filter(
            ([, entry]) => String(entry.task_id) !== String(row.id)
          )
        ),
      }));
      if (row.status === 'completed') {
        loadArtifacts();
        return;
      }
      notify(
        'danger',
        t('machineEdit.machineCreateModal.downloadFailed', {
          message: row.error_message || row.status,
        })
      );
    },
  });

  const fetchArtifact = (artifact, key) =>
    fetchMissingArtifact(status, id, artifact.id).then(
      answer => {
        const row = queuedTaskOf(answer, '');
        const taskId = String(row?.id || answer?.task_id || '');
        update(current => ({
          downloads: {
            ...current.downloads,
            [key]: { task_id: taskId, artifact_id: String(artifact.id) },
          },
        }));
        follow(answer);
        notify(
          'success',
          t('machineEdit.machineCreateModal.downloadQueued', { filename: artifact.filename })
        );
      },
      error =>
        notify(
          'danger',
          t('machineEdit.machineCreateModal.downloadFailed', { message: error.message })
        )
    );

  const seeded = useRef(false);
  const provisionerSeeded = useRef('');
  const seedFamily = seedFamilyOf(seed?.provisioner);
  const seedBox = useMemo(() => seedBoxOf(seed, server?.capabilities?.hypervisors), [seed, server]);
  const install = useProvisionerInstall({
    status,
    id,
    server,
    seed,
    provisioners: feeds.provisioners,
    loaded: feeds.provisionersLoaded,
    onInstalled: feeds.loadProvisioners,
    readCatalogs: feeds.loadCatalogSources,
  });
  const source = useTemplateSource({
    status,
    id,
    box: seedBox,
    sources: feeds.templateSources,
    loaded: feeds.sourcesLoaded,
    onAdded: feeds.loadCatalogs,
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
    if (!seedBox || seeded.current) {
      return;
    }
    seeded.current = true;
    update(current => ({
      boxPickCustom: true,
      settings: { ...current.settings, ...seedBox },
      typed: withTyped(
        current.typed,
        BOX_SETTING_KEYS.map(key => `settings.${key}`)
      ),
    }));
  }, [seedBox, update]);

  useEffect(() => {
    if (seedFamily) {
      set({ useProvisioner: true });
    }
  }, [seedFamily, set]);

  const [pickOpen, setPickOpen] = useState(false);

  useEffect(() => {
    if (!defaultDomain) {
      return;
    }
    update(current =>
      current.nameText && !current.nameText.includes('.') && !current.settings.domain
        ? { settings: { ...current.settings, ...nameParts(current.nameText, defaultDomain) } }
        : {}
    );
  }, [defaultDomain, form.nameText, update]);

  const { pickProvisioner, changeVersion, family: pickedFamily } = picked;

  useEffect(() => {
    if (!seedFamily || provisionerSeeded.current) {
      return;
    }
    const held = feeds.provisioners.find(collection => collection.name === seedFamily);
    if (!held) {
      return;
    }
    provisionerSeeded.current = 'picked';
    const versions = held.versions || [];
    const named = seed?.provisioner_version || '';
    const chosen =
      versions.find(entry => entry.version === named || entry.dir === named)?.version ||
      highestVersionOf(versions.map(entry => entry.version));
    pickProvisioner(seedFamily, chosen);
  }, [seedFamily, seed, feeds.provisioners, pickProvisioner]);

  useEffect(() => {
    if (!wantedVersion.current || !pickedFamily) {
      return;
    }
    const landed = (pickedFamily.versions || []).find(
      entry => entry.version === wantedVersion.current
    );
    if (landed) {
      wantedVersion.current = '';
      changeVersion(landed.version);
    }
  }, [pickedFamily, changeVersion]);

  const { loadZfs, loadMedia, loadUplinks, loadIpSuggestions, loadProvisioningNetwork } = feeds;
  const loadedStep = useRef('');

  useEffect(() => {
    if (loadedStep.current === stepId) {
      return;
    }
    loadedStep.current = stepId;
    if (stepId === 'os-disks') {
      loadZfs();
      loadMedia();
    }
    if (stepId === 'network') {
      loadUplinks().then(({ uplink }) => {
        if (uplink) {
          update(current => ({ networks: withDefaultUplink(current.networks, uplink) }));
        }
      });
      loadIpSuggestions();
      loadProvisioningNetwork();
    }
  }, [stepId, loadZfs, loadMedia, loadUplinks, loadIpSuggestions, loadProvisioningNetwork, update]);

  const provisioningRow = useMemo(
    () => provisioningNetworkOf(feeds.provisioningNetwork, feeds.ipSuggestions),
    [feeds.provisioningNetwork, feeds.ipSuggestions]
  );

  useEffect(() => {
    if (!provisioningRow) {
      return;
    }
    update(current => {
      if (current.typed.has('networks')) {
        return { provisioningRow };
      }
      const place = current.fromPackage.has('networks.0')
        ? fillProvisioningNetwork
        : withProvisioningNetwork;
      return { provisioningRow, networks: place(current.networks, provisioningRow) };
    });
  }, [provisioningRow, update]);

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

  const spec = (mode = CREATE_MODES.create) => {
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
      ...mode,
      version: picked.version,
      properties: pruneHidden(fieldConfig, form.properties, form.roles),
      hardwarePayload,
      fieldConfig,
      manifestRoles,
      bhyve,
      vbox,
    });
  };

  const fieldErrorsOf = step =>
    step === 'provisioning' && fieldConfig
      ? validateAnswers(fieldConfig, form.properties, form.roles, t)
      : {};

  const problemTextOf = step => {
    const key = stepProblemOf(step, form);
    if (key) {
      return t(key);
    }
    const names = Object.keys(fieldErrorsOf(step));
    return names.length > 0
      ? t('machineEdit.machineCreateModal.fixHighlightedFields', {
          count: names.length,
          names: names.join(', '),
        })
      : '';
  };

  const problemOf = step => {
    if (step === 'provisioning') {
      setFieldErrors(fieldErrorsOf(step));
    }
    return problemTextOf(step);
  };

  const goTo = step => {
    setProblem('');
    setStepIndex(steps.indexOf(step));
  };

  const next = () => {
    const refused = problemOf(stepId);
    if (refused) {
      setProblem(refused);
      return;
    }
    goTo(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  };

  const body = stepId === 'confirm' ? JSON.stringify(spec()) : '';
  const previewSeq = useRef(0);

  useEffect(() => {
    if (!body) {
      return;
    }
    previewSeq.current += 1;
    const seq = previewSeq.current;
    previewMachine(status, id, JSON.parse(body)).then(
      answer => {
        if (seq !== previewSeq.current) {
          return;
        }
        setPreviewAnswer({
          body,
          yaml: typeof answer?.yaml === 'string' ? answer.yaml : '',
          warnings: listOf(answer?.warnings).map(String),
          error: '',
          fields: NO_FIELDS,
        });
      },
      error => {
        if (seq !== previewSeq.current) {
          return;
        }
        const refused = fieldMapOf(error);
        setPreviewAnswer({
          body,
          yaml: '',
          warnings: [],
          error: error.message || '',
          fields: refused,
        });
        if (Object.keys(refused).length > 0) {
          setFieldErrors(refused);
        }
      }
    );
  }, [body, status, id]);

  const preview = {
    ...previewAnswer,
    state: previewStateOf(previewAnswer, body),
  };

  const catalogUpdate = useMemo(
    () => catalogUpdateOf(feeds.catalogs, pickedFamily),
    [feeds.catalogs, pickedFamily]
  );

  const followUpdate = useTaskFollow({
    id,
    onEnd: row => {
      if (row.status === 'completed') {
        feeds.loadProvisioners();
        return;
      }
      wantedVersion.current = '';
      notify('danger', row.error_message || row.status);
    },
  });

  const installUpdate = useCallback(
    ({ version, source: sourceId }) =>
      installFromCatalog(status, id, {
        ...(sourceId && { source_name: sourceId }),
        name: form.familyName,
        version,
      }).then(
        answer => {
          wantedVersion.current = version;
          followUpdate(answer);
        },
        error => notify('danger', error.message)
      ),
    [status, id, form.familyName, followUpdate, notify]
  );
  const closeCatalog = useCallback(() => setCatalogOpen(false), []);
  const heldVersions = useMemo(
    () =>
      listOf(pickedFamily?.versions)
        .map(entry => entry.version)
        .filter(Boolean),
    [pickedFamily]
  );

  const naming = {
    setNameText: text =>
      update(current => ({
        nameText: text,
        settings: { ...current.settings, ...nameParts(text, defaultDomain) },
        typed: withTyped(current.typed, ['settings.hostname', 'settings.domain']),
      })),
    setNamePart: (key, value) =>
      update(current => {
        const settings = { ...current.settings, [key]: value };
        return {
          settings,
          nameText: settings.domain ? `${settings.hostname}.${settings.domain}` : settings.hostname,
          typed: withTyped(current.typed, [`settings.${key}`]),
        };
      }),
  };

  const domain = {
    choices: chain.choices,
    missing: chain.missing,
    configRoute: chain.configRoute,
  };

  const provisioner = {
    familyName: form.familyName,
    versionKey: form.versionKey,
    update: catalogUpdate,
    onCatalog: () => setCatalogOpen(true),
    onOpen: () => setPickOpen(true),
    onClear: picked.clearProvisioner,
  };

  const marks = useMemo(
    () => marksOf(form.fromPackage, form.typed),
    [form.fromPackage, form.typed]
  );

  const create = async (mode = CREATE_MODES.create) => {
    const failing = steps
      .map(step => ({ step, refused: problemOf(step) }))
      .find(entry => entry.refused);
    if (failing) {
      setProblem(failing.refused);
      setStepIndex(steps.indexOf(failing.step));
      return;
    }
    setProblem('');
    const payload = spec(mode);
    const fallback = payload.name || `${form.settings.hostname}.${form.settings.domain}`;
    const { answer, error } = await tools.send({
      id,
      name: fallback,
      call: () => createMachine(status, id, payload),
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
    if (made.requiresDownload) {
      notify(
        'info',
        t('machineEdit.machineCreateModal.templateDownloadQueued', { box: form.settings.box })
      );
    }
    if (made.waitedOn > 0) {
      notify('info', t('machineEdit.machineCreateModal.waitedOn', { count: made.waitedOn }));
    }
    onClose();
  };

  const wizard = {
    stepId,
    form,
    feeds,
    set,
    update,
    setter,
    setSetting,
    setZone,
    setDisks,
    setNetworks,
    setTyped,
    naming,
    domain,
    provisioner,
    preview,
    marks,
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
    fieldInventory,
    install,
    availablePools,
    bhyveBootDevices,
    spec,
    openBoxVault: () => setBoxVaultOpen(true),
    source,
    seedBox,
    manifestRoles,
    roleHints,
    omit,
    fetchArtifact,
  };
  const downloadsQueued = Object.keys(form.downloads).length;
  const confirming = stepId === 'confirm';
  const guard = useDiscardGuard(dirtyOf(form, Boolean(seedBox)), onClose);

  const submit = event => {
    event.preventDefault();
    if (confirming) {
      create();
    } else {
      next();
    }
  };

  const submitButton = (
    <button
      type="submit"
      className="btn btn-primary"
      data-action="submit"
      data-waits={confirming && downloadsQueued > 0 ? downloadsQueued : undefined}
      disabled={busy}
    >
      {confirming
        ? t(
            downloadsQueued > 0
              ? 'machineEdit.machineCreateModal.createWaiting'
              : 'machineEdit.machineCreateModal.create',
            { count: downloadsQueued }
          )
        : t('machineEdit.machineCreateModal.next')}
    </button>
  );

  return (
    <>
      <Modal show onHide={guard.close} dialogClassName="form-modal" scrollable>
        <form onSubmit={submit} noValidate data-dialog="machine-create" data-step={stepId}>
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {t('machineEdit.machineCreateModal.createTitle', { resource: noun })}
            </Modal.Title>
          </Modal.Header>
          <div
            className="modal-header py-2 flex-wrap align-items-start gap-2"
            data-bar="wizard-nav"
          >
            <StepPills
              steps={steps}
              stepId={stepId}
              open={step => stepOpen(form, step, problemTextOf)}
              busy={busy}
              onPick={goTo}
            />
            <WizardNav
              busy={busy}
              backHeld={stepIndex === 0}
              onBack={() => goTo(steps[Math.max(stepIndex - 1, 0)])}
              onCancel={guard.close}
              submitButton={submitButton}
              confirming={confirming}
              onCreate={create}
              provisionHeld={!form.familyName}
            />
          </div>
          <Modal.Body>
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
            <div className="form-check form-switch me-auto">
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
          </Modal.Footer>
        </form>
      </Modal>
      <DiscardPrompt {...guard.prompt} />
      {pickOpen ? (
        <ProvisionerPickModal
          status={status}
          id={id}
          sources={feeds.catalogs.sources}
          families={feeds.provisioners}
          owner={pickOwnerOf(server, appStatus, id)}
          picked={pickedOf(form)}
          busy={busy}
          onPick={(name, version) => {
            setPickOpen(false);
            pickProvisioner(name, version);
          }}
          onClose={() => setPickOpen(false)}
        />
      ) : null}
      {catalogOpen && pickedFamily ? (
        <VersionCatalogModal
          catalogs={feeds.catalogs}
          family={pickedFamily.name}
          held={heldVersions}
          busy={busy}
          onInstall={installUpdate}
          onClose={closeCatalog}
        />
      ) : null}
      {boxVaultOpen ? (
        <BoxVaultPickerModal
          user={user}
          onClose={() => setBoxVaultOpen(false)}
          onPicked={pick => {
            update(current => ({
              boxPickCustom: true,
              settings: {
                ...current.settings,
                box: `${pick.orgSlug}/${pick.boxName}`,
                box_version: pick.version,
                box_arch: pick.architecture,
                box_url: pick.downloadUrl,
              },
              typed: withTyped(
                current.typed,
                BOX_SETTING_KEYS.map(key => `settings.${key}`)
              ),
            }));
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
