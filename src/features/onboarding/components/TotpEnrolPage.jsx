import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import CodeInput from '../../../components/common/CodeInput';
import CopyButton from '../../../components/common/CopyButton';
import { returnToShape } from '../../../utils/auth';
import { useProblemReporter } from '../../auth/problem';
import { tfaEnrolment, verifyApp } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const DATA_IMAGE = /^data:image\/(?:png|svg\+xml|jpeg|gif);base64,/;

/**
 * `/qrcode`: the QR image and the setup key with its copy button from
 * `GET /api/auth/tfa/enrol`, the `CodeInput`, "Verify code" posting
 * `/qrcode/verify` and following `next`, and "Choose a different method";
 * the onboarding chain's page alone.
 */
const TotpEnrolPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const report = useProblemReporter();
  const { state } = useOnboarding();
  const { run, busy, problem, setProblem } = useStepAction(returnTo);
  const [enrolment, setEnrolment] = useState(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    document.title = t('onboarding.qr.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    tfaEnrolment()
      .then(answer => {
        if (active) {
          setEnrolment(answer);
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

  const verify = value => {
    if (value) {
      run(verifyApp({ code: value }));
    }
  };

  const submit = event => {
    event.preventDefault();
    verify(code);
  };

  return (
    <OnboardingFrame
      state={state}
      current="tfa"
      title={t('onboarding.qr.title')}
      subtitle={t('onboarding.qr.scan')}
      problem={problem}
    >
      {enrolment ? (
        <form className="auth-form" onSubmit={submit} noValidate>
          {DATA_IMAGE.test(enrolment.qr || '') ? (
            <img className="auth-qr" src={enrolment.qr} alt="" />
          ) : null}
          <div className="field auth-field">
            <label className="form-label" htmlFor="totp-secret">
              {t('onboarding.qr.unableToScan')}
            </label>
            <div className="auth-row">
              <div className="auth-input-wrap auth-grow">
                <input id="totp-secret" type="text" value={enrolment.secret || ''} readOnly />
              </div>
              <CopyButton text={enrolment.secret || ''} className="auth-btn auth-btn-secondary" />
            </div>
          </div>
          <CodeInput
            id="totp-code"
            label={t('onboarding.qr.code')}
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={busy}
          />
          <button
            type="submit"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy}
          >
            {t('onboarding.qr.verify')}
          </button>
        </form>
      ) : null}
      <p className="auth-foot">
        <Link to="/complete-onboarding/choose-2fa-method" className="auth-link auth-link-muted">
          {t('onboarding.phone.chooseOther')}
        </Link>
      </p>
    </OnboardingFrame>
  );
};

TotpEnrolPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TotpEnrolPage;
