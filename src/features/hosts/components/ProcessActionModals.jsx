import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import { ALL_SIGNALS, BATCH_SIGNALS } from '../utils/manage';

import ToolFormDialog from './ToolFormDialog';

const SIGNAL_KEYS = {
  TERM: 'host.sendSignalModal.signalTerm',
  KILL: 'host.sendSignalModal.signalKill',
  HUP: 'host.sendSignalModal.signalHup',
  INT: 'host.sendSignalModal.signalInt',
  QUIT: 'host.sendSignalModal.signalQuit',
  USR1: 'host.sendSignalModal.signalUsr1',
  USR2: 'host.sendSignalModal.signalUsr2',
  STOP: 'host.sendSignalModal.signalStop',
  CONT: 'host.sendSignalModal.signalCont',
};

const processShape = PropTypes.shape({
  pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  username: PropTypes.string,
  zone: PropTypes.string,
  command: PropTypes.string,
});

const ProcessRecord = ({ process, scope }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t(`${scope}.processInformation`)}</h6>
      <RecordRows
        rows={[
          { key: 'pid', label: t(`${scope}.pid`), value: <code>{process.pid}</code> },
          { key: 'user', label: t(`${scope}.user`), value: process.username },
          ...(process.zone
            ? [{ key: 'zone', label: t(`${scope}.zone`), value: process.zone }]
            : []),
          {
            key: 'command',
            label: t(`${scope}.command`),
            value: <code className="small">{process.command}</code>,
          },
        ]}
      />
    </>
  );
};

ProcessRecord.propTypes = {
  process: processShape.isRequired,
  scope: PropTypes.string.isRequired,
};

/**
 * Kill one process, hyperweaver-ui's dialog over the form dialog of the
 * pages contract: the process's record, the warning and the force
 * switch, and Kill process as the danger action, which sends
 * `POST system/processes/{pid}/kill` with `force`.
 */
export const KillProcessModal = ({ process, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [force, setForce] = useState(false);
  return (
    <ToolFormDialog
      dialog="process-kill"
      title={t('host.killProcessModal.title')}
      submitKey="host.killProcessModal.title"
      variant="danger"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm({ force })}
    >
      <ProcessRecord process={process} scope="host.killProcessModal" />
      <div className="alert alert-danger" role="alert">
        <p className="mb-1">
          <strong>{t('host.killProcessModal.warningLabel')}</strong>{' '}
          {t('host.killProcessModal.warningText')}
        </p>
        <p className="mb-0">{t('host.killProcessModal.warningDetail')}</p>
      </div>
      <h6 className="fw-bold">{t('host.killProcessModal.killOptions')}</h6>
      <div className="form-check">
        <input
          id="kill-force"
          className="form-check-input"
          type="checkbox"
          checked={force}
          onChange={event => setForce(event.target.checked)}
        />
        <label className="form-check-label" htmlFor="kill-force">
          <strong>{t('host.killProcessModal.forceKillLabel')}</strong>{' '}
          {t('host.killProcessModal.forceKillHelp')}
        </label>
      </div>
      <p className="form-text text-muted">{t('host.killProcessModal.forceKillNote')}</p>
    </ToolFormDialog>
  );
};

KillProcessModal.propTypes = {
  process: processShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

/**
 * Send one signal to a process, hyperweaver-ui's dialog over the form
 * dialog of the pages contract: the process's record, the signal among
 * the ones the host delivers and the note, and Send signal as the
 * warning action, which sends `POST system/processes/{pid}/signal`.
 */
export const SendSignalModal = ({ process, signals, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [signal, setSignal] = useState('TERM');
  return (
    <ToolFormDialog
      dialog="process-signal"
      title={t('host.sendSignalModal.title')}
      submitKey="host.sendSignalModal.sendSignal"
      variant="warning"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm({ signal })}
    >
      <ProcessRecord process={process} scope="host.sendSignalModal" />
      <h6 className="fw-bold">{t('host.sendSignalModal.signalSelection')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="signal-select">
          {t('host.sendSignalModal.signalToSend')}
        </label>
        <select
          id="signal-select"
          className="form-select"
          value={signal}
          onChange={event => setSignal(event.target.value)}
        >
          {signals.map(name => (
            <option key={name} value={name}>
              {t(SIGNAL_KEYS[name])}
            </option>
          ))}
        </select>
        <p className="form-text text-muted">{t('host.sendSignalModal.signalToSendHelp')}</p>
      </div>
      <div className="alert alert-info mb-0" role="note">
        <p className="mb-1">
          <strong>{t('host.sendSignalModal.noteLabel')}</strong>{' '}
          {t('host.sendSignalModal.noteText')}
        </p>
        <ul className="mb-0">
          <li>
            <strong>SIGTERM:</strong> {t('host.sendSignalModal.sigtermDesc')}
          </li>
          <li>
            <strong>SIGKILL:</strong> {t('host.sendSignalModal.sigkillDesc')}
          </li>
          <li>
            <strong>SIGHUP:</strong> {t('host.sendSignalModal.sighupDesc')}
          </li>
          <li>
            <strong>SIGSTOP/SIGCONT:</strong> {t('host.sendSignalModal.sigstopContDesc')}
          </li>
        </ul>
      </div>
    </ToolFormDialog>
  );
};

SendSignalModal.propTypes = {
  process: processShape.isRequired,
  signals: PropTypes.arrayOf(PropTypes.oneOf(ALL_SIGNALS)).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

const batchSignalLabel = (name, t) => {
  if (name === 'TERM') {
    return `SIG${name} ${t('host.batchKillModal.graceful')}`;
  }
  return name === 'KILL' ? `SIG${name} ${t('host.batchKillModal.force')}` : `SIG${name}`;
};

/**
 * Kill every process matching a command pattern, hyperweaver-ui's
 * dialog over the form dialog of the pages contract: the warning, the
 * pattern, the zone among the host's machines where the host lists
 * `machines`, the signal among the ones the host delivers and the
 * examples, and Kill processes as the danger action, held until a
 * pattern is typed, which sends `POST system/processes/batch-kill`.
 */
export const BatchKillModal = ({ zones, signals, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('');
  const [zone, setZone] = useState('');
  const [signal, setSignal] = useState('TERM');
  return (
    <ToolFormDialog
      dialog="process-batch-kill"
      title={t('host.batchKillModal.title')}
      submitKey="host.batchKillModal.killProcesses"
      variant="danger"
      disabled={!pattern.trim()}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm({ pattern: pattern.trim(), signal, zone })}
    >
      <div className="alert alert-danger" role="alert">
        <p className="mb-1">
          <strong>{t('host.batchKillModal.warningLabel')}</strong>{' '}
          {t('host.batchKillModal.warningText')}
        </p>
        <p className="mb-0">{t('host.batchKillModal.warningDetail')}</p>
      </div>
      <h6 className="fw-bold">{t('host.batchKillModal.processSelection')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="batch-kill-pattern">
          {t('host.batchKillModal.commandPatternLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="batch-kill-pattern"
          className="form-control"
          type="text"
          placeholder={t('host.batchKillModal.commandPatternPlaceholder')}
          value={pattern}
          onChange={event => setPattern(event.target.value)}
          required
        />
        <p className="form-text text-muted">{t('host.batchKillModal.commandPatternHelp')}</p>
      </div>
      {zones.length > 0 ? (
        <div className="mb-3">
          <label className="form-label" htmlFor="batch-kill-zone-filter">
            {t('host.batchKillModal.zoneFilterLabel')}
          </label>
          <select
            id="batch-kill-zone-filter"
            className="form-select"
            value={zone}
            onChange={event => setZone(event.target.value)}
          >
            <option value="">{t('host.batchKillModal.allZones')}</option>
            {zones.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="form-text text-muted">{t('host.batchKillModal.zoneFilterHelp')}</p>
        </div>
      ) : null}
      <h6 className="fw-bold">{t('host.batchKillModal.signalOptions')}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="batch-kill-signal">
          {t('host.batchKillModal.signalToSend')}
        </label>
        <select
          id="batch-kill-signal"
          className="form-select"
          value={signal}
          onChange={event => setSignal(event.target.value)}
        >
          {signals.map(name => (
            <option key={name} value={name}>
              {batchSignalLabel(name, t)}
            </option>
          ))}
        </select>
        <p className="form-text text-muted">{t('host.batchKillModal.signalHelp')}</p>
      </div>
      <div className="alert alert-info mb-0" role="note">
        <p className="mb-1">
          <strong>{t('host.batchKillModal.patternExamples')}</strong>
        </p>
        <ul className="mb-0">
          <li>
            <code>apache</code> - {t('host.batchKillModal.exampleApache')}
          </li>
          <li>
            <code>bhyve</code> - {t('host.batchKillModal.exampleBhyve')}
          </li>
          <li>
            <code>java</code> - {t('host.batchKillModal.exampleJava')}
          </li>
          <li>
            <code>python</code> - {t('host.batchKillModal.examplePython')}
          </li>
        </ul>
      </div>
    </ToolFormDialog>
  );
};

BatchKillModal.propTypes = {
  zones: PropTypes.arrayOf(PropTypes.string).isRequired,
  signals: PropTypes.arrayOf(PropTypes.oneOf(BATCH_SIGNALS)).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
