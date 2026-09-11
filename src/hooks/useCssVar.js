import { useLayoutEffect } from 'react';

/**
 * Set one CSS custom property on the element a ref holds, through the
 * CSSOM before paint, and remove it again for a null value; the
 * stylesheet's class reads the property, so a runtime number reaches the
 * layout while the element carries no style attribute of its own.
 *
 * @param {import('react').RefObject<HTMLElement>} ref - The element
 * @param {string} name - The custom property, `--` included
 * @param {string|null} value - The value, null to remove it
 */
export const useCssVar = (ref, name, value) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (value === null || value === undefined) {
      element.style.removeProperty(name);
    } else {
      element.style.setProperty(name, value);
    }
  }, [ref, name, value]);
};
