import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  browserFactsPatch,
  detectedHourCycle,
  detectedLocale,
  detectedZone,
  deviceMode,
  deviceMotion,
} from '../utils/browserFacts';

const countryOf = answer =>
  typeof answer?.country_code === 'string' ? answer.country_code.toUpperCase() : '';

/**
 * Reads the account's preferences, gathers the browser's facts and sends
 * the one patch `browserFactsPatch` yields, nothing when it yields
 * nothing; the country is asked of `api.geo` only while the account's
 * `region` is `null`. Every failure is swallowed.
 *
 * @param {{ read: Function, save: Function, geo: Function }} api - The identity provider's calls
 * @param {string} language - The language the UI is drawn in
 * @returns {Promise<Object|null>} The patch sent, or null when none was
 */
export const saveBrowserFacts = async (api, language) => {
  const preferences = await api.read();
  const region = preferences?.region === null ? countryOf(await api.geo().catch(() => null)) : '';
  const patch = browserFactsPatch(preferences, {
    timezone: detectedZone(),
    language,
    locale: detectedLocale(),
    hour_cycle: detectedHourCycle(),
    region,
    device_mode: deviceMode(),
    device_motion: deviceMotion(),
  });
  if (Object.keys(patch).length === 0) {
    return null;
  }
  await api.save(patch);
  return patch;
};

/**
 * Saves what the browser knows of a person to their account once per
 * session, on the first signed-in load: while `enabled`, the account's
 * preferences are read and one `PATCH /api/user/preferences` carries the
 * members `browserFactsPatch` yields, the five facts filled only while
 * the account holds `null`, the two `device_` members while they differ
 * from the account's, and nothing is sent when nothing is yielded; a
 * failed read or save changes nothing on screen, and the run arms again
 * once `enabled` falls, so the next person on the tab is served too.
 *
 * @param {Object} options - The session's side
 * @param {boolean} options.enabled - A signed-in load the identity provider made, not guest-only
 * @param {{ read: Function, save: Function, geo: Function }} options.api - The identity provider's calls
 */
export const useBrowserFacts = ({ enabled, api }) => {
  const { i18n } = useTranslation();
  const done = useRef(false);

  useEffect(() => {
    if (!enabled) {
      done.current = false;
      return;
    }
    if (done.current) {
      return;
    }
    done.current = true;
    saveBrowserFacts(api, i18n.language).catch(() => null);
  }, [enabled, api, i18n]);
};
