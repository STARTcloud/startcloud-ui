import { createECDH, randomUUID } from 'crypto';

import { ago, missing, now, ok, pageOf } from './kit.js';
import { isAdmin, people } from './people.js';
import { publish } from './stream.js';

const HOUR_MINUTES = 60;
const OLDER = 16;
const SEEDS = [
  {
    title: 'Host Attic is unreachable',
    body: 'The server has not reached attic-1.example.com for 12 minutes.',
    type: 'ALERT',
    severity: 'CRITICAL',
    navigate: '/hosts/6',
    minutes: 12,
    read: false,
  },
  {
    title: 'A task failed on Desk',
    body: 'artifact_download: connect to host 10.12.0.48 port 443: timed out',
    type: 'SYSTEM',
    severity: 'DANGER',
    navigate: '/hosts/1',
    minutes: 35,
    read: false,
  },
  {
    title: 'New sign-in to your account',
    body: 'A browser you have not used before signed in from Springfield, US.',
    type: 'SECURITY',
    severity: 'WARNING',
    navigate: '/profile',
    minutes: 50,
    read: false,
  },
  {
    title: 'A person asks to join acme',
    body: 'Lena Novak sent a join request with a message.',
    type: 'ADMIN',
    severity: 'INFO',
    navigate: '/org-console/requests',
    minutes: 95,
    read: false,
  },
  {
    title: 'The snapshot volume of Zones is 91% full',
    body: 'Snapshots older than 30 days can be removed to free 212 GB.',
    type: 'SYSTEM',
    severity: 'ERROR',
    navigate: '/hosts/3',
    minutes: 140,
    read: false,
  },
  {
    title: 'Maintenance on Saturday',
    body: 'The lab hosts restart between 02:00 and 03:00 UTC.',
    type: 'MESSAGE',
    severity: 'INFO',
    navigate: 'https://status.example.com/maintenance',
    minutes: 300,
    read: true,
  },
  {
    title: 'The agent of Desk is now 1.2.0',
    body: 'The update finished without a restart of any machine.',
    type: 'SYSTEM',
    severity: 'SUCCESS',
    navigate: '/hosts/1',
    minutes: 420,
    read: true,
  },
  {
    title: 'Hyperweaver was given access to your profile',
    body: 'Scopes: openid, profile, email, organizations, notifications.',
    type: 'OAUTH',
    severity: 'INFO',
    navigate: '',
    minutes: 900,
    read: true,
  },
  {
    title: 'Your email address is verified',
    body: '',
    type: 'ACCOUNT',
    severity: 'SUCCESS',
    navigate: '/profile',
    minutes: 1500,
    read: true,
  },
];

const vapid = createECDH('prime256v1');
vapid.generateKeys();

const VAPID_KEY = vapid.getPublicKey().toString('base64url');

const subscriptions = new Map();

const rowOf = ({ title, body, type, severity, navigate, minutes, read }) => ({
  id: randomUUID(),
  title,
  body,
  type,
  severity,
  navigate,
  created_at: ago(minutes),
  read_at: read ? ago(minutes - 5) : null,
});

const olderRow = index =>
  rowOf({
    title: `Nightly backup ${index + 1} finished`,
    body: 'Every zone of store-1 was backed up.',
    type: 'SYSTEM',
    severity: 'SUCCESS',
    navigate: '/hosts/5',
    minutes: (index + 2) * 24 * HOUR_MINUTES,
    read: true,
  });

const seeded = () => [...SEEDS.map(rowOf), ...[...Array(OLDER).keys()].map(olderRow)];

const inboxes = new Map([...people.keys()].map(id => [id, seeded()]));

const inboxOf = person => {
  if (!inboxes.has(person.id)) {
    inboxes.set(person.id, []);
  }
  return inboxes.get(person.id);
};

const unreadOf = person => inboxOf(person).filter(row => !row.read_at).length;

const announce = person =>
  publish({
    topic: 'notifications',
    event: 'unread-count',
    data: { count: unreadOf(person) },
    to: person.id,
  });

/**
 * One notification put first in a person's inbox, the new unread count
 * pushed to that person alone on the `notifications` topic.
 *
 * @param {Object} person - The person
 * @param {Object} entry - `title`, `body`, `type`, `severity` and `navigate`
 * @returns {void}
 */
export const notify = (person, entry) => {
  const row = { ...rowOf({ ...entry, minutes: 0, read: false }), created_at: now() };
  inboxes.set(person.id, [row, ...inboxOf(person)]);
  announce(person);
};

export const notifyAdmins = entry => {
  [...people.values()].filter(isAdmin).forEach(person => notify(person, entry));
};

export const notifyEveryone = entry => {
  people.forEach(person => notify(person, entry));
};

const counted = ctx => ok({ count: unreadOf(ctx.person) });

const listed = ctx => {
  const { person, url } = ctx;
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  const rows = inboxOf(person).filter(row => !unreadOnly || !row.read_at);
  return ok(pageOf(rows, url));
};

const marked = readAt => ctx => {
  const row = inboxOf(ctx.person).find(entry => entry.id === ctx.params.id);
  if (!row) {
    return missing('No such notification.');
  }
  row.read_at = readAt();
  announce(ctx.person);
  return ok({ id: row.id, read_at: row.read_at });
};

const markedAll = ctx => {
  const stamp = now();
  inboxOf(ctx.person).forEach(row => {
    row.read_at ||= stamp;
  });
  announce(ctx.person);
  return ok({ count: 0 });
};

const removed = ctx => {
  const kept = inboxOf(ctx.person).filter(row => row.id !== ctx.params.id);
  inboxes.set(ctx.person.id, kept);
  announce(ctx.person);
  return ok({ id: ctx.params.id });
};

const cleared = ctx => {
  inboxes.set(ctx.person.id, []);
  announce(ctx.person);
  return ok({ count: 0 });
};

const tested = (title, body) => ctx => {
  notify(ctx.person, { title, body, type: 'MESSAGE', severity: 'INFO', navigate: '' });
  return ok({ message: 'Sent.' });
};

const pushTested = tested('A test push', 'The push switch of this browser works.');

const channelTested = tested('A test notification', 'The channel of this host works.');

const markedRead = marked(now);

const markedUnread = marked(() => null);

const subscribed = ctx => {
  subscriptions.set(String(ctx.body.endpoint || ''), ctx.person.id);
  return ok({ message: 'Subscribed.' }, 201);
};

const unsubscribed = ctx => {
  subscriptions.delete(String(ctx.body.endpoint || ''));
  return ok({ message: 'Unsubscribed.' });
};

/**
 * The inbox of the notification hub as a `backend` host proxies it: the
 * paged list, the unread count, read, unread, read all, delete and delete
 * all, the public VAPID key, a real P-256 point made at start, the
 * subscription's two routes and the two tests, each adding one row.
 *
 * @param {Object} router - `publicRoute` and `sessionRoute`
 * @returns {void}
 */
export const mountInbox = ({ publicRoute, sessionRoute }) => {
  publicRoute('GET', '/api/notifications/vapid-key', () => ok({ public_key: VAPID_KEY }));
  sessionRoute('GET', '/api/notifications', listed);
  sessionRoute('GET', '/api/notifications/unread-count', counted);
  sessionRoute('POST', '/api/notifications/read-all', markedAll);
  sessionRoute('POST', '/api/notifications/subscriptions', subscribed);
  sessionRoute('DELETE', '/api/notifications/subscriptions', unsubscribed);
  sessionRoute('POST', '/api/notifications/test/toast', pushTested);
  sessionRoute('POST', '/api/notifications/test/channel', channelTested);
  sessionRoute('POST', '/api/notifications/:id/read', markedRead);
  sessionRoute('POST', '/api/notifications/:id/unread', markedUnread);
  sessionRoute('DELETE', '/api/notifications/:id', removed);
  sessionRoute('DELETE', '/api/notifications', cleared);
};
