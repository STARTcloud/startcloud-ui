import PropTypes from 'prop-types';
import { useCallback, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const STEP_UP_REQUIRED = 'step_up_required';

const isStepUpRequired = error => error?.status === 403 && error?.code === STEP_UP_REQUIRED;

/**
 * The translation keys of a refused call, for `t([...])`: `errors.<code>`
 * when the answer carried a `code`, then the API client's key for the
 * status, so a code the page does not know paints the status line.
 * @param {Object} error - The `ApiError`
 * @returns {string[]} The keys, most specific first
 */
export const errorKeys = error => [
  `errors.${error?.code || ''}`,
  error?.messageKey || 'errors.request',
];

/**
 * The "Confirm it's you" dialog of the identity contract: a current
 * password while the account has one, else an authenticator or backup
 * code, each with a link to the other; `onConfirm` arms the step-up
 * window with the entered secret and resolves, a refusal painting the
 * answer's `code` inline and keeping the dialog open.
 */
const StepUpDialog = ({ show, hasPassword, reason = '', onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState(hasPassword ? 'password' : 'code');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const usePassword = mode === 'password';

  const reset = () => {
    setSecret('');
    setError('');
    setBusy(false);
    setMode(hasPassword ? 'password' : 'code');
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const submit = async event => {
    event.preventDefault();
    if (!secret) {
      setError(t('validation.required', { label: t(`profile.stepUp.${mode}`) }));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(usePassword ? { password: secret } : { code: secret });
      reset();
    } catch (failure) {
      setBusy(false);
      setError(t(errorKeys(failure)));
    }
  };

  const flip = () => {
    setMode(usePassword ? 'code' : 'password');
    setSecret('');
    setError('');
  };

  return (
    <Modal show={show} onHide={cancel} centered>
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('profile.stepUp.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{reason || t('profile.stepUp.body')}</p>
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          <Form.Group controlId="step-up-secret">
            <Form.Label>{t(`profile.stepUp.${mode}`)}</Form.Label>
            <Form.Control
              type={usePassword ? 'password' : 'text'}
              autoComplete={usePassword ? 'current-password' : 'one-time-code'}
              inputMode={usePassword ? undefined : 'numeric'}
              value={secret}
              onChange={event => setSecret(event.target.value)}
            />
          </Form.Group>
          {hasPassword ? (
            <button type="button" className="btn btn-link btn-sm px-0 mt-2" onClick={flip}>
              {usePassword ? t('profile.stepUp.useCode') : t('profile.stepUp.usePassword')}
            </button>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancel} disabled={busy}>
            {t('pages.confirm.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {t('profile.stepUp.confirm')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

StepUpDialog.propTypes = {
  show: PropTypes.bool.isRequired,
  hasPassword: PropTypes.bool.isRequired,
  reason: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

/**
 * The step-up window around every sensitive call of a page: `guard(call,
 * reason)` runs the call and, on a `403 step_up_required`, opens the
 * dialog, arms the window through `stepUp({ password } | { code })` and
 * retries the same call unchanged, resolving with its answer or rejecting
 * with the call's own failure; a cancelled dialog rejects with the
 * original refusal. `dialog` is the element the page mounts once.
 *
 * @param {Object} options - The page's side
 * @param {Function} options.stepUp - `POST /api/user/step-up` with the entered secret
 * @param {boolean} options.hasPassword - Whether the account has a local password
 * @returns {{ guard: Function, dialog: import('react').ReactElement }}
 */
export const useStepUp = ({ stepUp, hasPassword }) => {
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);

  const close = () => {
    pendingRef.current = null;
    setPending(null);
  };

  const guard = useCallback(
    (call, reason = '') =>
      call().catch(error => {
        if (!isStepUpRequired(error)) {
          throw error;
        }
        return new Promise((resolve, reject) => {
          pendingRef.current = { call, resolve, reject, error };
          setPending({ reason });
        });
      }),
    []
  );

  const confirm = async secret => {
    const { current } = pendingRef;
    await stepUp(secret);
    close();
    if (current) {
      current.call().then(current.resolve, current.reject);
    }
  };

  const cancel = () => {
    const { current } = pendingRef;
    close();
    if (current) {
      current.reject(current.error);
    }
  };

  const dialog = (
    <StepUpDialog
      show={pending !== null}
      hasPassword={hasPassword}
      reason={pending?.reason || ''}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );

  return { guard, dialog };
};

export default StepUpDialog;
