import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaRotateRight } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { session } from '../../../lib/runtime';
import { authMethod } from '../../../utils/capabilities';
import CodeSsoLogin from '../../auth/components/CodeSsoLogin';
import { transferProgressLine } from '../utils/tasks';

import { TaskProgress } from './TaskDialog';

const PRESSES = {
  install: { labelKey: 'machineEdit.createWizardSteps.installAndContinue', action: 'install' },
  add: { labelKey: 'machineEdit.createWizardSteps.addSourceAndInstall', action: 'add-source' },
};

const Progress = ({ row }) => {
  const percent = Number(row?.progress_percent) || 0;
  const transfer = row ? transferProgressLine(row) : '';
  return (
    <div className="mt-2" data-note="provisioner-install-progress">
      <TaskProgress percent={percent} />
      <p className="small text-muted mb-0 mt-1">
        {percent}%{transfer ? ` · ${transfer}` : ''}
      </p>
    </div>
  );
};

Progress.propTypes = {
  row: PropTypes.object,
};

const SignIn = ({ onRetry }) => {
  const status = useStatus();
  if (authMethod(status) !== 'apikey') {
    return null;
  }
  return (
    <div className="mt-2">
      <CodeSsoLogin
        disabled={false}
        start={() => session.begin({ method: 'code' })}
        onSignIn={key => session.login(key).then(onRetry)}
      />
    </div>
  );
};

SignIn.propTypes = {
  onRetry: PropTypes.func.isRequired,
};

const FailedLine = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="mb-1">{t('machineEdit.createWizardSteps.provisionerNotFound')}</p>
      {message ? <p className="small mb-2 text-break">{message}</p> : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        data-action="provisioner-retry"
        onClick={onRetry}
      >
        <FaRotateRight className="me-2" aria-hidden="true" />
        {t('machineEdit.createWizardSteps.retry')}
      </button>
    </>
  );
};

FailedLine.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

const TONES = { failed: 'danger', missing: 'danger', signin: 'warning' };

/**
 * The card the Provisioning step draws over its pickers while the Deploy
 * hand-off names a family the host does not hold, one state of
 * `useProvisionerInstall`: the read of the host's catalogs, the family
 * and version not installed with Install and continue or Add source and
 * install, the install's progress from its task, Sign in with SSO to
 * continue with the agent's SSO sign-in on an agent role, or the
 * provisioner not found at its catalog with the agent's word and Retry;
 * on a host whose task ends never reach the stream, the line that sends
 * the person to the Provisioners page.
 *
 * @param {Object} props
 * @param {Object} props.install - The state of `useProvisionerInstall`
 */
const ProvisionerInstallCard = ({ install }) => {
  const { t } = useTranslation();
  if (install.noStream) {
    return (
      <div
        className="alert alert-info"
        role="status"
        data-note="provisioner-install"
        data-state="no-stream"
      >
        {t('machineEdit.createWizardSteps.provisionerNoStream', { name: install.name })}
      </div>
    );
  }
  if (!install.offered || !install.state) {
    return null;
  }
  const values = { name: install.name, version: install.version };
  const press = PRESSES[install.state];
  const failed = install.state === 'failed' || install.state === 'missing';
  return (
    <div
      className={`alert alert-${TONES[install.state] || 'warning'}`}
      role="status"
      data-note="provisioner-install"
      data-state={install.state}
    >
      {install.state === 'looking' ? (
        <p className="mb-0">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          {t('machineEdit.createWizardSteps.provisionerLooking', values)}
        </p>
      ) : null}
      {press ? (
        <>
          <p className="mb-2">{t('machineEdit.createWizardSteps.provisionerMissing', values)}</p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action={`provisioner-${press.action}`}
            onClick={install.install}
          >
            <FaCloudArrowDown className="me-2" aria-hidden="true" />
            {t(press.labelKey)}
          </button>
        </>
      ) : null}
      {install.state === 'installing' ? (
        <>
          <p className="mb-0">{t('machineEdit.createWizardSteps.installing', values)}</p>
          <Progress row={install.row} />
        </>
      ) : null}
      {install.state === 'signin' ? (
        <>
          <p className="mb-0">{t('machineEdit.createWizardSteps.provisionerSignIn')}</p>
          <SignIn onRetry={install.retry} />
        </>
      ) : null}
      {failed ? <FailedLine message={install.message} onRetry={install.retry} /> : null}
    </div>
  );
};

ProvisionerInstallCard.propTypes = {
  install: PropTypes.shape({
    state: PropTypes.string.isRequired,
    offered: PropTypes.bool.isRequired,
    noStream: PropTypes.bool.isRequired,
    name: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    row: PropTypes.object,
    install: PropTypes.func.isRequired,
    retry: PropTypes.func.isRequired,
  }).isRequired,
};

export default ProvisionerInstallCard;
