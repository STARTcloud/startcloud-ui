import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import SubTable from '../../../components/common/SubTable';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { humanSize } from '../utils/zfsUtils';

const PREFS_KEY = 'table_prefs_zfs_properties';

const rowsOf = (properties, edits) =>
  Object.entries(properties).map(([key, entry]) => {
    const current = entry?.value ?? String(entry);
    return {
      key,
      current,
      source: entry?.source || '',
      readOnly: (entry?.source ?? '-') === '-',
      edited: edits[key] !== undefined && edits[key] !== current,
    };
  });

const COLUMNS = [
  {
    key: 'property',
    kind: 'name',
    labelKey: 'host.zfsPropertiesEditor.propertyHeader',
    value: row => row.key,
    render: row => <code className="small">{row.key}</code>,
  },
  {
    key: 'value',
    kind: 'text',
    labelKey: 'host.zfsPropertiesEditor.valueHeader',
    priority: 1,
    value: row => row.current,
    render: (row, ctx) =>
      row.readOnly ? (
        <span title={row.current}>{humanSize(row.current)}</span>
      ) : (
        <input
          className="form-control form-control-sm font-monospace"
          type="text"
          aria-label={ctx.t('host.zfsPropertiesEditor.valueLabel', { key: row.key })}
          value={ctx.edits[row.key] ?? row.current}
          onChange={event => ctx.onEdit(row.key, event.target.value)}
          disabled={ctx.disabled}
        />
      ),
  },
  {
    key: 'source',
    kind: 'word',
    labelKey: 'host.zfsPropertiesEditor.sourceHeader',
    value: row => row.source,
    render: row => <span className="text-muted">{row.source}</span>,
  },
];

/**
 * The properties of a pool or a dataset as the one table, hyperweaver-ui's
 * ZFS properties editor: a property with a source edits inline and a
 * read-only one, source `-`, draws its value; the edits collect in the
 * caller's map and `propertyEdits` keeps the changed keys alone for the
 * write. An edited row carries `table-warning`.
 */
const ZfsPropertiesEditor = ({ properties, edits, onEdit, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const prefs = useTablePrefs(PREFS_KEY, COLUMNS);
  const rows = useMemo(() => rowsOf(properties, edits), [properties, edits]);
  const ctx = { t, language: i18n.language, edits, onEdit, disabled };
  return (
    <div className="zfs-properties" data-table="zfs-properties">
      <SubTable
        columns={COLUMNS}
        rows={rows}
        rowKey={row => row.key}
        rowClass={row => (row.edited ? 'table-warning' : '')}
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={ctx}
        emptyText={t('host.zfsPropertiesEditor.propertyHeader')}
      />
    </div>
  );
};

ZfsPropertiesEditor.propTypes = {
  properties: PropTypes.object.isRequired,
  edits: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The changed keys of the edits alone, the object a properties write
 * sends; empty while nothing differs.
 *
 * @param {Object} properties - The properties as the agent answered them
 * @param {Object} edits - The edits by key
 * @returns {Object} The changed keys
 */
export const propertyEdits = (properties, edits) => {
  const diff = {};
  Object.entries(edits).forEach(([key, value]) => {
    const current = properties[key]?.value ?? String(properties[key]);
    if (value !== current) {
      diff[key] = value;
    }
  });
  return diff;
};

export default ZfsPropertiesEditor;
