import { useEffect } from 'react';

/**
 * Point the `favicon` link element at the brand mark, whose file paints
 * its own light and dark variant; nothing happens when the element or the
 * URL is missing.
 *
 * @param {string} url - The mark's path
 */
export const useFavicon = url => {
  useEffect(() => {
    const favicon = document.getElementById('favicon');
    if (!favicon || !url) {
      return;
    }
    favicon.href = url;
  }, [url]);
};
