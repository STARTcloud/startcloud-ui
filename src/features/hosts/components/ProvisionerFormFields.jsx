import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaTriangleExclamation } from 'react-icons/fa6';

import { seedRoles } from '../utils/provisioning';

export { seedRoles };

const ROLE_FILE_GROUPS = [
  [
    ['installer', 'provisioning.provisionerFormFields.installerLabel'],
    ['installer_hash', 'provisioning.provisionerFormFields.installerHashLabel'],
    ['installer_version', 'provisioning.provisionerFormFields.installerVersionLabel'],
  ],
  [
    ['fixpack', 'provisioning.provisionerFormFields.fixpackLabel'],
    ['fixpack_hash', 'provisioning.provisionerFormFields.fixpackHashLabel'],
    ['fixpack_version', 'provisioning.provisionerFormFields.fixpackVersionLabel'],
  ],
  [
    ['hotfix', 'provisioning.provisionerFormFields.hotfixLabel'],
    ['hotfix_hash', 'provisioning.provisionerFormFields.hotfixHashLabel'],
    ['hotfix_version', 'provisioning.provisionerFormFields.hotfixVersionLabel'],
  ],
];

const RoleFileInput = ({ roleName, fileKey, label, value, onChange, loading, suggestions }) => {
  const inputId = `role-${roleName}-${fileKey}`;
  const listId = suggestions?.length ? `${inputId}-options` : undefined;
  return (
    <div className="col-12 col-md-4">
      <label className="form-label small mb-1" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="form-control form-control-sm"
        type="text"
        list={listId}
        value={value ?? ''}
        onChange={event => onChange(fileKey, event.target.value)}
        disabled={loading}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions.map(artifact => (
            <option key={artifact.filename} value={artifact.filename} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
};

RoleFileInput.propTypes = {
  roleName: PropTypes.string.isRequired,
  fileKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  suggestions: PropTypes.array,
};

/**
 * The roles of a provisioner version's `metadata.roles`, hyperweaver-ui's
 * roles editor: an enabled toggle per role and, while enabled, the
 * installer, fixpack and hotfix file fields, the host's file cache
 * offering filenames that fill the hash and version on a pick;
 * `artifacts` null where the host has no file cache.
 */
export const RolesEditor = ({ roles, onRolesChange, loading, artifacts }) => {
  const { t } = useTranslation();
  const setRole = (index, patch) => {
    onRolesChange(roles.map((role, at) => (at === index ? { ...role, ...patch } : role)));
  };

  const suggestionsFor = (roleName, kind) =>
    (artifacts || []).filter(
      artifact =>
        artifact.role === roleName && artifact.file_type === kind && artifact.file_exists !== false
    );

  const handleFileChange = (index, role, kind, fileKey, value) => {
    const patch = { [fileKey]: value };
    const match = suggestionsFor(role.name, kind).find(artifact => artifact.filename === value);
    if (match) {
      patch[`${kind}_hash`] = match.expected_sha256 || match.checksum || '';
      if (match.version) {
        patch[`${kind}_version`] = match.version;
      }
    }
    setRole(index, { files: { ...role.files, ...patch } });
  };

  if (roles.length === 0) {
    return (
      <p className="text-muted mb-0">{t('provisioning.provisionerFormFields.noRolesDeclared')}</p>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      {roles.map((role, index) => (
        <div key={role.name} className="border rounded p-2">
          <div className="form-check form-switch mb-0">
            <input
              id={`role-enabled-${role.name}`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={role.enabled}
              onChange={event => setRole(index, { enabled: event.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label fw-semibold" htmlFor={`role-enabled-${role.name}`}>
              {role.name}
            </label>
          </div>
          {role.enabled ? (
            <div className="mt-2">
              {ROLE_FILE_GROUPS.map(group => {
                const [[kind]] = group;
                return (
                  <div className="row g-2 mb-1" key={kind}>
                    {group.map(([fileKey, labelKey]) => (
                      <RoleFileInput
                        key={fileKey}
                        roleName={role.name}
                        fileKey={fileKey}
                        label={t(labelKey)}
                        value={role.files?.[fileKey]}
                        onChange={(key, value) =>
                          key === kind
                            ? handleFileChange(index, role, kind, key, value)
                            : setRole(index, { files: { ...role.files, [key]: value } })
                        }
                        loading={loading}
                        suggestions={fileKey === kind ? suggestionsFor(role.name, kind) : null}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
      {artifacts !== null ? (
        <p className="form-text text-warning mb-0">
          <FaTriangleExclamation className="me-1" aria-hidden="true" />
          {t('provisioning.provisionerFormFields.fileCacheWarning')}
        </p>
      ) : null}
    </div>
  );
};

RolesEditor.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      enabled: PropTypes.bool,
      files: PropTypes.object,
    })
  ).isRequired,
  onRolesChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  artifacts: PropTypes.array,
};
