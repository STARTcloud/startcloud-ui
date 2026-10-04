import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import DnsSettings from '../DnsSettings';
import HostnameSettings from '../HostnameSettings';
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
 * The Hostname and DNS page of a host, the old networking page's
 * hostname, hosts file and DNS sections as the one body of its own
 * page, in hyperweaver-ui's order: the heading reading the host's
 * current hostname, Refresh in its pane, and under it the hostname, the
 * hosts file and the DNS, each a folding section drawn only while the
 * host's own row offers its read, every write through the one
 * `useNetworkingTools` and the task dialog it opens drawn once; every
 * read the copy the hosts feature's context holds and every fold kept
 * under the page's `table_prefs_hostname`.
 */
const HostnamePage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const hostname = useHostReading(id, 'hostname');
  const hosts = useHostReading(id, 'hosts-file');
  const dns = useHostReading(id, 'dns');
  const tools = useNetworkingTools();
  const ctx = { ...context, t, language: i18n.language };
  const role = context.user?.role;
  const current = hostname.data?.hostname || '';

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={current ? <code>{current}</code> : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      {hostname.offered ? (
        <HostnameSettings
          id={id}
          role={role}
          reading={hostname}
          fold={foldOf(folds, 'manage-hostname')}
          tools={tools}
        />
      ) : null}
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

HostnamePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default HostnamePage;
