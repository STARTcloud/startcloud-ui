import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import ProvisioningNetworkPanel from '../ProvisioningNetworkPanel';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Provisioning network page of a host, the old Manage page's
 * Provisioning network section as the one body of its own page: the
 * heading with Refresh in its pane and under it
 * `ProvisioningNetworkPanel` as it was drawn, its read its own.
 */
const ProvisioningNetworkPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const ctx = { ...context, t, language: i18n.language, id, server };
  return (
    <SectionPane
      section={section}
      server={server}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ProvisioningNetworkPanel id={id} ctx={ctx} />
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
