import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import {
  createEmailTemplate,
  emailTemplateHistory,
  emailTemplateRevision,
  publishEmailTemplate,
  updateEmailTemplate,
} from '../api/content';

import DateCell from './DateCell';

export const LOCALES = ['en', 'es'];

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const ARGUMENT_PATTERN = /\{(?<index>\d+)\}/g;

const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ENTITIES[char]);

/**
 * The sandboxed preview's document: the body with every `{n}` the kind's
 * argument list names replaced by the argument's name, HTML-escaped, and
 * any other brace left as typed (decision 164).
 *
 * @param {string} body - The template body
 * @param {Array} args - The kind's arguments `[{ index, name, description }]`
 * @returns {string} The srcdoc
 */
export const previewDocOf = (body, args) => {
  const names = Object.fromEntries(args.map(entry => [String(entry.index), entry.name]));
  return (body || '').replace(ARGUMENT_PATTERN, (match, index) =>
    names[index] === undefined ? match : escapeHtml(names[index])
  );
};

export const kindLabelOf = (t, kind) =>
  t(`admin.emailTemplates.kind.${kind}`, { defaultValue: kind });

export const siteLabelOf = (t, site) => site || t('admin.emailTemplates.everySite');

export const localeLabelOf = (t, locale) => locale || t('admin.emailTemplates.everyLanguage');

export const copyNameOf = (t, template, copy) =>
  [kindLabelOf(t, template.kind), siteLabelOf(t, copy.site), localeLabelOf(t, copy.locale)].join(
    ' · '
  );

export const copyShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  site: PropTypes.string,
  locale: PropTypes.string,
  version: PropTypes.string,
  revision: PropTypes.number,
  subject: PropTypes.string,
  body: PropTypes.string,
  created_by: PropTypes.string,
  updated_at: PropTypes.string,
});

export const templateShape = PropTypes.shape({
  kind: PropTypes.string.isRequired,
  copies: PropTypes.arrayOf(copyShape).isRequired,
});

export const argumentShape = PropTypes.shape({
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
});

export const siteShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

const COPY_LABELS = {
  site: 'admin.emailTemplates.field.site',
  locale: 'admin.emailTemplates.field.locale',
  version: 'admin.emailTemplates.field.version',
  subject: 'admin.emailTemplates.field.subject',
  body: 'admin.emailTemplates.field.body',
};

const COPY_SCHEMA = {
  required: ['version', 'subject', 'body'],
  properties: {
    site: { type: 'string' },
    locale: { type: 'string' },
    version: { type: 'string' },
    subject: { type: 'string' },
    body: { type: 'string' },
  },
};

const SAVE_SCHEMA = {
  required: ['subject', 'body'],
  properties: {
    site: { type: 'string' },
    locale: { type: 'string' },
    subject: { type: 'string' },
    body: { type: 'string' },
  },
};

const PUBLISH_SCHEMA = {
  required: ['version'],
  properties: {
    version: { type: 'string' },
  },
};

const PUBLISH_LABELS = { version: 'admin.emailTemplates.field.version' };

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

const SelectField = ({ name, form, rules, onChange, labels, options, disabled = false }) => {
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
            <option key={option.value} value={option.value}>
              {option.label}
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
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  disabled: PropTypes.bool,
};

const PreviewFrame = ({ body, args }) => {
  const { t } = useTranslation();
  return (
    <iframe
      sandbox=""
      srcDoc={previewDocOf(body, args)}
      title={t('admin.emailTemplates.previewFrame')}
      className="border rounded w-100 email-preview"
    />
  );
};

PreviewFrame.propTypes = {
  body: PropTypes.string.isRequired,
  args: PropTypes.arrayOf(argumentShape).isRequired,
};

/**
 * The Preview action on a copy: a list dialog titled by the copy's subject
 * with its version badge, the body drawn in the sandboxed `iframe` with
 * every `{n}` replaced by its argument's name (decision 164).
 */
export const PreviewDialog = ({ copy, args, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5" className="d-flex flex-wrap align-items-center gap-2">
          <span>{copy.subject || ''}</span>
          <span className="badge bg-secondary">
            {t('admin.emailTemplates.version', { version: copy.version || '' })}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PreviewFrame body={copy.body || ''} args={args} />
      </Modal.Body>
    </Modal>
  );
};

PreviewDialog.propTypes = {
  copy: copyShape.isRequired,
  args: PropTypes.arrayOf(argumentShape).isRequired,
  onClose: PropTypes.func.isRequired,
};

const ArgumentChips = ({ args, onInsert }) => {
  const { t } = useTranslation();
  return (
    <div className="small text-muted mb-2 d-flex flex-wrap align-items-center gap-1">
      <span className="me-1">{t('admin.emailTemplates.arguments')}</span>
      {args.map(entry => (
        <button
          key={entry.index}
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={entry.description || ''}
          aria-label={t('admin.emailTemplates.insertArgument', { name: entry.name })}
          onClick={() => onInsert(entry.index)}
        >
          {`{${entry.index}} ${entry.name}`}
        </button>
      ))}
    </div>
  );
};

ArgumentChips.propTypes = {
  args: PropTypes.arrayOf(argumentShape).isRequired,
  onInsert: PropTypes.func.isRequired,
};

/**
 * The small form dialog Publish opens on a copy being edited: the new
 * version string, `409 unique` at `/version` painted on the field when the
 * copy has already had it, sending
 * `POST /api/admin/email-templates/{kind}/publish?site=&locale=`
 * `{ version, subject, body }`, which writes revision 1 of that version
 * and becomes the live text, notifying nobody (decision 164).
 */
const PublishDialog = ({ template, source, subject, body, onClose, onPublished }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ version: '' });
  const [busy, setBusy] = useState(false);
  const rules = useFormRules({
    formKey: 'emailTemplates',
    schema: PUBLISH_SCHEMA,
    values: form,
    labels: PUBLISH_LABELS,
    idPrefix: 'email-template-publish',
  });

  const publish = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    publishEmailTemplate(
      template.kind,
      { version: form.version, subject, body },
      source.site || '',
      source.locale || ''
    )
      .then(() => {
        notify('success', t('admin.emailTemplates.updated'));
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
          <Modal.Title as="h5">{t('admin.emailTemplates.publishTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('version')}
            label={t('admin.emailTemplates.publishVersion')}
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
            {t('admin.emailTemplates.publish')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

PublishDialog.propTypes = {
  template: templateShape.isRequired,
  source: copyShape.isRequired,
  subject: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onPublished: PropTypes.func.isRequired,
};

const siteOptionsOf = (t, sites) => [
  { value: '', label: t('admin.emailTemplates.everySite') },
  ...sites.map(site => ({ value: site.id, label: `${site.name} (${site.id})` })),
];

const localeOptionsOf = t => [
  { value: '', label: t('admin.emailTemplates.everyLanguage') },
  ...LOCALES.map(code => ({
    value: code,
    label: `${t(`admin.emailTemplates.locale.${code}`)} (${code})`,
  })),
];

/**
 * The copy's Add and Edit dialog: `site` over the keys of the sites config
 * file labelled by name and id plus "Every site", `locale` over the
 * estate's locales plus "Every language" (both fixed while editing, since
 * a copy is keyed by them), a new copy's version, the subject, and the
 * HTML body in a monospace textarea with the kind's argument chips above
 * it, each inserting its `{n}` at the caret, and beside it the sandboxed
 * preview, saved through `POST /api/admin/email-templates`; a copy being
 * edited draws its `version` read-only instead, since it changes only by
 * publishing, with two footer actions: Save, the default, "Save as a
 * revision of {{version}}", `PATCH /api/admin/email-templates/{kind}?site=&locale=`
 * with `subject` and `body` and never `version`, which writes the next
 * revision under the current version; and Publish, which opens
 * `PublishDialog` for the new version string (decision 164).
 */
export const EmailTemplateCopyDialog = ({
  template,
  source = null,
  editing = false,
  args,
  sites,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const bodyRef = useRef(null);
  const [form, setForm] = useState(() => ({
    site: source?.site || '',
    locale: source?.locale || '',
    version: source?.version || '',
    subject: source?.subject || '',
    body: source?.body || '',
  }));
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const schema = editing ? SAVE_SCHEMA : COPY_SCHEMA;
  const rules = useFormRules({
    formKey: 'emailTemplates',
    schema,
    values: form,
    labels: COPY_LABELS,
    idPrefix: 'email-template-copy',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const insertArgument = index => {
    const field = bodyRef.current;
    const token = `{${index}}`;
    const start = field ? field.selectionStart : form.body.length;
    const end = field ? field.selectionEnd : start;
    onChange('body', `${form.body.slice(0, start)}${token}${form.body.slice(end)}`);
    if (field) {
      requestAnimationFrame(() => {
        field.focus();
        field.setSelectionRange(start + token.length, start + token.length);
      });
    }
  };

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    const call = editing
      ? updateEmailTemplate(
          template.kind,
          { subject: form.subject, body: form.body },
          source.site || '',
          source.locale || ''
        )
      : createEmailTemplate({ kind: template.kind, ...form });
    call
      .then(() => {
        notify(
          'success',
          t(editing ? 'admin.emailTemplates.updated' : 'admin.emailTemplates.added')
        );
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

  const title = editing
    ? t('admin.emailTemplates.editTitle', { name: copyNameOf(t, template, source) })
    : t('admin.emailTemplates.addTitle', { name: kindLabelOf(t, template.kind) });

  const versionField = editing ? (
    <Field id="email-template-copy-version-readonly" label={t(COPY_LABELS.version)}>
      {aria => (
        <input {...aria} type="text" className="form-control" value={source.version} readOnly />
      )}
    </Field>
  ) : (
    <TextField name="version" form={form} rules={rules} onChange={onChange} labels={COPY_LABELS} />
  );

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-4">
              <SelectField
                name="site"
                form={form}
                rules={rules}
                onChange={onChange}
                labels={COPY_LABELS}
                options={siteOptionsOf(t, sites)}
                disabled={editing}
              />
            </div>
            <div className="col-md-4">
              <SelectField
                name="locale"
                form={form}
                rules={rules}
                onChange={onChange}
                labels={COPY_LABELS}
                options={localeOptionsOf(t)}
                disabled={editing}
              />
            </div>
            <div className="col-md-4">{versionField}</div>
          </div>
          <TextField
            name="subject"
            form={form}
            rules={rules}
            onChange={onChange}
            labels={COPY_LABELS}
          />
          <ArgumentChips args={args} onInsert={insertArgument} />
          <div className="row">
            <div className="col-md-6">
              <Field
                id={rules.idFor('body')}
                label={t(COPY_LABELS.body)}
                error={rules.errors.body || ''}
              >
                {aria => (
                  <textarea
                    {...aria}
                    ref={bodyRef}
                    className="form-control font-monospace"
                    rows="12"
                    value={form.body}
                    onChange={event => onChange('body', event.target.value)}
                    onBlur={() => rules.onBlur('body')}
                  />
                )}
              </Field>
            </div>
            <div className="col-md-6">
              <div className="form-label">{t('admin.emailTemplates.previewTitle')}</div>
              <PreviewFrame body={form.body} args={args} />
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
              {t('admin.emailTemplates.publish')}
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editing
              ? t('admin.emailTemplates.saveAsRevision', { version: source.version })
              : t('admin.emailTemplates.save')}
          </button>
        </Modal.Footer>
      </form>
      {publishing ? (
        <PublishDialog
          template={template}
          source={source}
          subject={form.subject}
          body={form.body}
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

EmailTemplateCopyDialog.propTypes = {
  template: templateShape.isRequired,
  source: copyShape,
  editing: PropTypes.bool,
  args: PropTypes.arrayOf(argumentShape).isRequired,
  sites: PropTypes.arrayOf(siteShape).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const RevisionView = ({ template, source, args, version, revision, onBack }) => {
  const { t } = useTranslation();
  const [row, setRow] = useState('loading');

  useEffect(() => {
    let active = true;
    emailTemplateRevision(template.kind, version, revision, source.site || '', source.locale || '')
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
  }, [template.kind, source, version, revision]);

  if (row === 'loading') {
    return <div className="text-muted">{t('loading')}</div>;
  }
  if (!row) {
    return <div className="text-muted">{t('pages.empty')}</div>;
  }
  return (
    <>
      <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
        {t('admin.emailTemplates.history')}
      </button>
      <div className="small text-muted mb-2">
        {t('admin.emailTemplates.version', { version: row.version })}{' '}
        {t('admin.emailTemplates.revision', { revision: row.revision })}
        {row.published_by ? ` · ${row.published_by}` : ''}
        {row.published_at ? (
          <>
            {' · '}
            <DateCell value={row.published_at} />
          </>
        ) : null}
      </div>
      <div className="fw-bold mb-2">{row.subject || ''}</div>
      <PreviewFrame body={row.body || ''} args={args} />
    </>
  );
};

RevisionView.propTypes = {
  template: templateShape.isRequired,
  source: copyShape.isRequired,
  args: PropTypes.arrayOf(argumentShape).isRequired,
  version: PropTypes.string.isRequired,
  revision: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onBack: PropTypes.func.isRequired,
};

/**
 * The History action on a copy: a list dialog of `GET
 * /api/admin/email-templates/{kind}/history?site=&locale=`, versions
 * newest first with their revisions beneath (revision, published by,
 * published at, the live one marked Current), each revision opening
 * read-only as its subject over the same sandboxed preview the Preview
 * uses (decision 164).
 */
export const EmailTemplateHistoryDialog = ({ template, source, args, onClose }) => {
  const { t } = useTranslation();
  const [state, setState] = useState('loading');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let active = true;
    emailTemplateHistory(template.kind, source.site || '', source.locale || '')
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
  }, [template.kind, source]);

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('admin.emailTemplates.historyTitle', { name: copyNameOf(t, template, source) })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {viewing ? (
          <RevisionView
            template={template}
            source={source}
            args={args}
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
                  {t('admin.emailTemplates.version', { version: entry.version })}
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
                        {t('admin.emailTemplates.revision', { revision: row.revision })}
                      </button>
                      <span className="small text-muted">{row.published_by}</span>
                      <span className="small text-muted">
                        <DateCell value={row.published_at} />
                      </span>
                      {row.current ? (
                        <span className="badge bg-success ms-auto">
                          {t('admin.emailTemplates.current')}
                        </span>
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

EmailTemplateHistoryDialog.propTypes = {
  template: templateShape.isRequired,
  source: copyShape.isRequired,
  args: PropTypes.arrayOf(argumentShape).isRequired,
  onClose: PropTypes.func.isRequired,
};
