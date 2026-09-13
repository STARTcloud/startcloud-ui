import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { bulk } from '../api/accounts';

const ROLE_ACTIONS = ['add_role', 'remove_role'];

/**
 * The Users page's bulk actions, drawn in the section heading's action pane
 * while rows are selected: Enable, Suspend, Add role, Remove role and
 * Delete, each behind the shared confirm, the delete action stepped up,
 * and the result line naming processed, skipped and errors while it has
 * something to say.
 */
const BulkBar = ({ selected, catalog, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [role, setRole] = useState(catalog[0] || '');
  const [pending, setPending] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = () => {
    const body = { action: pending, user_ids: selected };
    if (ROLE_ACTIONS.includes(pending)) {
      body.role = role || catalog[0] || '';
    }
    setBusy(true);
    guard(() => bulk(body), t('admin.users.bulk.stepUpReason'))
      .then(answer => {
        setResult(answer);
        onDone();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => {
        setBusy(false);
        setPending('');
      });
  };

  const button = (action, variant) => (
    <button
      type="button"
      className={`btn btn-sm ${variant}`}
      disabled={busy || selected.length === 0}
      onClick={() => setPending(action)}
    >
      {t(`admin.users.bulk.${action}`)}
    </button>
  );

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
      {button('delete', 'btn-outline-danger')}
      {result ? (
        <span className="small text-muted" role="status">
          {t('admin.users.bulk.result', {
            processed: result.processed || 0,
            skipped: result.skipped || 0,
            errors: (result.errors || []).length,
          })}
        </span>
      ) : null}
      <ConfirmModal
        show={pending !== ''}
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
  selected: PropTypes.array.isRequired,
  catalog: PropTypes.arrayOf(PropTypes.string).isRequired,
  onDone: PropTypes.func.isRequired,
};

export default BulkBar;
