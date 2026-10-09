import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { handoffOf, withoutCreateSeed } from '../../utils/machineCreate';
import { matchesTemplate } from '../../utils/manageCatalog';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TemplatesSection, { TEMPLATE_COLUMNS, TEMPLATE_FILTERS } from '../TemplatesSection';

/**
 * What the route's hand-off asks of the Templates page: `box`, the four
 * box members of a `template` hand-off, or `registryUrl`, the registry of
 * a `source` hand-off; null while the route carries neither.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {{ box: Object|null, registryUrl: string }|null} The hand-off
 */
const templatesHandoffOf = params => {
  const handoff = handoffOf(params);
  if (handoff?.word === 'template') {
    return { box: handoff.seed, registryUrl: '' };
  }
  if (handoff?.word === 'source' && handoff.seed.box_url) {
    return { box: null, registryUrl: handoff.seed.box_url };
  }
  return null;
};

/**
 * The Templates page of a host: the heading counting the templates the
 * search leaves, Refresh in its pane, and `TemplatesSection` under it,
 * the templates and their registries read once for this page; the
 * route's `create=template` hand-off opens the pull dialog filled with
 * the handed box and `create=source` with a `box_url` the Add registry
 * dialog filled, each dropping the hand-off from the route as it closes.
 */
const TemplatesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const handoff = templatesHandoffOf(searchParams);
  const onHandoffDone = useCallback(
    () => setSearchParams(current => withoutCreateSeed(current), { replace: true }),
    [setSearchParams]
  );
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
        handoff={handoff}
        onHandoffDone={onHandoffDone}
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
