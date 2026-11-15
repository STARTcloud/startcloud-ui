import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useCountdown } from '../../../components/common/Countdown';
import { useNotify } from '../../../contexts/NoticeContext';
import { RATE_LIMIT } from '../utils/examples';

import AdminLoading from './AdminLoading';
import { adminUserShape } from './UsersDialogs';

const METHODS = ['SMS', 'APP', 'BACKUP_CODE'];
const TONES = { locked: 'bg-danger', armed: 'bg-warning text-dark', clear: 'bg-success' };
const METHOD_WORDS = { locked: 'locked', armed: 'armedMethod', clear: 'clear' };

const Row = ({ label, children }) => (
  <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
    <span>{label}</span>
    <span>{children}</span>
  </div>
);

Row.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const useRateLimit = (rateLimit, user) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [state, setState] = useState(null);
  const [since, setSince] = useState(0);

  const load = useCallback(() => {
    rateLimit
      .read(user.id)
      .then(answer => {
        setState(answer);
        setSince(Date.now());
      })
      .catch(error => {
        notify('danger', t(error.messageKey || 'errors.request'));
        setState(error.status === 404 ? RATE_LIMIT : null);
        setSince(Date.now());
      });
  }, [notify, rateLimit, t, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, since, load };
};

const SignInGate = ({ signIn, since }) => {
  const { t } = useTranslation();
  const remaining = useCountdown(signIn.armed ? signIn.wait_seconds || 0 : 0, since);
  if (!signIn.armed || remaining === 0) {
    return <span className={`badge ${TONES.clear}`}>{t('admin.users.rateLimits.clear')}</span>;
  }
  return (
    <span className={`badge ${TONES.armed}`} role="timer" aria-live="off">
      {t('admin.users.rateLimits.armed', { seconds: remaining })}
    </span>
  );
};

SignInGate.propTypes = {
  signIn: PropTypes.shape({ armed: PropTypes.bool, wait_seconds: PropTypes.number }).isRequired,
  since: PropTypes.number.isRequired,
};

const Gates = ({ state, since }) => {
  const { t } = useTranslation();
  const signIn = state.sign_in || {};
  const tfa = state.tfa || {};
  return (
    <div>
      <Row label={t('admin.users.rateLimits.signIn')}>
        <SignInGate signIn={signIn} since={since} />
      </Row>
      {METHODS.map(name => (
        <Row key={name} label={t('admin.users.rateLimits.method', { method: name })}>
          <span className={`badge ${TONES[tfa[name]] || 'bg-secondary'}`}>
            {t(`admin.users.rateLimits.${METHOD_WORDS[tfa[name]] || 'clear'}`)}
          </span>
        </Row>
      ))}
      <Row label={t('admin.users.rateLimits.banned')}>
        <span className={`badge ${state.banned ? 'bg-danger' : 'bg-secondary'}`}>
          {state.banned ? t('yes') : t('no')}
        </span>
      </Row>
    </div>
  );
};

Gates.propTypes = {
  state: PropTypes.shape({
    sign_in: PropTypes.shape({ armed: PropTypes.bool, wait_seconds: PropTypes.number }),
    tfa: PropTypes.object,
    banned: PropTypes.bool,
  }).isRequired,
  since: PropTypes.number.isRequired,
};

/**
 * The Rate limits dialog of a Users row: the sign-in gate, armed drawn as
 * a countdown from its `wait_seconds` and the moment the answer arrived
 * and clear at zero, each second-factor method's state as the answer
 * names it, `locked` while the lockout disabled the method, `armed` while
 * a code of it is inside the wait and `clear` otherwise, and the ban flag
 * from the adapter's `rateLimit.read`, with Unlock sign-in, Unlock a
 * method, Ban and Unban over its four calls, the dialog re-reading after
 * each; mounted per user.
 */
const RateLimitsDialog = ({ rateLimit, user, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { state, since, load } = useRateLimit(rateLimit, user);
  const [method, setMethod] = useState(METHODS[0]);
  const [busy, setBusy] = useState(false);

  const act = call => {
    setBusy(true);
    call()
      .then(() => {
        notify('success', t('admin.users.rateLimits.done'));
        load();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')))
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('admin.users.rateLimits.title', { user: user.username })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {state ? <Gates state={state} since={since} /> : <AdminLoading />}
        <div className="d-flex align-items-center gap-2 mt-3">
          <label className="form-label mb-0" htmlFor="rate-limit-method">
            {t('admin.users.rateLimits.unlockMethod')}
          </label>
          <select
            id="rate-limit-method"
            className="form-select form-select-sm w-auto"
            value={method}
            onChange={event => setMethod(event.target.value)}
          >
            {METHODS.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={busy || !state}
            onClick={() => act(() => rateLimit.unlockMethod(user.id, method))}
          >
            {t('admin.users.rateLimits.unlock')}
          </button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={busy || !state}
          onClick={() => act(() => rateLimit.unlockSignIn(user.id))}
        >
          {t('admin.users.rateLimits.unlockSignIn')}
        </button>
        {state?.banned ? (
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={busy}
            onClick={() => act(() => rateLimit.unban(user.id))}
          >
            {t('admin.users.rateLimits.unban')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={busy || !state}
            onClick={() => act(() => rateLimit.ban(user.id))}
          >
            {t('admin.users.rateLimits.ban')}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('admin.buttons.cancel')}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

RateLimitsDialog.propTypes = {
  rateLimit: PropTypes.shape({
    read: PropTypes.func.isRequired,
    unlockSignIn: PropTypes.func.isRequired,
    unlockMethod: PropTypes.func.isRequired,
    ban: PropTypes.func.isRequired,
    unban: PropTypes.func.isRequired,
  }).isRequired,
  user: adminUserShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RateLimitsDialog;
