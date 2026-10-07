import PropTypes from 'prop-types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChartColumn } from 'react-icons/fa6';

import { useCssVar } from '../../../../hooks/useCssVar';

import { buildPathGeometry, fitLevelsOf, nextFitLevel } from './pathMeasure';
import PathPackets from './PathPackets';
import { StateDot } from './TopologyCards';
import { compactRate } from './TopologyFlow';
import { Tinted } from './TopologyTint';

const PERCENT = 100;

const HALF = 2;

const PILL_MARGIN = 4;

const CHIP_FLOOR = 72;

const FIT_VARS = { conn: '--hw-path-conn-min', chip: '--hw-path-chip-min' };

const keyActivates = (event, action) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

/**
 * A utilization fraction as a percent, `<1%` under one.
 *
 * @param {number} util - The fraction
 * @returns {string} The percent
 */
export const percentText = util => (util * PERCENT < 1 ? '<1%' : `${Math.round(util * PERCENT)}%`);

/**
 * The text of one word of the graph, a locale key with its values or a
 * literal.
 *
 * @param {Function} t - The translator
 * @param {{ key?: string, values?: Object, text?: string }} word - The word
 * @returns {string} The text
 */
export const sayWord = (t, word) => (word.key ? t(word.key, word.values) : word.text);

/**
 * A node's name, its label or its title's words.
 *
 * @param {Function} t - The translator
 * @param {Object} node - The node
 * @returns {string} The name
 */
export const nodeName = (t, node) => (node.title ? sayWord(t, node.title) : node.label);

const quietWord = (node, feedPresent) => {
  if (node.state === 'ghost') {
    return 'hostTools.topology.planned';
  }
  if (!node.rate && !feedPresent) {
    return 'hostTools.topology.noFeed';
  }
  return 'hostTools.topology.idle';
};

const moving = node => Boolean(node.rate) && node.rate.rx + node.rate.tx > 0;

const RateWords = ({ node, feedPresent, of = '' }) => {
  const { t } = useTranslation();
  if (node.state === 'ghost' || !moving(node)) {
    return (
      <span className="hw-topo-rate hw-topo-rate-idle">{t(quietWord(node, feedPresent))}</span>
    );
  }
  return (
    <>
      <span className="hw-path-rx">↓{compactRate(node.rate.rx)}</span>{' '}
      <span className="hw-path-tx">↑{compactRate(node.rate.tx)}</span>
      {of ? <span className="hw-path-of"> /{of}</span> : null}
    </>
  );
};

RateWords.propTypes = {
  node: PropTypes.object.isRequired,
  feedPresent: PropTypes.bool.isRequired,
  of: PropTypes.string,
};

const plainWords = (t, words) =>
  words
    .filter(word => !word.rate)
    .map(word => sayWord(t, word))
    .join(' · ');

const titleText = (t, node, action) =>
  [
    t(`hostTools.networkPath.kind.${node.kind}`),
    nodeName(t, node),
    plainWords(t, node.meta),
    ...node.lines.map(entry => plainWords(t, entry.words)),
    t(action),
  ]
    .filter(Boolean)
    .join(' · ');

const wordKey = (word, index) => `${word.key || word.text || 'rate'}-${index}`;

const Line = ({ node, words, tinted, extra, feedPresent }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`hw-topo-card-sub ${tinted ? 'hw-path-net' : ''} ${extra ? 'hw-path-extra' : ''}`}
    >
      {words.map((word, index) => (
        <span key={wordKey(word, index)} className={word.mono ? 'font-monospace' : ''}>
          {index > 0 ? ' · ' : ''}
          {word.rate ? (
            <RateWords node={node} feedPresent={feedPresent} of={word.of} />
          ) : (
            sayWord(t, word)
          )}
        </span>
      ))}
    </div>
  );
};

Line.propTypes = {
  node: PropTypes.object.isRequired,
  words: PropTypes.array.isRequired,
  tinted: PropTypes.bool.isRequired,
  extra: PropTypes.bool.isRequired,
  feedPresent: PropTypes.bool.isRequired,
};

const MemberDots = ({ members }) => (
  <div className="hw-topo-card-sub hw-path-member-dots" data-note="member-dots">
    {members.map(member => (
      <span key={member.name} className="hw-path-member-dot">
        <StateDot up={member.state === 'up'} />
        <span className="font-monospace">{member.name}</span>
      </span>
    ))}
  </div>
);

MemberDots.propTypes = {
  members: PropTypes.array.isRequired,
};

const focusOn = (focus, paths) => Boolean(focus) && paths.some(id => focus.has(id));

const focusClass = (focus, paths) => (focusOn(focus, paths) ? 'hw-path-on' : '');

const Cell = ({ layer, row, span = 1, className = '', children = null }) => {
  const ref = useRef(null);
  useCssVar(ref, '--hw-path-col', String(layer * HALF + 1));
  useCssVar(ref, '--hw-path-row', String(row + 1));
  useCssVar(ref, '--hw-path-span', String(span));
  return (
    <div ref={ref} className={`hw-path-cell ${className}`} data-layer={layer}>
      {children}
    </div>
  );
};

Cell.propTypes = {
  layer: PropTypes.number.isRequired,
  row: PropTypes.number.isRequired,
  span: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.node,
};

const Chip = ({
  node,
  color,
  feedPresent,
  focus,
  registerAnchor,
  onActivate,
  onChart,
  onHover,
}) => {
  const { t } = useTranslation();
  const pins = node.kind === 'vnic';
  const action = pins ? 'hostTools.networkPath.focusStream' : 'hostTools.networkPath.openHop';
  const openChart = t('hostTools.networkPath.openChart');
  return (
    <Tinted
      as="div"
      anchorRef={el => registerAnchor(node.id, el)}
      tint={color}
      className={`hw-topo-card hw-path-chip ${node.state === 'ghost' ? 'hw-topo-ghost' : ''} ${
        node.hot ? 'hw-path-hot' : ''
      } ${node.members.length > 0 ? 'hw-path-chip-wrap' : ''} ${focusClass(focus, node.paths)}`}
      role="button"
      tabIndex={0}
      title={titleText(t, node, action)}
      onClick={() => onActivate(node)}
      onKeyDown={event => keyActivates(event, () => onActivate(node))}
      onMouseEnter={() => onHover(node.paths)}
      onMouseLeave={() => onHover(null)}
      data-hop={node.id}
      data-kind={node.kind}
      data-hot={node.hot ? 'true' : 'false'}
      data-paths={node.paths.join(' ')}
    >
      <Tinted className="hw-topo-net-band" tint={color} />
      <div className="hw-topo-card-head">
        <StateDot up={node.state === 'up'} ghost={node.state === 'ghost'} />
        <span className={`hw-topo-card-title ${node.mono ? 'font-monospace' : ''}`}>
          {nodeName(t, node)}
        </span>
        {node.meta.length > 0 ? (
          <span className="hw-topo-card-meta">{plainWords(t, node.meta)}</span>
        ) : null}
        {node.hot ? (
          <span
            className="badge text-bg-warning hw-path-pct"
            title={t('hostTools.networkPath.busiest')}
            data-note="busiest"
          >
            {percentText(node.util)}
          </span>
        ) : null}
        <button
          type="button"
          className="hw-topo-open hw-path-chart"
          title={openChart}
          aria-label={openChart}
          data-tool="hop-chart"
          onClick={event => {
            event.stopPropagation();
            onChart(node);
          }}
        >
          <FaChartColumn aria-hidden="true" />
        </button>
      </div>
      {node.lines.map(entry => (
        <Line
          key={entry.words.map(wordKey).join('|')}
          node={node}
          words={entry.words}
          tinted={entry.tinted}
          extra={Boolean(entry.extra)}
          feedPresent={feedPresent}
        />
      ))}
      {node.members.length > 0 ? <MemberDots members={node.members} /> : null}
    </Tinted>
  );
};

Chip.propTypes = {
  node: PropTypes.object.isRequired,
  color: PropTypes.string,
  feedPresent: PropTypes.bool.isRequired,
  focus: PropTypes.instanceOf(Set),
  registerAnchor: PropTypes.func.isRequired,
  onActivate: PropTypes.func.isRequired,
  onChart: PropTypes.func.isRequired,
  onHover: PropTypes.func.isRequired,
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const tintOf = (heat, color) => (heat === 'tint' ? color : undefined);

const Pipe = ({ lane, stroke }) => {
  const down = lane.heat === 'down';
  if (lane.hollow === null) {
    return (
      <path
        d={lane.d}
        className={`hw-path-lane ${down ? 'hw-path-lane-down' : ''}`}
        stroke={stroke}
        strokeWidth={lane.width.toFixed(1)}
      />
    );
  }
  return (
    <>
      <path
        d={lane.d}
        className={down ? 'hw-path-lane hw-path-lane-down' : 'hw-path-pipe-wall'}
        stroke={stroke}
        strokeWidth={lane.width.toFixed(1)}
      />
      <path d={lane.d} className="hw-path-pipe-hollow" strokeWidth={lane.hollow.toFixed(1)} />
      {lane.fill ? (
        <path
          d={lane.d}
          className="hw-path-lane"
          stroke={stroke}
          strokeWidth={lane.fill.toFixed(1)}
        />
      ) : null}
    </>
  );
};

Pipe.propTypes = {
  lane: PropTypes.object.isRequired,
  stroke: PropTypes.string,
};

const Lane = ({ lane, color }) => {
  const stroke = tintOf(lane.heat, color);
  return (
    <g className={`hw-path-heat-${lane.heat}`} data-lane={lane.lane}>
      <Pipe lane={lane} stroke={stroke} />
      {lane.stripe ? (
        <path
          d={lane.stripe.d}
          className="hw-path-lane hw-path-stripe"
          stroke={stroke}
          strokeWidth={lane.stripe.width.toFixed(1)}
        />
      ) : null}
      {lane.arrow ? <polygon points={lane.arrow} className="hw-path-arrow" fill={stroke} /> : null}
    </g>
  );
};

Lane.propTypes = {
  lane: PropTypes.object.isRequired,
  color: PropTypes.string,
};

const Segment = ({ segment, color, focus }) => (
  <g
    className={`hw-path-seg ${focusClass(focus, segment.paths)}`}
    data-paths={segment.paths.join(' ')}
    data-seg={segment.id}
    data-down={segment.down ? 'true' : 'false'}
  >
    {segment.lanes.map(lane =>
      segment.ghost && !segment.down ? (
        <path
          key={lane.lane}
          d={lane.d}
          className="hw-path-lane hw-path-lane-ghost"
          stroke={color}
          strokeWidth={lane.width}
        />
      ) : (
        <Lane key={lane.lane} lane={lane} color={color} />
      )
    )}
  </g>
);

const Trunk = ({ trunk, focus }) => (
  <g
    className={`hw-path-trunk ${focusClass(focus, trunk.paths)}`}
    data-paths={trunk.paths.join(' ')}
    data-trunk={trunk.id}
  >
    {trunk.legs.map(d => (
      <g key={d}>
        <path d={d} className="hw-path-trunk-wall" strokeWidth={trunk.width.toFixed(1)} />
        <path d={d} className="hw-path-pipe-hollow" strokeWidth={trunk.hollow.toFixed(1)} />
      </g>
    ))}
  </g>
);

Trunk.propTypes = {
  trunk: PropTypes.object.isRequired,
  focus: PropTypes.instanceOf(Set),
};

Segment.propTypes = {
  segment: PropTypes.object.isRequired,
  color: PropTypes.string,
  focus: PropTypes.instanceOf(Set),
};

const Pill = ({ id, pill, heat, color, paths, focus, onMeasure }) => {
  const { t } = useTranslation();
  const textRef = useRef(null);
  const [measured, setMeasured] = useState(null);
  const label = pill.key ? t(pill.key) : pill.label;

  useLayoutEffect(() => {
    const drawn = textRef.current?.getComputedTextLength?.() || 0;
    const width = drawn > 0 ? drawn + pill.pad : pill.width;
    setMeasured(width);
    onMeasure(id, width);
    return () => onMeasure(id, null);
  }, [id, label, pill.pad, pill.width, onMeasure]);

  const width = measured ?? pill.width;
  return (
    <g
      className={`hw-path-pill hw-path-heat-${heat} ${focusClass(focus, paths)}`}
      data-paths={paths.join(' ')}
      data-pill={heat === 'down' ? 'down' : 'rate'}
    >
      <rect
        x={pill.x - width / HALF}
        y={pill.y - pill.height / HALF}
        width={width}
        height={pill.height}
        rx={pill.height / HALF}
        stroke={tintOf(heat, color)}
      />
      <text ref={textRef} x={pill.x} y={pill.y} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
};

Pill.propTypes = {
  id: PropTypes.string.isRequired,
  pill: PropTypes.object.isRequired,
  heat: PropTypes.string.isRequired,
  color: PropTypes.string,
  paths: PropTypes.array.isRequired,
  focus: PropTypes.instanceOf(Set),
  onMeasure: PropTypes.func.isRequired,
};

const edgesOf = (container, anchors) => {
  const box = container.getBoundingClientRect();
  const edges = new Map();
  anchors.forEach((el, id) => {
    if (!el.isConnected) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const y = rect.top + rect.height / HALF - box.top;
    edges.set(id, {
      l: { x: rect.left - box.left, y },
      r: { x: rect.right - box.left, y },
      h: rect.height,
    });
  });
  return edges;
};

const EMPTY_GEOMETRY = { segments: [], trunks: [], flows: [], range: null, widestTrunk: 0 };

const EMPTY_FIT = { conn: null, chip: null };

const drawingOf = container => {
  const style = getComputedStyle(container);
  return {
    scale: parseFloat(style.getPropertyValue('--hw-path-scale')) || 1,
    compact: style.getPropertyValue('--hw-path-compact').trim() === '1',
  };
};

const pixelsOf = (style, name) => parseFloat(style.getPropertyValue(name)) || 0;

const fitOf = (container, widest, trunk) => {
  const style = getComputedStyle(container);
  const conn = Math.ceil(
    Math.max(pixelsOf(style, '--hw-path-conn-min-base'), widest + PILL_MARGIN * HALF, trunk)
  );
  const shown = [...container.querySelectorAll('.hw-path-grid > [data-layer]')].filter(
    cell => cell.getClientRects().length > 0
  );
  const columns = Math.max(1, new Set(shown.map(cell => cell.dataset.layer)).size);
  const room = container.parentElement.clientWidth;
  const chip = Math.floor(
    Math.max(
      CHIP_FLOOR,
      Math.min(pixelsOf(style, '--hw-path-chip-min-base'), (room - (columns - 1) * conn) / columns)
    )
  );
  return { conn: `${conn}px`, chip: `${chip}px` };
};

const applyFit = (container, fit) =>
  Object.entries(FIT_VARS).reduce((changed, [key, name]) => {
    const held = container.style.getPropertyValue(name);
    const value = fit[key];
    if (value === null) {
      container.style.removeProperty(name);
      return changed || held !== '';
    }
    if (held === value) {
      return changed;
    }
    container.style.setProperty(name, value);
    return true;
  }, false);

/**
 * The network path's rail, the renderer of a layered graph of
 * `buildPathGraph`: one row a path, a chip a node in its layer's column
 * over the rows of the paths through it with a long connector column
 * between two layers, a dashed separator between the paths of two end
 * nodes, the end note after a path that ends short of the uplinks and
 * an aggregate's member links stacked in the last column over its rows;
 * over them the SVG overlay of `buildPathGeometry`, the trunks, each
 * hop's two lanes or pipes and each path's flows, measured from the
 * chips again whenever the rail resizes, at
 * the `--hw-path-scale` and the `--hw-path-compact` the canvas computes.
 * After every draw the rail compares the canvas it drew with the room
 * its wrapper has and steps through `fitLevelsOf` by `nextFitLevel`,
 * the level on the wrapper as `data-fit` with `data-compact`,
 * `data-fold` and `data-small`, the stylesheet's keys; it never scrolls
 * sideways. A compact rail measures its pills as they draw and sets the
 * connector's least width to the widest pill and its margins or the
 * widest trunk and the chips' least width to what the row leaves them,
 * down to a floor. Each
 * chip is the name with the busiest badge and the chart glyph and the
 * lines of its kind, an aggregate's member dots among them for a rail
 * too narrow for the member column; hovering a chip lights the paths
 * through it and dims the rest, a click on a chip of the first layer
 * pins its path until a second click, the chip over the rail or Escape
 * clears it, Escape alone while `dialogOpen` is false, and a click on
 * any other chip or on a chart glyph opens it through `onOpen`. Nothing
 * here reads anything.
 */
const PathRail = ({ graph, colors, feedPresent, onOpen, dialogOpen = false }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const fitRef = useRef(null);
  const anchorsRef = useRef(new Map());
  const pillWidthsRef = useRef(new Map());
  const needsRef = useRef({ shape: '', widths: new Map() });
  const dialogRef = useRef(dialogOpen);
  const [geometry, setGeometry] = useState(EMPTY_GEOMETRY);
  const [layoutTick, setLayoutTick] = useState(0);
  const [fitLevel, setFitLevel] = useState(0);
  const members = graph.layout.stacks.length > 0;
  const levels = fitLevelsOf(members);
  const levelName = levels[Math.min(fitLevel, levels.length - 1)];
  const shape = useMemo(
    () => [graph.layers, ...graph.nodes.map(node => node.id)].join('|'),
    [graph.layers, graph.nodes]
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState('');
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const byId = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph.nodes]);
  const pin = pinned && byId.has(pinned) ? pinned : '';
  const focus = useMemo(() => {
    if (pin) {
      return new Set([pin]);
    }
    return hover ? new Set(hover) : null;
  }, [pin, hover]);

  const registerAnchor = useCallback((id, el) => {
    if (el) {
      anchorsRef.current.set(id, el);
    } else {
      anchorsRef.current.delete(id);
    }
  }, []);

  const measurePill = useCallback((id, width) => {
    if (width === null) {
      pillWidthsRef.current.delete(id);
    } else {
      pillWidthsRef.current.set(id, width);
    }
  }, []);

  const [fitShape, setFitShape] = useState(shape);
  if (fitShape !== shape) {
    setFitShape(shape);
    setFitLevel(0);
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      setGeometry(
        buildPathGeometry(graph, edgesOf(container, anchorsRef.current), drawingOf(container))
      );
    }
  }, [graph, layoutTick, fitLevel]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const wrapper = fitRef.current;
    if (!container || !wrapper) {
      return;
    }
    const widest = Math.max(0, ...pillWidthsRef.current.values());
    const fit = drawingOf(container).compact
      ? fitOf(container, widest, geometry.widestTrunk)
      : EMPTY_FIT;
    if (applyFit(container, fit)) {
      setLayoutTick(tick => tick + 1);
      return;
    }
    if (needsRef.current.shape !== shape) {
      needsRef.current = { shape, widths: new Map() };
    }
    const level = Math.min(fitLevel, levels.length - 1);
    const next = nextFitLevel({
      level,
      top: levels.length - 1,
      room: wrapper.clientWidth,
      drawn: Math.max(container.getBoundingClientRect().width, wrapper.scrollWidth),
      needs: needsRef.current.widths,
    });
    if (next.need !== null) {
      needsRef.current.widths.set(level, next.need);
    }
    if (next.level !== fitLevel) {
      setFitLevel(next.level);
    }
  }, [geometry, fitLevel, levels.length, shape]);

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = fitRef.current;
    if (!container || !wrapper || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => setLayoutTick(tick => tick + 1));
    observer.observe(container);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    dialogRef.current = dialogOpen;
  }, [dialogOpen]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && !dialogRef.current) {
        setPinned('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activate = useCallback(
    node => {
      if (node.kind === 'vnic') {
        setPinned(current => (current === node.id ? '' : node.id));
        return;
      }
      onOpen(node);
    },
    [onOpen]
  );

  const colorOf = useCallback(tint => (tint ? colors.get(tint) : undefined), [colors]);
  const pills = geometry.segments.flatMap(segment =>
    segment.lanes
      .filter(lane => lane.pill)
      .map(lane => ({ key: `${segment.id}|${lane.lane}`, segment, lane }))
  );
  const pinnedNode = pin ? byId.get(pin) : null;
  const flag = on => (on ? 'true' : undefined);
  const chipOf = node => (
    <Chip
      key={node.id}
      node={node}
      color={colorOf(node.tint)}
      feedPresent={feedPresent}
      focus={focus}
      registerAnchor={registerAnchor}
      onActivate={activate}
      onChart={onOpen}
      onHover={paths => setHover(paths || null)}
    />
  );

  return (
    <div className="hw-path" data-panel="network-path" data-pinned={pin}>
      {pinnedNode ? (
        <div className="hw-path-pin" data-note="pinned">
          <span className="badge rounded-pill text-bg-primary d-inline-flex align-items-center gap-1">
            {t('hostTools.networkPath.showing', { name: nodeName(t, pinnedNode) })}
            {' · '}
            <button
              type="button"
              className="btn btn-link p-0 text-reset hw-path-unpin"
              data-tool="unpin"
              onClick={() => setPinned('')}
            >
              {t('hostTools.networkPath.clear')}
            </button>
          </span>
        </div>
      ) : null}
      <div
        className="hw-path-fit"
        ref={fitRef}
        data-fit={levelName}
        data-compact={flag(levelName !== 'full')}
        data-fold={flag(levelName === 'fold' || levelName === 'small')}
        data-small={flag(levelName === 'small')}
      >
        <div
          className={`hw-topo-canvas hw-path-canvas ${members ? 'hw-path-canvas-members' : ''} ${
            focus ? 'hw-path-focusing' : ''
          }`}
          ref={containerRef}
        >
          <svg className="hw-topo-overlay hw-path-overlay" aria-hidden="true">
            {geometry.trunks.map(trunk => (
              <Trunk key={trunk.id} trunk={trunk} focus={focus} />
            ))}
            {geometry.segments.map(segment => (
              <Segment
                key={segment.id}
                segment={segment}
                color={colorOf(segment.tint)}
                focus={focus}
              />
            ))}
            {reducedMotion
              ? null
              : geometry.flows.map(flow => (
                  <PathPackets
                    key={flow.id}
                    flow={flow}
                    range={geometry.range}
                    colorOf={colorOf}
                    className={focusClass(focus, flow.paths)}
                  />
                ))}
            {pills.map(({ key, segment, lane }) => (
              <Pill
                key={key}
                id={key}
                pill={lane.pill}
                heat={lane.heat}
                color={colorOf(segment.tint)}
                paths={segment.paths}
                focus={focus}
                onMeasure={measurePill}
              />
            ))}
          </svg>
          <div
            className={`hw-path-grid ${members ? 'hw-path-grid-members' : ''}`}
            data-rows={graph.layout.rows}
          >
            {graph.layout.separators.map(row => (
              <Cell key={`sep-${row}`} layer={0} row={row} className="hw-path-sep" />
            ))}
            {graph.nodes
              .filter(node => graph.layout.places.has(node.id))
              .map(node => {
                const place = graph.layout.places.get(node.id);
                return (
                  <Cell key={node.id} layer={node.layer} row={place.row} span={place.span}>
                    {chipOf(node)}
                  </Cell>
                );
              })}
            {graph.layout.stacks.map(stack => (
              <Cell
                key={stack.id}
                layer={stack.layer}
                row={stack.row}
                span={stack.span}
                className="hw-path-stack"
              >
                {stack.nodes.map(id => chipOf(byId.get(id)))}
              </Cell>
            ))}
            {graph.layout.ends.map(end => (
              <Cell key={end.id} layer={end.layer} row={end.row} span={end.span}>
                <div className="hw-path-end" data-note="no-uplink">
                  {t('hostTools.networkPath.noUplink')}
                </div>
              </Cell>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

PathRail.propTypes = {
  graph: PropTypes.shape({
    nodes: PropTypes.array.isRequired,
    links: PropTypes.array.isRequired,
    paths: PropTypes.array.isRequired,
    layers: PropTypes.number.isRequired,
    layout: PropTypes.shape({
      rows: PropTypes.number.isRequired,
      places: PropTypes.instanceOf(Map).isRequired,
      separators: PropTypes.array.isRequired,
      ends: PropTypes.array.isRequired,
      stacks: PropTypes.array.isRequired,
    }).isRequired,
  }).isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  feedPresent: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  dialogOpen: PropTypes.bool,
};

export default PathRail;
