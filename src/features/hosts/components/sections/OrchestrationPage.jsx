import PropTypes from 'prop-types';

import OrchestrationPanel from '../OrchestrationPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Orchestration page of a host, the old Manage page's Orchestration
 * section as the one body of its own page: the heading with Refresh in
 * its pane and under it `OrchestrationPanel` as it was drawn, its reads
 * its own.
 */
const OrchestrationPage = ({ id, server, section, onRefresh }) => (
  <SectionPane section={section} server={server} actions={<RefreshButton onRefresh={onRefresh} />}>
    <OrchestrationPanel id={id} />
  </SectionPane>
);

OrchestrationPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default OrchestrationPage;
