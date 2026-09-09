import PropTypes from 'prop-types';
import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../../components/common/Field';
import { errorKeys } from '../../../../components/common/StepUpDialog';

const SAFE_PATH = /^\/(?![/\\])/;

const teamsOf = error =>
  (Array.isArray(error?.data?.teams) ? error.data.teams : []).map(team => team.name).join(', ');

/**
 * The Delete account section of the Security tab: the line naming what
 * is destroyed, then the dialog with the email confirmation over an empty
 * field labeled with the address, the understanding checkbox and the
 * sole-owner refusal naming the teams, over `POST /api/user/deletion`,
 * stepped up; the answer's `next` is handed to `onDeleted`.
 */
const DeleteAccountSection = ({ account, email, guard, onDeleted }) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setShow(false);
    setConfirmation('');
    setUnderstood(false);
    setError('');
  };

  const submit = async event => {
    event.preventDefault();
    if (confirmation !== email) {
      setError(t('profile.security.delete.mismatch', { email }));
      return;
    }
    if (!understood) {
      setError(t('profile.security.delete.tick'));
      return;
    }
    setError('');
    try {
      const answer = await guard(
        () => account.deletion(confirmation),
        t('profile.security.delete.reason')
      );
      const next =
        typeof answer?.next === 'string' && SAFE_PATH.test(answer.next) ? answer.next : '/login';
      onDeleted(next);
    } catch (failure) {
      if (failure?.code === 'step_up_required') {
        return;
      }
      if (failure?.code === 'sole_owner') {
        setError(t('errors.sole_owner', { teams: teamsOf(failure) }));
        return;
      }
      setError(t(errorKeys(failure)));
    }
  };

  return (
    <div className="mb-4">
      <h5 className="text-danger">{t('profile.security.delete.title')}</h5>
      <p className="small text-body-secondary">{t('profile.security.delete.destroys')}</p>
      <button type="button" className="btn btn-danger" onClick={() => setShow(true)}>
        {t('profile.security.delete.button')}
      </button>
      <Modal show={show} onHide={close} centered>
        <form onSubmit={submit} noValidate>
          <Modal.Header closeButton className="bg-danger-subtle">
            <Modal.Title as="h5">{t('profile.security.delete.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="fw-semibold text-danger">{t('profile.security.delete.irreversible')}</p>
            <p className="small text-body-secondary">{t('profile.security.delete.destroys')}</p>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <Field
              id="profile-delete-email"
              label={t('profile.security.delete.confirmEmail', { email })}
            >
              {aria => (
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  autoComplete="off"
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                />
              )}
            </Field>
            <div className="form-check">
              <input
                id="profile-delete-understand"
                type="checkbox"
                className="form-check-input"
                checked={understood}
                onChange={event => setUnderstood(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="profile-delete-understand">
                {t('profile.security.delete.understand')}
              </label>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={close}>
              {t('pages.confirm.cancel')}
            </Button>
            <Button variant="danger" type="submit">
              {t('profile.security.delete.button')}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

DeleteAccountSection.propTypes = {
  account: PropTypes.shape({ deletion: PropTypes.func.isRequired }).isRequired,
  email: PropTypes.string.isRequired,
  guard: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

export default DeleteAccountSection;
