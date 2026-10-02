import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaCodeBranch, FaCubes, FaFileImport, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import {
  deleteProvisioner,
  deleteProvisionerVersion,
  importProvisioner,
  installFromCatalog,
  refreshProvisionerFromSource,
} from '../api/provisioning';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import {
  IMPORT_FORM,
  IMPORT_SOURCES,
  TABLE_STATE_KEYS,
  importBody,
  importProblem,
  installedKeysOf,
  referencingMachinesOf,
  secretNamesOf,
  tableStateOf,
  updateFor,
} from '../utils/manageCatalog';

import CatalogBrowseModal from './CatalogBrowseModal';
import { DialogTable } from './ManageTable';
import { PathInput } from './PathPicker';
import TaskDialog from './TaskDialog';
import ToolFormDialog from './ToolFormDialog';

const rowKey = row => row.name;

/**
 * The columns of the provisioners table, hyperweaver-ui's family card as
 * a row: the family by its label with its slug beside it, the invalid
 * and the update badges, the count of its versions, its description and
 * its source.
 */
export const PROVISIONER_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.provisionerManagement.name',
    value: row => row.metadata?.label || row.name || '',
    render: (row, ctx) => {
      const update = updateFor(row, ctx.newest);
      return (
        <span>
          <FaCubes className="me-2" aria-hidden="true" />
          <strong>{row.metadata?.label || row.name}</strong>
          {row.metadata?.label ? <code className="small text-muted ms-2">{row.name}</code> : null}
          {row.valid === false ? (
            <span className="badge text-bg-danger ms-2" data-note="invalid">
              {ctx.t('host.provisionerManagement.invalid')}
            </span>
          ) : null}
          {update ? (
            <span className="badge text-bg-warning ms-2" data-note="update-available">
              {ctx.t('host.provisionerManagement.updateAvailable', { version: update })}
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: 'versions',
    kind: 'count',
    labelKey: 'host.provisionerManagement.version',
    value: row => (Array.isArray(row.versions) ? row.versions.length : 0),
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'host.provisionerManagement.description',
    priority: 5,
    prose: true,
    value: row => row.description || '',
    render: row => <span className="small">{row.description || '-'}</span>,
  },
  {
    key: 'source',
    kind: 'word',
    labelKey: 'host.provisionerManagement.source',
    priority: 4,
    value: row => row.source?.source_type || '',
    render: row => row.source?.source_type || '-',
  },
];

const VERSION_COLUMNS = [
  {
    key: 'version',
    kind: 'name',
    labelKey: 'host.provisionerManagement.version',
    value: row => row.version || '',
    render: row => <code className="small">{row.version}</code>,
  },
  {
    key: 'name',
    kind: 'text',
    labelKey: 'host.provisionerManagement.name',
    value: row => row.name || '',
    render: row => row.name || '-',
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'host.provisionerManagement.description',
    prose: true,
    value: row => row.description || '',
    render: row => <span className="small">{row.description || '-'}</span>,
  },
];

const ProvisionerRowActions = ({ row, ctx, busy, onAction }) => {
  const { t } = useTranslation();
  const update = updateFor(row, ctx.newest);
  const git = row.source?.source_type === 'git';
  return (
    <span className="d-inline-flex align-items-center gap-1" data-provisioner={row.name}>
      {update ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="update"
          title={t('host.provisionerManagement.updateToTitle')}
          onClick={() => onAction('update', row, update)}
          disabled={busy}
        >
          <FaCloudArrowDown className="me-1" aria-hidden="true" />
          {t('host.provisionerManagement.updateTo', { version: update })}
        </button>
      ) : null}
      {git ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          data-action="refresh-source"
          title={
            row.source.token_name
              ? t('host.provisionerManagement.reimportFromWithKey', {
                  url: row.source.url,
                  key: row.source.token_name,
                })
              : t('host.provisionerManagement.reimportFrom', { url: row.source.url })
          }
          onClick={() => onAction('refresh-source', row)}
          disabled={busy}
        >
          <FaCodeBranch className="me-1" aria-hidden="true" />
          {t('host.provisionerManagement.updateFromSource')}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-danger"
        data-action="delete-family"
        title={t('host.provisionerManagement.deleteFamily')}
        aria-label={t('host.provisionerManagement.deleteFamily')}
        onClick={() => onAction('delete-family', row)}
        disabled={busy}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

ProvisionerRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.shape({ newest: PropTypes.object.isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const VersionsToggle = ({ row, ctx }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action="versions"
      aria-expanded={ctx.open.has(row.name)}
      onClick={() => ctx.toggleOpen(row)}
    >
      {t('host.provisionerManagement.version')}
    </button>
  );
};

VersionsToggle.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  ctx: PropTypes.shape({
    open: PropTypes.instanceOf(Set).isRequired,
    toggleOpen: PropTypes.func.isRequired,
  }).isRequired,
};

const VersionRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      data-action="delete-version"
      title={t('host.provisionerManagement.deleteVersionTitle')}
      aria-label={t('host.provisionerManagement.deleteVersionTitle')}
      onClick={() => onAction('delete-version', row)}
      disabled={busy}
    >
      <FaTrash aria-hidden="true" />
    </button>
  );
};

VersionRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const VersionsDetail = ({ row, ctx, busy, onAction }) => {
  const { t } = useTranslation();
  const rows = (Array.isArray(row.versions) ? row.versions : []).map(version => ({
    ...version,
    family: row.name,
  }));
  return (
    <DialogTable
      name={`versions-${row.name}`}
      columns={VERSION_COLUMNS}
      rows={rows}
      rowKey={version => version.dir || version.version}
      RowActions={VersionRowActions}
      actionsProps={{ busy, onAction }}
      ctx={ctx}
      emptyText={t('host.provisionerManagement.noVersionsPublished')}
    />
  );
};

VersionsDetail.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const ImportModal = ({ id, server, gitKeyNames, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(IMPORT_FORM);
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const submit = () => {
    const why = importProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(importBody(form));
    }
  };
  return (
    <ToolFormDialog
      dialog="provisioner-import"
      title={t('host.provisionerManagement.importProvisioner')}
      submitKey="host.provisionerManagement.importSubmit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="import-source-type">
          {t('host.provisionerManagement.source')}
        </label>
        <select
          id="import-source-type"
          className="form-select"
          value={form.sourceType}
          onChange={event => patch({ sourceType: event.target.value })}
          disabled={busy}
        >
          {IMPORT_SOURCES.map(kind => (
            <option key={kind} value={kind}>
              {t(`host.provisionerManagement.source${kind[0].toUpperCase()}${kind.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>
      {form.sourceType === 'git' ? (
        <>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-url">
              {t('host.provisionerManagement.repositoryUrl')}
            </label>
            <input
              id="import-url"
              className="form-control"
              type="text"
              placeholder="https://…"
              value={form.url}
              onChange={event => patch({ url: event.target.value })}
              disabled={busy}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-branch">
              {t('host.provisionerManagement.branch')}
            </label>
            <input
              id="import-branch"
              className="form-control"
              type="text"
              value={form.branch}
              onChange={event => patch({ branch: event.target.value })}
              disabled={busy}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="import-token">
              {t('host.provisionerManagement.gitApiKey')}
            </label>
            {gitKeyNames ? (
              <select
                id="import-token"
                className="form-select"
                value={form.tokenName}
                onChange={event => patch({ tokenName: event.target.value })}
                disabled={busy}
              >
                <option value="">{t('host.provisionerManagement.nonePublicRepo')}</option>
                {gitKeyNames.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="import-token"
                className="form-control"
                type="text"
                placeholder={t('host.provisionerManagement.gitApiKeyPlaceholder')}
                value={form.tokenName}
                onChange={event => patch({ tokenName: event.target.value })}
                disabled={busy}
              />
            )}
            <p className="form-text text-muted mb-0">
              {t('host.provisionerManagement.gitApiKeyHelp')}
            </p>
          </div>
        </>
      ) : (
        <div className="mb-3">
          <label className="form-label" htmlFor="import-path">
            {t('host.provisionerManagement.pathOnAgentHost')}
          </label>
          <PathInput
            id="import-path"
            value={form.path}
            onChange={path => patch({ path })}
            status={status}
            hostId={id}
            server={server}
            mode={form.sourceType === 'archive' ? 'file' : 'directory'}
            disabled={busy}
          />
        </div>
      )}
    </ToolFormDialog>
  );
};

ImportModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  gitKeyNames: PropTypes.arrayOf(PropTypes.string),
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The provisioners of a host, hyperweaver-ui's provisioner management as
 * the body of the Manage page's Provisioners section: Import
 * provisioner, whose dialog sends `POST provisioning/provisioners/import`
 * from a folder, an archive or a git repository with a key among the
 * secrets, and Browse catalog, which opens the catalog the agent relays
 * and installs a version from it; the families over the one table
 * narrowed by the page's binding, each row opening the table of its
 * versions under it, the update badge while the catalog's newest is
 * newer than every installed version, and on each row Update to, Update
 * from source on a git-imported family and Delete family, on each
 * version Delete version, the two deletes behind the typed confirmation
 * and a refused one naming the machines that reference it. Every queued
 * task is followed on `task-updated` and the families read again at its
 * end. Nothing polls.
 */
const ProvisionerSection = ({ id, server, ctx, table, reads, rows, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const follow = useTaskFollow({ id, onEnd: () => reads.provisioners.refresh() });
  const toggleOpen = row =>
    setOpen(current => {
      const next = new Set(current);
      if (next.has(row.name)) {
        next.delete(row.name);
      } else {
        next.add(row.name);
      }
      return next;
    });
  const tableCtx = { ...ctx, newest: rows.newest, open, toggleOpen };
  const state = tableStateOf({ ...reads.provisioners, filtering, rows: table.rows.length });

  const queue = async ({ call, doneKey, values = {} }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.provisioners.failed',
    });
    if (!error) {
      setDialog(null);
      follow(answer);
      reads.provisioners.refresh();
    }
  };

  const remove = async () => {
    const { name, version } = dialog;
    const { error } = await send({
      call: () =>
        version
          ? deleteProvisionerVersion(status, id, name, version)
          : deleteProvisioner(status, id, name),
      doneKey: 'host.provisionerManagement.deleted',
      failKey: 'hosts.manage.provisioners.deleteFailed',
    });
    setDialog(null);
    if (!error) {
      reads.provisioners.refresh();
      return;
    }
    const machines = referencingMachinesOf(error);
    if (machines.length > 0) {
      notify(
        'warning',
        t('host.provisionerManagement.referencedBy', {
          message: error.message,
          machines: machines.join(', '),
        })
      );
    }
  };

  const onAction = (action, row, version = '') => {
    if (action === 'update') {
      queue({
        call: () => installFromCatalog(status, id, { name: row.name, version }),
        doneKey: 'host.provisionerManagement.installQueued',
        values: { label: `${row.name}/${version}` },
      });
    } else if (action === 'refresh-source') {
      queue({
        call: () => refreshProvisionerFromSource(status, id, row.name),
        doneKey: 'host.provisionerManagement.installQueued',
        values: { label: t('host.provisionerManagement.fromSourceLabel', { name: row.name }) },
      });
    } else if (action === 'delete-family') {
      setDialog({ kind: 'delete', name: row.name, version: '' });
    } else {
      setDialog({ kind: 'delete', name: row.family, version: row.version });
    }
  };

  return (
    <div data-panel="provisioners-body">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="provisioner-import"
            onClick={() => setDialog({ kind: 'import' })}
            disabled={busy}
          >
            <FaFileImport className="me-1" aria-hidden="true" />
            {t('host.provisionerManagement.importProvisioner')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-action="provisioner-catalog"
            onClick={() => setDialog({ kind: 'catalog' })}
            disabled={busy}
          >
            <FaCloudArrowDown className="me-1" aria-hidden="true" />
            {t('host.provisionerManagement.browseCatalog')}
          </button>
        </div>
        <span className="badge text-bg-secondary" data-note="family-count">
          {t('host.provisionerManagement.familiesCount', { count: rows.provisioners.length })}
        </span>
      </div>
      <div data-table="provisioners" data-state={state}>
        <SubTable
          columns={PROVISIONER_COLUMNS}
          rows={table.rows}
          rowKey={rowKey}
          rowClass={row => (open.has(row.name) ? 'provisioner-open' : undefined)}
          LeadActions={VersionsToggle}
          RowActions={ProvisionerRowActions}
          actionsProps={{ ctx: tableCtx, busy, onAction }}
          Detail={VersionsDetail}
          detailProps={{ ctx: tableCtx, busy, onAction }}
          expandedKeys={open}
          sort={table.sort}
          onSort={table.setSort}
          hiddenColumns={table.hiddenColumns}
          widths={table.widths}
          onResize={table.setColumnWidth}
          ctx={tableCtx}
          emptyText={t(TABLE_STATE_KEYS[state] || 'host.provisionerManagement.emptyRegistry')}
        />
      </div>
      {dialog?.kind === 'import' ? (
        <ImportModal
          id={id}
          server={server}
          gitKeyNames={secretNamesOf(reads.secrets.data, 'git_api_keys')}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={body =>
            queue({
              call: () => importProvisioner(status, id, body),
              doneKey: 'host.provisionerManagement.importQueuedDefault',
            })
          }
        />
      ) : null}
      {dialog?.kind === 'catalog' ? (
        <CatalogBrowseModal
          id={id}
          ctx={ctx}
          installedKeys={installedKeysOf(rows.provisioners)}
          busy={busy}
          onInstall={(name, version) =>
            queue({
              call: () => installFromCatalog(status, id, { name, version }),
              doneKey: 'host.provisionerManagement.installQueued',
              values: { label: `${name}/${version}` },
            })
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
      <ConfirmModal
        show={dialog?.kind === 'delete'}
        handleClose={() => setDialog(null)}
        handleConfirm={remove}
        title={t(
          dialog?.version
            ? 'host.provisionerManagement.deleteVersionTitle'
            : 'host.provisionerManagement.deleteFamilyTitle'
        )}
        message={
          dialog?.version
            ? t('host.provisionerManagement.deleteVersionMessage', {
                name: dialog.name,
                version: dialog.version,
              })
            : t('host.provisionerManagement.deleteFamilyMessage', { name: dialog?.name || '' })
        }
        confirmText={t('host.provisionerManagement.delete')}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

ProvisionerSection.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reads: PropTypes.shape({
    provisioners: PropTypes.object.isRequired,
    secrets: PropTypes.object.isRequired,
  }).isRequired,
  rows: PropTypes.shape({
    provisioners: PropTypes.array.isRequired,
    newest: PropTypes.object.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default ProvisionerSection;
