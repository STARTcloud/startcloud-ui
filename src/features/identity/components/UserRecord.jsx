import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import IssuerDetailsTab from '../../profile/components/IssuerDetailsTab';
import PreferencesTab from '../../profile/components/PreferencesTab';

import { usersAdapterShape } from './UserActions';

const PREFS_KEY = 'table_prefs_admin_user';
const EMAIL_SCHEMA = { required: ['email'], properties: { email: { $ref: '#/$defs/email' } } };
const EMAIL_LABELS = { email: 'profile.details.email' };

const isStepUp = error => error?.code === 'step_up_required';

const usePlacesKey = places => {
  const [key, setKey] = useState('');
  useEffect(() => {
    if (!places) {
      return undefined;
    }
    let mounted = true;
    places()
      .then(data => {
        if (mounted && typeof data?.key === 'string') {
          setKey(data.key);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [places]);
  return key;
};

const EmailDialog = ({ initial, save, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ email: initial });
  const [busy, setBusy] = useState(false);
  const rules = useFormRules({
    formKey: 'email',
    schema: EMAIL_SCHEMA,
    values: form,
    labels: EMAIL_LABELS,
    idPrefix: 'admin-user-email',
  });

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    save(form.email)
      .then(() => {
        notify('success', t('admin.users.record.emailSaved'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (!isStepUp(error) && !rules.applyServerErrors(error)) {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('admin.users.record.emailTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('email')}
            label={t(EMAIL_LABELS.email)}
            error={rules.errors.email || ''}
          >
            {aria => (
              <input
                {...aria}
                type="email"
                className="form-control"
                autoComplete="off"
                value={form.email}
                onChange={event => setForm({ email: event.target.value })}
                onBlur={() => rules.onBlur('email')}
              />
            )}
          </Field>
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

EmailDialog.propTypes = {
  initial: PropTypes.string.isRequired,
  save: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

const PasswordChangeSwitch = ({ required, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="form-check form-switch">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        id="admin-user-password-change"
        checked={required}
        onChange={event => onChange(event.target.checked)}
      />
      <label className="form-check-label" htmlFor="admin-user-password-change">
        {t('admin.users.record.passwordChange')}
      </label>
      <div className="form-text">{t('admin.users.record.passwordChangeHint')}</div>
    </div>
  );
};

PasswordChangeSwitch.propTypes = {
  required: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The editable sections of one account's record page on the identity
 * provider, under the read-only rows: the Profile card drawing the
 * shared `IssuerDetailsTab` over an `account` adapter bound to this id,
 * every write stepped up (the detail members through the record `PATCH`,
 * the address `PUT`, the mobile as one plain field saved with the form
 * through the phone `PUT`, the email through its own dialog over the
 * email `PUT`), the Preferences card drawing the shared preferences
 * section with the record's own language and theme saved with the rest
 * through the preferences `PATCH` while the adapter carries it, and the
 * Sign-in card with the "Require a password change at next sign-in"
 * switch writing `password_change_required` through the record
 * `PATCH`; drawn only while the record carries `profile` and the
 * adapter the record writes, and never on the admin's own record, which
 * the issuer refuses `403 own_account` and the profile page serves.
 */
const UserRecord = ({ user, adapter, viewer, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const folds = useFolds(PREFS_KEY);
  const placesKey = usePlacesKey(adapter.places || null);
  const [changingEmail, setChangingEmail] = useState(false);
  const reason = t('admin.users.record.stepUpReason');
  const own = Boolean(viewer?.email) && user.username === viewer.email;
  const editable = Boolean(user.profile && adapter.address && adapter.phone && adapter.email);

  const account = useMemo(
    () => ({
      profile: () => Promise.resolve(user.profile),
      mutability: 'readWrite',
      details: patch => guard(() => adapter.update(user.id, patch), reason),
      address: body => guard(() => adapter.address(user.id, body), reason),
      phone: { set: number => guard(() => adapter.phone(user.id, number), reason) },
      email: { request: address => guard(() => adapter.email(user.id, address), reason) },
      preferences: adapter.preferences
        ? patch => guard(() => adapter.preferences(user.id, patch), reason)
        : undefined,
    }),
    [adapter, guard, reason, user.id, user.profile]
  );
  const preferencesProfile = useMemo(
    () => ({ ...user.profile, preferences: user.preferences || user.profile?.preferences || {} }),
    [user.profile, user.preferences]
  );

  if (own || !editable) {
    return null;
  }

  const setPasswordChange = required =>
    guard(() => adapter.update(user.id, { password_change_required: required }), reason)
      .then(() => {
        notify('success', t('admin.users.record.passwordChangeSaved'));
        onSaved();
      })
      .catch(error => {
        if (!isStepUp(error)) {
          notify('danger', t(errorKeys(error)));
        }
      });

  return (
    <>
      <SectionCard
        title={t('admin.users.record.profile')}
        folded={folds.folded('profile')}
        onFold={() => folds.toggle('profile')}
      >
        <IssuerDetailsTab
          account={account}
          profile={user.profile}
          guard={guard}
          placesKey={placesKey}
          readOnly={false}
          onSaved={onSaved}
          onChangeEmail={() => setChangingEmail(true)}
        />
      </SectionCard>
      {account.preferences ? (
        <div className="mb-3">
          <PreferencesTab
            account={account}
            profile={preferencesProfile}
            readOnly={false}
            onSaved={onSaved}
          />
        </div>
      ) : null}
      <SectionCard
        title={t('admin.users.record.signIn')}
        folded={folds.folded('signIn')}
        onFold={() => folds.toggle('signIn')}
      >
        <PasswordChangeSwitch
          required={Boolean(user.password_change_required)}
          onChange={setPasswordChange}
        />
      </SectionCard>
      {changingEmail ? (
        <EmailDialog
          initial={user.profile.email || ''}
          save={account.email.request}
          onClose={() => setChangingEmail(false)}
          onSaved={onSaved}
        />
      ) : null}
    </>
  );
};

UserRecord.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string.isRequired,
    profile: PropTypes.object,
    preferences: PropTypes.object,
    password_change_required: PropTypes.bool,
  }).isRequired,
  adapter: usersAdapterShape.isRequired,
  viewer: PropTypes.shape({ email: PropTypes.string }),
  onSaved: PropTypes.func.isRequired,
};

export default UserRecord;
