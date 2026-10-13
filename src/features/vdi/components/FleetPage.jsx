import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCompress, FaDownload, FaEraser, FaExpand, FaFileCode, FaFileCsv } from 'react-icons/fa6';
import { useLocation } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import { useStatus } from '../../../contexts/StatusContext';
import { usePageName } from '../../../hooks/usePageName';
import { authMethod } from '../../../utils/capabilities';
import { pageContextShape } from '../../../utils/itemShape';
import { useFleet } from '../hooks/useFleet';
import { useFleetSearch } from '../hooks/useFleetSearch';
import { useGrafana } from '../hooks/useGrafana';
import { downloadText, exportCsv, exportJson } from '../utils/exportRows';
import { vmKey } from '../utils/vmStatus';

import FleetTable, { fleetColumns } from './FleetTable';
import PoolCards from './PoolCards';
import StatusCards from './StatusCards';

const EXPORT_NAME = 'vdi-health-export';

const CountLine = ({ shown, total }) => {
  const { t } = useTranslation();
  return (
    <div className="small text-body-secondary" data-note="fleet-count">
      {shown < total
        ? t('vdi.count.filtered', { count: shown, total })
        : t('vdi.count.all', { count: total })}
    </div>
  );
};

CountLine.propTypes = {
  shown: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

/**
 * The panel's actions of the fleet page over the narrowed rows: Export
 * with JSON and CSV as its choices, Expand all, Collapse all and, while
 * a person chose a sort, Reset sort.
 *
 * @param {Object} options - The rows, the sort state and the page's setters
 * @returns {Array<Object>} The actions
 */
const fleetActions = ({ rows, sorted, resetSort, now, t, setExpanded }) => [
  {
    key: 'export',
    labelKey: 'vdi.toolbar.export',
    icon: FaDownload,
    choices: [
      {
        key: 'json',
        labelKey: 'vdi.toolbar.exportJson',
        icon: FaFileCode,
        onRun: () => downloadText(exportJson(rows), 'application/json', `${EXPORT_NAME}.json`),
      },
      {
        key: 'csv',
        labelKey: 'vdi.toolbar.exportCsv',
        icon: FaFileCsv,
        onRun: () => downloadText(exportCsv(rows, { t, now }), 'text/csv', `${EXPORT_NAME}.csv`),
      },
    ],
  },
  {
    key: 'expand',
    labelKey: 'vdi.toolbar.expandAll',
    icon: FaExpand,
    onRun: () => setExpanded(new Set(rows.map(vmKey))),
  },
  {
    key: 'collapse',
    labelKey: 'vdi.toolbar.collapseAll',
    icon: FaCompress,
    onRun: () => setExpanded(new Set()),
  },
  ...(sorted
    ? [{ key: 'reset-sort', labelKey: 'vdi.toolbar.resetSort', icon: FaEraser, onRun: resetSort }]
    : []),
];

const FleetBody = ({ context, mode }) => {
  const { t } = useTranslation();
  const { search: query } = useLocation();
  const { vms, pools, now, loaded, failed } = useFleet();
  const grafana = useGrafana();
  const [expanded, setExpanded] = useState(() => new Set());
  const list = Object.values(vms);
  const search = useFleetSearch({
    vms: list,
    now,
    columns: fleetColumns,
    prefsKey: `${context.prefsPrefix}_vdi`,
    actionsOf: held => fleetActions({ ...held, now, t, setExpanded }),
  });
  usePageName(new URLSearchParams(query).get('pool') || '');

  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  const sorted = search.sort.length > 0;
  const { resetSort } = search;

  useEffect(() => {
    if (!sorted) {
      return undefined;
    }
    const onKeyDown = keyEvent => {
      if (keyEvent.key === 'Escape' && !keyEvent.target.closest('input,select,textarea')) {
        resetSort();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sorted, resetSort]);

  const toggleExpanded = key =>
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  return (
    <div className="list row" data-page="fleet">
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('vdi.fleet.loadError')}
        </div>
      ) : null}
      <StatusCards
        vms={list}
        now={now}
        filterState={search.filterState}
        onCycle={search.cycleFilter}
      />
      <PoolCards
        pools={pools}
        collapsed={search.poolsCollapsed}
        onToggle={search.togglePools}
        filterState={search.filterState}
        onCycle={search.cycleFilter}
      />
      {list.length === 0 ? (
        <EmptyState title={t('vdi.empty.title')} body={t('vdi.empty.body')} />
      ) : (
        <FleetTable
          rows={search.rows}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          pools={pools}
          now={now}
          grafana={grafana}
          mode={mode}
          filtering={search.filtering}
        />
      )}
      <CountLine shown={search.rows.length} total={list.length} />
    </div>
  );
};

FleetBody.propTypes = {
  context: pageContextShape.isRequired,
  mode: PropTypes.string.isRequired,
};

/**
 * The fleet page at `/` of a host that advertises `fleet`: the five status
 * cards, the pool cards, the fleet table and the count line, everything
 * live over `useFleet` and narrowed by the navbar binding of
 * `useFleetSearch` under `table_prefs_vdi`, whose panel carries the page's
 * actions, Export as JSON or CSV, Expand all, Collapse all and Reset sort
 * while a sort was chosen; the route's `pool` named as the page's crumb;
 * a host that needs a session shows the sign-in note until one exists and
 * fetches nothing before.
 */
const FleetPage = ({ context, mode }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const allowed = authMethod(status) === 'none' || Boolean(context.user);

  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  if (!allowed) {
    return (
      <div className="list row">
        <div className="alert alert-secondary">{t('vdi.fleet.signIn')}</div>
      </div>
    );
  }
  return <FleetBody context={context} mode={mode} />;
};

FleetPage.propTypes = {
  context: pageContextShape.isRequired,
  mode: PropTypes.string.isRequired,
};

export default FleetPage;
