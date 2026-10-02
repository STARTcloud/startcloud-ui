import { hostHasHypervisor } from './capabilities';
import { filesystemEntries } from './machineHelpers';
import {
  asFormString,
  buildDeviceChanges,
  buildHardwareChanges,
  buildScalarChanges,
  buildSeed,
  buildUtmSection,
  buildZoneChanges,
  cpuChangesOf,
  seededUtmArgs,
} from './machineSettings';

export const EMPTY_TOPO = { sockets: '', cores: '', threads: '' };

/**
 * The Settings form with nothing seeded and nothing added.
 *
 * @returns {Object} The form
 */
export const initialForm = () => ({
  values: {},
  initial: {},
  autoboot: '',
  guestAgent: null,
  bootOrder: [],
  bootPriority: '',
  consolePort: '',
  consoleHost: '',
  cpuMode: '',
  cpuTopo: EMPTY_TOPO,
  vboxJson: '',
  addNics: [],
  addDisks: [],
  addCdroms: [],
  addControllers: [],
  removeAttachments: [],
  removeControllerNames: [],
  removeNicAdapters: [],
  hardware: {},
  serialRows: [],
  parallelRows: [],
  nicRows: [],
  creds: {},
  credsTouched: [],
  addFilesystems: [],
  removeFilesystems: [],
  addZoneDisks: [],
  removeZoneDisks: [],
  removeZoneCdroms: [],
  removeZoneNics: [],
  zoneNicEdits: {},
  cloudInit: {},
  utmNotes: '',
  utmQemuArgs: '',
});

/**
 * The Settings form seeded from a machine's detail, `knob_current` over
 * the configuration, with the seed it is diffed against.
 *
 * @param {Object|null} configuration - The detail's `configuration`
 * @param {Object|null} knobCurrent - The detail's `knob_current`
 * @returns {{ form: Object, seed: Object }} The form and its seed
 */
export const seededForm = (configuration, knobCurrent) => {
  const seed = buildSeed(configuration, knobCurrent);
  return {
    seed,
    form: {
      ...initialForm(),
      values: seed.values,
      initial: seed.values,
      autoboot: seed.autoboot,
      guestAgent: seed.guestAgent,
      bootOrder: [...seed.bootOrder],
      bootPriority: seed.bootPriority,
      consolePort: seed.consolePort,
      consoleHost: seed.consoleHost,
      cpuTopo: seed.cpuTopology || EMPTY_TOPO,
      hardware: seed.hardware,
      serialRows: seed.serialRows,
      parallelRows: seed.parallelRows,
      nicRows: seed.nicRows,
      creds: seed.creds,
      utmNotes: asFormString(knobCurrent?.utm?.notes ?? configuration?.utm?.notes),
      utmQemuArgs: seededUtmArgs(knobCurrent, configuration),
    },
  };
};

const sameEntry = (a, b) =>
  a.controller === b.controller && a.port === b.port && a.device === b.device;

const toggledName = (list, name) =>
  list.includes(name) ? list.filter(entry => entry !== name) : [...list, name];

/**
 * Whether a media attachment is marked for removal.
 *
 * @param {Object} form - The form
 * @param {Object} entry - The attachment, `{ controller, port, device }`
 * @returns {boolean} True when marked
 */
export const isMarkedAttachment = (form, entry) =>
  form.removeAttachments.some(item => sameEntry(item, entry));

/**
 * The writers of the Settings form over one `setForm`, each a functional
 * update so a writer never closes over a stale form: `update` of one key
 * by value or by function, `set` and `toggleIn` curried by key, the
 * attachment mark, a hardware section's value, a credential with its
 * touched mark, and a zone NIC's edit and net property.
 *
 * @param {Function} setForm - The state setter
 * @returns {Object} The writers
 */
export const formTools = setForm => {
  const update = (key, next) =>
    setForm(prev => ({ ...prev, [key]: typeof next === 'function' ? next(prev[key]) : next }));
  const updateZoneNic = (physical, change) =>
    update('zoneNicEdits', edits => ({
      ...edits,
      [physical]: { ...(edits[physical] || {}), ...change(edits[physical] || {}) },
    }));
  return {
    update,
    set: key => value => update(key, value),
    toggleIn: key => value => update(key, list => toggledName(list, value)),
    toggleAttachment: entry =>
      update('removeAttachments', list =>
        list.some(item => sameEntry(item, entry))
          ? list.filter(item => !sameEntry(item, entry))
          : [
              ...list,
              {
                controller: entry.controller,
                port: entry.port,
                device: entry.device,
                kind: entry.kind,
              },
            ]
      ),
    setHardwareValue: (sectionId, key, value) =>
      update('hardware', hardware => ({
        ...hardware,
        [sectionId]: { ...(hardware[sectionId] || {}), [key]: value },
      })),
    setCred: (key, value) =>
      setForm(prev => ({
        ...prev,
        creds: { ...prev.creds, [key]: value },
        credsTouched: prev.credsTouched.includes(key)
          ? prev.credsTouched
          : [...prev.credsTouched, key],
      })),
    editZoneNic: (physical, key, value) => updateZoneNic(physical, () => ({ [key]: value })),
    editZoneNicProp: (physical, propKey, value) =>
      updateZoneNic(physical, current => ({
        props: { ...(current.props || {}), [propKey]: value },
      })),
  };
};

/**
 * The body of `PUT machines/{name}` a Settings form sends, the changed
 * members alone, or the key of the sentence that says why none can be
 * sent: a complex CPU topology with a field blank, a `vbox` passthrough
 * that is no JSON, or nothing changed.
 *
 * @param {Object} options - The form, its seed and what it is for
 * @returns {{ changes: Object|null, problemKey: string }} The body or the problem
 */
export const changesOf = ({
  form,
  seed,
  isUtm,
  server,
  knobCurrent,
  configuration,
  resourceChanges,
}) => {
  const changes = buildScalarChanges({
    ...form,
    seed,
    isUtm,
    utmSection: isUtm
      ? buildUtmSection({
          knobCurrent,
          configuration,
          utmNotes: form.utmNotes,
          utmQemuArgs: form.utmQemuArgs,
        })
      : null,
  });
  const cpu = cpuChangesOf(form.cpuMode, form.cpuTopo);
  if (cpu.problemKey) {
    return { changes: null, problemKey: cpu.problemKey };
  }
  Object.assign(changes, cpu.changes);
  const filesystemAdds = filesystemEntries(form.addFilesystems);
  if (filesystemAdds.length > 0) {
    changes.add_filesystems = filesystemAdds;
  }
  if (form.removeFilesystems.length > 0) {
    changes.remove_filesystems = form.removeFilesystems;
  }
  Object.assign(
    changes,
    buildZoneChanges(form),
    buildDeviceChanges(form),
    buildHardwareChanges({ ...form, seed })
  );
  if (form.vboxJson.trim()) {
    try {
      changes.vbox = { ...(changes.vbox || {}), ...JSON.parse(form.vboxJson) };
    } catch {
      return { changes: null, problemKey: 'machineEdit.machineSettings.vboxJsonInvalid' };
    }
  }
  if (!isUtm && hostHasHypervisor(server, 'bhyve') && resourceChanges) {
    Object.assign(changes, resourceChanges);
  }
  if (Object.keys(changes).length === 0) {
    return { changes: null, problemKey: 'machineEdit.machineSettings.nothingChanged' };
  }
  return { changes, problemKey: '' };
};
