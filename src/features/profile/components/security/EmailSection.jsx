import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CodeInput from '../../../../components/common/CodeInput';
import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useFormRules } from '../../../../hooks/useFormRules';

const SCHEMA = { required: ['new_email'], properties: { new_email: { type: 'string' } } };
const LABELS = { new_email: 'profile.security.email.new' };

/**
 * The email section of the Security tab: the new address and Send code
 * over `POST /api/user/email/request`, stepped up, then the code over
 * `POST /api/user/email/verify`.
 */
const EmailSection = ({ account, guard, onSaved, sectionRef }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [values, setValues] = useState({ new_email: '' });
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const rules = useFormRules({
    formKey: 'email',
    schema: SCHEMA,
    values,
    labels: LABELS,
    idPrefix: 'profile-email',
  });

  const request = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    try {
      await guard(
        () => account.email.request(values.new_email),
        t('profile.security.email.reason')
      );
      setSent(true);
      setCode('');
      notify('success', t('profile.security.email.sent'));
    } catch (error) {
      if (error?.code === 'step_up_required' || rules.applyServerErrors(error)) {
        return;
      }
      notify('danger', t(errorKeys(error)));
    }
  };

  const verify = async () => {
    try {
      await account.email.verify(code);
      setSent(false);
      setValues({ new_email: '' });
      rules.reset();
      notify('success', t('profile.security.email.changed'));
      await onSaved();
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  return (
    <div className="mb-4" ref={sectionRef} id="profile-email-section">
      <h5>{t('profile.security.email.title')}</h5>
      <form onSubmit={request} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('new_email')}
          label={t(LABELS.new_email)}
          error={rules.errors.new_email || ''}
        >
          {aria => (
            <div className="d-flex gap-2">
              <input
                {...aria}
                type="email"
                className="form-control"
                autoComplete="email"
                value={values.new_email}
                onChange={event => setValues({ new_email: event.target.value })}
                onBlur={() => rules.onBlur('new_email')}
              />
              <button type="submit" className="btn btn-outline-primary text-nowrap">
                {t('profile.security.email.send')}
              </button>
            </div>
          )}
        </Field>
      </form>
      {sent ? (
        <div>
          <CodeInput
            id="profile-email-code"
            label={t('profile.security.email.code')}
            value={code}
            onChange={setCode}
            onComplete={setCode}
          />
          <button
            type="button"
            className="btn btn-primary mt-2"
            onClick={verify}
            disabled={code.length < 6}
          >
            {t('profile.security.email.verify')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

EmailSection.propTypes = {
  account: PropTypes.shape({
    email: PropTypes.shape({
      request: PropTypes.func.isRequired,
      verify: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  sectionRef: PropTypes.shape({ current: PropTypes.any }),
};

export default EmailSection;
