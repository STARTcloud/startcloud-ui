import PropTypes from 'prop-types';

import { pageContextShape } from '../../../../utils/itemShape';
import AgentSecretsTab from '../AgentSecretsTab';
import SectionPane from '../SectionPane';

/**
 * The Secrets page of a host, behind `certs-store`: `AgentSecretsTab`
 * draws the one heading row and every row of the host's store under it,
 * the six certificate kinds and the eight secret kinds, its Reload the
 * page's `onRefresh`.
 */
const SecretsPage = ({ id, server, context, section, onRefresh }) => (
  <SectionPane section={section} server={server} headed={false}>
    <AgentSecretsTab
      id={id}
      server={server}
      context={context}
      section={section}
      onRefresh={onRefresh}
    />
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
