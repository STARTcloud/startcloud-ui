import { useState } from 'react';

/**
 * The source an image shows: the fallback while the source it was handed
 * is the one that failed, else the source itself.
 *
 * @param {string} src - The source the image was handed
 * @param {string} fallback - The host's own mark
 * @param {string} failed - The source whose load failed, empty while none did
 * @returns {string} The source to show
 */
export const shownSrc = (src, fallback, failed) => (failed === src ? fallback : src);

/**
 * The failed source after an error event: the source the image was handed
 * while it is not the fallback and has not failed before, so the swap to
 * the fallback happens once and a failing fallback changes nothing.
 *
 * @param {string} src - The source the image was handed
 * @param {string} fallback - The host's own mark
 * @param {string} failed - The source whose load failed, empty while none did
 * @returns {string} The source whose load failed
 */
export const failedAfter = (src, fallback, failed) =>
  failed === src || src === fallback ? failed : src;

/**
 * An image source with the host's mark as its one fallback: the source
 * shown and the `onError` handler that swaps it once to the fallback,
 * never again, so a pack logo that fails to load paints the host's mark
 * and a failing host mark stays as it is.
 *
 * @param {string} src - The source the image was handed
 * @param {string} fallback - The host's own mark
 * @returns {{ src: string, onError: Function }} The source to show and the error handler
 */
export const useFallbackSrc = (src, fallback) => {
  const [failed, setFailed] = useState('');
  return {
    src: shownSrc(src, fallback, failed),
    onError: () => setFailed(current => failedAfter(src, fallback, current)),
  };
};
