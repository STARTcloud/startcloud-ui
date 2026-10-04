import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { catalogParamGroups, useManageCatalogData } from '../../hooks/useManageCatalogData';
import { matchesRecipe } from '../../utils/manageCatalog';
import RecipesSection, { RECIPE_COLUMNS } from '../RecipesSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Recipes page of a bhyve host: the heading counting the recipes the
 * search leaves, Refresh in its pane, and `RecipesSection` under it, the
 * recipes read once for this page, the family and brand filters in the
 * navbar's panel.
 */
const RecipesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const catalog = useManageCatalogData({ id, server, only: ['recipes'] });
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
      recipes: tableOf({
        key: 'recipes',
        labelKey: 'pages.hostManage.tabRecipes',
        rows: catalog.rows.recipes,
        columns: RECIPE_COLUMNS,
        matches: matchesRecipe,
        paramGroups: groups.recipes,
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
      count={search.tables.recipes.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <RecipesSection
        id={id}
        ctx={ctx}
        table={search.tables.recipes}
        reading={catalog.reads.recipes}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

RecipesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default RecipesPage;
