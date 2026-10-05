import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import HostsFileEditor from '../HostsFileEditor';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const foldOf = (folds, key) => ({
  folded: folds.folded(key),
  onFold: () => folds.toggle(key),
  title: '',
});

/**
 * The Hosts file page of a host: the heading with Refresh in its pane,
 * and under it the hosts file as a folding section drawn while the
 * host's own row offers its read, every write through the one
 * `useNetworkingTools` and the task dialog it opens drawn once; the read
 * the copy the hosts feature's context holds and the fold kept under the
 * page's `table_prefs_hosts-file`.
 */
const HostsFilePage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const hosts = useHostReading(id, 'hosts-file');
  const tools = useNetworkingTools();
  const ctx = { ...context, t, language: i18n.language };
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
      {hosts.offered ? (
        <HostsFileEditor
          id={id}
          role={role}
          reading={hosts}
          ctx={ctx}
          fold={foldOf(folds, 'manage-hosts')}
          tools={tools}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

HostsFilePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default HostsFilePage;
