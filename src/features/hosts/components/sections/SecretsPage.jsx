import PropTypes from 'prop-types';

import { pageContextShape } from '../../../../utils/itemShape';
import AgentSecretsTab from '../AgentSecretsTab';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Secrets page of a host, behind `certs-store`: the heading with Refresh
 * in its pane and under it the host store's secret rows over the Vault's
 * table, `AgentSecretsTab`, its Share from Vault pick keeping its table
 * preferences under the page's own prefs.
 */
const SecretsPage = ({ id, server, context, section, onRefresh }) => (
  <SectionPane section={section} server={server} actions={<RefreshButton onRefresh={onRefresh} />}>
    <AgentSecretsTab id={id} prefsKey={`${context.prefsPrefix}_agent_secrets`} />
  </SectionPane>
);

SecretsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SecretsPage;
