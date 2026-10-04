import PropTypes from 'prop-types';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import AgentSecretsTab from '../AgentSecretsTab';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Secrets page of a host, the Agent settings page's Global secrets
 * tab as the one body of its own page, behind `secrets`: the heading
 * with Refresh in its pane and under it `AgentSecretsTab` as it was
 * drawn, its six category cards folding under the page's own prefs.
 */
const SecretsPage = ({ id, server, context, section, onRefresh }) => {
  const folds = useFolds(`${context.prefsPrefix}_agent_secrets`);
  return (
    <SectionPane
      section={section}
      server={server}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <AgentSecretsTab id={id} folds={folds} />
    </SectionPane>
  );
};

SecretsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default SecretsPage;
