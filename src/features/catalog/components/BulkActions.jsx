import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { CascadeCheck } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { collectionShape } from '../../../utils/itemShape';
import { refusalMessage } from '../../../utils/validation';

const EMPTY_RESULT = { processed: 0, skipped: 0, errors: [] };

const merged = answers =>
  answers.reduce(
    (total, answer) => ({
      processed: total.processed + (answer?.processed || 0),
      skipped: total.skipped + (answer?.skipped || 0),
      errors: [...total.errors, ...(answer?.errors || [])],
    }),
    EMPTY_RESULT
  );

export const bulkGroupShape = PropTypes.shape({
  scope: PropTypes.object.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
});

/**
 * The picked-state group of a section's action pane: Clear selection, then
 * the collection's bulk actions for this level as `definition.bulk` names
 * them, each destructive one gated by the shared confirm and each one
 * naming a `dialog` drawn through the collection's `BulkDialog` slot
 * first, the dialog answering the body members the call carries beside
 * the names (`values` on a set, the target address on a move); sent as
 * one `bulk(level, action, names, scope, extra)` call per scope the picked
 * rows span, the one result line naming processed, skipped and each
 * error's code after it. While the level offers an opening verb the
 * cascade check draws once for the pane and a ticked one sends
 * `recursive: true` with those verbs alone, the closing ones running to
 * every row beneath on their own. Draws nothing while no row is picked or
 * the collection names no bulk action for the level.
 */
const BulkActions = ({ collection, level, groups, onClear, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [pending, setPending] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [beneath, setBeneath] = useState(false);
  const { BulkDialog } = collection.slots;
  const actions = (collection.bulk || {})[level] || [];
  const count = groups.reduce((sum, group) => sum + group.names.length, 0);

  if (count === 0 || actions.length === 0 || !collection.adapter.bulk) {
    return null;
  }

  const run = (action, extra = {}) => {
    const body = { ...(action.opens && beneath ? { recursive: true } : {}), ...extra };
    setBusy(true);
    Promise.all(
      groups.map(group =>
        collection.adapter.bulk(level, action.key, group.names, group.scope, body)
      )
    )
      .then(answers => {
        setResult(merged(answers));
        onDone();
      })
      .catch(error => notify('danger', refusalMessage({ error, t })))
      .finally(() => setBusy(false));
  };

  const pick = action => {
    if (action.dialog && BulkDialog) {
      setDialog(action);
      return;
    }
    if (action.confirm) {
      setPending(action);
      return;
    }
    run(action);
  };

  const line = resultLineOf(t, 'pages.bulk', result);

  return (
    <>
      <button type="button" className="btn btn-sm btn-link" onClick={onClear}>
        {t('pages.bulk.clearSelection')}
      </button>
      {actions.map(action => (
        <button
          key={action.key}
          type="button"
          className={`btn btn-sm ${action.variant}`}
          disabled={busy}
          onClick={() => pick(action)}
        >
          {t(action.labelKey)}
        </button>
      ))}
      {actions.some(entry => entry.opens) ? (
        <CascadeCheck checked={beneath} onChange={setBeneath} />
      ) : null}
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      <ConfirmModal
        show={Boolean(pending)}
        handleClose={() => setPending(null)}
        handleConfirm={() => run(pending)}
        title={t('pages.bulk.confirmTitle')}
        message={t('pages.bulk.confirmBody', {
          action: pending ? t(pending.labelKey) : '',
          count,
          keyword: t('pages.confirm.keyword'),
        })}
      />
      {BulkDialog && dialog ? (
        <BulkDialog
          action={dialog}
          level={level}
          groups={groups}
          count={count}
          onSubmit={extra => {
            setDialog(null);
            run(dialog, extra);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
};

BulkActions.propTypes = {
  collection: collectionShape.isRequired,
  level: PropTypes.oneOf(['items', 'versions', 'providers', 'architectures']).isRequired,
  groups: PropTypes.arrayOf(bulkGroupShape).isRequired,
  onClear: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default BulkActions;
