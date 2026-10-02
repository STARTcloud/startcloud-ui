import { hostHasHypervisor } from './capabilities';
import { HARDWARE_SECTIONS, buildPortsPayload, diffHardwarePayload } from './hardwareSections';
import { cdromEntry, withAddressing } from './machineHelpers';

/**
 * The scalar knobs of the General tab, hyperweaver-ui's fields: the key
 * the modify wire reads, whether the agent takes free text beyond a
 * served vocabulary, an agent-stated option set where one exists, and
 * whether the knob exists on bhyve alone.
 */
export const FIELDS = [
  { key: 'ram', placeholder: 'e.g. 4G' },
  { key: 'vcpus', placeholder: 'e.g. 4' },
  { key: 'bootrom', freeText: true },
  { key: 'hostbridge', freeText: true },
  { key: 'diskif', hint: true },
  { key: 'netif' },
  { key: 'os_type' },
  { key: 'vnc', freeText: true, hint: true },
  { key: 'acpi' },
  { key: 'xhci' },
  { key: 'uefivars', options: ['on', 'off'], hint: true, bhyveOnly: true },
  { key: 'rng', options: ['on', 'off'], hint: true, bhyveOnly: true },
  {
    key: 'bootorder',
    placeholder: 'cd, dc, or bootdisk,cdrom0,net0=pxe',
    hint: true,
    freeText: true,
    bhyveOnly: true,
  },
  { key: 'bootnext', placeholder: 'e.g. cdrom0', hint: true, freeText: true, bhyveOnly: true },
];

const CONFIG_KEY_ALIASES = { os_type: 'type' };

const OWN_TABS = ['autostart', 'usb'];

export const SECTION_TABS = HARDWARE_SECTIONS.filter(section => !OWN_TABS.includes(section.id));

/**
 * The tabs of the Settings page: the VirtualBox knob sections, the ports,
 * the USB panel and the raw passthrough on a host that names
 * `virtualbox`, the filesystems and the resource controls on a host that
 * names `bhyve`.
 */
export const TABS = [
  { id: 'general' },
  { id: 'credentials' },
  { id: 'storage' },
  ...SECTION_TABS.map(section => ({ id: section.id, vboxOnly: true })),
  { id: 'ports', vboxOnly: true },
  { id: 'nics' },
  { id: 'usb', vboxOnly: true },
  { id: 'filesystems', bhyveOnly: true },
  { id: 'resources', bhyveOnly: true },
  { id: 'advanced', vboxOnly: true },
];

export const CRED_FIELDS = [
  { key: 'vagrant_user' },
  { key: 'vagrant_user_pass', isSecret: true },
  { key: 'vagrant_user_private_key_path', isPath: true },
];

export const IMMEDIATE_KEYS = [
  'boot_priority',
  'consoleport',
  'consolehost',
  'vagrant_user',
  'vagrant_user_pass',
  'vagrant_user_private_key_path',
];

const NIC_TUNING_KEYS = [
  'cable_connected',
  'promisc',
  'speed',
  'boot_prio',
  'bandwidth_group',
  'nic_type',
  'remove_on_completion',
];

/**
 * A knob's value as the form holds it: a list joined by commas, an object
 * by its `enabled`, nothing as the empty string.
 *
 * @param {*} value - The value `knob_current` or the configuration carries
 * @returns {string} The form value
 */
export const asFormString = value => {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(',');
  }
  if (typeof value === 'object') {
    return value.enabled === undefined ? '' : String(value.enabled);
  }
  return String(value);
};

const prefillFrom = (configuration, knobCurrent) =>
  Object.fromEntries(
    FIELDS.map(field => {
      const value =
        knobCurrent?.[field.key] ??
        configuration?.[field.key] ??
        configuration?.[CONFIG_KEY_ALIASES[field.key]];
      return [field.key, asFormString(value)];
    })
  );

const seedHardwareValues = knobCurrent => {
  const seeded = {};
  HARDWARE_SECTIONS.forEach(section => {
    const current = knobCurrent?.vbox?.[section.id];
    if (!current) {
      return;
    }
    const values = {};
    section.fields.forEach(field => {
      if (current[field.key] !== undefined && current[field.key] !== null) {
        values[field.key] = String(current[field.key]);
      }
    });
    if (Object.keys(values).length > 0) {
      seeded[section.id] = values;
    }
  });
  return seeded;
};

const seedSerialRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-serial-${entry.port}`,
    port: asFormString(entry.port),
    io_base: asFormString(entry.io_base),
    irq: asFormString(entry.irq),
    mode: asFormString(entry.mode),
    type: asFormString(entry.type),
  }));

const seedParallelRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-parallel-${entry.port}`,
    port: asFormString(entry.port),
    io_base: asFormString(entry.io_base),
    irq: asFormString(entry.irq),
    device: asFormString(entry.device),
  }));

const cableFormValue = value => {
  if (value === true) {
    return 'on';
  }
  if (value === false) {
    return 'off';
  }
  return asFormString(value);
};

const seedNicRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-nic-${entry.adapter}`,
    adapter: asFormString(entry.adapter),
    cable_connected: cableFormValue(entry.cable_connected),
    promisc: asFormString(entry.promisc),
    speed: asFormString(entry.speed),
    boot_prio: asFormString(entry.boot_prio),
    bandwidth_group: asFormString(entry.bandwidth_group),
    nic_type: asFormString(entry.nic_type),
    remove_on_completion:
      entry.remove_on_completion === undefined ? '' : String(entry.remove_on_completion),
  }));

const seedCreds = (configuration, knobCurrent) => ({
  vagrant_user: asFormString(
    knobCurrent?.credentials?.vagrant_user ?? configuration?.settings?.vagrant_user
  ),
  vagrant_user_pass: asFormString(
    knobCurrent?.credentials?.vagrant_user_pass ?? configuration?.settings?.vagrant_user_pass
  ),
  vagrant_user_private_key_path: asFormString(
    knobCurrent?.credentials?.vagrant_user_private_key_path ??
      configuration?.settings?.vagrant_user_private_key_path
  ),
});

/**
 * Everything the Settings form seeds from, the base every submit diffs
 * against: the scalar knobs from `knob_current` over the configuration,
 * the autoboot, the guest agent knob (null while the agent reports
 * none), the boot priority, the console port and host, the boot order,
 * the CPU topology, the VirtualBox hardware sections, the serial,
 * parallel and NIC rows and the credentials.
 *
 * @param {Object|undefined} configuration - The detail's `configuration`
 * @param {Object|undefined} knobCurrent - The detail's `knob_current`
 * @returns {Object} The seed
 */
export const buildSeed = (configuration, knobCurrent) => ({
  values: prefillFrom(configuration, knobCurrent),
  autoboot: asFormString(knobCurrent?.autoboot ?? configuration?.autoboot),
  guestAgent: typeof knobCurrent?.guest_agent === 'boolean' ? knobCurrent.guest_agent : null,
  bootPriority: asFormString(knobCurrent?.boot_priority),
  consolePort: asFormString(knobCurrent?.consoleport),
  consoleHost: asFormString(knobCurrent?.consolehost),
  bootOrder: Array.isArray(knobCurrent?.boot_order) ? knobCurrent.boot_order : [],
  cpuTopology: knobCurrent?.cpu_topology ?? null,
  hardware: seedHardwareValues(knobCurrent),
  serialRows: seedSerialRows(knobCurrent?.vbox?.serial),
  parallelRows: seedParallelRows(knobCurrent?.vbox?.parallel),
  nicRows: seedNicRows(knobCurrent?.nics),
  creds: seedCreds(configuration, knobCurrent),
});

const rowsChanged = (rows, seededRows) => JSON.stringify(rows) !== JSON.stringify(seededRows);

const cleanNicProps = props => {
  const cleaned = Object.fromEntries(
    Object.entries(props || {})
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

const nicTuningValue = (key, value) => {
  if (key === 'cable_connected') {
    return value === 'on';
  }
  if (key === 'remove_on_completion') {
    return value === 'true';
  }
  if (key === 'speed' || key === 'boot_prio') {
    return Number(value);
  }
  return String(value).trim();
};

const trimmed = value => (typeof value === 'string' ? value.trim() : '');

const addNicEntry = row => {
  const entry = {};
  if (trimmed(row.bridge)) {
    entry.global_nic = trimmed(row.bridge);
  }
  if (trimmed(row.mac)) {
    entry.mac_addr = trimmed(row.mac);
  }
  if (trimmed(row.physical)) {
    entry.physical = trimmed(row.physical);
  }
  if (row.vlan_id !== undefined && row.vlan_id !== '') {
    entry.vlan_id = Number(row.vlan_id);
  }
  ['allowed_address', 'address', 'defrouter'].forEach(key => {
    if (trimmed(row[key])) {
      entry[key] = trimmed(row[key]);
    }
  });
  const addProps = cleanNicProps(row.props);
  if (addProps) {
    entry.props = addProps;
  }
  NIC_TUNING_KEYS.forEach(key => {
    const value = row[key] ?? '';
    if (value !== '') {
      entry[key] = nicTuningValue(key, value);
    }
  });
  return entry;
};

const diskEntry = row => {
  const base =
    row.mode === 'existing'
      ? row.path.trim() && { type: 'image', path: row.path.trim() }
      : row.size.trim() && { type: 'blank', size: row.size.trim() };
  return base && withAddressing(base, row);
};

const removalsOf = (entries, kind) =>
  entries
    .filter(entry => entry.kind === kind)
    .map(entry => ({ controller: entry.controller, port: entry.port, device: entry.device }));

/**
 * The device families of the modify body from the Storage and NICs tabs:
 * `add_nics`, `add_disks`, `add_cdroms`, `add_controllers`,
 * `remove_controllers`, `remove_disks`, `remove_cdroms` and
 * `remove_nics`, each only while the tab holds something.
 *
 * @param {Object} state - The tabs' rows and marks
 * @returns {Object} The families
 */
export const buildDeviceChanges = state => {
  const changes = {};
  const nics = state.addNics.map(addNicEntry).filter(entry => Object.keys(entry).length > 0);
  if (nics.length > 0) {
    changes.add_nics = nics;
  }
  const disks = state.addDisks.map(diskEntry).filter(Boolean);
  if (disks.length > 0) {
    changes.add_disks = disks;
  }
  const cdroms = state.addCdroms
    .map(row => {
      const base = cdromEntry(row);
      return base && withAddressing(base, row);
    })
    .filter(Boolean);
  if (cdroms.length > 0) {
    changes.add_cdroms = cdroms;
  }
  const controllers = state.addControllers
    .filter(row => row.type)
    .map(row => ({ ...(row.name.trim() && { name: row.name.trim() }), type: row.type }));
  if (controllers.length > 0) {
    changes.add_controllers = controllers;
  }
  if (state.removeControllerNames.length > 0) {
    changes.remove_controllers = state.removeControllerNames;
  }
  const removeDiskEntries = removalsOf(state.removeAttachments, 'disk');
  if (removeDiskEntries.length > 0) {
    changes.remove_disks = removeDiskEntries;
  }
  const removeCdromEntries = removalsOf(state.removeAttachments, 'cdrom');
  if (removeCdromEntries.length > 0) {
    changes.remove_cdroms = removeCdromEntries;
  }
  if (state.removeNicAdapters.length > 0) {
    changes.remove_nics = state.removeNicAdapters;
  }
  return changes;
};

/**
 * The `nics` entries of the adapters whose tuning changed against the
 * seed, an adapter marked for removal never tuned and an entry with
 * nothing but its adapter dropped.
 *
 * @param {Array<Object>} rows - The tuning rows
 * @param {Array<Object>} seededRows - The seeded rows
 * @param {Array<number>} removedAdapters - The adapters marked for removal
 * @returns {Array<Object>} The entries
 */
export const changedNicEntries = (rows, seededRows, removedAdapters) =>
  rows
    .filter(row => row.adapter !== '' && !removedAdapters.includes(Number(row.adapter)))
    .map(row => {
      const seeded = seededRows.find(entry => entry.adapter === row.adapter) || {};
      const entry = { adapter: Number(row.adapter) };
      NIC_TUNING_KEYS.forEach(key => {
        const value = row[key] ?? '';
        if (value === '' || value === (seeded[key] ?? '')) {
          return;
        }
        entry[key] = nicTuningValue(key, value);
      });
      return entry;
    })
    .filter(entry => Object.keys(entry).length > 1);

/**
 * The `vbox` and `nics` families of the modify body, the hardware
 * sections diffed against the seed, the serial and parallel rows whole
 * when any row differs, and the per-adapter tuning that changed.
 *
 * @param {Object} state - The hardware, the port rows, the NIC rows, the removals and the seed
 * @returns {Object} The families
 */
export const buildHardwareChanges = state => {
  const changes = {};
  const hardware = diffHardwarePayload(state.hardware, state.seed.hardware) || {};
  if (rowsChanged(state.serialRows, state.seed.serialRows)) {
    const serial = buildPortsPayload(state.serialRows);
    if (serial.length > 0) {
      hardware.serial = serial;
    }
  }
  if (rowsChanged(state.parallelRows, state.seed.parallelRows)) {
    const parallel = buildPortsPayload(state.parallelRows);
    if (parallel.length > 0) {
      hardware.parallel = parallel;
    }
  }
  if (Object.keys(hardware).length > 0) {
    changes.vbox = hardware;
  }
  const nics = changedNicEntries(state.nicRows, state.seed.nicRows, state.removeNicAdapters);
  if (nics.length > 0) {
    changes.nics = nics;
  }
  return changes;
};

/**
 * One `update_nics` entry of a zone, the VNIC it selects and the keys the
 * person set; null while nothing but the selector would ride.
 *
 * @param {string} physical - The VNIC name
 * @param {Object} patch - The edits
 * @returns {Object|null} The entry
 */
export const zoneNicUpdateEntry = (physical, patch) => {
  const entry = { physical };
  if (trimmed(patch.global_nic)) {
    entry.global_nic = trimmed(patch.global_nic);
  }
  if (patch.vlan_id !== undefined && patch.vlan_id !== '') {
    entry.vlan_id = Number(patch.vlan_id);
  }
  ['mac_addr', 'allowed_address', 'address', 'defrouter'].forEach(key => {
    if (trimmed(patch[key])) {
      entry[key] = trimmed(patch[key]);
    }
  });
  const props = cleanNicProps(patch.props);
  if (props) {
    entry.props = props;
  }
  if (patch.remove_on_completion === 'true' || patch.remove_on_completion === 'false') {
    entry.remove_on_completion = patch.remove_on_completion === 'true';
  }
  return Object.keys(entry).length > 1 ? entry : null;
};

const zoneDiskAddEntry = row => {
  if (row.mode === 'existing') {
    return row.existing_dataset.trim() && { type: 'image', path: row.existing_dataset.trim() };
  }
  return {
    type: 'blank',
    sparse: row.sparse === true,
    ...(row.size.trim() && { size: row.size.trim() }),
    ...(row.volume_name.trim() && { volume_name: row.volume_name.trim() }),
    ...(row.pool.trim() && { pool: row.pool.trim() }),
    ...(row.dataset.trim() && { dataset: row.dataset.trim() }),
  };
};

/**
 * The zone families of the modify body: the zvol-shaped `add_disks`,
 * the `remove_disks`, `remove_cdroms` and `remove_nics` by attribute or
 * VNIC name, the in-place `update_nics` and the `cloud_init` object.
 *
 * @param {Object} state - The zone tabs' rows and marks
 * @returns {Object} The families
 */
export const buildZoneChanges = state => {
  const changes = {};
  const diskAdds = state.addZoneDisks.map(zoneDiskAddEntry).filter(Boolean);
  if (diskAdds.length > 0) {
    changes.add_disks = diskAdds;
  }
  if (state.removeZoneDisks.length > 0) {
    changes.remove_disks = state.removeZoneDisks;
  }
  if (state.removeZoneCdroms.length > 0) {
    changes.remove_cdroms = state.removeZoneCdroms;
  }
  if (state.removeZoneNics.length > 0) {
    changes.remove_nics = state.removeZoneNics;
  }
  const nicUpdates = Object.entries(state.zoneNicEdits)
    .filter(([physical]) => !state.removeZoneNics.includes(physical))
    .map(([physical, patch]) => zoneNicUpdateEntry(physical, patch))
    .filter(Boolean);
  if (nicUpdates.length > 0) {
    changes.update_nics = nicUpdates;
  }
  const cloudInitEntry = Object.fromEntries(
    Object.entries(state.cloudInit)
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  if (Object.keys(cloudInitEntry).length > 0) {
    changes.cloud_init = cloudInitEntry;
  }
  return changes;
};

/**
 * The scalar members of the modify body: the knobs that differ from the
 * seed, the utm section, the autoboot as a boolean, the guest agent
 * switch, the boot order, the boot priority as a number, the console
 * port (`dynamic` clearing the pin as null) and host, and every touched
 * credential as typed, an emptied one deleting the key.
 *
 * @param {Object} state - The form's values and the seed
 * @returns {Object} The members
 */
export const buildScalarChanges = state => {
  const { values, initial, seed, isUtm } = state;
  const changes = {};
  const diffableFields = isUtm
    ? FIELDS.filter(field => field.key === 'ram' || field.key === 'vcpus')
    : FIELDS;
  diffableFields.forEach(({ key }) => {
    if (values[key] !== initial[key] && values[key] !== '') {
      changes[key] = values[key];
    }
  });
  if (isUtm && state.utmSection) {
    changes.utm = state.utmSection;
  }
  if (state.autoboot !== '' && state.autoboot !== seed.autoboot) {
    changes.autoboot = state.autoboot === 'true';
  }
  if (seed.guestAgent !== null && state.guestAgent !== seed.guestAgent) {
    changes.guest_agent = state.guestAgent;
  }
  if (
    state.bootOrder.length > 0 &&
    JSON.stringify(state.bootOrder) !== JSON.stringify(seed.bootOrder)
  ) {
    changes.boot_order = state.bootOrder;
  }
  if (state.bootPriority !== '' && state.bootPriority !== seed.bootPriority) {
    changes.boot_priority = Number(state.bootPriority);
  }
  if (state.consolePort !== '' && state.consolePort !== seed.consolePort) {
    changes.consoleport =
      state.consolePort.trim().toLowerCase() === 'dynamic' ? null : Number(state.consolePort);
  }
  if (state.consoleHost !== '' && state.consoleHost !== seed.consoleHost) {
    changes.consolehost = state.consoleHost.trim();
  }
  state.credsTouched.forEach(key => {
    changes[key] = state.creds[key] ?? '';
  });
  return changes;
};

/**
 * The CPU topology members of the modify body: `cpu_configuration`
 * `complex` with `complex_cpu_conf` while every field is set, `simple`
 * for the plain count; the key of the sentence that says a complex
 * topology is incomplete otherwise.
 *
 * @param {string} cpuMode - `''`, `simple` or `complex`
 * @param {Object} cpuTopo - The sockets, cores and threads
 * @returns {{ changes: Object, problemKey: string }} The members and the problem
 */
export const cpuChangesOf = (cpuMode, cpuTopo) => {
  if (cpuMode === 'complex') {
    if (!cpuTopo.sockets || !cpuTopo.cores || !cpuTopo.threads) {
      return { changes: {}, problemKey: 'machineEdit.machineSettings.complexCpuTopologyRequired' };
    }
    return {
      changes: {
        cpu_configuration: 'complex',
        complex_cpu_conf: [
          {
            sockets: Number(cpuTopo.sockets),
            cores: Number(cpuTopo.cores),
            threads: Number(cpuTopo.threads),
          },
        ],
      },
      problemKey: '',
    };
  }
  return { changes: cpuMode === 'simple' ? { cpu_configuration: 'simple' } : {}, problemKey: '' };
};

/**
 * The mounts of a zone as its live view names them, `fs`, or the
 * document's `filesystems`.
 *
 * @param {Object|null} configuration - The detail's `configuration`
 * @returns {Array<Object>} The mounts
 */
export const filesystemsOf = configuration => {
  if (Array.isArray(configuration?.fs)) {
    return configuration.fs;
  }
  return Array.isArray(configuration?.filesystems) ? configuration.filesystems : [];
};

export const seededUtmArgs = (knobCurrent, configuration) =>
  (Array.isArray(knobCurrent?.utm?.qemu_args)
    ? knobCurrent.utm.qemu_args
    : configuration?.utm?.qemu_args || []
  ).join('\n');

/**
 * The changed `utm` section, the notes and the QEMU arguments; null while
 * neither changed.
 *
 * @param {Object} state - The knobs, the configuration and the form's values
 * @returns {Object|null} The section
 */
export const buildUtmSection = ({ knobCurrent, configuration, utmNotes, utmQemuArgs }) => {
  const seededNotes = asFormString(knobCurrent?.utm?.notes ?? configuration?.utm?.notes);
  const utmSection = {};
  if (utmNotes !== seededNotes) {
    utmSection.notes = utmNotes;
  }
  if (utmQemuArgs !== seededUtmArgs(knobCurrent, configuration)) {
    utmSection.qemu_args = utmQemuArgs
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
  return Object.keys(utmSection).length > 0 ? utmSection : null;
};

const flagOnlyEntries = list =>
  Array.isArray(list) &&
  list.every(entry =>
    Object.keys(entry).every(key => ['physical', 'adapter', 'remove_on_completion'].includes(key))
  );

/**
 * Whether a modify body carries the members the agent keeps at once
 * alone, which need no task, no restart and no choice while the machine
 * runs: the immediate keys and NIC entries that flip nothing but
 * remove-on-completion.
 *
 * @param {Object} changes - The body
 * @returns {boolean} True when everything applies at once
 */
export const immediateOnlyChanges = changes =>
  Object.keys(changes).every(
    key =>
      IMMEDIATE_KEYS.includes(key) ||
      ((key === 'update_nics' || key === 'nics') && flagOnlyEntries(changes[key]))
  );

/**
 * The boot tokens of a zone's real devices, the boot disk, the disks,
 * the CD-ROMs and the network resources by their short names.
 *
 * @param {Object} hardware - The hardware of `hardwareOf`
 * @returns {Array<string>} The tokens
 */
export const zoneBootDevicesOf = hardware =>
  hardware.zone
    ? [
        ...hardware.zone.disks.map(disk => disk.name),
        ...hardware.zone.cdroms.map(cdrom => cdrom.name),
        ...hardware.zone.nics.map(nic => nic.name),
      ]
    : [];

/**
 * The tabs a machine's Settings page draws: a UTM machine the general,
 * the credentials and the NICs tabs with the UTM tab; every other machine
 * the tabs the host's hypervisors offer.
 *
 * @param {boolean} isUtm - Whether the machine is on UTM
 * @param {Object|null} server - The host's own row
 * @returns {Array<{ id: string }>} The tabs
 */
export const visibleTabs = (isUtm, server) => {
  if (isUtm) {
    return [
      ...TABS.filter(entry => ['general', 'credentials', 'nics'].includes(entry.id)),
      { id: 'utm' },
    ];
  }
  return TABS.filter(entry => {
    if (entry.vboxOnly) {
      return hostHasHypervisor(server, 'virtualbox');
    }
    if (entry.bhyveOnly) {
      return hostHasHypervisor(server, 'bhyve');
    }
    return true;
  });
};

/**
 * The General tab's fields for one machine: the memory and the
 * processors alone on UTM, the bhyve-only knobs on a host that names
 * `bhyve`, each with its label and hint translated.
 *
 * @param {boolean} isUtm - Whether the machine is on UTM
 * @param {Object|null} server - The host's own row
 * @param {Function} t - The translator
 * @returns {Array<Object>} The fields
 */
export const editableFields = (isUtm, server, t) =>
  FIELDS.filter(field => {
    if (isUtm) {
      return field.key === 'ram' || field.key === 'vcpus';
    }
    return !field.bhyveOnly || hostHasHypervisor(server, 'bhyve');
  }).map(field => ({
    ...field,
    label: t(`machineEdit.machineSettings.field.${field.key}`),
    ...(field.hint && { hint: t(`machineEdit.machineSettings.fieldHint.${field.key}`) }),
  }));

export const knobValuesOf = defaults => defaults?.knob_values || null;

export const sectionForTab = tab => SECTION_TABS.find(section => section.id === tab) || null;

export const markButtonClass = isMarked => (isMarked ? 'btn-warning' : 'btn-outline-danger');

/**
 * The sentence that follows an apply's notice while the answer carries
 * `resource_warnings`, empty otherwise.
 *
 * @param {Object} answer - The agent's answer
 * @param {Function} t - The translator
 * @returns {string} The suffix
 */
export const warningsSuffix = (answer, t) => {
  const list = Array.isArray(answer.resource_warnings) ? answer.resource_warnings : [];
  if (list.length === 0) {
    return '';
  }
  return t('machineEdit.machineSettings.warningsSuffix', {
    list: list.map(warning => warning?.message || String(warning)).join('; '),
  });
};

/**
 * The first sentence of an apply's notice, the agent's own message or
 * the fallback, its trailing period dropped.
 *
 * @param {Object} answer - The agent's answer
 * @param {string} machineName - The machine
 * @param {Function} t - The translator
 * @returns {string} The sentence
 */
export const messageBase = (answer, machineName, t) =>
  (answer.message || t('machineEdit.machineSettings.changesAppliedTo', { machineName })).replace(
    /\.+$/u,
    ''
  );

export const pendingCount = answer => Object.keys(answer.pending_changes || {}).length;
