import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { ban, rateLimit, unban, unlockMethod, unlockSignIn } from '../api/accounts';
import { RATE_LIMIT } from '../utils/examples';

import AdminLoading from './AdminLoading';
import { adminUserShape } from './UsersDialogs';

const METHODS = ['SMS', 'APP', 'BACKUP_CODE'];
const TONES = { locked: 'bg-danger', armed: 'bg-warning text-dark', clear: 'bg-success' };

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

const useRateLimit = user => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [state, setState] = useState(null);

  const load = useCallback(() => {
    rateLimit(user.id)
      .then(setState)
      .catch(error => {
        notify('danger', t(error.messageKey || 'errors.request'));
        setState(error.status === 404 ? RATE_LIMIT : null);
      });
  }, [notify, t, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, load };
};

const Gates = ({ state }) => {
  const { t } = useTranslation();
  const signIn = state.sign_in || {};
  const tfa = state.tfa || {};
  return (
    <div>
      <Row label={t('admin.users.rateLimits.signIn')}>
        {signIn.armed ? (
          <span className={`badge ${TONES.armed}`}>
            {t('admin.users.rateLimits.armed', { seconds: signIn.wait_seconds || 0 })}
          </span>
        ) : (
          <span className={`badge ${TONES.clear}`}>{t('admin.users.rateLimits.clear')}</span>
        )}
      </Row>
      {METHODS.map(name => (
        <Row key={name} label={t('admin.users.rateLimits.method', { method: name })}>
          <span className={`badge ${TONES[tfa[name]] || 'bg-secondary'}`}>
            {t(`admin.users.rateLimits.${tfa[name] || 'clear'}`)}
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
};

/**
 * The Rate limits dialog of a Users row: the sign-in gate, each
 * second-factor method's state and the ban flag from the rate-limit
 * read, with Unlock sign-in, Unlock a method, Ban and Unban over the four
 * rate-limit routes, the dialog re-reading after each; mounted per user.
 */
const RateLimitsDialog = ({ user, onClose }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { state, load } = useRateLimit(user);
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
    <Modal show onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('admin.users.rateLimits.title', { user: user.username })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {state ? <Gates state={state} /> : <AdminLoading />}
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
            onClick={() => act(() => unlockMethod(user.id, method))}
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
          onClick={() => act(() => unlockSignIn(user.id))}
        >
          {t('admin.users.rateLimits.unlockSignIn')}
        </button>
        {state?.banned ? (
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={busy}
            onClick={() => act(() => unban(user.id))}
          >
            {t('admin.users.rateLimits.unban')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={busy || !state}
            onClick={() => act(() => ban(user.id))}
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
  user: adminUserShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RateLimitsDialog;
