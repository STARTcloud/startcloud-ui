import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDice, FaPlus, FaTrash } from 'react-icons/fa6';

import RevealInput from '../../../components/common/RevealInput';
import SortableList from '../../../components/common/SortableList';
import {
  DSL_TYPES,
  dslConfiguration,
  evaluateShowIf,
  pruneHidden,
  roleFlagScope,
  roleGroupsOf,
  rowsFor,
  secretFieldsOf,
  seedAnswers,
  seedInventoryAnswers,
  seedSecretAnswers,
  validateAnswers,
  validateField,
  visibility,
} from '../utils/provisionerFieldDsl';
import { artifactRowsOf } from '../utils/roleFiles';

import ArtifactPickModal from './ArtifactPickModal';
import ArtifactPickRow from './ArtifactPickRow';
import SecretPickModal, { SecretPickRow } from './SecretPickModal';

export {
  DSL_TYPES,
  dslConfiguration,
  evaluateShowIf,
  pruneHidden,
  roleFlagScope,
  roleGroupsOf,
  secretFieldsOf,
  seedAnswers,
  seedInventoryAnswers,
  seedSecretAnswers,
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

const ListInput = ({ fieldId, value, error, onChange, disabled }) => {
  const { t } = useTranslation();
  const items = (Array.isArray(value) ? value : []).map((text, index) => ({ index, text }));
  const write = next => onChange(next.map(item => item.text));
  return (
    <div
      id={fieldId}
      className={error ? 'border border-danger rounded p-2' : ''}
      data-list="dsl-list"
    >
      {items.length > 0 ? (
        <SortableList
          items={items}
          keyOf={item => String(item.index)}
          className="mb-2"
          onReorder={write}
          renderItem={(item, handle) => (
            <>
              {handle}
              <input
                id={`${fieldId}-${item.index}`}
                className="form-control form-control-sm"
                type="text"
                value={item.text}
                disabled={disabled}
                onChange={event =>
                  write(
                    items.map(entry =>
                      entry.index === item.index ? { ...entry, text: event.target.value } : entry
                    )
                  )
                }
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                data-action="list-remove"
                title={t('provisioning.provisionerFieldDsl.listRemove')}
                aria-label={t('provisioning.provisionerFieldDsl.listRemove')}
                disabled={disabled}
                onClick={() => write(items.filter(entry => entry.index !== item.index))}
              >
                <FaTrash aria-hidden="true" />
              </button>
            </>
          )}
        />
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="list-add"
        disabled={disabled}
        onClick={() => write([...items, { index: items.length, text: '' }])}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('provisioning.provisionerFieldDsl.listAdd')}
      </button>
    </div>
  );
};

ListInput.propTypes = {
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const FileInput = ({ field, fieldId, value, error, onChange, disabled, files }) => {
  const [open, setOpen] = useState(false);
  const kind = String(field.kind || '');
  const role = String(field.role || '');
  if (!files.host) {
    return (
      <input
        id={fieldId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        type="text"
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }
  const rows = artifactRowsOf(files.artifacts, kind, role);
  const pick = row => {
    onChange(row ? row.filename : undefined);
    setOpen(false);
  };
  return (
    <div id={fieldId} className={error ? 'border border-danger rounded p-2' : ''}>
      <ArtifactPickRow
        label={kind}
        picked={value ? rows.find(row => row.filename === value) || null : null}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        onClear={() => pick(null)}
        attributes={{
          'data-field': 'file',
          'data-field-name': field.name,
          'data-pick-kind': kind,
          'data-pick-role': role,
        }}
      />
      {open ? (
        <ArtifactPickModal
          kind={kind}
          role={role}
          artifacts={files.artifacts}
          host={files.host}
          title={field.label || field.name}
          disabled={disabled}
          onPick={pick}
          onReload={files.onArtifactsReload}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

const filesShape = PropTypes.shape({
  onArtifactsReload: PropTypes.func,
  host: PropTypes.object,
  artifacts: PropTypes.array,
});

FileInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  files: filesShape.isRequired,
};

const SecretInput = ({ field, fieldId, value, error, onChange, disabled, files }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const kind = field.kind || 'api_key';
  const profile = field.profile || '';
  if (!files.host) {
    return (
      <input
        id={fieldId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        type="text"
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }
  const shown = value ? picked || { id: value, name: value } : null;
  return (
    <div id={fieldId} className={error ? 'border border-danger rounded p-2' : ''}>
      <SecretPickRow
        label={t(`certs.kind.${kind}`)}
        picked={shown}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        onClear={() => {
          setPicked(null);
          onChange(undefined);
        }}
        attributes={{
          'data-field': 'secret',
          'data-field-name': field.name,
          'data-secret-kind': kind,
          'data-secret-key': field.secret_key || '',
        }}
      />
      {open ? (
        <SecretPickModal
          kind={kind}
          profile={profile}
          host={files.host}
          title={field.label || field.name}
          disabled={disabled}
          onPick={row => {
            setPicked(row);
            onChange(String(row.id));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

SecretInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  files: PropTypes.shape({ host: PropTypes.object }).isRequired,
};

const PICKED_TYPES = ['select', 'multiselect', 'password', 'list', 'file', 'secret'];

const PickedInput = ({ field, fieldId, value, error, onChange, inventory, disabled, files }) => {
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
  if (field.type === 'list') {
    return (
      <ListInput
        fieldId={fieldId}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'secret') {
    return (
      <SecretInput
        field={field}
        fieldId={fieldId}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
        files={files}
      />
    );
  }
  return (
    <FileInput
      field={field}
      fieldId={fieldId}
      value={value}
      error={error}
      onChange={onChange}
      disabled={disabled}
      files={files}
    />
  );
};

PickedInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  disabled: PropTypes.bool,
  files: filesShape.isRequired,
};

/**
 * One field of the field DSL as its type draws it: a switch for a
 * checkbox, a select, inline checkboxes for a multiselect, a password
 * with its generate button, a textarea, a number, a list as sortable
 * rows with Add and Remove, a file as the artifact pick row whose Change
 * opens the artifact pick dialog over the host's rows of the field's
 * `kind` and `role`, the picked file name the answer and the row it
 * names drawn beside it, a secret
 * as the secret pick row whose Change opens the secret pick dialog over
 * the host store's rows of the field's `kind`, narrowed by its
 * `profile`, the picked row's id the answer and its name drawn beside
 * it, and a
 * text input.
 */
export const DslFieldInput = ({
  field,
  fieldId,
  value,
  error,
  onChange,
  inventory,
  disabled,
  onArtifactsReload,
  host,
  artifacts,
}) => {
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
  if (PICKED_TYPES.includes(field.type)) {
    return (
      <PickedInput
        field={field}
        fieldId={fieldId}
        value={value}
        error={error}
        onChange={onChange}
        inventory={inventory}
        disabled={disabled}
        files={{
          onArtifactsReload: onArtifactsReload || null,
          host: host || null,
          artifacts: artifacts || null,
        }}
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
  onArtifactsReload: PropTypes.func,
  host: PropTypes.object,
  artifacts: PropTypes.array,
};

const groupHidden = (group, members, showAdvanced, errors) =>
  Boolean(group.name) &&
  Boolean(group.advanced) &&
  !showAdvanced &&
  !members.some(field => errors?.[field.name]);

const groupDrawn = (group, roleGroups, includeRoleGroups, onlyGroups) => {
  if (onlyGroups) {
    return onlyGroups.has(group.name);
  }
  return includeRoleGroups || !roleGroups.has(group.name);
};

/**
 * The form a provisioner package's `metadata.configuration` describes,
 * hyperweaver-ui's field DSL renderer: groups in declared order with the
 * ungrouped fields first, advanced groups behind the caller's one
 * toggle, the conditionals evaluated live against the answers and the
 * role-enable flags, the fields named in `omit` never drawn, the ones a
 * role's file picks answer, and the groups that name a `role` left to
 * that role's card unless `includeRoleGroups`; `onlyGroups` narrows the
 * drawing to the named groups while the conditionals still read every
 * answer of the configuration.
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
  omit = null,
  includeRoleGroups = false,
  onlyGroups = null,
  onArtifactsReload = null,
  host = null,
  artifacts = null,
}) => {
  const visible = visibility(config, answers, roles);
  const roleGroups = new Set(roleGroupsOf(config).map(group => group.name));
  const groupsInOrder = [{ name: '', label: '' }, ...config.groups].filter(group =>
    groupDrawn(group, roleGroups, includeRoleGroups, onlyGroups)
  );
  const declared = new Set(config.groups.map(group => group.name));
  const bucketOf = field => (field.group && declared.has(field.group) ? field.group : '');

  return (
    <>
      {groupsInOrder.map(group => {
        if (group.name && !visible.groups.has(group.name)) {
          return null;
        }
        const members = config.fields.filter(
          field =>
            bucketOf(field) === group.name &&
            visible.fields.has(field.name) &&
            !(omit && omit.has(field.name))
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
                      onArtifactsReload={onArtifactsReload}
                      host={host}
                      artifacts={artifacts}
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
  omit: PropTypes.instanceOf(Set),
  includeRoleGroups: PropTypes.bool,
  onlyGroups: PropTypes.instanceOf(Set),
  onArtifactsReload: PropTypes.func,
  host: PropTypes.object,
  artifacts: PropTypes.array,
};

export default DslConfigForm;
