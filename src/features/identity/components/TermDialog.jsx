import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import { TERM_ICON_NAMES } from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { loadCountries } from '../../../lib/countries';
import { createTerm, publishTerm, termHistory, termRevision, updateTerm } from '../api/content';

import DateCell from './DateCell';

export const TERM_TYPES = ['CLIENT', 'SITE', 'BOTH'];

export const REGION_SETS = ['EU', 'EEA', 'UK'];

export const regionsOf = row => (Array.isArray(row?.regions) ? row.regions : []);

export const regionOfCopy = copy => regionsOf(copy)[0] || '';

export const defaultCopyOf = document =>
  (document.copies || []).find(copy => regionsOf(copy).length === 0) || null;

export const copyShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regions: PropTypes.arrayOf(PropTypes.string),
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
    version: { type: 'string' },
    content: { type: 'string' },
  },
};

const SAVE_SCHEMA = {
  required: ['content'],
  properties: {
    regions: { type: 'array', items: { $ref: '#/$defs/region' } },
    content: { type: 'string' },
  },
};

const PUBLISH_SCHEMA = {
  required: ['version'],
  properties: {
    version: { type: 'string' },
  },
};

const PUBLISH_LABELS = { version: 'admin.terms.field.version' };

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

const SelectField = ({ name, form, rules, onChange, labels, options, labelOf }) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(labels[name])} error={rules.errors[name] || ''}>
      {aria => (
        <select
          {...aria}
          className="form-select"
          value={form[name]}
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
};

/**
 * The document's Create and Edit dialog: name (fixed while editing),
 * display name, the icon picked from the estate's glyph set, type and
 * public, the fields decision 157 keeps at the document's own level and
 * writes to every copy through `POST` or `PATCH /api/admin/terms/{name}`.
 */
export const TermDocumentDialog = ({ document = null, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const editing = document !== null;
  const [form, setForm] = useState(() => ({
    name: document?.name || '',
    friendly_name: document?.friendly_name || '',
    icon: TERM_ICON_NAMES.includes(document?.icon) ? document.icon : 'file-text',
    type: TERM_TYPES.includes(document?.type) ? document.type : 'SITE',
    is_public: Boolean(document?.is_public),
  }));
  const [busy, setBusy] = useState(false);
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
        if (!rules.applyServerErrors(error)) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={save} noValidate>
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
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t('admin.buttons.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('admin.buttons.save')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
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
 * `POST /api/admin/terms/{name}/publish?region=` `{ version, content }`,
 * which writes revision 1 of that version and becomes the live text
 * (decision 161).
 */
const PublishDialog = ({ document, source, content, onClose, onPublished }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ version: '' });
  const [busy, setBusy] = useState(false);
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
    publishTerm(document.name, { version: form.version, content }, regionOfCopy(source))
      .then(() => {
        notify('success', t('admin.terms.updated'));
        onPublished();
        onClose();
      })
      .catch(error => {
        if (!rules.applyServerErrors(error)) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={publish} noValidate>
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
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t('admin.buttons.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('admin.terms.publish')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

PublishDialog.propTypes = {
  document: documentShape.isRequired,
  source: copyShape.isRequired,
  content: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onPublished: PropTypes.func.isRequired,
};

/**
 * The copy's Add, Copy (to a new region) and Edit dialog: `regions`
 * (required to add or duplicate, the source copy's own set to edit),
 * a new copy's version and the markdown content with a live preview,
 * saved through `POST /api/admin/terms`; a copy being edited draws its
 * `version` read-only instead, since it changes only by publishing
 * (decision 161), with two footer actions: Save, the default, "Save as a
 * revision of {{version}}", `PATCH /api/admin/terms/{name}?region=` with
 * `content` and `regions` and never `version`, which writes the next
 * revision under the current version and re-prompts nobody; and Publish,
 * which opens `PublishDialog` for the new version string.
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
  const [form, setForm] = useState(() => ({
    regions: source ? regionsOf(source) : [],
    version: source?.version || '',
    content: source?.content || '',
  }));
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const schema = editing ? SAVE_SCHEMA : COPY_SCHEMA;
  const rules = useFormRules({
    formKey: 'terms',
    schema,
    values: form,
    labels: COPY_LABELS,
    idPrefix: 'term-copy',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

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
          regionOfCopy(source)
        )
      : createTerm({
          name: document.name,
          friendly_name: document.friendly_name,
          icon: document.icon,
          type: document.type,
          is_public: document.is_public,
          ...form,
        });
    call
      .then(() => {
        notify('success', t(editing ? 'admin.terms.updated' : 'admin.terms.copies.added'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (!rules.applyServerErrors(error)) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {editing
              ? t('admin.terms.editTitle', { name: document.friendly_name || document.name })
              : t('admin.terms.copies.addTitle', { name: document.friendly_name || document.name })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-6">
              {editing ? (
                <Field id="term-copy-version-readonly" label={t(COPY_LABELS.version)}>
                  {aria => (
                    <input
                      {...aria}
                      type="text"
                      className="form-control"
                      value={source.version}
                      readOnly
                    />
                  )}
                </Field>
              ) : (
                <Field
                  id={rules.idFor('version')}
                  label={t(COPY_LABELS.version)}
                  error={rules.errors.version || ''}
                >
                  {aria => (
                    <input
                      {...aria}
                      type="text"
                      className="form-control"
                      value={form.version}
                      onChange={event => onChange('version', event.target.value)}
                      onBlur={() => rules.onBlur('version')}
                    />
                  )}
                </Field>
              )}
            </div>
            <div className="col-md-6">
              <RegionsField form={form} rules={rules} onChange={onChange} />
            </div>
          </div>
          <div className="small text-muted mb-2">
            {t('admin.terms.placeholders')}{' '}
            {placeholders.map(entry => (
              <code key={entry.name} className="me-1" title={entry.description || ''}>
                {`{{${entry.name}}}`}
              </code>
            ))}
          </div>
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
                    onBlur={() => rules.onBlur('content')}
                  />
                )}
              </Field>
            </div>
            <div className="col-md-6">
              <div className="form-label">{t('admin.terms.preview')}</div>
              <div className="border rounded p-3 term-preview">
                <ReactMarkdown>{form.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t('admin.buttons.cancel')}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn btn-outline-secondary"
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
        />
      ) : null}
    </Modal>
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
    termRevision(document.name, version, revision, regionOfCopy(source))
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
 * /api/admin/terms/{name}/history?region=`, versions newest first with
 * their revisions beneath (revision, published by, published at, the
 * live one marked Current), each revision opening read-only through the
 * same `MarkdownArticle` the Preview uses (decision 161).
 */
export const TermHistoryDialog = ({ document, source, onClose }) => {
  const { t } = useTranslation();
  const [state, setState] = useState('loading');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let active = true;
    termHistory(document.name, regionOfCopy(source))
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
