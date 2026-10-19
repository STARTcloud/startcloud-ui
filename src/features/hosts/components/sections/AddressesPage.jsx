import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import {
  ADDRESS_FILTERS,
  addressRows,
  joinedAddressRows,
  matchesAddress,
} from '../../utils/networking';
import IpAddressManagement from '../IpAddressManagement';
import { ADDRESS_COLUMNS } from '../NetworkingColumns';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const NO_ROWS = [];

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

const readingOf = reads => {
  const offered = reads.filter(read => read.offered);
  return {
    offered: offered.length > 0,
    loaded: offered.length > 0 && offered.every(read => read.loaded || read.failed),
    failed: offered.length > 0 && offered.every(read => read.failed),
  };
};

/**
 * The IP addresses page of a host: the heading counting the addresses
 * and Refresh in its pane, and under it the one addresses table, a
 * folding glass section over the rows of the monitoring read,
 * `ip-addresses`, and of the managed read, `network-addresses`, each
 * address once, narrowed by the page's search, the management of the
 * managed rows on it and every write through the one
 * `useNetworkingTools` and the task dialog it opens drawn once; the
 * fold kept under `table_prefs_addresses`. Refresh reads every held
 * answer of the host and every drawn series again.
 */
const AddressesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const addresses = useHostReading(id, 'ip-addresses');
  const managed = useHostReading(id, 'network-addresses');
  const tools = useNetworkingTools();
  const managedList = useMemo(() => listOf(managed.data, 'addresses'), [managed.data]);
  const rows = useMemo(
    () => joinedAddressRows({ addresses: addressRows(addresses.data), managed: managedList }),
    [addresses.data, managedList]
  );
  const reading = readingOf([addresses, managed]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      addresses: tableOf({
        key: 'addresses',
        labelKey: 'host.ipAddressTable.title',
        rows,
        columns: ADDRESS_COLUMNS,
        matches: matchesAddress,
        filterGroups: ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: reading.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.networking.search',
  });
  const folded = folds.folded('addresses');

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={reading.loaded ? rows.length : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      {reading.offered ? (
        <IpAddressManagement
          id={id}
          server={server}
          role={context.user?.role}
          managedRows={managedList}
          managedOffered={managed.offered}
          reading={reading}
          table={search.tables.addresses}
          ctx={ctx}
          filtering={search.filtering}
          fold={{
            folded,
            onFold: () => folds.toggle('addresses'),
            title: t(folded ? 'host.ipAddressTable.expand' : 'host.ipAddressTable.collapse'),
          }}
          tools={tools}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

AddressesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default AddressesPage;
