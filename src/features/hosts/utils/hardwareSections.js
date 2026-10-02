/**
 * The VirtualBox knob tree, `vbox.<section>.<key>`, hyperweaver-ui's
 * hardware sections: each field its key, its kind, `onoff`, `int` or
 * `string`, and the values it suggests where a list is known; a value
 * rides to the agent as typed.
 */
export const HARDWARE_SECTIONS = [
  {
    id: 'cpu',
    label: 'CPU',
    fields: [
      { key: 'hotplug', kind: 'onoff' },
      { key: 'execution_cap', kind: 'int', hint: '1-100 %' },
      { key: 'profile', kind: 'string', suggest: ['host'] },
      { key: 'pae', kind: 'onoff' },
      { key: 'long_mode', kind: 'onoff' },
      { key: 'hwvirtex', kind: 'onoff' },
      { key: 'nested_paging', kind: 'onoff' },
      { key: 'large_pages', kind: 'onoff' },
      { key: 'nested_hw_virt', kind: 'onoff' },
      { key: 'virt_vmsave_vmload', kind: 'onoff' },
      { key: 'vtx_vpid', kind: 'onoff' },
      { key: 'vtx_ux', kind: 'onoff' },
      { key: 'apic', kind: 'onoff' },
      { key: 'x2apic', kind: 'onoff' },
      { key: 'hpet', kind: 'onoff' },
      { key: 'spec_ctrl', kind: 'onoff' },
      { key: 'ibpb_on_vm_exit', kind: 'onoff' },
      { key: 'ibpb_on_vm_entry', kind: 'onoff' },
      { key: 'l1d_flush_on_sched', kind: 'onoff' },
      { key: 'l1d_flush_on_vm_entry', kind: 'onoff' },
      { key: 'mds_clear_on_sched', kind: 'onoff' },
      { key: 'mds_clear_on_vm_entry', kind: 'onoff' },
      { key: 'arm_gic_its', kind: 'onoff' },
      { key: 'cpuid_portability_level', kind: 'int' },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    fields: [
      { key: 'vram', kind: 'int', hint: 'MB' },
      { key: 'page_fusion', kind: 'onoff' },
      { key: 'balloon', kind: 'int', hint: 'MB' },
    ],
  },
  {
    id: 'graphics',
    label: 'Graphics',
    fields: [
      { key: 'controller', kind: 'string', suggest: ['vboxvga', 'vmsvga', 'vboxsvga', 'none'] },
      { key: 'monitor_count', kind: 'int' },
      { key: 'accelerate_3d', kind: 'onoff' },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      {
        key: 'driver',
        kind: 'string',
        suggest: ['default', 'null', 'dsound', 'was', 'oss', 'alsa', 'pulse', 'coreaudio'],
      },
      { key: 'controller', kind: 'string', suggest: ['ac97', 'hda', 'sb16'] },
      { key: 'codec', kind: 'string', suggest: ['stac9700', 'ad1980', 'stac9221', 'sb16'] },
      { key: 'in', kind: 'onoff' },
      { key: 'out', kind: 'onoff' },
    ],
  },
  {
    id: 'usb',
    label: 'USB',
    fields: [
      { key: 'ohci', kind: 'onoff' },
      { key: 'ehci', kind: 'onoff' },
      { key: 'xhci', kind: 'onoff' },
      { key: 'card_reader', kind: 'onoff' },
    ],
  },
  {
    id: 'integration',
    label: 'Integration',
    fields: [
      {
        key: 'clipboard_mode',
        kind: 'string',
        suggest: ['disabled', 'hosttoguest', 'guesttohost', 'bidirectional'],
      },
      { key: 'clipboard_file_transfers', kind: 'string', suggest: ['enabled', 'disabled'] },
      {
        key: 'drag_and_drop',
        kind: 'string',
        suggest: ['disabled', 'hosttoguest', 'guesttohost', 'bidirectional'],
      },
      {
        key: 'mouse',
        kind: 'string',
        suggest: ['ps2', 'usb', 'usbtablet', 'usbmultitouch', 'usbmtscreenpluspad'],
      },
      { key: 'keyboard', kind: 'string', suggest: ['ps2', 'usb'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    fields: [
      { key: 'chipset', kind: 'string', suggest: ['piix3', 'ich9', 'armv8virtual'] },
      { key: 'acpi', kind: 'onoff' },
      { key: 'iommu', kind: 'string', suggest: ['none', 'automatic', 'amd', 'intel'] },
      { key: 'tpm_type', kind: 'string', suggest: ['none', '1.2', '2.0', 'host', 'swtpm'] },
      { key: 'tpm_location', kind: 'string' },
      { key: 'rtc_use_utc', kind: 'onoff' },
      {
        key: 'paravirt_provider',
        kind: 'string',
        suggest: ['none', 'default', 'legacy', 'minimal', 'hyperv', 'kvm'],
      },
      { key: 'ioapic', kind: 'onoff' },
      { key: 'triple_fault_reset', kind: 'onoff' },
      { key: 'hardware_uuid', kind: 'string' },
      { key: 'system_uuid_le', kind: 'onoff' },
      { key: 'snapshot_folder', kind: 'string' },
      { key: 'description', kind: 'string' },
      { key: 'groups', kind: 'string', hint: '/group/subgroup' },
      { key: 'icon_file', kind: 'string' },
      { key: 'default_frontend', kind: 'string', suggest: ['gui', 'headless', 'sdl', 'separate'] },
      {
        key: 'vm_process_priority',
        kind: 'string',
        suggest: ['default', 'flat', 'low', 'normal', 'high'],
      },
      {
        key: 'vm_execution_engine',
        kind: 'string',
        suggest: ['default', 'hm', 'hwvirt', 'nem', 'native-api', 'interpreter', 'recompiler'],
      },
    ],
  },
  {
    id: 'firmware',
    label: 'Firmware',
    fields: [
      { key: 'boot_menu', kind: 'string', suggest: ['disabled', 'menuonly', 'messageandmenu'] },
      { key: 'apic', kind: 'string', suggest: ['disabled', 'apic', 'x2apic'] },
      { key: 'logo_fade_in', kind: 'onoff' },
      { key: 'logo_fade_out', kind: 'onoff' },
      { key: 'logo_display_time', kind: 'int', hint: 'ms' },
      { key: 'logo_image_path', kind: 'string' },
      { key: 'system_time_offset', kind: 'int', hint: 'ms' },
      { key: 'pxe_debug', kind: 'onoff' },
    ],
  },
  {
    id: 'recording',
    label: 'Recording',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'screens', kind: 'string', suggest: ['all'] },
      { key: 'file', kind: 'string' },
      { key: 'max_size_mb', kind: 'int' },
      { key: 'max_time_seconds', kind: 'int' },
      { key: 'opts', kind: 'string' },
      { key: 'video_fps', kind: 'int' },
      { key: 'video_rate', kind: 'int', hint: 'kbps' },
      { key: 'video_res', kind: 'string', hint: 'e.g. 1024x768' },
    ],
  },
  {
    id: 'vrde',
    label: 'VRDE',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'port', kind: 'string', hint: 'ranges: 5000,5010-5012' },
      { key: 'extpack', kind: 'string' },
      { key: 'address', kind: 'string' },
      { key: 'auth_type', kind: 'string', suggest: ['null', 'external', 'guest'] },
      { key: 'auth_library', kind: 'string' },
      { key: 'multi_con', kind: 'onoff' },
      { key: 'reuse_con', kind: 'onoff' },
      { key: 'video_channel', kind: 'onoff' },
      { key: 'video_channel_quality', kind: 'int', hint: '10-100 %' },
    ],
  },
  {
    id: 'autostart',
    label: 'Autostart',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'delay', kind: 'int', hint: 'seconds' },
    ],
  },
];

const blank = value => value === '' || value === undefined || value === null;

const typed = (field, value) => (field.kind === 'int' ? Number(value) : value);

const sectionPayload = (section, values, keep) => {
  const cleaned = {};
  section.fields.forEach(field => {
    const value = values[field.key];
    if (!blank(value) && keep(field, value)) {
      cleaned[field.key] = typed(field, value);
    }
  });
  return cleaned;
};

const payloadOf = (hardware, keepOf) => {
  const payload = {};
  HARDWARE_SECTIONS.forEach(section => {
    const cleaned = sectionPayload(section, hardware[section.id] || {}, keepOf(section));
    if (Object.keys(cleaned).length > 0) {
      payload[section.id] = cleaned;
    }
  });
  return Object.keys(payload).length > 0 ? payload : null;
};

/**
 * The `vbox` payload of every set value of the hardware form, integers as
 * numbers; null while nothing is set.
 *
 * @param {Object} hardware - The form's values by section
 * @returns {Object|null} The payload
 */
export const buildHardwarePayload = hardware => payloadOf(hardware, () => () => true);

/**
 * The `vbox` payload of the values that differ from what `knob_current`
 * seeded, a blank field never sent; null while nothing changed.
 *
 * @param {Object} hardware - The form's values by section
 * @param {Object} seededHardware - The seeded values by section
 * @returns {Object|null} The payload
 */
export const diffHardwarePayload = (hardware, seededHardware) =>
  payloadOf(hardware, section => {
    const seeded = seededHardware[section.id] || {};
    return (field, value) => value !== (seeded[field.key] ?? '');
  });

export const CPU_TOPO_FIELDS = [
  ['sockets', 16],
  ['cores', 32],
  ['threads', 2],
];

export const cpuTopoProduct = topo =>
  (Number(topo.sockets) || 0) * (Number(topo.cores) || 0) * (Number(topo.threads) || 0);

/**
 * The `serial` and `parallel` port rows as the agent reads them, the irq
 * a number and every other member as typed, a row without a port left
 * out.
 *
 * @param {Array<Object>} rows - The editor's rows
 * @returns {Array<Object>} The entries
 */
export const buildPortsPayload = rows =>
  rows
    .filter(row => row.port !== '')
    .map(row => {
      const entry = { port: Number(row.port) };
      if (row.io_base?.trim()) {
        entry.io_base = row.io_base.trim();
      }
      if (row.irq !== '' && row.irq !== undefined) {
        entry.irq = Number(row.irq);
      }
      if (row.mode?.trim()) {
        entry.mode = row.mode.trim();
      }
      if (row.type?.trim()) {
        entry.type = row.type.trim();
      }
      if (row.device?.trim()) {
        entry.device = row.device.trim();
      }
      return entry;
    });
