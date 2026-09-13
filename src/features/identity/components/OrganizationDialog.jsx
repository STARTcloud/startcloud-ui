import PropTypes from 'prop-types';
import { useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import AddressFields, {
  EMPTY_ADDRESS,
  addressShape,
} from '../../../components/common/AddressFields';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { NON_BLANK } from '../../../utils/validation';
import { updateOrganization } from '../api/accounts';

export const ACCESS_MODES = ['invite', 'request', 'private'];
export const DEFAULT_ROLES = ['MEMBER', 'ADMIN'];

const ACCESS_MODE_KEYS = {
  private: 'orgConsole.organization.accessModes.private',
  invite: 'orgConsole.organization.accessModes.inviteOnly',
  request: 'orgConsole.organization.accessModes.requestToJoin',
};
const FIRST_FIELD = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
const RECORD_FIELDS = [
  'name',
  'email',
  'website_url',
  'logo_url',
  'description',
  'locale',
  'timezone',
  'telephone',
  'access_mode',
  'default_role',
  'customer_id',
];
const SCHEMA = {
  required: ['name'],
  properties: {
    name: NON_BLANK,
    email: { $ref: '#/$defs/email' },
    website_url: { type: 'string', format: 'uri' },
    logo_url: { type: 'string', format: 'uri' },
    description: { type: 'string' },
    locale: { $ref: '#/$defs/languageTag' },
    timezone: { $ref: '#/$defs/timezone' },
    telephone: { type: 'string' },
    access_mode: { type: 'string', enum: ACCESS_MODES },
    default_role: { type: 'string', enum: DEFAULT_ROLES },
    customer_id: { $ref: '#/$defs/orgCode' },
  },
};
const LABELS = {
  name: 'admin.organizations.field.name',
  email: 'admin.organizations.field.email',
  website_url: 'admin.organizations.field.websiteUrl',
  logo_url: 'admin.organizations.field.logoUrl',
  description: 'admin.organizations.field.description',
  locale: 'admin.organizations.field.locale',
  timezone: 'admin.organizations.field.timezone',
  telephone: 'admin.organizations.field.telephone',
  access_mode: 'admin.organizations.field.accessMode',
  default_role: 'admin.organizations.field.defaultRole',
  customer_id: 'admin.organizations.field.customerId',
};

export const adminOrganizationShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  uuid: PropTypes.string,
  name: PropTypes.string.isRequired,
  personal: PropTypes.bool,
  invite_code: PropTypes.string,
  customer_id: PropTypes.string,
  created_at: PropTypes.string,
  member_count: PropTypes.number,
  email: PropTypes.string,
  website_url: PropTypes.string,
  logo_url: PropTypes.string,
  description: PropTypes.string,
  locale: PropTypes.string,
  timezone: PropTypes.string,
  telephone: PropTypes.string,
  address: addressShape,
  access_mode: PropTypes.oneOf(ACCESS_MODES),
  default_role: PropTypes.oneOf(DEFAULT_ROLES),
});

const timeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
};

const recordOf = org => ({
  ...Object.fromEntries(RECORD_FIELDS.map(field => [field, org[field] || ''])),
  access_mode: ACCESS_MODES.includes(org.access_mode) ? org.access_mode : 'private',
  default_role: DEFAULT_ROLES.includes(org.default_role) ? org.default_role : 'MEMBER',
});

const changedFields = (record, org) =>
  Object.fromEntries(
    Object.entries(record).filter(([field, value]) => value !== (org[field] || ''))
  );

const TextField = ({ name, type = 'text', hint = '', form, rules, onChange, transform }) => {
  const { t } = useTranslation();
  return (
    <Field
      id={rules.idFor(name)}
      label={t(LABELS[name])}
      hint={hint}
      error={rules.errors[name] || ''}
    >
      {aria => (
        <input
          {...aria}
          type={type}
          className="form-control"
          value={form[name]}
          onChange={event =>
            onChange(name, transform ? transform(event.target.value) : event.target.value)
          }
          onBlur={() => rules.onBlur(name)}
        />
      )}
    </Field>
  );
};

TextField.propTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  hint: PropTypes.string,
  form: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  transform: PropTypes.func,
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
 * The Edit dialog of an All organizations row, the form dialog of decision
 * 121 mounted per record: name, email, website URL, logo URL, description,
 * locale, time zone, telephone, the shared `AddressFields`, access mode,
 * default role and customer id, prefilled from the list row, the first
 * field focused on open, validated through `useFormRules` against the
 * issuer's `organization` form, the `422` painted by pointer and the
 * `409 unique` on the name; one `PATCH /api/admin/organizations/{id}` with
 * the changed fields and the address on Save, an empty customer id
 * clearing it.
 */
const OrganizationDialog = ({ org, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const formRef = useRef(null);
  const [form, setForm] = useState(() => recordOf(org));
  const [address, setAddress] = useState(() => ({ ...EMPTY_ADDRESS, ...(org.address || {}) }));
  const [busy, setBusy] = useState(false);
  const zones = useMemo(() => timeZones(), []);
  const rules = useFormRules({
    formKey: 'organization',
    schema: SCHEMA,
    values: form,
    labels: LABELS,
    idPrefix: 'admin-organization',
  });

  const onChange = (name, value) => setForm(current => ({ ...current, [name]: value }));

  const focusFirst = () => formRef.current?.querySelector(FIRST_FIELD)?.focus();

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    updateOrganization(org.id, { ...changedFields(form, org), address })
      .then(() => {
        notify('success', t('admin.organizations.saved'));
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

  const shared = { form, rules, onChange };

  return (
    <Modal show onHide={onClose} onEntered={focusFirst} dialogClassName="form-modal" scrollable>
      <form ref={formRef} onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {t('admin.organizations.edit.title', { org: org.name })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <h5>{t('admin.organizations.edit.details')}</h5>
          <div className="row">
            <div className="col-12">
              <TextField name="name" {...shared} />
            </div>
            <div className="col-md-6">
              <TextField name="email" type="email" {...shared} />
            </div>
            <div className="col-md-6">
              <TextField name="website_url" type="url" {...shared} />
            </div>
            <div className="col-md-6">
              <TextField name="logo_url" type="url" {...shared} />
            </div>
            <div className="col-md-6">
              <TextField name="description" {...shared} />
            </div>
            <div className="col-md-4">
              <TextField name="locale" {...shared} />
            </div>
            <div className="col-md-4">
              <SelectField
                name="timezone"
                options={['', ...zones]}
                labelOf={zone => zone || t('admin.organizations.field.timezoneNone')}
                {...shared}
              />
            </div>
            <div className="col-md-4">
              <TextField name="telephone" type="tel" {...shared} />
            </div>
          </div>
          <h5>{t('admin.organizations.edit.address')}</h5>
          <AddressFields
            value={address}
            onChange={setAddress}
            idPrefix="admin-organization-address"
          />
          <h5>{t('admin.organizations.edit.access')}</h5>
          <div className="row">
            <div className="col-md-4">
              <SelectField
                name="access_mode"
                options={ACCESS_MODES}
                labelOf={mode => t(ACCESS_MODE_KEYS[mode])}
                {...shared}
              />
            </div>
            <div className="col-md-4">
              <SelectField
                name="default_role"
                options={DEFAULT_ROLES}
                labelOf={role => t(`roles.${role.toLowerCase()}`)}
                {...shared}
              />
            </div>
            <div className="col-md-4">
              <TextField
                name="customer_id"
                hint={t('admin.organizations.field.customerIdHint')}
                transform={value => value.toUpperCase()}
                {...shared}
              />
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

OrganizationDialog.propTypes = {
  org: adminOrganizationShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default OrganizationDialog;
