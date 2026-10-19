import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { sectionTitle } from '../../pages';
import ProvisioningNetworkPanel from '../ProvisioningNetworkPanel';
import SectionPane from '../SectionPane';

/**
 * The Provisioning network page of a host: `ProvisioningNetworkPanel`
 * drawing the one heading, the section's title with the ready badge,
 * Edit settings, Set up, Tear down and Refresh in its pane, and the
 * status under it, its read its own.
 */
const ProvisioningNetworkPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const ctx = { ...context, t, language: i18n.language, id, server };
  return (
    <SectionPane section={section} server={server} headed={false}>
      <ProvisioningNetworkPanel
        id={id}
        ctx={ctx}
        title={sectionTitle(section, server, '', t)}
        onRefresh={onRefresh}
      />
    </SectionPane>
  );
};

ProvisioningNetworkPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ProvisioningNetworkPage;
