import { useCallback, useMemo, useState } from 'react';

import { patchConfigFile } from '../api/manage';
import { templateSourceFor, templateSourceFormOf } from '../utils/machineCreate';
import { sourceEntryPatch } from '../utils/manageCatalog';

const IDLE = { state: '', message: '' };

/**
 * The registry of a handed box the host does not hold, the Box step's
 * card: `add` while the host's registries have answered and none of them
 * is the one the box's `box_url` names, the one the agent's create would
 * download from; `adding` from the press, which writes the registry as
 * the Templates section writes one, one merge patch of
 * `PUT config/storage` over `/template_sources/sources` under the id of
 * the registry's host, its display name and its origin, and reads the
 * registries again through `onAdded`; `failed` with the agent's word and
 * Retry. Nothing is offered while the seed names no box URL, and
 * nothing runs on a clock.
 *
 * @param {Object} options - The host, the handed box and the registries held
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.box - The box of `seedBoxOf`
 * @param {Array<Object>} options.sources - The sources of `GET templates/sources`
 * @param {boolean} options.loaded - Whether the sources answered
 * @param {Function} options.onAdded - Reads the sources again
 * @returns {{ state: string, offered: boolean, host: string, message: string, add: Function, retry: Function }} The card's state
 */
export const useTemplateSource = ({ status, id, box, sources, loaded, onAdded }) => {
  const [held, setHeld] = useState(IDLE);
  const boxUrl = box?.box_url || '';
  const form = useMemo(() => (boxUrl ? templateSourceFormOf(boxUrl) : null), [boxUrl]);
  const offered = Boolean(form) && loaded && !templateSourceFor(sources, boxUrl);

  const add = useCallback(() => {
    if (!form) {
      return Promise.resolve();
    }
    setHeld({ state: 'adding', message: '' });
    return patchConfigFile(status, id, 'storage', sourceEntryPatch(sources, form, '')).then(
      () => Promise.resolve(onAdded()).then(() => setHeld(IDLE)),
      error => setHeld({ state: 'failed', message: error.message || '' })
    );
  }, [status, id, form, sources, onAdded]);

  return useMemo(
    () => ({
      state: offered ? held.state || 'add' : '',
      offered,
      host: form?.displayName || '',
      message: held.message,
      add,
      retry: add,
    }),
    [offered, held, form, add]
  );
};
