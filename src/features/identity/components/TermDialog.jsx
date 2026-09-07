import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaFileContract,
  FaFileLines,
  FaLock,
  FaScaleBalanced,
  FaShield,
  FaShieldHalved,
} from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { createTerm, updateTerm } from '../api/content';

export const TERM_ICONS = {
  'file-text': FaFileLines,
  'file-contract': FaFileContract,
  shield: FaShield,
  'shield-lock': FaShieldHalved,
  lock: FaLock,
  scale: FaScaleBalanced,
};

export const TERM_TYPES = ['client', 'site', 'both'];

export const termShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  friendly_name: PropTypes.string,
  icon: PropTypes.string,
  version: PropTypes.string,
  type: PropTypes.string,
  is_public: PropTypes.bool,
  display_order: PropTypes.number,
  content: PropTypes.string,
  created_by: PropTypes.string,
  updated_at: PropTypes.string,
});

export const placeholderShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  scope: PropTypes.string,
  description: PropTypes.string,
});

const SCHEMA = {
  required: ['name', 'friendly_name', 'version'],
  properties: {
    name: { $ref: '#/$defs/slug' },
    friendly_name: { type: 'string' },
    icon: { $ref: '#/$defs/iconName' },
    version: { type: 'string' },
    type: { type: 'string', enum: TERM_TYPES },
    is_public: { type: 'boolean' },
    display_order: { type: 'integer' },
    content: { type: 'string' },
  },
};

const LABELS = {
  name: 'admin.terms.field.name',
  friendly_name: 'admin.terms.field.displayName',
  icon: 'admin.terms.field.icon',
  version: 'admin.terms.field.version',
  type: 'admin.terms.field.type',
  is_public: 'admin.terms.field.public',
  display_order: 'admin.terms.field.order',
  content: 'admin.terms.field.content',
};

const EMPTY = {
  name: '',
  friendly_name: '',
  icon: 'file-text',
  version: '1.0',
  type: 'site',
  is_public: false,
  display_order: 0,
  content: '',
};

const formOf = term => ({
  name: term.name || '',
  friendly_name: term.friendly_name || '',
  icon: TERM_ICONS[term.icon] ? term.icon : 'file-text',
  version: term.version || '',
  type: TERM_TYPES.includes(term.type) ? term.type : 'site',
  is_public: Boolean(term.is_public),
  display_order: Number(term.display_order) || 0,
  content: term.content || '',
});

const TextField = ({ name, form, rules, onChange, readOnly = false }) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(LABELS[name])} error={rules.errors[name] || ''}>
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
  readOnly: PropTypes.bool,
};

const SelectField = ({ name, form, rules, onChange, options, labelOf }) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(LABELS[name])} error={rules.errors[name] || ''}>
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
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelOf: PropTypes.func.isRequired,
};

/**
 * The Create and Edit dialog of the Terms page, mounted per opening: name
 * as a slug (read-only while editing), display name, the icon picked
 * from the estate's glyph set and stored as its name, version, type,
 * public, order, and the markdown content in a textarea with its preview
 * beside it and the placeholder help from the placeholders call;
 * validated through `useFormRules` against the issuer's `terms` form, one
 * `POST` or `PATCH` on Save.
 */
const TermDialog = ({ term = null, placeholders, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState(() => (term ? formOf(term) : EMPTY));
  const [busy, setBusy] = useState(false);
  const editing = term !== null;
  const rules = useFormRules({
    formKey: 'terms',
    schema: SCHEMA,
    values: form,
    labels: LABELS,
    idPrefix: 'term',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    const call = editing ? updateTerm(term.name, form) : createTerm(form);
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
    <Modal show onHide={onClose} size="xl">
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {editing
              ? t('admin.terms.editTitle', { name: term.name })
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
                readOnly={editing}
              />
            </div>
            <div className="col-md-6">
              <TextField name="friendly_name" form={form} rules={rules} onChange={onChange} />
            </div>
            <div className="col-md-4">
              <SelectField
                name="icon"
                form={form}
                rules={rules}
                onChange={onChange}
                options={Object.keys(TERM_ICONS)}
                labelOf={name => name}
              />
            </div>
            <div className="col-md-4">
              <TextField name="version" form={form} rules={rules} onChange={onChange} />
            </div>
            <div className="col-md-4">
              <SelectField
                name="type"
                form={form}
                rules={rules}
                onChange={onChange}
                options={TERM_TYPES}
                labelOf={type => t(`admin.terms.type.${type}`)}
              />
            </div>
            <div className="col-md-4">
              <Field
                id={rules.idFor('display_order')}
                label={t(LABELS.display_order)}
                error={rules.errors.display_order || ''}
              >
                {aria => (
                  <input
                    {...aria}
                    type="number"
                    className="form-control"
                    value={form.display_order}
                    onChange={event => onChange('display_order', Number(event.target.value) || 0)}
                    onBlur={() => rules.onBlur('display_order')}
                  />
                )}
              </Field>
            </div>
            <div className="col-md-8 d-flex align-items-center">
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
                label={t(LABELS.content)}
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

TermDialog.propTypes = {
  term: termShape,
  placeholders: PropTypes.arrayOf(placeholderShape).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default TermDialog;
