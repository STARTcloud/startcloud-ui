import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

/**
 * A secret field with a reveal toggle, the one shared input of the
 * estate for a key or a password typed outside the auth column: the
 * input as `password` until the eye is pressed, the button's tooltip
 * saying which way it turns.
 */
const RevealInput = ({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = undefined,
  autoComplete = 'new-password',
  minLength = undefined,
  name = undefined,
  className = 'form-control',
}) => {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <div className="input-group">
      <input
        id={id}
        name={name}
        className={className}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        data-tool="reveal"
        onClick={() => setShown(current => !current)}
        title={t(shown ? 'common.revealInput.hidePassword' : 'common.revealInput.showPassword')}
        aria-label={t(
          shown ? 'common.revealInput.hidePassword' : 'common.revealInput.showPassword'
        )}
        disabled={disabled}
      >
        {shown ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
      </button>
    </div>
  );
};

RevealInput.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string,
  minLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  className: PropTypes.string,
};

export default RevealInput;
