import { hasFeature } from '../../utils/capabilities';

import { boxes } from './boxes';
import { isos } from './isos';
import { provisioners } from './provisioners';

const REGISTRY = { boxes, isos, provisioners };

const withoutWatches = collection => ({
  ...collection,
  adapter: { ...collection.adapter, watches: null },
});

/**
 * The collections a host mounts, in the order `status.collections` names
 * them, the first being the implicit one with no route segment; the watch
 * calls are dropped from every adapter when the host does not advertise
 * `watches`, which hides the stars and the Watched filter.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Array<Object>} The collection definitions
 */
export const collectionsFor = status =>
  (status.collections || [])
    .map(token => REGISTRY[token])
    .map(collection => (hasFeature(status, 'watches') ? collection : withoutWatches(collection)));
