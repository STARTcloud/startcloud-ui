import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaRotate } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrival } from '../../../hooks/useArrival';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { ROW_BULK } from '../../collections/bulkActions';
import { usePullToVault } from '../hooks/usePullToVault';
import { useSharedRows } from '../hooks/useSharedRows';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { nowOf } from '../utils/records';
import { recordOf } from '../utils/sync';

import AccessPicker from './AccessPicker';
import PullAction from './PullAction';
import { STORE_COLUMNS, matchesStoreRow, storeFilterGroupsOf } from './storeColumns';

const ACCESS_BULK = ROW_BULK.filter(action => action.picker);

const rowNameOf = row => row.name;

const groupRows = (organizations, rows) =>
  organizations.length > 0
    ? organizations.map(organization => ({
        key: organization.name,
        organization: { name: organization.name, logo: organization.logo || '' },
        items: rows.filter(row => row.organization === organization.name),
      }))
    : null;

const PickedRows = ({ selection, managed, onPull, onAccess, onRemove }) => {
  const { t } = useTranslation();
  if (!selection.someSelected) {
    return null;
  }
  return (
    <>
      <strong>{t('pages.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('pages.bulk.clearSelection')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        data-action="bulk-pull"
        onClick={onPull}
      >
        <FaCloudArrowDown className="me-1" aria-hidden="true" />
        {t('certs.shared.pullSelected')}
      </button>
      {managed > 0 ? (
        <>
          {ACCESS_BULK.map(action => (
            <AccessPicker key={action.key} action={action} count={managed} onAccess={onAccess} />
          ))}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-action="bulk-remove"
            onClick={onRemove}
          >
            {t('certs.shared.removeSelected')}
          </button>
        </>
      ) : null}
    </>
  );
};

PickedRows.propTypes = {
  selection: PropTypes.shape({
    someSelected: PropTypes.bool.isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
    clear: PropTypes.func.isRequired,
  }).isRequired,
  managed: PropTypes.number.isRequired,
  onPull: PropTypes.func.isRequired,
  onAccess: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

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
 * record in the vault under its `remote_id`; Pull never deletes. The
 * table's select column feeds the heading pane's picked state while rows
 * are picked: "N selected", Clear selection, Pull selected to vault, one
 * pull a picked row and one notice naming the count, and over the picked
 * rows the person manages (`canManageRecord`) the Visibility and Status
 * pickers, one PUT a row, and Remove selected behind the typed
 * confirmation, one DELETE a row and one notice naming the count, the
 * rows read again once after a write.
 */
const SharedPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const shared = useSharedRows(vault.organizations);
  const puller = usePullToVault();
  const store = useStoreWrites();
  const [collapsed, setCollapsed] = useState({});
  const [removing, setRemoving] = useState(false);
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
  const selection = useSelection(search.rows, { labelOf: rowNameOf });
  const arrival = useArrival(search.rows);

  useEffect(() => {
    document.title = `${t('certs.sidebar.shared')} · ${context.appName}`;
  }, [context.appName, t]);

  const picked = () => search.rows.filter(row => selection.selected.has(row.id));
  const managed = picked().filter(row => canManageRecord(context.user, row.organization, row));

  const pullPicked = () => puller.pullMany(picked()).then(selection.clear);

  const setPickedAccess = patch =>
    Promise.all(managed.map(row => store.setAccess(recordOf(row), patch))).then(() => {
      selection.clear();
      shared.read();
    });

  const removePicked = async () => {
    const answers = await Promise.all(managed.map(store.removeRow));
    const removed = answers.filter(Boolean).length;
    selection.clear();
    if (removed > 0) {
      notify('success', t('certs.shared.removedMany', { count: removed }));
    }
    shared.read();
  };

  const headingActions = (
    <>
      <PickedRows
        selection={selection}
        managed={managed.length}
        onPull={pullPicked}
        onAccess={setPickedAccess}
        onRemove={() => setRemoving(true)}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="refresh"
        onClick={shared.read}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('certs.shared.refresh')}
      </button>
    </>
  );

  return (
    <div className="list row" data-page="certs-shared">
      <SectionHeading
        title={t('certs.shared.title')}
        count={shared.loaded ? shared.rows.length : t('pages.loading')}
        state={shared.failed ? 'warning' : null}
        actions={headingActions}
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
        selection={selection.subtable}
      />
      <ConfirmModal
        show={removing}
        handleClose={() => setRemoving(false)}
        handleConfirm={removePicked}
        title={t('certs.shared.removeSelected')}
        message={t('certs.shared.removeManyMessage', { count: managed.length })}
        keyword="remove"
        confirmText={t('certs.shared.removeSelected')}
      />
    </div>
  );
};

SharedPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SharedPage;
