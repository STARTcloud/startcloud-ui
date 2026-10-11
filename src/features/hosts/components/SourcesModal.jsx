import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCheck,
  FaPenToSquare,
  FaPlus,
  FaStar,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from 'react-icons/fa6';

import SubTable, { hasAny } from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { nextSort, sortItems } from '../../../utils/sort';
import { messageFor } from '../../../utils/validation';
import { sourceDisplayNameOf, sourceKeyOf, sourceLabelOf } from '../utils/boxCatalog';
import {
  CATALOG_AUTHS,
  CATALOG_SOURCE_FORM,
  SOURCE_FORM,
  sourceProblem,
} from '../utils/manageCatalog';

import { PathInput } from './PathPicker';

const NO_HIDDEN = new Set();

const OFFERS = { default: true, toggle: true, edit: true, remove: true };

const AUTH_KEYS = { none: 'hosts.manage.catalog.authNone', oidc: 'hosts.manage.catalog.authOidc' };

const VARIANTS = {
  registry: {
    dialog: 'template-source',
    form: SOURCE_FORM,
    addKey: 'host.templatesManagement.addBoxRegistry',
    editKey: 'host.templatesManagement.editRegistry',
    namePlaceholderKey: 'host.templatesManagement.boxvaultPlaceholder',
    urlKey: 'host.templatesManagement.urlBoxVaultLabel',
    urlPlaceholderKey: 'host.templatesManagement.urlPlaceholder',
    defaultKey: 'host.templatesManagement.makeDefaultRegistryFeedsWizard',
    modal: {
      kind: 'template',
      titleKey: 'host.templatesManagement.boxRegistries',
      labelKey: 'hosts.manage.sources.registries',
      addLabelKey: 'host.templatesManagement.addRegistry',
      addAction: 'source-add',
      emptyKey: 'host.templatesManagement.noRegistriesConfigured',
    },
  },
  catalog: {
    dialog: 'catalog-source',
    form: CATALOG_SOURCE_FORM,
    addKey: 'host.provisionerManagement.addSource',
    editKey: 'host.provisionerManagement.editSource',
    namePlaceholderKey: '',
    urlKey: 'hosts.manage.catalog.sourceUrl',
    urlPlaceholderKey: '',
    defaultKey: 'hosts.manage.catalog.makeDefault',
    modal: {
      kind: 'catalog',
      titleKey: 'hosts.manage.held.catalogSources',
      labelKey: 'hosts.manage.sources.sources',
      addLabelKey: 'host.provisionerManagement.addSource',
      addAction: 'catalog-source-add',
      emptyKey: 'hosts.manage.sources.none',
    },
  },
};

const check = on => (on ? <FaCheck className="text-success" aria-hidden="true" /> : null);

const COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.templatesManagement.name',
    value: row => row.name,
    render: row => <span className="fw-semibold">{row.name}</span>,
  },
  {
    key: 'key',
    kind: 'word',
    labelKey: 'hosts.manage.sources.key',
    value: row => row.key,
    render: row => <code className="checksum">{row.key}</code>,
  },
  {
    key: 'url',
    kind: 'text',
    labelKey: 'hosts.manage.sources.url',
    value: row => row.url,
    render: row => <span className="text-body-secondary">{row.url}</span>,
  },
  {
    key: 'default',
    kind: 'badge',
    labelKey: 'hosts.manage.sources.default',
    value: row => (row.isDefault ? 1 : 0),
    render: row => check(row.isDefault),
  },
  {
    key: 'enabled',
    kind: 'badge',
    labelKey: 'hosts.manage.sources.enabled',
    when: hasAny(row => typeof row.enabled === 'boolean'),
    value: row => (row.enabled ? 1 : 0),
    render: row => check(row.enabled),
  },
];

const rowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  isDefault: PropTypes.bool.isRequired,
  enabled: PropTypes.bool,
  source: PropTypes.object.isRequired,
});

const offersShape = PropTypes.shape({
  default: PropTypes.bool,
  toggle: PropTypes.bool,
  edit: PropTypes.bool,
  remove: PropTypes.bool,
});

const errorShape = PropTypes.shape({ rule: PropTypes.string.isRequired, params: PropTypes.object });

const variantShape = PropTypes.oneOf(Object.keys(VARIANTS));

const sourceRowOf = source => ({
  key: sourceKeyOf(source),
  name: sourceLabelOf(source),
  url: source.url || '',
  isDefault: Boolean(source.default),
  enabled: source.enabled !== false,
  source,
});

/**
 * The sentence under a field a refused save names, the validation
 * contract's message for the entry's rule; nothing while `error` is null.
 */
export const FieldError = ({ id, labelKey, error }) => {
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

/**
 * One labelled text field of a host dialog, invalid while `error` names a
 * refusal, the sentence of that refusal under it.
 */
export const TextField = ({
  id,
  labelKey,
  value,
  onChange,
  disabled,
  placeholder = '',
  error = null,
}) => {
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

const SourceActions = ({ row, offers, busy, onAction }) => {
  const { t } = useTranslation();
  const disabled = row.enabled === false;
  return (
    <span className="d-inline-flex gap-1" data-source={row.key}>
      {offers.default && !row.isDefault ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-success py-0"
          title={t('host.templatesManagement.makeDefaultRegistry')}
          aria-label={t('host.templatesManagement.makeDefaultRegistry')}
          data-action="source-default"
          onClick={() => onAction('default', row.source)}
          disabled={busy}
        >
          <FaStar aria-hidden="true" />
        </button>
      ) : null}
      {offers.toggle ? (
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
          onClick={() => onAction('toggle', row.source)}
          disabled={busy}
        >
          {disabled ? <FaToggleOff aria-hidden="true" /> : <FaToggleOn aria-hidden="true" />}
        </button>
      ) : null}
      {offers.edit ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-warning py-0"
          title={t('host.templatesManagement.edit')}
          aria-label={t('host.templatesManagement.edit')}
          data-action="source-edit"
          onClick={() => onAction('edit', row.source)}
          disabled={busy}
        >
          <FaPenToSquare aria-hidden="true" />
        </button>
      ) : null}
      {offers.remove ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger py-0"
          title={t('host.templatesManagement.removeRegistry')}
          aria-label={t('host.templatesManagement.removeRegistry')}
          data-action="source-remove"
          onClick={() => onAction('remove', row.source)}
          disabled={busy}
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
};

SourceActions.propTypes = {
  row: rowShape.isRequired,
  offers: offersShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

/**
 * The form drawn under the sources table while Add or Edit is pressed:
 * its heading, the sentence that says why it cannot be sent while
 * `problemKey` names one, the fields, then Cancel and Save, both held
 * while `busy`; the form carries `dialog` as `data-dialog`.
 */
export const InlineForm = ({
  dialog,
  title,
  problemKey = '',
  busy,
  onCancel,
  onSubmit,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <form
      className="source-form border-top mt-3 pt-3"
      data-dialog={dialog}
      noValidate
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="h6 mb-3">{title}</h3>
      {problemKey ? (
        <div className="alert alert-danger" role="alert" data-note="problem">
          {t(problemKey)}
        </div>
      ) : null}
      {children}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          {t('pages.confirm.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" data-action="submit" disabled={busy}>
          {t('host.templatesManagement.save')}
        </button>
      </div>
    </form>
  );
};

InlineForm.propTypes = {
  dialog: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  problemKey: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const seedFormOf = (variant, editing, seed) => {
  if (editing) {
    return {
      ...variant.form,
      name: sourceKeyOf(editing),
      displayName: sourceDisplayNameOf(editing),
      url: editing.url || '',
      isDefault: Boolean(editing.default),
      ...(variant.form.auth ? { auth: editing.auth || 'none' } : {}),
    };
  }
  return seed || variant.form;
};

const CredentialField = ({ variant, form, patch, busy, editing, error }) => {
  const { t } = useTranslation();
  if (variant.form.auth) {
    return (
      <>
        <label className="form-label" htmlFor="source-auth">
          {t('hosts.manage.catalog.sourceAuth')}
        </label>
        <select
          id="source-auth"
          className="form-select"
          value={form.auth}
          onChange={event => patch({ auth: event.target.value })}
          disabled={busy}
        >
          {CATALOG_AUTHS.map(auth => (
            <option key={auth} value={auth}>
              {t(AUTH_KEYS[auth])}
            </option>
          ))}
        </select>
        <FieldError id="source-auth" labelKey="hosts.manage.catalog.sourceAuth" error={error} />
      </>
    );
  }
  return (
    <>
      <TextField
        id="source-token"
        labelKey="host.templatesManagement.registryApiKey"
        value={form.auth_token}
        onChange={auth_token => patch({ auth_token })}
        disabled={busy}
        error={error}
      />
      <span className="form-text text-muted">
        {t('host.templatesManagement.apiKeyHelp', {
          blankKeepsExisting: editing ? t('host.templatesManagement.blankKeepsExisting') : '',
        })}
      </span>
    </>
  );
};

CredentialField.propTypes = {
  variant: PropTypes.object.isRequired,
  form: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  editing: PropTypes.object,
  error: errorShape,
};

/**
 * The source form drawn under the sources table, the add and edit of a
 * box registry, `variant` `registry`, or of a catalog source, `variant`
 * `catalog`: the id, the agent's map key, seeded on an edit from the
 * row's key, the display name, the URL, the default switch, the
 * credential, the registry's API key or the catalog's authentication,
 * None or OIDC, and the CA file with the browse button, a blank key or
 * CA file keeping the stored one on an edit; the submit hands the form
 * up, `errors`, the refusal's entries by form field, draws each under the
 * field it names, and `seed`, the form of a handed URL, fills a new
 * source's fields.
 */
export const SourceForm = ({
  variant: variantKey,
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
  const variant = VARIANTS[variantKey];
  const [form, setForm] = useState(() => seedFormOf(variant, editing, seed));
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
      dialog={variant.dialog}
      title={editing ? t(variant.editKey, { name: sourceLabelOf(editing) }) : t(variant.addKey)}
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
            placeholder={variant.namePlaceholderKey ? t(variant.namePlaceholderKey) : ''}
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
            labelKey={variant.urlKey}
            placeholder={variant.urlPlaceholderKey ? t(variant.urlPlaceholderKey) : ''}
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
              {t(variant.defaultKey)}
            </label>
          </div>
          <FieldError
            id="source-default"
            labelKey={variant.defaultKey}
            error={errors.isDefault || null}
          />
        </div>
        <div className="col-12 col-md-6">
          <CredentialField
            variant={variant}
            form={form}
            patch={patch}
            busy={busy}
            editing={editing}
            error={errors.auth || errors.auth_token || null}
          />
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
  variant: variantShape.isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  editing: PropTypes.object,
  errors: PropTypes.objectOf(errorShape),
  busy: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  seed: PropTypes.object,
};

/**
 * The one modal of a host's catalog sources and box registries: the
 * title and the close button, a heading pane with `label` and the Add
 * press at its right, the one table of the rows, Name, Key, URL, Default
 * and, while a row carries it, Enabled, each row's actions among Make
 * default, Enable or Disable, Edit and Remove as `offers` says, and under
 * the table the `form` the page gives while Add or Edit is pressed, so
 * no dialog opens over the modal. `kind` names the modal's `data-dialog`,
 * `<kind>-sources`, and `addAction` the Add press's `data-action`.
 */
const SourcesModal = ({
  kind,
  title,
  label,
  addLabelKey,
  addAction,
  emptyKey,
  rows,
  offers,
  busy,
  form = null,
  onAdd,
  onAction,
  onClose,
}) => {
  const { t } = useTranslation();
  const [sort, setSort] = useState([]);
  const ctx = { t };
  const acts = Object.values(offers).some(Boolean);
  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog={`${kind}-sources`}>
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">{label}</span>
          <span className="ms-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-action={addAction}
              onClick={onAdd}
              disabled={busy}
            >
              <FaPlus className="me-1" aria-hidden="true" />
              {t(addLabelKey)}
            </button>
          </span>
        </div>
        <SubTable
          columns={COLUMNS}
          rows={sortItems(rows, sort, COLUMNS, ctx)}
          rowKey={row => row.key}
          rowId={row => `source-${row.key}`}
          RowActions={acts ? SourceActions : null}
          actionsProps={{ offers, busy, onAction }}
          sort={sort}
          onSort={(column, options) => setSort(current => nextSort(current, column, options))}
          hiddenColumns={NO_HIDDEN}
          ctx={ctx}
          emptyText={t(emptyKey)}
        />
        {form}
      </Modal.Body>
    </Modal>
  );
};

SourcesModal.propTypes = {
  kind: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  addLabelKey: PropTypes.string.isRequired,
  addAction: PropTypes.string.isRequired,
  emptyKey: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(rowShape).isRequired,
  offers: offersShape.isRequired,
  busy: PropTypes.bool.isRequired,
  form: PropTypes.node,
  onAdd: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const panelShape = PropTypes.shape({
  open: PropTypes.bool.isRequired,
  form: PropTypes.shape({ editing: PropTypes.object, seed: PropTypes.object }),
});

/**
 * The Sources or Registries modal of a host page over the rows of one
 * sources map, the registries of `variant` `registry` or the catalog
 * sources of `variant` `catalog`: every row with Make default, Enable or
 * Disable, Edit and Remove, and the source form under the table while
 * `panel.form` is set; Save hands the form and the source being edited
 * to `onSave`.
 */
export const HeldSourcesModal = ({
  variant: variantKey,
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
  const variant = VARIANTS[variantKey].modal;
  const editing = panel.form?.editing || null;
  return (
    <SourcesModal
      kind={variant.kind}
      title={t(variant.titleKey)}
      label={t(variant.labelKey)}
      addLabelKey={variant.addLabelKey}
      addAction={variant.addAction}
      emptyKey={variant.emptyKey}
      rows={sources.map(sourceRowOf)}
      offers={OFFERS}
      busy={busy}
      form={
        panel.form ? (
          <SourceForm
            key={editing ? sourceKeyOf(editing) : 'new'}
            variant={variantKey}
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

HeldSourcesModal.propTypes = {
  variant: variantShape.isRequired,
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

export default SourcesModal;
