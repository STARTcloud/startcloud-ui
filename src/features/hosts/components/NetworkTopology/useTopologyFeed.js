import PropTypes from 'prop-types';
import { useContext, useEffect, useMemo } from 'react';

import { useHostMachines } from '../../hooks/useHostMachines';
import { useHostReading } from '../../hooks/useHostReadings';
import { useHostRow } from '../../hooks/useHostRow';
import { useHostSeries } from '../../hooks/useHostSeries';
import { MachineDetailContext } from '../../hooks/useMachineDetail';
import { hostHasFeature } from '../../utils/capabilities';
import { detailKey } from '../../utils/machines';
import { intervalOf, usageRows } from '../../utils/networking';

import { buildHostGraph } from './topologyModel';
import { buildVBoxGraph } from './topologyModelVBox';

const NO_ROWS = [];

const NO_MAP = new Map();

const NO_PROVIDER = { epoch: 0, machines: {}, ask: () => Promise.resolve(null) };

const MEGA = 1000000;

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

/**
 * The per-machine adapter rates `monitoring/machines/usage` answers, by
 * machine and adapter, hyperweaver-ui's reading of the payload.
 *
 * @param {Object|null} payload - The answer
 * @returns {Map<string, Map<string, Object>>} Machine name to adapter to rates
 */
export const machineUsageOf = payload => {
  const rows = payload?.usage || payload?.machines || [];
  const byMachine = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const name = row.machine_name || row.name || row.machine;
    const adapterRows = Array.isArray(row.nics) ? row.nics : row.network;
    if (!name || !Array.isArray(adapterRows)) {
      return;
    }
    const byAdapter = new Map();
    adapterRows.forEach(nicRow => {
      byAdapter.set(String(nicRow.adapter), {
        rxMbps: (parseFloat(nicRow.rx_bps) || 0) / MEGA,
        txMbps: (parseFloat(nicRow.tx_bps) || 0) / MEGA,
        speedMbps: 0,
      });
    });
    byMachine.set(name, byAdapter);
  });
  return byMachine;
};

const pulseOf = rows => {
  const last = rows[rows.length - 1];
  return last ? Date.parse(last.scan_timestamp) || rows.length : 0;
};

/**
 * One host's topology graph over the copies the hosts feature's context
 * holds of the host, in place of hyperweaver-ui's feed and its two
 * timers: the interfaces, the addresses, the routes, the aggregates, the
 * etherstubs and the VNICs of the networking page's reads, the network
 * spaces, the machine rows, on a host that lists `network-spaces` each
 * machine's detail asked of the machine detail context and the
 * per-machine usage, and the newest usage sample of every link from the
 * host's network series, which grows by `network-sample` events. `pulse`
 * moves with the newest sample and `seconds` is the seconds that sample
 * spans, the cadence the header names; `loaded` says whether the
 * structure reads answered.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ server: Object|null, graph: Object, loaded: boolean, pulse: number, seconds: number }} The host's graph
 */
export const useTopologyHostGraph = id => {
  const server = useHostRow(id);
  const vbox = hostHasFeature(server, 'network-spaces');
  const interfaces = useHostReading(id, 'interfaces');
  const addresses = useHostReading(id, 'ip-addresses');
  const aggregates = useHostReading(id, 'aggregates');
  const etherstubs = useHostReading(id, 'etherstubs');
  const vnics = useHostReading(id, 'vnics');
  const spaces = useHostReading(id, 'network-spaces');
  const machineUsage = useHostReading(id, 'machines-usage');
  const usage = useHostSeries(id, 'network');
  const { machines } = useHostMachines(id, hostHasFeature(server, 'machines'));
  const { epoch, machines: details, ask } = useContext(MachineDetailContext) || NO_PROVIDER;
  const names = vbox
    ? machines
        .map(row => row.name)
        .filter(Boolean)
        .join('|')
    : '';

  useEffect(() => {
    names
      .split('|')
      .filter(Boolean)
      .forEach(name => {
        const held = details[detailKey(id, name)];
        if (!held || (!held.loaded && !held.failed) || held.stale) {
          ask(epoch, id, name);
        }
      });
  }, [names, details, ask, epoch, id]);

  const machineDetails = useMemo(() => {
    const map = new Map();
    names
      .split('|')
      .filter(Boolean)
      .forEach(name => {
        const detail = details[detailKey(id, name)]?.detail;
        if (detail) {
          map.set(name, detail);
        }
      });
    return map;
  }, [names, details, id]);

  const samples = useMemo(() => usageRows(usage.rows), [usage.rows]);
  const machineRates = useMemo(
    () => (vbox ? machineUsageOf(machineUsage.data) : NO_MAP),
    [vbox, machineUsage.data]
  );

  const graph = useMemo(
    () =>
      vbox
        ? buildVBoxGraph({
            interfaces: listOf(interfaces.data, 'interfaces'),
            spaces: listOf(spaces.data, 'spaces'),
            machines,
            machineDetails,
            usage: samples,
            machineUsage: machineRates,
            ipAddresses: listOf(addresses.data, 'addresses'),
          })
        : buildHostGraph({
            interfaces: listOf(interfaces.data, 'interfaces'),
            aggregates: listOf(aggregates.data, 'aggregates'),
            etherstubs: listOf(etherstubs.data, 'etherstubs'),
            vnics: listOf(vnics.data, 'vnics'),
            machines,
            usage: samples,
            ipAddresses: listOf(addresses.data, 'addresses'),
          }),
    [
      vbox,
      interfaces.data,
      spaces.data,
      aggregates.data,
      etherstubs.data,
      vnics.data,
      addresses.data,
      machines,
      machineDetails,
      samples,
      machineRates,
    ]
  );

  const settled = reading => !reading.offered || reading.loaded;
  const loaded = [interfaces, addresses, aggregates, etherstubs, vnics, spaces].every(settled);
  const last = usage.rows[usage.rows.length - 1];

  return useMemo(
    () => ({
      server,
      graph,
      loaded,
      pulse: pulseOf(usage.rows),
      seconds: intervalOf(last),
    }),
    [server, graph, loaded, usage.rows, last]
  );
};

/**
 * One host's feed lifted to the topology panel: draws nothing and hands
 * the panel the host's graph through `onHost` whenever it changes, so
 * the panel holds one graph a host over any number of hosts.
 */
export const TopologyHostFeed = ({ id, onHost }) => {
  const host = useTopologyHostGraph(id);
  useEffect(() => {
    onHost(id, host);
  }, [id, host, onHost]);
  useEffect(() => () => onHost(id, null), [id, onHost]);
  return null;
};

TopologyHostFeed.propTypes = {
  id: PropTypes.string.isRequired,
  onHost: PropTypes.func.isRequired,
};
