import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

import { packetBytes, packetSpawnRate } from './pathMeasure';

const SVG_NS = 'http://www.w3.org/2000/svg';

const FRAME_CAP = 0.1;

const PIXELS_SLOW = 15;

const PIXELS_FAST = 90;

const SPEED_LOW = 0.22;

const SPEED_HIGH = 1.4;

const TRACE_EVERY = 14;

const TRACE_GROW = 1.5;

const SIZE_JITTER = 0.15;

const HALF = 2;

const HEAT_COLORS = {
  idle: 'var(--hw-wm-idle)',
  green: 'var(--hw-wm-1)',
  yellow: 'var(--hw-wm-2)',
  orange: 'var(--hw-wm-3)',
  red: 'var(--hw-wm-4)',
};

const packetSpeed = mbps => Math.min(SPEED_HIGH, SPEED_LOW + Math.log10(1 + mbps * 10) * 0.22);

const pixelsPerSecond = (mbps, scale) =>
  (PIXELS_SLOW +
    ((packetSpeed(mbps) - SPEED_LOW) / (SPEED_HIGH - SPEED_LOW)) * (PIXELS_FAST - PIXELS_SLOW)) *
  scale;

const shareOf = (bytes, range) => {
  if (!range || range.hi <= range.lo) {
    return 1;
  }
  return Math.min(
    1,
    Math.max(0, (Math.log(bytes) - Math.log(range.lo)) / (Math.log(range.hi) - Math.log(range.lo)))
  );
};

const pieceAt = (pieces, distance) => {
  const index = pieces.findIndex(piece => distance <= piece.end);
  return index < 0 ? pieces.length - 1 : index;
};

const spawnPacket = ({ group, lane, rate, shape, count }) => {
  const node = document.createElementNS(SVG_NS, 'circle');
  const traced = count % TRACE_EVERY === 0;
  node.setAttribute(
    'class',
    traced ? `hw-path-packet hw-path-tracer hw-path-tracer-${lane}` : 'hw-path-packet'
  );
  node.setAttribute('r', (shape.dotMin / HALF).toFixed(1));
  node.setAttribute('opacity', traced ? '1' : (0.6 + Math.random() * 0.35).toFixed(2));
  group.appendChild(node);
  return {
    node,
    pos: 0,
    piece: -1,
    traced,
    share: shareOf(packetBytes(rate), shape.range),
    jitter: 1 - SIZE_JITTER + Math.random() * SIZE_JITTER * 2,
    speed: pixelsPerSecond(rate, shape.scale) * (0.8 + Math.random() * 0.4),
  };
};

const diameterOf = (packet, inner, dotMin) => {
  const room = Math.max(dotMin, inner || dotMin);
  const grow = packet.traced ? TRACE_GROW : 1;
  return Math.min(room, (dotMin + packet.share * (room - dotMin)) * packet.jitter * grow);
};

const placePacket = ({ packet, line, length, reverse, shape }) => {
  const along = (reverse ? 1 - packet.pos : packet.pos) * length;
  const point = line.getPointAtLength(along);
  packet.node.setAttribute('cx', point.x.toFixed(1));
  packet.node.setAttribute('cy', point.y.toFixed(1));
  const piece = pieceAt(shape.pieces, along);
  if (piece === packet.piece) {
    return;
  }
  packet.piece = piece;
  const { heat, tint, inner } = shape.pieces[piece];
  packet.node.setAttribute('r', (diameterOf(packet, inner, shape.dotMin) / HALF).toFixed(1));
  if (!packet.traced) {
    packet.node.style.setProperty(
      '--hw-path-c',
      HEAT_COLORS[heat] || shape.colorOf(tint) || 'var(--hw-topo-ghost)'
    );
  }
};

/**
 * hyperweaver-ui's comets flown down a whole chain: packets spawned at
 * the rate the newest sample sets, each `packetSpawnRate` a second, and
 * flown from the vNIC through every hop to the node the path ends at,
 * received ones the other way, at hyperweaver-ui's `packetSpeed` curve
 * laid over 15 to 90 pixels a second times the rail's scale with its
 * jitter, removed at the end. Each packet is sized by the bytes it
 * carries, `packetBytes` of its lane's rate, on a log scale across
 * `range`, from the least packet up to the inner width of the hop it is
 * crossing and never wider, with a jitter of fifteen percent, filled in
 * a lighter tint of the lane it is crossing, one in fourteen the larger
 * ringed tracer of its lane, blue received and yellow sent, so a packet
 * can be followed hop to hop. Every frame reads the rate the newest
 * sample left, so a new sample is seen on the next frame; the loop
 * sleeps while the rate is zero and no packet is in flight and wakes on
 * a new rate, and nothing runs on a clock.
 */
const PathPackets = ({ flow, range = null, colorOf, className = '' }) => {
  const groupRef = useRef(null);
  const lineRef = useRef(null);
  const rateRef = useRef(flow.mbps);
  const shapeRef = useRef({
    scale: flow.scale,
    dotMin: flow.dotMin,
    pieces: flow.pieces,
    range,
    colorOf,
  });
  const wakeRef = useRef(null);

  useEffect(() => {
    shapeRef.current = {
      scale: flow.scale,
      dotMin: flow.dotMin,
      pieces: flow.pieces,
      range,
      colorOf,
    };
  }, [flow.scale, flow.dotMin, flow.pieces, range, colorOf]);

  useEffect(() => {
    rateRef.current = flow.mbps;
    if (flow.mbps > 0 && wakeRef.current) {
      wakeRef.current();
    }
  }, [flow.mbps]);

  useEffect(() => {
    const group = groupRef.current;
    const line = lineRef.current;
    if (!group || !line) {
      return undefined;
    }
    const length = line.getTotalLength() || 1;
    const reverse = flow.lane === 'rx';
    const packets = [];
    let debt = 0;
    let count = 0;
    let last = performance.now();
    let frame = null;
    let running = false;
    const tick = now => {
      const dt = Math.min(FRAME_CAP, (now - last) / 1000);
      last = now;
      const rate = rateRef.current;
      const shape = shapeRef.current;
      if (rate > 0) {
        debt += dt * packetSpawnRate(rate);
        while (debt >= 1) {
          debt -= 1;
          packets.push(spawnPacket({ group, lane: flow.lane, rate, shape, count }));
          count += 1;
        }
      } else {
        debt = 0;
      }
      for (let i = packets.length - 1; i >= 0; i -= 1) {
        const packet = packets[i];
        packet.pos += (dt * packet.speed) / length;
        if (packet.pos >= 1) {
          packet.node.remove();
          packets.splice(i, 1);
        } else {
          placePacket({ packet, line, length, reverse, shape });
        }
      }
      if (rateRef.current <= 0 && packets.length === 0) {
        running = false;
        frame = null;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (running) {
        return;
      }
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;
    if (rateRef.current > 0) {
      wake();
    }
    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      wakeRef.current = null;
      packets.forEach(packet => packet.node.remove());
    };
  }, [flow.d, flow.lane]);

  return (
    <g
      className={`hw-path-packets hw-path-packets-${flow.lane} ${className}`}
      data-paths={flow.paths.join(' ')}
      data-flow={flow.id}
    >
      <path ref={lineRef} d={flow.d} className="hw-path-chain" />
      <g ref={groupRef} />
    </g>
  );
};

PathPackets.propTypes = {
  flow: PropTypes.shape({
    id: PropTypes.string.isRequired,
    d: PropTypes.string.isRequired,
    lane: PropTypes.string.isRequired,
    mbps: PropTypes.number.isRequired,
    scale: PropTypes.number.isRequired,
    dotMin: PropTypes.number.isRequired,
    paths: PropTypes.array.isRequired,
    pieces: PropTypes.array.isRequired,
  }).isRequired,
  range: PropTypes.shape({ lo: PropTypes.number, hi: PropTypes.number }),
  colorOf: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default PathPackets;
