import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDesktop } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import MethodList, { MethodRow } from '../../../components/common/MethodList';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { formatRelativeTime } from '../../../utils/relativeTime';

const SAFE_PATH = /^\/(?![/\\])/;

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const deviceOf = userAgent => {
  const agent = String(userAgent || '');
  const browser = ['Edg', 'Chrome', 'Firefox', 'Safari'].find(name => agent.includes(name)) || '';
  const os = ['Windows', 'Android', 'iPhone', 'iPad', 'Mac OS', 'Linux'].find(name =>
    agent.includes(name)
  );
  return [browser, os].filter(Boolean).join(' · ') || agent;
};

const SessionSubline = ({ row }) => {
  const { t, i18n } = useTranslation();
  return (
    <>
      <span className="d-block">
        {deviceOf(row.user_agent)}
        {row.location || row.ip_address ? ' · ' : null}
        {row.location}
        {row.ip_address ? ` (${row.ip_address})` : null}
      </span>
      <span className="d-block" title={absoluteTime(row.authorized_at, i18n.language)}>
        {t('profile.sessions.authorized')} {formatRelativeTime(row.authorized_at, i18n.language)}
      </span>
      {row.last_accessed_at ? (
        <span className="d-block" title={absoluteTime(row.last_accessed_at, i18n.language)}>
          {t('profile.sessions.lastActive')}{' '}
          {formatRelativeTime(row.last_accessed_at, i18n.language)}
        </span>
      ) : null}
    </>
  );
};

SessionSubline.propTypes = {
  row: PropTypes.shape({
    current: PropTypes.bool,
    user_agent: PropTypes.string,
    location: PropTypes.string,
    ip_address: PropTypes.string,
    authorized_at: PropTypes.string,
    last_accessed_at: PropTypes.string,
  }).isRequired,
};

const CurrentBadge = ({ row }) => {
  const { t } = useTranslation();
  if (!row.current) {
    return null;
  }
  return <span className="badge bg-primary">{t('profile.sessions.current')}</span>;
};

CurrentBadge.propTypes = {
  row: PropTypes.shape({ current: PropTypes.bool }).isRequired,
};

const SignOutButton = ({ row, onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onClick(row)}>
      {t('profile.sessions.signOut')}
    </button>
  );
};

SignOutButton.propTypes = {
  row: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The Sessions tab of the identity contract: the active sessions with
 * their client, device, location and address, the authorized time with
 * its absolute time in the tooltip, the caller's own row badged "This
 * session", Sign out per row and Revoke all sessions behind a confirm
 * that says this browser is signed out too; the other rows' Sign out and
 * the revoke-all are stepped up, the current row's Sign out is the plain
 * sign-out, and an answer's `next` is followed when the call ended this
 * session.
 */
const SessionsTab = ({ account, guard, onSignedOut }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState(null);

  const load = useCallback(
    () =>
      account.sessions
        .list()
        .then(list => setRows(Array.isArray(list) ? list : []))
        .catch(error => {
          log.api.error('Error loading sessions', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [account, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (call, reason, after) => {
    try {
      const answer = await guard(call, reason);
      await after(answer);
    } catch (error) {
      if (error?.code !== 'step_up_required') {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const follow = answer => {
    if (typeof answer?.next === 'string' && SAFE_PATH.test(answer.next)) {
      onSignedOut(answer.next);
      return true;
    }
    return false;
  };

  const revoke = row =>
    run(
      () => account.sessions.revoke(row.id),
      t('profile.sessions.signOutReason'),
      async () => {
        notify('success', t('profile.sessions.signedOut'));
        await load();
      }
    );

  const signOutCurrent = row =>
    account.sessions
      .revoke(row.id)
      .then(follow)
      .catch(error => notify('danger', t(errorKeys(error))));

  const revokeAll = () =>
    run(
      () => account.sessions.revokeAll(),
      t('profile.sessions.revokeAllReason'),
      async answer => {
        if (follow(answer)) {
          return;
        }
        notify('success', t('profile.sessions.revokedAll'));
        await load();
      }
    );

  const onSignOut = row => (row.current ? signOutCurrent(row) : setPending({ kind: 'one', row }));

  const confirmPending = () => {
    if (pending?.kind === 'all') {
      revokeAll();
    } else if (pending) {
      revoke(pending.row);
    }
  };

  const all = pending?.kind === 'all';
  const confirmTitle = all ? t('profile.sessions.revokeAll') : t('profile.sessions.signOut');
  const confirmMessage = all
    ? t('profile.sessions.revokeAllBody', { keyword: t('pages.confirm.keyword') })
    : t('pages.confirm.message', { keyword: t('pages.confirm.keyword') });

  return (
    <div className="tab-pane fade show active">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h5 className="mb-0">{t('profile.sessions.title')}</h5>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => setPending({ kind: 'all' })}
          disabled={rows.length === 0}
        >
          {t('profile.sessions.revokeAll')}
        </button>
      </div>
      <MethodList empty={t('profile.sessions.none')}>
        {rows.map(row => (
          <MethodRow
            key={row.id}
            icon={<FaDesktop aria-hidden />}
            label={row.client_name || row.client_id || t('profile.sessions.unknownClient')}
            badges={<CurrentBadge row={row} />}
            subline={<SessionSubline row={row} />}
            actions={<SignOutButton row={row} onClick={onSignOut} />}
          />
        ))}
      </MethodList>
      <ConfirmModal
        show={pending !== null}
        handleClose={() => setPending(null)}
        handleConfirm={confirmPending}
        title={confirmTitle}
        message={confirmMessage}
      />
    </div>
  );
};

SessionsTab.propTypes = {
  account: PropTypes.shape({
    sessions: PropTypes.shape({
      list: PropTypes.func.isRequired,
      revoke: PropTypes.func.isRequired,
      revokeAll: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onSignedOut: PropTypes.func.isRequired,
};

export default SessionsTab;
