import { useCallback, useEffect, useState } from 'react';

import { readFolds, writeFolds } from '../utils/prefs';

/**
 * The folds of a page's section cards, kept as `folds` inside the page's
 * one `table_prefs_*` object under `prefsKey` (identity contract decision
 * 117) and in memory alone while the key is empty; a section is open
 * until folded.
 *
 * @param {string} [prefsKey] - The localStorage key of the page's prefs
 * @returns {{ folded: Function, toggle: Function }} `folded(id)` and `toggle(id)`
 */
export const useFolds = (prefsKey = '') => {
  const [folds, setFolds] = useState(() => readFolds(prefsKey));

  useEffect(() => {
    writeFolds(prefsKey, folds);
  }, [prefsKey, folds]);

  const folded = useCallback(id => Boolean(folds[id]), [folds]);
  const toggle = useCallback(id => setFolds(current => ({ ...current, [id]: !current[id] })), []);

  return { folded, toggle };
};
