import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaRightToBracket } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { useStatus } from '../../contexts/StatusContext';
import { currentPath } from '../../lib/returnTo';
import { returnTo } from '../../lib/runtime';
import { authMethod } from '../../utils/capabilities';

import EmptyState from './EmptyState';

const BUTTON = 'btn btn-primary sign-in d-inline-flex align-items-center gap-2 mt-3';

const SignInControl = ({ onSignIn }) => {
  const { t } = useTranslation();
  const to = returnTo.signInTo(currentPath());
  if (to) {
    return (
      <Link to={to} className={BUTTON}>
        <FaRightToBracket />
        {t('navbar.signIn')}
      </Link>
    );
  }
  return (
    <button type="button" className={BUTTON} onClick={onSignIn}>
      <FaRightToBracket />
      {t('navbar.signIn')}
    </button>
  );
};

SignInControl.propTypes = {
  onSignIn: PropTypes.func,
};

/**
 * The one empty placard with a way in: `EmptyState` under `title`, and,
 * while the visitor is signed out on a host that has a sign-in, the hint
 * `pages.signInToSee` with the navbar's Sign in control under it, a link
 * to the sign-in page carrying this page as the return path, or the
 * one-click sign-in of an `idp` host; signed in, or on a host with no
 * session at all, `body` alone under the title, so the page never
 * confirms whether a thing exists behind the sign-in and never asks a
 * signed-in person to sign in.
 */
const SignInPlacard = ({ title, user, onSignIn = null, body = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const signedOut = !user && authMethod(status) !== 'none';
  if (!signedOut) {
    return <EmptyState title={title} body={body} />;
  }
  const hint = (
    <>
      <div>{t('pages.signInToSee')}</div>
      <SignInControl onSignIn={onSignIn} />
    </>
  );
  return <EmptyState title={title} body={hint} />;
};

SignInPlacard.propTypes = {
  title: PropTypes.node.isRequired,
  user: PropTypes.object,
  onSignIn: PropTypes.func,
  body: PropTypes.node,
};

export default SignInPlacard;
