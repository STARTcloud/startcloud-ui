import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSliders } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import SectionCard from '../../../../components/common/SectionCard';
import { useHostRow } from '../../hooks/useHostRow';
import { useMachineSeries } from '../../hooks/useMachineSeries';
import { machineRoute } from '../../utils/machines';
import { machineChartGates } from '../../utils/machineTools';

import PathDialog from './PathDialog';
import { buildPathGraph, packetSizesOf } from './pathModel';
import PathRail from './PathRail';
import { StateDot } from './TopologyCards';
import { sliceForMachine } from './topologyModel';
import { assignNetworkColors } from './topologyPalette';
import { useTopologyHostGraph } from './useTopologyFeed';

/**
 * The machine page's Network path, a section card that folds across the
 * whole row of the machine's Overview: the machine's name, its vNIC
 * count and the door to its settings, and under them the rail of
 * `PathRail` over the path graph of `buildPathGraph`, built from the
 * slice of the host's topology graph the machine owns, its colours the
 * host's own; a hop opens in `PathDialog` over the host's network series
 * and, where the machine page draws its usage, the machine's usage
 * series, the copies the page already holds; nothing while the machine
 * has no network presence.
 */
const MachineTopologySlice = ({ id, name, host, detail, running, folded, onFold }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const feed = useTopologyHostGraph(id);
  const server = useHostRow(id);
  const gates = machineChartGates({ server, machine: detail.machine_info, running });
  const usage = useMachineSeries({ id, name, metric: 'machine-usage', wanted: gates.machine });
  const [open, setOpen] = useState(null);
  const slice = useMemo(
    () => (feed.server ? sliceForMachine(feed.graph, name) : null),
    [feed.server, feed.graph, name]
  );
  const packets = useMemo(() => packetSizesOf(feed.rows), [feed.rows]);
  const graph = useMemo(() => (slice ? buildPathGraph(slice, packets) : null), [slice, packets]);
  const colors = useMemo(() => assignNetworkColors(feed.graph.networks), [feed.graph.networks]);
  const sources = useMemo(
    () => ({ link: feed.rows, adapter: usage.rows }),
    [feed.rows, usage.rows]
  );
  if (!slice || !graph) {
    return null;
  }
  const [consumer] = slice.consumers;
  const settings = t('hostTools.topology.openSettings');
  const shown = open ? graph.nodes.find(node => node.id === open) : null;
  return (
    <div className="col-12" data-panel="machine-topology">
      <SectionCard
        title={t('hostTools.topology.sliceHeading')}
        className="hw-topo-slice mb-0"
        folded={folded}
        onFold={onFold}
      >
        <div className="hw-path-head">
          <StateDot up={consumer.running} ghost={consumer.ghostOnly} />
          <span className="hw-topo-card-title">{consumer.name}</span>
          <span className="hw-topo-card-meta">
            {consumer.ghostOnly
              ? t('hostTools.topology.configuredNotRunning')
              : t('hostTools.topology.nicCount', { count: consumer.nics.length })}
          </span>
          <button
            type="button"
            className="hw-topo-open"
            title={settings}
            aria-label={settings}
            data-tool="open-settings"
            onClick={() => navigate(`${machineRoute(id, name)}/settings`)}
          >
            <FaSliders aria-hidden="true" />
          </button>
        </div>
        <PathRail
          graph={graph}
          colors={colors}
          feedPresent={feed.graph.feedPresent}
          onOpen={node => setOpen(node.id)}
          dialogOpen={Boolean(shown)}
        />
      </SectionCard>
      {shown ? (
        <PathDialog
          id={id}
          node={shown}
          sources={sources}
          host={host}
          onHide={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
};

MachineTopologySlice.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  running: PropTypes.bool.isRequired,
  folded: PropTypes.bool.isRequired,
  onFold: PropTypes.func.isRequired,
};

export default MachineTopologySlice;
