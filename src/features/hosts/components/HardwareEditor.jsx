import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

import {
  CPU_TOPO_FIELDS,
  HARDWARE_SECTIONS,
  buildHardwarePayload,
  buildPortsPayload,
  cpuTopoProduct,
  diffHardwarePayload,
} from '../utils/hardwareSections';

export {
  HARDWARE_SECTIONS,
  buildHardwarePayload,
  buildPortsPayload,
  cpuTopoProduct,
  diffHardwarePayload,
};

const SERIAL_PORTS = ['1', '2', '3', '4'];
const SERIAL_IO_BASES = ['off', '0x3F8', '0x2F8', '0x3E8', '0x2E8'];
const UART_TYPES = ['16450', '16550A', '16750'];
const PARALLEL_PORTS = ['1', '2'];
const PARALLEL_IO_BASES = ['off', '0x378', '0x278'];

const fieldLabel = key => key.replace(/_/gu, ' ');

const portRow = fields => ({ key: Date.now() + Math.random(), ...fields });

/**
 * A select over a served vocabulary, hyperweaver-ui's: the blank option
 * reads `blankLabel`, a value outside the list keeps its own option, and
 * `onCustom` adds the Custom option that hands the field over to free
 * text.
 */
export const VocabularySelect = ({
  id,
  value,
  entries,
  blankLabel,
  onChange,
  onCustom = null,
  customLabel = '',
  small = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const allRows = entries.map(entry =>
    entry && typeof entry === 'object' ? entry : { value: entry, label: String(entry) }
  );
  const rows = allRows.filter(
    row => String(row.value) !== blankLabel && String(row.label) !== blankLabel
  );
  const blankText =
    rows.length === allRows.length
      ? blankLabel
      : t('machineEdit.common.blankLabelDefault', { label: blankLabel });
  return (
    <select
      id={id}
      className={small ? 'form-select form-select-sm' : 'form-select'}
      value={value}
      onChange={event => {
        if (onCustom && event.target.value === '__custom__') {
          onCustom();
          return;
        }
        onChange(event.target.value);
      }}
      disabled={disabled}
    >
      <option value="">{blankText}</option>
      {value && !rows.some(row => row.value === value) ? (
        <option value={value}>{value}</option>
      ) : null}
      {rows.map(row => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
      {onCustom ? (
        <option value="__custom__">{customLabel || t('machineEdit.pickOrType.custom')}</option>
      ) : null}
    </select>
  );
};

VocabularySelect.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  entries: PropTypes.array.isRequired,
  blankLabel: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onCustom: PropTypes.func,
  customLabel: PropTypes.string,
  small: PropTypes.bool,
  disabled: PropTypes.bool,
};

const HardwareFieldControl = ({
  inputId,
  sectionId,
  field,
  value,
  enumValues,
  onChange,
  blankLabel,
  disabled,
}) => {
  const vocabulary = enumValues || (field.kind === 'onoff' ? ['on', 'off'] : field.suggest);
  if (vocabulary) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        small
        onChange={next => onChange(sectionId, field.key, next)}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={inputId}
      className="form-control form-control-sm"
      type={field.kind === 'int' ? 'number' : 'text'}
      placeholder={field.hint || blankLabel}
      value={value}
      onChange={event => onChange(sectionId, field.key, event.target.value)}
      disabled={disabled}
    />
  );
};

HardwareFieldControl.propTypes = {
  inputId: PropTypes.string.isRequired,
  sectionId: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  enumValues: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

/**
 * One hardware section as a grid of its fields, a blank field never sent;
 * a field whose `vbox.<section>.<key>` is in `knobValues` draws a select
 * over the served vocabulary.
 */
export const HardwareSectionForm = ({
  section,
  values,
  onChange,
  knobValues = null,
  blankLabel = '',
  disabled = false,
}) => {
  const { t } = useTranslation();
  const blank = blankLabel || t('machineEdit.machineSettings.unchanged');
  return (
    <div className="row g-2" data-section={section.id}>
      {section.fields.map(field => {
        const inputId = `hw-${section.id}-${field.key}`;
        return (
          <div className="col-6 col-md-4 col-lg-3" key={field.key}>
            <label className="form-label small mb-1 text-capitalize" htmlFor={inputId}>
              {fieldLabel(field.key)}
            </label>
            <HardwareFieldControl
              inputId={inputId}
              sectionId={section.id}
              field={field}
              value={values[field.key] ?? ''}
              enumValues={knobValues?.[`vbox.${section.id}.${field.key}`] || null}
              onChange={onChange}
              blankLabel={blank}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
};

HardwareSectionForm.propTypes = {
  section: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  knobValues: PropTypes.object,
  blankLabel: PropTypes.string,
  disabled: PropTypes.bool,
};

/**
 * The sockets, cores and threads of a CPU topology with the product they
 * make, red past thirty-two.
 */
export const CpuTopologyInputs = ({ idPrefix, topo, onField, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <>
      {CPU_TOPO_FIELDS.map(([key, max]) => (
        <div className="col-4 col-md-2" key={key}>
          <label className="form-label" htmlFor={`${idPrefix}-${key}`}>
            {t(`machineEdit.cpuTopologyInputs.${key}`)}
          </label>
          <input
            id={`${idPrefix}-${key}`}
            className="form-control"
            type="number"
            min="1"
            max={max}
            value={topo[key] ?? ''}
            onChange={event =>
              onField(key, event.target.value === '' ? '' : Number(event.target.value))
            }
            disabled={disabled}
          />
        </div>
      ))}
      <div className="col-12">
        <span className={`form-text ${cpuTopoProduct(topo) > 32 ? 'text-danger' : 'text-muted'}`}>
          {t('machineEdit.cpuTopologyInputs.limitsHint', { product: cpuTopoProduct(topo) || '…' })}
        </span>
      </div>
    </>
  );
};

CpuTopologyInputs.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  topo: PropTypes.object.isRequired,
  onField: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const RowField = ({ col, id, label, children }) => (
  <div className={col}>
    <label className="form-label small mb-1" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
);

RowField.propTypes = {
  col: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const DropRowButton = ({ label, onClick, disabled }) => (
  <div className="col-auto">
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <FaTrash aria-hidden="true" />
    </button>
  </div>
);

DropRowButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const AddRowButton = ({ label, onClick, disabled }) => (
  <div>
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={onClick}
      disabled={disabled}
    >
      <FaPlus className="me-2" aria-hidden="true" />
      {label}
    </button>
  </div>
);

AddRowButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const patchRow = (rows, index, patch) =>
  rows.map((row, at) => (at === index ? { ...row, ...patch } : row));

/**
 * The serial port rows of `vbox.serial`, each its port, I/O base, IRQ,
 * mode and UART type.
 */
export const SerialPortsEditor = ({ rows, onRowsChange, disabled = false }) => {
  const { t } = useTranslation();
  const set = (index, patch) => onRowsChange(patchRow(rows, index, patch));
  return (
    <div className="d-flex flex-column gap-2" data-editor="serial-ports">
      {rows.map((row, index) => (
        <div className="row g-2 align-items-end" key={`serial-${row.key}`}>
          <RowField
            col="col-2 col-md-1"
            id={`serial-port-${row.key}`}
            label={t('machineEdit.serialPortsEditor.port')}
          >
            <select
              id={`serial-port-${row.key}`}
              className="form-select form-select-sm"
              value={row.port}
              onChange={event => set(index, { port: event.target.value })}
              disabled={disabled}
            >
              {SERIAL_PORTS.map(port => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </RowField>
          <RowField
            col="col-3 col-md-2"
            id={`serial-iobase-${row.key}`}
            label={t('machineEdit.serialPortsEditor.ioBase')}
          >
            <input
              id={`serial-iobase-${row.key}`}
              className="form-control form-control-sm"
              list={`serial-iobase-${row.key}-options`}
              placeholder="off"
              value={row.io_base}
              onChange={event => set(index, { io_base: event.target.value })}
              disabled={disabled}
            />
            <datalist id={`serial-iobase-${row.key}-options`}>
              {SERIAL_IO_BASES.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </RowField>
          <RowField
            col="col-2 col-md-1"
            id={`serial-irq-${row.key}`}
            label={t('machineEdit.serialPortsEditor.irq')}
          >
            <input
              id={`serial-irq-${row.key}`}
              className="form-control form-control-sm"
              type="number"
              min="0"
              value={row.irq}
              onChange={event => set(index, { irq: event.target.value })}
              disabled={disabled}
            />
          </RowField>
          <RowField
            col="col-3 col-md-4"
            id={`serial-mode-${row.key}`}
            label={t('machineEdit.serialPortsEditor.mode')}
          >
            <input
              id={`serial-mode-${row.key}`}
              className="form-control form-control-sm"
              placeholder="disconnected | server <pipe> | tcpserver <port> | file <path> | <device>"
              value={row.mode}
              onChange={event => set(index, { mode: event.target.value })}
              disabled={disabled}
            />
          </RowField>
          <RowField
            col="col-2 col-md-2"
            id={`serial-type-${row.key}`}
            label={t('machineEdit.serialPortsEditor.uartType')}
          >
            <input
              id={`serial-type-${row.key}`}
              className="form-control form-control-sm"
              list={`serial-type-${row.key}-options`}
              value={row.type}
              onChange={event => set(index, { type: event.target.value })}
              disabled={disabled}
            />
            <datalist id={`serial-type-${row.key}-options`}>
              {UART_TYPES.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </RowField>
          <DropRowButton
            label={t('machineEdit.serialPortsEditor.dropRow')}
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          />
        </div>
      ))}
      <AddRowButton
        label={t('machineEdit.serialPortsEditor.addSerialPort')}
        onClick={() =>
          onRowsChange([...rows, portRow({ port: '1', io_base: '', irq: '', mode: '', type: '' })])
        }
        disabled={disabled}
      />
    </div>
  );
};

SerialPortsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The parallel port rows of `vbox.parallel`, each its port, I/O base, IRQ
 * and host device.
 */
export const ParallelPortsEditor = ({ rows, onRowsChange, disabled = false }) => {
  const { t } = useTranslation();
  const set = (index, patch) => onRowsChange(patchRow(rows, index, patch));
  return (
    <div className="d-flex flex-column gap-2" data-editor="parallel-ports">
      {rows.map((row, index) => (
        <div className="row g-2 align-items-end" key={`parallel-${row.key}`}>
          <RowField
            col="col-2 col-md-1"
            id={`parallel-port-${row.key}`}
            label={t('machineEdit.parallelPortsEditor.port')}
          >
            <select
              id={`parallel-port-${row.key}`}
              className="form-select form-select-sm"
              value={row.port}
              onChange={event => set(index, { port: event.target.value })}
              disabled={disabled}
            >
              {PARALLEL_PORTS.map(port => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </RowField>
          <RowField
            col="col-3 col-md-2"
            id={`parallel-iobase-${row.key}`}
            label={t('machineEdit.parallelPortsEditor.ioBase')}
          >
            <input
              id={`parallel-iobase-${row.key}`}
              className="form-control form-control-sm"
              list={`parallel-iobase-${row.key}-options`}
              placeholder="off"
              value={row.io_base}
              onChange={event => set(index, { io_base: event.target.value })}
              disabled={disabled}
            />
            <datalist id={`parallel-iobase-${row.key}-options`}>
              {PARALLEL_IO_BASES.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </RowField>
          <RowField
            col="col-2 col-md-1"
            id={`parallel-irq-${row.key}`}
            label={t('machineEdit.parallelPortsEditor.irq')}
          >
            <input
              id={`parallel-irq-${row.key}`}
              className="form-control form-control-sm"
              type="number"
              min="0"
              value={row.irq}
              onChange={event => set(index, { irq: event.target.value })}
              disabled={disabled}
            />
          </RowField>
          <RowField
            col="col-4 col-md-4"
            id={`parallel-device-${row.key}`}
            label={t('machineEdit.parallelPortsEditor.device')}
          >
            <input
              id={`parallel-device-${row.key}`}
              className="form-control form-control-sm"
              placeholder="e.g. LPT1 or /dev/lp0"
              value={row.device}
              onChange={event => set(index, { device: event.target.value })}
              disabled={disabled}
            />
          </RowField>
          <DropRowButton
            label={t('machineEdit.parallelPortsEditor.dropRow')}
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          />
        </div>
      ))}
      <AddRowButton
        label={t('machineEdit.parallelPortsEditor.addParallelPort')}
        onClick={() =>
          onRowsChange([...rows, portRow({ port: '1', io_base: '', irq: '', device: '' })])
        }
        disabled={disabled}
      />
    </div>
  );
};

ParallelPortsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
