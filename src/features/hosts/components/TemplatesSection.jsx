import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCloudArrowDown,
  FaCloudArrowUp,
  FaFileExport,
  FaFolderTree,
  FaPenToSquare,
  FaPlus,
  FaStar,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { patchConfigFile } from '../api/manage';
import { deleteTemplate, moveTemplate, pullTemplate } from '../api/provisioning';
import { exportTemplate, publishTemplate } from '../api/templates';
import { useHostMachines } from '../hooks/useHostMachines';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { exportBody } from '../utils/machineTools';
import {
  formatSize,
  sourceDefaultPatch,
  sourceEntryPatch,
  sourceRemovePatch,
  sourceTogglePatch,
  templateKey,
  templateLabel,
} from '../utils/manageCatalog';

import ManageTable from './ManageTable';
import TaskDialog from './TaskDialog';
import { ExportModal, MoveModal, PublishModal, PullModal, SourceModal } from './TemplateDialogs';

/**
 * The columns of the templates table, hyperweaver-ui's: the box, the
 * version, the architecture, the provider, the size and when it was
 * downloaded.
 */
export const TEMPLATE_COLUMNS = [
  {
    key: 'box',
    kind: 'name',
    labelKey: 'host.templatesManagement.box',
    value: row => `${row.organization}/${row.box_name}`,
    render: row => (
      <code className="small">
        {row.organization}/{row.box_name}
      </code>
    ),
  },
  {
    key: 'version',
    kind: 'text',
    labelKey: 'host.templatesManagement.version',
    priority: 2,
    value: row => row.version || '',
  },
  {
    key: 'architecture',
    kind: 'word',
    labelKey: 'host.templatesManagement.architecture',
    value: row => row.architecture || '',
    render: row => row.architecture || '-',
  },
  {
    key: 'provider',
    kind: 'word',
    labelKey: 'host.templatesManagement.provider',
    value: row => row.provider || '',
    render: row => row.provider || '-',
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.templatesManagement.size',
    value: row => Number(row.size) || 0,
    render: row => <span className="small">{formatSize(row.size)}</span>,
  },
  {
    key: 'downloaded_at',
    kind: 'date',
    labelKey: 'host.templatesManagement.downloaded',
    value: row => (row.downloaded_at ? new Date(row.downloaded_at).getTime() : 0),
    render: row => (
      <span className="small">
        {row.downloaded_at ? new Date(row.downloaded_at).toLocaleString() : '-'}
      </span>
    ),
  },
];

/**
 * The filter groups of the templates table: the architecture and the
 * provider.
 */
export const TEMPLATE_FILTERS = [
  {
    key: 'architecture',
    labelKey: 'host.templatesManagement.architecture',
    values: row => (row.architecture ? [row.architecture] : []),
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
  {
    key: 'provider',
    labelKey: 'host.templatesManagement.provider',
    values: row => (row.provider ? [row.provider] : []),
    activeClass: 'bg-info',
    labelFor: value => value,
  },
];

const TemplateRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-template={templateKey(row)}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.templatesManagement.moveToStorageRoot')}
        aria-label={t('host.templatesManagement.moveToStorageRoot')}
        data-action="move"
        disabled={busy || !row.id}
        onClick={() => onAction('move', row)}
      >
        <FaFolderTree aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('host.templatesManagement.deleteTemplate')}
        aria-label={t('host.templatesManagement.deleteTemplate')}
        data-action="delete"
        disabled={busy || !row.id}
        onClick={() => onAction('delete', row)}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </span>
  );
};

TemplateRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const SourceRow = ({ source, busy, onAction }) => {
  const { t } = useTranslation();
  const disabled = source.enabled === false;
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap" data-source={source.name}>
      <code className="small">{source.name}</code>
      <span className="text-muted small">{source.url}</span>
      {source.default ? (
        <span className="badge text-bg-success" data-note="source-default">
          {t('host.templatesManagement.default')}
        </span>
      ) : null}
      {disabled ? (
        <span className="badge text-bg-secondary">{t('host.templatesManagement.disabled')}</span>
      ) : null}
      <span className="ms-auto d-inline-flex gap-1">
        {source.default ? null : (
          <button
            type="button"
            className="btn btn-sm btn-outline-success py-0"
            title={t('host.templatesManagement.makeDefaultRegistry')}
            aria-label={t('host.templatesManagement.makeDefaultRegistry')}
            data-action="source-default"
            onClick={() => onAction('default', source)}
            disabled={busy}
          >
            <FaStar aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0"
          title={t(
            disabled ? 'host.templatesManagement.enable' : 'host.templatesManagement.disable'
          )}
          aria-label={t(
            disabled ? 'host.templatesManagement.enable' : 'host.templatesManagement.disable'
          )}
          data-action="source-toggle"
          onClick={() => onAction('toggle', source)}
          disabled={busy}
        >
          {disabled ? <FaToggleOff aria-hidden="true" /> : <FaToggleOn aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning py-0"
          title={t('host.templatesManagement.edit')}
          aria-label={t('host.templatesManagement.edit')}
          data-action="source-edit"
          onClick={() => onAction('edit', source)}
          disabled={busy}
        >
          <FaPenToSquare aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger py-0"
          title={t('host.templatesManagement.removeRegistry')}
          aria-label={t('host.templatesManagement.removeRegistry')}
          data-action="source-remove"
          onClick={() => onAction('remove', source)}
          disabled={busy}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </span>
    </div>
  );
};

SourceRow.propTypes = {
  source: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

const rowKey = row => templateKey(row);

const TemplateDialog = ({ dialog, id, server, rows, machines, busy, on }) => {
  switch (dialog?.kind) {
    case 'pull':
      return (
        <PullModal
          id={id}
          sources={rows.sources}
          busy={busy}
          onClose={on.close}
          onSubmit={on.pull}
        />
      );
    case 'export':
      return (
        <ExportModal machines={machines} busy={busy} onClose={on.close} onSubmit={on.export} />
      );
    case 'publish':
      return (
        <PublishModal
          machines={machines}
          sources={rows.sources}
          busy={busy}
          onClose={on.close}
          onSubmit={on.publish}
        />
      );
    case 'move':
      return (
        <MoveModal
          id={id}
          server={server}
          template={dialog.template}
          busy={busy}
          onClose={on.close}
          onSubmit={on.move}
        />
      );
    case 'source-add':
    case 'source-edit':
      return (
        <SourceModal
          id={id}
          server={server}
          editing={dialog.source || null}
          busy={busy}
          onClose={on.close}
          onSubmit={on.saveSource}
        />
      );
    default:
      return null;
  }
};

TemplateDialog.propTypes = {
  dialog: PropTypes.object,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  rows: PropTypes.object.isRequired,
  machines: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  on: PropTypes.shape({
    close: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    export: PropTypes.func.isRequired,
    publish: PropTypes.func.isRequired,
    move: PropTypes.func.isRequired,
    saveSource: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The templates of a host, hyperweaver-ui's template registry view as
 * the body of the Manage page's Templates section: the box registries
 * card, one line a source with its default and disabled badges and Make
 * default, Enable or Disable, Edit and Remove, Add registry in its
 * heading, every write of it one merge patch of `PUT config/storage`
 * over the `/template_sources/sources` map, `null` removing an entry,
 * and the sources read again on success; Pull template,
 * Export machine and Publish over the one table narrowed by the page's
 * binding, and on each row Move and Delete behind the typed
 * confirmation. Every mutation is a queued task followed on
 * `task-updated` and the templates read again at its end, the notice
 * carrying View task. Nothing polls.
 */
const TemplatesSection = ({ id, server, ctx, table, reads, rows, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const { machines } = useHostMachines(id);
  const [dialog, setDialog] = useState(null);
  const follow = useTaskFollow({ id, onEnd: () => reads.templates.refresh() });

  const queue = async ({ call, doneKey, values = {} }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.templates.failed',
    });
    if (!error) {
      setDialog(null);
      follow(answer);
      reads.templates.refresh();
    }
  };

  const saveSources = async ({ patch, doneKey, values }) => {
    const { error } = await send({
      call: () => patchConfigFile(status, id, 'storage', patch),
      doneKey,
      values,
      failKey: 'hosts.manage.templates.sourceFailed',
    });
    if (!error) {
      setDialog(null);
      reads.sources.refresh();
    }
  };

  const onSourceAction = (action, source) => {
    if (action === 'edit' || action === 'remove') {
      setDialog({ kind: `source-${action}`, source });
      return;
    }
    if (action === 'toggle') {
      saveSources({
        patch: sourceTogglePatch(source),
        doneKey:
          source.enabled === false
            ? 'hosts.manage.templates.sourceEnabled'
            : 'hosts.manage.templates.sourceDisabled',
        values: { name: source.name },
      });
      return;
    }
    saveSources({
      patch: sourceDefaultPatch(rows.sources, source),
      doneKey: 'hosts.manage.templates.sourceDefault',
      values: { name: source.name },
    });
  };

  const onTemplateAction = (action, template) => setDialog({ kind: action, template });

  return (
    <div data-panel="templates-body">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="template-pull"
            onClick={() => setDialog({ kind: 'pull' })}
            disabled={busy}
          >
            <FaCloudArrowDown className="me-1" aria-hidden="true" />
            {t('host.templatesManagement.pullTemplate')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            data-action="template-export"
            title={t('host.templatesManagement.exportMachineTooltip')}
            onClick={() => setDialog({ kind: 'export' })}
            disabled={busy}
          >
            <FaFileExport className="me-1" aria-hidden="true" />
            {t('host.templatesManagement.exportMachine')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            data-action="template-publish"
            title={t('host.templatesManagement.publishTooltip')}
            onClick={() => setDialog({ kind: 'publish' })}
            disabled={busy}
          >
            <FaCloudArrowUp className="me-1" aria-hidden="true" />
            {t('host.templatesManagement.publish')}
          </button>
        </div>
        <span className="badge text-bg-secondary" data-note="template-count">
          {t('host.templatesManagement.templatesCount', { count: rows.templates.length })}
        </span>
      </div>
      <div className="card mb-3" data-panel="template-sources">
        <div className="card-body py-2">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
            <span className="fw-semibold">{t('host.templatesManagement.boxRegistries')}</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-action="source-add"
              onClick={() => setDialog({ kind: 'source-add' })}
              disabled={busy}
            >
              <FaPlus className="me-1" aria-hidden="true" />
              {t('host.templatesManagement.addRegistry')}
            </button>
          </div>
          {rows.sources.length === 0 ? (
            <span className="text-muted small">
              {t('host.templatesManagement.noRegistriesConfigured')}
            </span>
          ) : null}
          <div className="d-flex flex-column gap-1">
            {rows.sources.map(source => (
              <SourceRow key={source.name} source={source} busy={busy} onAction={onSourceAction} />
            ))}
          </div>
          <p className="form-text text-muted mb-0 mt-1">
            {t('hosts.manage.templates.sourcesHelp')}
          </p>
        </div>
      </div>
      <ManageTable
        name="templates"
        columns={TEMPLATE_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={TemplateRowActions}
        actionsProps={{ busy, onAction: onTemplateAction }}
        ctx={ctx}
        emptyKey="host.templatesManagement.noTemplatesYet"
        reading={reads.templates}
        filtering={filtering}
      />
      <TemplateDialog
        dialog={dialog}
        id={id}
        server={server}
        rows={rows}
        machines={machines}
        busy={busy}
        on={{
          close: () => setDialog(null),
          pull: body =>
            queue({
              call: () => pullTemplate(status, id, body),
              doneKey: 'hosts.manage.templates.pullQueued',
              values: { box: `${body.organization}/${body.box_name}` },
            }),
          export: form =>
            queue({
              call: () =>
                exportTemplate(
                  status,
                  id,
                  exportBody({ name: form.machine, filename: form.filename })
                ),
              doneKey: 'hosts.manage.templates.exportQueued',
              values: { name: form.machine },
            }),
          publish: body =>
            queue({
              call: () => publishTemplate(status, id, body),
              doneKey: 'hosts.manage.templates.publishQueued',
              values: { name: body.machine_name },
            }),
          move: path =>
            queue({
              call: () => moveTemplate(status, id, dialog.template.id, path),
              doneKey: 'hosts.manage.templates.moveQueued',
              values: { template: templateLabel(dialog.template) },
            }),
          saveSource: form =>
            saveSources({
              patch: sourceEntryPatch(rows.sources, form, dialog.source?.name || ''),
              doneKey: dialog.source
                ? 'hosts.manage.templates.sourceUpdated'
                : 'hosts.manage.templates.sourceAdded',
              values: { name: form.name.trim() },
            }),
        }}
      />
      <ConfirmModal
        show={dialog?.kind === 'delete'}
        handleClose={() => setDialog(null)}
        handleConfirm={() =>
          queue({
            call: () => deleteTemplate(status, id, dialog.template.id),
            doneKey: 'hosts.manage.templates.deleteQueued',
            values: { template: templateLabel(dialog.template) },
          })
        }
        title={t('host.templatesManagement.deleteTemplate')}
        message={t('host.templatesManagement.deleteTemplateConfirm', {
          template: dialog?.template ? templateLabel(dialog.template) : '',
        })}
        confirmText={t('host.templatesManagement.delete')}
      />
      <ConfirmModal
        show={dialog?.kind === 'source-remove'}
        handleClose={() => setDialog(null)}
        handleConfirm={() =>
          saveSources({
            patch: sourceRemovePatch(dialog.source),
            doneKey: 'hosts.manage.templates.sourceRemoved',
            values: { name: dialog.source.name },
          })
        }
        title={t('host.templatesManagement.removeRegistry')}
        message={t('host.templatesManagement.removeRegistryConfirm', {
          name: dialog?.source?.name || '',
        })}
        confirmText={t('host.templatesManagement.remove')}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

TemplatesSection.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reads: PropTypes.shape({
    templates: PropTypes.object.isRequired,
    sources: PropTypes.object.isRequired,
  }).isRequired,
  rows: PropTypes.shape({
    templates: PropTypes.array.isRequired,
    sources: PropTypes.array.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default TemplatesSection;
