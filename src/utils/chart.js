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
const SYMBOL_SIZE = 6;
const DEFAULT_WIDTH = 2;
const DEFAULT_DIGITS = 2;
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
 * Whether any series of a chart holds a point, a hidden one counted too,
 * because a chart whose every series a person hid still has data.
 *
 * @param {Array<Object>} series - The chart's series
 * @returns {boolean} True while one holds a point
 */
export const hasPoints = series => series.some(entry => entry.points.length > 0);

const colorOf = (colors, tone) => colors[tone] || colors.text;

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

const lineOf = (entry, axes, colors) => {
  const axis = entry.axis || 0;
  const unit = entry.unit ?? axes[axis]?.unit ?? '';
  const color = colorOf(colors, entry.tone);
  return {
    id: entry.key,
    name: entry.name,
    type: 'line',
    smooth: true,
    showSymbol: entry.points.length === 1,
    symbolSize: SYMBOL_SIZE,
    yAxisIndex: axis,
    data: entry.points,
    lineStyle: {
      color,
      width: entry.width || DEFAULT_WIDTH,
      type: DASHES[entry.dash] || DASHES.solid,
      opacity: entry.opacity ?? 1,
    },
    itemStyle: { color },
    emphasis: { focus: 'series' },
    tooltip: { valueFormatter: value => formatValue(value, unit, entry.digits) },
  };
};

const valueAxis = (axis, index, colors) => ({
  type: 'value',
  name: axis.name || '',
  position: index === 0 ? 'left' : 'right',
  min: axis.min,
  max: axis.max,
  nameTextStyle: { color: colors.muted },
  axisLabel: { color: colors.muted },
  axisLine: { show: true, lineStyle: { color: colors.line } },
  splitLine: { show: index === 0, lineStyle: { color: colors.line } },
});

const gridBottom = ({ legend, zoom }) =>
  GRID_EDGE + (legend ? LEGEND_ROOM : 0) + (zoom ? ZOOM_ROOM : 0);

const zoomOf = (zoom, colors) =>
  zoom
    ? [
        { type: 'inside', xAxisIndex: 0 },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: GRID_EDGE,
          height: ZOOM_HEIGHT,
          borderColor: colors.line,
          textStyle: { color: colors.muted },
        },
      ]
    : [];

/**
 * The option of the estate's one chart, a smoothed line over a time axis
 * as every chart of hyperweaver-ui was: one line per series that is not
 * `hidden`, in the tone it names or the next of the ten, its dash, width
 * and opacity its own, on the first value axis or the second; a shared
 * tooltip whose every value carries its series' unit, or its axis'; the
 * legend under the plot and the zoom, inside the plot and as a slider,
 * while asked for; every colour from `colors`, the theme's tokens as the
 * page read them, none written here; the generated description of the
 * `aria` option opened by `title`, with decal patterns; no animation
 * while `reduced`. A series of one point draws the point itself, because
 * a line needs two.
 *
 * @param {Object} chart - The chart
 * @param {string} chart.title - What the chart shows, the description's first sentence
 * @param {Array<Object>} chart.series - `[{ key, name, points, tone?, dash?, width?, opacity?, axis?, unit?, digits?, hidden? }]`, `points` as `[[ms, value]]`
 * @param {Array<Object>} [chart.axes] - One or two value axes, `[{ name?, min?, max?, unit? }]`
 * @param {Object} chart.colors - The colour of every name in `CHART_PROBES`, and `font`
 * @param {boolean} [chart.legend] - Whether the legend draws
 * @param {boolean} [chart.zoom] - Whether the zoom draws
 * @param {boolean} [chart.reduced] - Whether motion is reduced
 * @returns {Object} The ECharts option
 */
export const chartOption = ({
  title,
  series,
  axes = ONE_AXIS,
  colors,
  legend = false,
  zoom = false,
  reduced = false,
}) => {
  const drawn = tonedSeries(series).filter(entry => !entry.hidden);
  const named = axes.some(axis => Boolean(axis.name));
  return {
    animation: !reduced,
    backgroundColor: 'transparent',
    textStyle: { color: colors.text, fontFamily: colors.font },
    aria: {
      enabled: true,
      label: { general: { withoutTitle: title } },
      decal: { show: true },
    },
    grid: {
      left: GRID_EDGE,
      right: GRID_EDGE,
      top: named ? GRID_TOP_NAMED : GRID_TOP,
      bottom: gridBottom({ legend, zoom }),
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      textStyle: { color: colors.text },
    },
    legend: {
      show: legend,
      type: 'scroll',
      bottom: zoom ? ZOOM_ROOM : 0,
      textStyle: { color: colors.text },
      pageTextStyle: { color: colors.muted },
      pageIconColor: colors.text,
      pageIconInactiveColor: colors.muted,
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: colors.muted, hideOverlap: true },
      axisLine: { lineStyle: { color: colors.line } },
      splitLine: { show: false },
    },
    yAxis: axes.map((axis, index) => valueAxis(axis, index, colors)),
    dataZoom: zoomOf(zoom, colors),
    series: drawn.map(entry => lineOf(entry, axes, colors)),
  };
};
