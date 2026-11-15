import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import DiscardPrompt, { useDiscardGuard } from '../../../components/common/DiscardPrompt';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import { TERM_ICON_NAMES } from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { loadCountries } from '../../../lib/countries';
import {
  createTerm,
  previewTerm,
  publishTerm,
  termHistory,
  termRevision,
  updateTerm,
} from '../api/content';

import DateCell from './DateCell';
import { LOCALES } from './EmailTemplateDialog';

export const TERM_TYPES = ['CLIENT', 'SITE', 'BOTH'];

export const REGION_SETS = ['EU', 'EEA', 'UK'];

const VERSION_POINTER = '/version';

const DECLARE_SYNTAX =
  '{{field:<name>;kind=<kind>;label=<text>;required=<true|false>;options=<a|b|c>}}';

const REPEAT_SYNTAX = '{{field:<name>}}';

const NO_FIELDS = [];

export const regionsOf = row => (Array.isArray(row?.regions) ? row.regions : []);

export const regionOfCopy = copy => regionsOf(copy)[0] || '';

export const localeOfCopy = copy => copy?.locale || '';

/**
 * The default copy of a document: the one with no regions in the default
 * language, the copy every language copy and every region copy stands
 * beside.
 *
 * @param {Object} document - The document with its `copies`
 * @returns {Object|null} The copy, or null when the document has none
 */
export const defaultCopyOf = document =>
  (document.copies || []).find(copy => regionsOf(copy).length === 0 && !localeOfCopy(copy)) || null;

/**
 * The badge of a copy's language: "Default language" for `""`, else the
 * language tag itself.
 *
 * @param {Function} t - The translator
 * @param {string} locale - The copy's `locale`
 * @returns {string} The label
 */
export const localeLabelOf = (t, locale) => locale || t('admin.terms.defaultLanguage');

const localeOptionLabelOf = (t, locale) =>
  locale
    ? `${t(`admin.emailTemplates.locale.${locale}`, { defaultValue: locale })} (${locale})`
    : t('admin.terms.defaultLanguage');

/**
 * The translation key of a refused terms write that painted no field: the
 * terms page's own sentence for a `409` `default_copy`, the client's
 * status line otherwise.
 *
 * @param {Object} error - The `ApiError`
 * @returns {string} The key
 */
export const refusalKeyOf = error =>
  error?.code === 'default_copy'
    ? 'admin.terms.errors.default_copy'
    : error?.messageKey || 'errors.request';

/**
 * The translation key of a refused save, publish or delete of a copy that
 * exists on the page: `admin.copyRemoved` for a `404`, `refusalKeyOf`
 * otherwise.
 *
 * @param {Object} error - The `ApiError`
 * @returns {string} The key
 */
export const copyRefusalKeyOf = error =>
  error?.status === 404 ? 'admin.copyRemoved' : refusalKeyOf(error);

export const copyShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regions: PropTypes.arrayOf(PropTypes.string),
  locale: PropTypes.string,
  version: PropTypes.string,
  revision: PropTypes.number,
  content: PropTypes.string,
  created_by: PropTypes.string,
  updated_at: PropTypes.string,
});

export const documentShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  friendly_name: PropTypes.string,
  icon: PropTypes.string,
  type: PropTypes.string,
  is_public: PropTypes.bool,
  copies: PropTypes.arrayOf(copyShape).isRequired,
});

export const placeholderShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  scope: PropTypes.string,
  description: PropTypes.string,
});

const DOC_LABELS = {
  name: 'admin.terms.field.name',
  friendly_name: 'admin.terms.field.displayName',
  icon: 'admin.terms.field.icon',
  type: 'admin.terms.field.type',
  is_public: 'admin.terms.field.public',
};

const COPY_LABELS = {
  regions: 'admin.terms.field.regions',
  locale: 'admin.terms.field.locale',
  version: 'admin.terms.field.version',
  content: 'admin.terms.field.content',
};

const docSchema = ({ editing }) => ({
  required: editing ? ['friendly_name', 'type'] : ['name', 'friendly_name', 'type'],
  properties: {
    name: { $ref: '#/$defs/slug' },
    friendly_name: { type: 'string' },
    icon: { $ref: '#/$defs/iconName' },
    type: { type: 'string', enum: TERM_TYPES },
    is_public: { type: 'boolean' },
  },
});

const COPY_SCHEMA = {
  required: ['version', 'content'],
  properties: {
    regions: { type: 'array', items: { $ref: '#/$defs/region' } },
    locale: { $ref: '#/$defs/languageTag' },
    version: { type: 'string' },
    content: { type: 'string' },
  },
};

const SAVE_SCHEMA = {
  required: ['content'],
  properties: {
    regions: { type: 'array', items: { $ref: '#/$defs/region' } },
    locale: { type: 'string' },
    content: { type: 'string' },
  },
};

const PUBLISH_SCHEMA = {
  required: ['version'],
  properties: {
    version: { type: 'string' },
  },
};

const PUBLISH_LABELS = {
  version: 'admin.terms.field.version',
  content: 'admin.terms.field.content',
};

const TextField = ({ name, form, rules, onChange, labels, readOnly = false }) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(labels[name])} error={rules.errors[name] || ''}>
      {aria => (
        <input
          {...aria}
          type="text"
          className="form-control"
          value={form[name]}
          readOnly={readOnly}
          onChange={event => onChange(name, event.target.value)}
          onBlur={() => rules.onBlur(name)}
        />
      )}
    </Field>
  );
};

TextField.propTypes = {
  name: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  labels: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
};

const SelectField = ({
  name,
  form,
  rules,
  onChange,
  labels,
  options,
  labelOf,
  disabled = false,
}) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(labels[name])} error={rules.errors[name] || ''}>
      {aria => (
        <select
          {...aria}
          className="form-select"
          value={form[name]}
          disabled={disabled}
          onChange={event => onChange(name, event.target.value)}
          onBlur={() => rules.onBlur(name)}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {labelOf(option)}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

SelectField.propTypes = {
  name: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  labels: PropTypes.object.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelOf: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The document's Create and Edit dialog: name (fixed while editing),
 * display name, the icon picked from the estate's glyph set, type and
 * public, the fields kept at the document's own level and written to
 * every copy through `POST` or `PATCH /api/admin/terms/{name}`; a `422`
 * paints on the field its pointer names, `required` at `/type` on the
 * type field; a `404` on an edit says the copy was removed by someone
 * else and reloads the list; while a field differs from the one it opened
 * on, a backdrop click, Escape, the close button and Cancel ask the
 * discard prompt.
 */
export const TermDocumentDialog = ({ document = null, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const editing = document !== null;
  const [opened] = useState(() => ({
    name: document?.name || '',
    friendly_name: document?.friendly_name || '',
    icon: TERM_ICON_NAMES.includes(document?.icon) ? document.icon : 'file-text',
    type: TERM_TYPES.includes(document?.type) ? document.type : 'SITE',
    is_public: Boolean(document?.is_public),
  }));
  const [form, setForm] = useState(opened);
  const [busy, setBusy] = useState(false);
  const guard = useDiscardGuard(JSON.stringify(form) !== JSON.stringify(opened), onClose);
  const rules = useFormRules({
    formKey: 'terms',
    schema: docSchema({ editing }),
    values: form,
    labels: DOC_LABELS,
    idPrefix: 'term-doc',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    const call = editing
      ? updateTerm(document.name, {
          friendly_name: form.friendly_name,
          icon: form.icon,
          type: form.type,
          is_public: form.is_public,
        })
      : createTerm({ ...form, regions: [], version: '1.0', content: '' });
    call
      .then(() => {
        notify('success', t(editing ? 'admin.terms.updated' : 'admin.terms.created'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        notify('danger', t(editing ? copyRefusalKeyOf(error) : refusalKeyOf(error)));
        if (editing && error.status === 404) {
          onSaved();
          onClose();
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Modal show onHide={guard.close} dialogClassName="form-modal" scrollable>
        <form onSubmit={save} noValidate data-dialog="term-document">
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {editing
                ? t('admin.terms.editTitle', { name: document.name })
                : t('admin.terms.createTitle')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormErrorSummary errors={rules.summary} />
            <div className="row">
              <div className="col-md-6">
                <TextField
                  name="name"
                  form={form}
                  rules={rules}
                  onChange={onChange}
                  labels={DOC_LABELS}
                  readOnly={editing}
                />
              </div>
              <div className="col-md-6">
                <TextField
                  name="friendly_name"
                  form={form}
                  rules={rules}
                  onChange={onChange}
                  labels={DOC_LABELS}
                />
              </div>
              <div className="col-md-4">
                <SelectField
                  name="icon"
                  form={form}
                  rules={rules}
                  onChange={onChange}
                  labels={DOC_LABELS}
                  options={TERM_ICON_NAMES}
                  labelOf={name => name}
                />
              </div>
              <div className="col-md-4">
                <SelectField
                  name="type"
                  form={form}
                  rules={rules}
                  onChange={onChange}
                  labels={DOC_LABELS}
                  options={TERM_TYPES}
                  labelOf={type => t(`admin.terms.type.${type.toLowerCase()}`)}
                />
              </div>
              <div className="col-md-4 d-flex align-items-center">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={rules.idFor('is_public')}
                    checked={form.is_public}
                    onChange={event => onChange('is_public', event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor={rules.idFor('is_public')}>
                    {t('admin.terms.field.publicAt', { name: form.name || '…' })}
                  </label>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={guard.close}
              disabled={busy}
            >
              {t('admin.buttons.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('admin.buttons.save')}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

TermDocumentDialog.propTypes = {
  document: documentShape,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const useCountries = () => {
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    let active = true;
    loadCountries()
      .then(list => {
        if (active) {
          setCountries(list);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);
  return countries;
};

const RegionsField = ({ form, rules, onChange }) => {
  const { t } = useTranslation();
  const countries = useCountries();
  return (
    <Field
      id={rules.idFor('regions')}
      label={t(COPY_LABELS.regions)}
      error={rules.errors.regions || ''}
    >
      {aria => (
        <select
          {...aria}
          multiple
          className="form-select"
          value={form.regions}
          onChange={event =>
            onChange(
              'regions',
              [...event.target.selectedOptions].map(option => option.value)
            )
          }
          onBlur={() => rules.onBlur('regions')}
        >
          {REGION_SETS.map(set => (
            <option key={set} value={set}>
              {t(`admin.terms.region.${set.toLowerCase()}`)}
            </option>
          ))}
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {`${country.label} (${country.code})`}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

RegionsField.propTypes = {
  form: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The small form dialog Publish opens on a copy being edited: the new
 * version string, `409 unique` at `/version` painted on the field when the
 * copy has already had it, sending
 * `POST /api/admin/terms/{name}/publish?region=&locale=`
 * `{ version, content }`, which writes revision 1 of that version and
 * becomes the live text; a refusal whose every pointer names a member
 * other than `version` is handed to `onRefused` and the dialog closes, so
 * a `422` `token` at `/content` is painted on the field of the form
 * beneath; a `404` says the copy was removed by someone else and reloads
 * the list.
 */
const PublishDialog = ({ document, source, content, onClose, onPublished, onRefused }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ version: '' });
  const [busy, setBusy] = useState(false);
  const guard = useDiscardGuard(form.version !== '', onClose);
  const rules = useFormRules({
    formKey: 'terms',
    schema: PUBLISH_SCHEMA,
    values: form,
    labels: PUBLISH_LABELS,
    idPrefix: 'term-publish',
  });

  const publish = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    publishTerm(
      document.name,
      { version: form.version, content },
      regionOfCopy(source),
      localeOfCopy(source)
    )
      .then(() => {
        notify('success', t('admin.terms.updated'));
        onPublished();
        onClose();
      })
      .catch(error => {
        const entries = error.fieldErrors || [];
        if (error.status === 404) {
          notify('danger', t(copyRefusalKeyOf(error)));
          onPublished();
          onClose();
        } else if (
          entries.length > 0 &&
          entries.every(entry => entry.pointer !== VERSION_POINTER)
        ) {
          onRefused(error);
          onClose();
        } else if (!rules.applyServerErrors(error)) {
          notify('danger', t(refusalKeyOf(error)));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Modal show onHide={guard.close} dialogClassName="form-modal" scrollable>
        <form onSubmit={publish} noValidate data-dialog="term-publish">
          <Modal.Header closeButton>
            <Modal.Title as="h5">{t('admin.terms.publishTitle')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormErrorSummary errors={rules.summary} />
            <Field
              id={rules.idFor('version')}
              label={t('admin.terms.publishVersion')}
              error={rules.errors.version || ''}
            >
              {aria => (
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  value={form.version}
                  onChange={event => setForm({ version: event.target.value })}
                  onBlur={() => rules.onBlur('version')}
                />
              )}
            </Field>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={guard.close}
              disabled={busy}
            >
              {t('admin.buttons.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('admin.terms.publish')}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

PublishDialog.propTypes = {
  document: documentShape.isRequired,
  source: copyShape.isRequired,
  content: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onPublished: PropTypes.func.isRequired,
  onRefused: PropTypes.func.isRequired,
};

const zonesOf = answer =>
  [
    { zone: 'top', html: answer.content_html },
    { zone: 'middle', html: answer.content_middle_html },
    { zone: 'bottom', html: answer.content_bottom_html },
  ].filter(entry => entry.html);

const previewBodyOf = (content, version) => (version ? { content, version } : { content });

/**
 * The editor's preview: the answer of `POST /api/admin/terms/preview` for
 * the content last sent, its zones drawn through the document component
 * with every field a blank, and Refresh preview asking for the content as
 * it stands.
 */
const PreviewPane = ({ answer, busy, onRefresh }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="form-label d-flex align-items-center gap-2">
        <span>{t('admin.terms.preview')}</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          data-action="term-preview-refresh"
          disabled={busy}
          onClick={onRefresh}
        >
          {t('admin.terms.refreshPreview')}
        </button>
      </div>
      <div className="border rounded p-3 term-preview" data-pane="term-preview">
        {answer
          ? zonesOf(answer).map(({ zone, html }) => (
              <MarkdownArticle
                key={zone}
                html={html}
                anchorKey={answer.anchor_key || ''}
                fields={answer.fields || NO_FIELDS}
                fieldsVersion={answer.fields_version}
              />
            ))
          : null}
      </div>
    </>
  );
};

PreviewPane.propTypes = {
  answer: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

const usePreview = ({ opened, form, version, onRefused }) => {
  const [preview, setPreview] = useState({ answer: null, content: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!opened.content.trim()) {
      return undefined;
    }
    let active = true;
    previewTerm(previewBodyOf(opened.content, opened.version))
      .then(answer => {
        if (active) {
          setPreview({ answer, content: opened.content });
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [opened]);

  const ask = onFailure => {
    const { content } = form;
    if (!content.trim()) {
      setPreview({ answer: null, content });
      return;
    }
    setBusy(true);
    previewTerm(previewBodyOf(content, version))
      .then(answer => setPreview({ answer, content }))
      .catch(onFailure)
      .finally(() => setBusy(false));
  };

  const refresh = () => ask(onRefused);

  const refreshWhenChanged = () => {
    if (form.content !== preview.content) {
      ask(() => null);
    }
  };

  return { answer: preview.answer, busy, refresh, refreshWhenChanged };
};

const localeOptionsOf = locale => [...new Set(['', ...LOCALES, locale])];

const PlaceholderHelp = ({ placeholders }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="small text-muted mb-2">
        {t('admin.terms.placeholders')}{' '}
        {placeholders.map(entry => (
          <code key={entry.name} className="me-1" title={entry.description || ''}>
            {`{{${entry.name}}}`}
          </code>
        ))}
      </div>
      <div className="small text-muted mb-2" data-note="term-declared-field">
        {t('admin.terms.declareField')} <code className="me-1">{DECLARE_SYNTAX}</code>
        {t('admin.terms.repeatField')} <code>{REPEAT_SYNTAX}</code>
      </div>
    </>
  );
};

PlaceholderHelp.propTypes = {
  placeholders: PropTypes.arrayOf(placeholderShape).isRequired,
};

/**
 * The copy's Add, Copy (to a new region or language) and Edit dialog:
 * `regions` (the source copy's own set to edit), the copy's language,
 * "Default language" or one of the estate's languages, picked on Add and
 * Copy and fixed on Edit, a new copy's version and the markdown content,
 * saved through `POST /api/admin/terms`; above the content the
 * placeholders of `GET /api/admin/terms/placeholders` and the syntax that
 * declares a field and repeats it; beside the content the preview, the
 * answer of `POST /api/admin/terms/preview` for the unsaved content drawn
 * through the document component, asked for when the dialog opens with
 * content, when the content field loses focus with changed content and
 * by Refresh preview, whose refusal alone paints on the form. A copy
 * being edited draws its `version` read-only
 * instead, since it changes only by publishing, with two footer actions:
 * Save, the default, "Save as a revision of {{version}}",
 * `PATCH /api/admin/terms/{name}?region=&locale=` with `content` and
 * `regions` and never `version` or `locale`, which writes the next
 * revision under the current version and re-prompts nobody; and Publish,
 * which opens `PublishDialog` for the new version string. A `422` paints
 * on the field its pointer names, every `token` entry at `/content` and
 * `dependentRequired` at `/locale` and `/regions` among them, and a `409`
 * `unique` likewise; a `409` `default_copy` draws its own sentence and a
 * `404` on an edit says the copy was removed by someone else and reloads
 * the list.
 */
export const TermCopyDialog = ({
  document,
  source = null,
  editing = false,
  placeholders,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [opened] = useState(() => ({
    regions: source ? regionsOf(source) : [],
    locale: localeOfCopy(source),
    version: source?.version || '',
    content: source?.content || '',
  }));
  const [form, setForm] = useState(opened);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const guard = useDiscardGuard(JSON.stringify(form) !== JSON.stringify(opened), onClose);
  const schema = editing ? SAVE_SCHEMA : COPY_SCHEMA;
  const rules = useFormRules({
    formKey: 'terms',
    schema,
    values: form,
    labels: COPY_LABELS,
    idPrefix: 'term-copy',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const refuse = error => {
    if (!rules.applyServerErrors(error)) {
      notify('danger', t(refusalKeyOf(error)));
    }
  };

  const preview = usePreview({
    opened,
    form,
    version: editing ? source.version : form.version,
    onRefused: refuse,
  });

  const create = () => {
    const { locale, ...copy } = form;
    return createTerm({
      name: document.name,
      friendly_name: document.friendly_name,
      icon: document.icon,
      type: document.type,
      is_public: document.is_public,
      ...copy,
      ...(locale ? { locale } : {}),
    });
  };

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    const call = editing
      ? updateTerm(
          document.name,
          { content: form.content, regions: form.regions },
          regionOfCopy(source),
          localeOfCopy(source)
        )
      : create();
    call
      .then(() => {
        notify('success', t(editing ? 'admin.terms.updated' : 'admin.terms.copies.added'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (editing && error.status === 404) {
          notify('danger', t(copyRefusalKeyOf(error)));
          onSaved();
          onClose();
        } else {
          refuse(error);
        }
      })
      .finally(() => setBusy(false));
  };

  const versionField = editing ? (
    <Field id="term-copy-version-readonly" label={t(COPY_LABELS.version)}>
      {aria => (
        <input {...aria} type="text" className="form-control" value={source.version} readOnly />
      )}
    </Field>
  ) : (
    <TextField name="version" form={form} rules={rules} onChange={onChange} labels={COPY_LABELS} />
  );

  return (
    <>
      <Modal show onHide={guard.close} dialogClassName="form-modal" scrollable>
        <form onSubmit={save} noValidate data-dialog="term-copy">
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {editing
                ? t('admin.terms.editTitle', { name: document.friendly_name || document.name })
                : t('admin.terms.copies.addTitle', {
                    name: document.friendly_name || document.name,
                  })}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormErrorSummary errors={rules.summary} />
            <div className="row">
              <div className="col-md-4">
                <RegionsField form={form} rules={rules} onChange={onChange} />
              </div>
              <div className="col-md-4">
                <SelectField
                  name="locale"
                  form={form}
                  rules={rules}
                  onChange={onChange}
                  labels={COPY_LABELS}
                  options={localeOptionsOf(form.locale)}
                  labelOf={locale => localeOptionLabelOf(t, locale)}
                  disabled={editing}
                />
              </div>
              <div className="col-md-4">{versionField}</div>
            </div>
            <PlaceholderHelp placeholders={placeholders} />
            <div className="row">
              <div className="col-md-6">
                <Field
                  id={rules.idFor('content')}
                  label={t(COPY_LABELS.content)}
                  error={rules.errors.content || ''}
                >
                  {aria => (
                    <textarea
                      {...aria}
                      className="form-control font-monospace"
                      rows="14"
                      value={form.content}
                      onChange={event => onChange('content', event.target.value)}
                      onBlur={() => {
                        rules.onBlur('content');
                        preview.refreshWhenChanged();
                      }}
                    />
                  )}
                </Field>
              </div>
              <div className="col-md-6">
                <PreviewPane
                  answer={preview.answer}
                  busy={preview.busy}
                  onRefresh={preview.refresh}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={guard.close}
              disabled={busy}
            >
              {t('admin.buttons.cancel')}
            </button>
            {editing ? (
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-action="term-copy-publish"
                disabled={busy}
                onClick={() => setPublishing(true)}
              >
                {t('admin.terms.publish')}
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {editing
                ? t('admin.terms.saveAsRevision', { version: source.version })
                : t('admin.terms.save')}
            </button>
          </Modal.Footer>
        </form>
        {publishing ? (
          <PublishDialog
            document={document}
            source={source}
            content={form.content}
            onClose={() => setPublishing(false)}
            onPublished={() => {
              onSaved();
              onClose();
            }}
            onRefused={rules.applyServerErrors}
          />
        ) : null}
      </Modal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

TermCopyDialog.propTypes = {
  document: documentShape.isRequired,
  source: copyShape,
  editing: PropTypes.bool,
  placeholders: PropTypes.arrayOf(placeholderShape).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const RevisionView = ({ document, source, version, revision, onBack }) => {
  const { t } = useTranslation();
  const [row, setRow] = useState('loading');

  useEffect(() => {
    let active = true;
    termRevision(document.name, version, revision, regionOfCopy(source), localeOfCopy(source))
      .then(answer => {
        if (active) {
          setRow(answer);
        }
      })
      .catch(() => {
        if (active) {
          setRow(null);
        }
      });
    return () => {
      active = false;
    };
  }, [document.name, source, version, revision]);

  if (row === 'loading') {
    return <div className="text-muted">{t('loading')}</div>;
  }
  if (!row) {
    return <div className="text-muted">{t('pages.empty')}</div>;
  }
  return (
    <>
      <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
        {t('admin.terms.history')}
      </button>
      <div className="small text-muted mb-2">
        {t('admin.terms.version', { version: row.version })}{' '}
        {t('admin.terms.revision', { revision: row.revision })}
        {row.published_by ? ` · ${row.published_by}` : ''}
        {row.published_at ? (
          <>
            {' · '}
            <DateCell value={row.published_at} />
          </>
        ) : null}
      </div>
      <MarkdownArticle markdown={row.content || ''} />
    </>
  );
};

RevisionView.propTypes = {
  document: documentShape.isRequired,
  source: copyShape.isRequired,
  version: PropTypes.string.isRequired,
  revision: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onBack: PropTypes.func.isRequired,
};

/**
 * The History action on a copy: a list dialog of `GET
 * /api/admin/terms/{name}/history?region=&locale=`, versions newest first
 * with their revisions beneath (revision, published by, published at, the
 * live one marked Current), each revision read from the same copy and
 * opening read-only through the same `MarkdownArticle` the Preview uses.
 */
export const TermHistoryDialog = ({ document, source, onClose }) => {
  const { t } = useTranslation();
  const [state, setState] = useState('loading');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let active = true;
    termHistory(document.name, regionOfCopy(source), localeOfCopy(source))
      .then(answer => {
        if (active) {
          setState(answer);
        }
      })
      .catch(() => {
        if (active) {
          setState(null);
        }
      });
    return () => {
      active = false;
    };
  }, [document.name, source]);

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('admin.terms.historyTitle', { name: document.friendly_name || document.name })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {viewing ? (
          <RevisionView
            document={document}
            source={source}
            version={viewing.version}
            revision={viewing.revision}
            onBack={() => setViewing(null)}
          />
        ) : null}
        {!viewing && state === 'loading' ? <div className="text-muted">{t('loading')}</div> : null}
        {!viewing && state === null ? <div className="text-muted">{t('pages.empty')}</div> : null}
        {!viewing && state && state !== 'loading' ? (
          <div className="d-flex flex-column gap-3">
            {state.versions.map(entry => (
              <div key={entry.version}>
                <div className="fw-bold mb-1">
                  {t('admin.terms.version', { version: entry.version })}
                </div>
                <ul className="list-group">
                  {entry.revisions.map(row => (
                    <li
                      key={row.revision}
                      className="list-group-item d-flex align-items-center gap-2"
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0"
                        onClick={() =>
                          setViewing({ version: entry.version, revision: row.revision })
                        }
                      >
                        {t('admin.terms.revision', { revision: row.revision })}
                      </button>
                      <span className="small text-muted">{row.published_by}</span>
                      <span className="small text-muted">
                        <DateCell value={row.published_at} />
                      </span>
                      {row.current ? (
                        <span className="badge bg-success ms-auto">{t('admin.terms.current')}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

TermHistoryDialog.propTypes = {
  document: documentShape.isRequired,
  source: copyShape.isRequired,
  onClose: PropTypes.func.isRequired,
};
