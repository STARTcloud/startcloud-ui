import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sends a person with a live session away from a sign-in page, to the
 * consumed `intended_url` or home, because a crafted `/login?logout` above
 * a form is a phishing frame for someone still signed in; the session is
 * the adopted one, `loaded` with a user, never the cached account, which is
 * a paint hint and would bounce a visitor off the register page. `active`
 * is false on a step-up, where the session is live by design and the page
 * exists to re-authenticate: the person stays, the form draws, and the
 * answer's `next` carries them on.
 *
 * @param {Object} account - The session state from `useSession`
 * @param {Object} returnTo - The helper from `createReturnTo`
 * @param {boolean} [active] - Whether a live session is sent away
 * @returns {boolean} Whether the redirect is under way
 */
export const useSignedInRedirect = (account, returnTo, active = true) => {
  const navigate = useNavigate();
  const signedIn = active && account.loaded && Boolean(account.user);

  useEffect(() => {
    if (signedIn) {
      navigate(returnTo.consume() || '/', { replace: true });
    }
  }, [signedIn, navigate, returnTo]);

  return signedIn;
};
