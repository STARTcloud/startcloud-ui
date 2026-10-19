import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPenToSquare, FaRotate, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import ViewToggle from '../../../components/common/ViewToggle';
import { useStatus } from '../../../contexts/StatusContext';
import { pageContextShape } from '../../../utils/itemShape';
import {
  PullAction,
  STORE_COLUMNS,
  SecretRecordModal,
  isSecretKind,
  matchesStoreRow,
  nowOf,
  recordOf,
  storeFilterGroupsOf,
  usePullToVault,
  useVault,
} from '../../certs';
import { tableOf, useHostManageSearch } from '../hooks/useHostManageSearch';
import { useHostSecrets } from '../hooks/useHostSecrets';
import { sectionTitle } from '../pages';
import { isServerRole } from '../utils/hosts';

import ManageTable from './ManageTable';
import { RowCards } from './PickDialogParts';
import SecretOpeners from './SecretOpeners';
import { pickHostOf } from './SecretPickModal';
import TaskDialog from './TaskDialog';

const rowKey = row => String(row.id);

const emptyKeyOf = (reading, filtering) => {
  if (!reading.loaded) {
    return 'pages.loading';
  }
  if (reading.failed) {
    return 'hosts.overview.readError';
  }
  return filtering ? 'pages.noMatches' : 'agentSettings.agentSecretsTab.noRows';
};

const StoreRowActions = ({ row, busy, held, onEdit, onPull, onRemove }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-secret-kind={row.kind}>
      {isSecretKind(row.kind) ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={t('agentSettings.agentSecretsTab.edit')}
          aria-label={t('agentSettings.agentSecretsTab.edit')}
          data-action="secret-edit"
          disabled={busy}
          onClick={() => onEdit(row)}
        >
          <FaPenToSquare aria-hidden="true" />
        </button>
      ) : (
        <PullAction row={row} held={held} onPull={onPull} />
      )}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('agentSettings.agentSecretsTab.remove')}
        aria-label={t('agentSettings.agentSecretsTab.remove')}
        data-action="secret-remove"
        disabled={busy}
        onClick={() => onRemove(row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

StoreRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onEdit: PropTypes.func.isRequired,
  onPull: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Secrets page's body of a host, behind the host's `certs-store` token:
 * one heading row, the section's title counting the rows the navbar search
 * leaves, with Add, Pick secret, Reload and the table or cards toggle in
 * its pane, over every row of the host's own store, all fourteen kinds,
 * `GET certs`, in the store's columns, the navbar search carrying the
 * query, the Kind, Status, Visibility and Organization groups and the
 * Columns group, so the Kind pills narrow to secrets or certificates. Add
 * opens the secret record form and writes `POST certs`, Pick secret opens
 * the Pick secret dialog, a row picked from the Vault or the serving
 * backend's store written the same way, Reload is `onRefresh`; a secret
 * row offers Edit, the form over the row's record writing
 * `PUT certs/{id}`, a certificate row Pull to vault, a local record on
 * the server role where the mirror does not reach the agent's store, and
 * every row Remove
 * behind the confirmation writing `DELETE certs/{id}`; every write one
 * request and one notice, the rows read again after it. The rows read
 * once as the page draws, again when the stream opens fresh or answers
 * `reset`, and on Reload.
 */
const AgentSecretsTab = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const vault = useVault();
  const puller = usePullToVault(isServerRole(status));
  const store = useHostSecrets({ id, every: true });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [view, setView] = useState('table');
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    now: nowOf(),
    thresholdDays: vault.preferences.threshold_days,
  };
  const search = useHostManageSearch({
    section,
    tables: {
      secrets: tableOf({
        key: 'secrets',
        labelKey: 'hosts.nav.secrets',
        rows: store.rows,
        columns: STORE_COLUMNS,
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
  const actionsProps = {
    busy: store.busy,
    held: puller.held,
    onEdit: setEditing,
    onPull: puller.pull,
    onRemove: setRemoving,
  };
  const actions = (
    <>
      <SecretOpeners
        busy={store.busy}
        host={pickHostOf(store, status, server, id)}
        onAdd={store.add}
        onPick={store.copy}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="secrets-reload"
        onClick={onRefresh}
        disabled={store.busy}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.reloadButton')}
      </button>
      <ViewToggle view={view} onChange={setView} />
    </>
  );

  return (
    <div data-panel="secrets">
      <SectionHeading
        title={sectionTitle(section, server, '', t)}
        count={store.reading.loaded ? table.rows.length : null}
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
            columns={STORE_COLUMNS}
            rowKey={rowKey}
            ctx={ctx}
            RowActions={StoreRowActions}
            actionsProps={actionsProps}
            emptyText={t(emptyKeyOf(store.reading, search.filtering))}
          />
        ) : (
          <ManageTable
            name="secrets"
            columns={STORE_COLUMNS}
            table={table}
            rowKey={rowKey}
            RowActions={StoreRowActions}
            actionsProps={actionsProps}
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
