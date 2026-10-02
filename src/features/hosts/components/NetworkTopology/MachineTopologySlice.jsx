import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import SectionCard from '../../../../components/common/SectionCard';

import TopologyCanvas from './TopologyCanvas';
import { sliceForMachine } from './topologyModel';
import { useTopologyHostGraph } from './useTopologyFeed';

/**
 * The machine page's embed of the topology, hyperweaver-ui's slice: the
 * machine's NICs, the carriers they ride and the networks they land on,
 * over the same graph the host's page draws, in a section card that
 * folds across the whole row of the machine's Overview, where
 * hyperweaver-ui drew it; nothing while the machine has no network
 * presence.
 */
const MachineTopologySlice = ({ id, name, folded, onFold }) => {
  const { t } = useTranslation();
  const host = useTopologyHostGraph(id);
  const trace = useCallback(() => {}, []);
  const slice = host.server ? sliceForMachine(host.graph, name) : null;
  if (!slice) {
    return null;
  }
  return (
    <div className="col-12" data-panel="machine-topology">
      <SectionCard
        title={t('hostTools.topology.sliceHeading')}
        className="hw-topo-slice mb-0"
        folded={folded}
        onFold={onFold}
      >
        <TopologyCanvas
          host={{ server: host.server, graph: slice }}
          onIsolate={trace}
          onDrill={trace}
          onOpenMachine={trace}
          pulse={host.pulse}
        />
      </SectionCard>
    </div>
  );
};

MachineTopologySlice.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  folded: PropTypes.bool.isRequired,
  onFold: PropTypes.func.isRequired,
};

export default MachineTopologySlice;
