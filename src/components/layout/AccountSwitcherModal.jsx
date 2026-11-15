import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaRightFromBracket, FaUsers } from 'react-icons/fa6';

import { userDisplayName, userSecondaryLine } from '../../utils/identity';
import Avatar from '../common/Avatar';
import BrandLogo from '../common/BrandLogo';

import { SwitcherModal } from './OrgSwitcherModal';

export const accountShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  email: PropTypes.string.isRequired,
  picture: PropTypes.string,
  active: PropTypes.bool.isRequired,
  signed_in: PropTypes.bool.isRequired,
});

export const accountsAdapterShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  choose: PropTypes.func.isRequired,
  add: PropTypes.func.isRequired,
  signOutAll: PropTypes.func.isRequired,
});

const ROW_CLASS = 'list-group-item d-flex align-items-center gap-2';

const CHOOSE_CLASS =
  'btn btn-link text-reset text-decoration-none d-flex align-items-center gap-3 flex-grow-1 text-start p-0';

/**
 * One account of the browser: the picture with the identity card's
 * fallback, the name over the email line, the Active badge, the check and
 * the primary border on the account the session cookie names, the
 * Remembered badge on one that holds no session, the whole identity a
 * button that hands the entry to `onPick`, and, while `onSignOut` is
 * given, a sign-out glyph that hands it to `onSignOut`.
 */
const AccountRow = ({ account, busy, onPick, onSignOut }) => {
  const { t } = useTranslation();
  const name = userDisplayName(account);
  const email = userSecondaryLine(account);
  return (
    <li
      className={`${ROW_CLASS} ${account.active ? 'border-primary border-2' : ''}`}
      data-account={account.id}
    >
      <button
        type="button"
        className={CHOOSE_CLASS}
        data-action="choose"
        disabled={busy}
        onClick={() => onPick(account)}
      >
        <Avatar
          picture={account.picture || ''}
          size={36}
          fallback={<BrandLogo className="logo-xl flex-shrink-0" />}
        />
        <span className="flex-grow-1">
          <span className="d-block fw-semibold">{name}</span>
          {email ? <small className="d-block text-body-secondary">{email}</small> : null}
        </span>
      </button>
      {account.active ? (
        <span className="badge bg-primary" data-badge="active">
          {t('accountSwitcher.active')}
        </span>
      ) : null}
      {account.signed_in ? null : (
        <span className="badge bg-secondary" data-badge="remembered">
          {t('accountSwitcher.remembered')}
        </span>
      )}
      {account.active ? <FaCheck className="text-success" /> : null}
      {onSignOut ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          data-action="sign-out"
          disabled={busy}
          title={t('accountSwitcher.signOut', { name })}
          aria-label={t('accountSwitcher.signOut', { name })}
          onClick={() => onSignOut(account)}
        >
          <FaRightFromBracket />
        </button>
      ) : null}
    </li>
  );
};

AccountRow.propTypes = {
  account: accountShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
  onSignOut: PropTypes.func,
};

/**
 * The list of the browser's accounts, one `AccountRow` per entry in the
 * order the server answered, the signed-in people first; the chooser
 * page, the account switcher modal and the device page's chooser step
 * draw it.
 */
export const AccountRows = ({
  accounts,
  busy = false,
  onPick,
  onSignOut = null,
  className = '',
}) => (
  <ul className={className ? `list-group ${className}` : 'list-group'}>
    {accounts.map(account => (
      <AccountRow
        key={account.id}
        account={account}
        busy={busy}
        onPick={onPick}
        onSignOut={onSignOut}
      />
    ))}
  </ul>
);

AccountRows.propTypes = {
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onSignOut: PropTypes.func,
  className: PropTypes.string,
};

/**
 * The account switcher modal of the navbar contract: the same accounts
 * the chooser page lists, each row switching through `onPick`, then
 * "Add another account" and "Sign out all"; the danger alert while the
 * list could not be read or the last action failed, the info alert while
 * the browser holds no account.
 */
export const AccountSwitcherModal = ({
  show,
  onHide,
  accounts,
  loading = false,
  loadFailed = false,
  failed = false,
  busy = false,
  onPick,
  onAdd,
  onSignOutAll,
}) => {
  const { t } = useTranslation();
  return (
    <SwitcherModal
      show={show}
      onHide={onHide}
      icon={<FaUsers className="me-2" />}
      title={t('accountSwitcher.title')}
      loading={loading}
      loadFailed={loadFailed}
      loadError={t('accountSwitcher.loadError')}
      emptyText={t('accountSwitcher.none')}
    >
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('accountSwitcher.failed')}
        </div>
      ) : null}
      {accounts.length === 0 ? (
        <div className="alert alert-info">{t('accountSwitcher.none')}</div>
      ) : (
        <AccountRows accounts={accounts} busy={busy} onPick={onPick} />
      )}
      <div className="d-grid gap-2 mt-3">
        <button
          type="button"
          className="btn btn-outline-primary"
          data-action="add-account"
          disabled={busy}
          onClick={onAdd}
        >
          {t('accountSwitcher.add')}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger"
          data-action="sign-out-all"
          disabled={busy}
          onClick={onSignOutAll}
        >
          {t('accountSwitcher.signOutAll')}
        </button>
      </div>
    </SwitcherModal>
  );
};

AccountSwitcherModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  loading: PropTypes.bool,
  loadFailed: PropTypes.bool,
  failed: PropTypes.bool,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onSignOutAll: PropTypes.func.isRequired,
};
