import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import {
  PERMISSION_CATEGORIES,
  PERMISSION_PRESETS,
  PERMISSION_TYPES,
  permissionsOf,
} from '../../utils/fileManager';
import { DialogTable } from '../ManageTable';

const CATEGORY_KEYS = {
  owner: 'hostTools.PermissionEditor.ownerLabel',
  group: 'hostTools.PermissionEditor.groupLabel',
  other: 'hostTools.PermissionEditor.otherLabel',
};

const TYPE_KEYS = {
  read: 'hostTools.PermissionEditor.readHeader',
  write: 'hostTools.PermissionEditor.writeHeader',
  execute: 'hostTools.PermissionEditor.executeHeader',
};

const PermissionBox = ({ row, type, ctx }) => (
  <input
    type="checkbox"
    className="form-check-input"
    id={`file-props-${row.key}-${type}`}
    aria-label={`${ctx.t(CATEGORY_KEYS[row.key])} ${ctx.t(TYPE_KEYS[type])}`}
    checked={row[type]}
    onChange={event => ctx.onPermissionChange(row.key, type, event.target.checked)}
  />
);

PermissionBox.propTypes = {
  row: PropTypes.object.isRequired,
  type: PropTypes.oneOf(PERMISSION_TYPES).isRequired,
  ctx: PropTypes.shape({
    t: PropTypes.func.isRequired,
    onPermissionChange: PropTypes.func.isRequired,
  }).isRequired,
};

const COLUMNS = [
  {
    key: 'category',
    kind: 'name',
    labelKey: 'hostTools.PermissionEditor.permissionsHeading',
    value: (row, ctx) => ctx.t(CATEGORY_KEYS[row.key]),
    render: (row, ctx) => <strong>{ctx.t(CATEGORY_KEYS[row.key])}</strong>,
  },
  ...PERMISSION_TYPES.map(type => ({
    key: type,
    kind: 'word',
    labelKey: TYPE_KEYS[type],
    value: row => (row[type] ? 1 : 0),
    render: (row, ctx) => <PermissionBox row={row} type={type} ctx={ctx} />,
  })),
];

/**
 * The permissions of a file as hyperweaver-ui's editor: the boxes of
 * the owner, the group and the other over the one table, the octal
 * mode typed by hand while its switch is on, and the three presets.
 */
const PermissionEditor = ({
  permissions,
  onPermissionChange,
  useCustomMode,
  setUseCustomMode,
  customMode,
  currentOctal,
  onCustomModeChange,
  originalOctal,
  setPermissions,
}) => {
  const { t } = useTranslation();
  const rows = PERMISSION_CATEGORIES.map(key => ({ key, ...permissions[key] }));
  return (
    <div className="col" data-panel="permission-editor">
      <h5 className="h6">{t('hostTools.PermissionEditor.permissionsHeading')}</h5>
      <DialogTable
        name="permissions"
        columns={COLUMNS}
        rows={rows}
        rowKey={row => row.key}
        ctx={{ t, onPermissionChange }}
        emptyText=""
      />
      <div className="mb-3">
        <div className="form-check mb-2">
          <input
            id="file-props-use-custom-mode"
            type="checkbox"
            className="form-check-input"
            checked={useCustomMode}
            onChange={event => setUseCustomMode(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="file-props-use-custom-mode">
            {t('hostTools.PermissionEditor.useCustomOctalLabel')}
          </label>
        </div>
        <input
          id="file-props-octal"
          className="form-control"
          type="text"
          value={useCustomMode ? customMode : currentOctal}
          onChange={event => onCustomModeChange(event.target.value)}
          placeholder={t('hostTools.PermissionEditor.octalPlaceholder')}
          disabled={!useCustomMode}
          pattern="[0-7]{3,4}"
        />
        <p className="form-text text-muted">
          {t('hostTools.PermissionEditor.octalHelp', {
            currentOctal,
            originalOctal: originalOctal || t('fileManager.filePropertiesModal.unknown'),
          })}
        </p>
      </div>
      <div className="mb-3">
        <span className="form-label">{t('hostTools.PermissionEditor.quickPresetsLabel')}</span>
        <div className="d-flex gap-2">
          {PERMISSION_PRESETS.map(preset => (
            <button
              key={preset.mode}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-preset={preset.mode}
              onClick={() => {
                setPermissions(permissionsOf(preset.mode));
                setUseCustomMode(false);
              }}
            >
              {t(preset.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

PermissionEditor.propTypes = {
  permissions: PropTypes.object.isRequired,
  onPermissionChange: PropTypes.func.isRequired,
  useCustomMode: PropTypes.bool.isRequired,
  setUseCustomMode: PropTypes.func.isRequired,
  customMode: PropTypes.string.isRequired,
  currentOctal: PropTypes.string.isRequired,
  onCustomModeChange: PropTypes.func.isRequired,
  originalOctal: PropTypes.string,
  setPermissions: PropTypes.func.isRequired,
};

export default PermissionEditor;
