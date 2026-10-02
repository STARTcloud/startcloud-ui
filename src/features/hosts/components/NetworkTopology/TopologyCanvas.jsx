import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConsumerCard } from './TopologyCards';
import { CarriersColumn, ConsumersColumn, NetworksColumn, UpstreamColumn } from './TopologyColumns';
import { FlowEffects, FlowLabel } from './TopologyFlow';
import { buildTopologyPaths, plannedNetworksFor } from './topologyMeasure';
import { MOTION_NO_FEED, assignNetworkColors } from './topologyPalette';
import WireSparkline from './TopologySparkline';

const DENSE_THRESHOLD = 16;

const NO_MOVES = [];

const NOOP = () => {};

const sum = usage => (usage?.rxMbps || 0) + (usage?.txMbps || 0);

const TRAFFIC_DIM = {
  network: item => sum(item.usage) === 0,
  consumer: item => !item.nics.some(nic => sum(nic.usage) > 0),
  adapter: item => sum(item.usage) === 0,
};

const DEBUG_DIM = {
  adapter: item => item.state !== 'down',
  switch: item => item.ports > 0,
  consumer: item => !(item.ghostOnly || (item.running && item.nics.length === 0)),
  network: item => item.live > 0,
};

const LENS_DIMS = { traffic: TRAFFIC_DIM, debug: DEBUG_DIM };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hoverAfter = (prev, id, leaving) => {
  if (!leaving) {
    return id;
  }
  return prev === leaving ? null : prev;
};

const traceAfter = (prev, netIds) => (prev.join(' ') === netIds.join(' ') ? [] : netIds);

const consumersShown = (consumers, isolatedNet, filterText) => {
  const list = isolatedNet
    ? consumers.filter(consumer => consumer.nics.some(nic => nic.networkId === isolatedNet))
    : consumers;
  const needle = filterText.trim().toLowerCase();
  if (!needle) {
    return list;
  }
  return list.filter(
    consumer =>
      consumer.name.toLowerCase().includes(needle) ||
      consumer.nics.some(nic => nic.link.toLowerCase().includes(needle))
  );
};

const columnsClass = hasAggr => `hw-topo-columns ${hasAggr ? 'hw-topo-columns-4' : ''}`;

const canvasIdOf = host => String(host.server?.id ?? '');

const carrierIdsShown = (networks, isolatedNet) => {
  if (!isolatedNet) {
    return null;
  }
  const net = networks.find(n => n.id === isolatedNet);
  return net ? new Set([net.carrier]) : new Set();
};

const groupsOf = consumers => {
  const groups = new Map();
  consumers.forEach(consumer => {
    const primary = consumer.nics[0]?.networkId || 'none';
    if (!groups.has(primary)) {
      groups.set(primary, []);
    }
    groups.get(primary).push(consumer);
  });
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
};

const groupsIfDense = (dense, consumers) => (dense ? groupsOf(consumers) : null);

const Wire = ({ path, dim, effectStyle, reducedMotion, onTrace, onHover }) => (
  <g className={dim ? 'hw-topo-dim' : ''} data-wire={path.id}>
    <path
      d={path.d}
      className="hw-topo-wire-hit"
      onClick={onTrace}
      onMouseEnter={() => onHover(path.id)}
      onMouseLeave={() => onHover(null, path.id)}
    />
    <path
      d={path.d}
      className={`hw-topo-wire ${path.ghost ? 'hw-topo-wire-ghost' : ''} ${
        path.struck ? 'hw-topo-wire-struck' : ''
      }`}
      stroke={path.color}
      strokeWidth={path.width}
    />
    {path.struck ? null : (
      <FlowEffects path={path} effect={effectStyle} reducedMotion={reducedMotion} />
    )}
    <FlowLabel path={path} />
    {path.cap && path.motion === MOTION_NO_FEED && !path.ghost ? (
      <circle className="hw-topo-cap" stroke={path.color} r="4" cx={path.ex} cy={path.ey} />
    ) : null}
  </g>
);

Wire.propTypes = {
  path: PropTypes.object.isRequired,
  dim: PropTypes.bool.isRequired,
  effectStyle: PropTypes.string.isRequired,
  reducedMotion: PropTypes.bool.isRequired,
  onTrace: PropTypes.func.isRequired,
  onHover: PropTypes.func.isRequired,
};

/**
 * The topology canvas of one host, hyperweaver-ui's: the three columns,
 * machines, carriers and networks, a fourth beside an aggregate, and
 * over them the SVG overlay of wires measured from the cards' anchors,
 * laid out again when the container resizes; a click on a card or a
 * wire traces its networks and dims the rest, Escape clears the trace,
 * the lenses dim what they do not show, an isolated network narrows the
 * columns to it, and while a drag is on the cards are drop targets.
 */
const TopologyCanvas = ({
  host,
  lens = null,
  isolatedNet = null,
  onIsolate,
  onDrill,
  onOpenMachine,
  canRewire = false,
  dragging = null,
  pendingMoves = NO_MOVES,
  onDragNic = NOOP,
  onDropNic = NOOP,
  onDropCarrier = NOOP,
  onOpenNetworking = null,
  onOpenSettings = null,
  onWireChart = null,
  sharedNetIds = null,
  effectStyle = 'comets',
  pulse = 0,
}) => {
  const { t } = useTranslation();
  const { graph } = host;
  const containerRef = useRef(null);
  const anchorsRef = useRef(new Map());
  const [paths, setPaths] = useState([]);
  const [pendingPaths, setPendingPaths] = useState([]);
  const [traceNets, setTraceNets] = useState([]);
  const [layoutTick, setLayoutTick] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [hoverWire, setHoverWire] = useState(null);

  const colors = useMemo(() => assignNetworkColors(graph.networks), [graph.networks]);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const pendingByNic = useMemo(
    () => new Map(pendingMoves.map(move => [`${move.machineName}|${move.link}`, move])),
    [pendingMoves]
  );
  const pendingLinks = useMemo(() => new Set(pendingByNic.keys()), [pendingByNic]);
  const plannedNetworks = useMemo(
    () => plannedNetworksFor(graph, pendingMoves),
    [graph, pendingMoves]
  );

  const registerAnchor = useCallback((key, el) => {
    if (el) {
      anchorsRef.current.set(key, el);
    } else {
      anchorsRef.current.delete(key);
    }
  }, []);

  const visibleNetworks = useMemo(
    () => (isolatedNet ? graph.networks.filter(net => net.id === isolatedNet) : graph.networks),
    [graph.networks, isolatedNet]
  );
  const visibleConsumers = useMemo(
    () => consumersShown(graph.consumers, isolatedNet, filterText),
    [graph.consumers, isolatedNet, filterText]
  );
  const visibleCarrierIds = useMemo(
    () => carrierIdsShown(graph.networks, isolatedNet),
    [graph.networks, isolatedNet]
  );

  const dense = graph.consumers.length > DENSE_THRESHOLD;
  const consumerGroups = useMemo(
    () => groupsIfDense(dense, visibleConsumers),
    [dense, visibleConsumers]
  );
  const hasAggr = graph.adapters.some(a => a.kind === 'aggr');

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const built = buildTopologyPaths({
      container,
      anchors: anchorsRef.current,
      visibleConsumers,
      visibleNetworks,
      isolatedNet,
      colors,
      graph,
      pendingByNic,
      pendingMoves,
    });
    setPaths(built.paths);
    setPendingPaths(built.pending);
  }, [visibleConsumers, visibleNetworks, isolatedNet, colors, graph, pendingByNic, pendingMoves]);

  useEffect(() => {
    measure();
  }, [measure, layoutTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => setLayoutTick(tick => tick + 1));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        setTraceNets([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const traceSet = useMemo(() => new Set(traceNets), [traceNets]);
  const traced = traceSet.size > 0;
  const isDim = netIds => traced && !netIds.some(id => traceSet.has(id));
  const isHot = netIds => traced && netIds.some(id => traceSet.has(id));
  const slotClass = netIds =>
    `hw-topo-slot ${isDim(netIds) ? 'hw-topo-dim' : ''} ${isHot(netIds) ? 'hw-topo-hot' : ''}`;

  const handleTrace = useCallback(netIds => setTraceNets(prev => traceAfter(prev, netIds)), []);

  const lensDim = useCallback((kind, item) => Boolean(LENS_DIMS[lens]?.[kind]?.(item)), [lens]);

  const onHover = (id, leaving = null) => setHoverWire(prev => hoverAfter(prev, id, leaving));

  const renderConsumer = consumer => (
    <div
      key={consumer.id}
      className={`${slotClass(consumer.nics.map(n => n.networkId))} ${
        lensDim('consumer', consumer) ? 'hw-topo-lens-dim' : ''
      }`}
    >
      <ConsumerCard
        consumer={consumer}
        colors={colors}
        feedPresent={graph.feedPresent}
        onTrace={handleTrace}
        onOpen={onOpenMachine}
        registerAnchor={registerAnchor}
        canRewire={canRewire}
        pendingLinks={pendingLinks}
        pendingAdds={pendingMoves.filter(move => move.isAdd && move.machineName === consumer.id)}
        onDragNic={onDragNic}
        onOpenNetworking={onOpenNetworking}
        onOpenSettings={onOpenSettings}
        tracedSet={traceSet}
      />
    </div>
  );

  return (
    <div
      className={`hw-topo-canvas ${traced ? 'hw-topo-traced' : ''}`}
      ref={containerRef}
      data-canvas={canvasIdOf(host)}
    >
      <svg className="hw-topo-overlay" aria-hidden="true">
        {paths.map(path => (
          <Wire
            key={path.id}
            path={path}
            dim={isDim([path.netId])}
            effectStyle={effectStyle}
            reducedMotion={reducedMotion}
            onTrace={() => {
              handleTrace([path.netId]);
              if (onWireChart) {
                onWireChart(path.netId);
              }
            }}
            onHover={onHover}
          />
        ))}
        {pendingPaths.map(path => (
          <path key={path.id} d={path.d} className="hw-topo-wire hw-topo-wire-pending" />
        ))}
        <WireSparkline paths={paths} hoveredId={hoverWire} pulse={pulse} />
      </svg>
      <div className={columnsClass(hasAggr)}>
        <ConsumersColumn
          graph={graph}
          colors={colors}
          visibleConsumers={visibleConsumers}
          consumerGroups={consumerGroups}
          filterText={filterText}
          onFilterChange={setFilterText}
          renderConsumer={renderConsumer}
        />
        <CarriersColumn
          graph={graph}
          lens={lens}
          isolatedNet={isolatedNet}
          visibleCarrierIds={visibleCarrierIds}
          slotClass={slotClass}
          lensDim={lensDim}
          handleTrace={handleTrace}
          registerAnchor={registerAnchor}
          onOpenNetworking={onOpenNetworking}
          canRewire={canRewire}
          dragging={dragging}
          onDropCarrier={onDropCarrier}
        />
        <NetworksColumn
          graph={graph}
          colors={colors}
          visibleNetworks={visibleNetworks}
          plannedNetworks={plannedNetworks}
          slotClass={slotClass}
          lensDim={lensDim}
          onDrill={onDrill}
          onIsolate={onIsolate}
          registerAnchor={registerAnchor}
          canRewire={canRewire}
          dragging={dragging}
          onDropNic={onDropNic}
          sharedNetIds={sharedNetIds}
        />
        {hasAggr ? <UpstreamColumn /> : null}
      </div>
      {graph.feedPresent ? null : (
        <div className="hw-topo-nofeed-chip" data-note="no-feed">
          <span className="hw-topo-cap-inline" />
          {t('hostTools.topology.noFeedBanner')}
        </div>
      )}
    </div>
  );
};

TopologyCanvas.propTypes = {
  host: PropTypes.shape({
    server: PropTypes.object,
    graph: PropTypes.object.isRequired,
  }).isRequired,
  lens: PropTypes.string,
  isolatedNet: PropTypes.string,
  onIsolate: PropTypes.func.isRequired,
  onDrill: PropTypes.func.isRequired,
  onOpenMachine: PropTypes.func.isRequired,
  canRewire: PropTypes.bool,
  dragging: PropTypes.object,
  pendingMoves: PropTypes.array,
  onDragNic: PropTypes.func,
  onDropNic: PropTypes.func,
  onDropCarrier: PropTypes.func,
  onOpenNetworking: PropTypes.func,
  onOpenSettings: PropTypes.func,
  onWireChart: PropTypes.func,
  sharedNetIds: PropTypes.instanceOf(Set),
  effectStyle: PropTypes.string,
  pulse: PropTypes.number,
};

export default TopologyCanvas;
