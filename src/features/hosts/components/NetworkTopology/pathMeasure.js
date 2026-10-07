import { compactRate } from './TopologyFlow';

const LANE_OFFSET = 6;

const LANE_MIN = 3;

const LANE_SPAN = 5;

const ELBOW = 16;

const ARROW = 10;

const ARROW_FLARE = 4;

const PILL_H = 15;

const PILL_CHAR = 6.8;

const PILL_PAD = 10;

const PILL_GAP = 12;

const DOT_MIN = 2;

const PIPE_MIN = 6;

const PIPE_SPAN = 14;

const PIPE_GAP = 2;

const PIPE_WALL = 1.25;

const PIPE_FILL_MIN = 1.5;

const STAGGER_GAP = 2;

const PIPE_LOG_LOW = 2;

const PIPE_LOG_HIGH = 5;

const KILO = 1000;

const GIGABIT = 1000;

const MEGA = 1000000;

const BITS = 8;

const ROUNDING = 0.5;

const LOG_TOP = 7;

const LEVEL = 0.5;

const HALF = 2;

const DOWN_KEY = 'hostTools.networkPath.down';

const DOWN_CHARS = 4;

const FULL_SHARE = { rx: 1, tx: 1 };

const HEAT = [
  [0.4, 'green'],
  [0.6, 'yellow'],
  [0.8, 'orange'],
  [Infinity, 'red'],
];

const LANES = [
  { lane: 'rx', side: -1, arrow: '↓', at: 0.28 },
  { lane: 'tx', side: 1, arrow: '↑', at: 0.72 },
];

const sizesOf = scale => ({
  scale,
  offset: LANE_OFFSET * scale,
  laneMin: LANE_MIN * scale,
  elbow: ELBOW * scale,
  arrow: ARROW * scale,
  flare: ARROW_FLARE * scale,
  pillH: PILL_H * scale,
  pillChar: PILL_CHAR * scale,
  pillPad: PILL_PAD * scale,
  pillGap: PILL_GAP * scale,
  dotMin: DOT_MIN * scale,
  pipeGap: PIPE_GAP * scale,
  wall: PIPE_WALL * scale,
  fillMin: PIPE_FILL_MIN * scale,
  staggerGap: STAGGER_GAP * scale,
});

const logShare = mbps => Math.min(1, Math.max(0, Math.log10(Math.max(mbps * KILO, 1)) / LOG_TOP));

/**
 * hyperweaver-ui's packets a second of a lane's rate.
 *
 * @param {number} mbps - The lane's rate in megabits a second
 * @returns {number} The packets a second
 */
export const packetSpawnRate = mbps => Math.min(16, 1.2 + Math.log10(1 + mbps * 10) * 4.5);

/**
 * The bytes one drawn packet of a lane carries, its bytes a second over
 * the packets a second it spawns.
 *
 * @param {number} mbps - The lane's rate in megabits a second
 * @returns {number} The bytes
 */
export const packetBytes = mbps => (mbps * MEGA) / BITS / packetSpawnRate(mbps);

/**
 * A lane's width in pixels where its link's capacity is unknown, from
 * its rate, three for an idle lane up to eight, on a log scale from a
 * kilobit to ten gigabits a second, times the rail's scale.
 *
 * @param {number} mbps - The lane's rate in megabits a second
 * @param {number} [scale] - The rail's scale
 * @returns {number} The width
 */
export const laneWidth = (mbps, scale = 1) =>
  (mbps > 0 ? LANE_MIN + logShare(mbps) * LANE_SPAN : LANE_MIN) * scale;

/**
 * A pipe's width in pixels from its link's capacity, six for a hundred
 * megabits or less up to twenty for a hundred gigabits or more on a log
 * scale, times the rail's scale.
 *
 * @param {number} capacityMbps - The link's capacity in megabits a second
 * @param {number} [scale] - The rail's scale
 * @returns {number} The width
 */
export const pipeWidth = (capacityMbps, scale = 1) => {
  const share = Math.min(
    1,
    Math.max(0, (Math.log10(capacityMbps) - PIPE_LOG_LOW) / (PIPE_LOG_HIGH - PIPE_LOG_LOW))
  );
  return (PIPE_MIN + share * PIPE_SPAN) * scale;
};

/**
 * A lane's heat, the weathermap step of its share of a known link
 * speed: `idle` for a lane that moves nothing, `tint` where no speed is
 * known, and `green`, `yellow`, `orange` and `red` under forty, sixty and
 * eighty percent and above.
 *
 * @param {number} mbps - The lane's rate in megabits a second
 * @param {number} speedMbps - The link speed in megabits a second, zero while unknown
 * @returns {string} The heat
 */
export const laneHeat = (mbps, speedMbps) => {
  if (!(mbps > 0)) {
    return 'idle';
  }
  if (!(speedMbps > 0)) {
    return 'tint';
  }
  return HEAT.find(([cap]) => mbps / speedMbps < cap)[1];
};

/**
 * A rate in whole units, `4M`, `820K` or `2G`, the label of a compact
 * rail's pill.
 *
 * @param {number} mbps - The rate in megabits a second
 * @returns {string} The label
 */
export const tightRate = mbps => {
  if (mbps >= GIGABIT - ROUNDING) {
    return `${Math.round(mbps / GIGABIT)}G`;
  }
  if (mbps >= 1) {
    return `${Math.round(mbps)}M`;
  }
  return `${Math.max(1, Math.round(mbps * KILO))}K`;
};

/**
 * The fit levels of a rail, the widest first: `full`, `compact` with
 * compact chips and pills, `fold` with an aggregate's members folded
 * into its chip where the graph has members, and `small` at the smaller
 * scale.
 *
 * @param {boolean} members - Whether the graph stacks member links
 * @returns {Array<string>} The levels
 */
export const fitLevelsOf = members =>
  members ? ['full', 'compact', 'fold', 'small'] : ['full', 'compact', 'small'];

/**
 * The rail's next fit level from what it measured as drawn: one level
 * narrower, with the width the drawn level needs, where the canvas is
 * wider than the room it has; one level wider where the room holds the
 * width that wider level was measured to need; otherwise the same.
 *
 * @param {{ level: number, top: number, room: number, drawn: number, needs: Map<number, number> }} measure - The level, the narrowest level, the wrapper's inline size, the canvas's drawn width and the widths each level was measured to need
 * @returns {{ level: number, need: number|null }} The next level and, on a step narrower, the width the level it leaves needs
 */
export const nextFitLevel = ({ level: at, top, room, drawn, needs }) => {
  if (drawn > room + LEVEL && at < top) {
    return { level: at + 1, need: drawn };
  }
  if (at > 0 && needs.has(at - 1) && room >= needs.get(at - 1)) {
    return { level: at - 1, need: null };
  }
  return { level: at, need: null };
};

const offsetFor = (capacityMbps, sizes) =>
  capacityMbps > 0 ? pipeWidth(capacityMbps, sizes.scale) / HALF + sizes.pipeGap : sizes.offset;

const level = (a, b) => Math.abs(a.y - b.y) < LEVEL;

const elbowX = (a, b, offset, sizes) => b.x - sizes.elbow + (b.y > a.y ? -offset : offset);

const corners = (a, b, offset, sizes) => {
  if (level(a, b)) {
    return [{ x: b.x, y: b.y + offset }];
  }
  const x = elbowX(a, b, offset, sizes);
  return [
    { x, y: a.y + offset },
    { x, y: b.y + offset },
    { x: b.x, y: b.y + offset },
  ];
};

const routed = ({ a, b, offset, lane, sizes }) => {
  const y0 = a.y + offset;
  if (!lane) {
    return {
      points: corners(a, b, offset, sizes),
      endY: b.y + offset,
      runEnd: level(a, b) ? b.x : elbowX(a, b, offset, sizes),
    };
  }
  if (Math.abs(lane.y - y0) < LEVEL) {
    return { points: [{ x: b.x, y: lane.y }], endY: lane.y, runEnd: lane.wallX ?? b.x };
  }
  return {
    points: [
      { x: lane.x, y: y0 },
      { x: lane.x, y: lane.y },
      { x: b.x, y: lane.y },
    ],
    endY: lane.y,
    runEnd: lane.wallX ?? lane.x,
  };
};

const drawn = points =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L '}${point.x},${point.y}`).join(' ');

const lengthOf = points =>
  points
    .slice(1)
    .reduce(
      (sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y),
      0
    );

const harpoon = ({ x, y, width, outward, dir, sizes }) => {
  const inner = y - outward * (width / HALF);
  const outer = y + outward * (width / HALF + sizes.flare);
  return `${x},${inner} ${x - dir * sizes.arrow},${inner} ${x - dir * sizes.arrow},${outer}`;
};

const extentOf = (link, sizes) => {
  const cap = link.capacityMbps || 0;
  const offset = offsetFor(cap, sizes);
  const pipe =
    cap > 0
      ? pipeWidth(cap, sizes.scale)
      : laneWidth(Math.max(link.rate?.rx || 0, link.rate?.tx || 0), sizes.scale);
  return { offset, pipe, extent: offset * HALF + pipe };
};

const planStagger = ({ b, list, spacing, stackH, sizes, routes }) => {
  let y = b.y - stackH / HALF;
  list.forEach(item => {
    item.slot = y + item.extent / HALF;
    y += item.extent;
  });
  const ranks = new Map();
  [
    list.filter(item => item.a.y < item.slot - LEVEL),
    list.filter(item => item.a.y > item.slot + LEVEL),
  ].forEach(side => {
    [...side]
      .sort(
        (first, second) => Math.abs(second.a.y - second.slot) - Math.abs(first.a.y - first.slot)
      )
      .forEach((item, index) => ranks.set(item, index));
  });
  list.forEach(item => {
    const base = b.x - sizes.elbow - spacing / HALF - (ranks.get(item) || 0) * spacing;
    const down = item.slot > item.a.y;
    const laneAt = offset => ({ x: base + (down ? -offset : offset), y: item.slot + offset });
    routes.set(item.link.id, { lanes: { rx: laneAt(-item.offset), tx: laneAt(item.offset) } });
  });
};

const stripesOf = (list, cap, inner, sizes) =>
  list.flatMap(item =>
    LANES.map(({ lane }) => {
      const mbps = item.link.rate ? item.link.rate[lane] : 0;
      let width = 0;
      if (mbps > 0) {
        width = cap > 0 ? Math.max(sizes.fillMin, inner * Math.min(1, mbps / cap)) : sizes.fillMin;
      }
      return { item, lane, width };
    })
  );

const planTrunk = ({ b, list, target, sizes, routes }) => {
  const cap = target.capacityMbps || 0;
  const pipe = cap > 0 ? pipeWidth(cap, sizes.scale) : Math.max(...list.map(item => item.pipe));
  const width = pipe * HALF + sizes.pipeGap;
  const stripes = stripesOf(list, cap, pipe - sizes.wall * HALF, sizes);
  const raw = stripes.reduce((sum, stripe) => sum + stripe.width, 0);
  const room = width - sizes.wall * HALF;
  const fit = raw > room ? room / raw : 1;
  const xc = b.x - sizes.elbow - width / HALF;
  const wallX = xc - width / HALF;
  const lanes = new Map();
  let edge = (-raw * fit) / HALF;
  stripes.forEach(stripe => {
    const stripeWidth = stripe.width * fit;
    const at = edge + stripeWidth / HALF;
    edge += stripeWidth;
    const side = stripe.lane === 'rx' ? -1 : 1;
    const y0 = stripe.item.a.y + side * stripe.item.offset;
    const down = b.y + at > y0;
    const held = lanes.get(stripe.item) || {};
    held[stripe.lane] = { x: down ? xc - at : xc + at, y: b.y + at, f: stripeWidth, wallX };
    lanes.set(stripe.item, held);
  });
  lanes.forEach((held, item) => routes.set(item.link.id, { trunk: true, lanes: held }));
  const ys = list.flatMap(item => [
    item.a.y - item.offset - item.pipe / HALF,
    item.a.y + item.offset + item.pipe / HALF,
  ]);
  const legs = [Math.min(b.y, ...ys), Math.max(b.y, ...ys)]
    .filter(y => Math.abs(y - b.y) >= LEVEL)
    .map(y =>
      drawn([
        { x: xc, y },
        { x: xc, y: b.y },
        { x: b.x, y: b.y },
      ])
    );
  return {
    trunk: {
      id: `trunk:${target.id}`,
      paths: target.paths,
      legs,
      width,
      hollow: Math.max(0, width - sizes.wall * HALF),
    },
    reach: width + sizes.elbow + sizes.arrow * HALF,
  };
};

const planRoutes = (graph, edges, sizes) => {
  const routes = new Map();
  const trunks = [];
  let widestTrunk = 0;
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const byTarget = new Map();
  graph.links
    .filter(link => !link.ghost && !link.down)
    .forEach(link => {
      const from = edges.get(link.from);
      const to = edges.get(link.to);
      if (!from || !to) {
        return;
      }
      const held = byTarget.get(link.to) || { b: to.l, chip: to.h || 0, list: [] };
      held.list.push({ link, a: from.r, ...extentOf(link, sizes) });
      byTarget.set(link.to, held);
    });
  byTarget.forEach(({ b, chip, list }, id) => {
    if (list.length < HALF) {
      return;
    }
    list.sort((first, second) => first.a.y - second.a.y);
    const spacing = Math.max(...list.map(item => item.extent)) + sizes.staggerGap;
    const room = b.x - Math.max(...list.map(item => item.a.x)) - sizes.arrow;
    const stackH = list.reduce((sum, item) => sum + item.extent, 0);
    if (list.length * spacing + sizes.elbow <= room && stackH <= chip) {
      planStagger({ b, list, spacing, stackH, sizes, routes });
      return;
    }
    const { trunk, reach } = planTrunk({ b, list, target: nodes.get(id), sizes, routes });
    trunks.push(trunk);
    widestTrunk = Math.max(widestTrunk, reach);
  });
  return { routes, trunks, widestTrunk };
};

const pillOf = ({ a, b, y0, offset, width, label, at, fit, run }) => {
  const { sizes, compact } = fit;
  const pillWidth = label.length * sizes.pillChar + sizes.pillPad;
  const room = run.runEnd - a.x - sizes.arrow;
  const roomy = !compact && room >= HALF * pillWidth + sizes.pillGap;
  let x = a.x + sizes.arrow + room / HALF;
  if (roomy) {
    x = a.x + sizes.arrow + room * at;
  } else if (compact) {
    x = run.lane ? (a.x + run.runEnd) / HALF : (a.x + b.x) / HALF;
  }
  return {
    x,
    y: roomy ? y0 : y0 + Math.sign(offset) * (sizes.pillH / HALF + width / HALF),
    width: pillWidth,
    height: sizes.pillH,
    pad: sizes.pillPad,
    label,
  };
};

const downPill = (a, b, fit) => {
  const { sizes, compact } = fit;
  const room = (level(a, b) ? b.x : elbowX(a, b, 0, sizes)) - a.x - sizes.arrow;
  return {
    x: compact ? (a.x + b.x) / HALF : a.x + sizes.arrow + room / HALF,
    y: a.y,
    width: DOWN_CHARS * sizes.pillChar + sizes.pillPad,
    height: sizes.pillH,
    pad: sizes.pillPad,
    label: '',
    key: DOWN_KEY,
  };
};

const pipeOf = (cap, mbps, sizes) => {
  if (!(cap > 0)) {
    return { width: laneWidth(mbps, sizes.scale), hollow: null, fill: null };
  }
  const width = pipeWidth(cap, sizes.scale);
  const hollow = Math.max(0, width - sizes.wall * HALF);
  return {
    width,
    hollow,
    fill: mbps > 0 ? Math.max(sizes.fillMin, hollow * Math.min(1, mbps / cap)) : null,
  };
};

const laneOf = ({ link, a, b, lane, side, arrow, at, fit, route }) => {
  const { sizes, compact } = fit;
  const cap = link.capacityMbps || 0;
  const offset = side * offsetFor(cap, sizes);
  const mbps = link.rate ? link.rate[lane] : 0;
  const laneRoute = route ? route.lanes[lane] : null;
  const run = { ...routed({ a, b, offset, lane: laneRoute, sizes }), lane: laneRoute };
  const y0 = a.y + offset;
  const start = { x: a.x, y: y0 };
  const trunk = Boolean(route?.trunk);
  const pipe = pipeOf(cap, mbps, sizes);
  const tip =
    lane === 'tx'
      ? { x: trunk ? laneRoute.wallX : b.x, y: trunk ? y0 : run.endY, outward: 1, dir: 1 }
      : { x: a.x, y: y0, outward: -1, dir: -1 };
  const label = `${arrow}${compact ? tightRate(mbps) : compactRate(mbps)}`;
  return {
    lane,
    d: drawn(trunk ? [start, { x: laneRoute.wallX, y: y0 }] : [start, ...run.points]),
    ...pipe,
    stripe:
      trunk && mbps > 0 && laneRoute.f > 0
        ? { d: drawn([{ x: laneRoute.wallX, y: y0 }, ...run.points]), width: laneRoute.f }
        : null,
    heat: laneHeat(mbps, link.speedMbps),
    arrow: harpoon({ ...tip, width: pipe.width, sizes }),
    pill: mbps > 0 ? pillOf({ a, b, y0, offset, width: pipe.width, label, at, fit, run }) : null,
  };
};

const downLane = (link, a, b, fit) => {
  const { sizes } = fit;
  const cap = link.capacityMbps || 0;
  const width = cap > 0 ? pipeWidth(cap, sizes.scale) : sizes.laneMin;
  return {
    lane: 'down',
    d: drawn([a, ...corners(a, b, 0, sizes)]),
    width,
    hollow: cap > 0 ? Math.max(0, width - sizes.wall * HALF) : null,
    fill: null,
    stripe: null,
    heat: 'down',
    pill: downPill(a, b, fit),
  };
};

const segmentOf = (link, edges, fit, routes) => {
  const from = edges.get(link.from);
  const to = edges.get(link.to);
  if (!from || !to) {
    return null;
  }
  const a = from.r;
  const b = to.l;
  const base = {
    id: link.id,
    paths: link.paths,
    tint: link.tint,
    ghost: link.ghost,
    down: Boolean(link.down),
  };
  if (link.down) {
    return { ...base, lanes: [downLane(link, a, b, fit)] };
  }
  if (link.ghost) {
    const d = drawn([a, ...corners(a, b, 0, fit.sizes)]);
    return { ...base, lanes: [{ lane: 'ghost', d, width: fit.sizes.laneMin }] };
  }
  const route = routes.get(link.id);
  return {
    ...base,
    lanes: LANES.map(entry => laneOf({ link, a, b, ...entry, fit, route })),
  };
};

const routesOf = (path, edges) => {
  const tails = (path.tails || []).filter(tail => edges.has(tail.node));
  if (tails.length === 0) {
    return [{ suffix: '', nodes: path.nodes, share: FULL_SHARE }];
  }
  return tails.map(tail => ({
    suffix: `|${tail.node}`,
    nodes: [...path.nodes, tail.node],
    share: tail.share,
  }));
};

const legsOf = ({ nodes, stops, lane, side, links, routes, sizes }) => {
  const hops = stops.slice(1).map((stop, index) => {
    const link = links.get(`${nodes[index]}>${nodes[index + 1]}`);
    return { link, stop, offset: side * offsetFor(link?.capacityMbps || 0, sizes) };
  });
  return hops.map(({ link, stop, offset }, index) => {
    const from = stops[index].r;
    const laneRoute = routes.get(link?.id)?.lanes[lane] || null;
    const points = [
      { x: from.x, y: from.y + offset },
      ...routed({ a: from, b: stop.l, offset, lane: laneRoute, sizes }).points,
    ];
    const next = hops[index + 1];
    return {
      link,
      points: next ? [...points, { x: stop.r.x, y: stop.r.y + next.offset }] : points,
    };
  });
};

const piecesOf = ({ legs, tint, lane, sizes }) => {
  let end = 0;
  return legs.map(({ link, points }) => {
    const mbps = link?.rate ? link.rate[lane] : 0;
    const cap = link?.capacityMbps || 0;
    end += lengthOf(points);
    return {
      end,
      heat: laneHeat(mbps, link?.speedMbps || 0),
      tint: link?.tint || tint,
      inner:
        cap > 0 ? pipeWidth(cap, sizes.scale) - sizes.wall * HALF : laneWidth(mbps, sizes.scale),
    };
  });
};

const flowsOf = ({ path, edges, links, routes, fit }) => {
  if (path.ghost || !path.rate) {
    return [];
  }
  if (path.nodes.some(id => !edges.has(id))) {
    return [];
  }
  const { sizes, scale } = fit;
  return routesOf(path, edges).flatMap(route => {
    const stops = route.nodes.map(id => edges.get(id));
    return LANES.map(({ lane, side }) => {
      const legs = legsOf({ nodes: route.nodes, stops, lane, side, links, routes, sizes });
      const points = legs.flatMap((leg, index) => (index === 0 ? leg.points : leg.points.slice(1)));
      return {
        id: `${path.id}|${lane}${route.suffix}`,
        paths: [path.id],
        lane,
        d: drawn(points),
        length: lengthOf(points),
        mbps: path.rate[lane] * route.share[lane],
        scale,
        dotMin: sizes.dotMin,
        pieces: piecesOf({ legs, tint: path.tint, lane, sizes }),
      };
    });
  });
};

const rangeOf = flows => {
  const bytes = flows.filter(flow => flow.mbps > 0).map(flow => packetBytes(flow.mbps));
  return bytes.length > 0 ? { lo: Math.min(...bytes), hi: Math.max(...bytes) } : null;
};

/**
 * The geometry of the rail's overlay, a pure pass over the measured
 * edges of the chips, every size times the rail's scale: each hop two
 * straight lanes with right-angle elbows, received above and sent below,
 * each a hollow pipe as wide as its link's capacity filled as far as its
 * rate fills it, or a plain lane as wide as its rate where no capacity
 * is known, with its heat, its half-arrow at the end it flows toward
 * and its rate pill, on its longest straight run on a wide rail and in
 * whole units centred in the connector above or below its lane on a
 * compact one; a planned hop one dashed lane and a down member link one
 * dashed lane or pipe with its down pill. Wires that converge on one
 * chip stagger, each its own bend and its own height into the chip, the
 * farther wire bending nearest it, where the connector and the chip
 * hold them; otherwise they merge into a trunk twice the target's pipe
 * with a gap, each lane a stripe of its share side by side in an order
 * where none crosses, `trunks` the trunks' legs and `widestTrunk` the
 * connector a trunk needs. Each live path's two flows, received and
 * sent, are the whole path from the vNIC to the node it ends at as one
 * line through every route, through each up member link drawn of the
 * aggregate it ends at, one flow each at its share, with its length,
 * the lane's rate, the scale, the least packet and its pieces, a hop
 * each from a chip through the wire and under the next chip, each the
 * length the line reaches at its end, the heat and the tint of the hop
 * it rides and the inner width a packet fills; `range` the least and
 * the most bytes a packet carries across the flows that move.
 *
 * @param {Object} graph - The graph of `buildPathGraph`
 * @param {Map<string, { l: { x: number, y: number }, r: { x: number, y: number }, h: number }>} edges - Node id to the middles of its left and right edges and its height in the overlay's pixels, a hidden chip absent
 * @param {{ scale?: number, compact?: boolean }} [options] - The rail's scale and whether it is compact
 * @returns {{ segments: Array<Object>, trunks: Array<Object>, flows: Array<Object>, range: { lo: number, hi: number }|null, widestTrunk: number }} The descriptors
 */
export const buildPathGeometry = (graph, edges, { scale = 1, compact = false } = {}) => {
  const links = new Map(graph.links.map(link => [link.id, link]));
  const fit = { scale, compact, sizes: sizesOf(scale) };
  const { routes, trunks, widestTrunk } = planRoutes(graph, edges, fit.sizes);
  const flows = graph.paths.flatMap(path => flowsOf({ path, edges, links, routes, fit }));
  return {
    segments: graph.links.map(link => segmentOf(link, edges, fit, routes)).filter(Boolean),
    trunks,
    flows,
    range: rangeOf(flows),
    widestTrunk,
  };
};
