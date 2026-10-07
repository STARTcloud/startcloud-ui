import { authMethod, hasFeature } from '../utils/capabilities';

const SAME_ORIGIN_PATH = /^\/(?![/\\])/;
const EVENTS_PATH = '/api/events';

export const ISSUER_TOPICS = ['notifications', 'session'];

const issuerOf = status => (authMethod(status) === 'idp' ? status.idp?.issuer || '' : '');

const advertised = (status, origin, issuer) => {
  const { path = '', topics = [] } = status.events;
  if (SAME_ORIGIN_PATH.test(path)) {
    return { origin, path, topics };
  }
  if (issuer && path === `${issuer}${EVENTS_PATH}`) {
    return { origin: issuer, path: EVENTS_PATH, topics };
  }
  return null;
};

/**
 * The one event stream a tab opens for the host behind `status`: the
 * path `events.path` names on the serving origin while the host lists
 * `events`, that path being a same-origin path or, on an `idp` host, the
 * identity provider's own `/api/events` and no other host; on an `idp`
 * host that lists `notifications` and no `events`, the identity
 * provider's stream at `{status.idp.issuer}/api/events` for the
 * `notifications` and `session` topics; none otherwise.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} origin - The serving origin the API client signs for
 * @returns {{ origin: string, path: string, topics: string[] }|null} Where the stream is opened and its topics, or null
 */
export const streamTargetFor = (status, origin) => {
  const issuer = issuerOf(status);
  if (hasFeature(status, 'events') && status?.events) {
    return advertised(status, origin, issuer);
  }
  if (issuer && hasFeature(status, 'notifications')) {
    return { origin: issuer, path: EVENTS_PATH, topics: ISSUER_TOPICS };
  }
  return null;
};

/**
 * Whether the tab opens an event stream for the host behind `status`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {boolean}
 */
export const streamsEvents = status => Boolean(streamTargetFor(status, ''));

/**
 * Whether the tab's event stream carries the `notifications` topic, so
 * the unread count and the inbox rows move by push and nothing re-reads
 * them on a menu open or after the person's own action.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {boolean}
 */
export const streamsNotifications = status =>
  Boolean(streamTargetFor(status, '')?.topics?.includes('notifications'));
