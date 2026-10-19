import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useManageSectionsData } from '../../hooks/useManageSectionsData';
import { sectionTitle } from '../../pages';
import { matchesDatabase } from '../../utils/database';
import { DATABASE_COLUMNS } from '../DatabasePanel';
import DatabaseSection from '../DatabaseSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Database page of a host: `DatabaseSection` drawing the one heading,
 * the section's title with the totals of the statistics, Vacuum, Analyze,
 * Cleanup and Refresh in its pane, and the one table under it, the
 * statistics read once for this page.
 */
const DatabasePage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const sections = useManageSectionsData({ id, server, only: ['database'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      databases: tableOf({
        key: 'databases',
        labelKey: 'pages.hostManage.tabDatabase',
        rows: sections.rows.databases,
        columns: DATABASE_COLUMNS,
        matches: matchesDatabase,
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  return (
    <SectionPane section={section} server={server} headed={false}>
      <DatabaseSection
        id={id}
        ctx={ctx}
        table={search.tables.databases}
        reading={sections.reads.databases}
        filtering={search.filtering}
        title={sectionTitle(section, server, '', t)}
        actions={<RefreshButton onRefresh={onRefresh} />}
      />
    </SectionPane>
  );
};

DatabasePage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default DatabasePage;
