import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { sectionParamGroups, useManageSectionsData } from '../../hooks/useManageSectionsData';
import { REPOSITORY_FILTERS, matchesRepository } from '../../utils/repositories';
import RefreshButton from '../RefreshButton';
import RepositoriesSection, { AddRepositoryButton } from '../RepositoriesSection';
import { REPOSITORY_COLUMNS } from '../RepositoryTable';
import SectionPane from '../SectionPane';

/**
 * The Repositories page of a host: the heading counting the publishers
 * the search leaves, Add repository then Refresh in its pane, and
 * `RepositoriesSection` under it, the repositories read once for this
 * page, the enabled-only switch in the navbar's panel.
 */
const RepositoriesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const sections = useManageSectionsData({ id, server, only: ['repositories'] });
  const [creating, setCreating] = useState(false);
  const groups = sectionParamGroups({
    params: sections.params,
    setParam: sections.setParam,
    resetParams: sections.resetParams,
    t,
  });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      repositories: tableOf({
        key: 'repositories',
        labelKey: 'host.packageManagement.repositories',
        rows: sections.rows.repositories,
        columns: REPOSITORY_COLUMNS,
        matches: matchesRepository,
        filterGroups: REPOSITORY_FILTERS,
        paramGroups: groups.repositories,
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  const actions = (
    <>
      <AddRepositoryButton onClick={() => setCreating(true)} />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.repositories.rows.length}
      actions={actions}
    >
      <RepositoriesSection
        id={id}
        ctx={ctx}
        table={search.tables.repositories}
        reading={sections.reads.repositories}
        filtering={search.filtering}
        creating={creating}
        onCreating={() => setCreating(false)}
      />
    </SectionPane>
  );
};

RepositoriesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default RepositoriesPage;
