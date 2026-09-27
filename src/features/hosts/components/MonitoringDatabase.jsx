import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { nextSort, sortItems } from '../../../utils/sort';
import { useHostReading } from '../hooks/useHostReadings';
import { collectionOf, summaryRows } from '../utils/resources';
import { formatTaskDate } from '../utils/tasks';

const DEFAULT_SORT = [{ column: 'label', direction: 'asc' }];

const NO_HIDDEN = new Set();

const columns = [
  {
    key: 'label',
    kind: 'name',
    labelKey: 'hosts.overview.colData',
    value: row => row.label,
    render: row => <span className="text-capitalize">{row.label}</span>,
  },
  {
    key: 'records',
    kind: 'count',
    labelKey: 'hosts.overview.colRecords',
    className: 'text-end',
    value: row => row.records,
    render: (row, ctx) => row.records.toLocaleString(ctx.language),
  },
  {
    key: 'latest',
    kind: 'date',
    labelKey: 'hosts.overview.colLatest',
    value: row => new Date(row.latest || 0).getTime(),
    render: row => formatTaskDate(row.latest),
  },
];

const keptText = ({ interval, retention }, t) =>
  [
    interval > 0 ? t('hosts.overview.collectionInterval', { seconds: interval }) : '',
    retention > 0 ? t('hosts.overview.retention', { count: retention }) : '',
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The monitoring database of the host page, a glass section behind
 * `monitoring`: what the agent's monitoring store holds, one row a table
 * that holds records in the one table over Data, Records and Latest
 * sample, the heading saying the collection interval and the retention
 * where the monitoring status answers them as one number each. Nothing
 * draws for an agent whose store holds no record, an agent that keeps no
 * history, and the section reads again with the page's Refresh.
 */
const MonitoringDatabase = ({ id }) => {
  const { t, i18n } = useTranslation();
  const summary = useHostReading(id, 'monitoring-summary');
  const status = useHostReading(id, 'monitoring-status');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  const rows = useMemo(() => summaryRows(summary.data), [summary.data]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div data-panel="database">
      <SectionHeading
        title={t('hosts.overview.database')}
        count={keptText(collectionOf(status.data), t) || null}
      />
      <SubTable
        columns={columns}
        rows={sortItems(rows, sort, columns, ctx)}
        rowKey={row => row.key}
        sort={sort}
        onSort={(column, options) => setSort(current => nextSort(current, column, options))}
        hiddenColumns={NO_HIDDEN}
        ctx={ctx}
        emptyText={t('pages.empty')}
      />
    </div>
  );
};

MonitoringDatabase.propTypes = {
  id: PropTypes.string.isRequired,
};

export default MonitoringDatabase;
