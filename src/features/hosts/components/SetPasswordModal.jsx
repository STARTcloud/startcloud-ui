import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { passwordBody, passwordProblem } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

const FORM = { password: '', confirmPassword: '', forceChange: false, unlockAccount: true };

/**
 * Set one user's password, hyperweaver-ui's dialog over the form dialog
 * of the pages contract: the password and its confirmation, the force
 * change and the unlock switches, and Set password, held by the
 * sentence of `passwordProblem` until the two match and reach eight
 * characters, which sends `POST system/users/{name}/password`.
 */
const SetPasswordModal = ({ user, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(FORM);
  const [problem, setProblem] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = () => {
    const key = passwordProblem(form);
    setProblem(key);
    if (!key) {
      onConfirm(passwordBody(form));
    }
  };

  return (
    <ToolFormDialog
      dialog="user-password"
      title={t('host.setPasswordModal.title', { username: user.username })}
      submitKey="host.setPasswordModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="new-password-input">
          {t('host.setPasswordModal.newPassword')} <span className="text-danger">*</span>
        </label>
        <input
          id="new-password-input"
          className="form-control"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={event => set('password', event.target.value)}
          placeholder={t('host.setPasswordModal.newPasswordPlaceholder')}
          required
        />
        <p className="form-text text-muted">{t('host.setPasswordModal.passwordHelp')}</p>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="confirm-password-input">
          {t('host.setPasswordModal.confirmPassword')} <span className="text-danger">*</span>
        </label>
        <input
          id="confirm-password-input"
          className="form-control"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={event => set('confirmPassword', event.target.value)}
          placeholder={t('host.setPasswordModal.confirmPasswordPlaceholder')}
          required
        />
      </div>
      <hr />
      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="set-password-force-change"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={form.forceChange}
            onChange={event => set('forceChange', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="set-password-force-change">
            {t('host.setPasswordModal.forceChange')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.setPasswordModal.forceChangeHelp')}</p>
      </div>
      <div className="mb-0">
        <div className="form-check form-switch">
          <input
            id="set-password-unlock-account"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={form.unlockAccount}
            onChange={event => set('unlockAccount', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="set-password-unlock-account">
            {t('host.setPasswordModal.unlockAccount')}
          </label>
        </div>
        <p className="form-text text-muted mb-0">{t('host.setPasswordModal.unlockAccountHelp')}</p>
      </div>
    </ToolFormDialog>
  );
};

SetPasswordModal.propTypes = {
  user: PropTypes.shape({ username: PropTypes.string.isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default SetPasswordModal;
