import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchUserAttributes } from '../api/manage';
import { USER_SHELLS, userEditBody } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

const formOf = user => ({
  comment: user.comment || '',
  shell: user.shell || '/bin/bash',
  groups: '',
  authorizations: '',
  profiles: '',
});

const joined = list => (Array.isArray(list) ? list.join(', ') : '');

/**
 * Edit a user, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the username read-only, the comment, the shell, the
 * secondary groups, the authorizations and the profiles, the last three
 * filled from `GET system/users/{name}/attributes` once the dialog
 * opens, and Update user, which sends `PUT system/users/{name}` with
 * the changed members of `userEditBody` and says so when nothing
 * changed. The groups the host holds are the ones the page already
 * read.
 */
const UserEditModal = ({ id, user, groups, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(() => formOf(user));
  const [problem, setProblem] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    let mounted = true;
    fetchUserAttributes(status, id, user.username)
      .then(attributes => {
        if (mounted) {
          setForm(current => ({
            ...current,
            groups: joined(attributes.groups),
            authorizations: joined(attributes.authorizations),
            profiles: joined(attributes.profiles),
          }));
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [status, id, user.username]);

  const submit = () => {
    const body = userEditBody(form, user);
    if (!body) {
      setProblem('host.userEditModal.noChangesDetected');
      return;
    }
    setProblem('');
    onConfirm(body);
  };

  return (
    <ToolFormDialog
      dialog="user-edit"
      title={t('host.userEditModal.editUserTitle', { username: user.username })}
      submitKey="host.userEditModal.updateUser"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-username">
          {t('host.userEditModal.username')}
        </label>
        <input
          id="user-edit-username"
          className="form-control"
          type="text"
          value={user.username}
          disabled
          readOnly
        />
        <p className="form-text text-muted">{t('host.userEditModal.usernameCannotBeChanged')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-comment">
          {t('host.userEditModal.comment')}
        </label>
        <input
          id="user-edit-comment"
          className="form-control"
          type="text"
          value={form.comment}
          onChange={event => set('comment', event.target.value)}
          placeholder={t('host.userEditModal.userDescriptionOrFullName')}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-shell">
          {t('host.userEditModal.shell')}
        </label>
        <select
          id="user-edit-shell"
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
      <hr />
      <h6 className="fw-bold">{t('host.userEditModal.rbacConfiguration')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-groups">
          {t('host.userEditModal.secondaryGroups')}
        </label>
        <input
          id="user-edit-groups"
          className="form-control"
          type="text"
          value={form.groups}
          onChange={event => set('groups', event.target.value)}
          placeholder={t('host.userEditModal.groupsPlaceholder')}
        />
        <p className="form-text text-muted">
          {t('host.userEditModal.availableGroups', { groups: groups.join(', ') })}
        </p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-authorizations">
          {t('host.userEditModal.authorizations')}
        </label>
        <textarea
          id="user-edit-authorizations"
          className="form-control"
          rows="2"
          value={form.authorizations}
          onChange={event => set('authorizations', event.target.value)}
          placeholder={t('host.userEditModal.authorizationsPlaceholder')}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-profiles">
          {t('host.userEditModal.profiles')}
        </label>
        <input
          id="user-edit-profiles"
          className="form-control"
          type="text"
          value={form.profiles}
          onChange={event => set('profiles', event.target.value)}
          placeholder={t('host.userEditModal.profilesPlaceholder')}
        />
      </div>
      <div className="alert alert-info mb-0" role="note">
        <strong>{t('host.userEditModal.noteLabel')}</strong> {t('host.userEditModal.editNoteText')}
      </div>
    </ToolFormDialog>
  );
};

UserEditModal.propTypes = {
  id: PropTypes.string.isRequired,
  user: PropTypes.shape({
    username: PropTypes.string.isRequired,
    comment: PropTypes.string,
    shell: PropTypes.string,
  }).isRequired,
  groups: PropTypes.arrayOf(PropTypes.string).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default UserEditModal;
