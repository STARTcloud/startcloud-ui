import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCompactDisc,
  FaGear,
  FaHardDrive,
  FaPlus,
  FaRotateLeft,
  FaServer,
  FaTrash,
} from 'react-icons/fa6';

import { markButtonClass } from '../utils/machineSettings';

import {
  CdromSourceFields,
  ControllerPortFields,
  DiskSourceFields,
  RemoveRowButton,
} from './MediaRowFields';
import PickOrType from './PickOrType';

const FALLBACK_CONTROLLER_TYPES = ['ide', 'sata', 'scsi', 'sas', 'nvme', 'virtio', 'usb', 'floppy'];

const BOOT_PORT = 0;

const newKey = () => Date.now() + Math.random();

const KindIcon = ({ kind }) =>
  kind === 'cdrom' ? (
    <FaCompactDisc className="text-muted" aria-hidden="true" />
  ) : (
    <FaServer className="text-muted" aria-hidden="true" />
  );

KindIcon.propTypes = {
  kind: PropTypes.string,
};

const MarkIcon = ({ marked }) =>
  marked ? <FaRotateLeft aria-hidden="true" /> : <FaTrash aria-hidden="true" />;

MarkIcon.propTypes = {
  marked: PropTypes.bool.isRequired,
};

const MarkButton = ({ marked, title, action, onClick, disabled }) => (
  <button
    type="button"
    className={`btn btn-sm py-0 ${markButtonClass(marked)}`}
    data-action={action}
    title={title}
    onClick={onClick}
    disabled={disabled}
  >
    <MarkIcon marked={marked} />
  </button>
);

MarkButton.propTypes = {
  marked: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const EditableAttachmentRow = ({ entry, isMarked, onToggle, formDisabled }) => {
  const { t } = useTranslation();
  const bootDisk = entry.port === BOOT_PORT && entry.kind === 'disk';
  return (
    <div
      className={`device-row device-child ${isMarked ? 'device-removed' : ''}`}
      data-attachment={`${entry.controller}-${entry.port}-${entry.device}`}
    >
      <KindIcon kind={entry.kind} />
      <span className="device-meta">
        {t('machineEdit.storageDevicesEditor.portDev', { port: entry.port, device: entry.device })}
      </span>
      <span className="device-path" title={entry.path}>
        {entry.path || t('machineEdit.storageDevicesEditor.emptyDrive')}
      </span>
      {bootDisk ? (
        <span
          className="badge text-bg-light ms-auto"
          title={t('machineEdit.storageDevicesEditor.bootMediumTitle')}
        >
          {t('machineEdit.storageDevicesEditor.boot')}
        </span>
      ) : (
        <div className="device-actions">
          <MarkButton
            marked={isMarked}
            action="mark-attachment"
            title={
              isMarked
                ? t('machineEdit.storageDevicesEditor.unmark')
                : t('machineEdit.storageDevicesEditor.markForRemoval')
            }
            onClick={() => onToggle(entry)}
            disabled={formDisabled}
          />
        </div>
      )}
    </div>
  );
};

EditableAttachmentRow.propTypes = {
  entry: PropTypes.object.isRequired,
  isMarked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const PendingDiskRow = ({ row, onPatch, onDrop, host, showController, showPort, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <div className="device-row device-child device-child-form" data-pending-disk={row.key}>
      <div className="row g-2 align-items-end">
        <DiskSourceFields
          idPrefix="add-disk"
          idSuffix={`-${row.key}`}
          sourceLabel={t('machineEdit.storageDevicesEditor.newDiskSource')}
          valueCol="col-5 col-md-3"
          sizeLabel={t('machineEdit.storageDevicesEditor.sizeHint')}
          existingLabel={t('machineEdit.storageDevicesEditor.pathOnAgentHost')}
          row={row}
          onPatch={onPatch}
          status={host.status}
          hostId={host.hostId}
          server={host.server}
          disabled={formDisabled}
        />
        <ControllerPortFields
          idPrefix="add-disk"
          idSuffix={`-${row.key}`}
          row={row}
          onPatch={onPatch}
          showController={showController}
          showPort={showPort}
          portPlaceholder={t('machineEdit.common.auto')}
          disabled={formDisabled}
        />
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropDiskRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
    </div>
  );
};

const hostShape = PropTypes.shape({
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  server: PropTypes.object,
});

PendingDiskRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  host: hostShape.isRequired,
  showController: PropTypes.bool.isRequired,
  showPort: PropTypes.bool.isRequired,
  formDisabled: PropTypes.bool,
};

const PendingCdromRow = ({
  row,
  onPatch,
  onDrop,
  host,
  isoOptions,
  showController,
  showPort,
  formDisabled,
}) => {
  const { t } = useTranslation();
  return (
    <div className="device-row device-child device-child-form" data-pending-cdrom={row.key}>
      <div className="row g-2 align-items-end">
        <CdromSourceFields
          idPrefix="add-cdrom"
          idSuffix={`-${row.key}`}
          sourceLabel={t('machineEdit.storageDevicesEditor.newIsoSource')}
          sourceCol="col-3 col-md-2"
          isoCol="col-6 col-md-3"
          pathCol="col-9 col-md-3"
          row={row}
          onPatch={onPatch}
          isoOptions={isoOptions}
          status={host.status}
          hostId={host.hostId}
          server={host.server}
          disabled={formDisabled}
        />
        <ControllerPortFields
          idPrefix="add-cdrom"
          idSuffix={`-${row.key}`}
          row={row}
          onPatch={onPatch}
          showController={showController}
          showPort={showPort}
          portPlaceholder={t('machineEdit.common.auto')}
          disabled={formDisabled}
        />
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropIsoRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
    </div>
  );
};

PendingCdromRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  host: hostShape.isRequired,
  isoOptions: PropTypes.array.isRequired,
  showController: PropTypes.bool.isRequired,
  showPort: PropTypes.bool.isRequired,
  formDisabled: PropTypes.bool,
};

const ZoneNewDiskFields = ({ row, onPatch, poolChoices, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="col-4 col-md-2">
        <label className="form-label small mb-1" htmlFor={`add-zdisk-size-${row.key}`}>
          {t('machineEdit.storageDevicesEditor.size')}
        </label>
        <input
          id={`add-zdisk-size-${row.key}`}
          className="form-control form-control-sm"
          placeholder="e.g. 50G"
          value={row.size}
          onChange={event => onPatch({ size: event.target.value })}
          disabled={formDisabled}
        />
      </div>
      <div className="col-4 col-md-2">
        <label className="form-label small mb-1" htmlFor={`add-zdisk-pool-${row.key}`}>
          {t('machineEdit.storageDevicesEditor.pool')}
        </label>
        <PickOrType
          id={`add-zdisk-pool-${row.key}`}
          value={row.pool}
          onChange={next => onPatch({ pool: next })}
          options={poolChoices}
          blankLabel="rpool"
          placeholder={t('machineEdit.storageDevicesEditor.poolName')}
          small
          disabled={formDisabled}
        />
      </div>
      <div className="col-4 col-md-2">
        <label className="form-label small mb-1" htmlFor={`add-zdisk-volume-${row.key}`}>
          {t('machineEdit.storageDevicesEditor.volumeName')}
        </label>
        <input
          id={`add-zdisk-volume-${row.key}`}
          className="form-control form-control-sm"
          placeholder="diskN"
          value={row.volume_name}
          onChange={event => onPatch({ volume_name: event.target.value })}
          disabled={formDisabled}
        />
      </div>
      <div className="col-4 col-md-2">
        <label className="form-label small mb-1" htmlFor={`add-zdisk-dataset-${row.key}`}>
          {t('machineEdit.storageDevicesEditor.parentDataset')}
        </label>
        <input
          id={`add-zdisk-dataset-${row.key}`}
          className="form-control form-control-sm"
          placeholder="zones"
          value={row.dataset}
          onChange={event => onPatch({ dataset: event.target.value })}
          disabled={formDisabled}
        />
      </div>
      <div className="col-auto">
        <div className="form-check form-switch mb-1">
          <input
            id={`add-zdisk-sparse-${row.key}`}
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={row.sparse}
            onChange={event => onPatch({ sparse: event.target.checked })}
            disabled={formDisabled}
          />
          <label className="form-check-label small" htmlFor={`add-zdisk-sparse-${row.key}`}>
            {t('machineEdit.storageDevicesEditor.sparse')}
          </label>
        </div>
      </div>
    </>
  );
};

ZoneNewDiskFields.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  poolChoices: PropTypes.array.isRequired,
  formDisabled: PropTypes.bool,
};

const ZonePendingDiskRow = ({ row, onPatch, onDrop, poolChoices, zoneName, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <div className="device-row device-child device-child-form" data-pending-zone-disk={row.key}>
      <div className="row g-2 align-items-end">
        <div className="col-4 col-md-2">
          <label className="form-label small mb-1" htmlFor={`add-zdisk-mode-${row.key}`}>
            {t('machineEdit.storageDevicesEditor.newDiskSource')}
          </label>
          <select
            id={`add-zdisk-mode-${row.key}`}
            className="form-select form-select-sm"
            value={row.mode}
            onChange={event => onPatch({ mode: event.target.value })}
            disabled={formDisabled}
          >
            <option value="new">{t('machineEdit.storageDevicesEditor.newZvol')}</option>
            <option value="existing">{t('machineEdit.storageDevicesEditor.existingZvol')}</option>
          </select>
        </div>
        {row.mode === 'new' ? (
          <ZoneNewDiskFields
            row={row}
            onPatch={onPatch}
            poolChoices={poolChoices}
            formDisabled={formDisabled}
          />
        ) : (
          <div className="col-8 col-md-5">
            <label className="form-label small mb-1" htmlFor={`add-zdisk-existing-${row.key}`}>
              {t('machineEdit.storageDevicesEditor.existingZvolDatasetName')}
            </label>
            <input
              id={`add-zdisk-existing-${row.key}`}
              className="form-control form-control-sm font-monospace"
              placeholder="e.g. rpool/zones/mydisk"
              value={row.existing_dataset}
              onChange={event => onPatch({ existing_dataset: event.target.value })}
              disabled={formDisabled}
            />
          </div>
        )}
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropDiskRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
      {row.mode === 'new' ? (
        <span className="form-text text-muted small">
          {t('machineEdit.storageDevicesEditor.createsZvol')}{' '}
          <code>
            {row.pool.trim() || 'rpool'}/{row.dataset.trim() || 'zones'}/{zoneName || '<zone>'}/
            {row.volume_name.trim() || 'disk<N>'}
          </code>{' '}
          — {row.size.trim() || t('machineEdit.storageDevicesEditor.sizeRequired')}
          {row.sparse ? t('machineEdit.storageDevicesEditor.sparseSuffix') : ''}
        </span>
      ) : null}
    </div>
  );
};

ZonePendingDiskRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  poolChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  zoneName: PropTypes.string,
  formDisabled: PropTypes.bool,
};

const ZoneDiskRow = ({ disk, isMarked, onManage, onToggle, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`device-row device-child ${isMarked ? 'device-removed' : ''}`}
      data-zone-disk={disk.name}
    >
      <FaServer className="text-muted" aria-hidden="true" />
      <span className="device-meta">{disk.name}</span>
      <span className="device-path" title={disk.value}>
        {disk.value}
      </span>
      {disk.size ? <span className="badge text-bg-secondary">{disk.size}</span> : null}
      {disk.boot ? (
        <span
          className="badge text-bg-light"
          title={t('machineEdit.storageDevicesEditor.zoneBootMediumTitle')}
        >
          {t('machineEdit.storageDevicesEditor.boot')}
        </span>
      ) : null}
      {disk.boot && isMarked ? (
        <span className="badge text-bg-danger">
          {t('machineEdit.storageDevicesEditor.unbootableAfterApply')}
        </span>
      ) : null}
      <div className="device-actions">
        {!isMarked ? (
          <button
            type="button"
            className="btn btn-sm py-0 btn-outline-secondary"
            data-action="manage-zvol"
            title={t('machineEdit.storageDevicesEditor.manageZvol')}
            onClick={() => onManage(disk)}
            disabled={formDisabled}
          >
            <FaGear aria-hidden="true" />
          </button>
        ) : null}
        <MarkButton
          marked={isMarked}
          action="mark-zone-disk"
          title={
            isMarked
              ? t('machineEdit.storageDevicesEditor.unmark')
              : `${t('machineEdit.storageDevicesEditor.detachDiskTitle')}${
                  disk.boot ? t('machineEdit.storageDevicesEditor.detachBootDiskSuffix') : ''
                }`
          }
          onClick={() => onToggle(disk.name)}
          disabled={formDisabled}
        />
      </div>
    </div>
  );
};

ZoneDiskRow.propTypes = {
  disk: PropTypes.object.isRequired,
  isMarked: PropTypes.bool.isRequired,
  onManage: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const ZoneRows = ({ editor }) => {
  const { t } = useTranslation();
  const { zone } = editor;
  return (
    <>
      {zone.disks.length > 0 ? (
        <div className="device-row device-group">
          <FaHardDrive className="text-muted" aria-hidden="true" />
          <span>{t('machineEdit.storageDevicesEditor.disks')}</span>
        </div>
      ) : null}
      {zone.disks.map(disk => (
        <ZoneDiskRow
          key={disk.name}
          disk={disk}
          isMarked={editor.zoneDiskRemovals.includes(disk.name)}
          onManage={editor.onManageZoneDisk}
          onToggle={editor.onToggleZoneDisk}
          formDisabled={editor.formDisabled}
        />
      ))}
      {zone.cdroms.length > 0 ? (
        <div className="device-row device-group">
          <FaCompactDisc className="text-muted" aria-hidden="true" />
          <span>{t('machineEdit.storageDevicesEditor.cdDvd')}</span>
        </div>
      ) : null}
      {zone.cdroms.map(cdrom => {
        const isMarked = editor.zoneCdromRemovals.includes(cdrom.name);
        return (
          <div
            className={`device-row device-child ${isMarked ? 'device-removed' : ''}`}
            key={cdrom.name}
            data-zone-cdrom={cdrom.name}
          >
            <FaCompactDisc className="text-muted" aria-hidden="true" />
            <span className="device-meta">{cdrom.name}</span>
            <span className="device-path" title={cdrom.value}>
              {cdrom.value}
            </span>
            <div className="device-actions">
              <MarkButton
                marked={isMarked}
                action="mark-zone-cdrom"
                title={
                  isMarked
                    ? t('machineEdit.storageDevicesEditor.unmark')
                    : t('machineEdit.storageDevicesEditor.ejectIso')
                }
                onClick={() => editor.onToggleZoneCdrom(cdrom.name)}
                disabled={editor.formDisabled}
              />
            </div>
          </div>
        );
      })}
      {editor.addZoneDisks.map(row => (
        <ZonePendingDiskRow
          key={row.key}
          row={row}
          onPatch={patch =>
            editor.onAddZoneDisksChange(
              editor.addZoneDisks.map(entry =>
                entry.key === row.key ? { ...entry, ...patch } : entry
              )
            )
          }
          onDrop={() =>
            editor.onAddZoneDisksChange(editor.addZoneDisks.filter(entry => entry.key !== row.key))
          }
          poolChoices={editor.poolChoices}
          zoneName={editor.zoneName}
          formDisabled={editor.formDisabled}
        />
      ))}
      <div className="device-row device-meta">
        {t('machineEdit.storageDevicesEditor.detachedDisksHint')}
      </div>
    </>
  );
};

ZoneRows.propTypes = {
  editor: PropTypes.object.isRequired,
};

const ControllerRows = ({ editor, controller }) => {
  const { t } = useTranslation();
  const isMarked = editor.controllerMarked(controller.name);
  return (
    <Fragment key={controller.name}>
      <div
        className={`device-row device-group ${isMarked ? 'device-removed' : ''}`}
        data-controller={controller.name}
      >
        <FaHardDrive className="text-muted" aria-hidden="true" />
        <span>{controller.name}</span>
        {controller.type ? (
          <span className="badge text-bg-secondary">{controller.type}</span>
        ) : null}
        <div className="device-actions">
          <button
            type="button"
            className="btn btn-sm py-0 btn-outline-secondary"
            data-action="attach-disk"
            title={t('machineEdit.storageDevicesEditor.attachDisk')}
            onClick={() => editor.addDisk(controller.name)}
            disabled={editor.formDisabled}
          >
            <FaServer className="me-1" aria-hidden="true" />
            <FaPlus className="small" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm py-0 btn-outline-secondary"
            data-action="attach-iso"
            title={t('machineEdit.storageDevicesEditor.attachIso')}
            onClick={() => editor.addCdrom(controller.name)}
            disabled={editor.formDisabled}
          >
            <FaCompactDisc className="me-1" aria-hidden="true" />
            <FaPlus className="small" aria-hidden="true" />
          </button>
          <MarkButton
            marked={isMarked}
            action="mark-controller"
            title={
              isMarked
                ? t('machineEdit.storageDevicesEditor.unmark')
                : t('machineEdit.storageDevicesEditor.markControllerForRemoval')
            }
            onClick={() => editor.onToggleController(controller.name)}
            disabled={editor.formDisabled}
          />
        </div>
      </div>
      {editor.attachments
        .filter(entry => entry.controller === controller.name)
        .map(entry => (
          <EditableAttachmentRow
            key={`${entry.controller}-${entry.port}-${entry.device}`}
            entry={entry}
            isMarked={editor.marked(entry)}
            onToggle={editor.onToggleAttachment}
            formDisabled={editor.formDisabled}
          />
        ))}
      <PendingRows
        editor={editor}
        disks={editor.disksUnder(controller.name)}
        cdroms={editor.cdromsUnder(controller.name)}
        showController={false}
        showPort
      />
    </Fragment>
  );
};

ControllerRows.propTypes = {
  editor: PropTypes.object.isRequired,
  controller: PropTypes.object.isRequired,
};

const PendingRows = ({ editor, disks, cdroms, showController, showPort }) => (
  <>
    {disks.map(row => (
      <PendingDiskRow
        key={row.key}
        row={row}
        onPatch={patch => editor.patchDisk(row.key, patch)}
        onDrop={() => editor.dropDisk(row.key)}
        host={editor.host}
        showController={showController}
        showPort={showPort}
        formDisabled={editor.formDisabled}
      />
    ))}
    {cdroms.map(row => (
      <PendingCdromRow
        key={row.key}
        row={row}
        onPatch={patch => editor.patchCdrom(row.key, patch)}
        onDrop={() => editor.dropCdrom(row.key)}
        host={editor.host}
        isoOptions={editor.isoOptions}
        showController={showController}
        showPort={showPort}
        formDisabled={editor.formDisabled}
      />
    ))}
  </>
);

PendingRows.propTypes = {
  editor: PropTypes.object.isRequired,
  disks: PropTypes.array.isRequired,
  cdroms: PropTypes.array.isRequired,
  showController: PropTypes.bool.isRequired,
  showPort: PropTypes.bool.isRequired,
};

const NewControllerRow = ({ editor, row }) => {
  const { t } = useTranslation();
  const patch = change =>
    editor.onAddControllersChange(
      editor.addControllers.map(entry => (entry.key === row.key ? { ...entry, ...change } : entry))
    );
  return (
    <div className="device-row device-group" data-new-controller={row.key}>
      <FaPlus className="text-success" aria-hidden="true" />
      <span>{t('machineEdit.storageDevicesEditor.newController')}</span>
      <select
        className="form-select form-select-sm w-auto"
        aria-label={t('machineEdit.storageDevicesEditor.newControllerType')}
        value={row.type}
        onChange={event => patch({ type: event.target.value })}
        disabled={editor.formDisabled}
      >
        {editor.types.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        className="form-control form-control-sm w-auto"
        aria-label={t('machineEdit.storageDevicesEditor.newControllerName')}
        placeholder={t('machineEdit.storageDevicesEditor.nameOptional')}
        value={row.name}
        onChange={event => patch({ name: event.target.value })}
        disabled={editor.formDisabled}
      />
      <div className="device-actions">
        <button
          type="button"
          className="btn btn-sm py-0 btn-outline-danger"
          aria-label={t('machineEdit.storageDevicesEditor.dropControllerRow')}
          onClick={() =>
            editor.onAddControllersChange(
              editor.addControllers.filter(entry => entry.key !== row.key)
            )
          }
          disabled={editor.formDisabled}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

NewControllerRow.propTypes = {
  editor: PropTypes.object.isRequired,
  row: PropTypes.object.isRequired,
};

const FootButton = ({ action, labelKey, onClick, disabled }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action={action}
      onClick={onClick}
      disabled={disabled}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t(labelKey)}
    </button>
  );
};

FootButton.propTypes = {
  action: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const EDITOR_DEFAULTS = {
  addZoneDisks: [],
  onAddZoneDisksChange: () => {},
  poolChoices: [],
  zoneName: '',
  zoneDiskRemovals: [],
  onToggleZoneDisk: () => {},
  onManageZoneDisk: () => {},
  zoneCdromRemovals: [],
  onToggleZoneCdrom: () => {},
  controllerTypes: null,
  server: null,
  formDisabled: false,
};

const newDisk = controller => ({
  key: newKey(),
  mode: 'new',
  size: '',
  path: '',
  controller: controller ?? '',
});

const newCdrom = (controller, isoOptions) => ({
  key: newKey(),
  source: isoOptions.length > 0 ? 'iso' : 'path',
  path: '',
  iso: '',
  controller: controller ?? '',
});

const newZoneDisk = () => ({
  key: Date.now(),
  mode: 'new',
  size: '',
  sparse: true,
  pool: '',
  dataset: '',
  volume_name: '',
  existing_dataset: '',
});

const newController = types => ({
  key: Date.now(),
  name: '',
  type: types.includes('sata') ? 'sata' : types[0],
});

const given = props =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

const editorOf = props => {
  const editor = { ...EDITOR_DEFAULTS, ...given(props) };
  const { addDisks, onAddDisksChange, addCdroms, onAddCdromsChange } = editor;
  editor.zone = editor.currentHardware.zone;
  editor.controllers = editor.currentHardware.controllers;
  editor.attachments = editor.currentHardware.attachments;
  editor.host = { status: editor.status, hostId: editor.hostId, server: editor.server };
  editor.types = editor.controllerTypes || FALLBACK_CONTROLLER_TYPES;
  editor.patchDisk = (key, patch) =>
    onAddDisksChange(addDisks.map(row => (row.key === key ? { ...row, ...patch } : row)));
  editor.dropDisk = key => onAddDisksChange(addDisks.filter(row => row.key !== key));
  editor.patchCdrom = (key, patch) =>
    onAddCdromsChange(addCdroms.map(row => (row.key === key ? { ...row, ...patch } : row)));
  editor.dropCdrom = key => onAddCdromsChange(addCdroms.filter(row => row.key !== key));
  editor.addDisk = controller => onAddDisksChange([...addDisks, newDisk(controller)]);
  editor.addCdrom = controller =>
    onAddCdromsChange([...addCdroms, newCdrom(controller, editor.isoOptions)]);
  editor.disksUnder = name => addDisks.filter(row => (row.controller ?? '') === name);
  editor.cdromsUnder = name => addCdroms.filter(row => (row.controller ?? '') === name);
  return editor;
};

/**
 * The Storage tab of the Settings page, hyperweaver-ui's storage devices
 * editor as one device tree: each controller a group row with its media
 * under it, attach buttons on the controller and a mark for removal on
 * every row; a zone draws its disks with the zvol manager and its
 * CD-ROMs; new disks, ISOs and controllers ride the foot buttons and
 * everything applies together on Apply.
 */
const StorageDevicesEditor = ({
  currentHardware,
  addDisks,
  onAddDisksChange,
  addCdroms,
  onAddCdromsChange,
  addControllers,
  onAddControllersChange,
  marked,
  onToggleAttachment,
  controllerMarked,
  onToggleController,
  addZoneDisks,
  onAddZoneDisksChange,
  poolChoices,
  zoneName,
  zoneDiskRemovals,
  onToggleZoneDisk,
  onManageZoneDisk,
  zoneCdromRemovals,
  onToggleZoneCdrom,
  isoOptions,
  controllerTypes,
  status,
  hostId,
  server,
  formDisabled,
}) => {
  const { t } = useTranslation();
  const editor = editorOf({
    currentHardware,
    addDisks,
    onAddDisksChange,
    addCdroms,
    onAddCdromsChange,
    addControllers,
    onAddControllersChange,
    marked,
    onToggleAttachment,
    controllerMarked,
    onToggleController,
    addZoneDisks,
    onAddZoneDisksChange,
    poolChoices,
    zoneName,
    zoneDiskRemovals,
    onToggleZoneDisk,
    onManageZoneDisk,
    zoneCdromRemovals,
    onToggleZoneCdrom,
    isoOptions,
    controllerTypes,
    status,
    hostId,
    server,
    formDisabled,
  });
  const { zone, controllers, attachments } = editor;
  const controllerNames = new Set(controllers.map(controller => controller.name));
  const orphanDisks = addDisks.filter(row => !controllerNames.has(row.controller ?? ''));
  const orphanCdroms = addCdroms.filter(row => !controllerNames.has(row.controller ?? ''));

  return (
    <div className="device-tree" data-editor="storage-devices">
      <div className="device-tree-head">
        <FaHardDrive aria-hidden="true" />
        <span>{t('machineEdit.storageDevicesEditor.storageDevices')}</span>
      </div>
      {zone ? <ZoneRows editor={editor} /> : null}
      {!zone && controllers.length === 0 && attachments.length === 0 ? (
        <div className="device-row device-meta">
          {t('machineEdit.storageDevicesEditor.noStorageDevices')}
        </div>
      ) : null}
      {controllers.map(controller => (
        <ControllerRows key={controller.name} editor={editor} controller={controller} />
      ))}
      {orphanDisks.length > 0 || orphanCdroms.length > 0 ? (
        <>
          <div className="device-row device-group">
            <FaPlus className="text-success" aria-hidden="true" />
            <span>{t('machineEdit.storageDevicesEditor.newDevices')}</span>
            <span className="device-meta">
              {zone
                ? t('machineEdit.storageDevicesEditor.attachToZoneOnApply')
                : t('machineEdit.storageDevicesEditor.blankControllerDefault')}
            </span>
          </div>
          <PendingRows
            editor={editor}
            disks={orphanDisks}
            cdroms={orphanCdroms}
            showController={!zone}
            showPort={!zone}
          />
        </>
      ) : null}
      {addControllers.map(row => (
        <NewControllerRow key={`add-controller-${row.key}`} editor={editor} row={row} />
      ))}
      <div className="device-tree-foot">
        <FootButton
          action="add-disk"
          labelKey="machineEdit.storageDevicesEditor.disk"
          onClick={() =>
            zone
              ? editor.onAddZoneDisksChange([...editor.addZoneDisks, newZoneDisk()])
              : editor.addDisk('')
          }
          disabled={editor.formDisabled}
        />
        <FootButton
          action="add-iso"
          labelKey="machineEdit.storageDevicesEditor.iso"
          onClick={() => editor.addCdrom('')}
          disabled={editor.formDisabled}
        />
        {!zone ? (
          <FootButton
            action="add-controller"
            labelKey="machineEdit.storageDevicesEditor.controller"
            onClick={() =>
              editor.onAddControllersChange([...addControllers, newController(editor.types)])
            }
            disabled={editor.formDisabled}
          />
        ) : null}
      </div>
    </div>
  );
};

StorageDevicesEditor.propTypes = {
  currentHardware: PropTypes.object.isRequired,
  addDisks: PropTypes.array.isRequired,
  onAddDisksChange: PropTypes.func.isRequired,
  addCdroms: PropTypes.array.isRequired,
  onAddCdromsChange: PropTypes.func.isRequired,
  addControllers: PropTypes.array.isRequired,
  onAddControllersChange: PropTypes.func.isRequired,
  marked: PropTypes.func.isRequired,
  onToggleAttachment: PropTypes.func.isRequired,
  controllerMarked: PropTypes.func.isRequired,
  onToggleController: PropTypes.func.isRequired,
  addZoneDisks: PropTypes.array,
  onAddZoneDisksChange: PropTypes.func,
  poolChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  zoneName: PropTypes.string,
  zoneDiskRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneDisk: PropTypes.func,
  onManageZoneDisk: PropTypes.func,
  zoneCdromRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneCdrom: PropTypes.func,
  isoOptions: PropTypes.array.isRequired,
  controllerTypes: PropTypes.array,
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  server: PropTypes.object,
  formDisabled: PropTypes.bool,
};

export default StorageDevicesEditor;
