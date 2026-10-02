import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ROLE_FORM, ROLE_SHELLS, roleCreateBody } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

/**
 * Create a role, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the name, the comment, the shell, the authorizations
 * and the profiles as comma-separated lists, the home switch and the
 * note, and Create role, held by the name required, which sends
 * `POST system/roles` with the body of `roleCreateBody`.
 */
const RoleCreateModal = ({ busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(ROLE_FORM);
  const [problem, setProblem] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = () => {
    if (!form.rolename.trim()) {
      setProblem('host.roleCreateModal.errors.nameRequired');
      return;
    }
    setProblem('');
    onConfirm(roleCreateBody(form));
  };

  return (
    <ToolFormDialog
      dialog="role-create"
      title={t('host.roleCreateModal.title')}
      submitKey="host.roleCreateModal.title"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="rolename">
          {t('host.roleCreateModal.roleNameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="rolename"
          className="form-control"
          type="text"
          value={form.rolename}
          onChange={event => set('rolename', event.target.value)}
          placeholder={t('host.roleCreateModal.roleNamePlaceholder')}
          required
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.roleNameHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="role-comment">
          {t('host.roleCreateModal.commentLabel')}
        </label>
        <input
          id="role-comment"
          className="form-control"
          type="text"
          value={form.comment}
          onChange={event => set('comment', event.target.value)}
          placeholder={t('host.roleCreateModal.commentPlaceholder')}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="role-shell">
          {t('host.roleCreateModal.shellLabel')}
        </label>
        <select
          id="role-shell"
          className="form-select"
          value={form.shell}
          onChange={event => set('shell', event.target.value)}
        >
          {ROLE_SHELLS.map(shell => (
            <option key={shell} value={shell}>
              {shell}
            </option>
          ))}
        </select>
        <p className="form-text text-muted">{t('host.roleCreateModal.shellHelp')}</p>
      </div>
      <hr />
      <h6 className="fw-bold">{t('host.roleCreateModal.rbacConfiguration')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="role-authorizations">
          {t('host.roleCreateModal.authorizationsLabel')}
        </label>
        <textarea
          id="role-authorizations"
          className="form-control"
          rows="3"
          value={form.authorizations}
          onChange={event => set('authorizations', event.target.value)}
          placeholder={t('host.roleCreateModal.authorizationsPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.authorizationsHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="role-profiles">
          {t('host.roleCreateModal.profilesLabel')}
        </label>
        <input
          id="role-profiles"
          className="form-control"
          type="text"
          value={form.profiles}
          onChange={event => set('profiles', event.target.value)}
          placeholder={t('host.roleCreateModal.profilesPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.profilesHelp')}</p>
      </div>
      <hr />
      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="role-create-home"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={form.createHome}
            onChange={event => set('createHome', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="role-create-home">
            {t('host.roleCreateModal.createHomeLabel')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.roleCreateModal.createHomeHelp')}</p>
      </div>
      <div className="alert alert-info mb-0" role="note">
        <strong>{t('host.roleCreateModal.noteLabel')}</strong> {t('host.roleCreateModal.noteText')}
      </div>
    </ToolFormDialog>
  );
};

RoleCreateModal.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default RoleCreateModal;
