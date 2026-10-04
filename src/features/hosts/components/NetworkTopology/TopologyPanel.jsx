import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaServer, FaTrash } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import SectionHeading from '../../../../components/common/SectionHeading';
import { useStatus } from '../../../../contexts/StatusContext';
import { modifyMachine } from '../../api/machines';
import { useHostMachinesRefresh } from '../../hooks/useHostMachines';
import { useMachineDetailRefresh } from '../../hooks/useMachineDetail';
import { useServers } from '../../hooks/useServers';
import { hostHasFeature } from '../../utils/capabilities';
import { hostLabel } from '../../utils/hosts';
import { machineRoute } from '../../utils/machines';
import { hostHasNetworking } from '../../utils/networking';

import TopologyAddNicModal from './TopologyAddNicModal';
import { buildNicBody } from './topologyApply';
import TopologyCanvas from './TopologyCanvas';
import TopologyDrillPanel from './TopologyDrillPanel';
import TopologyHeader from './TopologyHeader';
import { detectSharedNetworks } from './topologyModel';
import { assignNetworkColors } from './topologyPalette';
import { Tinted } from './TopologyTint';
import TopologyTray from './TopologyTray';
import { TopologyHostFeed } from './useTopologyFeed';
import { useTopologyRewire } from './useTopologyRewire';

const EFFECT_KEY = 'hw-topo-effect';

const DEFAULT_EFFECT = 'comets';

const CHARTS_PANEL = '[data-panel="networking-charts"]';

const LEGEND_KEYS = [
  'hostTools.topology.legendWidth',
  'hostTools.topology.legendMotion',
  'hostTools.topology.legendGhost',
  'hostTools.topology.legendClick',
  'hostTools.topology.legendDrag',
  'hostTools.topology.legendCtrl',
];

const readEffect = () => {
  try {
    return localStorage.getItem(EFFECT_KEY) || DEFAULT_EFFECT;
  } catch {
    return DEFAULT_EFFECT;
  }
};

const writeEffect = value => {
  try {
    localStorage.setItem(EFFECT_KEY, value);
  } catch {
    return undefined;
  }
  return undefined;
};

const hostKindOf = server => (hostHasFeature(server, 'network-spaces') ? 'vbox' : 'bhyve');

const sameNet = (held, hostKey, netId) =>
  Boolean(held && held.hostKey === hostKey && held.netId === netId);

const toggled = (held, hostKey, netId) =>
  sameNet(held, hostKey, netId) ? null : { hostKey, netId };

const issueTotalsOf = hosts =>
  hosts.reduce(
    (acc, host) => {
      const { issues } = host.graph;
      acc.down += issues.downAdapters.length;
      acc.empty += issues.emptySwitches.length;
      acc.ghosts += issues.staleUsageLinks.length;
      acc.disconnected += issues.disconnectedMachines.length;
      acc.unassigned += issues.unassignedVnics.length;
      return acc;
    },
    { down: 0, empty: 0, ghosts: 0, disconnected: 0, unassigned: 0 }
  );

const TopologyHostTitle = ({ server, canRewire }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-topo-host-title">
      <FaServer className="me-2" aria-hidden="true" />
      <span>{hostLabel(server)}</span>
      {canRewire ? null : (
        <span className="hw-topo-card-meta ms-2">{t('hostTools.topology.rewireNeedsModify')}</span>
      )}
    </div>
  );
};

TopologyHostTitle.propTypes = {
  server: PropTypes.object.isRequired,
  canRewire: PropTypes.bool.isRequired,
};

const ChipBar = ({ host, hostKey, colors, isolation, onIsolate }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-topo-chipbar">
      {host.graph.networks
        .filter(net => net.live > 0)
        .sort((a, b) => b.live - a.live)
        .map(net => (
          <button
            key={net.id}
            type="button"
            className={`hw-topo-netchip ${
              sameNet(isolation, hostKey, net.id) ? 'hw-topo-netchip-active' : ''
            }`}
            onClick={() => onIsolate(net.id)}
            data-netchip={net.id}
          >
            <Tinted className="hw-topo-netchip-dot" tint={colors.get(net.id)} />
            {net.vlanId > 0
              ? t('hostTools.topology.vlanBadge', { vlanId: net.vlanId })
              : net.carrier}
            <span className="hw-topo-netchip-count">{net.live}</span>
          </button>
        ))}
    </div>
  );
};

ChipBar.propTypes = {
  host: PropTypes.object.isRequired,
  hostKey: PropTypes.string.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  isolation: PropTypes.object,
  onIsolate: PropTypes.func.isRequired,
};

const applyOne = async ({ status, hostKey, machineName, moves, t }) => {
  const built = buildNicBody(moves[0].hostKind, moves);
  if (built.error) {
    return {
      hostKey,
      machineName,
      ok: false,
      message: t('hostTools.topology.applyNeedsName'),
      moves: [],
    };
  }
  try {
    const answer = await modifyMachine(status, hostKey, machineName, built.body);
    const restart = answer?.requires_restart || answer?.status === 'pending_power_cycle';
    return {
      hostKey,
      machineName,
      ok: true,
      message: restart
        ? t('hostTools.topology.applyReboot')
        : answer?.message || t('hostTools.topology.applyOk'),
      moves,
    };
  } catch (error) {
    return {
      hostKey,
      machineName,
      ok: false,
      message: error.message || t('hostTools.topology.applyFail'),
      moves: [],
    };
  }
};

/**
 * The network topology of the networking page, hyperweaver-ui's
 * `TopologyPanel` as a folding section after the summary: the header
 * with the scope, the lenses, the effect, the pulse and fullscreen; the
 * shared-networks strip over more than one host; the debug lens's issue
 * strip; the armed banner and the remove drop of a drag; the staged
 * tray; then one host after another, its title where more than one is
 * drawn, its chip bar, its canvas and its drill panel; and the legend.
 * Each host's graph comes from `TopologyHostFeed`, one a host, over the
 * copies the hosts feature's context holds, so nothing polls: the
 * structure follows the held reads and the motion the samples the
 * `monitoring` topic pushes. A machine opens at its route and its
 * settings at `/settings`; the host's networking is the Interfaces page,
 * so the open scrolls to its top on this host and navigates to
 * `/hosts/{id}/network/interfaces` on another; a
 * wire's click scrolls to the charts. Apply sends `PUT machines/{name}`
 * with `buildNicBody` per machine, then reads the host's machines and
 * each machine's detail again.
 */
const TopologyPanel = ({ id, fold }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const navigate = useNavigate();
  const { servers } = useServers();
  const refreshMachines = useHostMachinesRefresh();
  const refreshDetail = useMachineDetailRefresh();
  const [scope, setScope] = useState('host');
  const [lens, setLens] = useState(null);
  const [isolation, setIsolation] = useState(null);
  const [drill, setDrill] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyResults, setApplyResults] = useState([]);
  const [effectStyle, setEffectStyle] = useState(readEffect);
  const [hostsById, setHostsById] = useState({});
  const rewire = useTopologyRewire();
  const { dragging, setDragging, trashOver, setTrashOver, pendingMoves, setPendingMoves } = rewire;

  const networkingIds = useMemo(
    () => servers.filter(hostHasNetworking).map(server => String(server.id)),
    [servers]
  );
  const multiHostAvailable = networkingIds.length > 1;
  const ids = useMemo(() => (scope === 'all' ? networkingIds : [id]), [scope, networkingIds, id]);

  const onHost = useCallback((hostId, host) => {
    setHostsById(current => {
      if (!host) {
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== hostId));
      }
      return current[hostId] === host ? current : { ...current, [hostId]: host };
    });
  }, []);

  const hosts = useMemo(
    () => ids.map(hostId => hostsById[hostId]).filter(host => host && host.server),
    [ids, hostsById]
  );
  const feedLive = hosts.some(host => host.graph.feedPresent);
  const seconds = hosts.find(host => host.seconds > 0)?.seconds || 0;
  const loading = hosts.length === 0 || hosts.some(host => !host.loaded);

  const colorMaps = useMemo(
    () =>
      new Map(
        hosts.map(host => [String(host.server.id), assignNetworkColors(host.graph.networks)])
      ),
    [hosts]
  );
  const shared = useMemo(
    () => (scope === 'all' && hosts.length > 1 ? detectSharedNetworks(hosts) : []),
    [scope, hosts]
  );
  const sharedIdsByHost = useMemo(() => {
    const map = new Map();
    shared.forEach(entry => {
      entry.refs.forEach(ref => {
        if (!map.has(ref.hostKey)) {
          map.set(ref.hostKey, new Set());
        }
        map.get(ref.hostKey).add(ref.netId);
      });
    });
    return map;
  }, [shared]);
  const issueTotals = useMemo(() => issueTotalsOf(hosts), [hosts]);

  const openMachine = useCallback(
    (hostKey, name) => navigate(machineRoute(hostKey, name)),
    [navigate]
  );
  const openSettings = useCallback(
    (hostKey, name) => navigate(`${machineRoute(hostKey, name)}/settings`),
    [navigate]
  );
  const openNetworking = useCallback(
    hostKey => {
      if (hostKey === id) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      navigate(`/hosts/${hostKey}/network/interfaces`);
    },
    [id, navigate]
  );
  const wireChart = useCallback(() => {
    document.querySelector(CHARTS_PANEL)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const applyMoves = useCallback(async () => {
    setApplyBusy(true);
    const byMachine = new Map();
    pendingMoves.forEach(move => {
      const key = `${move.hostKey}|${move.machineName}`;
      byMachine.set(key, [...(byMachine.get(key) || []), move]);
    });
    const results = await Promise.all(
      [...byMachine.entries()].map(([key, moves]) => {
        const [hostKey] = key.split('|');
        const machineName = key.slice(hostKey.length + 1);
        return applyOne({ status, hostKey, machineName, moves, t });
      })
    );
    const applied = results.flatMap(result => result.moves);
    setApplyResults(
      results.map(result => ({
        machineName: result.machineName,
        ok: result.ok,
        message: result.message,
      }))
    );
    setPendingMoves(prev =>
      prev.filter(
        move =>
          !applied.some(done => done.machineName === move.machineName && done.link === move.link)
      )
    );
    setApplyBusy(false);
    results
      .filter(result => result.ok)
      .forEach(result => {
        refreshMachines(result.hostKey);
        refreshDetail(result.hostKey, result.machineName);
      });
  }, [pendingMoves, setPendingMoves, status, t, refreshMachines, refreshDetail]);

  const dragHandlers = (hostKey, hostKind) => ({
    onDragNic: drag => {
      if (!drag) {
        setDragging(prev => (prev?.drag?.pinnedCarrier ? prev : null));
        return;
      }
      setDragging({ hostKey, drag: { ...drag, hostKind } });
    },
    onDropNic: network => {
      if (dragging && dragging.hostKey === hostKey) {
        rewire.stageMove(hostKey, network, dragging.drag);
      }
    },
    onDropCarrier: (carrier, ctrl) => {
      if (!dragging || dragging.hostKey !== hostKey) {
        return;
      }
      if (ctrl && hostKind !== 'vbox') {
        setDragging(prev =>
          prev ? { ...prev, drag: { ...prev.drag, pinnedCarrier: carrier.id } } : prev
        );
        return;
      }
      rewire.stageCarrierMove(hostKey, carrier, dragging.drag);
    },
  });

  const heading = t('pages.hostNetworking.topologyHeading');

  return (
    <div
      data-section="networking-topology"
      data-state={loading ? 'loading' : 'rows'}
      data-folded={fold.folded}
      className={`mb-3 ${isFullscreen ? 'hw-topo-fullscreen' : ''}`}
    >
      {ids.map(hostId => (
        <TopologyHostFeed key={hostId} id={hostId} onHost={onHost} />
      ))}
      <SectionHeading
        title={heading}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <>
          <TopologyHeader
            scope={scope}
            onScopeChange={next => {
              setScope(next);
              setIsolation(null);
              setDrill(null);
            }}
            multiHostAvailable={multiHostAvailable}
            lens={lens}
            onLensChange={setLens}
            effectStyle={effectStyle}
            onEffectChange={next => {
              setEffectStyle(next);
              writeEffect(next);
            }}
            isolatedNet={isolation ? isolation.netId : null}
            onClearIsolation={() => setIsolation(null)}
            feedLive={feedLive}
            seconds={seconds}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
          />
          {shared.length > 0 ? (
            <div className="hw-topo-shared-strip" data-note="shared">
              <span className="fw-semibold">{t('hostTools.topology.sharedNetworks')}</span>
              {shared.map(entry => (
                <span key={entry.key} className="font-monospace">
                  {entry.vlanId > 0 ? `VLAN ${entry.vlanId} · ` : ''}
                  {entry.subnet} — {entry.hosts.join(', ')}
                </span>
              ))}
            </div>
          ) : null}
          {lens === 'debug' ? (
            <div className="hw-topo-issues-strip" data-note="issues">
              <span>{t('hostTools.topology.issueDown', { count: issueTotals.down })}</span>
              <span>{t('hostTools.topology.issueEmpty', { count: issueTotals.empty })}</span>
              <span>{t('hostTools.topology.issueStale', { count: issueTotals.ghosts })}</span>
              <span>
                {t('hostTools.topology.issueDisconnected', { count: issueTotals.disconnected })}
              </span>
              <span>
                {t('hostTools.topology.issueUnassigned', { count: issueTotals.unassigned })}
              </span>
            </div>
          ) : null}
          {dragging?.drag?.pinnedCarrier ? (
            <div className="hw-topo-tray hw-topo-armed font-monospace" data-note="armed">
              {t('hostTools.topology.armedBanner', {
                link: dragging.drag.link,
                carrier: dragging.drag.pinnedCarrier,
              })}
            </div>
          ) : null}
          {dragging && !dragging.drag.addNew && !dragging.drag.pinnedCarrier ? (
            <button
              type="button"
              className={`hw-topo-trash ${trashOver ? 'hw-topo-drop-over' : ''}`}
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setTrashOver(true);
              }}
              onDragLeave={() => setTrashOver(false)}
              onDrop={event => {
                event.preventDefault();
                setTrashOver(false);
                rewire.stageRemove(dragging.hostKey, dragging.drag);
              }}
              data-tool="remove-drop"
            >
              <FaTrash className="me-2" aria-hidden="true" />
              {t('hostTools.topology.removeDrop')}
            </button>
          ) : null}
          <TopologyTray
            pendingMoves={pendingMoves}
            applyBusy={applyBusy}
            onApply={applyMoves}
            onDiscard={() => {
              setPendingMoves([]);
              setApplyResults([]);
            }}
            onRetargetVlan={rewire.retargetVlan}
            onRenameNic={rewire.renameNic}
            applyResults={applyResults}
            onClearResults={() => setApplyResults([])}
          />
          {rewire.addDraft ? (
            <TopologyAddNicModal
              draft={rewire.addDraft}
              onStage={rewire.completeAdd}
              onClose={() => rewire.setAddDraft(null)}
            />
          ) : null}
          {loading && hosts.length === 0 ? (
            <div className="text-center p-4">
              <p className="mt-2 small">{t('hostTools.topology.loading')}</p>
            </div>
          ) : null}
          {hosts.map(host => {
            const hostKey = String(host.server.id);
            const canRewire = hostHasFeature(host.server, 'machine-modify');
            const hostKind = hostKindOf(host.server);
            const drillNet =
              drill && drill.hostKey === hostKey
                ? host.graph.networks.find(net => net.id === drill.netId)
                : null;
            return (
              <div key={hostKey} className="hw-topo-host" data-host={hostKey}>
                {scope === 'all' || multiHostAvailable ? (
                  <TopologyHostTitle server={host.server} canRewire={canRewire} />
                ) : null}
                <ChipBar
                  host={host}
                  hostKey={hostKey}
                  colors={colorMaps.get(hostKey)}
                  isolation={isolation}
                  onIsolate={netId => setIsolation(prev => toggled(prev, hostKey, netId))}
                />
                <TopologyCanvas
                  host={host}
                  lens={lens}
                  isolatedNet={isolation && isolation.hostKey === hostKey ? isolation.netId : null}
                  onIsolate={netId => setIsolation(prev => toggled(prev, hostKey, netId))}
                  onDrill={netId => setDrill(prev => toggled(prev, hostKey, netId))}
                  onOpenMachine={name => openMachine(hostKey, name)}
                  canRewire={canRewire}
                  dragging={dragging && dragging.hostKey === hostKey ? dragging.drag : null}
                  pendingMoves={pendingMoves.filter(move => move.hostKey === hostKey)}
                  {...dragHandlers(hostKey, hostKind)}
                  onOpenNetworking={() => openNetworking(hostKey)}
                  onOpenSettings={name => openSettings(hostKey, name)}
                  onWireChart={wireChart}
                  sharedNetIds={sharedIdsByHost.get(hostKey) || null}
                  effectStyle={effectStyle}
                  pulse={host.pulse}
                />
                {drillNet ? (
                  <TopologyDrillPanel
                    network={drillNet}
                    graph={host.graph}
                    color={colorMaps.get(hostKey)?.get(drillNet.id)}
                    onClose={() => setDrill(null)}
                    onOpenMachine={name => openMachine(hostKey, name)}
                  />
                ) : null}
              </div>
            );
          })}
          <div className="hw-topo-legend">
            {LEGEND_KEYS.map(key => (
              <span key={key}>{t(key)}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

TopologyPanel.propTypes = {
  id: PropTypes.string.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
};

export default TopologyPanel;
