import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { useSelection } from '../../../../hooks/useSelection';
import { pageContextShape } from '../../../../utils/itemShape';
import { destroyZfsSnapshot } from '../../api/zfsAPI';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useZfsTools } from '../../hooks/useZfsTools';
import { sectionTitle } from '../../pages';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';
import { DatasetTree, snapshotRowsOf, useDatasetTree } from '../ZfsDatasetsPanel';

const NO_ROWS = [];

const NO_COLUMNS = [];

const nameOf = row => row.name;

const matchesSnapshot = (row, needle) => row.name.toLowerCase().includes(needle);

const PickedSnapshots = ({ selection, busy, onDestroy }) => {
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
        data-action="bulk-destroy"
        disabled={busy}
        onClick={onDestroy}
      >
        <FaTrash className="me-1" aria-hidden="true" />
        {t('host.zfsDatasetsPanel.destroySelected')}
      </button>
    </>
  );
};

PickedSnapshots.propTypes = {
  selection: PropTypes.shape({
    someSelected: PropTypes.bool.isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
    clear: PropTypes.func.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onDestroy: PropTypes.func.isRequired,
};

/**
 * The destroy of the picked snapshots: `destroy(names)` sends one
 * `DELETE storage/snapshot` a name, watches the task of every answer
 * through `tools`, and raises one notice naming how many were queued, or
 * the snapshots the agent refused with its messages; `busy` is true while
 * the requests are in flight.
 *
 * @param {Object} options - The host and the ZFS sender
 * @returns {{ destroy: Function, busy: boolean }} The destroy and its state
 */
const useBulkDestroy = ({ id, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const destroy = async names => {
    setBusy(true);
    const answers = await Promise.allSettled(
      names.map(name => destroyZfsSnapshot(status, id, name))
    );
    setBusy(false);
    answers.forEach(answer => {
      if (answer.status === 'fulfilled') {
        tools.watch(answer.value);
      }
    });
    const failures = answers
      .map((answer, index) =>
        answer.status === 'rejected' ? `${names[index]}: ${answer.reason.message}` : ''
      )
      .filter(Boolean);
    if (failures.length > 0) {
      notify(
        'danger',
        t('host.zfsDatasetsPanel.bulkFailuresMessage', {
          count: failures.length,
          list: failures.join('; '),
        })
      );
    } else {
      notify(
        'success',
        t('host.zfsDatasetsPanel.bulkDestroyQueuedMessage', { count: names.length })
      );
    }
  };

  return { destroy, busy };
};

/**
 * The Snapshots page of a host, the ZFS dataset manager's tree with
 * every dataset's snapshots unfolded as the one body of its own page,
 * behind `zfs`: one heading row, the section's title counting the
 * snapshots the navbar search leaves, and in its pane, while snapshots
 * are picked, "N selected", Clear selection and Destroy selected, then
 * Expand all, Collapse all, Create dataset and Refresh; under it the
 * pool filter, the type toggles and the `DatasetTree` with the select
 * column of one `useSelection` over the snapshot names, each snapshot's
 * rollback, clone, holds and destroy. The navbar search narrows the tree
 * by name through `useHostManageSearch`. Destroy selected waits behind
 * the typed confirmation and sends one `DELETE storage/snapshot` a picked
 * snapshot, one notice naming the count, the pick cleared; every write is
 * a queued task through the one `useZfsTools`, the tree read again when a
 * task this page queued ends and on Refresh.
 */
const SnapshotsPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [turn, setTurn] = useState(0);
  const [destroying, setDestroying] = useState(false);
  const bump = useCallback(() => setTurn(current => current + 1), []);
  const tools = useZfsTools({ id, onSettled: bump });
  const data = useDatasetTree({ id, turn, snapshotsOpen: true });
  const rows = useMemo(() => snapshotRowsOf(data.tree), [data.tree]);
  const search = useHostManageSearch({
    section,
    tables: {
      snapshots: tableOf({
        key: 'snapshots',
        labelKey: 'navbar.contextTabs.snapshots',
        rows,
        columns: NO_COLUMNS,
        matches: matchesSnapshot,
        sort: 'name',
        offered: false,
      }),
    },
    ctx: { ...context, t, language: i18n.language },
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'host.zfsDatasetsPanel.searchPlaceholder',
  });
  const selection = useSelection(NO_ROWS, { keyOf: nameOf, labelOf: nameOf });
  const bulk = useBulkDestroy({ id, tools });
  const busy = tools.busy || bulk.busy;
  const names = [...selection.selected];

  const refresh = () => {
    onRefresh();
    bump();
  };

  const destroyPicked = () => bulk.destroy(names).then(selection.clear);

  const picked = (
    <PickedSnapshots selection={selection} busy={busy} onDestroy={() => setDestroying(true)} />
  );

  return (
    <SectionPane section={section} server={server} headed={false}>
      <div data-panel="storage-management">
        <DatasetTree
          id={id}
          data={data}
          tools={tools}
          needle={search.needle}
          title={sectionTitle(section, server, '', t)}
          count={data.loaded ? search.tables.snapshots.rows.length : null}
          lead={picked}
          trail={<RefreshButton onRefresh={refresh} />}
          selection={selection}
          busy={bulk.busy}
        />
        {tools.task ? (
          <TaskDialog status={status} id={id} task={tools.task} onHide={tools.closeTask} />
        ) : null}
      </div>
      <ConfirmModal
        show={destroying}
        handleClose={() => setDestroying(false)}
        handleConfirm={destroyPicked}
        title={t('host.zfsDatasetsPanel.bulkDestroyTitle', { count: names.length })}
        message={t('host.zfsDatasetsPanel.bulkDestroyMessage', { names: names.join(', ') })}
        keyword={t('hosts.storage.destroyWord')}
        confirmText={t('host.zfsDatasetsPanel.bulkDestroyConfirm', { count: names.length })}
      />
    </SectionPane>
  );
};

SnapshotsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SnapshotsPage;
