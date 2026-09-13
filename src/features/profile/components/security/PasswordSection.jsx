import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaLock } from 'react-icons/fa6';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import PasswordField from '../../../../components/common/PasswordField';
import SectionCard, { foldsShape } from '../../../../components/common/SectionCard';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useFormRules } from '../../../../hooks/useFormRules';

const SCHEMA = {
  required: ['password', 'confirm'],
  properties: {
    current_password: { type: 'string' },
    password: { type: 'string' },
    confirm: { type: 'string', equals: 'password' },
  },
};
const LABELS = {
  current_password: 'profile.security.password.current',
  password: 'profile.security.password.new',
  confirm: 'profile.security.password.confirm',
};
const EMPTY = { current_password: '', password: '', confirm: '' };

/**
 * The password section of the Security tab: the current password while
 * the account has one, the "No password set" notice and Set password
 * wording otherwise, the new password with its reveal and the passphrase
 * generator, the confirmation as the page's `equals` rule, over
 * `PUT /api/user/password`, stepped up.
 */
const PasswordSection = ({ account, hasPassword, minLength, guard, onSaved, folds }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [values, setValues] = useState(EMPTY);
  const [revealed, setRevealed] = useState(false);
  const rules = useFormRules({
    formKey: 'password',
    schema: SCHEMA,
    values,
    labels: LABELS,
    idPrefix: 'profile-password',
  });

  const change = event => {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
  };

  const toggleReveal = () => setRevealed(previous => !previous);

  const generate = passphrase => {
    setValues(previous => ({ ...previous, password: passphrase, confirm: passphrase }));
    setRevealed(true);
  };

  const submit = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const body = { password: values.password };
    if (hasPassword) {
      body.current_password = values.current_password;
    }
    try {
      await guard(() => account.password(body), t('profile.security.password.reason'));
      setValues(EMPTY);
      rules.reset();
      notify('success', t('profile.security.password.saved'));
      await onSaved();
    } catch (error) {
      if (error?.code === 'step_up_required' || rules.applyServerErrors(error)) {
        return;
      }
      notify('danger', t(errorKeys(error)));
    }
  };

  return (
    <SectionCard
      icon={<FaLock aria-hidden />}
      title={t('profile.security.password.title')}
      folded={folds.folded('password')}
      onFold={() => folds.toggle('password')}
    >
      <form onSubmit={submit} noValidate>
        {hasPassword ? null : (
          <p className="text-body-secondary small">{t('profile.security.password.none')}</p>
        )}
        <FormErrorSummary errors={rules.summary} />
        {hasPassword ? (
          <PasswordField
            id={rules.idFor('current_password')}
            name="current_password"
            label={t(LABELS.current_password)}
            autoComplete="current-password"
            value={values.current_password}
            onChange={change}
            onBlur={() => rules.onBlur('current_password')}
            revealed={revealed}
            onToggleReveal={toggleReveal}
            error={rules.errors.current_password || ''}
          />
        ) : null}
        <PasswordField
          id={rules.idFor('password')}
          name="password"
          label={t(LABELS.password)}
          autoComplete="new-password"
          hint={t('profile.security.password.hint', { count: minLength })}
          value={values.password}
          onChange={change}
          onBlur={() => rules.onBlur('password')}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          error={rules.errors.password || ''}
          onGenerate={generate}
        />
        <PasswordField
          id={rules.idFor('confirm')}
          name="confirm"
          label={t(LABELS.confirm)}
          autoComplete="new-password"
          value={values.confirm}
          onChange={change}
          onBlur={() => rules.onBlur('confirm')}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          error={rules.errors.confirm || ''}
        />
        <button type="submit" className="btn btn-primary mt-2">
          {hasPassword ? t('profile.security.password.change') : t('profile.security.password.set')}
        </button>
      </form>
    </SectionCard>
  );
};

PasswordSection.propTypes = {
  account: PropTypes.shape({ password: PropTypes.func.isRequired }).isRequired,
  hasPassword: PropTypes.bool.isRequired,
  minLength: PropTypes.number.isRequired,
  guard: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default PasswordSection;
