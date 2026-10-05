import PropTypes from 'prop-types';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import DnsSettings from '../DnsSettings';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const foldOf = (folds, key) => ({
  folded: folds.folded(key),
  onFold: () => folds.toggle(key),
  title: '',
});

/**
 * The DNS page of a host: the heading with Refresh in its pane, and
 * under it the DNS resolver as a folding section drawn while the host's
 * own row offers its read, every write through the one
 * `useNetworkingTools` and the task dialog it opens drawn once; the read
 * the copy the hosts feature's context holds and the fold kept under the
 * page's `table_prefs_dns`.
 */
const DnsPage = ({ id, server, context, section, onRefresh }) => {
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const dns = useHostReading(id, 'dns');
  const tools = useNetworkingTools();
  const role = context.user?.role;

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      {dns.offered ? (
        <DnsSettings
          id={id}
          role={role}
          reading={dns}
          fold={foldOf(folds, 'manage-dns')}
          tools={tools}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

DnsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default DnsPage;
