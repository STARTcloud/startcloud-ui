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
  const body = { email: params.get('email') || '', token: params.get('token') || '' };
  return { body, complete: Boolean(body.email && body.token) };
};

const invalidProblem = code => ({ code, status: 0, wait: 0, since: 0 });

/**
 * The page an emailed single-use link lands on: reads the link once through
 * `read` (`email` and `token` from the URL by default), replaces the
 * location with `path` so the token never sits in history, posts the body
 * through `consume` and follows `next`; a refused token draws the danger
 * alert from its `code` (or `invalidCode` when the parameters are missing)
 * with one link to request another.
 */
const LinkConsumePage = ({
  path,
  consume,
  returnTo,
  title,
  invalidCode,
  another,
  read = readOnce,
}) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [{ body, complete }] = useState(read);
  const [problem, setProblem] = useState(() => (complete ? null : invalidProblem(invalidCode)));

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    navigate(path, { replace: true });
    if (!complete) {
      return;
    }
    consume(body)
      .then(answer => followNext({ next: answer?.next, navigate, returnTo }))
      .catch(error => setProblem(report(error) || invalidProblem(invalidCode)));
  }, [body, complete, consume, invalidCode, navigate, path, report, returnTo]);

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
  read: PropTypes.func,
};

export default LinkConsumePage;
