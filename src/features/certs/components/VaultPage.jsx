import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCertificate,
  FaDownload,
  FaFileSignature,
  FaKey,
  FaLayerGroup,
  FaPlus,
  FaRotate,
  FaShieldHalved,
  FaTerminal,
  FaUserSecret,
  FaWandMagicSparkles,
} from 'react-icons/fa6';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import UploadZone from '../../../components/common/UploadZone';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useArrival } from '../../../hooks/useArrival';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { ROW_BULK } from '../../collections/bulkActions';
import { RowCards } from '../../hosts/components/PickDialogParts';
import { usePullToVault } from '../hooks/usePullToVault';
import { useRecordActions } from '../hooks/useRecordActions';
import { useSecretStores } from '../hooks/useSecretStores';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { useVaultSearch } from '../hooks/useVaultSearch';
import { SECRETS_ROUTE } from '../sidebar';
import { focusOn } from '../utils/focus';
import { DER_KINDS, SECRET_KINDS, isSecretKind, nameOf, nowOf } from '../utils/records';
import { VAULT } from '../utils/stores';

import AccessPicker from './AccessPicker';
import PullAction from './PullAction';
import SecretRecordModal from './SecretRecordModal';
import SecretsActions from './SecretsActions';
import { syncChipsColumnOf, syncColumnsOf } from './SyncMarks';
import { vaultColumns } from './vaultColumns';
import VaultTreeDialogs from './VaultTreeDialogs';

const KIND_ICONS = {
  certificate: FaCertificate,
  authority: FaShieldHalved,
  request: FaFileSignature,
  key: FaKey,
  ssh_certificate: FaTerminal,
  template: FaLayerGroup,
};

const TILE_KINDS = [...DER_KINDS, 'template'];

const ACCESS_BULK = ROW_BULK.filter(action => action.picker);

const secretKindOf = params => {
  const [first = ''] = String(params.get('kind') || '').split(',');
  return isSecretKind(first) ? first : '';
};

const HEADING_ID = 'certs-vault-heading';

const recordKey = record => record.id;

const ownOf = row => row.held?.[VAULT]?.record || null;

const managesSynced = (record, user) =>
  Boolean(record?.remote_id) && canManageRecord(user, record.organization, record);

const VaultRowActions = ({
  record: row,
  user,
  remoteKey,
  held,
  onPull,
  onConvert,
  onDownload,
  onEdit,
  onDelete,
  onRemove,
}) => {
  const { t } = useTranslation();
  const own = ownOf(row);
  if (!own) {
    const remote = row.held[remoteKey]?.row || null;
    return remote ? <PullAction row={remote} held={held} onPull={onPull} /> : null;
  }
  return (
    <RowMenu label={t('pages.table.actions')}>
      {isSecretKind(own.kind) ? (
        <Dropdown.Item as="button" type="button" data-action="edit" onClick={() => onEdit(own)}>
          {t('certs.actions.edit')}
        </Dropdown.Item>
      ) : (
        <>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="convert"
            onClick={() => onConvert(own)}
          >
            {t('certs.actions.convert')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="download"
            onClick={() => onDownload(own)}
          >
            {t('certs.actions.download')}
          </Dropdown.Item>
        </>
      )}
      <Dropdown.Divider />
      <Dropdown.Item
        as="button"
        type="button"
        className="text-danger"
        data-action="delete"
        onClick={() => onDelete(own)}
      >
        {t('certs.actions.delete')}
      </Dropdown.Item>
      {managesSynced(own, user) ? (
        <Dropdown.Item
          as="button"
          type="button"
          className="text-danger"
          data-action="remove-from"
          onClick={() => onRemove(own)}
        >
          {t('certs.actions.removeFrom', { organization: own.organization })}
        </Dropdown.Item>
      ) : null}
    </RowMenu>
  );
};

VaultRowActions.propTypes = {
  record: PropTypes.object.isRequired,
  user: PropTypes.object,
  remoteKey: PropTypes.string.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onPull: PropTypes.func.isRequired,
  onConvert: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const KindTiles = ({ records }) => {
  const { t } = useTranslation();
  return (
    <div className="stat-grid stat-grid-3 mb-3" data-panel="vault-tiles">
      {TILE_KINDS.map(kind => {
        const Icon = KIND_ICONS[kind];
        return (
          <StatCard
            key={kind}
            icon={<Icon aria-hidden="true" />}
            count={records.filter(record => record.kind === kind).length}
            label={t(`certs.kind.${kind}`)}
            to={`/certs?kind=${kind}`}
          />
        );
      })}
      <StatCard
        icon={<FaUserSecret aria-hidden="true" />}
        count={records.filter(record => SECRET_KINDS.includes(record.kind)).length}
        label={t('certs.sidebar.secrets')}
        to={SECRETS_ROUTE}
      />
    </div>
  );
};

KindTiles.propTypes = {
  records: PropTypes.array.isRequired,
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
  selection: PropTypes.object.isRequired,
  managed: PropTypes.number.isRequired,
  onAccess: PropTypes.func.isRequired,
};

const useBundleImport = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const [error, setError] = useState('');

  const importBundle = file =>
    file
      .text()
      .then(text => vault.importBundle(text))
      .then(added => {
        if (!added) {
          setError(t('certs.notice.notBundle', { name: file.name }));
          return;
        }
        setError('');
        notify('success', t('certs.notice.imported', { count: added.length }));
      });

  return { importBundle, error };
};

/**
 * The vault at `/certs`: the heading counting the rows, its pane reading
 * the picked state ("N selected", Clear selection and the boxes'
 * Visibility and Status pickers over the picked synced rows the person
 * manages, one PUT a row) while rows are picked, then Add secret, the
 * secret record form opening on the secret kind the route narrows to,
 * Generate, the one Restore backup, the upload zone taking a
 * `*.certs.json` vault backup, the file Export selected writes, a file
 * that is no backup refused on the zone's own line, the Actions split
 * button, its press Sync now under the muted Last synced line and its
 * menu Delete selected, the browser's records of the picked rows behind
 * the typed confirmation, and Export selected, the table or cards toggle
 * and Refresh; one tile a kind linking to the table narrowed to that kind
 * and one Secrets tile for the eight secret kinds; the table of every
 * secret the person reaches, the union by stable id of this browser's
 * records, the serving backend's store and the identity provider's store,
 * narrowed by the navbar binding of `useVaultSearch` under
 * `table_prefs_certs`, with the Org column and one lettered column a
 * remote store whose mark toggles the row's sync there, the select column
 * a real checkbox header, a `#<id>` in the URL landing on that row, each
 * row the browser holds offering in its menu Convert, Download, Delete
 * behind the typed confirmation naming the records linked to it and, on a
 * synced row the person manages, Remove from the organization behind its
 * own, the one verb that sends the DELETE, a secret record's menu
 * offering Edit, the secret record form over the record, in place of
 * Convert and Download, and a row the browser does not hold offering Pull
 * to vault; the cards carry the marks as chips; the expiry threshold the
 * rows' Expiring reads is the Preferences page's Certificates card. Focus
 * lands on the heading once a delete's dialog has gone, and on arrival
 * with `focusHeading` in the location's state, the record page's way
 * after its own delete.
 */
const VaultPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const status = useStatus();
  const notify = useNotify();
  const vault = useVault();
  const actions = useRecordActions();
  const store = useStoreWrites();
  const puller = usePullToVault();
  const stores = useSecretStores({ page: 'vault' });
  const prefsKey = `${context.prefsPrefix}_certs`;
  const [target, setTarget] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('table');
  const thresholdDays = vault.preferences.threshold_days;
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    now: nowOf(),
    thresholdDays,
    sync: { busy: stores.busy, toggle: stores.toggle, settings: stores.settings },
  };
  const columns = [...vaultColumns, ...syncColumnsOf(stores.columnStores)];
  const search = useVaultSearch({
    records: stores.rows,
    columns,
    ctx,
    prefsKey,
    actions: [
      {
        key: 'export-bundle',
        labelKey: 'certs.toolbar.exportBundle',
        icon: FaDownload,
        onRun: () => vault.exportBundle(vault.records),
      },
    ],
  });
  const selection = useSelection(search.rows, { labelOf: nameOf });
  const arrival = useArrival(search.rows);
  const bundle = useBundleImport();

  useEffect(() => {
    document.title = `${t('certs.sidebar.vault')} · ${context.appName}`;
  }, [context.appName, t]);

  const focusHeading = Boolean(location.state?.focusHeading);
  useEffect(() => {
    if (focusHeading && vault.loaded) {
      focusOn(HEADING_ID);
    }
  }, [focusHeading, location.key, vault.loaded]);

  const picked = () => search.rows.filter(row => selection.selected.has(row.id));
  const owned = () => picked().map(ownOf).filter(Boolean);
  const managed = owned().filter(record => managesSynced(record, context.user));

  const removePicked = async () => {
    const records = owned();
    await Promise.all(records.map(record => vault.remove(record)));
    selection.clear();
    notify('success', t('certs.notice.removedMany', { count: records.length }));
  };

  const landOnHeading = () => focusOn(HEADING_ID);

  const setPickedAccess = patch =>
    Promise.all(managed.map(record => store.setAccess(record, patch))).then(selection.clear);

  const addSecret = record =>
    vault.add(record).then(() => {
      setAdding(false);
      notify('success', t('certs.notice.saved'));
    });

  const saveSecret = record =>
    vault.update(editing, record).then(() => {
      setEditing(null);
      notify('success', t('certs.notice.saved'));
    });

  if (!vault.loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const actionsProps = {
    user: context.user,
    remoteKey: status.role || '',
    held: puller.held,
    onPull: puller.pull,
    onConvert: actions.convert,
    onDownload: actions.download,
    onEdit: setEditing,
    onDelete: setTarget,
    onRemove: setRemoving,
  };

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
      <Link to="/certs/generate" className="btn btn-sm btn-outline-primary" data-action="generate">
        <FaWandMagicSparkles className="me-1" aria-hidden="true" />
        {t('certs.vault.generate')}
      </Link>
      <UploadZone
        uploading={false}
        progress={0}
        accept=".json"
        dropText={t('certs.vault.dropBundle')}
        uploadingText={t('certs.input.reading')}
        onFile={bundle.importBundle}
        error={bundle.error}
      />
      <SecretsActions
        lastSynced={stores.lastSynced}
        busy={stores.busy}
        onSync={() => stores.syncNow(selection.someSelected ? picked() : search.rows)}
        items={[
          {
            action: 'delete-selected',
            labelKey: 'certs.stores.deleteSelected',
            onClick: () => setDeleting(true),
            disabled: owned().length === 0,
          },
          {
            action: 'export-selected',
            labelKey: 'certs.stores.exportSelected',
            onClick: () => vault.exportBundle(picked().map(row => ownOf(row) || row.record)),
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

  return (
    <div className="list row" data-page="certs-vault">
      <SectionHeading
        id={HEADING_ID}
        title={t('certs.vault.title')}
        count={stores.rows.length}
        actions={headingActions}
      />
      <KindTiles records={vault.records} />
      <div data-view={view}>
        {view === 'cards' ? (
          <RowCards
            name="certs-vault-cards"
            rows={search.rows}
            columns={[...vaultColumns, syncChipsColumnOf(stores.columnStores)]}
            rowKey={recordKey}
            rowProp="record"
            ctx={ctx}
            RowActions={VaultRowActions}
            actionsProps={actionsProps}
            emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
          />
        ) : (
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={recordKey}
            rowRef={arrival.ref}
            rowProp="record"
            RowActions={VaultRowActions}
            actionsProps={actionsProps}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            widths={search.widths}
            onResize={search.setColumnWidth}
            ctx={ctx}
            emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
            emptyBody={t(search.filtering ? 'pages.noMatchesBody' : 'pages.emptyBody')}
            selection={selection.subtable}
          />
        )}
      </div>
      <VaultTreeDialogs
        target={target}
        records={vault.records}
        onClose={() => setTarget(null)}
        onRemove={record => {
          actions.remove(record);
          setTarget(null);
        }}
        onConfirmed={landOnHeading}
      />
      <ConfirmModal
        show={deleting}
        handleClose={() => setDeleting(false)}
        handleConfirm={removePicked}
        onConfirmed={landOnHeading}
        title={t('certs.confirm.deleteTitle')}
        message={t('certs.confirm.deleteManyMessage', { count: owned().length })}
      />
      {adding ? (
        <SecretRecordModal
          kind={secretKindOf(searchParams)}
          onSave={addSecret}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? (
        <SecretRecordModal record={editing} onSave={saveSecret} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={() => store.removeFromStore(removing)}
        title={t('certs.confirm.removeFromTitle', { organization: removing?.organization || '' })}
        message={t('certs.confirm.removeFromMessage', {
          name: removing ? nameOf(removing) : '',
          organization: removing?.organization || '',
        })}
        keyword="remove"
        confirmText={t('certs.actions.removeFrom', { organization: removing?.organization || '' })}
      />
    </div>
  );
};

VaultPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default VaultPage;
