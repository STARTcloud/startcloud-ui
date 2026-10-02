import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilter, FaPlug, FaPlugCircleXmark, FaPlus, FaRotate, FaTrash } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import {
  addUsbFilter,
  attachUsbDevice,
  deleteUsbFilter,
  detachUsbDevice,
  fetchHostUsbDevices,
  fetchUsbFilters,
} from '../api/machines';

const FILTER_FIELDS = [
  ['name', 'machine.usbPanel.filterFieldName'],
  ['vendor_id', 'machine.usbPanel.filterFieldVendorId'],
  ['product_id', 'machine.usbPanel.filterFieldProductId'],
  ['manufacturer', 'machine.usbPanel.filterFieldManufacturer'],
  ['product', 'machine.usbPanel.filterFieldProduct'],
  ['serial_number', 'machine.usbPanel.filterFieldSerial'],
];

/**
 * The one word a host USB device goes by, its uuid, address or id.
 *
 * @param {Object} device - The device
 * @returns {string} The id
 */
export const deviceId = device =>
  device.uuid ?? device.address ?? device.id ?? device.device ?? String(device);

/**
 * The line a host USB device reads as, its product, maker, ids and serial.
 *
 * @param {Object} device - The device
 * @returns {string} The label
 */
export const deviceLabel = device =>
  [
    device.product || device.name || device.description,
    device.manufacturer,
    device.vendor_id && device.product_id && `${device.vendor_id}:${device.product_id}`,
    device.serial_number && `SN ${device.serial_number}`,
  ]
    .filter(Boolean)
    .join(' · ') || deviceId(device);

const emptyFilter = () => ({
  name: '',
  vendor_id: '',
  product_id: '',
  manufacturer: '',
  product: '',
  serial_number: '',
});

const filterKey = filter => FILTER_FIELDS.map(([key]) => `${filter[key] ?? ''}`).join('|');

const listOf = (answer, member) => {
  if (Array.isArray(answer?.[member])) {
    return answer[member];
  }
  return Array.isArray(answer) ? answer : [];
};

const DeviceRow = ({ device, running, disabled, onLive, onPrefill }) => {
  const { t } = useTranslation();
  return (
    <div
      className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
      data-usb-device={deviceId(device)}
    >
      <span className="small">{deviceLabel(device)}</span>
      <span className="d-flex gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          data-action="attach"
          onClick={() => onLive('attach', device)}
          disabled={disabled || !running}
          title={t('machine.usbPanel.attachTooltip')}
        >
          <FaPlug aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          data-action="detach"
          onClick={() => onLive('detach', device)}
          disabled={disabled || !running}
          title={t('machine.usbPanel.detachTooltip')}
        >
          <FaPlugCircleXmark aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="prefill"
          onClick={() => onPrefill(device)}
          disabled={disabled}
          title={t('machine.usbPanel.prefillTooltip')}
        >
          <FaFilter aria-hidden="true" />
        </button>
      </span>
    </div>
  );
};

DeviceRow.propTypes = {
  device: PropTypes.object.isRequired,
  running: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onLive: PropTypes.func.isRequired,
  onPrefill: PropTypes.func.isRequired,
};

const FilterRow = ({ filter, position, disabled, onDelete }) => {
  const { t } = useTranslation();
  const index = filter.index ?? position;
  return (
    <div
      className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
      data-usb-filter={index}
    >
      <span className="small">
        {FILTER_FIELDS.filter(([key]) => filter[key]).map(([key, labelKey]) => (
          <span className="me-2" key={key}>
            {t(labelKey)}: <code>{String(filter[key])}</code>
          </span>
        ))}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        data-action="delete-filter"
        aria-label={t('machine.usbPanel.deleteFilterAriaLabel')}
        onClick={() => onDelete(index)}
        disabled={disabled}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </div>
  );
};

FilterRow.propTypes = {
  filter: PropTypes.object.isRequired,
  position: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The USB tab of a VirtualBox machine, hyperweaver-ui's USB panel: the
 * host's devices of `GET system/usb`, each attached to or detached from
 * the running machine at once, and the machine's persistent capture
 * filters of `GET machines/{name}/usb/filters`, added from the form or
 * prefilled from a device and removed by index; every write one request
 * and one notice, the lists read once on open, again after a filter
 * changes and on Refresh.
 */
const UsbPanel = ({ status, hostId, name, running, disabled = false }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [lists, setLists] = useState(null);
  const [filterForm, setFilterForm] = useState(emptyFilter);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      Promise.allSettled([
        fetchHostUsbDevices(status, hostId),
        fetchUsbFilters(status, hostId, name),
      ]).then(([deviceAnswer, filterAnswer]) => {
        setLists({
          devices: deviceAnswer.status === 'fulfilled' ? listOf(deviceAnswer.value, 'devices') : [],
          filters: filterAnswer.status === 'fulfilled' ? listOf(filterAnswer.value, 'filters') : [],
        });
        if (deviceAnswer.status === 'rejected') {
          notify(
            'danger',
            t('machine.usbPanel.listFailed', { message: deviceAnswer.reason.message })
          );
        }
      }),
    [status, hostId, name, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reload = () => {
    setLists(null);
    load();
  };

  const handleLive = async (kind, device) => {
    setBusy(true);
    const call = kind === 'attach' ? attachUsbDevice : detachUsbDevice;
    try {
      const answer = await call(status, hostId, name, deviceId(device));
      notify('success', answer?.message || t('machine.usbPanel.actionDone', { action: kind }));
    } catch (error) {
      notify(
        'danger',
        t('machine.usbPanel.actionFailed', { action: kind, message: error.message })
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddFilter = async () => {
    const body = Object.fromEntries(
      Object.entries(filterForm)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== '')
    );
    setBusy(true);
    try {
      const answer = await addUsbFilter(status, hostId, name, body);
      setFilterForm(emptyFilter());
      notify('success', answer?.message || t('machine.usbPanel.filterAdded'));
      reload();
    } catch (error) {
      notify('danger', t('machine.usbPanel.addFilterFailed', { message: error.message }));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFilter = async index => {
    setBusy(true);
    try {
      const answer = await deleteUsbFilter(status, hostId, name, index);
      notify('success', answer?.message || t('machine.usbPanel.filterRemoved'));
      reload();
    } catch (error) {
      notify('danger', t('machine.usbPanel.deleteFilterFailed', { message: error.message }));
    } finally {
      setBusy(false);
    }
  };

  const prefillFromDevice = device =>
    setFilterForm({
      name: device.product || device.name || '',
      vendor_id: device.vendor_id || '',
      product_id: device.product_id || '',
      manufacturer: device.manufacturer || '',
      product: device.product || '',
      serial_number: device.serial_number || '',
    });

  const held = disabled || busy || lists === null;
  const devices = lists?.devices || [];
  const filters = lists?.filters || [];

  return (
    <div data-panel="usb">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold mb-0">{t('machine.usbPanel.hostDevicesHeading')}</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="refresh-usb"
          onClick={reload}
          disabled={held}
        >
          <FaRotate className="me-2" aria-hidden="true" />
          {t('machine.usbPanel.refreshButton')}
        </button>
      </div>
      {!running ? (
        <p className="form-text text-warning mt-0">
          {t('machine.usbPanel.liveAttachWarning', { machineName: name })}
        </p>
      ) : null}
      {lists !== null && devices.length === 0 ? (
        <p className="text-muted small">{t('machine.usbPanel.noDevices')}</p>
      ) : null}
      <div className="d-flex flex-column gap-1 mb-3" data-list="usb-devices">
        {devices.map(device => (
          <DeviceRow
            key={deviceId(device)}
            device={device}
            running={running}
            disabled={held}
            onLive={handleLive}
            onPrefill={prefillFromDevice}
          />
        ))}
      </div>
      <h6 className="fw-bold">{t('machine.usbPanel.captureFiltersHeading')}</h6>
      <p className="form-text text-muted mt-0">{t('machine.usbPanel.captureFiltersNote')}</p>
      {lists !== null && filters.length === 0 ? (
        <p className="text-muted small">{t('machine.usbPanel.noFilters')}</p>
      ) : null}
      <div className="d-flex flex-column gap-1 mb-2" data-list="usb-filters">
        {filters.map((filter, position) => (
          <FilterRow
            key={filterKey(filter) || String(filter.index ?? position)}
            filter={filter}
            position={position}
            disabled={held}
            onDelete={handleDeleteFilter}
          />
        ))}
      </div>
      <div className="row g-2 align-items-end">
        {FILTER_FIELDS.map(([key, labelKey]) => (
          <div className="col-6 col-md-2" key={key}>
            <label className="form-label small mb-1" htmlFor={`usb-filter-${key}`}>
              {t(labelKey)}
            </label>
            <input
              id={`usb-filter-${key}`}
              className="form-control form-control-sm"
              type="text"
              value={filterForm[key]}
              onChange={event => setFilterForm(prev => ({ ...prev, [key]: event.target.value }))}
              disabled={held}
            />
          </div>
        ))}
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-action="add-filter"
            onClick={handleAddFilter}
            disabled={held}
          >
            <FaPlus className="me-2" aria-hidden="true" />
            {t('machine.usbPanel.addFilterButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

UsbPanel.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
};

export default UsbPanel;
