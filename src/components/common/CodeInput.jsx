import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import FieldError from './FieldError';

const digitsOf = (value, length) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, length);

const replaceAt = (digits, index, digit) =>
  `${digits.slice(0, index).padEnd(index, ' ')}${digit}${digits.slice(index + 1)}`.replace(
    /\s+$/,
    ''
  );

/**
 * A one-time code entry: a `role="group"` of `length` numeric boxes each
 * labelled "Digit n of m", the first carrying `autocomplete="one-time-code"`
 * so a phone's autofill lands, Backspace moving back, the arrows moving
 * between boxes, and a paste of the whole code filling every box and
 * calling `onComplete`. Typed entry never submits on its own; the value is
 * the digits typed so far.
 */
const CodeInput = ({
  id,
  label,
  value,
  onChange,
  onComplete = null,
  length = 6,
  disabled = false,
  error = '',
}) => {
  const { t } = useTranslation();
  const boxes = useRef([]);
  const digits = digitsOf(value, length);
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  const focusBox = index => boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const handleInput = (index, event) => {
    const digit = event.target.value.replace(/\D/g, '').slice(-1);
    const next = digit
      ? replaceAt(digits.padEnd(index, ' '), index, digit)
      : digits.slice(0, index);
    onChange(next.replace(/\s/g, ''));
    if (digit && index < length - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      onChange(digits.slice(0, index - 1));
      focusBox(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = event => {
    const pasted = digitsOf(event.clipboardData.getData('text'), length);
    if (!pasted) {
      return;
    }
    event.preventDefault();
    onChange(pasted);
    focusBox(pasted.length);
    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  return (
    <div className={`field code-input-field${error ? ' field-invalid' : ''}`}>
      <span id={labelId} className="form-label">
        {label}
      </span>
      <div
        className="code-input"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
      >
        {[...Array(length).keys()].map(index => (
          <input
            key={`${id}-${index + 1}`}
            ref={element => {
              boxes.current[index] = element;
            }}
            id={index === 0 ? id : `${id}-${index + 1}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={t('codeInput.digit', { n: index + 1, m: length })}
            aria-invalid={error ? true : undefined}
            value={digits[index] || ''}
            disabled={disabled}
            onChange={event => handleInput(index, event)}
            onKeyDown={event => handleKeyDown(index, event)}
            onPaste={handlePaste}
          />
        ))}
      </div>
      {error ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
};

CodeInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  length: PropTypes.number,
  disabled: PropTypes.bool,
  error: PropTypes.string,
};

export default CodeInput;
