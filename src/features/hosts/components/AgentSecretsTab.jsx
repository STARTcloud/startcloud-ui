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
  SECRET_STORE_COLUMNS,
  SECRET_STORE_FILTERS,
  SecretRecordModal,
  matchesStoreRow,
  nowOf,
  recordOf,
} from '../../certs';
import { tableOf, useHostManageSearch } from '../hooks/useHostManageSearch';
import { useHostSecrets } from '../hooks/useHostSecrets';
import { sectionTitle } from '../pages';

import ManageTable from './ManageTable';
import { RowCards } from './PickDialogParts';
import SecretOpeners from './SecretOpeners';
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

const SecretRowActions = ({ row, busy, onEdit, onRemove }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-secret-kind={row.kind}>
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

SecretRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The Secrets page's body of a host, behind the host's `certs-store` token:
 * one heading row, the section's title counting the rows the navbar search
 * leaves, with Add, Copy from Vault, Reload and the table or cards toggle in
 * its pane, over the secret rows of the host's own store, `GET certs`, in the
 * Vault's columns, the navbar search carrying the query, the Kind and Profile
 * groups and the Columns group. Add opens the secret record form and writes
 * `POST certs`, Copy from Vault writes a record of the browser's vault the
 * same way, Reload is `onRefresh`, and on each row Edit, the form over the
 * row's record writing `PUT certs/{id}`, and Remove behind the typed
 * confirmation writing `DELETE certs/{id}`; every write one request and one
 * notice, the rows read again after it. The rows read once as the page
 * draws, again when the stream opens fresh or answers `reset`, and on Reload.
 */
const AgentSecretsTab = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const store = useHostSecrets({ id });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [view, setView] = useState('table');
  const ctx = { ...context, t, language: i18n.language, now: nowOf(), thresholdDays: 0 };
  const search = useHostManageSearch({
    section,
    tables: {
      secrets: tableOf({
        key: 'secrets',
        labelKey: 'hosts.nav.secrets',
        rows: store.rows,
        columns: SECRET_STORE_COLUMNS,
        matches: matchesStoreRow,
        filterGroups: SECRET_STORE_FILTERS,
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'certs.search.sharedPlaceholder',
  });
  const table = search.tables.secrets;
  const actionsProps = { busy: store.busy, onEdit: setEditing, onRemove: setRemoving };
  const actions = (
    <>
      <SecretOpeners
        busy={store.busy}
        prefsKey={`${context.prefsPrefix}_agent_secrets_vault`}
        onAdd={store.add}
        onCopy={store.copy}
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
            columns={SECRET_STORE_COLUMNS}
            rowKey={rowKey}
            ctx={ctx}
            RowActions={SecretRowActions}
            actionsProps={actionsProps}
            emptyText={t(emptyKeyOf(store.reading, search.filtering))}
          />
        ) : (
          <ManageTable
            name="secrets"
            columns={SECRET_STORE_COLUMNS}
            table={table}
            rowKey={rowKey}
            RowActions={SecretRowActions}
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
