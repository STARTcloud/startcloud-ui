import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { matchesTemplate } from '../../utils/manageCatalog';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TemplatesSection, { TEMPLATE_COLUMNS, TEMPLATE_FILTERS } from '../TemplatesSection';

/**
 * The Templates page of a host: the heading counting the templates the
 * search leaves, Refresh in its pane, and `TemplatesSection` under it,
 * the templates and their registries read once for this page.
 */
const TemplatesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const catalog = useManageCatalogData({ id, server, only: ['templates'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      templates: tableOf({
        key: 'templates',
        labelKey: 'pages.hostManage.tabTemplates',
        rows: catalog.rows.templates,
        columns: TEMPLATE_COLUMNS,
        matches: matchesTemplate,
        filterGroups: TEMPLATE_FILTERS,
        sort: 'box',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.templates.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <TemplatesSection
        id={id}
        server={server}
        ctx={ctx}
        table={search.tables.templates}
        reads={catalog.reads}
        rows={catalog.rows}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

TemplatesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default TemplatesPage;
