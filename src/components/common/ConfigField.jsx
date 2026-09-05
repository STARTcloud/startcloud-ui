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
  writeOnly: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
  upload: PropTypes.bool.isRequired,
  dependsOn: PropTypes.string.isRequired,
  showWhen: PropTypes.array,
  requiresRestart: PropTypes.bool.isRequired,
  required: PropTypes.bool.isRequired,
  additionalProperties: PropTypes.object,
});

const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;
const NUMERIC_TYPES = ['integer', 'number'];

const textOf = value => (value === null || value === undefined ? '' : String(value));

const typedValue = (field, raw) =>
  NUMERIC_TYPES.includes(field.type) && NUMBER_RE.test(raw) ? Number(raw) : raw;

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
    {field.enum.map(option => (
      <option key={String(option)} value={String(option)}>
        {String(option)}
      </option>
    ))}
  </select>
);

SelectControl.propTypes = controlShape;

const PasswordControl = ({ field, value, aria, onChange, onBlur }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-group">
      <input
        {...aria}
        type={shown ? 'text' : 'password'}
        className="form-control"
        value={textOf(value)}
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
      placeholder={t('configField.commaSeparated')}
      onChange={event => onChange(event.target.value.split(','))}
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
    readOnly={field.readOnly}
    onChange={event => onChange(typedValue(field, event.target.value))}
    onBlur={onBlur}
  />
);

TextControl.propTypes = controlShape;

const UploadControl = ({ field, value, aria, onChange, onBlur, onUpload }) => {
  const { t } = useTranslation();
  return (
    <div className="input-group">
      <input
        {...aria}
        type="text"
        className="form-control"
        value={textOf(value)}
        readOnly={field.readOnly}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <label className="btn btn-outline-secondary">
        {t('admin.buttons.upload')}
        <input type="file" hidden onChange={event => onUpload(event.target.files[0])} />
      </label>
    </div>
  );
};

UploadControl.propTypes = { ...controlShape, onUpload: PropTypes.func.isRequired };

const controlFor = (field, onUpload) => {
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
    return ArrayControl;
  }
  return field.upload && onUpload ? UploadControl : TextControl;
};

/**
 * One configuration schema property drawn by its `type` and `format`
 * through `Field`: a switch for a boolean, a select over `enum`, a
 * password with a reveal for `writeOnly`, a comma list for an array of
 * scalars, a text input with an upload button for `upload` when the caller
 * hands an `onUpload`, and a text input otherwise; the label is the
 * property's `title` with a restart badge when it `requiresRestart`, the
 * hint its `description`.
 */
const ConfigField = ({ field, id, value, error = '', onChange, onBlur, onUpload = null }) => {
  const { t } = useTranslation();
  const Control = controlFor(field, onUpload);
  const label = field.requiresRestart ? (
    <>
      {field.title}
      <span className="badge text-bg-warning ms-2">{t('configManager.restartBadge')}</span>
    </>
  ) : (
    field.title
  );
  return (
    <Field id={id} label={label} hint={field.description} error={error} required={field.required}>
      {aria => (
        <Control
          field={field}
          value={value}
          aria={aria}
          onChange={onChange}
          onBlur={onBlur}
          onUpload={onUpload}
        />
      )}
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
  onUpload: PropTypes.func,
};

export default ConfigField;
