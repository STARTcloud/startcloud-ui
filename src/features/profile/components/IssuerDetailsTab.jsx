import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AddressFields, { EMPTY_ADDRESS } from '../../../components/common/AddressFields';
import CodeInput from '../../../components/common/CodeInput';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PhoneInput from '../../../components/common/PhoneInput';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';

import ManageLink from './ManageLink';

const SALUTATIONS = ['Mr', 'Mrs', 'Ms', 'Mx', 'Dr', 'Prof'];
const GENDERS = ['male', 'female'];
const CUSTOM = 'custom';
const DETAIL_FIELDS = [
  'given_name',
  'family_name',
  'middle_name',
  'salutation',
  'gender',
  'website',
  'birthdate',
];
const DETAILS_SCHEMA = {
  properties: {
    given_name: { type: 'string' },
    family_name: { type: 'string' },
    middle_name: { type: 'string' },
    salutation: { type: 'string' },
    gender: { type: 'string' },
    website: { type: 'string' },
    birthdate: { type: 'string' },
  },
};
const DETAILS_LABELS = {
  given_name: 'profile.details.givenName',
  family_name: 'profile.details.familyName',
  middle_name: 'profile.details.middleName',
  salutation: 'profile.details.salutation.label',
  gender: 'profile.details.gender.label',
  website: 'profile.details.website',
  birthdate: 'profile.details.birthdate',
};
const ADDRESS_FIELDS = ['line1', 'line2', 'country', 'state', 'city', 'postal_code'];
const ADDRESS_LABELS = {
  line1: 'line1',
  line2: 'line2',
  country: 'country',
  state: 'state',
  city: 'city',
  postal_code: 'postalCode',
};

const detailsOf = profile =>
  Object.fromEntries(DETAIL_FIELDS.map(field => [field, profile?.[field] || '']));

const changedOf = (values, profile) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([field, value]) => value !== (profile?.[field] || ''))
      .map(([field, value]) => [field, value || null])
  );

const choiceOf = (value, options) => {
  if (!value) {
    return '';
  }
  return options.includes(value) ? value : CUSTOM;
};

const ChoiceField = ({ field, value, options, labelOf, rules, onChange }) => {
  const { t } = useTranslation();
  const choice = choiceOf(value, options);
  return (
    <>
      <Field
        id={rules.idFor(field)}
        label={t(DETAILS_LABELS[field])}
        error={rules.errors[field] || ''}
      >
        {aria => (
          <select
            {...aria}
            className="form-select"
            value={choice}
            onChange={event => onChange(event.target.value === CUSTOM ? ' ' : event.target.value)}
            onBlur={() => rules.onBlur(field)}
          >
            <option value="">{t(`profile.details.${field}.none`)}</option>
            {options.map(option => (
              <option key={option} value={option}>
                {labelOf(option)}
              </option>
            ))}
            <option value={CUSTOM}>{t(`profile.details.${field}.custom`)}</option>
          </select>
        )}
      </Field>
      {choice === CUSTOM ? (
        <Field
          id={`${rules.idFor(field)}-custom`}
          label={t(`profile.details.${field}.customLabel`)}
          error=""
        >
          {aria => (
            <input
              {...aria}
              type="text"
              className="form-control"
              value={value.trim()}
              onChange={event => onChange(event.target.value || ' ')}
            />
          )}
        </Field>
      ) : null}
    </>
  );
};

ChoiceField.propTypes = {
  field: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelOf: PropTypes.func.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

const PhoneChange = ({ account, guard, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [number, setNumber] = useState('');
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');

  const send = async () => {
    try {
      await account.phone.send(number);
      setSent(number);
      setCode('');
      notify('success', t('profile.details.codeSent'));
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  const verify = async () => {
    try {
      await guard(() => account.phone.verify(sent, code), t('profile.details.phoneReason'));
      notify('success', t('profile.details.phoneChanged'));
      await onDone();
    } catch (error) {
      if (error?.code !== 'step_up_required') {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  return (
    <div className="border rounded p-3 mb-3">
      <Field id="profile-phone" label={t('profile.details.mobile')}>
        {aria => <PhoneInput id={aria.id} aria={aria} value={number} onChange={setNumber} />}
      </Field>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={send}
        disabled={!number}
      >
        {t('profile.details.sendCode')}
      </button>
      {sent && sent !== number ? (
        <p className="small text-body-secondary mt-2 mb-0">{t('profile.details.numberChanged')}</p>
      ) : null}
      {sent ? (
        <div className="mt-3">
          <CodeInput
            id="profile-phone-code"
            label={t('profile.details.code')}
            value={code}
            onChange={setCode}
            onComplete={setCode}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary mt-2"
            onClick={verify}
            disabled={sent !== number || code.length < 6}
          >
            {t('profile.details.verify')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

PhoneChange.propTypes = {
  account: PropTypes.shape({
    phone: PropTypes.shape({
      send: PropTypes.func.isRequired,
      verify: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

const addressOf = profile => ({ ...EMPTY_ADDRESS, ...(profile?.address || {}) });

const NAME_SCHEMA = { properties: { name: { type: 'string' } } };
const NAME_LABELS = { name: 'profile.fields.displayName' };

const DisplayNameForm = ({ account, profile, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [values, setValues] = useState(() => ({ name: profile.name || '' }));
  const rules = useFormRules({
    formKey: 'displayName',
    schema: NAME_SCHEMA,
    values,
    labels: NAME_LABELS,
    idPrefix: 'profile-details',
  });

  const save = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await account.details({ name: values.name });
      notify('success', t('profile.messages.nameChanged'));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  return (
    <div className="tab-pane fade show active">
      <form onSubmit={save} noValidate className="mb-4">
        <div className="col-md-4">
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('name')}
            label={t('profile.fields.displayName')}
            hint={t('profile.fields.displayNameHint')}
            error={rules.errors.name || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={values.name}
                onChange={event => setValues({ name: event.target.value })}
                onBlur={() => rules.onBlur('name')}
                placeholder={profile.username || ''}
              />
            )}
          </Field>
          <button type="submit" className="btn btn-primary">
            {t('profile.buttons.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

DisplayNameForm.propTypes = {
  account: PropTypes.shape({ details: PropTypes.func.isRequired }).isRequired,
  profile: PropTypes.shape({ name: PropTypes.string, username: PropTypes.string }).isRequired,
  onSaved: PropTypes.func.isRequired,
};

const ReadOnlyField = ({ id, label, value }) => (
  <Field id={id} label={label}>
    {aria => <input {...aria} type="text" className="form-control" value={value} readOnly />}
  </Field>
);

ReadOnlyField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
};

const choiceLabel = (field, value, t) => {
  if (!value) {
    return t(`profile.details.${field}.none`);
  }
  const options = field === 'salutation' ? SALUTATIONS : GENDERS;
  if (!options.includes(value)) {
    return value.trim();
  }
  return field === 'salutation'
    ? t(`profile.details.salutation.${value.toLowerCase()}`)
    : t(`profile.details.gender.${value}`);
};

const readOnlyValue = (field, value, t) =>
  field === 'salutation' || field === 'gender' ? choiceLabel(field, value, t) : value;

const ReadOnlyDetails = ({ account, profile }) => {
  const { t } = useTranslation();
  const address = addressOf(profile);
  const mobile = profile.mobile_number || null;
  return (
    <div className="tab-pane fade show active">
      <SectionHeading
        title={t('profile.details.title')}
        actions={<ManageLink account={account} />}
      />
      <div className="row">
        {DETAIL_FIELDS.map(field => (
          <div key={field} className="col-md-6">
            <ReadOnlyField
              id={`profile-details-${field}`}
              label={t(DETAILS_LABELS[field])}
              value={readOnlyValue(field, profile[field] || '', t)}
            />
          </div>
        ))}
        <div className="col-md-6">
          <ReadOnlyField
            id="profile-details-email"
            label={t('profile.details.email')}
            value={profile.email || ''}
          />
        </div>
        <div className="col-md-6">
          <ReadOnlyField
            id="profile-details-mobile"
            label={t('profile.details.mobile')}
            value={mobile?.masked || mobile?.number || t('profile.details.noMobile')}
          />
        </div>
      </div>
      <h5>{t('profile.address.title')}</h5>
      <div className="row">
        {ADDRESS_FIELDS.map(field => (
          <div key={field} className={field === 'line1' ? 'col-12' : 'col-md-6'}>
            <ReadOnlyField
              id={`profile-address-${field}`}
              label={t(`profile.address.${ADDRESS_LABELS[field]}`)}
              value={address[field] || ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

ReadOnlyDetails.propTypes = {
  account: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
};

const DetailsForm = ({ account, profile, guard, placesKey, onSaved, onChangeEmail }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [values, setValues] = useState(() => detailsOf(profile));
  const [address, setAddress] = useState(() => addressOf(profile));
  const [changingPhone, setChangingPhone] = useState(false);
  const rules = useFormRules({
    schema: DETAILS_SCHEMA,
    values,
    labels: DETAILS_LABELS,
    idPrefix: 'profile-details',
  });

  const set = (field, value) => setValues(previous => ({ ...previous, [field]: value }));

  const save = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await account.details(changedOf(values, profile));
      await account.address(address);
      notify('success', t('profile.details.saved'));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const clearAddress = async () => {
    try {
      await account.address(EMPTY_ADDRESS);
      setAddress(EMPTY_ADDRESS);
      notify('success', t('profile.address.saved'));
      await onSaved();
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  const textField = (field, type = 'text', autoComplete = undefined) => (
    <Field
      id={rules.idFor(field)}
      label={t(DETAILS_LABELS[field])}
      error={rules.errors[field] || ''}
    >
      {aria => (
        <input
          {...aria}
          type={type}
          className="form-control"
          autoComplete={autoComplete}
          value={values[field]}
          onChange={event => set(field, event.target.value)}
          onBlur={() => rules.onBlur(field)}
        />
      )}
    </Field>
  );

  const mobile = profile.mobile_number || null;

  return (
    <div className="tab-pane fade show active">
      <form onSubmit={save} noValidate className="mb-4">
        <FormErrorSummary errors={rules.summary} />
        <div className="row">
          <div className="col-md-6">{textField('given_name', 'text', 'given-name')}</div>
          <div className="col-md-6">{textField('family_name', 'text', 'family-name')}</div>
          <div className="col-md-6">
            <ChoiceField
              field="salutation"
              value={values.salutation}
              options={SALUTATIONS}
              labelOf={option => t(`profile.details.salutation.${option.toLowerCase()}`)}
              rules={rules}
              onChange={value => set('salutation', value)}
            />
          </div>
          <div className="col-md-6">{textField('middle_name', 'text', 'additional-name')}</div>
          <div className="col-md-6">
            <ChoiceField
              field="gender"
              value={values.gender}
              options={GENDERS}
              labelOf={option => t(`profile.details.gender.${option}`)}
              rules={rules}
              onChange={value => set('gender', value)}
            />
          </div>
          <div className="col-md-6">{textField('website', 'url', 'url')}</div>
          <div className="col-md-6">{textField('birthdate', 'date', 'bday')}</div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-details-email">
                {t('profile.details.email')}
              </label>
              <div className="d-flex gap-2">
                <input
                  id="profile-details-email"
                  type="email"
                  className="form-control"
                  value={profile.email || ''}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary text-nowrap"
                  onClick={onChangeEmail}
                >
                  {t('profile.details.change')}
                </button>
              </div>
            </div>
          </div>
        </div>
        <h5>{t('profile.details.mobile')}</h5>
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <span className="badge bg-secondary">
            {mobile?.masked || t('profile.details.noMobile')}
          </span>
          {mobile?.verified ? (
            <span className="badge bg-success">{t('profile.details.verified')}</span>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setChangingPhone(previous => !previous)}
          >
            {t('profile.details.change')}
          </button>
        </div>
        {changingPhone ? (
          <PhoneChange
            account={account}
            guard={guard}
            onDone={async () => {
              setChangingPhone(false);
              await onSaved();
            }}
          />
        ) : null}
        <h5>{t('profile.address.title')}</h5>
        <AddressFields
          value={address}
          onChange={setAddress}
          idPrefix="profile-address"
          placesKey={placesKey}
        />
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            {t('profile.buttons.save')}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearAddress}>
            {t('profile.address.clear')}
          </button>
        </div>
      </form>
    </div>
  );
};

DetailsForm.propTypes = {
  account: PropTypes.shape({
    details: PropTypes.func.isRequired,
    address: PropTypes.func.isRequired,
    phone: PropTypes.object.isRequired,
  }).isRequired,
  profile: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  placesKey: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
  onChangeEmail: PropTypes.func.isRequired,
};

/**
 * The Profile section, one field list on every host, the identity
 * provider's (OpenID Connect Core 1.0 §5.1, the `profile`, `email`,
 * `phone` and `address` scopes): while the adapter is `readOnly` the
 * record belongs to an identity provider and every field draws as a
 * `readonly` input, the salutation and gender as their labels, the
 * address as its parts, under a `SectionHeading` whose action is the
 * Manage at identity provider link; while the adapter carries `address`
 * and `phone`, the seven details of `PATCH /api/user`, the read-only
 * email with a Change link to the Security section's email card, the
 * masked mobile with Change opening the phone entry and the code, and
 * the address block over `PUT /api/user/address`, one Save writing the
 * details and the address together and Clear address emptying the
 * address at once; on a UI backend whose adapter carries `details`
 * alone, the display-name form over that one call; the page remounts it
 * with every re-read of the record.
 */
const IssuerDetailsTab = ({
  account,
  profile,
  guard,
  placesKey,
  readOnly,
  onSaved,
  onChangeEmail,
}) => {
  if (readOnly) {
    return <ReadOnlyDetails account={account} profile={profile} />;
  }
  if (!account.address || !account.phone) {
    return <DisplayNameForm account={account} profile={profile} onSaved={onSaved} />;
  }
  return (
    <DetailsForm
      account={account}
      profile={profile}
      guard={guard}
      placesKey={placesKey}
      onSaved={onSaved}
      onChangeEmail={onChangeEmail}
    />
  );
};

IssuerDetailsTab.propTypes = {
  account: PropTypes.shape({
    details: PropTypes.func,
    address: PropTypes.func,
    phone: PropTypes.object,
  }).isRequired,
  profile: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  placesKey: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onSaved: PropTypes.func.isRequired,
  onChangeEmail: PropTypes.func.isRequired,
};

export default IssuerDetailsTab;
