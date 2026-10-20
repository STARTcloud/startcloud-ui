import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { sectionTitle } from '../../pages';
import TopologyPanel from '../NetworkTopology/TopologyPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Topology page of a host: one heading, the topology's own, the
 * section's title with the topology's controls then Refresh in its pane,
 * and under it the network topology over the copies the hosts feature's
 * context holds. Refresh reads every held answer of the host and every
 * drawn series again.
 */
const TopologyPage = ({ id, server, section, onRefresh }) => {
  const { t } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
  };

  return (
    <SectionPane section={section} server={server} headed={false}>
      <TopologyPanel
        id={id}
        title={sectionTitle(section, server, '', t)}
        actions={<RefreshButton onRefresh={refresh} />}
      />
    </SectionPane>
  );
};

TopologyPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default TopologyPage;
