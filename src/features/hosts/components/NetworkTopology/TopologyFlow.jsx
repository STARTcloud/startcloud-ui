import PropTypes from 'prop-types';

import {
  Equalizer,
  PacketField,
  WaveForm,
  lanePath,
  lanePathReversed,
  rateWidth,
} from './TopologyFlowMotion';
import { flowPeriod, utilization, utilizationColor } from './topologyPalette';
import { FlowPath } from './TopologyTint';

export const EFFECT_STYLES = ['comets', 'weathermap', 'wave', 'bars', 'rivers'];

const HEAD_MIN = 9;

const HEAD_MAX = 16;

const GIGABIT = 1000;

const KILO = 1000;

const ArrowLane = ({ id, d, mbps, speedMbps }) => {
  if (mbps <= 0) {
    return null;
  }
  const color = utilizationColor(utilization(mbps, speedMbps));
  const width = rateWidth(mbps);
  const head = Math.min(HEAD_MAX, Math.max(HEAD_MIN, width * 1.1 + 3));
  const markerId = `hw-arrow-${id}`;
  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth={head}
          markerHeight={head}
          refX={head - 1}
          refY={head / 2}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M0,${(head * 0.18).toFixed(1)} L${(head - 1).toFixed(1)},${(head / 2).toFixed(1)} L0,${(head * 0.82).toFixed(1)} Z`}
            fill={color}
          />
        </marker>
      </defs>
      <FlowPath
        d={d}
        className="hw-topo-wire hw-topo-lane"
        stroke={color}
        strokeWidth={width}
        period={flowPeriod(mbps)}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
};

ArrowLane.propTypes = {
  id: PropTypes.string.isRequired,
  d: PropTypes.string.isRequired,
  mbps: PropTypes.number.isRequired,
  speedMbps: PropTypes.number,
};

const Weathermap = ({ path }) => (
  <>
    <ArrowLane
      id={`${path.id}-tx`}
      d={lanePath(path.d, -Math.max(4, rateWidth(path.tx) * 0.8))}
      mbps={path.tx}
      speedMbps={path.speedMbps}
    />
    <ArrowLane
      id={`${path.id}-rx`}
      d={lanePathReversed(path.d, Math.max(4, rateWidth(path.rx) * 0.8))}
      mbps={path.rx}
      speedMbps={path.speedMbps}
    />
  </>
);

Weathermap.propTypes = {
  path: PropTypes.object.isRequired,
};

const Rivers = ({ path }) => {
  const heat = utilizationColor(utilization(path.rx + path.tx, path.speedMbps));
  return (
    <>
      <FlowPath
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-tx"
        stroke={heat}
        strokeWidth={Math.max(2, rateWidth(path.tx) * 0.6)}
        period={flowPeriod(Math.max(path.tx, 0.001))}
      />
      <FlowPath
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-rx"
        strokeWidth={Math.max(1.6, rateWidth(path.rx) * 0.5)}
        period={flowPeriod(Math.max(path.rx, 0.001))}
      />
    </>
  );
};

Rivers.propTypes = {
  path: PropTypes.object.isRequired,
};

/**
 * The pluggable effect stack, hyperweaver-ui's five: every style reads
 * the same live rates, so width, amplitude, cadence and heat breathe
 * with the measurement, and with reduced motion asked a still heat
 * line stands in; no measurement, no motion.
 */
export const FlowEffects = ({ path, effect = 'comets', reducedMotion }) => {
  const total = path.rx + path.tx;
  if (reducedMotion) {
    if (total <= 0) {
      return null;
    }
    return (
      <path
        d={path.d}
        className="hw-topo-wire"
        stroke={utilizationColor(utilization(total, path.speedMbps))}
        strokeWidth={rateWidth(total) * 0.6}
        opacity="0.8"
      />
    );
  }
  if (effect === 'comets') {
    return (
      <>
        <PacketField d={path.d} mbps={path.tx} offset={-4} className="hw-topo-particle-tx" />
        <PacketField d={path.d} mbps={path.rx} reverse offset={4} className="hw-topo-particle-rx" />
      </>
    );
  }
  if (total <= 0) {
    return null;
  }
  if (effect === 'wave') {
    return <WaveForm path={path} />;
  }
  if (effect === 'bars') {
    return <Equalizer path={path} />;
  }
  if (effect === 'rivers') {
    return <Rivers path={path} />;
  }
  return <Weathermap path={path} />;
};

FlowEffects.propTypes = {
  path: PropTypes.shape({
    id: PropTypes.string,
    d: PropTypes.string.isRequired,
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
    width: PropTypes.number,
    speedMbps: PropTypes.number,
  }).isRequired,
  effect: PropTypes.string,
  reducedMotion: PropTypes.bool,
};

/**
 * A rate as the wire labels draw it, `1.2G`, `3.4M` or `56K`.
 *
 * @param {number} mbps - The rate
 * @returns {string} The label
 */
export const compactRate = mbps => {
  if (mbps >= GIGABIT) {
    return `${(mbps / GIGABIT).toFixed(1)}G`;
  }
  if (mbps >= 1) {
    return `${mbps.toFixed(1)}M`;
  }
  return `${Math.round(mbps * KILO)}K`;
};

/**
 * The always-on rate label of a measured wire, the motion grammar's
 * promise.
 */
export const FlowLabel = ({ path }) => {
  if (path.rx + path.tx <= 0 || !path.cap) {
    return null;
  }
  return (
    <g className="hw-topo-flowlabel">
      <text x={path.mx} y={path.my - 6} textAnchor="middle">
        <tspan className="hw-topo-flowlabel-rx">↓{compactRate(path.rx)}</tspan>
        <tspan dx="6" className="hw-topo-flowlabel-tx">
          ↑{compactRate(path.tx)}
        </tspan>
      </text>
    </g>
  );
};

FlowLabel.propTypes = {
  path: PropTypes.shape({
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
    mx: PropTypes.number,
    my: PropTypes.number,
    cap: PropTypes.bool,
  }).isRequired,
};
