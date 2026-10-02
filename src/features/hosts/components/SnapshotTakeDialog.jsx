import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TAKE_FORM, takeBody, takeProblem } from '../utils/snapshots';

import ToolFormDialog from './ToolFormDialog';

const MODES = [
  { key: 'name', labelKey: 'machine.machineSnapshots.namedOption' },
  { key: 'prefix', labelKey: 'machine.machineSnapshots.prefixOption' },
];

const Naming = ({ form, busy, onChange }) => {
  const { t } = useTranslation();
  if (form.mode === 'prefix') {
    return (
      <>
        <div className="mb-3">
          <label className="form-label" htmlFor="snapshot-prefix">
            {t('machine.machineSnapshots.prefixLabel')}
          </label>
          <input
            id="snapshot-prefix"
            className="form-control"
            type="text"
            placeholder={t('machine.machineSnapshots.prefixPlaceholder')}
            value={form.prefix}
            disabled={busy}
            onChange={event => onChange({ prefix: event.target.value })}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="snapshot-retention">
            {t('machine.machineSnapshots.retentionLabel')}
          </label>
          <input
            id="snapshot-retention"
            className="form-control"
            type="number"
            min="0"
            placeholder="0"
            value={form.retention}
            disabled={busy}
            onChange={event => onChange({ retention: event.target.value })}
          />
        </div>
      </>
    );
  }
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="snapshot-name">
        {t('machine.machineSnapshots.nameLabel')}
      </label>
      <input
        id="snapshot-name"
        className="form-control"
        type="text"
        value={form.name}
        disabled={busy}
        onChange={event => onChange({ name: event.target.value })}
      />
    </div>
  );
};

Naming.propTypes = {
  form: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const Options = ({ form, running, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="form-check">
        <input
          id="snapshot-quiesce"
          className="form-check-input"
          type="checkbox"
          checked={form.quiesce}
          disabled={busy}
          onChange={event => onChange({ quiesce: event.target.checked })}
        />
        <label className="form-check-label" htmlFor="snapshot-quiesce">
          {t('machine.machineSnapshots.quiesceOptionLabel')}
        </label>
      </div>
      {running ? (
        <div className="form-check">
          <input
            id="snapshot-live"
            className="form-check-input"
            type="checkbox"
            checked={form.live}
            disabled={busy}
            onChange={event => onChange({ live: event.target.checked })}
          />
          <label className="form-check-label" htmlFor="snapshot-live">
            {t('machine.machineSnapshots.liveSnapshotLabel')}
          </label>
        </div>
      ) : null}
    </>
  );
};

Options.propTypes = {
  form: PropTypes.object.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The dialog that takes a snapshot of one machine, hyperweaver-ui's take
 * form, a form dialog: the naming, a name of the person's own or a
 * prefix a dated name is made from with the number of them to keep, the
 * description, and the options, quiescing the guest's file systems and,
 * of a machine that runs, a live snapshot. A machine on UTM draws
 * neither option and is snapshotted while it is off alone, the dialog
 * saying so while it runs. Take snapshot hands `onTake` the body of the
 * one request; a form that cannot be sent draws the sentence that says
 * why and sends nothing.
 */
const SnapshotTakeDialog = ({ name, utm, running, busy, onClose, onTake }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(TAKE_FORM);
  const [problem, setProblem] = useState('');
  const machine = { utm, running };

  const change = patch => {
    setForm(current => ({ ...current, ...patch }));
    setProblem('');
  };

  const submit = () => {
    const refused = takeProblem(form, machine);
    setProblem(refused);
    if (!refused) {
      onTake(takeBody(form, machine));
    }
  };

  return (
    <ToolFormDialog
      dialog="snapshot-take"
      title={t('machine.machineSnapshots.takeSnapshotTitle', { machineName: name })}
      submitKey="machine.machineSnapshots.takeSnapshotSubmit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {utm && running ? (
        <div className="alert alert-warning" role="status" data-note="utm-stopped-only">
          {t('machine.machineSnapshots.utmStoppedOnly')}
        </div>
      ) : null}
      <div className="mb-3">
        <span className="form-label d-block">{t('machine.machineSnapshots.namingLabel')}</span>
        <div className="btn-group btn-group-sm" role="group">
          {MODES.map(mode => (
            <button
              key={mode.key}
              type="button"
              className={`btn btn-outline-secondary${form.mode === mode.key ? ' active' : ''}`}
              aria-pressed={form.mode === mode.key}
              data-mode={mode.key}
              disabled={busy}
              onClick={() => change({ mode: mode.key })}
            >
              {t(mode.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <Naming form={form} busy={busy} onChange={change} />
      <div className="mb-3">
        <label className="form-label" htmlFor="snapshot-description">
          {t('machine.machineSnapshots.descriptionLabel')}
        </label>
        <input
          id="snapshot-description"
          className="form-control"
          type="text"
          value={form.description}
          disabled={busy}
          onChange={event => change({ description: event.target.value })}
        />
      </div>
      {utm ? null : <Options form={form} running={running} busy={busy} onChange={change} />}
    </ToolFormDialog>
  );
};

SnapshotTakeDialog.propTypes = {
  name: PropTypes.string.isRequired,
  utm: PropTypes.bool.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onTake: PropTypes.func.isRequired,
};

export default SnapshotTakeDialog;
