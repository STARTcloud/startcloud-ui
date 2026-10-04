import { useEffect } from 'react';

import { useCrumb } from '../contexts/CrumbContext';

/**
 * Names the page's data for the crumbs the shell draws from the route:
 * `name`, the name of the record the page shows, empty while it is
 * still loading, and `noun`, the word the page's items go by where the
 * crumbs need one; the route's crumb resolver reads them as `pageName`
 * and `pageNoun`. Set on mount and on every change, cleared on unmount.
 *
 * @param {string} name - The name of the data the page shows
 * @param {string} [noun] - The word the page's items go by
 */
export const usePageName = (name, noun = '') => {
  const { setName, setNoun } = useCrumb();
  useEffect(() => {
    setName(name);
    setNoun(noun);
    return () => {
      setName('');
      setNoun('');
    };
  }, [name, noun, setName, setNoun]);
};
