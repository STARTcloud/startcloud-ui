import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

import Field from './Field';

export const configFieldShape = PropTypes.shape({
  pointer: PropTypes.string.isRequired,
  key: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  format: PropTypes.string.isRequired,
  enum: PropTypes.array,
  default: PropTypes.any,
  writeOnly: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
  action: PropTypes.object,
  dependsOn: PropTypes.string.isRequired,
  showWhen: PropTypes.array,
  requiresRestart: PropTypes.bool.isRequired,
  restartReason: PropTypes.string.isRequired,
  deprecated: PropTypes.bool.isRequired,
  required: PropTypes.bool.isRequired,
  order: PropTypes.number,
  index: PropTypes.number,
  items: PropTypes.object,
  additionalProperties: PropTypes.object,
  propertyNames: PropTypes.object,
});

const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;
const NUMERIC_TYPES = ['integer', 'number'];

const isUnset = value => value === null || value === undefined;

const textOf = value => (isUnset(value) ? '' : String(value));

const castTo = (type, raw) => {
  if (!NUMERIC_TYPES.includes(type)) {
    return raw;
  }
  if (raw === '') {
    return null;
  }
  return NUMBER_RE.test(raw) ? Number(raw) : raw;
};

const typedValue = (field, raw) => castTo(field.type, raw);

const memberValue = (field, raw) => castTo(field.items?.type || 'string', raw);

const defaultText = value => {
  if (isUnset(value)) {
    return '';
  }
  return Array.isArray(value) ? value.join(',') : String(value);
};

const placeholderOf = field => (isUnset(field.default) ? undefined : defaultText(field.default));

const controlProps = PropTypes.shape({
  id: PropTypes.string.isRequired,
  'aria-invalid': PropTypes.bool,
  'aria-describedby': PropTypes.string,
  'aria-errormessage': PropTypes.string,
});

const controlShape = {
  field: configFieldShape.isRequired,
  value: PropTypes.any,
  aria: controlProps.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};

const BooleanControl = ({ field, value, aria, onChange, onBlur }) => (
  <div className="form-check form-switch">
    <input
      {...aria}
      type="checkbox"
      className="form-check-input"
      checked={Boolean(value)}
      disabled={field.readOnly}
      onChange={event => onChange(event.target.checked)}
      onBlur={onBlur}
    />
  </div>
);

BooleanControl.propTypes = controlShape;

const SelectControl = ({ field, value, aria, onChange, onBlur }) => (
  <select
    {...aria}
    className="form-select"
    value={textOf(value)}
    disabled={field.readOnly}
    onChange={event => onChange(typedValue(field, event.target.value))}
    onBlur={onBlur}
  >
    {isUnset(value) ? <option value="" /> : null}
    {field.enum.map(option => (
      <option key={String(option)} value={String(option)}>
        {String(option)}
      </option>
    ))}
  </select>
);

SelectControl.propTypes = controlShape;

const MultiSelectControl = ({ field, value, aria, onChange, onBlur }) => (
  <select
    {...aria}
    multiple
    className="form-select"
    value={(Array.isArray(value) ? value : []).map(String)}
    disabled={field.readOnly}
    onChange={event =>
      onChange([...event.target.selectedOptions].map(option => memberValue(field, option.value)))
    }
    onBlur={onBlur}
  >
    {field.items.enum.map(option => (
      <option key={String(option)} value={String(option)}>
        {String(option)}
      </option>
    ))}
  </select>
);

MultiSelectControl.propTypes = controlShape;

const PasswordControl = ({ field, value, aria, onChange, onBlur }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-group">
      <input
        {...aria}
        type={shown ? 'text' : 'password'}
        className="form-control"
        value={textOf(value)}
        placeholder={placeholderOf(field)}
        readOnly={field.readOnly}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <button
        className="btn btn-outline-secondary"
        type="button"
        onClick={() => setShown(current => !current)}
      >
        {shown ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
};

PasswordControl.propTypes = controlShape;

const ArrayControl = ({ field, value, aria, onChange, onBlur }) => {
  const { t } = useTranslation();
  return (
    <input
      {...aria}
      type="text"
      className="form-control"
      value={Array.isArray(value) ? value.join(',') : textOf(value)}
      readOnly={field.readOnly}
      placeholder={placeholderOf(field) ?? t('configField.commaSeparated')}
      onChange={event => {
        const raw = event.target.value;
        onChange(raw === '' ? [] : raw.split(',').map(member => memberValue(field, member)));
      }}
      onBlur={onBlur}
    />
  );
};

ArrayControl.propTypes = controlShape;

const TextControl = ({ field, value, aria, onChange, onBlur }) => (
  <input
    {...aria}
    type="text"
    inputMode={NUMERIC_TYPES.includes(field.type) ? 'numeric' : undefined}
    className={`form-control${field.readOnly ? ' readonly-input' : ''}`}
    value={textOf(value)}
    placeholder={placeholderOf(field)}
    readOnly={field.readOnly}
    onChange={event => onChange(typedValue(field, event.target.value))}
    onBlur={onBlur}
  />
);

TextControl.propTypes = controlShape;

const controlFor = field => {
  if (field.type === 'boolean') {
    return BooleanControl;
  }
  if (field.enum) {
    return SelectControl;
  }
  if (field.writeOnly) {
    return PasswordControl;
  }
  if (field.type === 'array') {
    return Array.isArray(field.items?.enum) ? MultiSelectControl : ArrayControl;
  }
  return TextControl;
};

const showsDefaultHint = field =>
  !isUnset(field.default) && (field.type === 'boolean' || Array.isArray(field.enum));

/**
 * One configuration schema property drawn by its `type` through `Field`:
 * a switch for a boolean, a select over `enum`, a password with a reveal
 * for `writeOnly`, a comma list evaluated per member for an array whose
 * `items` is a scalar type, a multi-select for an array whose `items`
 * carries `enum`, a text input with `inputmode="numeric"` for a number and
 * a text input otherwise; the label is the property's `title` with a
 * restart badge when it `requiresRestart` and a deprecation note when it is
 * `deprecated`, the hint its `description`; `default` is the placeholder
 * of a text or numeric control and the `configManager.defaultHint` line
 * after the description on a boolean or an `enum`, whose control stays
 * unset until set; a `readOnly` control is disabled; a JSON `null` draws
 * as an empty control, a cleared text control answers `""` and a cleared
 * numeric control `null`; `action` is the property-level action element
 * drawn beside the control.
 */
const ConfigField = ({ field, id, value, error = '', onChange, onBlur, action = null }) => {
  const { t } = useTranslation();
  const Control = controlFor(field);
  const label = (
    <>
      {field.title}
      {field.requiresRestart && (
        <span className="badge text-bg-warning ms-2">{t('configManager.restartBadge')}</span>
      )}
      {field.deprecated && (
        <span className="badge text-bg-secondary ms-2">{t('configManager.deprecated')}</span>
      )}
    </>
  );
  const hint = showsDefaultHint(field) ? (
    <>
      {field.description}
      <span className="d-block">
        {t('configManager.defaultHint', { value: defaultText(field.default) })}
      </span>
    </>
  ) : (
    field.description
  );
  return (
    <Field id={id} label={label} hint={hint} error={error} required={field.required}>
      {aria => {
        const control = (
          <Control field={field} value={value} aria={aria} onChange={onChange} onBlur={onBlur} />
        );
        return action ? (
          <>
            {control}
            {action}
          </>
        ) : (
          control
        );
      }}
    </Field>
  );
};

ConfigField.propTypes = {
  field: configFieldShape.isRequired,
  id: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  action: PropTypes.node,
};

export default ConfigField;
