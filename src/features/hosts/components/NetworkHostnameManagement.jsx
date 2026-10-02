import PropTypes from 'prop-types';

import { useStatus } from '../../../contexts/StatusContext';
import { useNetworkingTools } from '../hooks/useNetworkingTools';

import AggregateManagement from './AggregateManagement';
import BridgeManagement from './BridgeManagement';
import DnsSettings from './DnsSettings';
import EtherstubManagement from './EtherstubManagement';
import HostnameSettings from './HostnameSettings';
import HostsFileEditor from './HostsFileEditor';
import IpAddressManagement from './IpAddressManagement';
import NetworkSpacesPanel from './NetworkSpaces/NetworkSpacesPanel';
import TaskDialog from './TaskDialog';
import VlanManagement from './VlanManagement';
import VnicManagement from './VnicManagement';

const foldOf = (folds, key) => ({
  folded: folds.folded(key),
  onFold: () => folds.toggle(key),
  title: '',
});

/**
 * The management of the networking page, hyperweaver-ui's
 * `NetworkHostnameManagement` and `NetworkSpacesPanel` as folding
 * sections under the read surfaces, in hyperweaver-ui's order: the
 * hostname, the hosts file, the DNS, the VNICs, the VLANs, the
 * addresses, the aggregates, the bridges, the etherstubs, and the
 * network spaces last. Each section draws only while the host's own row
 * offers its read, hyperweaver-ui's any-of gate carried by `READS`, the
 * hostname behind `hostname` or `vnics`, the hosts file behind
 * `hosts-file`, the DNS behind `dns` or `vnics`, the link families
 * behind `vnics`, the addresses behind `ip-addresses` or `vnics` and the
 * spaces behind `network-spaces`. The one `useNetworkingTools` serves
 * every section, and the task dialog it opens on a queued write draws
 * here once.
 */
const NetworkHostnameManagement = ({
  id,
  server,
  role,
  management,
  tables,
  ctx,
  filtering,
  folds,
}) => {
  const status = useStatus();
  const tools = useNetworkingTools();
  const { readings, rows } = management;
  const section = (key, Component, props) =>
    readings[key].offered ? (
      <Component
        id={id}
        reading={readings[key]}
        ctx={ctx}
        filtering={filtering}
        fold={foldOf(folds, `manage-${key}`)}
        tools={tools}
        {...props}
      />
    ) : null;

  return (
    <>
      {section('hostname', HostnameSettings, {})}
      {section('hosts', HostsFileEditor, {})}
      {section('dns', DnsSettings, {})}
      {section('vnics', VnicManagement, { rows: rows.vnics, table: tables.vnics })}
      {section('vlans', VlanManagement, { rows: rows.vlans, table: tables.vlans })}
      {section('addresses', IpAddressManagement, {
        server,
        rows: rows.addresses,
        table: tables.managedAddresses,
      })}
      {section('aggregates', AggregateManagement, {
        rows: rows.aggregates,
        table: tables.aggregates,
      })}
      {section('bridges', BridgeManagement, { rows: rows.bridges, table: tables.bridges })}
      {section('etherstubs', EtherstubManagement, {
        rows: rows.etherstubs,
        table: tables.etherstubs,
      })}
      {section('spaces', NetworkSpacesPanel, {
        server,
        role,
        rows: rows.spaces,
        table: tables.spaces,
      })}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </>
  );
};

NetworkHostnameManagement.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  role: PropTypes.string,
  management: PropTypes.shape({
    readings: PropTypes.object.isRequired,
    rows: PropTypes.object.isRequired,
  }).isRequired,
  tables: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  filtering: PropTypes.bool.isRequired,
  folds: PropTypes.shape({
    folded: PropTypes.func.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
};

export default NetworkHostnameManagement;
