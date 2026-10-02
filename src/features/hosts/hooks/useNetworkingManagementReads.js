import { useMemo } from 'react';

import {
  AGGREGATE_FILTERS,
  MANAGED_ADDRESS_FILTERS,
  SPACE_FILTERS,
  VLAN_FILTERS,
  VNIC_FILTERS,
  managedAddressKey,
  matchesAggregate,
  matchesBridge,
  matchesManagedAddress,
  matchesNamed,
  matchesSpace,
  matchesVlan,
  matchesVnic,
  spaceFamiliesOf,
  uniqueRows,
} from '../utils/networkingManagement';

import { useHostReading } from './useHostReadings';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const LINK_SORT = [{ column: 'link', direction: 'asc' }];

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const NO_ROWS = [];

const NO_FILTERS = [];

const linkKey = row => row.link;

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

const tableOf = ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups,
  defaultSort,
  reading,
}) => ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups,
  defaultSort,
  offered: reading.offered,
});

/**
 * The reads of the networking page's management, each the copy the
 * hosts feature's context holds of the host, and the rows each answers
 * as its table draws them, hyperweaver-ui's dedupes kept: the addresses
 * each once by their address object and address, the VNICs and the
 * VLANs each once by their link. `tables` is what the page hands its one
 * search binding for them, one spec a table, keyed as the page's
 * preferences are; `columns` is handed in by the page, the sets the
 * table files export.
 *
 * The spaces are the families the host's platform draws
 * (`spaceFamiliesOf`), hyperweaver-ui's split.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} columns - The column sets by table key
 * @param {Object|null} server - The host's own row
 * @returns {Object} The readings, the rows and the table specs
 */
export const useNetworkingManagementReads = (id, columns, server) => {
  const addresses = useHostReading(id, 'network-addresses');
  const vnics = useHostReading(id, 'vnics');
  const vlans = useHostReading(id, 'vlans');
  const etherstubs = useHostReading(id, 'etherstubs');
  const bridges = useHostReading(id, 'bridges');
  const aggregates = useHostReading(id, 'aggregates');
  const spaces = useHostReading(id, 'network-spaces');
  const hostname = useHostReading(id, 'hostname');
  const dns = useHostReading(id, 'dns');
  const hosts = useHostReading(id, 'hosts-file');

  const families = spaceFamiliesOf(server);
  const rows = useMemo(
    () => ({
      addresses: uniqueRows(listOf(addresses.data, 'addresses'), managedAddressKey),
      vnics: uniqueRows(listOf(vnics.data, 'vnics'), linkKey),
      vlans: uniqueRows(listOf(vlans.data, 'vlans'), linkKey),
      etherstubs: listOf(etherstubs.data, 'etherstubs'),
      bridges: listOf(bridges.data, 'bridges'),
      aggregates: listOf(aggregates.data, 'aggregates'),
      spaces: listOf(spaces.data, 'spaces').filter(row => families[row.type] !== false),
    }),
    [
      addresses.data,
      vnics.data,
      vlans.data,
      etherstubs.data,
      bridges.data,
      aggregates.data,
      spaces.data,
      families,
    ]
  );

  const tables = {
    managedAddresses: tableOf({
      key: 'managedAddresses',
      labelKey: 'host.ipAddressManagement.title',
      rows: rows.addresses,
      columns: columns.managedAddresses,
      matches: matchesManagedAddress,
      filterGroups: MANAGED_ADDRESS_FILTERS,
      defaultSort: INTERFACE_SORT,
      reading: addresses,
    }),
    vnics: tableOf({
      key: 'vnics',
      labelKey: 'host.vnicManagement.vnicManagement',
      rows: rows.vnics,
      columns: columns.vnics,
      matches: matchesVnic,
      filterGroups: VNIC_FILTERS,
      defaultSort: LINK_SORT,
      reading: vnics,
    }),
    vlans: tableOf({
      key: 'vlans',
      labelKey: 'host.vlanManagement.title',
      rows: rows.vlans,
      columns: columns.vlans,
      matches: matchesVlan,
      filterGroups: VLAN_FILTERS,
      defaultSort: LINK_SORT,
      reading: vlans,
    }),
    etherstubs: tableOf({
      key: 'etherstubs',
      labelKey: 'host.etherstubManagement.title',
      rows: rows.etherstubs,
      columns: columns.etherstubs,
      matches: matchesNamed,
      filterGroups: NO_FILTERS,
      defaultSort: NAME_SORT,
      reading: etherstubs,
    }),
    bridges: tableOf({
      key: 'bridges',
      labelKey: 'host.bridgeManagement.title',
      rows: rows.bridges,
      columns: columns.bridges,
      matches: matchesBridge,
      filterGroups: NO_FILTERS,
      defaultSort: NAME_SORT,
      reading: bridges,
    }),
    aggregates: tableOf({
      key: 'aggregates',
      labelKey: 'host.aggregateManagement.title',
      rows: rows.aggregates,
      columns: columns.aggregates,
      matches: matchesAggregate,
      filterGroups: AGGREGATE_FILTERS,
      defaultSort: NAME_SORT,
      reading: aggregates,
    }),
    spaces: tableOf({
      key: 'spaces',
      labelKey: 'host.networkSpaces.title',
      rows: rows.spaces,
      columns: columns.spaces,
      matches: matchesSpace,
      filterGroups: SPACE_FILTERS,
      defaultSort: NAME_SORT,
      reading: spaces,
    }),
  };

  return {
    readings: {
      addresses,
      vnics,
      vlans,
      etherstubs,
      bridges,
      aggregates,
      spaces,
      hostname,
      dns,
      hosts,
    },
    rows,
    tables,
  };
};
