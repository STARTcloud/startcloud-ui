import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import RevealInput from '../../../components/common/RevealInput';
import { fetchGuestExecStatus, runGuestControl, runGuestExec } from '../api/machines';

import ToolFormDialog from './ToolFormDialog';

const argsOf = text =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

/**
 * The body of a guest command from the dialog's fields: the path, the
 * arguments one a line, the timeout, and for the Guest Additions the
 * credentials where typed.
 *
 * @param {Object} form - The fields
 * @param {boolean} qga - Whether the guest agent channel carries it
 * @returns {Object} The body
 */
export const guestExecBody = (form, qga) => {
  const argList = argsOf(form.args);
  const body = {
    path: form.path.trim(),
    ...(argList.length > 0 && { args: argList }),
    ...(form.timeoutSeconds !== '' && { timeout_seconds: Number(form.timeoutSeconds) }),
  };
  if (qga) {
    return body;
  }
  return {
    ...body,
    ...(form.username.trim() && { username: form.username.trim() }),
    ...(form.password && { password: form.password }),
  };
};

const EMPTY_FORM = { path: '', args: '', username: '', password: '', timeoutSeconds: '' };

const Output = ({ output, qga }) => {
  const { t } = useTranslation();
  const exitCode = qga ? output.exitcode : output.exit_code;
  return (
    <div className="mt-3" data-guest-output={exitCode ?? '?'}>
      <span className={`badge ${exitCode === 0 ? 'text-bg-success' : 'text-bg-danger'}`}>
        {t('machine.guestExecModal.exitBadge', { code: exitCode ?? '?' })}
      </span>
      {output.signal !== undefined && output.signal !== null ? (
        <span className="badge text-bg-warning ms-1">
          {t('machine.guestExecModal.signalBadge', { signal: output.signal })}
        </span>
      ) : null}
      {output.stdout ? (
        <pre className="small border rounded p-2 mt-2 mb-0">{output.stdout}</pre>
      ) : null}
      {output.stderr ? (
        <pre className="small border border-danger rounded p-2 mt-2 mb-0 text-danger">
          {output.stderr}
        </pre>
      ) : null}
    </div>
  );
};

Output.propTypes = {
  output: PropTypes.object.isRequired,
  qga: PropTypes.bool.isRequired,
};

/**
 * The Run in guest dialog, hyperweaver-ui's, over two transports: the
 * Guest Additions of a VirtualBox machine, `POST
 * machines/{name}/guestcontrol/run` with the guest's credentials, and the
 * guest agent channel, `POST machines/{name}/guest/exec`, which needs
 * none; the exit code and the output draw under the fields. A command
 * that outlives the agent's wait answers its pid, and Check reads
 * `GET machines/{name}/guest/exec/{pid}` once on the person's click,
 * nothing polling.
 */
const GuestExecModal = ({
  status,
  hostId,
  name,
  running,
  flavor = 'additions',
  utm = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [output, setOutput] = useState(null);
  const [pendingPid, setPendingPid] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const qga = flavor === 'qga' || utm;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const took = data => {
    if (qga && !utm && !data.exited) {
      setPendingPid(data.pid);
      return;
    }
    setPendingPid(null);
    setOutput(data);
  };

  const submit = async () => {
    if (!form.path.trim()) {
      setProblem(t('machine.guestExecModal.pathRequired'));
      return;
    }
    setBusy(true);
    setProblem('');
    setOutput(null);
    setPendingPid(null);
    const body = guestExecBody(form, qga);
    try {
      const answer = qga
        ? await runGuestExec(status, hostId, name, body)
        : await runGuestControl(status, hostId, name, body);
      took(answer || {});
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      took((await fetchGuestExecStatus(status, hostId, name, pendingPid)) || {});
    } catch (error) {
      setPendingPid(null);
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolFormDialog
      dialog="guest-exec"
      title={t('machine.guestExecModal.title', { machineName: name })}
      submitKey="machine.guestExecModal.submit"
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {!running ? (
        <div className="alert alert-warning py-2" role="status">
          {t('machine.guestExecModal.notRunningPrefix', { machineName: name })}{' '}
          {qga
            ? t('machine.guestExecModal.qgaNeedsRunning')
            : t('machine.guestExecModal.additionsNeedsRunning')}
        </div>
      ) : null}
      {problem ? (
        <div className="alert alert-danger py-2" role="alert" data-note="problem">
          {problem}
        </div>
      ) : null}
      <div className="row g-3">
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="guest-exec-path">
            {t('machine.guestExecModal.pathLabel')} <span className="text-danger">*</span>
          </label>
          <input
            id="guest-exec-path"
            className="form-control"
            type="text"
            placeholder={t('machine.guestExecModal.pathPlaceholder')}
            value={form.path}
            onChange={event => set('path', event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="guest-exec-timeout">
            {t('machine.guestExecModal.timeoutLabel')}
          </label>
          <input
            id="guest-exec-timeout"
            className="form-control"
            type="number"
            min="1"
            max={qga ? 600 : undefined}
            placeholder={
              qga
                ? t('machine.guestExecModal.timeoutPlaceholderQga')
                : t('machine.guestExecModal.timeoutPlaceholderNa')
            }
            value={form.timeoutSeconds}
            onChange={event => set('timeoutSeconds', event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="guest-exec-args">
            {t('machine.guestExecModal.argsLabel')}
          </label>
          <textarea
            id="guest-exec-args"
            className="form-control font-monospace"
            rows={2}
            value={form.args}
            onChange={event => set('args', event.target.value)}
            disabled={busy}
          />
        </div>
        {qga ? (
          <div className="col-12">
            <span className="form-text">{t('machine.guestExecModal.qgaNoCredentialsNote')}</span>
          </div>
        ) : (
          <>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="guest-exec-username">
                {t('machine.guestExecModal.usernameLabel')}
              </label>
              <input
                id="guest-exec-username"
                className="form-control"
                type="text"
                placeholder={t('machine.guestExecModal.usernamePlaceholder')}
                value={form.username}
                onChange={event => set('username', event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="guest-exec-password">
                {t('machine.guestExecModal.passwordLabel')}
              </label>
              <RevealInput
                id="guest-exec-password"
                autoComplete="off"
                placeholder={t('machine.guestExecModal.passwordPlaceholder')}
                value={form.password}
                onChange={event => set('password', event.target.value)}
                disabled={busy}
              />
            </div>
          </>
        )}
      </div>
      {pendingPid !== null ? (
        <div
          className="alert alert-info py-2 mt-3 mb-0 d-flex align-items-center gap-2"
          role="status"
          data-guest-pid={pendingPid}
        >
          <span className="flex-grow-1">
            {t('machine.guestExecModal.pollingNote', { pid: pendingPid })}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="check"
            onClick={check}
            disabled={busy}
          >
            <FaRotate className="me-1" aria-hidden="true" />
            {t('machine.guestExecModal.check')}
          </button>
        </div>
      ) : null}
      {output ? <Output output={output} qga={qga} /> : null}
    </ToolFormDialog>
  );
};

GuestExecModal.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  flavor: PropTypes.oneOf(['additions', 'qga']),
  utm: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

export default GuestExecModal;
