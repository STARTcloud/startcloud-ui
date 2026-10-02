import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';

const NUMBERS = /-?[\d.]+/gu;

const STEP = 0.02;

const WAVE_STEPS = 48;

const FRAME_CAP = 0.1;

const EQ_BARS = 16;

export const rateWidth = mbps => Math.min(14, Math.max(2, 2 + 3 * Math.log10(1 + mbps * 10)));

/**
 * The five numbers of a connector bezier, its ends and its control x.
 *
 * @param {string} d - The path
 * @returns {{ x1: number, y1: number, cx: number, x2: number, y2: number }} The geometry
 */
export const parseBezier = d => {
  const nums = (d.match(NUMBERS) || []).map(Number);
  return { x1: nums[0], y1: nums[1], cx: nums[2], x2: nums[6], y2: nums[7] };
};

/**
 * The point at `t` along a connector bezier.
 *
 * @param {Object} p - The geometry of `parseBezier`
 * @param {number} t - 0 to 1
 * @returns {{ x: number, y: number }} The point
 */
export const bezierPoint = (p, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * p.x1 + 3 * u * u * t * p.cx + 3 * u * t * t * p.cx + t * t * t * p.x2,
    y: u * u * u * p.y1 + 3 * u * u * t * p.y1 + 3 * u * t * t * p.y2 + t * t * t * p.y2,
  };
};

const normalAt = (geom, t) => {
  const ahead = bezierPoint(geom, Math.min(1, t + STEP));
  const behind = bezierPoint(geom, Math.max(0, t - STEP));
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const norm = Math.hypot(dx, dy) || 1;
  return { nx: -dy / norm, ny: dx / norm };
};

/**
 * The connector shifted by a vertical offset, a parallel lane.
 *
 * @param {string} d - The path
 * @param {number} offset - The pixels down
 * @returns {string} The lane's path
 */
export const lanePath = (d, offset) => {
  const p = parseBezier(d);
  return `M${p.x1},${p.y1 + offset} C ${p.cx},${p.y1 + offset} ${p.cx},${p.y2 + offset} ${p.x2},${p.y2 + offset}`;
};

/**
 * The same lane drawn end to start, so its arrowhead points back toward
 * the machines column.
 *
 * @param {string} d - The path
 * @param {number} offset - The pixels down
 * @returns {string} The lane's path
 */
export const lanePathReversed = (d, offset) => {
  const p = parseBezier(d);
  return `M${p.x2},${p.y2 + offset} C ${p.cx},${p.y2 + offset} ${p.cx},${p.y1 + offset} ${p.x1},${p.y1 + offset}`;
};

/**
 * A waveform riding the connector, the bezier sampled and displaced by a
 * sine whose amplitude and frequency breathe with the rate, its phase
 * making the crests travel frame by frame.
 *
 * @param {string} d - The path
 * @param {number} mbps - The rate
 * @param {number} [phase] - The phase
 * @returns {string} The wave's path
 */
export const sinePath = (d, mbps, phase = 0) => {
  const p = parseBezier(d);
  const amplitude = Math.min(11, 3 + Math.log10(1 + mbps * 10) * 3.2);
  const wavelength = Math.max(18, 34 - Math.log10(1 + mbps * 10) * 5);
  const points = [];
  let length = 0;
  let prev = bezierPoint(p, 0);
  for (let i = 0; i <= WAVE_STEPS; i += 1) {
    const t = i / WAVE_STEPS;
    const pt = bezierPoint(p, t);
    length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
    const ahead = bezierPoint(p, Math.min(1, t + STEP));
    const behind = bezierPoint(p, Math.max(0, t - STEP));
    const tx = ahead.x - behind.x;
    const ty = ahead.y - behind.y;
    const norm = Math.hypot(tx, ty) || 1;
    const wave = amplitude * Math.sin((length / wavelength) * Math.PI * 2 + phase);
    points.push(
      `${(pt.x + (-ty / norm) * wave).toFixed(1)},${(pt.y + (tx / norm) * wave).toFixed(1)}`
    );
  }
  return `M${points.join(' L')}`;
};

const waveOmega = mbps => Math.PI * 2 * (0.5 + Math.log10(1 + mbps * 10) * 0.7);

/**
 * The wave effect: two sines, sent and received, whose crests travel
 * with each animation frame, the geometry moved per frame and never on
 * a clock.
 */
export const WaveForm = ({ path }) => {
  const txRef = useRef(null);
  const rxRef = useRef(null);
  const ratesRef = useRef({ tx: path.tx, rx: path.rx });

  useEffect(() => {
    ratesRef.current = { tx: path.tx, rx: path.rx };
  }, [path.tx, path.rx]);

  useEffect(() => {
    let frame;
    const tick = now => {
      const t = now / 1000;
      const { tx, rx } = ratesRef.current;
      if (txRef.current && tx > 0) {
        txRef.current.setAttribute('d', sinePath(path.d, tx, -t * waveOmega(tx)));
      }
      if (rxRef.current && rx > 0) {
        rxRef.current.setAttribute('d', sinePath(path.d, rx, Math.PI + t * waveOmega(rx)));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [path.d]);

  return (
    <>
      {path.tx > 0 ? (
        <path
          ref={txRef}
          d={sinePath(path.d, path.tx)}
          className="hw-topo-waveline hw-topo-waveline-tx"
          strokeWidth={Math.max(1.6, rateWidth(path.tx) * 0.5)}
        />
      ) : null}
      {path.rx > 0 ? (
        <path
          ref={rxRef}
          d={sinePath(path.d, path.rx, Math.PI)}
          className="hw-topo-waveline hw-topo-waveline-rx"
          strokeWidth={Math.max(1.6, rateWidth(path.rx) * 0.5)}
        />
      ) : null}
    </>
  );
};

WaveForm.propTypes = {
  path: PropTypes.shape({
    d: PropTypes.string.isRequired,
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
  }).isRequired,
};

const packetSpawnRate = mbps => Math.min(16, 1.2 + Math.log10(1 + mbps * 10) * 4.5);
const packetSpeed = mbps => Math.min(1.4, 0.22 + Math.log10(1 + mbps * 10) * 0.22);

const drawPacketSize = mbps => {
  const jumboChance = Math.min(0.4, Math.log10(1 + mbps) * 0.16);
  if (Math.random() < jumboChance) {
    return 4.5 + Math.random() * Math.min(7, 2 + Math.log10(1 + mbps) * 2.4);
  }
  return 1.7 + Math.random() * 2.1;
};

const spawnPacket = ({ group, className, rate, packets }) => {
  const node = document.createElementNS(SVG_NS, 'circle');
  node.setAttribute('class', className);
  node.setAttribute('r', drawPacketSize(rate).toFixed(1));
  node.setAttribute('opacity', (0.6 + Math.random() * 0.35).toFixed(2));
  group.appendChild(node);
  packets.push({ node, pos: 0, speed: packetSpeed(rate) * (0.8 + Math.random() * 0.4) });
};

const movePackets = ({ packets, dt, geom, reverse, offset }) => {
  for (let i = packets.length - 1; i >= 0; i -= 1) {
    const packet = packets[i];
    packet.pos += dt * packet.speed;
    if (packet.pos >= 1) {
      packet.node.remove();
      packets.splice(i, 1);
    } else {
      const pt = bezierPoint(geom, reverse ? 1 - packet.pos : packet.pos);
      packet.node.setAttribute('cx', pt.x.toFixed(1));
      packet.node.setAttribute('cy', (pt.y + offset).toFixed(1));
    }
  }
};

/**
 * The comets effect: packets spawned at a rate the measurement sets and
 * flown along the connector frame by frame, the loop sleeping while the
 * rate is zero and no packet is in flight and woken by a new rate.
 */
export const PacketField = ({ d, mbps, reverse = false, offset = 0, className }) => {
  const groupRef = useRef(null);
  const rateRef = useRef(mbps);
  const wakeRef = useRef(null);

  useEffect(() => {
    rateRef.current = mbps;
    if (mbps > 0 && wakeRef.current) {
      wakeRef.current();
    }
  }, [mbps]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return undefined;
    }
    const geom = parseBezier(d);
    const packets = [];
    let debt = 0;
    let last = performance.now();
    let frame = null;
    let running = false;
    const tick = now => {
      const dt = Math.min(FRAME_CAP, (now - last) / 1000);
      last = now;
      const rate = rateRef.current;
      if (rate > 0) {
        debt += dt * packetSpawnRate(rate);
        while (debt >= 1) {
          debt -= 1;
          spawnPacket({ group, className, rate, packets });
        }
      } else {
        debt = 0;
      }
      movePackets({ packets, dt, geom, reverse, offset });
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
  }, [d, reverse, offset, className]);

  return <g ref={groupRef} />;
};

PacketField.propTypes = {
  d: PropTypes.string.isRequired,
  mbps: PropTypes.number.isRequired,
  reverse: PropTypes.bool,
  offset: PropTypes.number,
  className: PropTypes.string,
};

const eqSpeed = mbps => 1.6 + Math.log10(1 + mbps * 10) * 1.3;
const eqAmp = mbps => Math.min(13, 3 + Math.log10(1 + mbps * 10) * 3.4);

const barHeight = (mbps, seed, t, direction) => {
  if (mbps <= 0) {
    return 0;
  }
  const drift = t * eqSpeed(mbps) * direction;
  const pulse = Math.abs(Math.sin(seed * 1.9 + drift) * Math.sin(seed * 0.57 - drift * 0.45));
  return eqAmp(mbps) * (0.22 + 0.78 * pulse);
};

const setBar = (bar, pt, nx, ny, height) => {
  bar.setAttribute('x1', pt.x.toFixed(1));
  bar.setAttribute('y1', pt.y.toFixed(1));
  bar.setAttribute('x2', (pt.x + nx * height).toFixed(1));
  bar.setAttribute('y2', (pt.y + ny * height).toFixed(1));
};

/**
 * The bars effect: sixteen bars across the connector, sent above and
 * received below, dancing with the rate frame by frame.
 */
export const Equalizer = ({ path }) => {
  const groupRef = useRef(null);
  const ratesRef = useRef({ tx: path.tx, rx: path.rx });

  useEffect(() => {
    ratesRef.current = { tx: path.tx, rx: path.rx };
  }, [path.tx, path.rx]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return undefined;
    }
    const geom = parseBezier(path.d);
    const slots = [...Array(EQ_BARS).keys()].map(index => {
      const t = 0.08 + (index / (EQ_BARS - 1)) * 0.84;
      const pt = bezierPoint(geom, t);
      const { nx, ny } = normalAt(geom, t);
      const txBar = document.createElementNS(SVG_NS, 'line');
      txBar.setAttribute('class', 'hw-topo-eq hw-topo-eq-tx');
      const rxBar = document.createElementNS(SVG_NS, 'line');
      rxBar.setAttribute('class', 'hw-topo-eq hw-topo-eq-rx');
      group.appendChild(txBar);
      group.appendChild(rxBar);
      return { pt, nx, ny, txBar, rxBar, seed: index };
    });
    let frame;
    const tick = now => {
      const t = now / 1000;
      const { tx, rx } = ratesRef.current;
      slots.forEach(slot => {
        setBar(slot.txBar, slot.pt, slot.nx, slot.ny, barHeight(tx, slot.seed, t, -1));
        setBar(slot.rxBar, slot.pt, -slot.nx, -slot.ny, barHeight(rx, slot.seed, t, 1));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      slots.forEach(slot => {
        slot.txBar.remove();
        slot.rxBar.remove();
      });
    };
  }, [path.d]);

  return <g ref={groupRef} />;
};

Equalizer.propTypes = {
  path: PropTypes.shape({
    d: PropTypes.string.isRequired,
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
  }).isRequired,
};
