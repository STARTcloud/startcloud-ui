const encoded = value => encodeURIComponent(value);

/**
 * The filters a log opens with, hyperweaver-ui's: a hundred lines, the
 * tail, no grep, no since.
 */
export const LOG_FILTERS = { lines: 100, tail: true, grep: '', since: '' };

export const STREAM_LINE_CAP = 1000;

/**
 * The fault manager logs hyperweaver-ui listed itself, since the log
 * list route answers none of them: the faults, the errors, the info and
 * the high-value info.
 */
export const FAULT_MANAGER_LOGS = [
  {
    name: 'faults',
    labelKey: 'host.logFileExplorer.faults',
    type: 'fault-manager',
    subtype: 'faults',
  },
  {
    name: 'errors',
    labelKey: 'host.logFileExplorer.errors',
    type: 'fault-manager',
    subtype: 'errors',
  },
  { name: 'info', labelKey: 'host.logFileExplorer.info', type: 'fault-manager', subtype: 'info' },
  {
    name: 'info-hival',
    labelKey: 'host.logFileExplorer.infoHival',
    type: 'fault-manager',
    subtype: 'info-hival',
  },
];

/**
 * Whether a log is a fault manager log, which cannot be streamed.
 *
 * @param {Object|null} log - The log's row
 * @returns {boolean} True for a fault manager log
 */
export const isFaultManagerLog = log => log?.type === 'fault-manager';

/**
 * The log files grouped by their type in the order they arrive, the
 * fault manager group added from `FAULT_MANAGER_LOGS` while the agent
 * lists none.
 *
 * @param {Array<Object>} logFiles - The `log_files` rows
 * @returns {Array<{ type: string, logs: Array<Object> }>} The groups
 */
export const groupLogFiles = logFiles => {
  const groups = new Map();
  logFiles.forEach(log => {
    groups.set(log.type, [...(groups.get(log.type) || []), log]);
  });
  if (!groups.has('fault-manager')) {
    groups.set('fault-manager', FAULT_MANAGER_LOGS);
  }
  return [...groups.entries()].map(([type, logs]) => ({ type, logs }));
};

/**
 * The route a log's content is read at, hyperweaver-ui's:
 * `system/logs/fault-manager/{subtype}` for a fault manager log and
 * `system/logs/{name}` for every other.
 *
 * @param {Object} log - The log's row
 * @returns {string} The agent path
 */
export const logRouteOf = log =>
  isFaultManagerLog(log)
    ? `system/logs/fault-manager/${encoded(log.subtype)}`
    : `system/logs/${encoded(log.name)}`;

/**
 * The query of a log read, hyperweaver-ui's: the lines and the tail, and
 * the grep and the since each only where given.
 *
 * @param {Object} filters - The filters, the shape of `LOG_FILTERS`
 * @returns {Object} The query
 */
export const logParamsOf = filters => ({
  lines: filters.lines,
  tail: filters.tail,
  ...(filters.grep ? { grep: filters.grep } : {}),
  ...(filters.since ? { since: filters.since } : {}),
});

/**
 * The body of `POST system/logs/{name}/stream/start`, hyperweaver-ui's:
 * the lines to follow and the grep pattern or null.
 *
 * @param {Object} filters - The filters, the shape of `LOG_FILTERS`
 * @returns {Object} The body
 */
export const streamBodyOf = filters => ({
  follow_lines: filters.lines,
  grep_pattern: filters.grep || null,
});

/**
 * The tone a log line draws in, hyperweaver-ui's: danger for an error or
 * a failure, warning for a warning, info for info, muted for debug,
 * plain otherwise.
 *
 * @param {string} line - The line
 * @returns {string} The text class
 */
export const logLevelClass = line => {
  const text = String(line || '').toLowerCase();
  if (text.includes('error') || text.includes('fail')) {
    return 'text-danger';
  }
  if (text.includes('warning') || text.includes('warn')) {
    return 'text-warning';
  }
  if (text.includes('info')) {
    return 'text-info';
  }
  if (text.includes('debug')) {
    return 'text-muted';
  }
  return 'text-white';
};

const TIMESTAMP = /^(?<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/u;

/**
 * A log line split into the syslog timestamp it opens with and the rest,
 * the whole line as the content where it opens with none.
 *
 * @param {string} line - The line
 * @returns {{ timestamp: string, content: string }} The parts
 */
export const splitLogLine = line => {
  const text = String(line || '');
  const match = TIMESTAMP.exec(text);
  if (!match) {
    return { timestamp: '', content: text };
  }
  const { timestamp } = match.groups;
  return { timestamp, content: text.substring(timestamp.length).trim() };
};

/**
 * The text a log's download holds, the raw output or the lines joined.
 *
 * @param {Object|null} logData - The content the read answered
 * @returns {string} The text
 */
export const logDownloadText = logData =>
  logData?.raw_output || (Array.isArray(logData?.lines) ? logData.lines.join('\n') : '');

/**
 * The file name a log downloads as, its name and the day.
 *
 * @param {Object} log - The log's row
 * @param {Date} [day] - The day, today by default
 * @returns {string} The file name
 */
export const logDownloadName = (log, day = new Date()) =>
  `${log.name}-${day.toISOString().split('T')[0]}.log`;

/**
 * The stream's lines with one appended, the newest thousand kept.
 *
 * @param {Array<Object>} lines - The lines held
 * @param {Object} line - The line pushed
 * @returns {Array<Object>} The lines
 */
export const withStreamLine = (lines, line) => [...lines, line].slice(-STREAM_LINE_CAP);

/**
 * Whether a log file matches the page's query, by its name, its display
 * name and its type.
 *
 * @param {Object} log - The log's row
 * @param {string} needle - The lower-cased query
 * @returns {boolean} True when it matches
 */
export const matchesLogFile = (log, needle) =>
  [log.name, log.displayName, log.type].some(text =>
    String(text || '')
      .toLowerCase()
      .includes(needle)
  );

/**
 * The glyph key of a log type, hyperweaver-ui's: the server, the key, the
 * warning triangle or the file.
 *
 * @param {string} type - The log's type
 * @returns {string} The glyph key
 */
export const logGlyph = type => {
  switch (type) {
    case 'system':
      return 'server';
    case 'authentication':
      return 'key';
    case 'fault-manager':
      return 'warning';
    default:
      return 'file';
  }
};
