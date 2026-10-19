import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCamera } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import { deleteSnapshot } from '../api/snapshots';
import { useHostRow } from '../hooks/useHostRow';
import { useMachineSnapshots } from '../hooks/useMachineSnapshots';
import { useMachineTools } from '../hooks/useMachineTools';
import { machineToolGates } from '../utils/machineTools';
import { matchesSnapshot, snapshotKey } from '../utils/snapshots';

import { SNAPSHOT_COLUMNS, SNAPSHOT_FILTERS } from './SnapshotColumns';
import SnapshotDialogs from './SnapshotDialogs';
import SnapshotRowActions from './SnapshotRowActions';

const NO_SORT = [];

const CLOSED = { kind: '', snapshot: null };

const nameOf = row => row.name;

const TakeButton = ({ busy, onTake }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="snapshot-take"
      disabled={busy}
      onClick={onTake}
    >
      <FaCamera className="me-1" aria-hidden="true" />
      {t('machine.machineSnapshots.takeSnapshotSubmit')}
    </button>
  );
};

TakeButton.propTypes = {
  busy: PropTypes.bool.isRequired,
  onTake: PropTypes.func.isRequired,
};

const PickedActions = ({ selection, busy, onDelete }) => {
  const { t } = useTranslation();
  if (!selection.someSelected) {
    return null;
  }
  return (
    <>
      <strong>{t('pages.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('pages.bulk.clearSelection')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        data-action="bulk-delete"
        disabled={busy}
        onClick={onDelete}
      >
        {t('pages.bulk.delete')}
      </button>
    </>
  );
};

PickedActions.propTypes = {
  selection: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const stateOf = ({ asked, loaded, failed, message }) => {
  if (!asked) {
    return {
      key: 'machine.machineSnapshots.utmStoppedOnly',
      values: {},
      note: 'utm-stopped-only',
      tone: 'text-muted',
    };
  }
  if (!loaded) {
    return { key: 'pages.loading', values: {}, note: 'snapshots-loading', tone: 'text-muted' };
  }
  return failed
    ? {
        key: 'machine.machineSnapshots.loadFailed',
        values: { message },
        note: 'snapshots-failed',
        tone: 'text-danger',
      }
    : null;
};

/**
 * The delete of the picked snapshots: `remove(rows)` sends one
 * `DELETE machines/{name}/snapshots/{snapshot}` a row, raises one notice
 * naming how many were deleted, or how many the agent refused with its
 * first message, and calls `onDone` once after them all; `busy` is true
 * while the requests are in flight.
 *
 * @param {Object} options - The host, the machine and the read after
 * @returns {{ remove: Function, busy: boolean }} The delete and its state
 */
const useBulkDelete = ({ id, name, onDone }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const remove = async rows => {
    setBusy(true);
    const answers = await Promise.allSettled(
      rows.map(row => deleteSnapshot(status, id, name, row.name))
    );
    const refused = answers.filter(answer => answer.status === 'rejected');
    if (refused.length === 0) {
      notify('success', t('hosts.snapshots.done.deleteMany', { count: rows.length }));
    } else {
      notify(
        'danger',
        t('hosts.snapshots.deleteManyFailed', {
          count: refused.length,
          total: rows.length,
          message: refused[0].reason?.message || t('hosts.controls.failed'),
        })
      );
    }
    setBusy(false);
    onDone();
  };

  return { remove, busy };
};

/**
 * The snapshots of one machine, a glass section behind
 * `machine-snapshots`: the heading with the count and, for a person who
 * may create machines, its pane reading the picked state while rows are
 * picked, "N selected", Clear selection and Delete selected behind the
 * typed confirmation, one `DELETE machines/{name}/snapshots/{snapshot}`
 * a picked row, one notice naming the count and the rows read again
 * once, then Take snapshot; and the one `SubTable` of the copy
 * `useMachineSnapshots` holds, its select column drawn for that person,
 * narrowed by the navbar binding of `useDetailSearch` under
 * `table_prefs_snapshots`, in the agent's own order until a header sorts
 * it, its Actions column the row buttons of `SnapshotRowActions`. The
 * snapshots of a machine on UTM are asked for while it is off alone, the
 * agent refusing the list of one that runs, and the section says so in
 * their place; a read that failed draws the agent's message. Every other
 * write goes through the dialogs of `SnapshotDialogs`, one request and
 * one notice each. Restore and start draws on every host that offers the
 * restore: where the end of the restore's task reaches the stream the
 * start follows it, and where it does not the person is told and offered
 * the start.
 */
const MachineSnapshots = ({ id, name, context, machine = null, running }) => {
  const { t, i18n } = useTranslation();
  const server = useHostRow(id);
  const gates = machineToolGates({ server, machine, role: context.user?.role });
  const asked = !(gates.utm && running);
  const { snapshots, loaded, failed, message, refresh } = useMachineSnapshots(id, name, asked);
  const tools = useMachineTools();
  const [open, setOpen] = useState(CLOSED);
  const [deleting, setDeleting] = useState(false);
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    holdable: gates.holds,
    onHolds: snapshot => setOpen({ kind: 'holds', snapshot }),
  };
  const search = useDetailSearch({
    rows: snapshots,
    matches: matchesSnapshot,
    placeholderKey: 'hosts.snapshots.search',
    columns: SNAPSHOT_COLUMNS,
    ctx,
    prefsKey: `${context.prefsPrefix}_snapshots`,
    filterGroups: SNAPSHOT_FILTERS,
    defaultSort: NO_SORT,
  });
  const selection = useSelection(search.rows, { keyOf: snapshotKey, labelOf: nameOf });
  const bulk = useBulkDelete({ id, name, onDone: refresh });
  const state = stateOf({ asked, loaded, failed, message });
  const busy = tools.busy || bulk.busy;

  const picked = () => search.rows.filter(row => selection.selected.has(snapshotKey(row)));

  const removePicked = () => bulk.remove(picked()).then(selection.clear);

  const actions = gates.snapshot ? (
    <>
      <PickedActions selection={selection} busy={busy} onDelete={() => setDeleting(true)} />
      <TakeButton busy={busy} onTake={() => setOpen({ kind: 'take', snapshot: null })} />
    </>
  ) : null;

  return (
    <div data-panel="machine-snapshots" data-count={snapshots.length}>
      <SectionHeading
        title={t('machine.machineSnapshots.snapshotsHeading', { count: snapshots.length })}
        actions={actions}
      />
      {state ? (
        <p className={state.tone} data-note={state.note}>
          {t(state.key, state.values)}
        </p>
      ) : null}
      {loaded ? (
        <SubTable
          columns={SNAPSHOT_COLUMNS}
          rows={search.rows}
          rowKey={snapshotKey}
          rowProp="snapshot"
          RowActions={gates.snapshot ? SnapshotRowActions : null}
          actionsProps={{
            offers: gates,
            running,
            busy,
            onAction: (kind, snapshot) => setOpen({ kind, snapshot }),
          }}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={t(
            search.filtering ? 'pages.noMatches' : 'machine.machineSnapshots.noSnapshotsYet'
          )}
          selection={gates.snapshot ? selection.subtable : null}
        />
      ) : null}
      <SnapshotDialogs
        id={id}
        name={name}
        open={open}
        gates={gates}
        running={running}
        tools={tools}
        onClose={() => setOpen(CLOSED)}
        onHoldsClosed={refresh}
      />
      <ConfirmModal
        show={deleting}
        handleClose={() => setDeleting(false)}
        handleConfirm={removePicked}
        title={t('pages.bulk.confirmTitle')}
        message={t('pages.bulk.confirmBody', {
          action: t('pages.bulk.delete'),
          count: selection.selected.size,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

MachineSnapshots.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  machine: PropTypes.object,
  running: PropTypes.bool.isRequired,
};

export default MachineSnapshots;
