import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaRotate } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useArrival } from '../../../hooks/useArrival';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { log } from '../../../lib/logger';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { refusalMessage } from '../../../utils/validation';
import { ROW_BULK } from '../../collections/bulkActions';
import { RowCards } from '../../hosts/components/PickDialogParts';
import { createCert } from '../api/certsStore';
import { usePullToVault } from '../hooks/usePullToVault';
import { useSecretStores } from '../hooks/useSecretStores';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { nowOf } from '../utils/records';
import { recordOf, rowOf } from '../utils/sync';

import AccessPicker from './AccessPicker';
import PullAction from './PullAction';
import SecretRecordModal from './SecretRecordModal';
import SecretsActions from './SecretsActions';
import { STORE_COLUMNS, matchesStoreRow, storeFilterGroupsOf } from './storeColumns';
import { syncChipsColumnOf, syncColumnsOf } from './SyncMarks';

const ACCESS_BULK = ROW_BULK.filter(action => action.picker);

const rowNameOf = row => row.name;

const rowKey = row => row.id;

const groupRows = (organizations, rows, noneLabel) => {
  if (organizations.length === 0) {
    return null;
  }
  const names = new Set(organizations.map(organization => organization.name));
  const loose = rows.filter(row => !names.has(row.organization));
  return [
    ...organizations.map(organization => ({
      key: organization.name,
      organization: { name: organization.name, logo: organization.logo || '' },
      items: rows.filter(row => row.organization === organization.name),
    })),
    ...(loose.length > 0
      ? [{ key: '', organization: { name: noneLabel, logo: '' }, items: loose }]
      : []),
  ];
};

const BackendPull = ({ row, backendKey, held, onPull }) => {
  const own = row.held[backendKey]?.row || null;
  return own ? <PullAction row={own} held={held} onPull={onPull} /> : null;
};

BackendPull.propTypes = {
  row: PropTypes.object.isRequired,
  backendKey: PropTypes.string.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onPull: PropTypes.func.isRequired,
};

const PickedState = ({ selection, managed, onAccess }) => {
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
      {managed > 0
        ? ACCESS_BULK.map(action => (
            <AccessPicker key={action.key} action={action} count={managed} onAccess={onAccess} />
          ))
        : null}
    </>
  );
};

PickedState.propTypes = {
  selection: PropTypes.shape({
    someSelected: PropTypes.bool.isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
    clear: PropTypes.func.isRequired,
  }).isRequired,
  managed: PropTypes.number.isRequired,
  onAccess: PropTypes.func.isRequired,
};

/**
 * The Certificates page of the backend's store at `/certs/shared`, drawn
 * while the host lists `certs-store` and a person is signed in: every
 * secret the person reaches, the union by stable id of the backend's
 * rows of every organization the person belongs to, or of the person's
 * own store on the host while they belong to none, the identity
 * provider's store and this browser's Vault, read on open, on Refresh
 * and on the `certs` topic's events, one organization group row per
 * organization the way the listings group their rows and one for the
 * rows of none, the Org column and one lettered column a store whose
 * mark toggles the row's sync there, narrowed by the navbar binding
 * under `table_prefs_certs_shared` with the Kind, Status, Visibility and
 * Organization groups, a `#<id>` in the URL landing on that row, each
 * row the backend holds offering Pull to vault, keeping the row's record
 * in the vault under its `remote_id`; Pull never deletes. The heading's
 * pane carries, while rows are picked, "N selected", Clear selection and,
 * over the picked rows the person manages (`canManageRecord`), the
 * Visibility and Status pickers, one PUT a row; then Add, the secret
 * record form writing `POST /api/certs` to the active organization, the
 * Actions split button, its press Sync now under the muted Last synced
 * line and its menu Pull selected to vault, one pull a picked row and one
 * notice naming the count, Delete selected over the picked rows the
 * person manages behind the typed confirmation, one DELETE a row and one
 * notice naming the count, and Export selected, then the table or cards
 * toggle and Refresh, the rows read again once after a write.
 */
const SharedPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const vault = useVault();
  const stores = useSecretStores({ page: 'backend' });
  const puller = usePullToVault();
  const store = useStoreWrites();
  const [collapsed, setCollapsed] = useState({});
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState('table');
  const backendKey = status.role || '';
  const thresholdDays = vault.preferences.threshold_days;
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    now: nowOf(),
    thresholdDays,
    sync: { busy: stores.busy, toggle: stores.toggle, settings: stores.settings },
  };
  const columns = [...STORE_COLUMNS, ...syncColumnsOf(stores.columnStores)];
  const search = useDetailSearch({
    rows: stores.rows,
    matches: matchesStoreRow,
    placeholderKey: 'certs.search.sharedPlaceholder',
    columns,
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
  const backendRows = () =>
    picked()
      .map(row => row.held[backendKey]?.row)
      .filter(Boolean);
  const managed = backendRows().filter(row => canManageRecord(context.user, row.organization, row));

  const pullPicked = () => puller.pullMany(backendRows()).then(selection.clear);

  const setPickedAccess = patch =>
    Promise.all(managed.map(row => store.setAccess(recordOf(row), patch))).then(() => {
      selection.clear();
      stores.refresh();
    });

  const removePicked = async () => {
    const answers = await Promise.all(managed.map(store.removeRow));
    const removed = answers.filter(Boolean).length;
    selection.clear();
    if (removed > 0) {
      notify('success', t('certs.shared.removedMany', { count: removed }));
    }
    stores.refresh();
  };

  const addSecret = record =>
    createCert(rowOf(record, vault.organization))
      .then(() => {
        setAdding(false);
        notify('success', t('certs.notice.saved'));
        stores.refresh();
      })
      .catch(error => {
        log.api.error('Certs add refused', { error: error.message });
        notify('danger', refusalMessage({ error, t }));
      });

  const actionsProps = { backendKey, held: puller.held, onPull: puller.pull };

  const headingActions = (
    <>
      <PickedState selection={selection} managed={managed.length} onAccess={setPickedAccess} />
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        data-action="add-secret"
        onClick={() => setAdding(true)}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('certs.vault.addSecret')}
      </button>
      <SecretsActions
        lastSynced={stores.lastSynced}
        busy={stores.busy}
        onSync={() => stores.syncNow(selection.someSelected ? picked() : search.rows)}
        items={[
          {
            action: 'bulk-pull',
            labelKey: 'certs.shared.pullSelected',
            onClick: pullPicked,
            disabled: backendRows().length === 0,
          },
          {
            action: 'delete-selected',
            labelKey: 'certs.stores.deleteSelected',
            onClick: () => setRemoving(true),
            disabled: managed.length === 0,
          },
          {
            action: 'export-selected',
            labelKey: 'certs.stores.exportSelected',
            onClick: () => vault.exportBundle(picked().map(row => row.record)),
            disabled: !selection.someSelected,
          },
        ]}
      />
      <ViewToggle view={view} onChange={setView} />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="refresh"
        onClick={stores.refresh}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('certs.shared.refresh')}
      </button>
    </>
  );

  const emptyText = t(search.filtering ? 'pages.noMatches' : 'pages.empty');

  return (
    <div className="list row" data-page="certs-shared">
      <SectionHeading
        title={t('certs.shared.title')}
        count={stores.loaded ? stores.rows.length : t('pages.loading')}
        state={stores.failed ? 'warning' : null}
        actions={headingActions}
      />
      {stores.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('certs.shared.loadError')}
        </div>
      ) : null}
      <div data-view={view}>
        {view === 'cards' ? (
          <RowCards
            name="certs-shared-cards"
            rows={search.rows}
            columns={[...STORE_COLUMNS, syncChipsColumnOf(stores.columnStores)]}
            rowKey={rowKey}
            ctx={ctx}
            RowActions={BackendPull}
            actionsProps={actionsProps}
            emptyText={emptyText}
          />
        ) : (
          <SubTable
            columns={columns}
            rows={search.rows}
            groups={groupRows(vault.organizations, search.rows, t('certs.stores.noOrganization'))}
            collapsed={collapsed}
            onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
            countKey="certs.shared.count"
            rowKey={rowKey}
            rowRef={arrival.ref}
            rowProp="row"
            RowActions={BackendPull}
            actionsProps={actionsProps}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            widths={search.widths}
            onResize={search.setColumnWidth}
            ctx={ctx}
            emptyText={emptyText}
            selection={selection.subtable}
          />
        )}
      </div>
      {adding ? <SecretRecordModal onSave={addSecret} onClose={() => setAdding(false)} /> : null}
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
