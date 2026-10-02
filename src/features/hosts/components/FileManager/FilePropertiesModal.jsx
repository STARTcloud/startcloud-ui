import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../../components/common/RecordRows';
import { useStatus } from '../../../../contexts/StatusContext';
import { log } from '../../../../lib/logger';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { fetchOwnerChoices } from '../../api/files';
import {
  DEFAULT_MODE,
  DEFAULT_OWNER,
  isWindowsAgent,
  octalOf,
  permissionsOf,
} from '../../utils/fileManager';
import ToolFormDialog from '../ToolFormDialog';

import PermissionEditor from './PermissionEditor';

const NO_CHOICES = { users: [], groups: [] };

const optionOf = (rows, member, value) =>
  rows.find(row => String(row[member]) === String(value)) || null;

const PropertiesComparison = ({ file, form, users, groups, currentOctal }) => {
  const { t } = useTranslation();
  const unknown = t('fileManager.filePropertiesComparison.unknown');
  const none = t('fileManager.filePropertiesComparison.noChange');
  const user = optionOf(users, 'uid', form.user);
  const group = optionOf(groups, 'gid', form.group);
  const meta = file._hwMetadata || {};
  return (
    <div className="alert alert-info mb-0" data-note="properties-comparison">
      <div className="row">
        <div className="col">
          <strong>{t('fileManager.filePropertiesComparison.currentLabel')}</strong>
          <br />
          {t('fileManager.filePropertiesComparison.userLabel')} {meta.uid ?? unknown}
          <br />
          {t('fileManager.filePropertiesComparison.groupLabel')} {meta.gid ?? unknown}
          <br />
          {t('fileManager.filePropertiesComparison.modeLabel')} {meta.permissions?.octal || unknown}
        </div>
        <div className="col">
          <strong>{t('fileManager.filePropertiesComparison.newLabel')}</strong>
          <br />
          {t('fileManager.filePropertiesComparison.userLabel')}{' '}
          {form.user ? `${user?.username ?? unknown} (${form.user})` : none}
          <br />
          {t('fileManager.filePropertiesComparison.groupLabel')}{' '}
          {form.group ? `${group?.groupname ?? unknown} (${form.group})` : none}
          <br />
          {t('fileManager.filePropertiesComparison.modeLabel')} {currentOctal}
        </div>
      </div>
    </div>
  );
};

PropertiesComparison.propTypes = {
  file: PropTypes.object.isRequired,
  form: PropTypes.shape({ user: PropTypes.string, group: PropTypes.string }).isRequired,
  users: PropTypes.array.isRequired,
  groups: PropTypes.array.isRequired,
  currentOctal: PropTypes.string.isRequired,
};

const OwnerSelect = ({
  id,
  labelKey,
  value,
  rows,
  keyMember,
  nameMember,
  current,
  onChange,
  busy,
}) => {
  const { t } = useTranslation();
  const chosen = optionOf(rows, keyMember, value);
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {t(labelKey)}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={busy}
      >
        <option value="">{t('fileManager.filePropertiesModal.keepCurrent')}</option>
        {rows.map(row => (
          <option key={row[keyMember]} value={String(row[keyMember])}>
            {row[nameMember]} ({row[keyMember]})
          </option>
        ))}
      </select>
      <p className="form-text text-muted mb-0">
        {t(current.key, {
          name: chosen?.[nameMember] || t('fileManager.filePropertiesModal.unknown'),
          id: value || current.id || t('fileManager.filePropertiesModal.unknown'),
        })}
      </p>
    </div>
  );
};

OwnerSelect.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  keyMember: PropTypes.string.isRequired,
  nameMember: PropTypes.string.isRequired,
  current: PropTypes.shape({ key: PropTypes.string.isRequired, id: PropTypes.any }).isRequired,
  onChange: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

const factRows = (file, t) => {
  const unknown = t('fileManager.filePropertiesModal.unknown');
  return [
    { key: 'name', label: t('fileManager.filePropertiesModal.nameLabel'), value: file.name },
    { key: 'path', label: t('fileManager.filePropertiesModal.pathLabel'), value: file.path },
    {
      key: 'type',
      label: t('fileManager.filePropertiesModal.typeLabel'),
      value: t(
        file.isDirectory
          ? 'fileManager.filePropertiesModal.directory'
          : 'fileManager.filePropertiesModal.file'
      ),
    },
    {
      key: 'size',
      label: t('fileManager.filePropertiesModal.sizeLabel'),
      value: formatFileSize(file.size),
    },
    {
      key: 'modified',
      label: t('fileManager.filePropertiesModal.modifiedLabel'),
      value: file.updatedAt ? new Date(file.updatedAt).toLocaleString() : unknown,
    },
    {
      key: 'mime',
      label: t('fileManager.filePropertiesModal.mimeTypeLabel'),
      value: file._hwMetadata?.mimeType || unknown,
    },
  ];
};

/**
 * The properties dialog of a file, hyperweaver-ui's: the file's facts,
 * on a POSIX agent the owner and the group among the accounts read once
 * on open, the permission editor, the recursive switch for a directory,
 * the comparison of the current and the new values, and the guide; Apply
 * sends `PATCH filesystem/permissions` once.
 */
const FilePropertiesModal = ({ id, server, file, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const meta = file._hwMetadata || {};
  const original = meta.permissions?.octal || '';
  const [choices, setChoices] = useState(NO_CHOICES);
  const [form, setForm] = useState({
    user: meta.uid === undefined || meta.uid === null ? String(DEFAULT_OWNER) : String(meta.uid),
    group: meta.gid === undefined || meta.gid === null ? String(DEFAULT_OWNER) : String(meta.gid),
    recursive: false,
  });
  const [permissions, setPermissions] = useState(() => permissionsOf(original || DEFAULT_MODE));
  const [customMode, setCustomMode] = useState(original || DEFAULT_MODE);
  const [useCustomMode, setUseCustomMode] = useState(false);
  const windows = isWindowsAgent(server);
  const currentOctal = useCustomMode ? customMode : octalOf(permissions);

  useEffect(() => {
    fetchOwnerChoices(status, id).then(setChoices, error =>
      log.api.warn('Owner choices unavailable', { error: error.message })
    );
  }, [status, id]);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  return (
    <ToolFormDialog
      dialog="file-properties"
      title={t('fileManager.filePropertiesModal.title', { name: file.name })}
      submitKey="fileManager.filePropertiesModal.applyChanges"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit({ file, form: { ...form, mode: currentOctal } })}
    >
      <RecordRows rows={factRows(file, t)} className="mb-0" />
      <div className="row">
        {windows ? null : (
          <div className="col" data-panel="file-ownership">
            <h5 className="h6">{t('fileManager.filePropertiesModal.ownershipHeading')}</h5>
            <OwnerSelect
              id="file-props-user"
              labelKey="fileManager.filePropertiesModal.userLabel"
              value={form.user}
              rows={choices.users}
              keyMember="uid"
              nameMember="username"
              current={{ key: 'fileManager.filePropertiesModal.currentUser', id: meta.uid }}
              onChange={value => set('user', value)}
              busy={busy}
            />
            <OwnerSelect
              id="file-props-group"
              labelKey="fileManager.filePropertiesModal.groupLabel"
              value={form.group}
              rows={choices.groups}
              keyMember="gid"
              nameMember="groupname"
              current={{ key: 'fileManager.filePropertiesModal.currentGroup', id: meta.gid }}
              onChange={value => set('group', value)}
              busy={busy}
            />
          </div>
        )}
        <PermissionEditor
          permissions={permissions}
          onPermissionChange={(category, type, value) => {
            setPermissions(current => ({
              ...current,
              [category]: { ...current[category], [type]: value },
            }));
            setUseCustomMode(false);
          }}
          useCustomMode={useCustomMode}
          setUseCustomMode={setUseCustomMode}
          customMode={customMode}
          currentOctal={currentOctal}
          onCustomModeChange={value => {
            setCustomMode(value);
            setUseCustomMode(true);
          }}
          originalOctal={original}
          setPermissions={setPermissions}
        />
      </div>
      {file.isDirectory ? (
        <div>
          <div className="form-check">
            <input
              id="file-props-recursive"
              type="checkbox"
              className="form-check-input"
              checked={form.recursive}
              onChange={event => set('recursive', event.target.checked)}
            />
            <label className="form-check-label" htmlFor="file-props-recursive">
              {t('fileManager.filePropertiesModal.applyRecursively')}
            </label>
          </div>
          <p className="form-text text-warning mb-0">
            {t('fileManager.filePropertiesModal.recursiveWarning')}
          </p>
        </div>
      ) : null}
      <PropertiesComparison
        file={file}
        form={windows ? { user: '', group: '' } : form}
        users={choices.users}
        groups={choices.groups}
        currentOctal={currentOctal}
      />
      <div className="alert alert-dark small mb-0" data-note="permission-guide">
        <strong>{t('fileManager.filePropertiesModal.permissionGuide')}</strong>
        <br />
        <strong>{t('fileManager.filePropertiesModal.readLabel')}</strong>{' '}
        {t('fileManager.filePropertiesModal.readDesc')}
        <br />
        <strong>{t('fileManager.filePropertiesModal.writeLabel')}</strong>{' '}
        {t('fileManager.filePropertiesModal.writeDesc')}
        <br />
        <strong>{t('fileManager.filePropertiesModal.executeLabel')}</strong>{' '}
        {t('fileManager.filePropertiesModal.executeDesc')}
        <br />
        <strong>{t('fileManager.filePropertiesModal.commonModes')}</strong>{' '}
        {t('fileManager.filePropertiesModal.commonModesDesc')}
      </div>
    </ToolFormDialog>
  );
};

FilePropertiesModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  file: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default FilePropertiesModal;
