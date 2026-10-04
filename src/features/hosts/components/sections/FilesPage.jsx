import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import FileManagerSection from '../FileManagerSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The File manager page of a host, the old Manage page's File manager
 * section as the one body of its own page: the heading with Refresh in
 * its pane and under it `FileManagerSection` as it was drawn, the file
 * system read by its own manager.
 */
const FilesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const ctx = { ...context, t, language: i18n.language, id, server };
  return (
    <SectionPane
      section={section}
      server={server}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <FileManagerSection id={id} ctx={ctx} />
    </SectionPane>
  );
};

FilesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default FilesPage;
