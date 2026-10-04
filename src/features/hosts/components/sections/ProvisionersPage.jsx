import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { matchesProvisioner } from '../../utils/manageCatalog';
import ProvisionerSection, { PROVISIONER_COLUMNS } from '../ProvisionerSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Provisioners page of a host: the heading counting the families
 * the search leaves, Refresh in its pane, and `ProvisionerSection`
 * under it, the families, the catalog's newest versions and the secrets
 * read once for this page.
 */
const ProvisionersPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const catalog = useManageCatalogData({ id, server, only: ['provisioners'] });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      provisioners: tableOf({
        key: 'provisioners',
        labelKey: 'pages.hostManage.tabProvisioners',
        rows: catalog.rows.provisioners,
        columns: PROVISIONER_COLUMNS,
        matches: matchesProvisioner,
        sort: 'name',
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
      count={search.tables.provisioners.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ProvisionerSection
        id={id}
        server={server}
        ctx={ctx}
        table={search.tables.provisioners}
        reads={catalog.reads}
        rows={catalog.rows}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

ProvisionersPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ProvisionersPage;
