import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaOpenid, FaPlus, FaShieldHalved, FaTrash } from 'react-icons/fa6';

import ConfigField from '../../../components/common/ConfigField';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { fieldOf } from '../utils/schemaSections';

const OIDC_PROVIDER_KEY = 'oidc-provider';
const LABELS = { name: 'oidc.form.name.label' };

const defaultOf = property => {
  if (property.default !== undefined) {
    return property.default;
  }
  return property.type === 'boolean' ? false : '';
};

const emptyForm = schema => ({
  name: '',
  ...Object.fromEntries(
    Object.entries(schema.properties || {}).map(([key, property]) => [key, defaultOf(property)])
  ),
});

const formOf = (providerName, provider, schema) => ({
  ...emptyForm(schema),
  ...provider,
  name: providerName,
});

const itemOf = form => Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'name'));

const itemErrors = (error, providerName) => {
  const prefix = `/auth/oidc/providers/${providerName}`;
  return {
    fieldErrors: (error.fieldErrors || []).map(entry =>
      String(entry.pointer || '').startsWith(prefix)
        ? { ...entry, pointer: entry.pointer.slice(prefix.length) }
        : entry
    ),
  };
};

const formSchema = ({ schema, taken, editing, scope }) => ({
  required: ['name', ...(schema.required || [])],
  properties: {
    name: {
      $ref: '#/$defs/providerName',
      custom: value =>
        !editing && taken.includes(value) ? { rule: 'unique', params: { scope, value } } : null,
    },
    ...(schema.properties || {}),
  },
});

const ProviderCard = ({ providerName, provider, onEdit }) => {
  const { t } = useTranslation();
  return (
    <div className="col-md-6 mb-3">
      <button
        type="button"
        className="card border-secondary w-100 text-start"
        onClick={() => onEdit(providerName, provider)}
      >
        <div className="card-header">
          <h6 className="mb-0">
            <FaOpenid className="me-2" />
            {provider.display_name || providerName}
            {provider.enabled && <span className="badge bg-success ms-2">{t('oidc.enabled')}</span>}
          </h6>
        </div>
        <div className="card-body">
          <small className="text-muted">
            <strong>{t('oidc.issuer')}:</strong> {provider.issuer}
            <br />
            <strong>{t('oidc.clientId')}:</strong> {provider.client_id}
            <br />
            <strong>{t('oidc.scope')}:</strong> {provider.scope}
          </small>
        </div>
      </button>
    </div>
  );
};

ProviderCard.propTypes = {
  providerName: PropTypes.string.isRequired,
  provider: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
};

const ProviderForm = ({ form, schema, rules, editing, busy, onChange }) => {
  const { t } = useTranslation();
  const fields = Object.entries(schema.properties || {}).map(([key, property], index) =>
    fieldOf({
      pointer: `/${key}`,
      key,
      property,
      required: (schema.required || []).includes(key),
      index,
    })
  );
  return (
    <div className="row">
      <div className="col-md-6">
        <Field
          id={rules.idFor('name')}
          label={t('oidc.form.name.label')}
          hint={t('oidc.form.name.hint')}
          error={rules.errors.name || ''}
          required
        >
          {aria => (
            <input
              {...aria}
              type="text"
              className="form-control"
              placeholder={t('oidc.form.name.placeholder')}
              value={form.name}
              onChange={e => onChange('name', e.target.value.toLowerCase())}
              onBlur={() => rules.onBlur('name')}
              disabled={busy || editing}
            />
          )}
        </Field>
      </div>
      {fields.map(field => (
        <div key={field.key} className={field.type === 'boolean' ? 'col-md-12' : 'col-md-6'}>
          <ConfigField
            field={field}
            id={rules.idFor(field.key)}
            value={form[field.key]}
            error={rules.errors[field.key] || ''}
            onChange={value => onChange(field.key, value)}
            onBlur={() => rules.onBlur(field.key)}
          />
        </div>
      ))}
    </div>
  );
};

ProviderForm.propTypes = {
  form: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  editing: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The OIDC providers block of the auth configuration: one card per entry
 * of the `providers` map opening the add-or-edit dialog, whose form is
 * drawn from the map's item schema (`additionalProperties`) through
 * `ConfigField` and validated through `useFormRules`, the delete
 * confirmation, every change written back through `onProvidersUpdate`
 * with the whole map.
 */
const OidcProviders = ({ providers, schema, onProvidersUpdate }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => emptyForm(schema));
  const [busy, setBusy] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  const taken = useMemo(() => Object.keys(providers), [providers]);
  const scope = t('oidc.title');
  const rulesSchema = useMemo(
    () => formSchema({ schema, taken, editing: Boolean(editingProvider), scope }),
    [schema, taken, editingProvider, scope]
  );
  const rules = useFormRules({
    schema: rulesSchema,
    values: form,
    labels: LABELS,
    idPrefix: 'oidc',
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingProvider(null);
  };

  const openAdd = () => {
    setEditingProvider(null);
    setForm(emptyForm(schema));
    rules.reset();
    setShowModal(true);
  };

  const openEdit = (providerName, provider) => {
    setEditingProvider(providerName);
    setForm(formOf(providerName, provider, schema));
    rules.reset();
    setShowModal(true);
  };

  const onChange = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const save = async e => {
    e.preventDefault();
    if (!rules.validateAll()) {
      return;
    }

    try {
      setBusy(true);
      notify('info', editingProvider ? t('oidc.messages.updating') : t('oidc.messages.adding'), {
        key: OIDC_PROVIDER_KEY,
      });
      await onProvidersUpdate({ ...providers, [form.name]: itemOf(form) });
      notify(
        'success',
        t('oidc.messages.success', {
          displayName: form.display_name || form.name,
          action: editingProvider ? t('oidc.actions.updated') : t('oidc.actions.added'),
        }),
        { key: OIDC_PROVIDER_KEY }
      );
      closeModal();
      setForm(emptyForm(schema));
    } catch (error) {
      if (!rules.applyServerErrors(itemErrors(error, form.name))) {
        notify(
          'danger',
          t('oidc.errors.apiError', {
            action: editingProvider ? t('oidc.actions.updating') : t('oidc.actions.adding'),
            error: error.serverMessage || error.message,
          }),
          { key: OIDC_PROVIDER_KEY }
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const askDelete = () => {
    setProviderToDelete(editingProvider);
    closeModal();
    setShowDeleteModal(true);
  };

  const closeDelete = () => {
    setShowDeleteModal(false);
    setProviderToDelete(null);
  };

  const confirmDelete = async () => {
    if (!providerToDelete) {
      return;
    }
    try {
      notify('info', t('oidc.messages.deleting'), { key: OIDC_PROVIDER_KEY });
      const remaining = Object.fromEntries(
        Object.entries(providers).filter(([name]) => name !== providerToDelete)
      );
      await onProvidersUpdate(remaining);
      notify('success', t('oidc.messages.deleteSuccess', { providerName: providerToDelete }), {
        key: OIDC_PROVIDER_KEY,
      });
    } catch (error) {
      notify(
        'danger',
        t('oidc.errors.deleteError', { error: error.serverMessage || error.message }),
        { key: OIDC_PROVIDER_KEY }
      );
    } finally {
      closeDelete();
    }
  };

  const submitLabel = () => {
    if (busy) {
      return editingProvider ? t('oidc.buttons.updating') : t('oidc.buttons.adding');
    }
    return editingProvider ? t('oidc.buttons.update') : t('oidc.buttons.add');
  };

  return (
    <>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaShieldHalved className="me-2" />
            {t('oidc.title')}
            <span className="badge bg-light text-dark ms-2">
              {t('oidc.providerCount', { count: taken.length })}
            </span>
          </h6>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
            <FaPlus className="me-1" />
            {t('oidc.buttons.add')}
          </button>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">{t('oidc.description')}</p>
          {taken.length > 0 ? (
            <div className="row">
              {Object.entries(providers).map(([providerName, provider]) => (
                <ProviderCard
                  key={providerName}
                  providerName={providerName}
                  provider={provider}
                  onEdit={openEdit}
                />
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              <FaCircleInfo className="me-2" />
              {t('oidc.noProvidersConfigured')}
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={closeModal} size="lg">
        <form onSubmit={save} noValidate>
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              <FaOpenid className="me-2" />
              {editingProvider ? t('oidc.modal.editTitle') : t('oidc.modal.addTitle')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-4">{t('oidc.modal.description')}</p>
            <FormErrorSummary errors={rules.summary} />
            <ProviderForm
              form={form}
              schema={schema}
              rules={rules}
              editing={Boolean(editingProvider)}
              busy={busy}
              onChange={onChange}
            />
            <div className="alert alert-info mt-3" role="status">
              <h6>{t('oidc.instructions.title')}</h6>
              <ol className="mb-0">
                <li>{t('oidc.instructions.step1')}</li>
                <li>
                  {t('oidc.instructions.step2')}{' '}
                  <code>{`${window.location.origin}/api/auth/oidc/callback`}</code>{' '}
                  {t('oidc.instructions.step2_cont')}
                </li>
                <li>{t('oidc.instructions.step3')}</li>
                <li>{t('oidc.instructions.step4')}</li>
                <li>{t('oidc.instructions.step5')}</li>
              </ol>
            </div>
          </Modal.Body>
          <Modal.Footer>
            {editingProvider && (
              <button
                type="button"
                className="btn btn-danger me-auto"
                onClick={askDelete}
                disabled={busy}
              >
                <FaTrash className="me-1" />
                {t('oidc.buttons.delete')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeModal}
              disabled={busy}
            >
              {t('admin.buttons.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" />}
              {submitLabel()}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      <ConfirmModal
        show={showDeleteModal}
        handleClose={closeDelete}
        handleConfirm={confirmDelete}
        title={t('oidc.deleteModal.title')}
        message={t('oidc.deleteModal.message', { providerName: providerToDelete })}
      />
    </>
  );
};

OidcProviders.propTypes = {
  providers: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  onProvidersUpdate: PropTypes.func.isRequired,
};

export default OidcProviders;
