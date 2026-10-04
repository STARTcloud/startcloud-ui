import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { useHostMachines } from '../../hooks/useHostMachines';
import { useHostManageData } from '../../hooks/useHostManageData';
import {
  manageParamGroups,
  tableOf,
  useHostManageSearch,
  zonesOf,
} from '../../hooks/useHostManageSearch';
import { hostHasFeature, hostHasHypervisor } from '../../utils/capabilities';
import { matchesProcess } from '../../utils/manage';
import ProcessManagement, { BatchKillButton } from '../ProcessManagement';
import { PROCESS_COLUMNS } from '../ProcessTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const namesOf = rows => [...new Set(rows.map(row => row.username).filter(Boolean))].sort();

/**
 * The Processes page of a host: the heading counting the processes the
 * search leaves, Batch kill then Refresh in its pane, and
 * `ProcessManagement` under it, the processes read once for this page,
 * the zone, user and detail filters in the navbar's panel, the zones
 * the host's machines.
 */
const ProcessesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: ['processes'] });
  const { machines } = useHostMachines(id, hostHasFeature(server, 'machines'));
  const [batch, setBatch] = useState(false);
  const zones = useMemo(() => zonesOf(machines), [machines]);
  const users = useMemo(() => namesOf(data.rows.processes), [data.rows.processes]);
  const groups = manageParamGroups({
    params: data.params,
    setParam: data.setParam,
    resetParams: data.resetParams,
    zones,
    users,
    bhyve: hostHasHypervisor(server, 'bhyve'),
    t,
  });
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    id,
    server,
    zones,
    detailed: data.params.processes.detailed,
  };
  const search = useHostManageSearch({
    section,
    tables: {
      processes: tableOf({
        key: 'processes',
        labelKey: 'pages.hostManage.tabProcesses',
        rows: data.rows.processes,
        columns: PROCESS_COLUMNS,
        matches: matchesProcess,
        paramGroups: groups.processes,
        sort: 'pid',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  const actions = (
    <>
      <BatchKillButton onClick={() => setBatch(true)} />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.processes.rows.length}
      actions={actions}
    >
      <ProcessManagement
        id={id}
        server={server}
        ctx={ctx}
        table={search.tables.processes}
        reading={data.reads.processes}
        filtering={search.filtering}
        zones={zones}
        batch={batch}
        onBatch={() => setBatch(false)}
      />
    </SectionPane>
  );
};

ProcessesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ProcessesPage;
