const toBase64Url = buffer => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = value => {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const decodeCredentials = list =>
  (list || []).map(credential => ({
    id: fromBase64Url(credential.id),
    type: credential.type,
    transports: credential.transports,
  }));

/**
 * Whether this browser can create and use WebAuthn credentials.
 * @returns {boolean}
 */
export const isSupported = () =>
  Boolean(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get
  );

/**
 * WebAuthn Level 3's own test for the conditional (autofill) prompt.
 * @returns {Promise<boolean>}
 */
export const conditionalMediationAvailable = () => {
  if (!isSupported() || typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') {
    return Promise.resolve(false);
  }
  return PublicKeyCredential.isConditionalMediationAvailable().catch(() => false);
};

/**
 * The server's `PublicKeyCredentialRequestOptions` with its base64url
 * members decoded to buffers.
 * @param {Object} options - The options the server answered
 * @returns {Object}
 */
export const decodeRequestOptions = options => ({
  challenge: fromBase64Url(options.challenge),
  timeout: options.timeout,
  rpId: options.rpId,
  userVerification: options.userVerification,
  ...(options.allowCredentials
    ? { allowCredentials: decodeCredentials(options.allowCredentials) }
    : {}),
});

/**
 * The server's `PublicKeyCredentialCreationOptions` with its base64url
 * members decoded to buffers.
 * @param {Object} options - The options the server answered
 * @returns {Object}
 */
export const decodeCreationOptions = options => ({
  rp: options.rp,
  user: {
    id: fromBase64Url(options.user.id),
    name: options.user.name,
    displayName: options.user.displayName,
  },
  challenge: fromBase64Url(options.challenge),
  pubKeyCredParams: options.pubKeyCredParams,
  timeout: options.timeout,
  attestation: options.attestation,
  authenticatorSelection: options.authenticatorSelection,
  ...(options.excludeCredentials
    ? { excludeCredentials: decodeCredentials(options.excludeCredentials) }
    : {}),
});

/**
 * An assertion from `navigator.credentials.get()` as the JSON the server takes.
 * @param {PublicKeyCredential} credential - The assertion
 * @returns {Object}
 */
export const encodeAssertion = credential => {
  const { response } = credential;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment,
    type: credential.type,
  };
};

/**
 * An attestation from `navigator.credentials.create()` as the JSON the server takes.
 * @param {PublicKeyCredential} credential - The new credential
 * @returns {Object}
 */
export const encodeAttestation = credential => {
  const { response } = credential;
  const encoded = {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    response: {
      attestationObject: toBase64Url(response.attestationObject),
      clientDataJSON: toBase64Url(response.clientDataJSON),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment,
    type: credential.type,
  };
  if (typeof response.getTransports === 'function') {
    encoded.response.transports = response.getTransports();
  }
  return encoded;
};

/**
 * Whether a rejection is the abort of a pending request rather than a failure.
 * @param {Error} error - The rejection
 * @returns {boolean}
 */
export const isAbort = error => error?.name === 'AbortError';

/**
 * One passkey sign-in: fetch the request options, run the browser's `get()`
 * (conditional under `signal` when asked) and verify the assertion; answers
 * whatever `verify` answers. The two calls are the app's own API functions.
 *
 * @param {Object} options - The sign-in
 * @param {() => Promise<Object>} options.requestOptions - Fetches the request options
 * @param {(assertion: Object) => Promise<Object>} options.verify - Verifies the encoded assertion
 * @param {boolean} [options.conditional] - Run the conditional (autofill) prompt
 * @param {AbortSignal} [options.signal] - Aborts the pending prompt
 * @returns {Promise<Object>} The verify answer
 */
export const authenticate = async ({ requestOptions, verify, conditional = false, signal }) => {
  if (!isSupported()) {
    throw new Error('WebAuthn is not supported by this browser');
  }
  const options = await requestOptions();
  const credential = await navigator.credentials.get({
    publicKey: decodeRequestOptions(options),
    ...(conditional ? { mediation: 'conditional' } : {}),
    ...(signal ? { signal } : {}),
  });
  if (!credential) {
    throw new Error('No credential returned');
  }
  return verify(encodeAssertion(credential));
};

/**
 * One passkey registration: fetch the creation options, run the browser's
 * `create()` and register the attestation under `label`.
 *
 * @param {Object} options - The registration
 * @param {() => Promise<Object>} options.creationOptions - Fetches the creation options
 * @param {(body: Object) => Promise<Object>} options.register - Registers `{ publicKey: { credential, label } }`
 * @param {string} options.label - The passkey's label
 * @returns {Promise<Object>} The register answer
 */
export const register = async ({ creationOptions, register: send, label }) => {
  if (!isSupported()) {
    throw new Error('WebAuthn is not supported by this browser');
  }
  const options = await creationOptions();
  const credential = await navigator.credentials.create({
    publicKey: decodeCreationOptions(options),
  });
  if (!credential) {
    throw new Error('No credential returned');
  }
  return send({ publicKey: { credential: encodeAttestation(credential), label } });
};
