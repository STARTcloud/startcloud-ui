import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import { sectionTitle } from '../../pages';
import DnsSettings from '../DnsSettings';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

/**
 * The DNS page of a host: one heading, the DNS section's own, the
 * section's title with the raw-mode button, Save and Refresh in its pane,
 * and under it the resolver straight on the page's ground, drawn while
 * the host's own row offers its read, every write through the one
 * `useNetworkingTools` and the task dialog it opens drawn once; the read
 * the copy the hosts feature's context holds.
 */
const DnsPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const dns = useHostReading(id, 'dns');
  const tools = useNetworkingTools();
  const role = context.user?.role;

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane section={section} server={server} headed={!dns.offered}>
      {dns.offered ? (
        <DnsSettings
          id={id}
          role={role}
          reading={dns}
          tools={tools}
          title={sectionTitle(section, server, '', t)}
          actions={<RefreshButton onRefresh={refresh} />}
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
