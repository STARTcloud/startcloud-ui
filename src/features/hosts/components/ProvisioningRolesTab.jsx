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

import { VarRowList, ROLE_NAME_PATTERN, applyPatch } from './ProvisioningVarRows';

const NO_COLLECTION = 'no collection';

const bareName = name =>
  String(name || '')
    .split('.')
    .pop();

const specFor = (specs, name) => {
  if (!specs || !name) {
    return null;
  }
  const bare = bareName(name);
  const spec = specs[bare];
  if (!spec) {
    return null;
  }
  if (name.includes('.') && spec.collection && name !== `${spec.collection}.${bare}`) {
    return null;
  }
  return spec;
};

const dependencyWarnings = (roles, hints, index) => {
  const deps = hints?.[bareName(roles[index].name)];
  if (!Array.isArray(deps) || deps.length === 0) {
    return [];
  }
  const warnings = [];
  deps.forEach(dep => {
    const first = roles.findIndex(row => bareName(row.name) === dep);
    if (first === -1) {
      warnings.push({ dep, kind: 'absent' });
    } else if (first > index) {
      warnings.push({ dep, kind: 'below' });
    }
  });
  return warnings;
};

const blankToUndefined = value => (value === '' ? undefined : value);

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

const RoleCatalog = ({ specs, disabled, onAdd, onDragNew }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const groups = {};
  Object.entries(specs).forEach(([bare, spec]) => {
    const matches =
      query === '' ||
      bare.includes(query.toLowerCase()) ||
      String(spec.short_description || '')
        .toLowerCase()
        .includes(query.toLowerCase());
    if (!matches) {
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
      <div className="hw-cat-search">
        <input
          className="form-control form-control-sm"
          type="search"
          placeholder={t('provisioning.provisioningRolesTab.searchRolesPlaceholder')}
          aria-label={t('provisioning.provisioningRolesTab.searchRolesAriaLabel')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      <div className="hw-cat-scroll">
        {Object.keys(groups)
          .sort()
          .map(collection => {
            const open = query !== '' || !collapsed.has(collection);
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
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onDragNew: PropTypes.func.isRequired,
};

const RoleChips = ({ role }) => {
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

const RoleCardBody = ({ role, spec, disabled, onPatch }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-rc-body">
      {spec?.short_description ? <p className="hw-rc-desc">{spec.short_description}</p> : null}
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
      <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.variablesHeading')}</div>
      <VarRowList
        idPrefix={`role-${role._ui_id}`}
        entries={role.vars || {}}
        specOptions={spec?.options || null}
        disabled={disabled}
        addLabel={t('provisioning.provisioningRolesTab.addVariable')}
        onChange={next => onPatch({ vars: Object.keys(next).length > 0 ? next : undefined })}
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
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const RoleCardName = ({ role, spec, disabled, onPatch }) => {
  const { t } = useTranslation();
  if (spec) {
    return (
      <div className="hw-rc-name">
        <span className="hw-rc-role">{bareName(role.name)}</span>
        <span className="hw-rc-coll">{spec.collection}</span>
        <RoleChips role={role} />
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
      <RoleChips role={role} />
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
  warnings,
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
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`hw-role-card ${dragging ? 'hw-dragging' : ''} ${dropTarget ? 'hw-drop-target' : ''}`}
      role="listitem"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="hw-rc-head">
        <button
          type="button"
          className="btn btn-link p-0 text-muted hw-grip"
          draggable={!disabled}
          title={t('provisioning.provisioningRolesTab.dragToReorder')}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <FaGripVertical aria-hidden="true" />
        </button>
        <span className="hw-run-num">{index + 1}</span>
        <RoleCardName role={role} spec={spec} disabled={disabled} onPatch={onPatch} />
        <div className="hw-rc-actions">
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
        </div>
      </div>
      {warnings.map(warning => (
        <div className="hw-dep-warning" key={warning.dep}>
          <FaTriangleExclamation className="me-1" aria-hidden="true" />
          {t('provisioning.provisioningRolesTab.needsDependency')} <code>{warning.dep}</code>{' '}
          {warning.kind === 'absent'
            ? t('provisioning.provisioningRolesTab.dependencyAbsent')
            : t('provisioning.provisioningRolesTab.dependencyBelow')}
        </div>
      ))}
      {expanded ? (
        <RoleCardBody role={role} spec={spec} disabled={disabled} onPatch={onPatch} />
      ) : null}
    </div>
  );
};

RoleCard.propTypes = {
  role: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  spec: PropTypes.object,
  warnings: PropTypes.array.isRequired,
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
};

/**
 * The Roles tab of the provisioning editor, hyperweaver-ui's dual list:
 * the attached package's role catalog on the left, grouped by collection
 * and searchable, the machine's ordered run on the right; a role is
 * added by click or by a drag to its slot, duplicates allowed, each card
 * editing only its own entry, and the registry's depends_on hints drawn
 * as advisories.
 */
const ProvisioningRolesTab = ({
  roles,
  specs,
  hints,
  disabled,
  onChange,
  makeRow,
  packages,
  packageName,
  packageVersion,
  onPackagePicked,
}) => {
  const { t } = useTranslation();
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = uiId =>
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(uiId)) {
        next.delete(uiId);
      } else {
        next.add(uiId);
      }
      return next;
    });

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

  const patchRole = (uiId, patch) =>
    onChange(roles.map(row => (row._ui_id === uiId ? applyPatch(row, patch) : row)));

  const hasCatalog = specs && Object.keys(specs).length > 0;

  return (
    <div className="hw-prov-grid">
      <div>
        <p className="hw-prov-pane-title">
          {t('provisioning.provisioningRolesTab.availableRolesHeading')}
        </p>
        <div className="hw-prov-catalog">
          {packages !== null || packageName ? (
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
        </p>
        <p className="form-text text-muted mt-0 mb-2">
          {t('provisioning.provisioningRolesTab.executionOrderIntro1')}{' '}
          <code>allow_duplicates</code>{' '}
          {t('provisioning.provisioningRolesTab.executionOrderIntro2')}
        </p>
        <div className="d-flex flex-column gap-2" role="list">
          {roles.map((role, index) => (
            <RoleCard
              key={role._ui_id}
              role={role}
              index={index}
              spec={specFor(specs, role.name)}
              warnings={dependencyWarnings(roles, hints, index)}
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
            />
          ))}
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
  onPackagePicked: PropTypes.func.isRequired,
};

export default ProvisioningRolesTab;
