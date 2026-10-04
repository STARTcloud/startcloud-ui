import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { sectionParamGroups, useManageSectionsData } from '../../hooks/useManageSectionsData';
import { BOOT_ENVIRONMENT_FILTERS, matchesBootEnvironment } from '../../utils/bootEnvironments';
import BootEnvironmentsSection, { CreateBootEnvironmentButton } from '../BootEnvironmentsSection';
import { BOOT_ENVIRONMENT_COLUMNS } from '../BootEnvironmentTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Boot environments page of a host: the heading counting the
 * environments the search leaves, Create then Refresh in its pane, and
 * `BootEnvironmentsSection` under it, the environments read once for
 * this page, the detail and snapshots switches in the navbar's panel.
 */
const BootEnvironmentsPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const sections = useManageSectionsData({ id, server, only: ['bootEnvironments'] });
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
      bootEnvironments: tableOf({
        key: 'boot-environments',
        labelKey: 'pages.hostManage.tabBootEnvironments',
        rows: sections.rows.bootEnvironments,
        columns: BOOT_ENVIRONMENT_COLUMNS,
        matches: matchesBootEnvironment,
        filterGroups: BOOT_ENVIRONMENT_FILTERS,
        paramGroups: groups.bootEnvironments,
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });
  const table = search.tables['boot-environments'];
  const actions = (
    <>
      <CreateBootEnvironmentButton onClick={() => setCreating(true)} />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane section={section} server={server} count={table.rows.length} actions={actions}>
      <BootEnvironmentsSection
        id={id}
        ctx={ctx}
        table={table}
        reading={sections.reads.bootEnvironments}
        filtering={search.filtering}
        creating={creating}
        onCreating={() => setCreating(false)}
      />
    </SectionPane>
  );
};

BootEnvironmentsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default BootEnvironmentsPage;
