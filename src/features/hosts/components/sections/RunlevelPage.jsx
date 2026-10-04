import PropTypes from 'prop-types';

import RefreshButton from '../RefreshButton';
import RunlevelSection from '../RunlevelSection';
import SectionPane from '../SectionPane';

/**
 * The Runlevel page of a host, the old Manage page's Runlevel section
 * as the one body of its own page: the heading with Refresh in its
 * pane and under it `RunlevelSection` as it was drawn, its reads its
 * own.
 */
const RunlevelPage = ({ id, server, section, onRefresh }) => (
  <SectionPane section={section} server={server} actions={<RefreshButton onRefresh={onRefresh} />}>
    <RunlevelSection id={id} />
  </SectionPane>
);

RunlevelPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default RunlevelPage;
