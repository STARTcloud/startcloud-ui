import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { sectionTitle } from '../../pages';
import ApiKeysTab from '../ApiKeysTab';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The API keys page of a host: one heading, the keys' own, the section's
 * title counting the keys with the split Generate key then Refresh in its
 * pane, and the keys table straight under it, `ApiKeysTab` the body.
 */
const ApiKeysPage = ({ id, server, section, onRefresh }) => {
  const { t } = useTranslation();
  return (
    <SectionPane section={section} server={server} headed={false}>
      <ApiKeysTab
        id={id}
        title={sectionTitle(section, server, '', t)}
        actions={<RefreshButton onRefresh={onRefresh} />}
      />
    </SectionPane>
  );
};

ApiKeysPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ApiKeysPage;
