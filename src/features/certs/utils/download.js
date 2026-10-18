const save = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

/**
 * Hands the browser a text file to save under the type and the name
 * given, through one object URL revoked once the click has gone out.
 *
 * @param {string} text - The file's content
 * @param {string} type - Its media type
 * @param {string} filename - The name the browser saves it under
 */
export const downloadText = (text, type, filename) => save(new Blob([text], { type }), filename);

/**
 * Hands the browser a binary file to save under the type and the name
 * given.
 *
 * @param {Uint8Array} bytes - The file's bytes
 * @param {string} mime - Its media type
 * @param {string} filename - The name the browser saves it under
 */
export const downloadBytes = (bytes, mime, filename) =>
  save(new Blob([bytes], { type: mime }), filename);

/**
 * The text of the engine's bytes, the UTF-8 the text formats write.
 *
 * @param {Uint8Array} bytes - The engine's bytes
 * @returns {string} The text
 */
export const textOf = bytes => new TextDecoder().decode(bytes);

/**
 * The bytes a base64 DER stands for.
 *
 * @param {string} b64 - The DER as base64
 * @returns {Uint8Array} The bytes
 */
export const bytesOf = b64 => Uint8Array.from(atob(b64), char => char.charCodeAt(0));
