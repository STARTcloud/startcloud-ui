import PropTypes from 'prop-types';
import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../../components/common/Field';
import PasswordField from '../../../../components/common/PasswordField';
import SectionCard, { foldsShape } from '../../../../components/common/SectionCard';
import { errorKeys } from '../../../../components/common/StepUpDialog';

const SAFE_PATH = /^\/(?![/\\])/;
const EMPTY = { confirmation: '', understood: false, password: '', word: '' };

const blurNothing = () => undefined;

const teamsOf = error =>
  (Array.isArray(error?.data?.teams) ? error.data.teams : []).map(team => team.name).join(', ');

/**
 * What stops the Delete account dialog before its call: with a `keyword`
 * the typed word must be that word; without one the typed confirmation
 * must be the address and the understanding box ticked.
 *
 * @param {Object} draft - The dialog's values
 * @param {string} draft.keyword - The word the host asks typed, empty for the email form
 * @param {string} draft.email - The account's address
 * @param {string} draft.confirmation - The typed address
 * @param {boolean} draft.understood - Whether the understanding box is ticked
 * @param {string} draft.word - The typed word
 * @returns {{ key: string, params: Object }|null} The message to draw, null when the call may go
 */
export const deletionCheckOf = ({ keyword, email, confirmation, understood, word }) => {
  if (keyword) {
    return word === keyword ? null : { key: 'pages.confirm.typeToConfirm', params: { keyword } };
  }
  if (confirmation !== email) {
    return { key: 'profile.security.delete.mismatch', params: { email } };
  }
  return understood ? null : { key: 'profile.security.delete.tick', params: {} };
};

/**
 * The argument the adapter's `deletion` takes: the password and the typed
 * word as `{ password, confirm_text }` on a host that asks a `keyword`,
 * the typed address otherwise.
 *
 * @param {{ keyword: string, confirmation: string, password: string, word: string }} draft - The dialog's values
 * @returns {Object|string} The call's argument
 */
export const deletionBodyOf = ({ keyword, confirmation, password, word }) =>
  keyword ? { password, confirm_text: word } : confirmation;

const EmailConfirmation = ({ email, draft, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <Field id="profile-delete-email" label={t('profile.security.delete.confirmEmail', { email })}>
        {aria => (
          <input
            {...aria}
            type="text"
            className="form-control"
            autoComplete="off"
            value={draft.confirmation}
            onChange={event => onChange({ confirmation: event.target.value })}
          />
        )}
      </Field>
      <div className="form-check">
        <input
          id="profile-delete-understand"
          type="checkbox"
          className="form-check-input"
          checked={draft.understood}
          onChange={event => onChange({ understood: event.target.checked })}
        />
        <label className="form-check-label" htmlFor="profile-delete-understand">
          {t('profile.security.delete.understand')}
        </label>
      </div>
    </>
  );
};

EmailConfirmation.propTypes = {
  email: PropTypes.string.isRequired,
  draft: PropTypes.shape({
    confirmation: PropTypes.string.isRequired,
    understood: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

const PasswordConfirmation = ({ keyword, draft, onChange }) => {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      <PasswordField
        id="profile-delete-password"
        name="password"
        label={t('profile.security.password.current')}
        autoComplete="current-password"
        value={draft.password}
        onChange={event => onChange({ password: event.target.value })}
        onBlur={blurNothing}
        revealed={revealed}
        onToggleReveal={() => setRevealed(previous => !previous)}
      />
      <Field id="profile-delete-word" label={t('profile.security.delete.confirmWord', { keyword })}>
        {aria => (
          <input
            {...aria}
            type="text"
            className="form-control"
            autoComplete="off"
            value={draft.word}
            onChange={event => onChange({ word: event.target.value })}
          />
        )}
      </Field>
    </>
  );
};

PasswordConfirmation.propTypes = {
  keyword: PropTypes.string.isRequired,
  draft: PropTypes.shape({
    password: PropTypes.string.isRequired,
    word: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The Delete account section of the Security tab: the line naming what
 * is destroyed, then the dialog over the adapter's `deletion`, stepped
 * up, the answer's `next` handed to `onDeleted`. With a `keyword`, the
 * word a host that takes the password asks typed, the dialog is the
 * current password and the word, refused in the dialog while the word is
 * not the keyword, the call taking `{ password, confirm_text }`; without
 * one it is the email confirmation over an empty field labeled with the
 * address and the understanding checkbox, the sole-owner refusal naming
 * the teams, the call taking the typed address.
 */
const DeleteAccountSection = ({ account, email, keyword = '', guard, onDeleted, folds }) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState('');

  const change = patch => setDraft(previous => ({ ...previous, ...patch }));

  const close = () => {
    setShow(false);
    setDraft(EMPTY);
    setError('');
  };

  const submit = async event => {
    event.preventDefault();
    const check = deletionCheckOf({ keyword, email, ...draft });
    if (check) {
      setError(t(check.key, check.params));
      return;
    }
    setError('');
    try {
      const answer = await guard(
        () => account.deletion(deletionBodyOf({ keyword, ...draft })),
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
    <SectionCard
      title={t('profile.security.delete.title')}
      tone="danger"
      folded={folds.folded('delete')}
      onFold={() => folds.toggle('delete')}
    >
      <p className="small text-body-secondary">{t('profile.security.delete.destroys')}</p>
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => setShow(true)}
        data-action="delete-account"
      >
        {t('profile.security.delete.button')}
      </button>
      <Modal show={show} onHide={close} centered dialogClassName="form-modal" scrollable>
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
            {keyword ? (
              <PasswordConfirmation keyword={keyword} draft={draft} onChange={change} />
            ) : (
              <EmailConfirmation email={email} draft={draft} onChange={change} />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={close}>
              {t('pages.confirm.cancel')}
            </Button>
            <Button variant="danger" type="submit" data-action="delete-account-confirm">
              {t('profile.security.delete.button')}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </SectionCard>
  );
};

DeleteAccountSection.propTypes = {
  account: PropTypes.shape({ deletion: PropTypes.func.isRequired }).isRequired,
  email: PropTypes.string.isRequired,
  keyword: PropTypes.string,
  guard: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default DeleteAccountSection;
