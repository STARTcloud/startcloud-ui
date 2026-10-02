import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';

import { networkTitle } from './TopologyNetworkCard';
import { rateLabels } from './topologyPalette';
import { Bar, Tinted } from './TopologyTint';

const MIN_BAR = 2;

const PERCENT = 100;

const rowsOf = (network, usageByLink) => {
  const byZone = new Map();
  network.members.forEach(member => {
    const zone = member.zone && member.zone !== '--' ? member.zone : 'global';
    if (!byZone.has(zone)) {
      byZone.set(zone, []);
    }
    byZone.get(zone).push(member.link);
  });
  return [...byZone.entries()]
    .map(([zone, links]) => {
      const usage = links.reduce(
        (acc, link) => {
          const linkUsage = usageByLink.get(link);
          acc.rxMbps += linkUsage?.rxMbps || 0;
          acc.txMbps += linkUsage?.txMbps || 0;
          return acc;
        },
        { rxMbps: 0, txMbps: 0 }
      );
      return { zone, links, usage, total: usage.rxMbps + usage.txMbps };
    })
    .sort((a, b) => b.total - a.total);
};

const rateTextOf = (row, feedPresent, t) => {
  const labels = rateLabels(feedPresent, row.usage);
  if (!labels) {
    return t('hostTools.topology.noFeed');
  }
  return row.total > 0 ? `↓${labels.rx} ↑${labels.tx}` : t('hostTools.topology.idle');
};

/**
 * The answer to a click on a network, hyperweaver-ui's drill panel: who
 * is on the network and how much each member moves, real rates with a
 * usage feed and honest placeholders without one.
 */
const TopologyDrillPanel = ({ network, graph, color = null, onClose, onOpenMachine }) => {
  const { t } = useTranslation();
  const rows = useMemo(() => rowsOf(network, graph.usageByLink), [network, graph.usageByLink]);
  const maxTotal = Math.max(...rows.map(row => row.total), 0.000001);

  return (
    <Tinted as="div" className="hw-topo-drill" tint={color} data-panel="topology-drill">
      <div className="hw-topo-drill-head">
        <Tinted className="hw-topo-net-band" tint={color} />
        <span className="hw-topo-card-title">
          {networkTitle(network, t)}
          {' · '}
          <span className="font-monospace">{network.carrier}</span>
        </span>
        <span className="hw-topo-card-meta">
          {t('hostTools.topology.liveCount', { count: network.live })}
          {network.planned > 0
            ? ` · ${t('hostTools.topology.plannedCount', { count: network.planned })}`
            : ''}
        </span>
        <button
          type="button"
          className="hw-topo-open ms-auto"
          title={t('hostTools.topology.closeDrill')}
          onClick={onClose}
          data-tool="close-drill"
        >
          <FaXmark aria-hidden="true" />
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="hw-topo-card-sub">{t('hostTools.topology.noMembers')}</div>
      ) : (
        <div className="hw-topo-drill-rows">
          {rows.map(row => (
            <div key={row.zone} className="hw-topo-drill-row">
              <button
                type="button"
                className="hw-topo-drill-name"
                onClick={() => row.zone !== 'global' && onOpenMachine(row.zone)}
                disabled={row.zone === 'global'}
              >
                {row.zone === 'global' ? t('hostTools.topology.globalZone') : row.zone}
              </button>
              <span className="font-monospace hw-topo-drill-links">{row.links.join(' · ')}</span>
              <span className="hw-topo-drill-bars">
                {graph.feedPresent ? (
                  <>
                    <Bar
                      className="hw-topo-bar hw-topo-bar-tx"
                      percent={Math.max(MIN_BAR, (row.usage.txMbps / maxTotal) * PERCENT)}
                    />
                    <Bar
                      className="hw-topo-bar hw-topo-bar-rx"
                      percent={Math.max(MIN_BAR, (row.usage.rxMbps / maxTotal) * PERCENT)}
                    />
                  </>
                ) : null}
              </span>
              <span className="hw-topo-drill-rate font-monospace">
                {rateTextOf(row, graph.feedPresent, t)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Tinted>
  );
};

TopologyDrillPanel.propTypes = {
  network: PropTypes.object.isRequired,
  graph: PropTypes.object.isRequired,
  color: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onOpenMachine: PropTypes.func.isRequired,
};

export default TopologyDrillPanel;
