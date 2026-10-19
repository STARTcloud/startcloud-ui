import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSelection } from '../../../../hooks/useSelection';
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
import ProcessManagement, { BatchKillButton, PickedProcesses } from '../ProcessManagement';
import { PROCESS_COLUMNS } from '../ProcessTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const namesOf = rows => [...new Set(rows.map(row => row.username).filter(Boolean))].sort();

const pidOf = row => String(row.pid);

const NO_PIDS = [];

/**
 * The Processes page of a host: the heading counting the processes the
 * search leaves, and in its pane, while rows are picked, "N selected",
 * Clear selection and Kill selected, the batch kill dialog over the picked
 * processes, then Batch kill, the dialog over a command pattern, and
 * Refresh; `ProcessManagement` under it with the select column, the
 * processes read once for this page, the zone, user and detail filters in
 * the navbar's panel, the zones the host's machines. A kill of the picked
 * processes clears the pick.
 */
const ProcessesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: ['processes'] });
  const { machines } = useHostMachines(id, hostHasFeature(server, 'machines'));
  const [batch, setBatch] = useState(null);
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
  const { rows } = search.tables.processes;
  const selection = useSelection(rows, { keyOf: pidOf, labelOf: pidOf });

  const killPicked = () =>
    setBatch({ pids: rows.filter(row => selection.selected.has(pidOf(row))).map(row => row.pid) });

  const closeBatch = done => {
    if (done && batch?.pids.length > 0) {
      selection.clear();
    }
    setBatch(null);
  };

  const actions = (
    <>
      <PickedProcesses selection={selection} onKill={killPicked} />
      <BatchKillButton onClick={() => setBatch({ pids: NO_PIDS })} />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane section={section} server={server} count={rows.length} actions={actions}>
      <ProcessManagement
        id={id}
        server={server}
        ctx={ctx}
        table={search.tables.processes}
        reading={data.reads.processes}
        filtering={search.filtering}
        zones={zones}
        selection={selection.subtable}
        batch={batch}
        onBatch={closeBatch}
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
