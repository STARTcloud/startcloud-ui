import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaFileLines, FaFolderOpen, FaKey, FaServer, FaTriangleExclamation } from 'react-icons/fa6';

import { logGlyph } from '../../utils/logs';
import ManageTable from '../ManageTable';

const GLYPHS = { server: FaServer, key: FaKey, warning: FaTriangleExclamation, file: FaFileLines };

const LogGlyph = ({ type }) => {
  const Icon = GLYPHS[logGlyph(type)];
  return <Icon className="me-2" aria-hidden="true" />;
};

LogGlyph.propTypes = {
  type: PropTypes.string,
};

const typeWord = (type, t) =>
  t(`host.logFileExplorer.logType.${type}`, {
    defaultValue: String(type || '')
      .replace(/-/gu, ' ')
      .replace(/\b\w/gu, letter => letter.toUpperCase()),
  });

/**
 * The name a log file draws under, its label key where hyperweaver-ui
 * named one, its display name or its name.
 *
 * @param {Object} log - The log's row
 * @param {Function} t - The translator
 * @returns {string} The name
 */
export const logLabel = (log, t) => (log.labelKey ? t(log.labelKey) : log.displayName || log.name);

/**
 * The columns of the log files table, hyperweaver-ui's explorer as a
 * table: the log with the glyph of its type, its type as a badge and its
 * size where the agent answers one.
 */
export const LOG_FILE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.logFileExplorer.logFiles',
    value: (row, ctx) => logLabel(row, ctx.t),
    render: (row, ctx) => (
      <span>
        <LogGlyph type={row.type} />
        <strong>{logLabel(row, ctx.t)}</strong>
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.logFileExplorer.typeLogs',
    value: row => row.type || '',
    render: (row, ctx) => (
      <span className="badge text-bg-secondary">{typeWord(row.type, ctx.t)}</span>
    ),
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.logViewer.sizeLabel',
    value: row => Number(row.size) || 0,
    render: row => row.sizeFormatted || '',
    when: rows => rows.some(row => row.sizeFormatted),
  },
];

/**
 * The filter group of the log files table, the type of each log.
 */
export const LOG_FILE_FILTERS = [
  {
    key: 'type',
    labelKey: 'host.logFileExplorer.typeLogs',
    values: row => (row.type ? [row.type] : []),
    activeClass: 'bg-primary',
    labelFor: (value, t) => typeWord(value, t),
  },
];

/**
 * The action of one row of the log files table: Open, which selects the
 * log for the viewer, pressed while the log is the one shown.
 */
export const LogFileRowActions = ({ row, selected, onSelect }) => {
  const { t } = useTranslation();
  const active = selected?.name === row.name && selected?.type === row.type;
  return (
    <button
      type="button"
      className={`btn btn-sm btn-${active ? 'primary' : 'outline-secondary'}`}
      data-action="log-open"
      data-log={row.name}
      aria-pressed={active}
      onClick={() => onSelect(row)}
    >
      <FaFolderOpen className="me-1" aria-hidden="true" />
      {t('host.logViewer.selectLogFile')}
    </button>
  );
};

LogFileRowActions.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired, type: PropTypes.string }).isRequired,
  selected: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

/**
 * The log files of a host, hyperweaver-ui's explorer as the one table
 * over the files the page's binding left, the fault manager logs among
 * them, each row opening its log in the viewer.
 */
const LogFileExplorer = ({ table, reading, filtering, ctx, selected, onSelect }) => (
  <ManageTable
    name="log-files"
    columns={LOG_FILE_COLUMNS}
    table={table}
    rowKey={row => `${row.type}-${row.name}`}
    RowActions={LogFileRowActions}
    actionsProps={{ selected, onSelect }}
    ctx={ctx}
    emptyKey="host.systemLogs.emptyMessage"
    reading={reading}
    filtering={filtering}
  />
);

LogFileExplorer.propTypes = {
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  ctx: PropTypes.object.isRequired,
  selected: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

export default LogFileExplorer;
