import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * The gate every operator page passes: a visitor is sent to sign in with
 * the page as the return path, and a signed-in person without the admin
 * role home.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.session - The session provider
 * @param {Object} options.returnTo - The helper from `createReturnTo`
 * @param {boolean} options.allowed - The app's global-admin flag
 * @returns {boolean} Whether the page may draw
 */
export const useAdminGate = ({ session, returnTo, allowed }) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const signedIn = Boolean(session.restore());

  useEffect(() => {
    if (!signedIn) {
      navigate(returnTo.signInTo(`${pathname}${search}`));
      return;
    }
    if (!allowed) {
      navigate('/');
    }
  }, [allowed, navigate, pathname, returnTo, search, signedIn]);

  return signedIn && allowed;
};
