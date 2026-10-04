import PropTypes from 'prop-types';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import ApiKeysTab from '../ApiKeysTab';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The API keys page of a host, the Agent settings page's API
 * management tab as the one body of its own page: the heading with
 * Refresh in its pane and under it `ApiKeysTab` as it was drawn, the
 * generate card folding under the page's own prefs.
 */
const ApiKeysPage = ({ id, server, context, section, onRefresh }) => {
  const folds = useFolds(`${context.prefsPrefix}_agent_api_keys`);
  return (
    <SectionPane
      section={section}
      server={server}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ApiKeysTab id={id} folds={folds} />
    </SectionPane>
  );
};

ApiKeysPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ApiKeysPage;
