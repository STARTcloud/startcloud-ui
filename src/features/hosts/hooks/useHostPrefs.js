import { useEffect, useState } from 'react';

import { loadHostPrefs, onHostPrefs } from '../utils/hostPrefs';

/**
 * The person's hosts preferences of `loadHostPrefs`, read once and again
 * after every save through `onHostPrefs`, so the wizard and the card
 * hold the same object.
 *
 * @returns {{ defaultDomain: string }} The preferences
 */
export const useHostPrefs = () => {
  const [prefs, setPrefs] = useState(loadHostPrefs);
  useEffect(() => onHostPrefs(() => setPrefs(loadHostPrefs())), []);
  return prefs;
};
