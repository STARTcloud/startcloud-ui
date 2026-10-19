import PropTypes from 'prop-types';

import Field from '../../../components/common/Field';
import RevealInput from '../../../components/common/RevealInput';
import { formRulesShape } from '../../../hooks/useFormRules';

const valueAt = (draft, name) =>
  name.split('/').reduce((node, segment) => (node ? node[segment] : undefined), draft);

const textOf = (draft, name) => {
  const value = valueAt(draft, name);
  return value === undefined || value === null ? '' : String(value);
};

const optionShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

/**
 * One labelled text control of a certs form, its label and its error
 * read from the form's rules; `onChange(name, value)` answers the typed
 * value.
 */
export const TextField = ({
  name,
  draft,
  rules,
  onChange,
  hint = '',
  type = 'text',
  className = 'mb-3',
  placeholder = undefined,
  min = undefined,
  onKeyDown = undefined,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    hint={hint}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <input
        {...aria}
        type={type}
        className="form-control"
        name={name}
        value={textOf(draft, name)}
        placeholder={placeholder}
        min={min}
        onChange={event => onChange(name, event.target.value)}
        onBlur={() => rules.onBlur(name)}
        onKeyDown={onKeyDown}
      />
    )}
  </Field>
);

TextField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.node,
  type: PropTypes.string,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  min: PropTypes.number,
  onKeyDown: PropTypes.func,
};

/**
 * One labelled textarea of a certs form.
 */
export const TextAreaField = ({
  name,
  draft,
  rules,
  onChange,
  rows = 3,
  className = 'mb-3',
  placeholder = undefined,
  monospace = false,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <textarea
        {...aria}
        className={monospace ? 'form-control font-monospace' : 'form-control'}
        name={name}
        value={textOf(draft, name)}
        rows={rows}
        placeholder={placeholder}
        onChange={event => onChange(name, event.target.value)}
        onBlur={() => rules.onBlur(name)}
      />
    )}
  </Field>
);

TextAreaField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.number,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  monospace: PropTypes.bool,
};

/**
 * One labelled select of a certs form over `options`, each a value and
 * its label; `blank`, where given, is the label of an empty first option.
 */
export const SelectField = ({
  name,
  options,
  draft,
  rules,
  onChange,
  hint = '',
  className = 'mb-3',
  blank = '',
  disabled = false,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    hint={hint}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <select
        {...aria}
        className="form-select"
        name={name}
        value={textOf(draft, name)}
        disabled={disabled}
        onChange={event => onChange(name, event.target.value)}
        onBlur={() => rules.onBlur(name)}
      >
        {blank ? <option value="">{blank}</option> : null}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </Field>
);

SelectField.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(optionShape).isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.node,
  className: PropTypes.string,
  blank: PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * One labelled secret of a certs form, the shared reveal input.
 */
export const SecretField = ({
  name,
  draft,
  rules,
  onChange,
  hint = '',
  className = 'mb-3',
  autoComplete = 'new-password',
  onKeyDown = undefined,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    hint={hint}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <div onBlur={() => rules.onBlur(name)} onKeyDown={onKeyDown} role="presentation">
        <RevealInput
          id={aria.id}
          name={name}
          value={textOf(draft, name)}
          autoComplete={autoComplete}
          onChange={event => onChange(name, event.target.value)}
        />
      </div>
    )}
  </Field>
);

SecretField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.node,
  className: PropTypes.string,
  autoComplete: PropTypes.string,
  onKeyDown: PropTypes.func,
};

/**
 * One labelled switch of a certs form over a boolean member.
 */
export const SwitchField = ({
  name,
  draft,
  rules,
  onChange,
  hint = '',
  className = 'mb-3',
  disabled = false,
}) => (
  <Field
    id={rules.idFor(name)}
    label={rules.labelFor(name)}
    hint={hint}
    error={rules.errors[name] || ''}
    className={className}
  >
    {aria => (
      <div className="form-check form-switch">
        <input
          {...aria}
          type="checkbox"
          className="form-check-input"
          name={name}
          checked={Boolean(valueAt(draft, name))}
          disabled={disabled}
          onChange={event => onChange(name, event.target.checked)}
          onBlur={() => rules.onBlur(name)}
        />
      </div>
    )}
  </Field>
);

SwitchField.propTypes = {
  name: PropTypes.string.isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
