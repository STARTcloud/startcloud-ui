const FIRST = '2026-09-27T12:00:00.000Z';
const SECOND = '2026-09-27T12:00:05.000Z';
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

const sample = (stamp, more = {}) => ({ scan_timestamp: stamp, ...more });

/**
 * The sample rows every chart is drawn over in the tests, one set a
 * series: the host's CPU with and without the IO delay, memory with and
 * without the cached bytes, network, pool I/O, ARC and disk I/O, and a
 * zone's usage, disk I/O and link and a VirtualBox machine's usage.
 */
export const FIXTURES = {
  host: {
    cpu: [
      sample(FIRST, {
        cpu_utilization_pct: '12.5',
        io_delay_pct: 1.5,
        load_avg_1min: 0.4,
        load_avg_5min: 0.3,
        load_avg_15min: 0.2,
        per_core_parsed: [{ cpu_id: 'cpu0', utilization_pct: 10 }],
      }),
      sample(SECOND, {
        cpu_utilization_pct: 20,
        per_core_parsed: [{ core: 1, utilization_pct: 30 }],
      }),
    ],
    cpuPlain: [sample(FIRST, { cpu_utilization_pct: 12 })],
    memory: [
      sample(FIRST, {
        total_memory_bytes: 8 * GIB,
        used_memory_bytes: 6 * GIB,
        free_memory_bytes: 2 * GIB,
        cached_bytes: null,
      }),
      sample(SECOND, {
        total_memory_bytes: String(8 * GIB),
        used_memory_bytes: String(4 * GIB),
        free_memory_bytes: String(4 * GIB),
        cached_bytes: GIB,
      }),
    ],
    memoryPlain: [sample(FIRST, { used_memory_bytes: GIB, free_memory_bytes: GIB })],
    network: [
      sample(FIRST, { link: 'eth0', rx_mbps: 1, tx_mbps: 2 }),
      sample(SECOND, { link: 'eth0', rx_mbps: 3, tx_mbps: 0.5 }),
      sample(FIRST, {
        link: 'wlan0',
        rbytes_delta: 1250000,
        obytes_delta: -5,
        time_delta_seconds: 10,
      }),
    ],
    'pool-io': [
      sample(FIRST, {
        pool: 'tank',
        read_bandwidth_bytes: String(MIB),
        write_bandwidth_bytes: String(3 * MIB),
      }),
      sample(FIRST, { pool: 'rpool', read_bandwidth_bytes: 1048576 }),
    ],
    arc: [
      sample(FIRST, {
        arc_size: String(2 * GIB),
        arc_target_size: String(4 * GIB),
        mru_size: GIB,
        mfu_size: GIB,
        hit_ratio: '95.5',
        data_demand_efficiency: 99,
        data_prefetch_efficiency: 50,
      }),
      sample(SECOND, {
        arc_size: GIB,
        hit_ratio: 0,
        hits: '90',
        misses: '10',
        compressed_size: GIB,
        uncompressed_size: 2 * GIB,
      }),
    ],
  },
  storage: {
    diskIo: [
      sample(FIRST, {
        device_name: 'c0d0',
        pool: 'rpool',
        read_bandwidth_bytes: String(MIB),
        write_bandwidth_bytes: String(2 * MIB),
      }),
      sample(SECOND, {
        device_name: 'c0d0',
        pool: 'rpool',
        read_bandwidth_bytes: String(3 * MIB),
        write_bandwidth_bytes: String(4 * MIB),
      }),
      sample(SECOND, {
        device_name: 'c0d2',
        pool: 'tank',
        read_bandwidth_bytes: '0',
        write_bandwidth_bytes: '0',
      }),
    ],
  },
  machine: {
    zone: [
      sample(FIRST, { cpu_pct: 1.5, rss_bytes: 2 * GIB, swap_bytes: GIB }),
      sample(SECOND, { cpu_pct: 2.25, rss_bytes: null, swap_bytes: null }),
    ],
    diskio: [
      sample(FIRST, {
        dataset: 'tank/zones/web-1/data',
        pool: 'tank',
        device: 'data',
        read_bps: MIB,
        write_bps: 2 * MIB,
        read_iops: 10.4,
        write_iops: 20.6,
      }),
      sample(FIRST, {
        dataset: 'rpool/zones/web-1/boot',
        pool: null,
        device: null,
        read_bps: 0,
        write_bps: MIB / 2,
        read_iops: 0,
        write_iops: 3,
      }),
      sample(SECOND, {
        dataset: 'tank/zones/web-1/data',
        pool: 'tank',
        device: 'data',
        read_bps: 3 * MIB,
        write_bps: null,
        read_iops: 31,
        write_iops: null,
      }),
    ],
    link: [sample(FIRST, { link: 'vnic0', rx_mbps: '8.39', tx_mbps: '4.19' })],
    usage: [
      sample(FIRST, {
        cpu_guest_pct: 3.5,
        cpu_vmm_pct: 0.5,
        cpu_pct: 4,
        rss_bytes: 2 * GIB,
        ram_total_bytes: 8 * GIB,
        guest_additions: true,
        net_rx_bps: null,
        net_tx_bps: null,
        disk_read_bps: null,
        disk_write_bps: null,
      }),
      sample(SECOND, {
        cpu_guest_pct: 3.5,
        cpu_vmm_pct: 0.5,
        cpu_pct: 4,
        rss_bytes: 2 * GIB,
        ram_total_bytes: 8 * GIB,
        guest_additions: true,
        net_rx_bps: MIB,
        net_tx_bps: 2 * MIB,
        disk_read_bps: MIB / 2,
        disk_write_bps: 0,
      }),
    ],
  },
};
