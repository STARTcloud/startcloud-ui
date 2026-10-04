import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';

import { useStatus } from '../../../../contexts/StatusContext';
import { useZfsTools } from '../../hooks/useZfsTools';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';
import ZfsDatasetsPanel from '../ZfsDatasetsPanel';

/**
 * The Snapshots page of a host, the ZFS dataset manager's tree with
 * every dataset's snapshots unfolded as the one body of its own page,
 * behind `zfs`: the heading with Refresh in its pane and under it
 * `ZfsDatasetsPanel` as it was drawn with `snapshotsOpen`, each
 * snapshot's rollback, clone, holds and destroy and the bulk destroy of
 * the picked ones, every write a queued task through the one
 * `useZfsTools`, the tree read again when a task this page queued ends
 * and on Refresh.
 */
const SnapshotsPage = ({ id, server, section, onRefresh }) => {
  const status = useStatus();
  const [turn, setTurn] = useState(0);
  const bump = useCallback(() => setTurn(current => current + 1), []);
  const tools = useZfsTools({ id, onSettled: bump });

  const refresh = () => {
    onRefresh();
    bump();
  };

  return (
    <SectionPane section={section} server={server} actions={<RefreshButton onRefresh={refresh} />}>
      <div data-panel="storage-management">
        <ZfsDatasetsPanel id={id} turn={turn} tools={tools} snapshotsOpen />
        {tools.task ? (
          <TaskDialog status={status} id={id} task={tools.task} onHide={tools.closeTask} />
        ) : null}
      </div>
    </SectionPane>
  );
};

SnapshotsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SnapshotsPage;
