import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useArrival } from '../../../hooks/useArrival';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { pageContextShape } from '../../../utils/itemShape';
import { usePullToVault } from '../hooks/usePullToVault';
import { useSharedRows } from '../hooks/useSharedRows';
import { useVault } from '../hooks/useVault';
import { nowOf } from '../utils/records';

import PullAction from './PullAction';
import { STORE_COLUMNS, matchesStoreRow, storeFilterGroupsOf } from './storeColumns';

const groupRows = (organizations, rows) =>
  organizations.length > 0
    ? organizations.map(organization => ({
        key: organization.name,
        organization: { name: organization.name, logo: organization.logo || '' },
        items: rows.filter(row => row.organization === organization.name),
      }))
    : null;

/**
 * The Certificates page of the backend's store at `/certs/shared`, drawn
 * while the host lists `certs-store` and a person is signed in: the rows
 * of every organization the person belongs to, or of the person's own
 * store on the host while they belong to none, read on open, on Refresh
 * and on the `certs` topic's events, one organization group row per
 * organization the way the listings group their rows, narrowed by the
 * navbar binding under `table_prefs_certs_shared` with the Kind,
 * Status, Visibility and Organization groups, a `#<id>` in the URL
 * landing on that row, each row's Pull to vault keeping the row's
 * record in the vault under its `remote_id`; Pull never deletes.
 */
const SharedPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const vault = useVault();
  const shared = useSharedRows(vault.organizations);
  const puller = usePullToVault();
  const [collapsed, setCollapsed] = useState({});
  const thresholdDays = vault.preferences.threshold_days;
  const ctx = { ...context, t, language: i18n.language, now: nowOf(), thresholdDays };
  const search = useDetailSearch({
    rows: shared.rows,
    matches: matchesStoreRow,
    placeholderKey: 'certs.search.sharedPlaceholder',
    columns: STORE_COLUMNS,
    ctx,
    prefsKey: `${context.prefsPrefix}_certs_shared`,
    filterGroups: storeFilterGroupsOf(ctx),
  });
  const arrival = useArrival(search.rows);

  useEffect(() => {
    document.title = `${t('certs.sidebar.shared')} · ${context.appName}`;
  }, [context.appName, t]);

  const refresh = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action="refresh"
      onClick={shared.read}
    >
      <FaRotate className="me-1" aria-hidden="true" />
      {t('certs.shared.refresh')}
    </button>
  );

  return (
    <div className="list row" data-page="certs-shared">
      <SectionHeading
        title={t('certs.shared.title')}
        count={shared.loaded ? shared.rows.length : t('pages.loading')}
        state={shared.failed ? 'warning' : null}
        actions={refresh}
      />
      {shared.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('certs.shared.loadError')}
        </div>
      ) : null}
      <SubTable
        columns={STORE_COLUMNS}
        rows={search.rows}
        groups={groupRows(vault.organizations, search.rows)}
        collapsed={collapsed}
        onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
        countKey="certs.shared.count"
        rowKey={row => row.id}
        rowRef={arrival.ref}
        rowProp="row"
        RowActions={PullAction}
        actionsProps={{ held: puller.held, onPull: puller.pull }}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
      />
    </div>
  );
};

SharedPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SharedPage;
