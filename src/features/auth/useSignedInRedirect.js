import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sends a person with a live session away from a sign-in page, to the
 * consumed `intended_url` or home, because a crafted `/login?logout` above
 * a form is a phishing frame for someone still signed in.
 *
 * @param {Object} session - The session provider
 * @param {Object} returnTo - The helper from `createReturnTo`
 * @returns {boolean} Whether the redirect is under way
 */
export const useSignedInRedirect = (session, returnTo) => {
  const navigate = useNavigate();
  const signedIn = Boolean(session.restore());

  useEffect(() => {
    if (signedIn) {
      navigate(returnTo.consume() || '/', { replace: true });
    }
  }, [signedIn, navigate, returnTo]);

  return signedIn;
};
