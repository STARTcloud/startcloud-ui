import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronDown,
  FaClone,
  FaGripVertical,
  FaPlus,
  FaTrash,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import { roleGroupsOf } from '../utils/provisionerFieldDsl';
import {
  catalogRoleMatches,
  changedRolesOf,
  dependencyWarnings,
  manifestRoleOf,
  roleSpecOf,
  runRoleMatches,
} from '../utils/provisioning';
import {
  bareRoleName,
  downloadKeyOf,
  fileKindsOf,
  pickAnswersOf,
  pickedArtifactOf,
  roleArtifactsOf,
  roleFilesPatch,
  roleNeedsAttention,
  withSpecDefaults,
} from '../utils/roleFiles';

import ArtifactPickModal from './ArtifactPickModal';
import ArtifactPickRow from './ArtifactPickRow';
import DslConfigForm, { DslFieldInput } from './ProvisionerFieldDsl';
import { RunStepButton } from './ProvisioningStepList';
import { VarRowList, ROLE_NAME_PATTERN, applyPatch } from './ProvisioningVarRows';

const NO_COLLECTION = 'no collection';

const NO_QUEUE = {};

const NO_MANIFEST = [];

const DEPENDENCY_KEYS = {
  absent: 'provisioning.provisioningRolesTab.dependencyAbsent',
  below: 'provisioning.provisioningRolesTab.dependencyBelow',
  off: 'provisioning.provisioningRolesTab.dependencyOff',
};

const needleOf = query =>
  String(query ?? '')
    .trim()
    .toLowerCase();

const blankToUndefined = value => (value === '' ? undefined : value);

const isOn = role => role.enabled !== false;

const specFieldOf = (name, option) => {
  if (Array.isArray(option.choices) && option.choices.length > 0) {
    return { name, type: 'select', options: option.choices };
  }
  if (option.type === 'bool') {
    return { name, type: 'checkbox', label: name };
  }
  if (option.type === 'int' || option.type === 'float') {
    return { name, type: 'number' };
  }
  return { name, type: 'text' };
};

const fieldsShape = PropTypes.shape({
  config: PropTypes.object.isRequired,
  answers: PropTypes.object.isRequired,
  errors: PropTypes.object,
  onAnswerChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  onArtifactsReload: PropTypes.func,
  host: PropTypes.object,
  artifacts: PropTypes.array,
  roles: PropTypes.array.isRequired,
});

const PackagePicker = ({ packages, packageName, packageVersion, disabled, onPicked }) => {
  const { t } = useTranslation();
  const family = packages.find(entry => entry.name === packageName) || null;
  const versions = family?.versions || [];
  const versionKnown = versions.some(entry => entry.version === packageVersion);
  const emptyRegistry = packages.length === 0 && !packageName;
  return (
    <div className="hw-cat-picker">
      <select
        className="form-select form-select-sm"
        aria-label={t('provisioning.provisioningRolesTab.catalogPackageAriaLabel')}
        value={packageName || ''}
        disabled={disabled || emptyRegistry}
        onChange={event => {
          const next = packages.find(entry => entry.name === event.target.value) || null;
          onPicked(next ? next.name : undefined, next ? next.versions?.[0]?.version : undefined);
        }}
      >
        <option value="">
          {emptyRegistry
            ? t('provisioning.provisioningRolesTab.catalogRegistryEmpty')
            : t('provisioning.provisioningRolesTab.catalogNoPackage')}
        </option>
        {packageName && !family ? (
          <option value={packageName}>
            {t('provisioning.provisioningRolesTab.packageNotInRegistry', { packageName })}
          </option>
        ) : null}
        {packages.map(entry => (
          <option key={entry.name} value={entry.name}>
            {entry.metadata?.label || entry.name}
          </option>
        ))}
      </select>
      {family ? (
        <select
          className="form-select form-select-sm w-auto"
          aria-label={t('provisioning.provisioningRolesTab.catalogVersionAriaLabel')}
          value={packageVersion || ''}
          disabled={disabled}
          onChange={event => onPicked(packageName, event.target.value)}
        >
          {packageVersion && !versionKnown ? (
            <option value={packageVersion}>
              {t('provisioning.provisioningRolesTab.versionNotInRegistry', { packageVersion })}
            </option>
          ) : null}
          {versions.map(entry => (
            <option key={entry.dir || entry.version} value={entry.version}>
              {entry.version}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
};

PackagePicker.propTypes = {
  packages: PropTypes.array.isRequired,
  packageName: PropTypes.string,
  packageVersion: PropTypes.string,
  disabled: PropTypes.bool,
  onPicked: PropTypes.func.isRequired,
};

const RoleCatalog = ({ specs, query: boundQuery = null, disabled, onAdd, onDragNew }) => {
  const { t } = useTranslation();
  const [ownQuery, setOwnQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const needle = needleOf(boundQuery ?? ownQuery);

  const groups = {};
  Object.entries(specs).forEach(([bare, spec]) => {
    if (!catalogRoleMatches(bare, spec, needle)) {
      return;
    }
    const collection = spec.collection || NO_COLLECTION;
    groups[collection] ||= [];
    groups[collection].push(bare);
  });

  const toggleGroup = collection =>
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(collection)) {
        next.delete(collection);
      } else {
        next.add(collection);
      }
      return next;
    });

  const catalogItem = bare => {
    const spec = specs[bare];
    const name = spec.collection ? `${spec.collection}.${bare}` : bare;
    return (
      <div
        key={bare}
        className="hw-cat-item"
        role="button"
        tabIndex={0}
        draggable={!disabled}
        onClick={() => onAdd(name)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAdd(name);
          }
        }}
        onDragStart={() => onDragNew(name)}
        onDragEnd={() => onDragNew(null)}
      >
        <div className="hw-cat-text">
          <div className="hw-cat-name">{bare}</div>
          <div className="hw-cat-desc">{spec.short_description || ''}</div>
        </div>
        <span className="hw-cat-add" title={t('provisioning.provisioningRolesTab.addToRunTitle')}>
          <FaPlus aria-hidden="true" />
        </span>
      </div>
    );
  };

  return (
    <>
      {boundQuery === null ? (
        <div className="hw-cat-search">
          <input
            className="form-control form-control-sm"
            type="search"
            placeholder={t('provisioning.provisioningRolesTab.searchRolesPlaceholder')}
            aria-label={t('provisioning.provisioningRolesTab.searchRolesAriaLabel')}
            value={ownQuery}
            onChange={event => setOwnQuery(event.target.value)}
          />
        </div>
      ) : null}
      <div className="hw-cat-scroll">
        {Object.keys(groups)
          .sort()
          .map(collection => {
            const open = needle !== '' || !collapsed.has(collection);
            return (
              <div key={collection}>
                <button
                  type="button"
                  className="hw-cat-group"
                  aria-expanded={open}
                  onClick={() => toggleGroup(collection)}
                >
                  <FaChevronDown aria-hidden="true" />
                  <span>{collection}</span>
                  <span className="hw-cat-count">{groups[collection].length}</span>
                </button>
                {open ? groups[collection].sort().map(catalogItem) : null}
              </div>
            );
          })}
      </div>
    </>
  );
};

RoleCatalog.propTypes = {
  specs: PropTypes.object.isRequired,
  query: PropTypes.string,
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onDragNew: PropTypes.func.isRequired,
};

const RoleChips = ({ role, changed, required }) => {
  const { t } = useTranslation();
  const varCount = Object.keys(role.vars || {}).length;
  const envCount = Object.keys(role.environment || {}).length;
  const becomeChip = () => {
    if (!role.become) {
      return t('provisioning.provisioningRolesTab.becomeNoChip');
    }
    return role.become_user
      ? t('provisioning.provisioningRolesTab.becomeUserChip', { user: role.become_user })
      : t('provisioning.provisioningRolesTab.becomeChip');
  };
  return (
    <>
      {required ? (
        <span className="hw-chip hw-chip-required" data-chip="required">
          {t('provisioning.provisioningRolesTab.requiredChip')}
        </span>
      ) : null}
      {changed ? (
        <span className="hw-chip hw-chip-when" data-chip="changed">
          {t('provisioning.provisioningRolesTab.changedChip')}
        </span>
      ) : null}
      {role.tags ? (
        <span className="hw-chip hw-chip-tag">
          {t('provisioning.provisioningRolesTab.tagsChip', { tags: String(role.tags) })}
        </span>
      ) : null}
      {role.when ? (
        <span className="hw-chip hw-chip-when">
          {t('provisioning.provisioningRolesTab.whenChip', { when: String(role.when) })}
        </span>
      ) : null}
      {varCount > 0 ? (
        <span className="hw-chip hw-chip-vars">
          {t('provisioning.provisioningRolesTab.varCountChip', { count: varCount })}
        </span>
      ) : null}
      {role.become !== undefined ? <span className="hw-chip">{becomeChip()}</span> : null}
      {envCount > 0 ? (
        <span className="hw-chip">
          {t('provisioning.provisioningRolesTab.envCountChip', { count: envCount })}
        </span>
      ) : null}
    </>
  );
};

RoleChips.propTypes = {
  role: PropTypes.object.isRequired,
  changed: PropTypes.bool.isRequired,
  required: PropTypes.bool.isRequired,
};

const RoleKeywordFields = ({ role, uiId, disabled, onPatch }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="hw-field">
        <label htmlFor={`role-become-${uiId}`}>
          {t('provisioning.provisioningRolesTab.becomeLabel')}
        </label>
        <select
          id={`role-become-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={role.become === undefined ? '' : String(role.become)}
          disabled={disabled}
          onChange={event =>
            onPatch({
              become: event.target.value === '' ? undefined : event.target.value === 'true',
            })
          }
        >
          <option value="">{t('provisioning.provisioningRolesTab.notSetOption')}</option>
          <option value="true">{t('provisioning.provisioningRolesTab.yesOption')}</option>
          <option value="false">{t('provisioning.provisioningRolesTab.noOption')}</option>
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`role-become-user-${uiId}`}>
          {t('provisioning.provisioningRolesTab.asUserLabel')}
        </label>
        <input
          id={`role-become-user-${uiId}`}
          className="form-control form-control-sm hw-field-short"
          type="text"
          placeholder={t('provisioning.provisioningRolesTab.asUserPlaceholder')}
          value={role.become_user ?? ''}
          disabled={disabled}
          onChange={event => onPatch({ become_user: blankToUndefined(event.target.value) })}
        />
      </span>
      <span className="hw-field">
        <label htmlFor={`role-delegate-${uiId}`}>
          {t('provisioning.provisioningRolesTab.delegateToLabel')}
        </label>
        <input
          id={`role-delegate-${uiId}`}
          className="form-control form-control-sm hw-field-short"
          type="text"
          placeholder={t('provisioning.provisioningRolesTab.delegateToPlaceholder')}
          value={role.delegate_to ?? ''}
          disabled={disabled}
          onChange={event => onPatch({ delegate_to: blankToUndefined(event.target.value) })}
        />
      </span>
    </>
  );
};

RoleKeywordFields.propTypes = {
  role: PropTypes.object.isRequired,
  uiId: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const RoleFileRow = ({ role, kind, rows, queued, disabled, onOpen, onClear, onFetch }) => {
  const { t } = useTranslation();
  const key = downloadKeyOf(role.name, kind);
  return (
    <ArtifactPickRow
      label={t(`provisioning.provisioningRolesTab.kind.${kind}`)}
      picked={pickedArtifactOf(rows, role, kind)}
      queued={Boolean(queued[key])}
      disabled={disabled}
      onOpen={() => onOpen(kind)}
      onClear={() => onClear(kind)}
      onFetch={onFetch ? row => onFetch(row, key) : null}
      attributes={{ 'data-file-kind': kind }}
    />
  );
};

RoleFileRow.propTypes = {
  role: PropTypes.object.isRequired,
  kind: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  queued: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
};

const SpecFields = ({ role, spec, disabled, onPatch }) => {
  const options = Object.entries(spec?.options || {}).filter(
    ([name, option]) => option && typeof option === 'object' && name !== 'run_tasks'
  );
  if (options.length === 0) {
    return null;
  }
  const vars = role.vars || {};
  return (
    <div className="row g-2 mb-2" data-list="spec-fields">
      {options.map(([name, option]) => {
        const field = specFieldOf(name, option);
        const fieldId = `role-${role._ui_id}-var-${name}`;
        const description = Array.isArray(option.description)
          ? option.description.join(' ')
          : option.description;
        return (
          <div className="col-12 col-md-6" key={name}>
            {field.type !== 'checkbox' ? (
              <label className="form-label small mb-1 font-monospace" htmlFor={fieldId}>
                {name}
                {option.required ? <span className="text-danger ms-1">*</span> : null}
              </label>
            ) : null}
            <DslFieldInput
              field={field}
              fieldId={fieldId}
              value={vars[name] === undefined ? option.default : vars[name]}
              error=""
              onChange={value =>
                onPatch({
                  vars: Object.fromEntries(
                    Object.entries({ ...vars, [name]: value }).filter(
                      ([, held]) => held !== undefined
                    )
                  ),
                })
              }
              inventory={null}
              disabled={disabled}
            />
            {description ? (
              <p className="form-text text-muted mb-0 small">{String(description)}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

SpecFields.propTypes = {
  role: PropTypes.object.isRequired,
  spec: PropTypes.object,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const PackageSettings = ({ role, fields, disabled }) => {
  const { t } = useTranslation();
  const bare = bareRoleName(role.name);
  const groups = roleGroupsOf(fields.config).filter(group => group.role === bare);
  if (groups.length === 0) {
    return null;
  }
  return (
    <>
      <div className="hw-rc-sub">
        {t('provisioning.provisioningRolesTab.packageSettingsHeading')}
      </div>
      <DslConfigForm
        config={fields.config}
        answers={fields.answers}
        errors={fields.errors}
        onChange={fields.onAnswerChange}
        roles={fields.roles}
        inventory={fields.inventory}
        showAdvanced
        idPrefix="prov-field"
        disabled={disabled}
        includeRoleGroups
        onlyGroups={new Set(groups.map(group => group.name))}
        onArtifactsReload={fields.onArtifactsReload}
        host={fields.host}
        artifacts={fields.artifacts}
      />
    </>
  );
};

PackageSettings.propTypes = {
  role: PropTypes.object.isRequired,
  fields: fieldsShape.isRequired,
  disabled: PropTypes.bool,
};

const RoleCardBody = ({
  role,
  spec,
  manifestRole,
  artifacts,
  queued,
  fields,
  disabled,
  onPatch,
  onOpenPick,
  onPickFile,
  onFetch,
}) => {
  const { t } = useTranslation();
  const description = manifestRole?.description || spec?.short_description || '';
  const kinds = isOn(role) ? fileKindsOf(manifestRole) : [];
  const specNames = new Set(Object.keys(spec?.options || {}));
  const extraVars = Object.fromEntries(
    Object.entries(role.vars || {}).filter(([name]) => !specNames.has(name))
  );
  return (
    <div className="hw-rc-body">
      {description ? <p className="hw-rc-desc">{description}</p> : null}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`role-tags-${role._ui_id}`}>
            {t('provisioning.provisioningRolesTab.tagsLabel')}
          </label>
          <input
            id={`role-tags-${role._ui_id}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder="—"
            value={role.tags ?? ''}
            disabled={disabled}
            onChange={event => onPatch({ tags: blankToUndefined(event.target.value) })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`role-when-${role._ui_id}`}>
            {t('provisioning.provisioningRolesTab.whenLabel')}
          </label>
          <input
            id={`role-when-${role._ui_id}`}
            className="form-control form-control-sm font-monospace hw-field-when"
            type="text"
            placeholder={t('provisioning.provisioningRolesTab.whenPlaceholder')}
            value={role.when ?? ''}
            disabled={disabled}
            onChange={event => onPatch({ when: blankToUndefined(event.target.value) })}
          />
        </span>
        <RoleKeywordFields role={role} uiId={role._ui_id} disabled={disabled} onPatch={onPatch} />
      </div>
      {kinds.length > 0 ? (
        <>
          <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.filesHeading')}</div>
          <div className="hw-file-pickers">
            {kinds.map(kind => (
              <RoleFileRow
                key={kind}
                role={role}
                kind={kind}
                rows={roleArtifactsOf(artifacts, manifestRole, kind)}
                queued={queued}
                disabled={disabled}
                onOpen={onOpenPick}
                onClear={cleared => onPickFile(cleared, null)}
                onFetch={onFetch}
              />
            ))}
          </div>
        </>
      ) : null}
      {fields ? <PackageSettings role={role} fields={fields} disabled={disabled} /> : null}
      <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.variablesHeading')}</div>
      <SpecFields role={role} spec={spec} disabled={disabled} onPatch={onPatch} />
      <VarRowList
        idPrefix={`role-${role._ui_id}`}
        entries={extraVars}
        specOptions={null}
        disabled={disabled}
        addLabel={t('provisioning.provisioningRolesTab.addVariable')}
        onChange={next => {
          const kept = Object.fromEntries(
            Object.entries(role.vars || {}).filter(([name]) => specNames.has(name))
          );
          const merged = { ...kept, ...next };
          onPatch({ vars: Object.keys(merged).length > 0 ? merged : undefined });
        }}
      />
      <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.environmentHeading')}</div>
      <VarRowList
        idPrefix={`role-env-${role._ui_id}`}
        entries={role.environment || {}}
        specOptions={null}
        disabled={disabled}
        addLabel={t('provisioning.provisioningRolesTab.addEnvVar')}
        onChange={next => onPatch({ environment: Object.keys(next).length > 0 ? next : undefined })}
      />
    </div>
  );
};

RoleCardBody.propTypes = {
  role: PropTypes.object.isRequired,
  spec: PropTypes.object,
  manifestRole: PropTypes.object,
  artifacts: PropTypes.array,
  queued: PropTypes.object.isRequired,
  fields: fieldsShape,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
  onOpenPick: PropTypes.func.isRequired,
  onPickFile: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
};

const RoleCardName = ({ role, spec, manifestRole, changed, attention, disabled, onPatch }) => {
  const { t } = useTranslation();
  if (spec || manifestRole) {
    return (
      <div className="hw-rc-name">
        {attention ? (
          <FaTriangleExclamation
            className="text-warning"
            data-note="role-attention"
            title={t('provisioning.provisioningRolesTab.needsAnswer')}
          />
        ) : null}
        <span className={`hw-rc-role${isOn(role) ? '' : ' text-muted'}`} title={role.name}>
          {manifestRole?.label || bareRoleName(role.name)}
        </span>
        <span className="hw-rc-coll">{spec?.collection || manifestRole?.collection || ''}</span>
        <RoleChips role={role} changed={changed} required={manifestRole?.required === true} />
      </div>
    );
  }
  const name = role.name ?? '';
  const badName = name.trim() !== '' && !ROLE_NAME_PATTERN.test(name.trim());
  return (
    <div className="hw-rc-name">
      <input
        className={`form-control form-control-sm font-monospace hw-rc-name-input ${
          badName ? 'is-invalid' : ''
        }`}
        type="text"
        placeholder="namespace.collection.role"
        aria-label={t('provisioning.provisioningRolesTab.roleNameAriaLabel')}
        value={name}
        disabled={disabled}
        onChange={event => onPatch({ name: event.target.value })}
      />
      <RoleChips role={role} changed={changed} required={false} />
      {badName ? (
        <div className="hw-invalid-msg w-100">
          {t('provisioning.provisioningRolesTab.roleNameRule')}
        </div>
      ) : null}
    </div>
  );
};

RoleCardName.propTypes = {
  role: PropTypes.object.isRequired,
  spec: PropTypes.object,
  manifestRole: PropTypes.object,
  changed: PropTypes.bool.isRequired,
  attention: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const CustomRoleAdd = ({ disabled, onAdd }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const add = () => {
    onAdd(name.trim());
    setName('');
  };
  return (
    <div className="hw-cat-custom">
      <input
        className="form-control form-control-sm font-monospace"
        type="text"
        placeholder="namespace.collection.role"
        aria-label={t('provisioning.provisioningRolesTab.customRoleNameAriaLabel')}
        value={name}
        disabled={disabled}
        onChange={event => setName(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="role-add-custom"
        disabled={disabled}
        onClick={add}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('provisioning.provisioningRolesTab.addButton')}
      </button>
    </div>
  );
};

CustomRoleAdd.propTypes = {
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
};

const RoleCard = ({
  role,
  index,
  spec,
  manifestRole,
  warnings,
  changed,
  attention,
  artifacts,
  queued,
  fields,
  expanded,
  dragging,
  dropTarget,
  disabled,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onDuplicate,
  onToggle,
  onRemove,
  onPatch,
  onOpenPick,
  onPickFile,
  onFetch,
  onRun,
}) => {
  const { t } = useTranslation();
  const on = isOn(role);
  return (
    <div
      className={`hw-role-card ${dragging ? 'hw-dragging' : ''} ${dropTarget ? 'hw-drop-target' : ''}`}
      role="listitem"
      data-role={bareRoleName(role.name)}
      data-enabled={on}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="hw-rc-head">
        <button
          type="button"
          className="btn btn-link p-0 text-muted hw-grip"
          data-action="role-grip"
          draggable={!disabled}
          title={t('provisioning.provisioningRolesTab.dragToReorder')}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <FaGripVertical aria-hidden="true" />
        </button>
        <span className="hw-run-num">{index + 1}</span>
        <RoleCardName
          role={role}
          spec={spec}
          manifestRole={manifestRole}
          changed={changed}
          attention={attention}
          disabled={disabled}
          onPatch={onPatch}
        />
        <div className="hw-rc-actions">
          {onRun ? (
            <RunStepButton
              action="run-role"
              title={t('provisioning.provisioningRolesTab.runRoleTitle')}
              disabled={disabled || !on || !String(role.name || '').trim()}
              onRun={onRun}
            />
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title={t('provisioning.provisioningRolesTab.duplicateTitle')}
            disabled={disabled}
            onClick={onDuplicate}
          >
            <FaClone aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary hw-expander"
            title={t('provisioning.provisioningRolesTab.detailsTitle')}
            aria-expanded={expanded}
            disabled={disabled}
            onClick={onToggle}
          >
            <FaChevronDown aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label={t('provisioning.provisioningRolesTab.removeFromRun')}
            title={t('provisioning.provisioningRolesTab.removeFromRun')}
            disabled={disabled}
            onClick={onRemove}
          >
            <FaTrash aria-hidden="true" />
          </button>
          <div className="form-check form-switch mb-0 ms-1">
            <input
              id={`role-enabled-${role._ui_id}`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              data-action="role-switch"
              checked={on}
              disabled={disabled}
              title={t(
                manifestRole?.default_enabled === true
                  ? 'provisioning.provisioningRolesTab.onByDefault'
                  : 'provisioning.provisioningRolesTab.offByDefault'
              )}
              aria-label={t('provisioning.provisioningRolesTab.switchAriaLabel', {
                name: manifestRole?.label || bareRoleName(role.name),
              })}
              onChange={event => onPatch({ enabled: event.target.checked })}
            />
          </div>
        </div>
      </div>
      {warnings.map(warning => (
        <div className="hw-dep-warning" key={warning.dep}>
          <FaTriangleExclamation className="me-1" aria-hidden="true" />
          {t('provisioning.provisioningRolesTab.needsDependency')} <code>{warning.dep}</code>{' '}
          {t(DEPENDENCY_KEYS[warning.kind])}
        </div>
      ))}
      {expanded ? (
        <RoleCardBody
          role={role}
          spec={spec}
          manifestRole={manifestRole}
          artifacts={artifacts}
          queued={queued}
          fields={fields}
          disabled={disabled}
          onPatch={onPatch}
          onOpenPick={onOpenPick}
          onPickFile={onPickFile}
          onFetch={onFetch}
        />
      ) : null}
    </div>
  );
};

RoleCard.propTypes = {
  role: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  spec: PropTypes.object,
  manifestRole: PropTypes.object,
  warnings: PropTypes.array.isRequired,
  changed: PropTypes.bool.isRequired,
  attention: PropTypes.bool.isRequired,
  artifacts: PropTypes.array,
  queued: PropTypes.object.isRequired,
  fields: fieldsShape,
  expanded: PropTypes.bool.isRequired,
  dragging: PropTypes.bool.isRequired,
  dropTarget: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onPatch: PropTypes.func.isRequired,
  onOpenPick: PropTypes.func.isRequired,
  onPickFile: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
  onRun: PropTypes.func,
};

const manifestOrder = (roles, manifest) => {
  const rank = new Map(manifest.map((role, index) => [bareRoleName(role.name), index]));
  const known = roles.filter(row => rank.has(bareRoleName(row.name)));
  const unknown = roles.filter(row => !rank.has(bareRoleName(row.name)));
  known.sort((a, b) => rank.get(bareRoleName(a.name)) - rank.get(bareRoleName(b.name)));
  return [...known, ...unknown];
};

const fieldsOf = ({ fieldConfig, roles, answers, ...rest }) =>
  fieldConfig && rest.onAnswerChange
    ? { config: fieldConfig, roles, answers: answers || NO_QUEUE, ...rest }
    : null;

const FilePickDialog = ({
  picking,
  roles,
  manifest,
  artifacts,
  host,
  disabled,
  onPick,
  onFetch,
  onReload,
  onClose,
}) => {
  const { t } = useTranslation();
  const role = picking ? roles.find(row => row._ui_id === picking.uiId) : null;
  const manifestRole = role ? manifestRoleOf(manifest, role.name) : null;
  if (!role || !host) {
    return null;
  }
  return (
    <ArtifactPickModal
      kind={picking.kind}
      role={manifestRole?.installer_dir || ''}
      artifacts={artifacts}
      host={host}
      title={t('provisioning.provisioningRolesTab.pickFileTitle', {
        role: manifestRole?.label || bareRoleName(role.name),
        kind: t(`provisioning.provisioningRolesTab.kind.${picking.kind}`),
      })}
      disabled={disabled}
      onPick={row => onPick(picking.uiId, picking.kind, row)}
      onFetch={
        onFetch
          ? row => {
              onPick(picking.uiId, picking.kind, row);
              onFetch(row, downloadKeyOf(role.name, picking.kind));
            }
          : null
      }
      onReload={onReload}
      onClose={onClose}
    />
  );
};

FilePickDialog.propTypes = {
  picking: PropTypes.shape({
    uiId: PropTypes.number.isRequired,
    kind: PropTypes.string.isRequired,
  }),
  roles: PropTypes.array.isRequired,
  manifest: PropTypes.array.isRequired,
  artifacts: PropTypes.array,
  host: PropTypes.object,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onFetch: PropTypes.func,
  onReload: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

/**
 * The one roles editor of the estate, drawn by the machine's Provisioning
 * page and the create wizard's Provisioning step alike: the attached
 * package's role catalog on the left, grouped by collection and
 * searchable, with the package picker where the caller offers it, and
 * the machine's ordered run on the right, one card a role in run order,
 * dragged to reorder, duplicated, removed, its switch on where the
 * manifest's `default_enabled` is, its label with the Ansible name as
 * its tooltip, the required chip where the manifest marks the role
 * required, the changed chip and the one warning banner over the run
 * while any switch differs from the provisioner's default, with Template
 * defaults restoring the manifest's order and switches, a warning
 * triangle on a role that needs an answer, the registry's depends_on
 * hints as advisories on a role that is on, and under its chevron the role's keywords, one
 * file row per kind the manifest declares, the picked name, its state,
 * its version and short hash, Change opening the pick dialog over the
 * host's artifact rows of its `installer_dir` and the clear button, a
 * pick writing the role's `files` and, through `onAnswers`, the manifest
 * fields the pick fills, a missing pick drawn with the download glyph
 * that hands the row to `onFetch`, the package's field groups that name
 * this role drawn through the field DSL while `fieldConfig` is given,
 * the role's own settings from its argument spec through the field DSL
 * with their defaults, written to `vars` as the card opens, then the
 * free variables and the environment. The catalog draws its own search
 * box while `query` is null; a `query` string narrows the catalog and
 * the run by name and description in its place, each card keeping its
 * place in the run. Where `onRun` is given each card of a role that is
 * on draws the play glyph that hands `onRun` `{ roles: [name] }`.
 */
const ProvisioningRolesTab = ({
  roles,
  specs,
  hints,
  disabled,
  onChange,
  makeRow,
  packages = null,
  packageName,
  packageVersion,
  onPackagePicked = null,
  manifest = NO_MANIFEST,
  artifacts = null,
  queued = NO_QUEUE,
  onAnswers = null,
  onFetch = null,
  fieldConfig,
  answers,
  fieldErrors,
  onAnswerChange,
  inventory,
  onArtifactsReload,
  host,
  query,
  onRun,
}) => {
  const { t } = useTranslation();
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [picking, setPicking] = useState(null);

  const withDefaults = (rows, uiId) => {
    const seeded = rows.map(row =>
      row._ui_id === uiId ? withSpecDefaults(row, roleSpecOf(specs, row.name)) : row
    );
    return seeded.some((row, index) => row !== rows[index]) ? seeded : rows;
  };

  const toggleExpanded = uiId => {
    if (!expanded.has(uiId)) {
      const seeded = withDefaults(roles, uiId);
      if (seeded !== roles) {
        onChange(seeded);
      }
    }
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(uiId)) {
        next.delete(uiId);
      } else {
        next.add(uiId);
      }
      return next;
    });
  };

  const moveOver = overId => {
    if (!drag || drag.kind !== 'move' || drag.id === overId) {
      return;
    }
    const from = roles.findIndex(row => row._ui_id === drag.id);
    const to = roles.findIndex(row => row._ui_id === overId);
    if (from === -1 || to === -1) {
      return;
    }
    const next = [...roles];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const insertAt = (name, index) => {
    const next = [...roles];
    next.splice(index, 0, makeRow(name));
    onChange(next);
  };

  const dropNew = index => {
    insertAt(drag.name, index);
    setDrag(null);
    setDropTarget(null);
  };

  const patchRole = (uiId, patch) => {
    const base = patch.enabled === true ? withDefaults(roles, uiId) : roles;
    if (patch.enabled === true) {
      setExpanded(previous => new Set(previous).add(uiId));
    }
    onChange(base.map(row => (row._ui_id === uiId ? applyPatch(row, patch) : row)));
  };

  const pickFile = (uiId, kind, row) => {
    const role = roles.find(entry => entry._ui_id === uiId);
    if (!role) {
      return;
    }
    patchRole(uiId, { files: { ...(role.files || {}), ...roleFilesPatch(kind, row || null) } });
    if (onAnswers) {
      onAnswers(
        pickAnswersOf(manifestRoleOf(manifest, role.name), kind, row || null, fieldConfig || null)
      );
    }
  };

  const restoreDefaults = () =>
    onChange(
      manifestOrder(roles, manifest).map(row => {
        const declared = manifestRoleOf(manifest, row.name);
        return declared ? { ...row, enabled: declared.default_enabled === true } : row;
      })
    );

  const hasCatalog = specs && Object.keys(specs).length > 0;
  const changed = changedRolesOf(roles, manifest);
  const changedIds = new Set(changed.map(row => row._ui_id));
  const onCount = roles.filter(isOn).length;
  const needle = needleOf(query);
  const fields = fieldsOf({
    fieldConfig,
    roles,
    answers,
    errors: fieldErrors,
    onAnswerChange,
    inventory,
    onArtifactsReload,
    host,
    artifacts,
  });

  return (
    <div className="hw-prov-grid">
      <div>
        <p className="hw-prov-pane-title">
          {t('provisioning.provisioningRolesTab.availableRolesHeading')}
        </p>
        <div className="hw-prov-catalog">
          {onPackagePicked && (packages !== null || packageName) ? (
            <PackagePicker
              packages={packages || []}
              packageName={packageName}
              packageVersion={packageVersion}
              disabled={disabled}
              onPicked={onPackagePicked}
            />
          ) : null}
          {hasCatalog ? (
            <RoleCatalog
              specs={specs}
              query={query}
              disabled={disabled}
              onAdd={name => insertAt(name, roles.length)}
              onDragNew={name => {
                setDrag(name ? { kind: 'new', name } : null);
                setDropTarget(null);
              }}
            />
          ) : (
            <p className="hw-cat-empty">
              {packages === null
                ? t('provisioning.provisioningRolesTab.noCatalogNoRegistry')
                : t('provisioning.provisioningRolesTab.noCatalogPickPackage')}
            </p>
          )}
          <CustomRoleAdd disabled={disabled} onAdd={name => insertAt(name, roles.length)} />
        </div>
      </div>

      <div>
        <p className="hw-prov-pane-title">
          {t('provisioning.provisioningRolesTab.executionOrderHeading', { count: roles.length })}
          {manifest.length > 0
            ? ` · ${t('provisioning.provisioningRolesTab.onCount', { count: onCount })}`
            : ''}
        </p>
        <p className="form-text text-muted mt-0 mb-2">
          {t('provisioning.provisioningRolesTab.executionOrderIntro1')}{' '}
          <code>allow_duplicates</code>{' '}
          {t('provisioning.provisioningRolesTab.executionOrderIntro2')}
        </p>
        {changed.length > 0 ? (
          <div
            className="alert alert-warning py-2 d-flex align-items-center gap-2 flex-wrap"
            role="status"
            data-note="roles-changed"
          >
            <FaTriangleExclamation aria-hidden="true" />
            <span className="flex-grow-1">
              {t('provisioning.provisioningRolesTab.changedBanner', {
                count: changed.length,
                names: changed
                  .map(row => manifestRoleOf(manifest, row.name)?.label || bareRoleName(row.name))
                  .join(', '),
              })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="roles-defaults"
              disabled={disabled}
              onClick={restoreDefaults}
            >
              {t('provisioning.provisioningRolesTab.templateDefaults')}
            </button>
          </div>
        ) : null}
        <div className="d-flex flex-column gap-2" role="list" data-list="roles">
          {roles.map((role, index) => {
            const manifestRole = manifestRoleOf(manifest, role.name);
            const spec = roleSpecOf(specs, role.name);
            if (!runRoleMatches(role, { manifestRole, spec }, needle)) {
              return null;
            }
            return (
              <RoleCard
                key={role._ui_id}
                role={role}
                index={index}
                spec={spec}
                manifestRole={manifestRole}
                warnings={dependencyWarnings(roles, hints, index)}
                changed={changedIds.has(role._ui_id)}
                attention={roleNeedsAttention({
                  roleRow: role,
                  manifestRole,
                  artifacts,
                  queued,
                  spec,
                })}
                artifacts={artifacts}
                queued={queued}
                fields={fields}
                expanded={expanded.has(role._ui_id)}
                dragging={drag?.kind === 'move' && drag.id === role._ui_id}
                dropTarget={dropTarget === role._ui_id}
                disabled={disabled}
                onDragOver={event => {
                  event.preventDefault();
                  if (drag?.kind === 'new') {
                    setDropTarget(role._ui_id);
                  } else {
                    moveOver(role._ui_id);
                  }
                }}
                onDragLeave={() => {
                  if (dropTarget === role._ui_id) {
                    setDropTarget(null);
                  }
                }}
                onDrop={event => {
                  if (drag?.kind !== 'new') {
                    return;
                  }
                  event.preventDefault();
                  dropNew(index);
                }}
                onDragStart={() => setDrag({ kind: 'move', id: role._ui_id })}
                onDragEnd={() => setDrag(null)}
                onDuplicate={() => {
                  const next = [...roles];
                  next.splice(index + 1, 0, makeRow(null, role));
                  onChange(next);
                }}
                onToggle={() => toggleExpanded(role._ui_id)}
                onRemove={() => onChange(roles.filter(row => row._ui_id !== role._ui_id))}
                onPatch={patch => patchRole(role._ui_id, patch)}
                onOpenPick={kind => setPicking({ uiId: role._ui_id, kind })}
                onPickFile={(kind, row) => pickFile(role._ui_id, kind, row)}
                onFetch={onFetch}
                onRun={onRun ? () => onRun({ roles: [role.name] }) : null}
              />
            );
          })}
          {drag?.kind === 'new' ? (
            <div
              className="hw-drop-endzone"
              role="listitem"
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                dropNew(roles.length);
              }}
            >
              {t('provisioning.provisioningRolesTab.dropHereToAdd')}
            </div>
          ) : null}
        </div>
      </div>
      <FilePickDialog
        picking={picking}
        roles={roles}
        manifest={manifest}
        artifacts={artifacts}
        host={host}
        disabled={disabled}
        onPick={(uiId, kind, row) => {
          pickFile(uiId, kind, row);
          setPicking(null);
        }}
        onFetch={onFetch}
        onReload={onArtifactsReload}
        onClose={() => setPicking(null)}
      />
    </div>
  );
};

ProvisioningRolesTab.propTypes = {
  roles: PropTypes.array.isRequired,
  specs: PropTypes.object,
  hints: PropTypes.object,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  packages: PropTypes.array,
  packageName: PropTypes.string,
  packageVersion: PropTypes.string,
  onPackagePicked: PropTypes.func,
  manifest: PropTypes.array,
  artifacts: PropTypes.array,
  queued: PropTypes.object,
  onAnswers: PropTypes.func,
  onFetch: PropTypes.func,
  fieldConfig: PropTypes.object,
  answers: PropTypes.object,
  fieldErrors: PropTypes.object,
  onAnswerChange: PropTypes.func,
  inventory: PropTypes.object,
  onArtifactsReload: PropTypes.func,
  host: PropTypes.object,
  query: PropTypes.string,
  onRun: PropTypes.func,
};

export default ProvisioningRolesTab;
