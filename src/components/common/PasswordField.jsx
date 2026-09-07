import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

import Field from './Field';

/**
 * A password field in the auth column: the label, the input, the reveal
 * button (an eye and an eye-off glyph), the hint while there is no error,
 * and, while `onGenerate` is given, the passphrase generator, which loads
 * the EFF wordlist on demand, draws four words joined by dashes and hands
 * the phrase to `onGenerate` for the page to fill and reveal.
 */
const PasswordField = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  revealed,
  onToggleReveal,
  error = '',
  hint = '',
  autoComplete = 'new-password',
  onGenerate = null,
}) => {
  const { t } = useTranslation();

  const generate = async () => {
    const { passphrase } = await import('../../lib/wordlist');
    onGenerate(passphrase());
  };

  return (
    <Field id={id} label={label} hint={hint} error={error} className="auth-field">
      {aria => (
        <>
          <div className="auth-input-wrap auth-input-wrap--password">
            <input
              {...aria}
              name={name}
              type={revealed ? 'text' : 'password'}
              autoComplete={autoComplete}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
            />
            <button
              type="button"
              className="auth-reveal"
              onClick={onToggleReveal}
              aria-label={revealed ? t('passwordField.hide') : t('passwordField.show')}
            >
              {revealed ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {onGenerate ? (
            <div className="auth-row">
              <button type="button" className="auth-link auth-link-muted" onClick={generate}>
                {t('passwordField.generate')}
              </button>
              <span className="auth-hint">{t('passwordField.generated')}</span>
            </div>
          ) : null}
        </>
      )}
    </Field>
  );
};

PasswordField.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  revealed: PropTypes.bool.isRequired,
  onToggleReveal: PropTypes.func.isRequired,
  error: PropTypes.string,
  hint: PropTypes.node,
  autoComplete: PropTypes.string,
  onGenerate: PropTypes.func,
};

export default PasswordField;
