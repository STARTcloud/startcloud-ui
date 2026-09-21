import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { StatusMenu, VisibilityMenu, pickedOf } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { collectionShape } from '../../../utils/itemShape';
import { refusalMessage } from '../../../utils/validation';
import { OPENING_VERBS, STATUS_VERBS, VISIBILITY_VERBS } from '../../collections/bulkActions';

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

const PickerFor = ({ action, count, busy, onVisibility, onStatus }) => {
  const className = `btn btn-sm ${action.variant}`;
  if (action.picker === 'visibility') {
    return (
      <VisibilityMenu count={count} className={className} disabled={busy} onPick={onVisibility} />
    );
  }
  return <StatusMenu count={count} className={className} disabled={busy} onPick={onStatus} />;
};

PickerFor.propTypes = {
  action: PropTypes.shape({
    picker: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  onVisibility: PropTypes.func.isRequired,
  onStatus: PropTypes.func.isRequired,
};

/**
 * The picked-state group of a section's action pane: Clear selection, then
 * the collection's bulk actions for this level as `definition.bulk` names
 * them, the Visibility and Status pickers first, a pick sent as its wire
 * verbs in order, `recursive: true` riding an opening verb while the
 * line's scope glyph shows everything beneath; then each action naming a
 * `dialog`, drawn through the collection's `BulkDialog` slot first, the
 * dialog answering the body members the call carries beside the names
 * (`values` on Edit, the target address on Move to); then the rest, a
 * destructive one gated by the shared confirm. Every call is one
 * `bulk(level, verb, names, scope, extra)` per scope the picked rows
 * span, the one result line naming processed, skipped and each error's
 * code after them all. Draws nothing while no row is picked or the
 * collection names no bulk action for the level.
 */
const BulkActions = ({ collection, level, groups, onClear, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [pending, setPending] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const { BulkDialog } = collection.slots;
  const actions = (collection.bulk || {})[level] || [];
  const count = groups.reduce((sum, group) => sum + group.names.length, 0);

  if (count === 0 || actions.length === 0 || !collection.adapter.bulk) {
    return null;
  }

  const send = (verb, extra) =>
    Promise.all(
      groups.map(group => collection.adapter.bulk(level, verb, group.names, group.scope, extra))
    );

  const finish = calls => {
    setBusy(true);
    calls
      .then(answers => {
        setResult(merged(answers));
        onDone();
      })
      .catch(error => notify('danger', refusalMessage({ error, t })))
      .finally(() => setBusy(false));
  };

  const run = (action, extra = {}) => finish(send(action.key, extra));

  const runVerbs = (verbs, beneath) =>
    finish(
      verbs.reduce(
        (chain, verb) =>
          chain.then(answers =>
            send(verb, beneath && OPENING_VERBS.includes(verb) ? { recursive: true } : {}).then(
              more => [...answers, ...more]
            )
          ),
        Promise.resolve([])
      )
    );

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
      {actions.map(action =>
        action.picker ? (
          <PickerFor
            key={action.key}
            action={action}
            count={count}
            busy={busy}
            onVisibility={body =>
              runVerbs(VISIBILITY_VERBS[pickedOf(body)], Boolean(body.recursive))
            }
            onStatus={body =>
              runVerbs(
                STATUS_VERBS[body.published ? 'publish' : 'unpublish'],
                Boolean(body.recursive)
              )
            }
          />
        ) : (
          <button
            key={action.key}
            type="button"
            className={`btn btn-sm ${action.variant}`}
            disabled={busy}
            onClick={() => pick(action)}
          >
            {t(action.labelKey)}
          </button>
        )
      )}
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
