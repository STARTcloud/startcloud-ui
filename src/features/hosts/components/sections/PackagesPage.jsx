import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { catalogParamGroups, useManageCatalogData } from '../../hooks/useManageCatalogData';
import { matchesPackage } from '../../utils/manageCatalog';
import { PACKAGE_COLUMNS, PACKAGE_FILTERS } from '../PackageColumns';
import PackagesSection from '../PackagesSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Packages page of a host: the heading counting the packages the
 * search leaves, Refresh in its pane, and `PackagesSection` under it,
 * the packages read once for this page, the show-all switch in the
 * navbar's panel.
 */
const PackagesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const catalog = useManageCatalogData({ id, server, only: ['packages'] });
  const groups = catalogParamGroups({
    params: catalog.params,
    setParam: catalog.setParam,
    resetParams: catalog.resetParams,
    locations: catalog.rows.locations,
    t,
  });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      packages: tableOf({
        key: 'packages',
        labelKey: 'pages.hostManage.tabPackages',
        rows: catalog.rows.packages,
        columns: PACKAGE_COLUMNS,
        matches: matchesPackage,
        filterGroups: PACKAGE_FILTERS,
        paramGroups: groups.packages,
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
      count={search.tables.packages.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <PackagesSection
        id={id}
        ctx={ctx}
        table={search.tables.packages}
        reading={catalog.reads.packages}
        params={catalog.params}
        setParam={catalog.setParam}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

PackagesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default PackagesPage;
