import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaLock, FaLockOpen, FaRotate } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { fetchSnapshotHolds, holdSnapshot, releaseSnapshotHold } from '../api/snapshots';
import { useHostRow } from '../hooks/useHostRow';
import { agentIdOf } from '../utils/hosts';
import { hostStreamsTasks } from '../utils/machineTools';
import { holdHandles } from '../utils/snapshots';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const NO_HOLDS = [];

const UNREAD = { loaded: false, failed: null, holds: {} };

const readOf = (handles, answers) => {
  const refused = answers.findIndex(answer => answer.status === 'rejected');
  return {
    loaded: true,
    failed:
      refused < 0
        ? null
        : { dataset: handles[refused].dataset, message: answers[refused].reason.message },
    holds: Object.fromEntries(
      handles.map((handle, index) => [
        handle.dataset,
        answers[index].status === 'fulfilled' ? answers[index].value : NO_HOLDS,
      ])
    ),
  };
};

const refusalsOf = (handles, answers) =>
  answers
    .map((answer, index) =>
      answer.status === 'rejected' ? `${handles[index].dataset}: ${answer.reason.message}` : ''
    )
    .filter(Boolean);

const taskIdsOf = answers =>
  answers
    .filter(answer => answer.status === 'fulfilled' && answer.value?.task_id)
    .map(answer => String(answer.value.task_id));

/**
 * The holds of one snapshot's datasets, `GET storage/snapshot/holds` of
 * each handle, read once as the dialog opens and again when `turn`
 * moves; a snapshot without a hold answers an empty list, and a read
 * that failed names the dataset it failed for and the agent's message.
 *
 * @param {Object} options - The status, the host, the handles and the turn
 * @returns {{ loaded: boolean, failed: Object|null, holds: Object<string, Array> }} The holds per dataset
 */
const useHolds = ({ status, id, handles, turn }) => {
  const [held, setHeld] = useState(UNREAD);

  useEffect(() => {
    let live = true;
    Promise.allSettled(handles.map(handle => fetchSnapshotHolds(status, id, handle.snapshot))).then(
      answers => {
        if (live) {
          setHeld(readOf(handles, answers));
        }
      }
    );
    return () => {
      live = false;
    };
  }, [status, id, handles, turn]);

  return held;
};

const HoldBadge = ({ hold, dataset, busy, onRelease }) => {
  const { t } = useTranslation();
  const release = t('machine.machineSnapshots.releaseHoldTooltip', { tag: hold.tag, dataset });
  return (
    <span className="badge text-bg-secondary d-inline-flex align-items-center gap-1" data-hold>
      {hold.tag}
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-reset"
        title={release}
        aria-label={release}
        data-action="hold-release"
        disabled={busy}
        onClick={() => onRelease(dataset, hold.tag)}
      >
        <FaLockOpen aria-hidden="true" />
      </button>
    </span>
  );
};

HoldBadge.propTypes = {
  hold: PropTypes.shape({ tag: PropTypes.string.isRequired }).isRequired,
  dataset: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onRelease: PropTypes.func.isRequired,
};

const DatasetHolds = ({ handle, holds, busy, onRelease }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2" data-dataset={handle.dataset}>
      <code className="small">{handle.snapshot}</code>
      {holds.length === 0 ? (
        <span className="text-muted small ms-2">{t('machine.machineSnapshots.noHolds')}</span>
      ) : (
        <div className="d-flex flex-wrap gap-1 mt-1">
          {holds.map(hold => (
            <HoldBadge
              key={hold.tag}
              hold={hold}
              dataset={handle.dataset}
              busy={busy}
              onRelease={onRelease}
            />
          ))}
        </div>
      )}
    </div>
  );
};

DatasetHolds.propTypes = {
  handle: PropTypes.shape({
    dataset: PropTypes.string.isRequired,
    snapshot: PropTypes.string.isRequired,
  }).isRequired,
  holds: PropTypes.arrayOf(PropTypes.object).isRequired,
  busy: PropTypes.bool.isRequired,
  onRelease: PropTypes.func.isRequired,
};

const HoldForm = ({ tag, busy, onTag, onHold }) => {
  const { t } = useTranslation();
  return (
    <div className="input-group input-group-sm mt-3">
      <input
        className="form-control"
        type="text"
        placeholder={t('machine.machineSnapshots.holdTagPlaceholder')}
        aria-label={t('machine.machineSnapshots.holdTagAriaLabel')}
        data-field="hold-tag"
        value={tag}
        disabled={busy}
        onChange={event => onTag(event.target.value)}
      />
      <button
        type="button"
        className="btn btn-outline-primary"
        data-action="hold-all"
        disabled={busy || !tag.trim()}
        onClick={onHold}
      >
        <FaLock className="me-1" aria-hidden="true" />
        {t('machine.machineSnapshots.holdAllButton')}
      </button>
    </div>
  );
};

HoldForm.propTypes = {
  tag: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onTag: PropTypes.func.isRequired,
  onHold: PropTypes.func.isRequired,
};

/**
 * The holds of one snapshot of a machine, hyperweaver-ui's holds dialog,
 * a list dialog: a hold belongs to one dataset's snapshot, so the dialog
 * lists the datasets that carry the machine's snapshot, each with its
 * holds, read once as the dialog opens, one request a dataset. A tag and
 * Hold all place the hold on every dataset, one request a dataset and
 * one notice, and the open lock on a hold releases it, one request and
 * one notice, for every role that reads the snapshots, the way
 * hyperweaver-ui drew them, no agent and no server refusing them by the
 * person's role. Both are queued tasks, so the holds are read again when
 * the task ends and never before: on a host whose agent streams the
 * `tasks` topic the `task-updated` event that says a task this dialog
 * queued ended reads them, and on a host that streams none Refresh does,
 * the read a person asks for; the line under the holds says which of the
 * two the host is, once a task is queued. hyperweaver-ui waited two
 * seconds and read, and that wait is not carried over.
 */
const SnapshotHoldsDialog = ({ id, snapshot, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const server = useHostRow(id);
  const streamed = hostStreamsTasks(status, server);
  const handles = useMemo(() => holdHandles(snapshot), [snapshot]);
  const [turn, setTurn] = useState(0);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [waits, setWaits] = useState(false);
  const queued = useRef(null);
  const held = useHolds({ status, id, handles, turn });

  const again = () => setTurn(current => current + 1);

  const refresh = () => {
    setWaits(false);
    again();
  };

  const watch = ids => {
    queued.current ||= new Set();
    ids.forEach(task => queued.current.add(task));
    setWaits(queued.current.size > 0);
  };

  useEventStream('task-updated', data => {
    const task = String(data?.id);
    if (
      agentIdOf(data) === String(id) &&
      queued.current?.has(task) &&
      TERMINAL_TASK_STATUSES.includes(data?.status)
    ) {
      queued.current.delete(task);
      setWaits(queued.current.size > 0);
      again();
    }
  });

  const holdAll = async () => {
    const word = tag.trim();
    setBusy(true);
    const answers = await Promise.allSettled(
      handles.map(handle => holdSnapshot(status, id, handle.snapshot, word))
    );
    setBusy(false);
    const refusals = refusalsOf(handles, answers);
    watch(taskIdsOf(answers));
    if (refusals.length > 0) {
      notify('danger', refusals.join('; '));
    } else {
      notify('success', t('hosts.snapshots.holds.held', { tag: word, snapshot: snapshot.name }));
      setTag('');
    }
  };

  const release = async (dataset, word) => {
    setBusy(true);
    try {
      const answer = await releaseSnapshotHold(status, id, `${dataset}@${snapshot.name}`, word);
      watch(taskIdsOf([{ status: 'fulfilled', value: answer }]));
      notify('success', t('hosts.snapshots.holds.released', { tag: word, dataset }));
    } catch (error) {
      notify(
        'danger',
        t('machine.machineSnapshots.releaseFailed', { dataset, message: error.message })
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshLabel = t('hosts.page.refresh');

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('machine.machineSnapshots.holdsTitle', { snapshotName: snapshot.name })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="snapshot-holds">
        <div className="d-flex align-items-start gap-2">
          <p className="form-text mt-0 flex-grow-1">
            {t('machine.machineSnapshots.holdsExplanation', { count: handles.length })}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title={refreshLabel}
            aria-label={refreshLabel}
            data-action="holds-refresh"
            onClick={refresh}
          >
            <FaRotate aria-hidden="true" />
          </button>
        </div>
        {held.failed ? (
          <div className="alert alert-danger" role="alert" data-note="holds-failed">
            {t('machine.machineSnapshots.holdsQueryFailed', held.failed)}
          </div>
        ) : null}
        {held.loaded ? (
          handles.map(handle => (
            <DatasetHolds
              key={handle.dataset}
              handle={handle}
              holds={held.holds[handle.dataset] || NO_HOLDS}
              busy={busy}
              onRelease={release}
            />
          ))
        ) : (
          <p className="text-muted mb-2">{t('pages.loading')}</p>
        )}
        {waits ? (
          <p
            className="form-text mb-0"
            role="status"
            data-note={streamed ? 'holds-follow' : 'holds-refresh'}
          >
            {t(streamed ? 'hosts.snapshots.holds.followNote' : 'hosts.snapshots.holds.refreshNote')}
          </p>
        ) : null}
        <HoldForm tag={tag} busy={busy} onTag={setTag} onHold={holdAll} />
      </Modal.Body>
    </Modal>
  );
};

SnapshotHoldsDialog.propTypes = {
  id: PropTypes.string.isRequired,
  snapshot: PropTypes.shape({
    name: PropTypes.string.isRequired,
    dataset_names: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SnapshotHoldsDialog;
