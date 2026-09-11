import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sends a person with a live session away from a sign-in page, to the
 * consumed `intended_url` or home, because a crafted `/login?logout` above
 * a form is a phishing frame for someone still signed in; the session is
 * the adopted one, `loaded` with a user, never the cached account, which is
 * a paint hint and would bounce a visitor off the register page.
 *
 * @param {Object} account - The session state from `useSession`
 * @param {Object} returnTo - The helper from `createReturnTo`
 * @returns {boolean} Whether the redirect is under way
 */
export const useSignedInRedirect = (account, returnTo) => {
  const navigate = useNavigate();
  const signedIn = account.loaded && Boolean(account.user);

  useEffect(() => {
    if (signedIn) {
      navigate(returnTo.consume() || '/', { replace: true });
    }
  }, [signedIn, navigate, returnTo]);

  return signedIn;
};
