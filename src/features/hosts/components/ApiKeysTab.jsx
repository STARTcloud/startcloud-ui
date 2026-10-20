import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaKey, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import CopyButton from '../../../components/common/CopyButton';
import SectionHeading from '../../../components/common/SectionHeading';
import SplitButton from '../../../components/common/SplitButton';
import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { dayOf } from '../../../hooks/useClientFilters';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { bootstrapApiKey, deleteApiKey, generateApiKey, getApiKeys } from '../api/apiKeyAPI';
import { useManageRead, useManageSend } from '../hooks/useHostManage';
import { apiKeysOf } from '../utils/agentSettings';
import { formatTaskDate } from '../utils/tasks';

import ToolFormDialog from './ToolFormDialog';

const PREFS_KEY = 'table_prefs_api_keys';

const DEFAULT_SORT = [{ column: 'created_at', direction: 'desc' }];

const keyIdOf = row => String(row.id);

const keyNameOf = row => row.name;

const matches = (row, needle) =>
  [row.name || '', row.description || ''].some(text => text.toLowerCase().includes(needle));

const emptyKeyOf = (loaded, filtering) => {
  if (!loaded) {
    return 'accounts.apiKeysTab.loadingKeys';
  }
  return filtering ? 'pages.noMatches' : 'pages.empty';
};

const FILTER_GROUPS = [
  {
    key: 'active',
    labelKey: 'accounts.apiKeysTab.columnActive',
    values: row => (row.is_active ? ['active'] : []),
    activeClass: 'bg-info',
    labelFor: (value, t) =>
      t(value === 'active' ? 'accounts.apiKeysTab.statusYes' : 'accounts.apiKeysTab.statusNo'),
  },
  {
    kind: 'date-range',
    key: 'last_used',
    labelKey: 'accounts.apiKeysTab.columnLastUsed',
    values: row => [dayOf(row.last_used)],
  },
  {
    kind: 'date-range',
    key: 'created_at',
    labelKey: 'accounts.apiKeysTab.columnCreatedAt',
    values: row => [dayOf(row.created_at)],
  },
];

const COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'accounts.apiKeysTab.columnName',
    value: row => row.name,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'accounts.apiKeysTab.columnDescription',
    value: row => row.description || '',
  },
  {
    key: 'active',
    kind: 'badge',
    labelKey: 'accounts.apiKeysTab.columnActive',
    value: row => (row.is_active ? 1 : 0),
    render: (row, ctx) => (
      <span className={`badge ${row.is_active ? 'text-bg-success' : 'text-bg-danger'}`}>
        {ctx.t(row.is_active ? 'accounts.apiKeysTab.statusYes' : 'accounts.apiKeysTab.statusNo')}
      </span>
    ),
  },
  {
    key: 'last_used',
    kind: 'date',
    labelKey: 'accounts.apiKeysTab.columnLastUsed',
    value: row => new Date(row.last_used || 0).getTime(),
    render: (row, ctx) =>
      row.last_used ? formatTaskDate(row.last_used) : ctx.t('accounts.apiKeysTab.never'),
  },
  {
    key: 'created_at',
    kind: 'date',
    labelKey: 'accounts.apiKeysTab.columnCreatedAt',
    value: row => new Date(row.created_at || 0).getTime(),
    render: row => formatTaskDate(row.created_at),
  },
];

const KeyActions = ({ apiKey, busy, onDelete }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      data-action="delete"
      onClick={() => onDelete(apiKey.id)}
      disabled={busy}
    >
      <FaTrash className="me-2" aria-hidden="true" />
      {t('accounts.apiKeysTab.deleteKeyTableButton')}
    </button>
  );
};

KeyActions.propTypes = {
  apiKey: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) })
    .isRequired,
  busy: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const PickedKeys = ({ selection, busy, onDelete }) => {
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
        className="btn btn-sm btn-outline-danger"
        data-action="bulk-delete"
        onClick={onDelete}
        disabled={busy}
      >
        <FaTrash className="me-1" aria-hidden="true" />
        {t('accounts.apiKeysTab.deleteSelected')}
      </button>
    </>
  );
};

PickedKeys.propTypes = {
  selection: PropTypes.shape({
    someSelected: PropTypes.bool.isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
    clear: PropTypes.func.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const GeneratedKeyModal = ({ apiKey, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('accounts.apiKeysTab.keyGeneratedTitle')}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="generated-key">
        <div className="alert alert-warning" role="alert">
          <strong>{t('accounts.apiKeysTab.importantLabel')}:</strong>{' '}
          {t('accounts.apiKeysTab.copyKeyWarning')}
        </div>
        <div className="mb-3">
          <label htmlFor="generated-api-key" className="form-label">
            {t('accounts.apiKeysTab.yourApiKeyLabel')}
          </label>
          <textarea
            id="generated-api-key"
            className="form-control font-monospace"
            value={apiKey}
            readOnly
            rows="3"
            onClick={event => event.target.select()}
          />
        </div>
        <CopyButton
          text={apiKey}
          label={t('accounts.apiKeysTab.copyToClipboardButton')}
          className="btn btn-primary"
        />
      </Modal.Body>
    </Modal>
  );
};

GeneratedKeyModal.propTypes = {
  apiKey: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

const NO_FORM = { name: '', description: '' };

const GenerateKeyDialog = ({ busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(NO_FORM);
  return (
    <ToolFormDialog
      dialog="api-key-generate"
      title={t('accounts.apiKeysTab.generateKeyButton')}
      submitKey="accounts.apiKeysTab.generateKeyButton"
      disabled={!form.name.trim()}
      dirty={Boolean(form.name || form.description)}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit(form)}
    >
      <div className="mb-3">
        <label htmlFor="api-key-name" className="form-label">
          {t('accounts.apiKeysTab.labelName')}
        </label>
        <input
          id="api-key-name"
          className="form-control"
          type="text"
          value={form.name}
          onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
          placeholder={t('accounts.apiKeysTab.namePlaceholder')}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="api-key-description" className="form-label">
          {t('accounts.apiKeysTab.labelDescription')}
        </label>
        <input
          id="api-key-description"
          className="form-control"
          type="text"
          value={form.description}
          onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
          placeholder={t('accounts.apiKeysTab.descriptionPlaceholder')}
        />
      </div>
    </ToolFormDialog>
  );
};

GenerateKeyDialog.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The API keys of a host under the API keys page's one heading: `title`,
 * the count of the keys once read, and in its pane the split Generate key,
 * which opens the form dialog of the name and the description sent as
 * `POST api-keys/generate`, with Generate bootstrap key in its menu,
 * `POST api-keys/bootstrap`, then `actions`; the one-time key drawn in a
 * list dialog with Copy; under the heading the keys of `GET api-keys` in
 * the one table with its select column, each with Delete behind the typed
 * confirmation, `DELETE api-keys/{id}`, and while rows are picked the
 * pane draws "N selected", Clear selection and Delete selected first,
 * behind the typed confirmation, one `DELETE api-keys/{id}` a picked key
 * and one notice naming the count. Every write is one notice, the
 * keys read again once after a success; the list reads once as the page
 * draws, again when the stream opens fresh or answers `reset` and on the
 * page's Refresh. The navbar search is bound over the key's name and
 * description, with the Active `toggle` group and the Last used and
 * Created `date-range` groups narrowing the rows client-side, and the
 * Columns group, the sort, hidden columns and widths under
 * `table_prefs_api_keys` through `useDetailSearch`.
 */
const ApiKeysTab = ({ id, title, actions = null }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const keys = useManageRead(
    useCallback(() => getApiKeys(status, id), [status, id]),
    true
  );
  const { send, busy } = useManageSend(id);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [deleting, setDeleting] = useState(null);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  const rows = useMemo(() => apiKeysOf(keys.data), [keys.data]);
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'accounts.apiKeysTab.search',
    columns: COLUMNS,
    ctx,
    prefsKey: PREFS_KEY,
    filterGroups: FILTER_GROUPS,
    defaultSort: DEFAULT_SORT,
  });
  const selection = useSelection(search.rows, { keyOf: keyIdOf, labelOf: keyNameOf });
  const [deletingMany, setDeletingMany] = useState(false);

  const generate = async form => {
    const { answer, error } = await send({
      call: () => generateApiKey(status, id, form.name.trim(), form.description),
      doneKey: 'accounts.apiKeysTab.keyGeneratedMessage',
    });
    if (!error) {
      setGenerating(false);
      setGenerated(String(answer?.api_key || ''));
      keys.refresh();
    }
  };

  const bootstrap = async () => {
    const { answer, error } = await send({
      call: () => bootstrapApiKey(status, id),
      doneKey: 'accounts.apiKeysTab.bootstrapKeyGeneratedMessage',
    });
    if (!error) {
      setGenerated(String(answer?.api_key || ''));
      keys.refresh();
    }
  };

  const remove = async () => {
    const keyId = deleting;
    setDeleting(null);
    const { error } = await send({
      call: () => deleteApiKey(status, id, keyId),
      doneKey: 'accounts.apiKeysTab.keyDeletedMessage',
    });
    if (!error) {
      keys.refresh();
    }
  };

  const removeMany = async () => {
    const ids = search.rows.filter(row => selection.selected.has(keyIdOf(row))).map(row => row.id);
    const { error } = await send({
      call: () => Promise.all(ids.map(keyId => deleteApiKey(status, id, keyId))),
      doneKey: 'accounts.apiKeysTab.deletedMany',
      values: { count: ids.length },
    });
    if (!error) {
      selection.clear();
    }
    keys.refresh();
  };

  const pane = (
    <>
      <PickedKeys selection={selection} busy={busy} onDelete={() => setDeletingMany(true)} />
      <SplitButton
        action="api-key-generate"
        labelKey="accounts.apiKeysTab.generateKeyButton"
        icon={FaKey}
        onClick={() => setGenerating(true)}
        menuAction="api-key-generate-menu"
        menuLabelKey="accounts.apiKeysTab.generateOptions"
        items={[
          {
            action: 'api-key-bootstrap',
            labelKey: 'accounts.apiKeysTab.generateBootstrapKeyButton',
            onClick: bootstrap,
          },
        ]}
        busy={busy}
      />
      {actions}
    </>
  );

  return (
    <div data-panel="api-keys">
      <SectionHeading title={title} count={keys.loaded ? rows.length : null} actions={pane} />
      {keys.failed ? (
        <div className="alert alert-danger" role="alert" data-note="api-keys-failed">
          {keys.message}
        </div>
      ) : null}
      <SubTable
        columns={COLUMNS}
        rows={search.rows}
        rowKey={keyIdOf}
        rowProp="apiKey"
        RowActions={KeyActions}
        actionsProps={{ busy, onDelete: setDeleting }}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t(emptyKeyOf(keys.loaded, search.filtering))}
        selection={selection.subtable}
      />
      {generating ? (
        <GenerateKeyDialog busy={busy} onClose={() => setGenerating(false)} onSubmit={generate} />
      ) : null}
      {generated ? <GeneratedKeyModal apiKey={generated} onClose={() => setGenerated('')} /> : null}
      <ConfirmModal
        show={deleting !== null}
        handleClose={() => setDeleting(null)}
        handleConfirm={remove}
        title={t('accounts.apiKeysTab.deleteKeyTitle')}
        message={t('accounts.apiKeysTab.deleteKeyMessage')}
        confirmText={t('accounts.apiKeysTab.deleteKeyButton')}
        variant="delete"
      />
      <ConfirmModal
        show={deletingMany}
        handleClose={() => setDeletingMany(false)}
        handleConfirm={removeMany}
        title={t('accounts.apiKeysTab.deleteSelected')}
        message={t('accounts.apiKeysTab.deleteManyMessage', { count: selection.selected.size })}
        confirmText={t('accounts.apiKeysTab.deleteSelected')}
        variant="delete"
      />
    </div>
  );
};

ApiKeysTab.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default ApiKeysTab;
