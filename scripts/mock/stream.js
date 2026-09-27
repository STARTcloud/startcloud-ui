import { AGENT_MODE } from './kit.js';

const RETRY_MS = 3000;
const HEARTBEAT_MS = 25000;
const RING_MAX_EVENTS = 500;
const RING_MAX_AGE_MS = 5 * 60 * 1000;

export const CORE_TOPICS = ['session', 'notifications', 'health', 'profile'];
export const HOST_TOPICS = ['tasks', 'hosts', 'monitoring'];
export const TOPICS = [...CORE_TOPICS, ...HOST_TOPICS];

const ring = [];
const subscribers = new Set();
const clock = { ms: 0, seq: 0 };

const nextId = () => {
  const current = Math.max(Date.now(), clock.ms);
  if (current === clock.ms) {
    clock.seq += 1;
  } else {
    clock.ms = current;
    clock.seq = 0;
  }
  return `${current}-${clock.seq}`;
};

const floorId = nextId();

const newestId = () => `${clock.ms}-${clock.seq}`;

const parseId = id => {
  const [ms, sequence] = String(id).split('-');
  return [Number(ms), Number(sequence)];
};

const compareIds = (first, second) => {
  const [firstMs, firstSeq] = parseId(first);
  const [secondMs, secondSeq] = parseId(second);
  return firstMs === secondMs ? firstSeq - secondSeq : firstMs - secondMs;
};

const isValidId = id => parseId(id).every(Number.isFinite);

const oldestId = () => (ring.length ? ring[0].id : floorId);

const sseFrame = (id, event, data) =>
  `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const requestedTopics = query => {
  const requested = String(query || '')
    .split(',')
    .map(topic => topic.trim())
    .filter(topic => TOPICS.includes(topic));
  return new Set(requested.length ? [...requested, ...CORE_TOPICS] : TOPICS);
};

const armHeartbeat = subscriber => {
  clearInterval(subscriber.heartbeat);
  subscriber.heartbeat = setInterval(() => {
    subscriber.res.write(':hb\n\n');
  }, HEARTBEAT_MS);
  subscriber.heartbeat.unref();
};

const writeStream = (subscriber, text) => {
  subscriber.res.write(text);
  armHeartbeat(subscriber);
};

const trimRing = () => {
  const cutoff = Date.now() - RING_MAX_AGE_MS;
  while (ring.length > RING_MAX_EVENTS && ring[0].at < cutoff) {
    ring.shift();
  }
};

const reaches = (entry, subscriber) =>
  subscriber.topics.has(entry.topic) && (entry.to === null || entry.to === subscriber.person);

const replay = (subscriber, lastEventId) => {
  if (!lastEventId) {
    return;
  }
  if (
    !isValidId(lastEventId) ||
    compareIds(lastEventId, oldestId()) < 0 ||
    compareIds(lastEventId, newestId()) > 0
  ) {
    writeStream(subscriber, sseFrame(nextId(), 'reset', { topics: [...subscriber.topics] }));
    return;
  }
  ring
    .filter(entry => compareIds(entry.id, lastEventId) > 0 && reaches(entry, subscriber))
    .forEach(entry => writeStream(subscriber, sseFrame(entry.id, entry.event, entry.data)));
};

/**
 * The one event stream of the events contract, `GET /api/events`: `retry`,
 * `ready` with the topics the caller asked for and the core topics, the
 * ring replayed after a `Last-Event-ID` it still holds and `reset`
 * otherwise, and `:hb` after 25 idle seconds.
 *
 * @param {Object} ctx - The request's context, its `person` the recipient
 * @returns {null} Nothing, the response stays open
 */
export const openStream = ctx => {
  const { req, res, url, person } = ctx;
  const topics = requestedTopics(url.searchParams.get('topics'));
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  req.setTimeout(0);
  res.setTimeout(0);
  const subscriber = { res, topics, person: person.id, heartbeat: null };
  subscribers.add(subscriber);
  res.on('close', () => {
    clearInterval(subscriber.heartbeat);
    subscribers.delete(subscriber);
  });
  const id = nextId();
  writeStream(
    subscriber,
    `retry: ${RETRY_MS}\n${sseFrame(id, 'ready', { id, topics: [...topics] })}`
  );
  replay(subscriber, req.headers['last-event-id']);
  return null;
};

/**
 * One event kept in the ring and written to every open stream that reads
 * its topic, to the one person `to` names or to everyone when it names
 * none.
 *
 * @param {Object} entry - `topic`, `event`, `data` and the recipient `to`
 * @returns {void}
 */
export const publish = ({ topic, event, data, to = null }) => {
  const entry = { id: nextId(), at: Date.now(), topic, event, data, to };
  ring.push(entry);
  trimRing();
  subscribers.forEach(subscriber => {
    if (reaches(entry, subscriber)) {
      writeStream(subscriber, sseFrame(entry.id, event, data));
    }
  });
};

export const broadcast = (topic, event, data) => publish({ topic, event, data });

export const emit = ({ host, topic, event, data }) =>
  broadcast(topic, event, AGENT_MODE ? { ...data } : { ...data, agent_id: host.id });

export const closeStreamsOf = person => {
  subscribers.forEach(subscriber => {
    if (subscriber.person === person) {
      subscriber.res.end();
    }
  });
};
