import { useEffect } from 'react';

/**
 * Point the `favicon` link element at the icon for the resolved theme;
 * nothing happens when the element or either URL is missing.
 *
 * @param {string} theme - The resolved theme from `useTheme`, 'light' or 'dark'
 * @param {Object} icons - The icon URLs
 * @param {string} icons.light - The icon for the light theme
 * @param {string} icons.dark - The icon for the dark theme
 */
export const useFavicon = (theme, { light, dark }) => {
  useEffect(() => {
    const favicon = document.getElementById('favicon');
    if (!favicon || !light || !dark) {
      return;
    }
    favicon.href = theme === 'dark' ? dark : light;
  }, [theme, light, dark]);
};
