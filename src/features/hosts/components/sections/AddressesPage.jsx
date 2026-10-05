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
import { ADDRESS_FILTERS, addressKey, addressRows, matchesAddress } from '../../utils/networking';
import {
  MANAGED_ADDRESS_FILTERS,
  managedAddressKey,
  matchesManagedAddress,
  uniqueRows,
} from '../../utils/networkingManagement';
import IpAddressManagement from '../IpAddressManagement';
import { MANAGED_ADDRESS_COLUMNS } from '../IpAddressTableManagement';
import { ADDRESS_COLUMNS } from '../NetworkingColumns';
import NetworkingTable from '../NetworkingTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const NO_ROWS = [];

const FOLD_TITLES = {
  addresses: ['host.ipAddressTable.expand', 'host.ipAddressTable.collapse'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key] || ['', ''];
  return {
    folded,
    onFold: () => folds.toggle(key),
    title: expand ? t(folded ? expand : collapse) : '',
  };
};

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

/**
 * The IP addresses page of a host: the heading counting the addresses
 * and Refresh in its pane, and under it the IP addresses table, a
 * folding glass section over the one table narrowed by the page's
 * search, and the IP address management behind the tokens its read
 * names, every write through the one `useNetworkingTools` and the task
 * dialog it opens drawn once; the folds kept under
 * `table_prefs_addresses`. Refresh reads every held answer of the host
 * and every drawn series again.
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
  const addressList = useMemo(() => addressRows(addresses.data), [addresses.data]);
  const managedList = useMemo(
    () => uniqueRows(listOf(managed.data, 'addresses'), managedAddressKey),
    [managed.data]
  );
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      addresses: tableOf({
        key: 'addresses',
        labelKey: 'host.ipAddressTable.title',
        rows: addressList,
        columns: ADDRESS_COLUMNS,
        matches: matchesAddress,
        filterGroups: ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: addresses.offered,
      }),
      managedAddresses: tableOf({
        key: 'managedAddresses',
        labelKey: 'host.ipAddressManagement.title',
        rows: managedList,
        columns: MANAGED_ADDRESS_COLUMNS,
        matches: matchesManagedAddress,
        filterGroups: MANAGED_ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: managed.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.networking.search',
  });

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={addresses.offered && addresses.loaded ? addressList.length : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
      {addresses.offered ? (
        <NetworkingTable
          panel="networking-addresses"
          title={t('host.ipAddressTable.title')}
          columns={ADDRESS_COLUMNS}
          table={search.tables.addresses}
          rowKey={addressKey}
          ctx={ctx}
          emptyKey="host.ipAddressTable.noData"
          reading={addresses}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'addresses', t })}
        />
      ) : null}
      {managed.offered ? (
        <IpAddressManagement
          id={id}
          server={server}
          role={context.user?.role}
          rows={managedList}
          reading={managed}
          table={search.tables.managedAddresses}
          ctx={ctx}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'manage-addresses', t })}
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
