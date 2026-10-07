const QUOTED = /[",\r\n]/u;
const LINE_END = '\r\n';
const INSTANT_COLUMN = 'instant';
const PNG_PIXEL_RATIO = 2;

const fieldOf = text => {
  const value = String(text);
  return QUOTED.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

const inRange = (range, at) => !range || (at >= range.from && at <= range.to);

const valueOf = value => (value === null || value === undefined ? '' : String(value));

/**
 * The drawn lines of a chart as RFC 4180 text: a header row of `instant`
 * and one column a line, named by the line, then one row an instant
 * inside `range`, oldest first, the instant as RFC 3339 in UTC and each
 * line's value at it, empty where the line has none; fields holding a
 * comma, a quote or a line break are quoted, rows end in CRLF. A hidden
 * line is left out.
 *
 * @param {Array<Object>} series - The chart's series, `[{ name, points, hidden? }]`
 * @param {{ from: number, to: number }|null} range - The drawn range in milliseconds, null for every point
 * @returns {string} The CSV text
 */
export const csvOf = (series, range = null) => {
  const lines = series.filter(line => !line.hidden);
  const instants = new Set();
  const held = lines.map(line => {
    const byInstant = new Map();
    line.points.forEach(([at, value]) => {
      if (value !== null && value !== undefined && inRange(range, at)) {
        byInstant.set(at, value);
        instants.add(at);
      }
    });
    return byInstant;
  });
  const header = [INSTANT_COLUMN, ...lines.map(line => line.name)].map(fieldOf).join(',');
  const rows = [...instants]
    .sort((first, second) => first - second)
    .map(at =>
      [new Date(at).toISOString(), ...held.map(byInstant => valueOf(byInstant.get(at)))]
        .map(fieldOf)
        .join(',')
    );
  return [header, ...rows].map(row => `${row}${LINE_END}`).join('');
};

/**
 * The file name of an export, the title lowered with every run of
 * characters outside letters and digits one dash, and the extension.
 *
 * @param {string} title - The chart's title
 * @param {string} extension - `csv` or `png`
 * @returns {string} The file name
 */
export const exportName = (title, extension) =>
  `${
    String(title)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/gu, '') || 'chart'
  }.${extension}`;

const save = (href, name) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

/**
 * Hands the browser a CSV file to save under `name`.
 *
 * @param {string} text - The CSV text
 * @param {string} name - The file name
 */
export const saveCsv = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  save(url, name);
  URL.revokeObjectURL(url);
};

/**
 * Hands the browser a PNG of a chart's canvas to save under `name`, the
 * canvas painted twice its size over the surface colour.
 *
 * @param {Object} instance - The ECharts instance
 * @param {string} surface - The surface colour painted under the canvas
 * @param {string} name - The file name
 */
export const savePng = (instance, surface, name) => {
  save(
    instance.getDataURL({ type: 'png', pixelRatio: PNG_PIXEL_RATIO, backgroundColor: surface }),
    name
  );
};
