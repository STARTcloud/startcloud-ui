import { thinned } from './lttb';

/**
 * The tones a series without one of its own is drawn in, in order, each a
 * colour the stylesheet reads from the theme's tokens.
 */
export const CHART_TONES = [
  'blue',
  'orange',
  'green',
  'purple',
  'red',
  'teal',
  'pink',
  'yellow',
  'indigo',
  'cyan',
];

/**
 * Every colour a chart reads from the theme: the text, the muted text,
 * the lines, the tooltip's surface, the theme's own six and the ten
 * tones, each the class `chart-tone-<name>` of the stylesheet.
 */
export const CHART_PROBES = [
  'text',
  'muted',
  'line',
  'surface',
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'danger',
  ...CHART_TONES,
];

const DASHES = {
  solid: 'solid',
  dash: 'dashed',
  'short-dash': [6, 3],
  'short-dot': [2, 3],
};

const GRID_EDGE = 8;
const GRID_TOP = 16;
const GRID_TOP_NAMED = 36;
const LEGEND_ROOM = 28;
const ZOOM_ROOM = 36;
const ZOOM_HEIGHT = 20;
const NEWEST_SYMBOL_SIZE = 7;
const SPARK_SYMBOL_SIZE = 4;
const SPARK_EDGE = 2;
const SPARK_WIDTH = 1.5;
const COMPACT_FONT = 10;
const DEFAULT_WIDTH = 2;
const DEFAULT_DIGITS = 2;
const AREA_OPACITY = 0.18;
const SMOOTH = 0.25;
const LABEL_ROOM = 72;
const LEAST_DRAWN = 40;
const DEFAULT_PIXELS = 600;
const TOOLTIP_FONT = 12;
const LONG_SPAN_MS = 3 * 60 * 60 * 1000;
const ONE_AXIS = [{}];

/**
 * The tone of the series at `index` among the ones that name none, the
 * ten tones taken in order and round again.
 *
 * @param {number} index - The position
 * @returns {string} The tone
 */
export const toneAt = index => CHART_TONES[index % CHART_TONES.length];

/**
 * A value as the tooltip draws it: the number held to `digits` decimals
 * with its trailing zeros dropped, then the unit; a dash for a value that
 * is no number.
 *
 * @param {*} value - The point's value
 * @param {string} [unit] - The suffix, its own leading space included
 * @param {number} [digits] - The most decimals
 * @returns {string} The text
 */
export const formatValue = (value, unit = '', digits = DEFAULT_DIGITS) => {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
    return '-';
  }
  return `${parseFloat(number.toFixed(digits))}${unit}`;
};

/**
 * An instant as the tooltip and the zoom slider write it: the local
 * time to the second, with the day before it over a span longer than
 * three hours.
 *
 * @param {number} ms - The instant in milliseconds
 * @param {number} span - The drawn span in milliseconds
 * @returns {string} The text
 */
export const formatInstant = (ms, span) => {
  const date = new Date(ms);
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  if (span > LONG_SPAN_MS) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  }
  return time;
};

/**
 * Whether any series of a chart holds a point, a hidden one counted too,
 * because a chart whose every series a person hid still has data.
 *
 * @param {Array<Object>} series - The chart's series
 * @returns {boolean} True while one holds a point
 */
export const hasPoints = series => series.some(entry => entry.points.length > 0);

/**
 * The entities the legend lists, every distinct `entity` the series
 * name, in order of first appearance; none for a chart of one entity.
 *
 * @param {Array<Object>} series - The chart's series
 * @returns {Array<string>} The entities
 */
export const entitiesOf = series => [...new Set(series.map(entry => entry.entity).filter(Boolean))];

/**
 * The instant of the newest point any series holds, null while none
 * holds one.
 *
 * @param {Array<Object>} series - The chart's series
 * @returns {number|null} The instant in milliseconds
 */
export const newestOf = series =>
  series.reduce((newest, entry) => {
    const last = entry.points.at(-1);
    return last && (newest === null || last[0] > newest) ? last[0] : newest;
  }, null);

/**
 * The entity isolated after a click on one legend entry: that entity
 * alone, or every entity again when it was the one isolated.
 *
 * @param {string|null} isolated - The entity isolated before the click
 * @param {string} name - The entity clicked
 * @returns {string|null} The entity isolated after it
 */
export const isolatedAfter = (isolated, name) => (isolated === name ? null : name);

/**
 * A colour with its alpha replaced, for the `rgb()` and `rgba()` strings
 * the page computes; any other text comes back as it was.
 *
 * @param {string} color - The colour
 * @param {number} alpha - The alpha, 0 to 1
 * @returns {string} The colour
 */
export const withAlpha = (color, alpha) => {
  const parts = String(color).match(/[\d.]+/gu);
  if (!/^rgba?\(/u.test(String(color)) || !parts || parts.length < 3) {
    return color;
  }
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
};

const colorOf = (colors, tone) => colors[tone] || colors.text;

const topOf = named => (named ? GRID_TOP_NAMED : GRID_TOP);

const tonedSeries = series => {
  let free = 0;
  return series.map(entry => {
    if (entry.tone) {
      return entry;
    }
    const tone = toneAt(free);
    free += 1;
    return { ...entry, tone };
  });
};

const areaOf = color => ({
  opacity: 1,
  color: {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, AREA_OPACITY) },
      { offset: 1, color: withAlpha(color, 0) },
    ],
  },
});

const markNewest = (points, size = NEWEST_SYMBOL_SIZE) => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index][1] !== null && points[index][1] !== undefined) {
      return points.with(index, {
        value: points[index],
        symbol: 'circle',
        symbolSize: size,
      });
    }
  }
  return points;
};

const lineOf = (entry, colors, threshold) => {
  const color = colorOf(colors, entry.tone);
  return {
    id: entry.key,
    name: entry.entity || entry.name,
    type: 'line',
    smooth: SMOOTH,
    connectNulls: false,
    showSymbol: true,
    symbol: 'none',
    yAxisIndex: entry.axis || 0,
    data: markNewest(thinned(entry.points, threshold)),
    lineStyle: {
      color,
      width: entry.width || DEFAULT_WIDTH,
      type: DASHES[entry.dash] || DASHES.solid,
      opacity: entry.opacity ?? 1,
    },
    itemStyle: { color },
    areaStyle: areaOf(color),
  };
};

const valueAxis = (axis, index, colors, compact) => ({
  type: 'value',
  name: compact ? '' : axis.name || '',
  position: index === 0 ? 'left' : 'right',
  min: axis.min,
  max: axis.max,
  scale: axis.max === undefined,
  nameTextStyle: { color: colors.muted },
  axisLabel: compact ? { color: colors.muted, fontSize: COMPACT_FONT } : { color: colors.muted },
  axisLine: { show: !compact, lineStyle: { color: colors.line } },
  splitLine: { show: index === 0, lineStyle: { color: colors.line } },
});

const pointValue = param => (Array.isArray(param.value) ? param.value : param.value.value);

const rowOf = (param, lines, axes) => {
  const line = lines.find(entry => entry.key === param.seriesId);
  const [, value] = pointValue(param);
  if (!line || value === null || value === undefined) {
    return '';
  }
  const unit = line.unit ?? axes[line.axis || 0]?.unit ?? '';
  return `<div class="d-flex justify-content-between gap-3"><span>${param.marker}${
    line.name
  }</span><span class="fw-semibold">${formatValue(value, unit, line.digits)}</span></div>`;
};

const tooltipOf = (lines, axes, span, colors) => ({
  trigger: 'axis',
  confine: true,
  backgroundColor: colors.surface,
  borderColor: colors.line,
  textStyle: { color: colors.text, fontSize: TOOLTIP_FONT },
  axisPointer: { type: 'line', lineStyle: { color: colors.muted }, label: { show: false } },
  formatter: params => {
    const list = Array.isArray(params) ? params : [params];
    if (list.length === 0) {
      return '';
    }
    const header = `<div class="fw-semibold mb-1">${formatInstant(pointValue(list[0])[0], span)}</div>`;
    return header + list.map(param => rowOf(param, lines, axes)).join('');
  },
});

/**
 * Which entities the legend draws as shown: every one while none is
 * isolated, the isolated one alone otherwise.
 *
 * @param {Array<Object>} series - The chart's series
 * @param {string|null} isolated - The entity shown alone
 * @returns {Object<string, boolean>} The legend's selection
 */
export const legendSelected = (series, isolated) =>
  Object.fromEntries(
    entitiesOf(series).map(entity => [entity, isolated === null || entity === isolated])
  );

const legendOf = ({ series, entities, show, isolated, slider, colors }) => ({
  show,
  type: 'scroll',
  left: GRID_EDGE,
  bottom: slider ? ZOOM_ROOM : 0,
  data: entities,
  selected: legendSelected(series, isolated),
  triggerEvent: true,
  textStyle: { color: colors.text },
  pageTextStyle: { color: colors.muted },
  pageIconColor: colors.text,
  pageIconInactiveColor: colors.muted,
  inactiveColor: colors.line,
});

/**
 * The span of the time axis under a drawn range: the range itself under
 * the slider, and a span to either side of it otherwise, so a drag can
 * pan past it; null while no range is drawn.
 *
 * @param {{ from: number, to: number }|null} range - The drawn range in milliseconds
 * @param {boolean} [slider] - Whether the zoom slider draws
 * @returns {{ from: number, to: number }|null} The axis' span
 */
export const axisSpan = (range, slider = false) => {
  if (!range) {
    return null;
  }
  if (slider) {
    return range;
  }
  const span = range.to - range.from;
  return { from: range.from - span, to: range.to + span };
};

const zoomOf = ({ range, slider, span, colors }) => [
  {
    type: 'inside',
    xAxisIndex: 0,
    filterMode: 'none',
    zoomOnMouseWheel: true,
    moveOnMouseMove: true,
    moveOnMouseWheel: false,
    ...(range && !slider ? { startValue: range.from, endValue: range.to } : {}),
  },
  ...(slider
    ? [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          bottom: GRID_EDGE,
          height: ZOOM_HEIGHT,
          borderColor: colors.line,
          textStyle: { color: colors.muted },
          labelFormatter: value => formatInstant(value, span),
        },
      ]
    : []),
];

/**
 * The option of the estate's one chart, a smoothed line over a time axis:
 * one line per series that is not `hidden`, in the tone it names or the
 * next of the ten, its dash, width and opacity its own, on the first
 * value axis or the second, filled under it from its tone to clear, a dot
 * on its newest point and a break at every null point; every line
 * thinned to the pixels across the plot; the time axis over `range`,
 * the drawn range, a span to either side of it so a drag can pan, and
 * fixed to it under the slider; the inside zoom always, the slider while
 * `slider`; the legend only for a chart whose series name an `entity`,
 * one entry an entity, `isolated` alone shown while one is; a shared
 * tooltip naming every line with its value and unit; every colour from
 * `colors`, the theme's tokens as the page read them, none written here;
 * the generated description of the `aria` option opened by `title`; no
 * animation while `reduced`. A `compact` chart, a dashboard widget's,
 * draws no legend, no zoom, no axis names and no time labels, its time
 * axis fixed to `range`.
 *
 * @param {Object} chart - The chart
 * @param {string} chart.title - What the chart shows, the description's first sentence
 * @param {Array<Object>} chart.series - `[{ key, name, entity?, points, tone?, dash?, width?, opacity?, axis?, unit?, digits?, hidden? }]`, `points` as `[[ms, value|null]]`
 * @param {Array<Object>} [chart.axes] - One or two value axes, `[{ name?, min?, max?, unit? }]`
 * @param {Object} chart.colors - The colour of every name in `CHART_PROBES`, and `font`
 * @param {{ from: number, to: number }|null} [chart.range] - The drawn range in milliseconds
 * @param {number} [chart.width] - The pixels across the box
 * @param {boolean} [chart.slider] - Whether the zoom slider draws
 * @param {boolean} [chart.compact] - Whether the chart draws compact
 * @param {string|null} [chart.isolated] - The entity shown alone
 * @param {boolean} [chart.reduced] - Whether motion is reduced
 * @returns {Object} The ECharts option
 */
export const chartOption = ({
  title,
  series,
  axes = ONE_AXIS,
  colors,
  range = null,
  width = DEFAULT_PIXELS,
  slider = false,
  compact = false,
  isolated = null,
  reduced = false,
}) => {
  const lines = tonedSeries(series).filter(entry => !entry.hidden);
  const entities = entitiesOf(series);
  const legend = entities.length > 0 && !compact;
  const named = axes.some(axis => Boolean(axis.name)) && !compact;
  const threshold = Math.max(LEAST_DRAWN, Math.floor(width - LABEL_ROOM));
  const span = range ? range.to - range.from : 0;
  const base = axisSpan(range, slider || compact);
  return {
    animation: !reduced,
    backgroundColor: 'transparent',
    textStyle: { color: colors.text, fontFamily: colors.font },
    aria: {
      enabled: true,
      label: { general: { withoutTitle: title } },
      decal: { show: false },
    },
    grid: {
      left: GRID_EDGE,
      right: GRID_EDGE,
      top: compact ? GRID_EDGE : topOf(named),
      bottom: GRID_EDGE + (legend ? LEGEND_ROOM : 0) + (slider ? ZOOM_ROOM : 0),
      containLabel: true,
    },
    tooltip: tooltipOf(lines, axes, span, colors),
    legend: legendOf({ series, entities, show: legend, isolated, slider, colors }),
    xAxis: {
      type: 'time',
      ...(base ? { min: base.from, max: base.to } : {}),
      axisLabel: { show: !compact, color: colors.muted, hideOverlap: true },
      axisLine: { lineStyle: { color: colors.line } },
      axisTick: { show: !compact },
      splitLine: { show: false },
    },
    yAxis: axes.map((axis, index) => valueAxis(axis, index, colors, compact)),
    dataZoom: compact ? [] : zoomOf({ range, slider, span, colors }),
    series: lines.map(entry => lineOf(entry, colors, threshold)),
  };
};

/**
 * The option of a sparkline, the estate's one chart drawn in a table
 * cell: the first series that is not `hidden` as one smoothed line in
 * its tone, filled under it and dotted at its newest point, broken at
 * every null, thinned to the pixels across the box, over a time axis
 * fixed to `range`; no axis, no grid line, no tooltip and no legend;
 * the `aria` description opened by `title`; no animation while
 * `reduced`.
 *
 * @param {Object} spark - The sparkline
 * @param {string} spark.title - What the line shows, the description's first sentence
 * @param {Array<Object>} spark.series - The series, `[{ key, name, points, tone?, hidden? }]`
 * @param {Object} spark.colors - The colour of every name in `CHART_PROBES`
 * @param {{ from: number, to: number }|null} [spark.range] - The drawn range in milliseconds
 * @param {number} [spark.width] - The pixels across the box
 * @param {boolean} [spark.reduced] - Whether motion is reduced
 * @returns {Object} The ECharts option
 */
export const sparkOption = ({
  title,
  series,
  colors,
  range = null,
  width = DEFAULT_PIXELS,
  reduced = false,
}) => {
  const lines = tonedSeries(series)
    .filter(entry => !entry.hidden)
    .slice(0, 1);
  return {
    animation: !reduced,
    backgroundColor: 'transparent',
    aria: {
      enabled: true,
      label: { general: { withoutTitle: title } },
      decal: { show: false },
    },
    grid: { left: SPARK_EDGE, right: SPARK_EDGE, top: SPARK_EDGE, bottom: SPARK_EDGE },
    tooltip: { show: false },
    xAxis: {
      type: 'time',
      show: false,
      ...(range ? { min: range.from, max: range.to } : {}),
    },
    yAxis: { type: 'value', show: false, min: 0, scale: true },
    series: lines.map(entry => {
      const color = colorOf(colors, entry.tone);
      return {
        id: entry.key,
        name: entry.name,
        type: 'line',
        smooth: SMOOTH,
        connectNulls: false,
        showSymbol: true,
        symbol: 'none',
        data: markNewest(thinned(entry.points, Math.floor(width)), SPARK_SYMBOL_SIZE),
        lineStyle: { color, width: SPARK_WIDTH },
        itemStyle: { color },
        areaStyle: areaOf(color),
      };
    }),
  };
};

/**
 * The newest value a chart's shown series hold together: the sum of the
 * newest point of every series that is not `hidden` and holds one, so a
 * widget can read one CPU's use or every interface's throughput at once;
 * null while no shown series holds a point.
 *
 * @param {Array<Object>} series - The chart's series
 * @returns {number|null} The value
 */
export const latestValue = series => {
  const newest = series
    .filter(entry => !entry.hidden)
    .map(entry => entry.points.findLast(point => point[1] !== null && point[1] !== undefined))
    .filter(Boolean);
  return newest.length > 0 ? newest.reduce((sum, point) => sum + point[1], 0) : null;
};

/**
 * The drawn range a zoom event of the inside zoom names: its absolute
 * instants where it carries them, or its percent of the axis' base
 * otherwise, never narrower than `least`.
 *
 * @param {Object} event - The `datazoom` event, or the first of its batch
 * @param {{ from: number, to: number }} base - The time axis' span
 * @param {number} least - The narrowest range in milliseconds
 * @returns {{ from: number, to: number }} The range
 */
export const zoomedRange = (event, base, least) => {
  const [zoom] = event.batch ? event.batch : [event];
  const span = base.to - base.from;
  const percent = 100;
  let from = zoom.startValue ?? base.from + (span * (zoom.start ?? 0)) / percent;
  let to = zoom.endValue ?? base.from + (span * (zoom.end ?? percent)) / percent;
  if (to - from < least) {
    const middle = (from + to) / 2;
    from = middle - least / 2;
    to = middle + least / 2;
  }
  return { from, to };
};
