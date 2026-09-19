import { useEffect } from 'react';

import { useCrumb } from '../contexts/CrumbContext';

/**
 * Names the page's crumb by the data it shows: a page living at its own
 * path calls it with the name of its record, empty while the record is
 * still loading, and the shell's `CRUMB_PARENTS` resolver reads it as
 * `pageName`, drawing its own translated placeholder while the name is
 * empty; set on mount and on every change, cleared on unmount.
 *
 * @param {string} name - The name of the data the page shows
 */
export const usePageName = name => {
  const { setName } = useCrumb();
  useEffect(() => {
    setName(name);
    return () => setName('');
  }, [name, setName]);
};
