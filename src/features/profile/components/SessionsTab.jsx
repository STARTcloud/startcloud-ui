import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDesktop } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import MethodList, { MethodRow } from '../../../components/common/MethodList';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrivalQuery } from '../../../hooks/useArrival';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { clockShape, formatInstant } from '../../../utils/clock';
import { formatRelativeTime } from '../../../utils/relativeTime';

const SAFE_PATH = /^\/(?![/\\])/;

/**
 * The device line of a session row: the row's `browser` and `system`
 * joined by a dot, whichever the server named, the raw `user_agent` while
 * it named neither, empty while the row carries nothing.
 *
 * @param {{ browser?: string, system?: string, user_agent?: string }} row - The session row
 * @returns {string} The device line
 */
export const deviceOf = row =>
  [row.browser, row.system].filter(Boolean).join(' · ') || row.user_agent || '';

const matches = (row, needle) =>
  [
    row.client_name || '',
    row.client_id || '',
    deviceOf(row),
    row.location || '',
    row.ip_address || '',
  ].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    key: 'client',
    labelKey: 'admin.activity.sessions.client',
    values: row => (row.client_name ? [row.client_name] : []),
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
  {
    key: 'current',
    labelKey: 'profile.sessions.current',
    values: row => (row.current ? ['current'] : []),
    activeClass: 'bg-info',
    labelFor: (value, t) => t(`profile.sessions.${value}`),
  },
];

const SessionSubline = ({ row, clock }) => {
  const { t, i18n } = useTranslation();
  const language = clock.locale || i18n.language;
  return (
    <>
      <span className="d-block">
        {deviceOf(row)}
        {row.location || row.ip_address ? ' · ' : null}
        {row.location}
        {row.ip_address ? ` (${row.ip_address})` : null}
      </span>
      <span className="d-block" title={formatInstant(row.authorized_at, clock, i18n.language)}>
        {t('profile.sessions.authorized')} {formatRelativeTime(row.authorized_at, language)}
      </span>
      {row.last_accessed_at ? (
        <span className="d-block" title={formatInstant(row.last_accessed_at, clock, i18n.language)}>
          {t('profile.sessions.lastActive')} {formatRelativeTime(row.last_accessed_at, language)}
        </span>
      ) : null}
    </>
  );
};

SessionSubline.propTypes = {
  row: PropTypes.shape({
    current: PropTypes.bool,
    browser: PropTypes.string,
    system: PropTypes.string,
    user_agent: PropTypes.string,
    location: PropTypes.string,
    ip_address: PropTypes.string,
    authorized_at: PropTypes.string,
    last_accessed_at: PropTypes.string,
  }).isRequired,
  clock: clockShape.isRequired,
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
 * their client, device (the row's `browser` and `system`, the raw
 * `user_agent` while the server named neither), location and address,
 * the authorized time with its absolute time in the tooltip, each time
 * written on the account's `clock`, its `timezone`, `locale` and
 * `hour_cycle`, the browser's own while the account holds none, the
 * caller's own row badged "This
 * session", Sign out per row and Revoke all sessions behind a plain
 * confirm that says this browser is signed out too; the other rows' Sign out and
 * the revoke-all are stepped up, the current row's Sign out is the plain
 * sign-out, and an answer's `next` is followed when the call ended this
 * session; the list is a glass section of the pages contract, a
 * `SectionHeading` carrying the total and Revoke all over the rows on the
 * page's ground; the navbar search bound with a query over the client,
 * the device, the location and the address, first the one the page
 * arrived with, and the Client and This session `toggle` groups
 * narrowing the rows client-side, Clear filters keeping the query.
 */
const SessionsTab = ({ account, guard, onSignedOut, clock }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [pending, setPending] = useState(null);
  const arrivedQuery = useArrivalQuery();
  const [query, setQuery] = useState(arrivedQuery);
  const needle = query.trim().toLowerCase();
  const searched = needle ? rows.filter(row => matches(row, needle)) : rows;
  const filters = useClientFilters({ specs: FILTER_GROUPS, rows: searched });

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('profile.search.sessions'),
    matched: filters.rows.length,
    total: rows.length,
    groups: filters.groups,
    onClearFilters: filters.clear,
  });

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
    ? t('profile.sessions.revokeAllBody')
    : t('pages.confirm.plainMessage');

  const revokeAllButton = (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      onClick={() => setPending({ kind: 'all' })}
      disabled={rows.length === 0}
    >
      {t('profile.sessions.revokeAll')}
    </button>
  );

  return (
    <div className="tab-pane fade show active">
      <SectionHeading
        title={t('profile.sessions.title')}
        count={rows.length}
        actions={revokeAllButton}
      />
      <MethodList
        empty={needle || filters.active ? t('pages.noMatches') : t('profile.sessions.none')}
      >
        {filters.rows.map(row => (
          <MethodRow
            key={row.id}
            icon={<FaDesktop aria-hidden />}
            label={row.client_name || row.client_id || t('profile.sessions.unknownClient')}
            badges={<CurrentBadge row={row} />}
            subline={<SessionSubline row={row} clock={clock} />}
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
        typed={false}
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
  clock: clockShape.isRequired,
};

export default SessionsTab;
