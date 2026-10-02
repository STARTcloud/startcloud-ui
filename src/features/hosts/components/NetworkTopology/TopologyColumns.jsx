import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';

import { AdapterCard, SwitchCard } from './TopologyCards';
import { NetworkCard } from './TopologyNetworkCard';
import { Tinted } from './TopologyTint';

const PREVIEW = 2;

const netIdsOf = (graph, carrierId) =>
  graph.networks.filter(n => n.carrier === carrierId).map(n => n.id);

const Group = ({ netId, group, graph, colors, expanded, onToggle, renderConsumer }) => {
  const { t } = useTranslation();
  const net = graph.networks.find(n => n.id === netId);
  const Chevron = expanded ? FaChevronUp : FaChevronDown;
  return (
    <div className="hw-topo-group" data-group={netId}>
      <Tinted
        as="button"
        type="button"
        className="hw-topo-group-head"
        tint={colors.get(netId)}
        onClick={onToggle}
      >
        <Tinted className="hw-topo-group-band" tint={colors.get(netId)} />
        <span className="hw-topo-card-title">
          {net && net.vlanId > 0
            ? t('hostTools.topology.vlanBadge', { vlanId: net.vlanId })
            : t('hostTools.topology.untaggedBadge')}
        </span>
        <span className="hw-topo-card-meta">
          {t('hostTools.topology.machineCount', { count: group.length })}
        </span>
        <Chevron className="ms-auto" aria-hidden="true" />
      </Tinted>
      {expanded ? group.map(renderConsumer) : null}
      {expanded ? null : (
        <div className="hw-topo-group-preview font-monospace">
          {group
            .slice(0, PREVIEW)
            .map(c => c.name)
            .join(' · ')}
          {group.length > PREVIEW
            ? ` ${t('hostTools.topology.moreCount', { count: group.length - PREVIEW })}`
            : ''}
        </div>
      )}
    </div>
  );
};

Group.propTypes = {
  netId: PropTypes.string.isRequired,
  group: PropTypes.array.isRequired,
  graph: PropTypes.object.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  renderConsumer: PropTypes.func.isRequired,
};

/**
 * The machines column of the topology canvas, hyperweaver-ui's: every
 * visible consumer card, and on a dense host, more than sixteen
 * consumers, the filter box and the roll-up of consumers by their
 * first network, each group opened by its head.
 */
export const ConsumersColumn = ({
  graph,
  colors,
  visibleConsumers,
  consumerGroups = null,
  filterText,
  onFilterChange,
  renderConsumer,
}) => {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const toggle = netId =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(netId)) {
        next.delete(netId);
      } else {
        next.add(netId);
      }
      return next;
    });
  return (
    <div className="hw-topo-col" data-column="machines">
      <div className="hw-topo-col-title">{t('hostTools.topology.machinesColumn')}</div>
      {consumerGroups ? (
        <input
          type="text"
          className="form-control form-control-sm hw-topo-filter"
          placeholder={t('hostTools.topology.filterPlaceholder')}
          value={filterText}
          onChange={event => onFilterChange(event.target.value)}
        />
      ) : null}
      {consumerGroups
        ? consumerGroups.map(([netId, group]) => (
            <Group
              key={netId}
              netId={netId}
              group={group}
              graph={graph}
              colors={colors}
              expanded={expandedGroups.has(netId) || filterText.trim().length > 0}
              onToggle={() => toggle(netId)}
              renderConsumer={renderConsumer}
            />
          ))
        : visibleConsumers.map(renderConsumer)}
    </div>
  );
};

ConsumersColumn.propTypes = {
  graph: PropTypes.object.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  visibleConsumers: PropTypes.array.isRequired,
  consumerGroups: PropTypes.array,
  filterText: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  renderConsumer: PropTypes.func.isRequired,
};

/**
 * The carriers column, hyperweaver-ui's: the adapters that are up, the
 * switches, and the adapters that are down rolled into one quiet card,
 * each drawn as its own drop target while a drag is on.
 */
export const CarriersColumn = ({
  graph,
  lens = null,
  isolatedNet = null,
  visibleCarrierIds = null,
  slotClass,
  lensDim,
  handleTrace,
  registerAnchor,
  onOpenNetworking = null,
  canRewire,
  dragging = null,
  onDropCarrier,
}) => {
  const { t } = useTranslation();
  const shownAdapters = graph.adapters.filter(adapter => {
    if (adapter.memberOf) {
      return false;
    }
    return visibleCarrierIds ? visibleCarrierIds.has(adapter.id) : true;
  });
  const isDown = a => a.kind === 'phys' && a.state === 'down';
  const downAdapters = shownAdapters.filter(isDown);
  const activeAdapters = shownAdapters.filter(a => !isDown(a));
  const shownSwitches = visibleCarrierIds
    ? graph.switches.filter(s => visibleCarrierIds.has(s.id))
    : graph.switches;
  const adapterCard = (adapter, traced) => (
    <AdapterCard
      adapter={adapter}
      feedPresent={graph.feedPresent}
      onTrace={handleTrace}
      tracedNetworks={traced}
      registerAnchor={registerAnchor}
      onOpenNetworking={onOpenNetworking}
      dragging={canRewire ? dragging : null}
      onDropCarrier={onDropCarrier}
    />
  );
  return (
    <div className="hw-topo-col" data-column="carriers">
      <div className="hw-topo-col-title">{t('hostTools.topology.carriersColumn')}</div>
      {activeAdapters.map(adapter => (
        <div
          key={adapter.id}
          className={`${slotClass(netIdsOf(graph, adapter.id))} ${
            lensDim('adapter', adapter) ? 'hw-topo-lens-dim' : ''
          }`}
        >
          {adapterCard(adapter, netIdsOf(graph, adapter.id))}
        </div>
      ))}
      {shownSwitches.map(swtch => (
        <div
          key={swtch.id}
          className={`${slotClass(netIdsOf(graph, swtch.id))} ${
            lensDim('switch', swtch) ? 'hw-topo-lens-dim' : ''
          }`}
        >
          <SwitchCard
            swtch={swtch}
            onTrace={handleTrace}
            tracedNetworks={netIdsOf(graph, swtch.id)}
            registerAnchor={registerAnchor}
            dragging={canRewire ? dragging : null}
            onDropCarrier={onDropCarrier}
          />
        </div>
      ))}
      {downAdapters.length > 0 && !isolatedNet && canRewire && dragging
        ? downAdapters.map(adapter => (
            <div key={adapter.id} className="hw-topo-slot">
              {adapterCard(adapter, [])}
            </div>
          ))
        : null}
      {downAdapters.length > 0 && !isolatedNet && !(canRewire && dragging) ? (
        <div
          className={`hw-topo-card hw-topo-downgroup ${lens === 'debug' ? '' : 'hw-topo-quiet'}`}
        >
          <div className="hw-topo-card-sub">
            {t('hostTools.topology.downAdapters', { count: downAdapters.length })}
          </div>
          <div className="hw-topo-card-sub font-monospace">
            {downAdapters.map(a => a.name).join(' · ')}
          </div>
        </div>
      ) : null}
    </div>
  );
};

CarriersColumn.propTypes = {
  graph: PropTypes.object.isRequired,
  lens: PropTypes.string,
  isolatedNet: PropTypes.string,
  visibleCarrierIds: PropTypes.instanceOf(Set),
  slotClass: PropTypes.func.isRequired,
  lensDim: PropTypes.func.isRequired,
  handleTrace: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  onOpenNetworking: PropTypes.func,
  canRewire: PropTypes.bool.isRequired,
  dragging: PropTypes.object,
  onDropCarrier: PropTypes.func.isRequired,
};

/**
 * The networks column, hyperweaver-ui's: every visible network card in
 * its color and, after them, the planned cards of staged moves in the
 * pending color.
 */
export const NetworksColumn = ({
  graph,
  colors,
  visibleNetworks,
  plannedNetworks,
  slotClass,
  lensDim,
  onDrill,
  onIsolate,
  registerAnchor,
  canRewire,
  dragging = null,
  onDropNic,
  sharedNetIds = null,
}) => {
  const { t } = useTranslation();
  return (
    <div className="hw-topo-col" data-column="networks">
      <div className="hw-topo-col-title">{t('hostTools.topology.networksColumn')}</div>
      {visibleNetworks.map(network => (
        <div
          key={network.id}
          className={`${slotClass([network.id])} ${
            lensDim('network', network) ? 'hw-topo-lens-dim' : ''
          }`}
        >
          <NetworkCard
            network={network}
            color={colors.get(network.id)}
            feedPresent={graph.feedPresent}
            onDrill={onDrill}
            onTrace={netIds => onIsolate(netIds[0])}
            registerAnchor={registerAnchor}
            dragging={canRewire ? dragging : null}
            onDropNic={onDropNic}
            shared={sharedNetIds ? sharedNetIds.has(network.id) : false}
          />
        </div>
      ))}
      {plannedNetworks.map(network => (
        <div key={network.id} className="hw-topo-slot">
          <NetworkCard
            network={network}
            color="var(--hw-topo-pending)"
            feedPresent={graph.feedPresent}
            onDrill={() => {}}
            onTrace={() => {}}
            registerAnchor={registerAnchor}
          />
        </div>
      ))}
    </div>
  );
};

NetworksColumn.propTypes = {
  graph: PropTypes.object.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  visibleNetworks: PropTypes.array.isRequired,
  plannedNetworks: PropTypes.array.isRequired,
  slotClass: PropTypes.func.isRequired,
  lensDim: PropTypes.func.isRequired,
  onDrill: PropTypes.func.isRequired,
  onIsolate: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  canRewire: PropTypes.bool.isRequired,
  dragging: PropTypes.object,
  onDropNic: PropTypes.func.isRequired,
  sharedNetIds: PropTypes.instanceOf(Set),
};

/**
 * The upstream column drawn beside an aggregate, hyperweaver-ui's note
 * on what lies beyond the host.
 */
export const UpstreamColumn = () => {
  const { t } = useTranslation();
  return (
    <div className="hw-topo-col" data-column="upstream">
      <div className="hw-topo-col-title">{t('hostTools.topology.upstreamColumn')}</div>
      <div className="hw-topo-card hw-topo-upstream">
        <div className="hw-topo-card-sub">{t('hostTools.topology.upstreamHeading')}</div>
        <div className="hw-topo-card-sub font-monospace">
          {t('hostTools.topology.upstreamBody')}
        </div>
      </div>
    </div>
  );
};
