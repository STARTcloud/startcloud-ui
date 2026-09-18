import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';

import { adminUserShape, BulkPrimaryOrgDialog, CustomerIdDialog } from './UsersDialogs';

const ROLE_ACTIONS = ['add_role', 'remove_role'];
const CONFIRM_ACTIONS = [
  'enable',
  'suspend',
  'add_role',
  'remove_role',
  'delete',
  'revoke_sessions',
];

/**
 * The Users page's bulk actions, drawn in the section heading's action pane
 * while rows are selected: Enable, Suspend, Add role, Remove role, Set
 * customer id, Set primary organization, Revoke sessions, Unlock and
 * Delete over the adapter's `bulk`; the confirm-gated actions behind the
 * shared confirm, Delete and Revoke sessions stepped up, Unlock direct,
 * and the result line naming processed, skipped and each error's code
 * translated (decision 146).
 */
const BulkBar = ({ bulk, selected, users, catalog, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [role, setRole] = useState(catalog[0] || '');
  const [pending, setPending] = useState('');
  const [dialog, setDialog] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const fail = error => notify('danger', t(errorKeys(error)));

  const run = (action, extra = {}) => {
    setBusy(true);
    return guard(
      () => bulk({ action, user_ids: selected, ...extra }),
      t('admin.users.bulk.stepUpReason')
    )
      .then(answer => {
        setResult(answer);
        onDone();
        return answer;
      })
      .finally(() => setBusy(false));
  };

  const send = () => {
    const extra = ROLE_ACTIONS.includes(pending) ? { role: role || catalog[0] || '' } : {};
    run(pending, extra)
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          fail(error);
        }
      })
      .finally(() => setPending(''));
  };

  const unlock = () => {
    run('unlock').catch(fail);
  };

  const button = (action, variant, onClick = () => setPending(action)) => (
    <button
      type="button"
      className={`btn btn-sm ${variant}`}
      disabled={busy || selected.length === 0}
      onClick={onClick}
    >
      {t(`admin.users.bulk.${action}`)}
    </button>
  );

  const line = resultLineOf(t, 'admin.users.bulk', result);

  return (
    <>
      {button('enable', 'btn-outline-success')}
      {button('suspend', 'btn-outline-warning')}
      <label className="visually-hidden" htmlFor="bulk-role">
        {t('admin.users.bulk.role')}
      </label>
      <select
        id="bulk-role"
        className="form-select form-select-sm w-auto"
        value={role || catalog[0] || ''}
        onChange={event => setRole(event.target.value)}
      >
        {catalog.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {button('add_role', 'btn-outline-primary')}
      {button('remove_role', 'btn-outline-primary')}
      {button('set_customer_id', 'btn-outline-secondary', () => setDialog('customerId'))}
      {button('set_primary_organization', 'btn-outline-secondary', () => setDialog('primaryOrg'))}
      {button('revoke_sessions', 'btn-outline-warning')}
      {button('unlock', 'btn-outline-secondary', unlock)}
      {button('delete', 'btn-outline-danger')}
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      {dialog === 'customerId' ? (
        <CustomerIdDialog
          title={t('admin.users.bulk.setCustomerId')}
          hint={t('admin.users.customerId.hint')}
          initial=""
          save={value =>
            bulk({ action: 'set_customer_id', user_ids: selected, customer_id: value })
          }
          onClose={() => setDialog('')}
          onSaved={answer => {
            setResult(answer);
            onDone();
          }}
        />
      ) : null}
      {dialog === 'primaryOrg' ? (
        <BulkPrimaryOrgDialog
          users={users}
          save={uuid =>
            bulk({
              action: 'set_primary_organization',
              user_ids: selected,
              primary_organization: uuid,
            })
          }
          onClose={() => setDialog('')}
          onSaved={answer => {
            setResult(answer);
            onDone();
          }}
        />
      ) : null}
      <ConfirmModal
        show={CONFIRM_ACTIONS.includes(pending)}
        handleClose={() => setPending('')}
        handleConfirm={send}
        title={t('admin.users.bulk.confirmTitle')}
        message={t('admin.users.bulk.confirmBody', {
          action: pending ? t(`admin.users.bulk.${pending}`) : '',
          count: selected.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

BulkBar.propTypes = {
  bulk: PropTypes.func.isRequired,
  selected: PropTypes.array.isRequired,
  users: PropTypes.arrayOf(adminUserShape).isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onDone: PropTypes.func.isRequired,
};

export default BulkBar;
