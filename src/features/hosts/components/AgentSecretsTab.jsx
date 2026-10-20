import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPenToSquare, FaRotate, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import {
  DETACHED,
  PullAction,
  STORE_COLUMNS,
  SecretRecordModal,
  SecretsActions,
  isSecretKind,
  matchesStoreRow,
  nowOf,
  recordOf,
  rowOf,
  storeFilterGroupsOf,
  syncChipsColumnOf,
  syncColumnsOf,
  usePullToVault,
  useSecretStores,
  useVault,
} from '../../certs';
import { createHostCert, removeHostCert, updateHostCert } from '../api/agentSettings';
import { tableOf, useHostManageSearch } from '../hooks/useHostManageSearch';
import { useHostSecrets } from '../hooks/useHostSecrets';
import { sectionTitle } from '../pages';
import { hostLabel, isServerRole } from '../utils/hosts';

import ManageTable from './ManageTable';
import { RowCards } from './PickDialogParts';
import SecretOpeners from './SecretOpeners';
import TaskDialog from './TaskDialog';

const rowKey = row => String(row.id);

const rowNameOf = row => row.name;

const emptyKeyOf = (reading, filtering) => {
  if (!reading.loaded) {
    return 'pages.loading';
  }
  if (reading.failed) {
    return 'hosts.overview.readError';
  }
  return filtering ? 'pages.noMatches' : 'agentSettings.agentSecretsTab.noRows';
};

const hostedBody = record => rowOf({ ...record, ...DETACHED }, '');

const countOf = ({ selection, loaded, shown, t }) => {
  if (selection.someSelected) {
    return t('pages.bulk.selected', { count: selection.selected.size });
  }
  return loaded ? shown : null;
};

const StoreRowActions = ({ row, hostKey, busy, held, onEdit, onPull, onRemove }) => {
  const { t } = useTranslation();
  const own = row.held[hostKey]?.row || null;
  return (
    <span className="d-inline-flex align-items-center gap-1" data-secret-kind={row.kind}>
      {own && isSecretKind(row.kind) ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={t('agentSettings.agentSecretsTab.edit')}
          aria-label={t('agentSettings.agentSecretsTab.edit')}
          data-action="secret-edit"
          disabled={busy}
          onClick={() => onEdit(own)}
        >
          <FaPenToSquare aria-hidden="true" />
        </button>
      ) : null}
      {own && !isSecretKind(row.kind) ? <PullAction row={own} held={held} onPull={onPull} /> : null}
      {own ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title={t('agentSettings.agentSecretsTab.remove')}
          aria-label={t('agentSettings.agentSecretsTab.remove')}
          data-action="secret-remove"
          disabled={busy}
          onClick={() => onRemove(own)}
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
};

StoreRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  hostKey: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onEdit: PropTypes.func.isRequired,
  onPull: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Secrets page's body of a host, behind the host's `certs-store`
 * token: one heading row, the section's title counting the rows the
 * navbar search leaves, with Add, the Actions split button, its press
 * Sync now under the muted Last synced line and its menu Delete selected
 * and Export selected, the table or cards toggle and Reload in its pane,
 * over every secret the person reaches, the union by stable id of the
 * host's own store, `GET certs`, the serving backend's store where the
 * host is not the serving backend, the identity provider's store and
 * this browser's Vault, in the store's columns, the Org column and one
 * lettered column a store whose mark toggles the row's sync there, the
 * select column first, the cards carrying the marks as chips, the navbar
 * search carrying the query, the Kind, Status, Visibility and Organization
 * groups and the Columns group. Add opens the secret record form and
 * writes `POST certs`; a row the host holds offers Edit on a secret,
 * the form over the row's record writing `PUT certs/{id}`, Pull to vault
 * on a certificate, and Remove behind the confirmation writing
 * `DELETE certs/{id}`; Delete selected removes the picked rows the host
 * holds behind the typed confirmation, one `DELETE certs/{id}` a row and
 * one notice naming the count; Export selected downloads the picked rows'
 * records as one vault backup. The rows read once as the page draws,
 * again when the stream opens fresh or answers `reset`, after every
 * write, and on Reload.
 */
const AgentSecretsTab = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const vault = useVault();
  const served = !isServerRole(status);
  const puller = usePullToVault(!served);
  const store = useHostSecrets({ id, every: true });
  const hostKey = served ? status.role || 'host' : `host-${id}`;
  const stores = useSecretStores({
    page: 'host',
    host: {
      key: hostKey,
      name: server ? hostLabel(server) : status.hostname || id,
      rows: store.rows,
      loaded: store.reading.loaded,
      served,
      create: record => createHostCert(status, id, hostedBody(record)),
      update: (row, record) => updateHostCert(status, id, row.id, hostedBody(record)),
      remove: row => removeHostCert(status, id, row.id),
      refresh: store.reading.refresh,
    },
  });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState('table');
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    now: nowOf(),
    thresholdDays: vault.preferences.threshold_days,
    sync: { busy: stores.busy, toggle: stores.toggle, settings: stores.settings },
  };
  const columns = [...STORE_COLUMNS, ...syncColumnsOf(stores.columnStores)];
  const search = useHostManageSearch({
    section,
    tables: {
      secrets: tableOf({
        key: 'secrets',
        labelKey: 'hosts.nav.secrets',
        rows: stores.rows,
        columns,
        matches: matchesStoreRow,
        filterGroups: storeFilterGroupsOf(ctx),
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'certs.search.sharedPlaceholder',
  });
  const table = search.tables.secrets;
  const selection = useSelection(table.rows, { labelOf: rowNameOf });
  const picked = table.rows.filter(row => selection.selected.has(row.id));
  const hostPicked = picked.filter(row => row.held[hostKey]);
  const busy = store.busy || stores.busy;
  const actionsProps = {
    hostKey,
    busy,
    held: puller.held,
    onEdit: setEditing,
    onPull: puller.pull,
    onRemove: setRemoving,
  };

  const deletePicked = async () => {
    const answers = await Promise.all(
      hostPicked.map(row =>
        removeHostCert(status, id, row.held[hostKey].row.id).then(
          () => true,
          () => false
        )
      )
    );
    selection.clear();
    notify('success', t('certs.stores.deletedMany', { count: answers.filter(Boolean).length }));
    stores.refresh();
  };

  const actions = (
    <>
      <SecretOpeners busy={busy} onAdd={store.add} />
      <SecretsActions
        lastSynced={stores.lastSynced}
        busy={busy}
        onSync={() => stores.syncNow(picked.length > 0 ? picked : table.rows)}
        items={[
          {
            action: 'delete-selected',
            labelKey: 'certs.stores.deleteSelected',
            onClick: () => setDeleting(true),
            disabled: hostPicked.length === 0,
          },
          {
            action: 'export-selected',
            labelKey: 'certs.stores.exportSelected',
            onClick: () => vault.exportBundle(picked.map(row => row.record)),
            disabled: picked.length === 0,
          },
        ]}
      />
      <ViewToggle view={view} onChange={setView} />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="secrets-reload"
        onClick={onRefresh}
        disabled={busy}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.reloadButton')}
      </button>
    </>
  );

  return (
    <div data-panel="secrets">
      <SectionHeading
        title={sectionTitle(section, server, '', t)}
        count={countOf({ selection, loaded: stores.loaded, shown: table.rows.length, t })}
        actions={actions}
      />
      {store.reading.failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="secrets-failed">
          {t('agentSettings.agentSecretsTab.failedLoadSecrets', { message: store.reading.message })}
        </div>
      ) : null}
      <div data-view={view}>
        {view === 'cards' ? (
          <RowCards
            name="secrets-cards"
            rows={table.rows}
            columns={[...STORE_COLUMNS, syncChipsColumnOf(stores.columnStores)]}
            rowKey={rowKey}
            ctx={ctx}
            RowActions={StoreRowActions}
            actionsProps={actionsProps}
            emptyText={t(emptyKeyOf(store.reading, search.filtering))}
          />
        ) : (
          <ManageTable
            name="secrets"
            columns={columns}
            table={table}
            rowKey={rowKey}
            RowActions={StoreRowActions}
            actionsProps={actionsProps}
            selection={selection.subtable}
            ctx={ctx}
            emptyKey="agentSettings.agentSecretsTab.noRows"
            reading={store.reading}
            filtering={search.filtering}
          />
        )}
      </div>
      {editing ? (
        <SecretRecordModal
          record={recordOf(editing)}
          busy={store.busy}
          onSave={record =>
            store.save(editing, record).then(row => {
              if (row) {
                setEditing(null);
              }
            })
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={() => store.remove(removing)}
        title={t('agentSettings.agentSecretsTab.removeTitle')}
        message={t('agentSettings.agentSecretsTab.removeMessage', { name: removing?.name || '' })}
        confirmText={t('agentSettings.agentSecretsTab.remove')}
      />
      <ConfirmModal
        show={deleting}
        handleClose={() => setDeleting(false)}
        handleConfirm={deletePicked}
        title={t('certs.stores.deleteSelected')}
        message={t('certs.stores.deleteManyMessage', { count: hostPicked.length })}
        keyword="delete"
        confirmText={t('certs.stores.deleteSelected')}
      />
      {store.task ? (
        <TaskDialog status={status} id={id} task={store.task.row} onHide={store.closeTask} />
      ) : null}
    </div>
  );
};

AgentSecretsTab.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default AgentSecretsTab;
