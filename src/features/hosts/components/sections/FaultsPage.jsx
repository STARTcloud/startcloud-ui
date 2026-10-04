import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { sectionParamGroups, useManageSectionsData } from '../../hooks/useManageSectionsData';
import {
  FAULT_FILTERS,
  MODULE_FILTERS,
  matchesFault,
  matchesFaultModule,
} from '../../utils/FaultUtils';
import { MODULE_COLUMNS } from '../FaultManagerConfig';
import FaultsSection from '../FaultsSection';
import { FAULT_COLUMNS } from '../FaultTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Fault management page of a host: the heading counting the faults
 * the search leaves, Refresh in its pane, and `FaultsSection` under it,
 * the faults and the fault manager's modules read once for this page,
 * the resolved and limit filters in the navbar's panel.
 */
const FaultsPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const sections = useManageSectionsData({ id, server, only: ['faults'] });
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
      faults: tableOf({
        key: 'faults',
        labelKey: 'host.faultManagement.tabCurrentFaults',
        rows: sections.rows.faults,
        columns: FAULT_COLUMNS,
        matches: matchesFault,
        filterGroups: FAULT_FILTERS,
        paramGroups: groups.faults,
        sort: 'time',
        offered: true,
      }),
      faultModules: tableOf({
        key: 'fault-modules',
        labelKey: 'host.faultManagerConfig.faultManagementModules',
        rows: sections.rows.faultModules,
        columns: MODULE_COLUMNS,
        matches: matchesFaultModule,
        filterGroups: MODULE_FILTERS,
        sort: 'module',
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
      count={search.tables.faults.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <FaultsSection
        id={id}
        ctx={ctx}
        tables={{ faults: search.tables.faults, faultModules: search.tables['fault-modules'] }}
        readings={{ faults: sections.reads.faults, faultModules: sections.reads.faultModules }}
        rows={{ faultModules: sections.rows.faultModules }}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

FaultsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default FaultsPage;
