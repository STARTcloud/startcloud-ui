import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { messageFor } from '../../../utils/validation';
import { fetchRemoteTemplates } from '../api/provisioning';
import { useManageRead } from '../hooks/useHostManage';
import {
  flattenBoxCatalog,
  pickDefaultSource,
  sourceDisplayNameOf,
  sourceKeyOf,
  sourceLabelOf,
} from '../utils/boxCatalog';
import { templateSourceFor } from '../utils/machineCreate';
import {
  EXPORT_FORM,
  PULL_FORM,
  SOURCE_FORM,
  TEMPLATE_PUBLISH_FORM,
  exportable,
  pullBody,
  pullFormOf,
  pullProblem,
  sourceProblem,
  templateLabel,
  templatePublishBody,
  templatePublishProblem,
} from '../utils/manageCatalog';

import BoxSourceCard from './BoxSourceCard';
import { PathInput } from './PathPicker';
import SourcesModal, { InlineForm } from './SourcesModal';
import TaskDialog from './TaskDialog';
import ToolFormDialog from './ToolFormDialog';

const OFFERS = { default: true, toggle: true, edit: true, remove: true };

const sourceRowOf = source => ({
  key: sourceKeyOf(source),
  name: sourceLabelOf(source),
  url: source.url || '',
  isDefault: Boolean(source.default),
  enabled: source.enabled !== false,
  source,
});

const errorShape = PropTypes.shape({ rule: PropTypes.string.isRequired, params: PropTypes.object });

const FieldError = ({ id, labelKey, error }) => {
  const { t } = useTranslation();
  if (!error) {
    return null;
  }
  return (
    <div id={`${id}-error`} className="invalid-feedback d-block" data-error={id}>
      {messageFor(error, t(labelKey), t)}
    </div>
  );
};

FieldError.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  error: errorShape,
};

const TextField = ({ id, labelKey, value, onChange, disabled, placeholder = '', error = null }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        className={error ? 'form-control is-invalid' : 'form-control'}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <FieldError id={id} labelKey={labelKey} error={error} />
    </>
  );
};

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  placeholder: PropTypes.string,
  error: errorShape,
};

const SourceSelect = ({ id, labelKey, sources, value, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled || sources.length === 0}
      >
        {sources.length === 0 ? (
          <option value="">{t('host.templatesManagement.noRegistriesConfiguredOption')}</option>
        ) : (
          <option value="">{t('host.templatesManagement.select')}</option>
        )}
        {sources.map(source => (
          <option key={sourceKeyOf(source)} value={sourceKeyOf(source)}>
            {sourceLabelOf(source)}
            {source.default ? ` (${t('host.templatesManagement.default').toLowerCase()})` : ''}
          </option>
        ))}
      </select>
    </>
  );
};

SourceSelect.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  sources: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const MachineSelect = ({ id, machines, value, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t('host.templatesManagement.machineMustBeStopped')}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{t('host.templatesManagement.select')}</option>
        {machines.map(row => (
          <option key={row.name} value={row.name} disabled={!exportable(row)}>
            {row.name}
            {exportable(row) ? '' : ` (${t('host.templatesManagement.runningStopFirst')})`}
          </option>
        ))}
      </select>
    </>
  );
};

MachineSelect.propTypes = {
  id: PropTypes.string.isRequired,
  machines: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * The pull form a handed box fills: the organization and the box from
 * `organization/name`, the version and the architecture as handed.
 *
 * @param {{ box: string, box_version: string, box_arch: string }} seed - The handed box
 * @returns {Object} The form, the shape of `PULL_FORM`
 */
export const pullFormOfSeed = seed => {
  const [organization, ...name] = String(seed.box || '').split('/');
  return {
    organization: name.length > 0 ? organization : '',
    boxName: name.length > 0 ? name.join('/') : organization,
    version: seed.box_version || '',
    architecture: seed.box_arch || '',
  };
};

/**
 * The Import dialog of the Templates page, hyperweaver-ui's pull by
 * name: the registry, opening on the default one, picked by its key and
 * drawn by its display name, its catalog at `templates/remote/{key}` read
 * once a registry is picked and again on a change, the box picked from it
 * filling the organization, the box, the version among its versions and
 * the architecture among its architectures, each typed otherwise; the
 * submit hands the body of `pullBody` up, a queued task. A handed box,
 * `seed`, fills the fields and opens the dialog on the registry its
 * `box_url` names, `templateSourceFor`, and `registry`, the state of
 * `useTemplateSource`, draws the registry card over the fields and holds
 * the submit while the host lacks that registry.
 */
export const PullModal = ({
  id,
  sources,
  busy,
  onClose,
  onSubmit,
  seed = null,
  registry = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [chosen, setChosen] = useState(null);
  const handedKey = seed ? sourceKeyOf(templateSourceFor(sources, seed.box_url)) : '';
  const source = chosen ?? (handedKey || sourceKeyOf(pickDefaultSource(sources)));
  const [form, setForm] = useState(() => (seed ? pullFormOfSeed(seed) : PULL_FORM));
  const [pick, setPick] = useState('');
  const [problem, setProblem] = useState('');
  const catalog = useManageRead(
    useCallback(
      () => fetchRemoteTemplates(status, id, source).then(flattenBoxCatalog),
      [status, id, source]
    ),
    Boolean(source)
  );
  const boxes = Array.isArray(catalog.data) && source ? catalog.data : [];
  const picked = boxes.find(entry => entry.value === pick) || null;
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const choose = value => {
    setPick(value);
    const entry = boxes.find(row => row.value === value);
    if (entry) {
      setForm(pullFormOf(entry));
    }
  };

  const submit = () => {
    const why = pullProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(pullBody(form, source));
    }
  };

  return (
    <ToolFormDialog
      dialog="template-pull"
      title={t('host.templatesManagement.importTemplate')}
      submitKey="host.templatesManagement.queueDownload"
      problemKey={problem}
      disabled={Boolean(registry?.offered)}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {registry ? <BoxSourceCard source={registry} /> : null}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <SourceSelect
            id="template-pull-source"
            labelKey="host.templatesManagement.registry"
            sources={sources}
            value={source}
            onChange={value => {
              setChosen(value);
              setPick('');
            }}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="template-pull-catalog">
            {t('host.templatesManagement.availableTemplates', {
              source:
                sourceLabelOf(sources.find(entry => sourceKeyOf(entry) === source)) ||
                t('host.templatesManagement.theRegistry'),
            })}
          </label>
          <select
            id="template-pull-catalog"
            className="form-select"
            value={pick}
            onChange={event => choose(event.target.value)}
            disabled={busy || boxes.length === 0}
          >
            <option value="">
              {boxes.length > 0
                ? t('host.templatesManagement.selectTemplate')
                : t('host.templatesManagement.catalogEmptyOrUnreachable')}
            </option>
            {boxes.map(entry => (
              <option key={entry.value} value={entry.value}>
                {entry.value}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-pull-org"
            labelKey="host.templatesManagement.organization"
            placeholder={t('host.templatesManagement.organizationPlaceholder')}
            value={form.organization}
            onChange={organization => patch({ organization })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-pull-box"
            labelKey="host.templatesManagement.boxName"
            placeholder={t('host.templatesManagement.boxNamePlaceholder')}
            value={form.boxName}
            onChange={boxName => patch({ boxName })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="template-pull-version">
            {t('host.templatesManagement.versionSpecific')}
          </label>
          {picked && picked.versions.length > 0 ? (
            <select
              id="template-pull-version"
              className="form-select"
              value={form.version}
              onChange={event => patch({ version: event.target.value })}
              disabled={busy}
            >
              {picked.versions.map(version => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="template-pull-version"
              className="form-control"
              type="text"
              value={form.version}
              onChange={event => patch({ version: event.target.value })}
              disabled={busy}
            />
          )}
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="template-pull-arch">
            {t('host.templatesManagement.architectureOptional')}
          </label>
          {picked && picked.architectures.length > 0 ? (
            <select
              id="template-pull-arch"
              className="form-select"
              value={form.architecture}
              onChange={event => patch({ architecture: event.target.value })}
              disabled={busy}
            >
              <option value="">{t('host.templatesManagement.defaultOption')}</option>
              {picked.architectures.map(arch => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="template-pull-arch"
              className="form-control"
              type="text"
              placeholder={t('host.templatesManagement.amd64Placeholder')}
              value={form.architecture}
              onChange={event => patch({ architecture: event.target.value })}
              disabled={busy}
            />
          )}
        </div>
      </div>
    </ToolFormDialog>
  );
};

PullModal.propTypes = {
  id: PropTypes.string.isRequired,
  sources: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  seed: PropTypes.shape({
    box: PropTypes.string.isRequired,
    box_version: PropTypes.string.isRequired,
    box_arch: PropTypes.string.isRequired,
    box_url: PropTypes.string.isRequired,
  }),
  registry: PropTypes.object,
};

/**
 * The export dialog, hyperweaver-ui's: the machine among the host's,
 * a running one held, and the file name; the submit hands the machine
 * and the file name up, a queued task.
 */
export const ExportModal = ({ machines, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EXPORT_FORM);
  const [problem, setProblem] = useState('');
  const submit = () => {
    if (!form.machine) {
      setProblem('hosts.manage.templates.exportRequired');
      return;
    }
    onSubmit(form);
  };
  return (
    <ToolFormDialog
      dialog="template-export"
      title={t('host.templatesManagement.exportMachineToBox')}
      submitKey="host.templatesManagement.queueExport"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <MachineSelect
          id="template-export-machine"
          machines={machines}
          value={form.machine}
          onChange={machine => setForm(current => ({ ...current, machine }))}
          disabled={busy}
        />
      </div>
      <div className="mb-2">
        <TextField
          id="template-export-filename"
          labelKey="host.templatesManagement.filenameOptional"
          value={form.filename}
          onChange={filename => setForm(current => ({ ...current, filename }))}
          disabled={busy}
        />
      </div>
      <p className="form-text text-muted mb-0">
        {t('host.templatesManagement.resultingBoxPathLandInTaskOutput')}
      </p>
    </ToolFormDialog>
  );
};

ExportModal.propTypes = {
  machines: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The publish dialog, hyperweaver-ui's: the machine, the registry
 * opening on the default one, the organization, the box, the version,
 * the architecture and the description; the submit hands the body of
 * `templatePublishBody` up, a queued task.
 */
export const PublishModal = ({ machines, sources, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    ...TEMPLATE_PUBLISH_FORM,
    source: sourceKeyOf(pickDefaultSource(sources)),
  }));
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const submit = () => {
    const why = templatePublishProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(templatePublishBody(form));
    }
  };
  return (
    <ToolFormDialog
      dialog="template-publish"
      title={t('host.templatesManagement.publishMachineToRegistry')}
      submitKey="host.templatesManagement.queuePublish"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <MachineSelect
            id="template-publish-machine"
            machines={machines}
            value={form.machine}
            onChange={machine => patch({ machine })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <SourceSelect
            id="template-publish-source"
            labelKey="host.templatesManagement.registrySourceLabel"
            sources={sources}
            value={form.source}
            onChange={source => patch({ source })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-publish-org"
            labelKey="host.templatesManagement.organization"
            value={form.organization}
            onChange={organization => patch({ organization })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-publish-box"
            labelKey="host.templatesManagement.boxName"
            value={form.boxName}
            onChange={boxName => patch({ boxName })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-publish-version"
            labelKey="host.templatesManagement.version"
            value={form.version}
            onChange={version => patch({ version })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="template-publish-arch"
            labelKey="host.templatesManagement.architectureOptional"
            placeholder={t('host.templatesManagement.amd64Placeholder')}
            value={form.architecture}
            onChange={architecture => patch({ architecture })}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <TextField
            id="template-publish-description"
            labelKey="host.templatesManagement.descriptionOptional"
            value={form.description}
            onChange={description => patch({ description })}
            disabled={busy}
          />
        </div>
      </div>
    </ToolFormDialog>
  );
};

PublishModal.propTypes = {
  machines: PropTypes.array.isRequired,
  sources: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The move dialog, hyperweaver-ui's: the new storage root with the
 * browse button; the submit hands the path up, a queued task.
 */
export const MoveModal = ({ id, server, template, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [path, setPath] = useState('');
  const [problem, setProblem] = useState('');
  const submit = () => {
    if (!path.trim()) {
      setProblem('hosts.manage.templates.moveRequired');
      return;
    }
    onSubmit(path.trim());
  };
  return (
    <ToolFormDialog
      dialog="template-move"
      title={t('host.templatesManagement.moveTemplate', { template: templateLabel(template) })}
      submitKey="host.templatesManagement.queueMove"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="form-label" htmlFor="template-move-path">
        {t('host.templatesManagement.newStorageRoot')}
      </label>
      <PathInput
        id="template-move-path"
        value={path}
        onChange={setPath}
        status={status}
        hostId={id}
        server={server}
        pickTitle={t('host.templatesManagement.pickNewStorageRoot')}
        disabled={busy}
      />
    </ToolFormDialog>
  );
};

MoveModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The registry form of the Templates page's Registries modal, drawn under
 * its table, hyperweaver-ui's add and edit of a box registry: the id, the
 * agent's map key, seeded on an edit from the row's key, the display
 * name, seeded from the row's display name, the URL, the default switch,
 * the API key and the CA file with the browse button, blank credentials
 * keeping the existing ones on an edit; the submit hands the form up, and
 * `errors`, the refusal's entries by form field, draws each under the
 * field it names; `seed`, the form of a handed registry URL, fills a new
 * registry's fields.
 */
export const SourceForm = ({
  id,
  server,
  editing,
  errors = {},
  busy,
  onCancel,
  onSubmit,
  seed = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        ...SOURCE_FORM,
        name: sourceKeyOf(editing),
        displayName: sourceDisplayNameOf(editing),
        url: editing.url || '',
        isDefault: Boolean(editing.default),
      };
    }
    return seed || SOURCE_FORM;
  });
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const submit = () => {
    const why = sourceProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(form);
    }
  };
  return (
    <InlineForm
      dialog="template-source"
      title={
        editing
          ? t('host.templatesManagement.editRegistry', { name: sourceLabelOf(editing) })
          : t('host.templatesManagement.addBoxRegistry')
      }
      problemKey={problem}
      busy={busy}
      onCancel={onCancel}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <TextField
            id="source-name"
            labelKey="host.templatesManagement.name"
            placeholder={t('host.templatesManagement.boxvaultPlaceholder')}
            value={form.name}
            onChange={name => patch({ name })}
            disabled={busy}
            error={errors.name || null}
          />
        </div>
        <div className="col-12 col-md-8">
          <TextField
            id="source-display-name"
            labelKey="hosts.manage.templates.sourceDisplayName"
            value={form.displayName}
            onChange={displayName => patch({ displayName })}
            disabled={busy}
            error={errors.displayName || null}
          />
        </div>
        <div className="col-12">
          <TextField
            id="source-url"
            labelKey="host.templatesManagement.urlBoxVaultLabel"
            placeholder={t('host.templatesManagement.urlPlaceholder')}
            value={form.url}
            onChange={url => patch({ url })}
            disabled={busy}
            error={errors.url || null}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="source-default"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.isDefault}
              onChange={event => patch({ isDefault: event.target.checked })}
              disabled={busy}
            />
            <label className="form-check-label" htmlFor="source-default">
              {t('host.templatesManagement.makeDefaultRegistryFeedsWizard')}
            </label>
          </div>
          <FieldError
            id="source-default"
            labelKey="host.templatesManagement.makeDefaultRegistryFeedsWizard"
            error={errors.isDefault || null}
          />
        </div>
        <div className="col-12 col-md-6">
          <TextField
            id="source-token"
            labelKey="host.templatesManagement.registryApiKey"
            value={form.auth_token}
            onChange={auth_token => patch({ auth_token })}
            disabled={busy}
            error={errors.auth_token || null}
          />
          <span className="form-text text-muted">
            {t('host.templatesManagement.apiKeyHelp', {
              blankKeepsExisting: editing ? t('host.templatesManagement.blankKeepsExisting') : '',
            })}
          </span>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="source-cafile">
            {t('host.templatesManagement.caFileLabel')}
          </label>
          <PathInput
            id="source-cafile"
            value={form.ca_file}
            onChange={ca_file => patch({ ca_file })}
            status={status}
            hostId={id}
            server={server}
            mode="file"
            pickTitle={t('host.templatesManagement.pickCaFile')}
            disabled={busy}
          />
          <FieldError
            id="source-cafile"
            labelKey="host.templatesManagement.caFileLabel"
            error={errors.ca_file || null}
          />
        </div>
      </div>
    </InlineForm>
  );
};

SourceForm.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  editing: PropTypes.object,
  errors: PropTypes.objectOf(errorShape),
  busy: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  seed: PropTypes.object,
};

const panelShape = PropTypes.shape({
  open: PropTypes.bool.isRequired,
  form: PropTypes.shape({ editing: PropTypes.object, seed: PropTypes.object }),
});

/**
 * The Registries modal of the Templates page: the one modal of the box
 * registries, each row with Make default, Enable or Disable, Edit and
 * Remove, and the registry form under its table while `panel.form` is
 * set; Save hands the form and the registry being edited to `onSave`.
 */
const RegistriesModal = ({
  id,
  server,
  sources,
  panel,
  errors,
  busy,
  onAdd,
  onAction,
  onSave,
  onCancel,
  onClose,
}) => {
  const { t } = useTranslation();
  const editing = panel.form?.editing || null;
  return (
    <SourcesModal
      kind="template"
      title={t('host.templatesManagement.boxRegistries')}
      label={t('hosts.manage.sources.registries')}
      addLabelKey="host.templatesManagement.addRegistry"
      addAction="source-add"
      emptyKey="host.templatesManagement.noRegistriesConfigured"
      rows={sources.map(sourceRowOf)}
      offers={OFFERS}
      busy={busy}
      form={
        panel.form ? (
          <SourceForm
            key={editing ? sourceKeyOf(editing) : 'new'}
            id={id}
            server={server}
            editing={editing}
            seed={panel.form.seed}
            errors={errors}
            busy={busy}
            onCancel={onCancel}
            onSubmit={form => onSave(form, editing)}
          />
        ) : null
      }
      onAdd={onAdd}
      onAction={onAction}
      onClose={onClose}
    />
  );
};

RegistriesModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  sources: PropTypes.array.isRequired,
  panel: panelShape.isRequired,
  errors: PropTypes.objectOf(errorShape).isRequired,
  busy: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Every dialog of the Templates page: the Import, Export and Publish
 * dialogs by `asked`, the Move dialog and the delete confirmation by
 * `dialog`, the Registries modal while `panel.open`, the registry remove
 * confirmation and the task dialog of the task last queued; each submit
 * hands its body to the page's handler of that name.
 */
export const TemplateDialogsOf = ({
  id,
  server,
  status,
  sources,
  machines,
  busy,
  asked,
  dialog,
  panel,
  sourceErrors,
  task,
  onCloseAsked,
  onCloseDialog,
  onPull,
  onExport,
  onPublish,
  onMove,
  onDeleteTemplate,
  onAddSource,
  onSourceAction,
  onSaveSource,
  onRemoveSource,
  onCancelForm,
  onCloseSources,
  onCloseTask,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {asked === 'import' ? (
        <PullModal id={id} sources={sources} busy={busy} onClose={onCloseAsked} onSubmit={onPull} />
      ) : null}
      {asked === 'export' ? (
        <ExportModal machines={machines} busy={busy} onClose={onCloseAsked} onSubmit={onExport} />
      ) : null}
      {asked === 'publish' ? (
        <PublishModal
          machines={machines}
          sources={sources}
          busy={busy}
          onClose={onCloseAsked}
          onSubmit={onPublish}
        />
      ) : null}
      {dialog?.kind === 'move' ? (
        <MoveModal
          id={id}
          server={server}
          template={dialog.row}
          busy={busy}
          onClose={onCloseDialog}
          onSubmit={path => onMove(dialog.row, path)}
        />
      ) : null}
      <ConfirmModal
        show={dialog?.kind === 'delete'}
        handleClose={onCloseDialog}
        handleConfirm={onDeleteTemplate}
        title={t('host.templatesManagement.deleteTemplate')}
        message={t('host.templatesManagement.deleteTemplateConfirm', {
          template: dialog?.row ? templateLabel(dialog.row) : '',
        })}
        confirmText={t('host.templatesManagement.delete')}
      />
      {panel.open ? (
        <RegistriesModal
          id={id}
          server={server}
          sources={sources}
          panel={panel}
          errors={sourceErrors}
          busy={busy}
          onAdd={onAddSource}
          onAction={onSourceAction}
          onSave={onSaveSource}
          onCancel={onCancelForm}
          onClose={onCloseSources}
        />
      ) : null}
      <ConfirmModal
        show={dialog?.kind === 'source-remove'}
        handleClose={onCloseDialog}
        handleConfirm={() => onRemoveSource(dialog.source)}
        title={t('host.templatesManagement.removeRegistry')}
        message={t('host.templatesManagement.removeRegistryConfirm', {
          name: dialog?.source ? sourceLabelOf(dialog.source) : '',
        })}
        confirmText={t('host.templatesManagement.remove')}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={onCloseTask} /> : null}
    </>
  );
};

TemplateDialogsOf.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  status: PropTypes.object.isRequired,
  sources: PropTypes.array.isRequired,
  machines: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  asked: PropTypes.string.isRequired,
  dialog: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    row: PropTypes.object,
    source: PropTypes.object,
  }),
  panel: panelShape.isRequired,
  sourceErrors: PropTypes.objectOf(errorShape).isRequired,
  task: PropTypes.shape({ row: PropTypes.object.isRequired }),
  onCloseAsked: PropTypes.func.isRequired,
  onCloseDialog: PropTypes.func.isRequired,
  onPull: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onDeleteTemplate: PropTypes.func.isRequired,
  onAddSource: PropTypes.func.isRequired,
  onSourceAction: PropTypes.func.isRequired,
  onSaveSource: PropTypes.func.isRequired,
  onRemoveSource: PropTypes.func.isRequired,
  onCancelForm: PropTypes.func.isRequired,
  onCloseSources: PropTypes.func.isRequired,
  onCloseTask: PropTypes.func.isRequired,
};
