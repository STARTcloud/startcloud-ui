import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaCompress, FaEraser, FaExpand } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStreamStatus } from '../../../hooks/useEventStream';
import { authMethod } from '../../../utils/capabilities';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { pageContextShape } from '../../catalog/utils/itemShape';
import { useFleet } from '../hooks/useFleet';
import { useFleetSearch } from '../hooks/useFleetSearch';
import { useGrafana } from '../hooks/useGrafana';
import { vmKey } from '../utils/vmStatus';

import ExportButtons from './ExportButtons';
import FleetTable, { fleetColumns } from './FleetTable';
import PoolCards from './PoolCards';
import StatusCards from './StatusCards';

const STREAM_CLASSES = {
  live: 'text-success',
  connecting: 'text-warning',
  reconnecting: 'text-warning',
  paused: 'text-secondary',
  stopped: 'text-danger',
};

const CountLine = ({ shown, total, lastEventAt }) => {
  const { t, i18n } = useTranslation();
  const stream = useEventStreamStatus();
  return (
    <div className="d-flex flex-wrap align-items-center gap-3 small text-body-secondary">
      <span>
        {shown < total
          ? t('vdi.count.filtered', { count: shown, total })
          : t('vdi.count.all', { count: total })}
      </span>
      <span className="d-inline-flex align-items-center gap-1">
        <FaCircle className={`${STREAM_CLASSES[stream] || 'text-secondary'} small`} aria-hidden />
        {t(`vdi.stream.${stream}`)}
        {lastEventAt
          ? ` · ${t('vdi.count.lastEvent', { time: formatRelativeTime(lastEventAt, i18n.language) })}`
          : ''}
      </span>
    </div>
  );
};

CountLine.propTypes = {
  shown: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  lastEventAt: PropTypes.number,
};

const Toolbar = ({ rows, now, sort, onResetSort, onExpandAll, onCollapseAll }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
      <ExportButtons rows={rows} now={now} />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={onExpandAll}
        title={t('vdi.toolbar.expandAll')}
      >
        <FaExpand aria-hidden />
        {t('vdi.toolbar.expandAll')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={onCollapseAll}
        title={t('vdi.toolbar.collapseAll')}
      >
        <FaCompress aria-hidden />
        {t('vdi.toolbar.collapseAll')}
      </button>
      {sort.length > 0 ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={onResetSort}
          title={t('vdi.toolbar.resetSort')}
        >
          <FaEraser aria-hidden />
          {t('vdi.toolbar.resetSort')}
        </button>
      ) : null}
    </div>
  );
};

Toolbar.propTypes = {
  rows: PropTypes.array.isRequired,
  now: PropTypes.number.isRequired,
  sort: PropTypes.array.isRequired,
  onResetSort: PropTypes.func.isRequired,
  onExpandAll: PropTypes.func.isRequired,
  onCollapseAll: PropTypes.func.isRequired,
};

const FleetBody = ({ context, theme }) => {
  const { t } = useTranslation();
  const { vms, pools, now, loaded, failed, lastEventAt } = useFleet();
  const grafana = useGrafana();
  const [expanded, setExpanded] = useState(() => new Set());
  const list = Object.values(vms);
  const search = useFleetSearch({
    vms: list,
    now,
    columns: fleetColumns,
    prefsKey: `${context.prefsPrefix}_vdi`,
  });

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
    <div className="list row">
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
      <Toolbar
        rows={search.rows}
        now={now}
        sort={search.sort}
        onResetSort={search.resetSort}
        onExpandAll={() => setExpanded(new Set(search.rows.map(vmKey)))}
        onCollapseAll={() => setExpanded(new Set())}
      />
      {list.length === 0 ? (
        <div className="alert alert-secondary">
          <strong>{t('vdi.empty.title')}</strong> {t('vdi.empty.body')}
        </div>
      ) : (
        <FleetTable
          rows={search.rows}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          pools={pools}
          now={now}
          grafana={grafana}
          theme={theme}
          filtering={search.filtering}
        />
      )}
      <CountLine shown={search.rows.length} total={list.length} lastEventAt={lastEventAt} />
    </div>
  );
};

FleetBody.propTypes = {
  context: pageContextShape.isRequired,
  theme: PropTypes.string.isRequired,
};

/**
 * The fleet page at `/` of a host that advertises `fleet`: the five status
 * cards, the pool cards, the toolbar (export, expand all, collapse all,
 * reset sort), the fleet table and the count line with the stream state,
 * everything live over `useFleet` and narrowed by the navbar binding of
 * `useFleetSearch` under `table_prefs_vdi`; a host that needs a session
 * shows the sign-in note until one exists and fetches nothing before.
 */
const FleetPage = ({ context, theme }) => {
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
  return <FleetBody context={context} theme={theme} />;
};

FleetPage.propTypes = {
  context: pageContextShape.isRequired,
  theme: PropTypes.string.isRequired,
};

export default FleetPage;
