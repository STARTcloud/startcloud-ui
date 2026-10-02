import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCamera } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { pageContextShape } from '../../../utils/itemShape';
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
 * The snapshots of one machine, hyperweaver-ui's snapshots card, a glass
 * section behind `machine-snapshots`: the heading with the count and,
 * for a person who may create machines, Take snapshot; under it
 * `policy`, the retention policy where the unit that holds the section
 * hands one in, where hyperweaver-ui drew it; and the one `SubTable` of
 * the copy `useMachineSnapshots` holds, narrowed by the navbar binding
 * of `useDetailSearch` under `table_prefs_snapshots`, in the agent's own
 * order until a header sorts it, its Actions column the row buttons of
 * `SnapshotRowActions`. The snapshots of a machine on UTM are asked for
 * while it is off alone, the agent refusing the list of one that runs,
 * and the section says so in their place; a read that failed draws the
 * agent's message. Every write goes through the dialogs of
 * `SnapshotDialogs`, one request and one notice each. Restore and start
 * draws on every host that offers the restore: where the end of the
 * restore's task reaches the stream the start follows it, and where it
 * does not the person is told and offered the start.
 */
const MachineSnapshots = ({ id, name, context, machine = null, running, policy = null }) => {
  const { t, i18n } = useTranslation();
  const server = useHostRow(id);
  const gates = machineToolGates({ server, machine, role: context.user?.role });
  const asked = !(gates.utm && running);
  const { snapshots, loaded, failed, message, refresh } = useMachineSnapshots(id, name, asked);
  const tools = useMachineTools();
  const [open, setOpen] = useState(CLOSED);
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
  const state = stateOf({ asked, loaded, failed, message });
  const take = gates.snapshot ? (
    <TakeButton busy={tools.busy} onTake={() => setOpen({ kind: 'take', snapshot: null })} />
  ) : null;

  return (
    <div data-panel="machine-snapshots" data-count={snapshots.length}>
      <SectionHeading
        title={t('machine.machineSnapshots.snapshotsHeading', { count: snapshots.length })}
        actions={take}
      />
      {state ? (
        <p className={state.tone} data-note={state.note}>
          {t(state.key, state.values)}
        </p>
      ) : null}
      {policy}
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
            busy: tools.busy,
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
    </div>
  );
};

MachineSnapshots.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  machine: PropTypes.object,
  running: PropTypes.bool.isRequired,
  policy: PropTypes.node,
};

export default MachineSnapshots;
