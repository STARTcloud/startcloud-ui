import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import {
  AGGREGATE_FILTERS,
  VLAN_FILTERS,
  VNIC_FILTERS,
  matchesAggregate,
  matchesBridge,
  matchesNamed,
  matchesVlan,
  matchesVnic,
  uniqueRows,
} from '../../utils/networkingManagement';
import AggregateManagement from '../AggregateManagement';
import { AGGREGATE_COLUMNS } from '../AggregateTable';
import BridgeManagement from '../BridgeManagement';
import { BRIDGE_COLUMNS } from '../BridgeTable';
import EtherstubManagement from '../EtherstubManagement';
import { ETHERSTUB_COLUMNS } from '../EtherstubTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';
import VlanManagement from '../VlanManagement';
import { VLAN_COLUMNS } from '../VlanTable';
import VnicManagement from '../VnicManagement';
import { VNIC_COLUMNS } from '../VnicTable';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const LINK_SORT = [{ column: 'link', direction: 'asc' }];

const NO_ROWS = [];

const linkKey = row => row.link;

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

const foldOf = (folds, key) => ({
  folded: folds.folded(key),
  onFold: () => folds.toggle(key),
  title: '',
});

/**
 * The Links page of a host: the heading counting the VNICs, Refresh in
 * its pane, and under it the VNICs, the VLANs, the aggregates with the
 * CDP service, the bridges and the etherstubs, each a folding glass
 * section over one table narrowed by the page's search, the VNICs and
 * VLANs deduplicated by link, every write through `useNetworkingTools`
 * and its task dialog drawn once; the folds kept under
 * `table_prefs_links`.
 */
const LinksPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const vnics = useHostReading(id, 'vnics');
  const vlans = useHostReading(id, 'vlans');
  const etherstubs = useHostReading(id, 'etherstubs');
  const bridges = useHostReading(id, 'bridges');
  const aggregates = useHostReading(id, 'aggregates');
  const tools = useNetworkingTools();
  const rows = useMemo(
    () => ({
      vnics: uniqueRows(listOf(vnics.data, 'vnics'), linkKey),
      vlans: uniqueRows(listOf(vlans.data, 'vlans'), linkKey),
      etherstubs: listOf(etherstubs.data, 'etherstubs'),
      bridges: listOf(bridges.data, 'bridges'),
      aggregates: listOf(aggregates.data, 'aggregates'),
    }),
    [vnics.data, vlans.data, etherstubs.data, bridges.data, aggregates.data]
  );
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      vnics: tableOf({
        key: 'vnics',
        labelKey: 'host.vnicManagement.vnicManagement',
        rows: rows.vnics,
        columns: VNIC_COLUMNS,
        matches: matchesVnic,
        filterGroups: VNIC_FILTERS,
        defaultSort: LINK_SORT,
        offered: vnics.offered,
      }),
      vlans: tableOf({
        key: 'vlans',
        labelKey: 'host.vlanManagement.title',
        rows: rows.vlans,
        columns: VLAN_COLUMNS,
        matches: matchesVlan,
        filterGroups: VLAN_FILTERS,
        defaultSort: LINK_SORT,
        offered: vlans.offered,
      }),
      aggregates: tableOf({
        key: 'aggregates',
        labelKey: 'host.aggregateManagement.title',
        rows: rows.aggregates,
        columns: AGGREGATE_COLUMNS,
        matches: matchesAggregate,
        filterGroups: AGGREGATE_FILTERS,
        defaultSort: NAME_SORT,
        offered: aggregates.offered,
      }),
      bridges: tableOf({
        key: 'bridges',
        labelKey: 'host.bridgeManagement.title',
        rows: rows.bridges,
        columns: BRIDGE_COLUMNS,
        matches: matchesBridge,
        defaultSort: NAME_SORT,
        offered: bridges.offered,
      }),
      etherstubs: tableOf({
        key: 'etherstubs',
        labelKey: 'host.etherstubManagement.title',
        rows: rows.etherstubs,
        columns: ETHERSTUB_COLUMNS,
        matches: matchesNamed,
        defaultSort: NAME_SORT,
        offered: etherstubs.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.networking.search',
  });
  const role = context.user?.role;
  const shared = { id, role, ctx, filtering: search.filtering, tools };

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={vnics.loaded ? rows.vnics.length : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      {vnics.offered ? (
        <VnicManagement
          {...shared}
          rows={rows.vnics}
          reading={vnics}
          table={search.tables.vnics}
          fold={foldOf(folds, 'manage-vnics')}
        />
      ) : null}
      {vlans.offered ? (
        <VlanManagement
          {...shared}
          rows={rows.vlans}
          reading={vlans}
          table={search.tables.vlans}
          fold={foldOf(folds, 'manage-vlans')}
        />
      ) : null}
      {aggregates.offered ? (
        <AggregateManagement
          {...shared}
          rows={rows.aggregates}
          reading={aggregates}
          table={search.tables.aggregates}
          fold={foldOf(folds, 'manage-aggregates')}
        />
      ) : null}
      {bridges.offered ? (
        <BridgeManagement
          {...shared}
          rows={rows.bridges}
          reading={bridges}
          table={search.tables.bridges}
          fold={foldOf(folds, 'manage-bridges')}
        />
      ) : null}
      {etherstubs.offered ? (
        <EtherstubManagement
          {...shared}
          rows={rows.etherstubs}
          reading={etherstubs}
          table={search.tables.etherstubs}
          fold={foldOf(folds, 'manage-etherstubs')}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

LinksPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default LinksPage;
