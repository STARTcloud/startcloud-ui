import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilter } from 'react-icons/fa6';

import { RateLine } from './TopologyCards';
import { Tinted } from './TopologyTint';

const VBOX_KINDS = ['bridged', 'hostonly', 'hostonlynet', 'internal', 'natnetwork', 'nat'];

const BHYVE_KINDS = ['vlan', 'untagged', 'internal'];

const TITLE_KEYS = {
  internal: 'hostTools.topology.internalNetwork',
  bridged: 'hostTools.topology.bridgedNetwork',
  hostonly: 'hostTools.topology.hostOnlyNetwork',
  hostonlynet: 'hostTools.topology.hostOnlyNetNetwork',
  natnetwork: 'hostTools.topology.natNetwork',
};

/**
 * Whether a staged rewire may target a network, hyperweaver-ui's wire
 * truth: a zone's VLAN id can be set but not cleared in place, so an
 * untagged target takes NICs already untagged alone; a VirtualBox add
 * lands on a bridged network alone.
 *
 * @param {Object|null} dragging - The drag payload
 * @param {Object} network - The network
 * @returns {boolean} True when the drop is allowed
 */
export const dropAllowed = (dragging, network) => {
  if (!dragging || dragging.fromNetId === network.id) {
    return false;
  }
  if (dragging.addNew && dragging.hostKind === 'vbox') {
    return network.kind === 'bridged';
  }
  if (dragging.hostKind === 'vbox') {
    return VBOX_KINDS.includes(network.kind);
  }
  if (!BHYVE_KINDS.includes(network.kind)) {
    return false;
  }
  return !(network.vlanId === 0 && dragging.vlanId > 0);
};

/**
 * The title of a network card by its kind, hyperweaver-ui's words.
 *
 * @param {Object} network - The network
 * @param {Function} t - The translator
 * @returns {string} The title
 */
export const networkTitle = (network, t) => {
  if (TITLE_KEYS[network.kind]) {
    return t(TITLE_KEYS[network.kind], { name: network.carrier });
  }
  if (network.kind === 'nat') {
    return t('hostTools.topology.natShared');
  }
  if (network.vlanId > 0) {
    return t('hostTools.topology.vlanNetwork', { vlanId: network.vlanId });
  }
  return t('hostTools.topology.untaggedNetwork');
};

/**
 * One network card, hyperweaver-ui's: the band and border in the
 * network's color, the title, the shared badge, the isolate button, the
 * carrier or the space's detail, the live and planned counts and the
 * rate; a click drills into it, and with a pinned carrier drops the
 * dragged NIC onto it; a drop target where `dropAllowed` says so.
 */
export const NetworkCard = ({
  network,
  color = null,
  feedPresent,
  onDrill,
  onTrace,
  registerAnchor,
  dragging = null,
  onDropNic = () => {},
  shared = false,
}) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const title = networkTitle(network, t);
  const validTarget = dropAllowed(dragging, network);
  return (
    <Tinted
      as="div"
      anchorRef={el => registerAnchor(`network:${network.id}`, el)}
      tint={color}
      className={`hw-topo-card hw-topo-network ${network.live === 0 ? 'hw-topo-ghost' : ''} ${
        validTarget ? 'hw-topo-drop-valid' : ''
      } ${validTarget && dragOver ? 'hw-topo-drop-over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (dragging?.pinnedCarrier && validTarget) {
          onDropNic(network);
          return;
        }
        onDrill(network.id);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onDrill(network.id);
        }
      }}
      onDragOver={event => {
        if (validTarget) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={event => {
        event.preventDefault();
        setDragOver(false);
        if (validTarget) {
          onDropNic(network);
        }
      }}
      data-network={network.id}
    >
      <Tinted className="hw-topo-net-band" tint={color} />
      <div className="hw-topo-card-head">
        <span className="hw-topo-card-title">{title}</span>
        {shared ? (
          <span className="hw-topo-shared-badge">{t('hostTools.topology.sharedBadge')}</span>
        ) : null}
        <button
          type="button"
          className="hw-topo-open"
          title={t('hostTools.topology.isolateNetwork')}
          onClick={event => {
            event.stopPropagation();
            onTrace([network.id]);
          }}
          data-tool="isolate"
        >
          <FaFilter aria-hidden="true" />
        </button>
      </div>
      <div className="hw-topo-card-sub font-monospace">
        {network.detail || t('hostTools.topology.overCarrier', { carrier: network.carrier })}
      </div>
      <div className="hw-topo-card-sub">
        {t('hostTools.topology.liveCount', { count: network.live })}
        {network.planned > 0
          ? ` · ${t('hostTools.topology.plannedCount', { count: network.planned })}`
          : ''}
        {' · '}
        <RateLine feedPresent={feedPresent} usage={network.usage} muted={network.live === 0} />
      </div>
    </Tinted>
  );
};

NetworkCard.propTypes = {
  network: PropTypes.object.isRequired,
  color: PropTypes.string,
  feedPresent: PropTypes.bool.isRequired,
  onDrill: PropTypes.func.isRequired,
  onTrace: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  dragging: PropTypes.object,
  onDropNic: PropTypes.func,
  shared: PropTypes.bool,
};
