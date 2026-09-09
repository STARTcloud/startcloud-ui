import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthAlert } from '../../../components/common/AuthShell';
import CopyButton from '../../../components/common/CopyButton';
import FieldError from '../../../components/common/FieldError';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { returnToShape } from '../../../utils/auth';
import { backupCodes, confirmBackupCodes } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const download = codes => {
  const blob = new Blob([`${codes.join('\n')}\n`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'backup-codes.txt';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/**
 * `/complete-onboarding/backup-codes`: the warning, the codes from
 * `POST /api/auth/tfa/backup-codes` in a two-column monospace grid, "Copy
 * all codes", "Download as text file", the "I have saved my backup codes"
 * check, and an enabled Continue that refuses with an inline error while
 * the box is unticked, then posts the confirm and follows `next`.
 */
const BackupCodesPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const report = useProblemReporter();
  const { state } = useOnboarding();
  const { run, busy, problem, setProblem } = useStepAction(returnTo);
  const [codes, setCodes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    document.title = t('onboarding.codes.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    backupCodes()
      .then(answer => {
        if (active) {
          setCodes(Array.isArray(answer?.codes) ? answer.codes : []);
        }
      })
      .catch(error => {
        if (active) {
          setProblem(report(error));
        }
      });
    return () => {
      active = false;
    };
  }, [report, setProblem]);

  const submit = event => {
    event.preventDefault();
    if (!saved) {
      setRefused(true);
      return;
    }
    run(confirmBackupCodes());
  };

  return (
    <OnboardingFrame
      state={state}
      current="tfa"
      title={t('onboarding.codes.title')}
      problem={problem}
    >
      <AuthAlert tone="info">
        <strong>{t('onboarding.codes.important')}</strong> {t('onboarding.codes.body')}
      </AuthAlert>
      {codes.length > 0 ? (
        <>
          <div className="backup-codes">
            {codes.map(code => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="auth-row auth-row-start">
            <CopyButton
              text={codes.join('\n')}
              label={t('onboarding.codes.copy')}
              className="auth-btn auth-btn-secondary auth-btn-small"
            />
            <button
              type="button"
              className="auth-btn auth-btn-secondary auth-btn-small"
              onClick={() => download(codes)}
            >
              {t('onboarding.codes.download')}
            </button>
          </div>
        </>
      ) : null}
      <p className="auth-hint">{t('onboarding.codes.noViewAgain')}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className={`field auth-field${refused && !saved ? ' field-invalid' : ''}`}>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={saved}
              aria-invalid={refused && !saved ? true : undefined}
              aria-describedby={refused && !saved ? 'codes-confirm-error' : undefined}
              onChange={event => setSaved(event.target.checked)}
            />
            <span>{t('onboarding.codes.confirm')}</span>
          </label>
          {refused && !saved ? (
            <FieldError id="codes-confirm-error" message={t('onboarding.codes.mustConfirm')} />
          ) : null}
        </div>
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('onboarding.codes.continue')}
        </button>
      </form>
    </OnboardingFrame>
  );
};

BackupCodesPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default BackupCodesPage;
