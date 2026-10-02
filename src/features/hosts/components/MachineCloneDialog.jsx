import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMachineSnapshots } from '../hooks/useMachineSnapshots';
import {
  cloneBody,
  cloneCopies,
  cloneFormOf,
  cloneLinks,
  cloneProblem,
} from '../utils/machineTools';
import { snapshotKey } from '../utils/snapshots';

import ResourceIssues from './ResourceIssues';
import ToolFormDialog from './ToolFormDialog';

const SOURCES = [
  {
    key: 'template',
    labelKey: 'machine.cloneMachineModal.freshFromTemplateStrong',
    noteKey: 'machine.cloneMachineModal.freshFromTemplateRest',
  },
  {
    key: 'current',
    labelKey: 'machine.cloneMachineModal.copyCurrentStrong',
    noteKey: 'machine.cloneMachineModal.copyCurrentRest',
  },
];

const LINKED_LABELS = {
  virtualbox: 'machine.cloneMachineModal.linkedCloneLabel',
  zfs: 'hosts.clone.zfs.linked',
};

const TEXT_FIELDS = [
  {
    key: 'name',
    labelKey: 'machine.cloneMachineModal.newNameLabel',
    placeholderKey: 'machine.cloneMachineModal.newNamePlaceholder',
    className: 'col-12 col-md-6',
    type: 'text',
  },
  {
    key: 'hostname',
    labelKey: 'machine.cloneMachineModal.newHostnameLabel',
    placeholderKey: '',
    className: 'col-12 col-md-6',
    type: 'text',
  },
  {
    key: 'domain',
    labelKey: 'machine.cloneMachineModal.domainLabel',
    placeholderKey: '',
    className: 'col-12 col-md-6',
    type: 'text',
  },
  {
    key: 'memory',
    labelKey: 'machine.cloneMachineModal.memoryLabel',
    placeholderKey: 'hosts.clone.memoryPlaceholder',
    className: 'col-6 col-md-3',
    type: 'text',
  },
  {
    key: 'vcpus',
    labelKey: 'machine.cloneMachineModal.vcpusLabel',
    placeholderKey: '',
    className: 'col-6 col-md-3',
    type: 'number',
  },
];

const SourceChoice = ({ form, noun, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      {SOURCES.map(source => (
        <div key={source.key} className="form-check">
          <input
            id={`clone-source-${source.key}`}
            className="form-check-input"
            type="radio"
            name="clone-source"
            checked={form.source === source.key}
            disabled={busy}
            onChange={() => onChange({ source: source.key })}
          />
          <label className="form-check-label" htmlFor={`clone-source-${source.key}`}>
            <strong>{t(source.labelKey)}</strong> {t(source.noteKey, { noun })}
          </label>
        </div>
      ))}
    </div>
  );
};

SourceChoice.propTypes = {
  form: PropTypes.object.isRequired,
  noun: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const SnapshotPicker = ({ form, snapshots, noun, required, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2">
      <label className="form-label" htmlFor="clone-snapshot">
        {t('machine.cloneMachineModal.snapshotLabel')}{' '}
        <span className={required ? 'text-danger' : 'text-muted'}>
          {t(
            required
              ? 'machine.cloneMachineModal.snapshotRequiredNote'
              : 'machine.cloneMachineModal.snapshotOptionalNote'
          )}
        </span>
      </label>
      <select
        id="clone-snapshot"
        className="form-select"
        value={form.snapshot}
        disabled={busy}
        onChange={event => onChange({ snapshot: event.target.value })}
      >
        <option value="">
          {t(
            required
              ? 'machine.cloneMachineModal.pickSnapshotOption'
              : 'machine.cloneMachineModal.noneCloneLiveOption'
          )}
        </option>
        {snapshots.map(row => (
          <option key={snapshotKey(row)} value={row.name}>
            {row.current ? `${row.name} ${t('machine.cloneMachineModal.currentSuffix')}` : row.name}
          </option>
        ))}
      </select>
      {snapshots.length === 0 ? (
        <div className="form-text">
          {t('machine.cloneMachineModal.noSnapshotsYet', { noun })}
          {required
            ? ` ${t('machine.cloneMachineModal.takeOneFirstNote')}`
            : t('machine.cloneMachineModal.periodSuffix')}
        </div>
      ) : null}
    </div>
  );
};

SnapshotPicker.propTypes = {
  form: PropTypes.object.isRequired,
  snapshots: PropTypes.arrayOf(PropTypes.object).isRequired,
  noun: PropTypes.string.isRequired,
  required: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const LinkedChoice = ({ form, wire, busy, onChange }) => {
  const { t } = useTranslation();
  const offered = cloneLinks(form, wire);
  return (
    <>
      <div className="form-check">
        <input
          id="clone-linked"
          className="form-check-input"
          type="checkbox"
          checked={form.linked && offered}
          disabled={busy || !offered}
          onChange={event => onChange({ linked: event.target.checked })}
        />
        <label className="form-check-label" htmlFor="clone-linked">
          {t(LINKED_LABELS[wire.platform])}
        </label>
      </div>
      <div className="form-text" data-note={`clone-linked-${wire.platform}`}>
        {t(`hosts.clone.${wire.platform}.linkedNote`)}
      </div>
    </>
  );
};

LinkedChoice.propTypes = {
  form: PropTypes.object.isRequired,
  wire: PropTypes.shape({
    platform: PropTypes.string.isRequired,
    picks: PropTypes.bool.isRequired,
    bare: PropTypes.bool.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const TextFields = ({ form, busy, onChange }) => {
  const { t } = useTranslation();
  return TEXT_FIELDS.map(field => (
    <div key={field.key} className={field.className}>
      <label className="form-label" htmlFor={`clone-${field.key}`}>
        {t(field.labelKey)}
      </label>
      <input
        id={`clone-${field.key}`}
        className="form-control"
        type={field.type}
        placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
        value={form[field.key]}
        disabled={busy}
        onChange={event => onChange({ [field.key]: event.target.value })}
      />
    </div>
  ));
};

TextFields.propTypes = {
  form: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The dialog that clones one machine, hyperweaver-ui's clone form, a
 * form dialog: the source, a fresh build from the machine's template or
 * a copy of its current state; for a copy, the snapshot it is made from
 * where the platform offers the snapshots, the copy
 * `useMachineSnapshots` holds, asked for once a copy is chosen, and
 * whether the clone is linked; then the clone's name, its hostname,
 * which is required, its domain, its memory and its processors, and
 * whether it starts when it is made. What the platform takes of a copy
 * is `wire`, the answer of `cloneWireOf`: on VirtualBox the snapshot is
 * required while the machine runs and the linked clone, a differencing
 * disk, opens unchecked and needs the snapshot; on a host of datasets
 * the snapshot is never required, the agent taking one itself, and the
 * linked clone, a thin clone of the datasets, opens checked. The label
 * and the note of the box say which. Clone hands `onSubmit` the body of
 * the one request; a form that cannot be sent draws the sentence that
 * says why and sends nothing, and what an agent short of resources
 * refused, `issues`, draws one line a resource.
 */
const MachineCloneDialog = ({ id, name, noun, wire, running, busy, issues, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => cloneFormOf(wire));
  const [problem, setProblem] = useState('');
  const copied = cloneCopies(form, wire);
  const { snapshots } = useMachineSnapshots(id, name, copied && wire.picks);
  const lower = noun.toLowerCase();

  const change = patch => {
    setForm(current => ({ ...current, ...patch }));
    setProblem('');
  };

  const submit = () => {
    const refused = cloneProblem(form, { running, wire });
    setProblem(refused);
    if (!refused) {
      onSubmit(cloneBody(form, wire));
    }
  };

  return (
    <ToolFormDialog
      dialog="machine-clone"
      title={t('machine.cloneMachineModal.title', { singular: noun, machineName: name })}
      submitKey="machine.cloneMachineModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {issues.length > 0 ? <ResourceIssues issues={issues} /> : null}
      <SourceChoice form={form} noun={lower} busy={busy} onChange={change} />
      {copied ? (
        <div className="border rounded p-2 mb-3" data-panel="clone-snapshot">
          {wire.picks ? (
            <SnapshotPicker
              form={form}
              snapshots={snapshots}
              noun={lower}
              required={running && !wire.live}
              busy={busy}
              onChange={change}
            />
          ) : null}
          <LinkedChoice form={form} wire={wire} busy={busy} onChange={change} />
        </div>
      ) : null}
      <div className="row g-3">
        <TextFields form={form} busy={busy} onChange={change} />
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="clone-start-after"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.startAfter}
              disabled={busy}
              onChange={event => change({ startAfter: event.target.checked })}
            />
            <label className="form-check-label" htmlFor="clone-start-after">
              {t('machine.cloneMachineModal.startAfterCloneLabel')}
            </label>
          </div>
        </div>
      </div>
    </ToolFormDialog>
  );
};

MachineCloneDialog.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  noun: PropTypes.string.isRequired,
  wire: PropTypes.shape({
    platform: PropTypes.string.isRequired,
    picks: PropTypes.bool.isRequired,
    member: PropTypes.string.isRequired,
    linked: PropTypes.bool.isRequired,
    bare: PropTypes.bool.isRequired,
    live: PropTypes.bool.isRequired,
  }).isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  issues: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default MachineCloneDialog;
