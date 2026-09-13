import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { TERM_ICON_NAMES } from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { loadCountries } from '../../../lib/countries';
import { createTerm, updateTerm } from '../api/content';

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
 * The copy's Add, Copy (to a new region) and Edit dialog: `regions`
 * (required to add or duplicate, the source copy's own set to edit),
 * version and the markdown content with a live preview, saved through
 * `POST /api/admin/terms` for a new copy or
 * `PATCH /api/admin/terms/{name}?region=` for the copy being edited.
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
  const rules = useFormRules({
    formKey: 'terms',
    schema: COPY_SCHEMA,
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
      ? updateTerm(document.name, form, regionOfCopy(source))
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
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('admin.buttons.save')}
          </button>
        </Modal.Footer>
      </form>
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
