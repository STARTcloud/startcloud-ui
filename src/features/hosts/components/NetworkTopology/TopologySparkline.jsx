import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

const HISTORY_CAP = 30;
const SPARK_W = 84;
const SPARK_H = 30;
const PAD = 6;
const DROP = 18;

/**
 * The hover sparkline of the overlay, hyperweaver-ui's: a rolling
 * history of every wire's rates, one sample a pulse of the usage feed,
 * drawn as a small two-line chart at the hovered wire's midpoint.
 */
const WireSparkline = ({ paths, hoveredId = null, pulse = 0 }) => {
  const [history] = useState(() => new Map());
  const pathsRef = useRef(paths);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    const live = new Set();
    pathsRef.current.forEach(path => {
      live.add(path.id);
      if (!history.has(path.id)) {
        history.set(path.id, []);
      }
      const samples = history.get(path.id);
      samples.push({ rx: path.rx, tx: path.tx });
      if (samples.length > HISTORY_CAP) {
        samples.shift();
      }
    });
    [...history.keys()].forEach(id => {
      if (!live.has(id)) {
        history.delete(id);
      }
    });
  }, [pulse, history]);

  if (!hoveredId) {
    return null;
  }
  const path = paths.find(p => p.id === hoveredId);
  const samples = history.get(hoveredId) || [];
  if (!path || samples.length < 2) {
    return null;
  }
  const max = Math.max(...samples.map(s => Math.max(s.rx, s.tx)), 0.001);
  const line = key =>
    samples
      .map((s, index) => {
        const x = path.mx - SPARK_W / 2 + (index / (samples.length - 1)) * SPARK_W;
        const y = path.my + DROP + PAD + SPARK_H - (s[key] / max) * SPARK_H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  return (
    <g className="hw-topo-spark">
      <rect
        x={path.mx - SPARK_W / 2 - PAD}
        y={path.my + DROP}
        width={SPARK_W + PAD * 2}
        height={SPARK_H + PAD * 2}
        rx="4"
      />
      <polyline points={line('rx')} className="hw-topo-spark-rx" />
      <polyline points={line('tx')} className="hw-topo-spark-tx" />
    </g>
  );
};

WireSparkline.propTypes = {
  paths: PropTypes.array.isRequired,
  hoveredId: PropTypes.string,
  pulse: PropTypes.number,
};

export default WireSparkline;
