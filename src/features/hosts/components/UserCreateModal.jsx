import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { USER_FORM, USER_SHELLS, userCreateBody } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

const TextField = ({
  id,
  labelKey,
  value,
  onChange,
  placeholderKey,
  required = false,
  hint = null,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)} {required ? <span className="text-danger">*</span> : null}
      </label>
      <input
        id={id}
        className="form-control"
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={t(placeholderKey)}
        required={required}
      />
      {hint ? <p className="form-text text-muted">{hint}</p> : null}
    </div>
  );
};

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholderKey: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.node,
};

const Switch = ({ id, labelKey, checked, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <div className="form-check form-switch">
        <input
          id={id}
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
        />
        <label className="form-check-label" htmlFor={id}>
          {t(labelKey)}
        </label>
      </div>
    </div>
  );
};

Switch.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const AdvancedFields = ({ form, set, groups, roles }) => {
  const { t } = useTranslation();
  return (
    <>
      <hr />
      <h6 className="fw-bold">{t('host.userCreateModal.rbacConfiguration')}</h6>
      <TextField
        id="user-create-groups"
        labelKey="host.userCreateModal.groups"
        value={form.groups}
        onChange={value => set('groups', value)}
        placeholderKey="host.userCreateModal.groupsPlaceholder"
        hint={t('host.userCreateModal.availableGroups', { groups: groups.join(', ') })}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="user-create-authorizations">
          {t('host.userCreateModal.authorizations')}
        </label>
        <textarea
          id="user-create-authorizations"
          className="form-control"
          rows="2"
          value={form.authorizations}
          onChange={event => set('authorizations', event.target.value)}
          placeholder={t('host.userCreateModal.authorizationsPlaceholder')}
        />
      </div>
      <TextField
        id="user-create-profiles"
        labelKey="host.userCreateModal.profiles"
        value={form.profiles}
        onChange={value => set('profiles', value)}
        placeholderKey="host.userCreateModal.profilesPlaceholder"
      />
      <TextField
        id="user-create-roles"
        labelKey="host.userCreateModal.roles"
        value={form.roles}
        onChange={value => set('roles', value)}
        placeholderKey="host.userCreateModal.rolesPlaceholder"
        hint={t('host.userCreateModal.availableRoles', { roles: roles.join(', ') })}
      />
      <TextField
        id="user-create-project"
        labelKey="host.userCreateModal.project"
        value={form.project}
        onChange={value => set('project', value)}
        placeholderKey="host.userCreateModal.projectPlaceholder"
      />
    </>
  );
};

AdvancedFields.propTypes = {
  form: PropTypes.object.isRequired,
  set: PropTypes.func.isRequired,
  groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Create a user, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the advanced switch, the username, the uid in
 * advanced mode, the comment, the shell, in advanced mode the groups,
 * the authorizations, the profiles, the roles and the project, the
 * home and personal group switches and the ZFS home in advanced mode,
 * and Create user, held by the username required, which sends
 * `POST system/users` with the body of `userCreateBody`. The groups and
 * the roles the host holds are the ones the page already read.
 */
const UserCreateModal = ({ groups, roles, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState(USER_FORM);
  const [problem, setProblem] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = () => {
    if (!form.username.trim()) {
      setProblem('host.userCreateModal.usernameRequired');
      return;
    }
    setProblem('');
    onConfirm(userCreateBody(form, advanced));
  };

  return (
    <ToolFormDialog
      dialog="user-create"
      title={t('host.userCreateModal.createUser')}
      submitKey="host.userCreateModal.createUser"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <Switch
        id="user-create-advanced"
        labelKey="host.userCreateModal.advancedModeRbac"
        checked={advanced}
        onChange={setAdvanced}
      />
      <hr />
      <TextField
        id="user-create-username"
        labelKey="host.userCreateModal.username"
        value={form.username}
        onChange={value => set('username', value)}
        placeholderKey="host.userCreateModal.enterUsername"
        required
      />
      {advanced ? (
        <div className="mb-3">
          <label className="form-label" htmlFor="user-create-uid">
            {t('host.userCreateModal.userIdUid')}
          </label>
          <input
            id="user-create-uid"
            className="form-control"
            type="number"
            value={form.uid}
            onChange={event => set('uid', event.target.value)}
            placeholder={t('host.userCreateModal.autoAssignIfEmpty')}
          />
        </div>
      ) : null}
      <TextField
        id="user-create-comment"
        labelKey="host.userCreateModal.comment"
        value={form.comment}
        onChange={value => set('comment', value)}
        placeholderKey="host.userCreateModal.userDescriptionOrFullName"
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="user-create-shell">
          {t('host.userCreateModal.shell')}
        </label>
        <select
          id="user-create-shell"
          className="form-select"
          value={form.shell}
          onChange={event => set('shell', event.target.value)}
        >
          {USER_SHELLS.map(shell => (
            <option key={shell} value={shell}>
              {shell}
            </option>
          ))}
        </select>
      </div>
      {advanced ? <AdvancedFields form={form} set={set} groups={groups} roles={roles} /> : null}
      <hr />
      <Switch
        id="user-create-home"
        labelKey="host.userCreateModal.createHomeDirectory"
        checked={form.createHome}
        onChange={value => set('createHome', value)}
      />
      <Switch
        id="user-create-personal-group"
        labelKey="host.userCreateModal.createPersonalGroup"
        checked={form.createPersonalGroup}
        onChange={value => set('createPersonalGroup', value)}
      />
      {advanced ? (
        <Switch
          id="user-create-force-zfs"
          labelKey="host.userCreateModal.forceZfsHomeDirectory"
          checked={form.forceZfs}
          onChange={value => set('forceZfs', value)}
        />
      ) : null}
    </ToolFormDialog>
  );
};

UserCreateModal.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default UserCreateModal;
