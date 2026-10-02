import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDice } from 'react-icons/fa6';

import RevealInput from '../../../components/common/RevealInput';
import {
  DSL_TYPES,
  dslConfiguration,
  evaluateShowIf,
  pruneHidden,
  roleFlagScope,
  rowsFor,
  seedAnswers,
  validateAnswers,
  validateField,
  visibility,
} from '../utils/provisionerFieldDsl';

export {
  DSL_TYPES,
  dslConfiguration,
  evaluateShowIf,
  pruneHidden,
  roleFlagScope,
  seedAnswers,
  validateAnswers,
  validateField,
  visibility,
};

const SECRET_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%^*-_=+';

const SECRET_LENGTH = 24;

const TEXTAREA_ROWS = 4;

const generateSecret = length => {
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map(byte => SECRET_ALPHABET[byte % SECRET_ALPHABET.length]).join('');
};

const PasswordInput = ({ field, fieldId, value, error, onChange, disabled }) => {
  const { t } = useTranslation();
  const input = (
    <RevealInput
      id={fieldId}
      className={`form-control ${error ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    />
  );
  if (!field.generate) {
    return input;
  }
  return (
    <div className="d-flex gap-2 align-items-start">
      <div className="flex-grow-1">{input}</div>
      <button
        type="button"
        className="btn btn-outline-secondary"
        title={t('provisioning.provisionerFieldDsl.generateRandomValue')}
        onClick={() => onChange(generateSecret(field.generate.length || SECRET_LENGTH))}
        disabled={disabled}
      >
        <FaDice aria-hidden="true" />
      </button>
    </div>
  );
};

PasswordInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const SelectInput = ({ field, fieldId, rows, value, error, onChange, disabled }) => {
  const { t } = useTranslation();
  if (rows.length === 0 && field.options_source) {
    return (
      <input
        id={fieldId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        type="text"
        placeholder={t('provisioning.provisionerFieldDsl.noneListedPlaceholder', {
          source: field.options_source,
        })}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }
  const commit = picked => {
    if (picked === '') {
      onChange(undefined);
      return;
    }
    const match = rows.find(row => String(row.value) === picked);
    onChange(match ? match.value : picked);
  };
  const unlisted =
    value !== undefined && value !== '' && !rows.some(row => String(row.value) === String(value));
  return (
    <select
      id={fieldId}
      className={`form-select ${error ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={event => commit(event.target.value)}
      disabled={disabled}
    >
      <option value="">{t('provisioning.provisionerFieldDsl.selectOption')}</option>
      {unlisted ? <option value={value}>{String(value)}</option> : null}
      {rows.map(row => (
        <option key={String(row.value)} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  );
};

SelectInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const MultiselectInput = ({ field, fieldId, rows, value, error, onChange, disabled }) => {
  const { t } = useTranslation();
  const picks = Array.isArray(value) ? value : [];
  if (rows.length === 0) {
    return (
      <p className="form-text text-muted mb-0">
        {field.options_source
          ? t('provisioning.provisionerFieldDsl.noOptionsInventoryEmpty', {
              source: field.options_source,
            })
          : t('provisioning.provisionerFieldDsl.noOptionsDeclared')}
      </p>
    );
  }
  return (
    <div className={error ? 'border border-danger rounded p-2' : ''}>
      {rows.map(row => {
        const checked = picks.some(pick => String(pick) === String(row.value));
        const optionId = `${fieldId}-${String(row.value)}`;
        return (
          <div className="form-check form-check-inline" key={String(row.value)}>
            <input
              id={optionId}
              className="form-check-input"
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? picks.filter(pick => String(pick) !== String(row.value))
                    : [...picks, row.value]
                )
              }
              disabled={disabled}
            />
            <label className="form-check-label" htmlFor={optionId}>
              {row.label}
            </label>
          </div>
        );
      })}
    </div>
  );
};

MultiselectInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const DslFieldInput = ({ field, fieldId, value, error, onChange, inventory, disabled }) => {
  const { t } = useTranslation();
  const invalid = error ? 'is-invalid' : '';

  if (field.type === 'checkbox') {
    return (
      <div className="form-check form-switch">
        <input
          id={fieldId}
          className={`form-check-input ${invalid}`}
          type="checkbox"
          role="switch"
          checked={Boolean(value)}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={fieldId}>
          {field.label || field.name}
        </label>
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <SelectInput
        field={field}
        fieldId={fieldId}
        rows={rowsFor(field, inventory)}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'multiselect') {
    return (
      <MultiselectInput
        field={field}
        fieldId={fieldId}
        rows={rowsFor(field, inventory)}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'password') {
    return (
      <PasswordInput
        field={field}
        fieldId={fieldId}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        id={fieldId}
        className={`form-control font-monospace ${invalid}`}
        rows={field.rows || TEXTAREA_ROWS}
        value={value ?? ''}
        spellCheck={false}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'number') {
    return (
      <input
        id={fieldId}
        className={`form-control ${invalid}`}
        type="number"
        min={field.validate?.min}
        max={field.validate?.max}
        value={value ?? ''}
        onChange={event =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
        disabled={disabled}
      />
    );
  }
  if (!DSL_TYPES.includes(field.type)) {
    return (
      <div className="alert alert-danger py-1 px-2 mb-0 small">
        {t('provisioning.provisionerFieldDsl.unknownFieldType1')} <code>{String(field.type)}</code>{' '}
        {t('provisioning.provisionerFieldDsl.unknownFieldType2')}
      </div>
    );
  }
  return (
    <input
      id={fieldId}
      className={`form-control ${field.type === 'path' ? 'font-monospace' : ''} ${invalid}`}
      type="text"
      placeholder={field.placeholder}
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    />
  );
};

DslFieldInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  disabled: PropTypes.bool,
};

const groupHidden = (group, members, showAdvanced, errors) =>
  Boolean(group.name) &&
  Boolean(group.advanced) &&
  !showAdvanced &&
  !members.some(field => errors?.[field.name]);

/**
 * The form a provisioner package's `metadata.configuration` describes,
 * hyperweaver-ui's field DSL renderer: groups in declared order with the
 * ungrouped fields first, advanced groups behind the caller's one
 * toggle, and the conditionals evaluated live against the answers and
 * the role-enable flags.
 */
const DslConfigForm = ({
  config,
  answers,
  errors,
  onChange,
  roles,
  inventory,
  showAdvanced,
  idPrefix,
  disabled,
}) => {
  const visible = visibility(config, answers, roles);
  const groupsInOrder = [{ name: '', label: '' }, ...config.groups];
  const declared = new Set(config.groups.map(group => group.name));
  const bucketOf = field => (field.group && declared.has(field.group) ? field.group : '');

  return (
    <>
      {groupsInOrder.map(group => {
        if (group.name && !visible.groups.has(group.name)) {
          return null;
        }
        const members = config.fields.filter(
          field => bucketOf(field) === group.name && visible.fields.has(field.name)
        );
        if (members.length === 0 || groupHidden(group, members, showAdvanced, errors)) {
          return null;
        }
        return (
          <div className="mb-3" key={group.name || '(ungrouped)'}>
            {group.label ? <h6 className="fw-bold">{group.label}</h6> : null}
            {group.help ? <p className="form-text text-muted mt-0">{group.help}</p> : null}
            <div className="row g-3">
              {members.map(field => {
                const fieldId = `${idPrefix}-${field.name}`;
                const error = errors?.[field.name] || '';
                return (
                  <div className="col-12 col-md-6" key={field.name}>
                    {field.type !== 'checkbox' ? (
                      <label className="form-label" htmlFor={fieldId}>
                        {field.label || field.name}
                        {field.required ? <span className="text-danger ms-1">*</span> : null}
                      </label>
                    ) : null}
                    <DslFieldInput
                      field={field}
                      fieldId={fieldId}
                      value={answers[field.name]}
                      error={error}
                      onChange={value => onChange(field.name, value)}
                      inventory={inventory}
                      disabled={disabled}
                    />
                    {error ? <div className="invalid-feedback d-block">{error}</div> : null}
                    {field.help && !error ? (
                      <p className="form-text text-muted mb-0">{field.help}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

DslConfigForm.propTypes = {
  config: PropTypes.shape({
    groups: PropTypes.array.isRequired,
    fields: PropTypes.array.isRequired,
  }).isRequired,
  answers: PropTypes.object.isRequired,
  errors: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  roles: PropTypes.array,
  inventory: PropTypes.object,
  showAdvanced: PropTypes.bool,
  idPrefix: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default DslConfigForm;
