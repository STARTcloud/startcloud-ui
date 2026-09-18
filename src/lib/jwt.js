export const decodeBase64url = segment => {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

export const decodeJwt = token => {
  const [, payload = ''] = String(token || '').split('.');
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64url(payload)));
  } catch {
    return null;
  }
};

/**
 * The client an ID token was issued to: its `aud` claim, a string or the
 * first member of an array (OpenID Connect Core 1.0 §2), empty when the
 * claims carry none.
 * @param {Object|null} claims - The decoded ID token
 * @returns {string} The client id
 */
export const audienceOf = claims => {
  const aud = claims?.aud;
  if (typeof aud === 'string') {
    return aud;
  }
  return Array.isArray(aud) && typeof aud[0] === 'string' ? aud[0] : '';
};
