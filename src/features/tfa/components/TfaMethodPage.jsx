import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import OptionList, { Option } from '../../../components/common/OptionList';
import { returnToShape } from '../../../utils/auth';
import { cancelSignIn } from '../../auth/api/signin';
import AuthShell, { AuthSpinner } from '../../auth/components/AuthShell';
import ProblemAlert from '../../auth/components/ProblemAlert';
import { followNext } from '../../auth/next';
import { useProblemReporter } from '../../auth/problem';
import { pickTfaMethod, tfaMethods } from '../api/tfa';

const keyOf = (method, id) => (id ? `${method}:${id}` : method);

const parseKey = key => {
  const [tfaMethod, authenticatorId = ''] = key.split(':');
  return { tfaMethod, authenticatorId };
};

const buildOptions = (answer, t) => {
  const locked = answer.locked || [];
  const options = [];
  (answer.sms || []).forEach(entry => {
    options.push({
      key: keyOf('SMS', entry.id),
      method: 'SMS',
      label: t('tfa.method.sms', { label: entry.label }),
      help: entry.masked,
      extra: answer.sms_risk_notice ? t('tfa.method.smsRisk') : '',
    });
  });
  (answer.app || []).forEach(entry => {
    options.push({
      key: keyOf('APP', entry.id),
      method: 'APP',
      label: t('tfa.method.app', { label: entry.label }),
      help: '',
      extra: '',
    });
  });
  if (answer.passkey) {
    options.push({
      key: 'PASSKEY',
      method: 'PASSKEY',
      label: t('tfa.method.passkey'),
      help: t('tfa.method.passkeyHelp'),
      extra: '',
    });
  }
  options.push({
    key: 'BACKUP_CODE',
    method: 'BACKUP_CODE',
    label: t('tfa.method.backup'),
    help: answer.backup_codes ? t('tfa.method.backupHelp') : t('tfa.method.backupNone'),
    extra: '',
    disabled: !answer.backup_codes,
  });
  return options
    .map(option => {
      if (locked.includes(option.method)) {
        return { ...option, disabled: true, help: t('tfa.method.locked') };
      }
      return option;
    })
    .sort((a, b) => Number(Boolean(a.disabled)) - Number(Boolean(b.disabled)));
};

const preferredKey = (answer, options) => {
  const preferred = answer.preferred
    ? keyOf(answer.preferred.method, answer.preferred.authenticator_id)
    : '';
  const enabled = options.filter(option => !option.disabled);
  if (enabled.some(option => option.key === preferred)) {
    return preferred;
  }
  return enabled[0]?.key || '';
};

/**
 * `/authenticator-method`: the radio cards of every second-factor method
 * the account holds, the enabled ones first and a locked one last and
 * disabled, the preferred checked or else the first enabled, Continue
 * posting the choice and moving to `/authenticator?method=`, and Cancel
 * posting `/auth-cancel`.
 */
const TfaMethodPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [answer, setAnswer] = useState(null);
  const [options, setOptions] = useState([]);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    document.title = t('tfa.choose.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    tfaMethods()
      .then(result => {
        if (!active) {
          return;
        }
        const built = buildOptions(result, t);
        setAnswer(result);
        setOptions(built);
        setChosen(preferredKey(result, built));
      })
      .catch(error => {
        if (active) {
          setProblem(report(error));
        }
      });
    return () => {
      active = false;
    };
  }, [report, t]);

  const fail = error => {
    setBusy(false);
    setProblem(report(error));
  };

  const submit = event => {
    event.preventDefault();
    if (!chosen) {
      return;
    }
    const choice = parseKey(chosen);
    setProblem(null);
    setBusy(true);
    pickTfaMethod(choice)
      .then(() => navigate(`/authenticator?method=${encodeURIComponent(choice.tfaMethod)}`))
      .catch(fail);
  };

  const cancel = () =>
    cancelSignIn()
      .then(result => followNext({ next: result?.next, navigate, returnTo }))
      .catch(fail);

  return (
    <AuthShell title={t('tfa.choose.title')} subtitle={t('tfa.choose.subhead')}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <form className="auth-form" onSubmit={submit} noValidate>
          <OptionList label={t('tfa.choose.title')}>
            {options.map(option => (
              <Option
                key={option.key}
                name="tfa"
                value={option.key}
                checked={chosen === option.key}
                disabled={Boolean(option.disabled)}
                onChange={setChosen}
                label={option.label}
                help={option.help || null}
              >
                {option.extra ? <span className="option-card-help">{option.extra}</span> : null}
              </Option>
            ))}
          </OptionList>
          <button
            type="submit"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy || !chosen}
          >
            {t('tfa.continue')}
          </button>
        </form>
      ) : null}
      <p className="auth-foot">
        <button type="button" className="auth-link auth-link-muted" onClick={cancel}>
          {t('login.cancel')}
        </button>
      </p>
    </AuthShell>
  );
};

TfaMethodPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TfaMethodPage;
