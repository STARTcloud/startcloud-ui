import { useEffect } from 'react';

/**
 * Point the `favicon` link element at the brand mark, whose file paints
 * its own light and dark variant, and at the fallback once the mark fails
 * to load, the image's own error event the signal; nothing happens when
 * the element or the URL is missing, and a failing fallback stays as it
 * is.
 *
 * @param {string} url - The mark's path
 * @param {string} [fallback] - The host's own mark, shown when the URL fails to load
 */
export const useFavicon = (url, fallback = '') => {
  useEffect(() => {
    const favicon = document.getElementById('favicon');
    if (!favicon || !url) {
      return undefined;
    }
    favicon.href = url;
    if (!fallback || fallback === url) {
      return undefined;
    }
    const probe = new Image();
    probe.onerror = () => {
      favicon.href = fallback;
    };
    probe.src = url;
    return () => {
      probe.onerror = null;
    };
  }, [url, fallback]);
};
