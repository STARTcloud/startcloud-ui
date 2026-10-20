import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import { sectionTitle } from '../../pages';
import HostnameSettings from '../HostnameSettings';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

/**
 * The Hostname page of a host: one heading, the hostname section's own,
 * the section's title with the host's current hostname after it and
 * Change hostname, Reset and Refresh in its pane, and under it the
 * hostname straight on the page's ground, drawn while the host's own row
 * offers its read, every write through the one `useNetworkingTools` and
 * the task dialog it opens drawn once; the read the copy the hosts
 * feature's context holds.
 */
const HostnamePage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const hostname = useHostReading(id, 'hostname');
  const tools = useNetworkingTools();
  const role = context.user?.role;
  const current = hostname.data?.hostname || '';

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane section={section} server={server} headed={!hostname.offered}>
      {hostname.offered ? (
        <HostnameSettings
          id={id}
          role={role}
          reading={hostname}
          tools={tools}
          title={sectionTitle(section, server, '', t)}
          count={current ? <code>{current}</code> : null}
          actions={<RefreshButton onRefresh={refresh} />}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

HostnamePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default HostnamePage;
