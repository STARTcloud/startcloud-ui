import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import OptionList, { Option } from '../../../components/common/OptionList';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useStatus } from '../../../contexts/StatusContext';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { followNext } from '../../../lib/next';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { pickTfaMethod, tfaMethods } from '../api/tfa';
import {
  buildOptions,
  membersOf,
  parseKey,
  preferredKey,
  queryProblemOf,
  withMembers,
} from '../utils/methods';

const EMAIL = 'EMAIL';

const codePath = tfaMethod => `/authenticator?tfa_method=${encodeURIComponent(tfaMethod)}`;

/**
 * `/authenticator-method`: the radio cards of every second-factor method
 * the account can use now, the enabled ones first and one disabled card
 * per method `locked` names last, every phone and app listed still
 * offered beside it, the preferred checked or else the first enabled,
 * Continue posting the choice and moving to `/authenticator?tfa_method=`,
 * the emailed code moving there without a post since the code page sends
 * it, and Cancel posting `/auth-cancel`. The cards come from
 * `GET /api/auth/tfa/methods`, or, when the code page arrives with the
 * methods a refused send or a `locked` refusal carried in router state,
 * from those with no request, the router state cleared once it is read so
 * a reload asks the route again; a refused choice that carries them
 * redraws the cards from them. `?error=<code>`, `locked` among them, and
 * the refusal the code page handed over draw the problem alert.
 */
const TfaMethodPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const status = useStatus();
  const report = useProblemReporter();
  const { pathname, search } = location;
  const [handed] = useState(() => location.state?.methods || null);
  const [answer, setAnswer] = useState(handed);
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(() => location.state?.problem || queryProblemOf(search));
  const options = useMemo(
    () => (answer ? buildOptions(answer, status, t) : []),
    [answer, status, t]
  );
  const chosen = options.some(option => option.key === picked && !option.disabled)
    ? picked
    : preferredKey(answer || {}, options);

  useEffect(() => {
    document.title = t('tfa.choose.title');
  }, [t]);

  useEffect(() => {
    if (handed) {
      navigate(`${pathname}${search}`, { replace: true, state: null });
      return undefined;
    }
    let active = true;
    tfaMethods()
      .then(result => {
        if (active) {
          setAnswer(result);
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
  }, [handed, navigate, pathname, report, search]);

  const fail = error => {
    const members = membersOf(error);
    setBusy(false);
    if (members) {
      setAnswer(previous => withMembers(previous, members));
    }
    setProblem(report(error));
  };

  const submit = event => {
    event.preventDefault();
    if (!chosen) {
      return;
    }
    const choice = parseKey(chosen);
    if (choice.tfaMethod === EMAIL) {
      navigate(codePath(EMAIL));
      return;
    }
    setProblem(null);
    setBusy(true);
    pickTfaMethod(choice)
      .then(() => navigate(codePath(choice.tfaMethod)))
      .catch(fail);
  };

  const cancel = () =>
    cancelSignIn()
      .then(result => followNext({ next: result?.next, navigate, returnTo, trusted: true }))
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
                onChange={setPicked}
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
