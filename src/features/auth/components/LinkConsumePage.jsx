import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { followNext } from '../../../lib/next';
import { returnToShape } from '../../../utils/auth';

const readOnce = () => {
  const params = new URLSearchParams(window.location.search);
  return { email: params.get('email') || '', token: params.get('token') || '' };
};

const invalidProblem = code => ({ code, status: 0, wait: 0, since: 0 });

/**
 * The page an emailed single-use link lands on: reads `email` and `token`
 * from the URL once, replaces the location with `path` so the token never
 * sits in history, posts them through `consume` and follows `next`; a
 * refused token draws the danger alert from its `code` (or `invalidCode`
 * when the parameters are missing) with one link to request another.
 */
const LinkConsumePage = ({ path, consume, returnTo, title, invalidCode, another }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [credentials] = useState(readOnce);
  const complete = Boolean(credentials.email && credentials.token);
  const [problem, setProblem] = useState(() => (complete ? null : invalidProblem(invalidCode)));

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    navigate(path, { replace: true });
    if (!complete) {
      return;
    }
    consume(credentials)
      .then(answer => followNext({ next: answer?.next, navigate, returnTo }))
      .catch(error => setProblem(report(error) || invalidProblem(invalidCode)));
  }, [complete, consume, credentials, invalidCode, navigate, path, report, returnTo]);

  return (
    <AuthShell title={title}>
      {problem ? (
        <>
          <ProblemAlert problem={problem} />
          <Link to={another.to} className="auth-btn auth-btn-secondary auth-btn-block">
            {another.label}
          </Link>
        </>
      ) : (
        <AuthSpinner label={t('shared:loading')} />
      )}
    </AuthShell>
  );
};

LinkConsumePage.propTypes = {
  path: PropTypes.string.isRequired,
  consume: PropTypes.func.isRequired,
  returnTo: returnToShape.isRequired,
  title: PropTypes.string.isRequired,
  invalidCode: PropTypes.string.isRequired,
  another: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
};

export default LinkConsumePage;
