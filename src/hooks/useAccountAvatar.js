import { useEffect, useState } from 'react';

import { gravatarProfile } from '../utils/gravatar';

const gravatarHashOf = (backend, user) =>
  backend && user && !user.avatarUrl ? user.emailHash : '';

/**
 * The signed-in account's avatar: the stored avatar of a backend profile,
 * else the Gravatar behind its email hash, fetched once; the provider's
 * `picture` claim for an identity-provider session; empty when signed out.
 *
 * @param {Object} options - The account
 * @param {boolean} options.backend - Whether the session is the app's own backend
 * @param {Object|null} options.user - The session's user
 * @param {Object|null} options.claims - The session's claims
 * @returns {string} The avatar URL
 */
export const useAccountAvatar = ({ backend, user, claims }) => {
  const [gravatar, setGravatar] = useState(null);
  const emailHash = gravatarHashOf(backend, user);

  useEffect(() => {
    if (!emailHash) {
      return undefined;
    }
    const controller = new AbortController();
    gravatarProfile(emailHash, controller.signal).then(profile => {
      if (profile?.avatar_url) {
        setGravatar({ emailHash, url: profile.avatar_url });
      }
    });
    return () => {
      controller.abort();
    };
  }, [emailHash]);

  if (!user) {
    return '';
  }
  if (backend) {
    const fetched = gravatar && gravatar.emailHash === user.emailHash ? gravatar.url : '';
    return user.avatarUrl || fetched;
  }
  return claims?.picture || '';
};
