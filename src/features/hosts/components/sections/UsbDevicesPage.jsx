import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { hasAny } from '../../../../components/common/SubTable';
import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { fetchUsbDevices } from '../../api/host';
import { useManageRead } from '../../hooks/useHostManage';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import ManageTable from '../ManageTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const STATE_TONES = {
  Available: 'success',
  Busy: 'warning',
  Held: 'info',
  Captured: 'primary',
};

const lower = value => String(value ?? '').toLowerCase();

const idsOf = row => `${row.vendor_id || ''}:${row.product_id || ''}`;

/**
 * The columns of the USB devices table: the product with its
 * manufacturer, the vendor and product ids, the serial number while a
 * row carries one, the address and the state VirtualBox reports.
 */
export const USB_COLUMNS = [
  {
    key: 'product',
    kind: 'name',
    labelKey: 'hosts.devices.usb.product',
    value: row => row.product || row.uuid || '',
    render: row => (
      <span>
        <strong>{row.product || row.uuid}</strong>
        {row.manufacturer ? (
          <span className="text-muted small ms-2">{row.manufacturer}</span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'ids',
    kind: 'text',
    labelKey: 'hosts.devices.usb.ids',
    priority: 3,
    value: idsOf,
    render: row => <code className="small">{idsOf(row)}</code>,
  },
  {
    key: 'serial',
    kind: 'text',
    labelKey: 'hosts.devices.usb.serial',
    value: row => row.serial_number || '',
    render: row => <code className="small">{row.serial_number}</code>,
    when: hasAny(row => row.serial_number),
  },
  {
    key: 'address',
    kind: 'text',
    labelKey: 'hosts.devices.usb.address',
    priority: 4,
    value: row => row.address || '',
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'hosts.devices.usb.state',
    value: row => row.state || '',
    render: row =>
      row.state ? (
        <span className={`badge text-bg-${STATE_TONES[row.state] || 'secondary'}`}>
          {row.state}
        </span>
      ) : (
        ''
      ),
  },
];

const matchesUsb = (row, needle) =>
  [row.product, row.manufacturer, row.serial_number, row.address, idsOf(row)].some(text =>
    lower(text).includes(needle)
  );

/**
 * The Devices page of a host that names `virtualbox`: the heading
 * counting the USB devices the search leaves, Refresh in its pane, and
 * the one table over `GET system/usb`, the host's USB devices as
 * VirtualBox lists them, read once as the page draws, again when the
 * stream opens fresh or answers `reset`, and on Refresh; a machine's
 * attach, detach and capture filters are its own Settings page's.
 */
const UsbDevicesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const reading = useManageRead(
    useCallback(() => fetchUsbDevices(status, id), [status, id]),
    true
  );
  const rows = Array.isArray(reading.data?.devices) ? reading.data.devices : [];
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      usb: tableOf({
        key: 'usb',
        labelKey: 'navbar.contextTabs.devices',
        rows,
        columns: USB_COLUMNS,
        matches: matchesUsb,
        sort: 'product',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.devices.search',
  });

  return (
    <SectionPane
      section={section}
      server={server}
      count={reading.loaded ? search.tables.usb.rows.length : null}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      {reading.failed ? (
        <div className="alert alert-danger" role="alert" data-note="devices-failed">
          {reading.message}
        </div>
      ) : null}
      <div data-panel="devices-usb">
        <ManageTable
          name="usb"
          columns={USB_COLUMNS}
          table={search.tables.usb}
          rowKey={row => row.uuid || row.address}
          ctx={ctx}
          emptyKey="hosts.devices.usb.none"
          reading={reading}
          filtering={search.filtering}
        />
      </div>
    </SectionPane>
  );
};

UsbDevicesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default UsbDevicesPage;
