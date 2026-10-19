import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { sectionTitle } from '../../pages';
import OrchestrationPanel from '../OrchestrationPanel';
import SectionPane from '../SectionPane';

/**
 * The Orchestration page of a host: `OrchestrationPanel` drawing the one
 * heading, the section's title with the status badge, the strategy,
 * Enable or Disable, Preview, Apply and Refresh in its pane, and the boot
 * order under it, its reads its own.
 */
const OrchestrationPage = ({ id, server, section, onRefresh }) => {
  const { t } = useTranslation();
  return (
    <SectionPane section={section} server={server} headed={false}>
      <OrchestrationPanel
        id={id}
        title={sectionTitle(section, server, '', t)}
        onRefresh={onRefresh}
      />
    </SectionPane>
  );
};

OrchestrationPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default OrchestrationPage;
