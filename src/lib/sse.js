const DEFAULT_RETRY_MS = 3000;
const MAX_RETRY_MS = 30000;
const STREAM_TYPE = 'text/event-stream';

const parseData = text => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const createParser = (onFrame, onRetry) => {
  let buffer = '';
  let event = '';
  let data = [];
  let id = null;

  const dispatch = () => {
    if (data.length > 0 || event) {
      onFrame({ event: event || 'message', data: data.join('\n'), id });
    }
    event = '';
    data = [];
    id = null;
  };

  const handleLine = line => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) {
      return;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      data.push(value);
    } else if (field === 'id' && !value.includes('\0')) {
      id = value;
    } else if (field === 'retry' && /^\d+$/.test(value)) {
      onRetry(Number(value));
    }
  };

  return chunk => {
    buffer += chunk;
    let index = buffer.search(/\r\n|\r|\n/);
    while (index !== -1) {
      const breakLength = buffer.startsWith('\r\n', index) ? 2 : 1;
      handleLine(buffer.slice(0, index));
      buffer = buffer.slice(index + breakLength);
      index = buffer.search(/\r\n|\r|\n/);
    }
  };
};

const withTopics = (url, topics) => {
  if (!topics || topics.length === 0) {
    return url;
  }
  const target = new URL(url, window.location.origin);
  target.searchParams.set('topics', topics.join(','));
  return target.toString();
};

const backoffMs = (retryMs, attempt) => {
  const base = Math.min(MAX_RETRY_MS, retryMs * 2 ** attempt);
  return Math.round(base * (0.5 + Math.random() * 0.5));
};

/**
 * Open the universal event stream of the events contract over `fetch`, so
 * the session's headers travel with the request: the spec's frame parser,
 * `retry` honoured, `Last-Event-ID` sent on every reconnect, a jittered
 * exponential backoff capped at thirty seconds, the connection closed while
 * the document is hidden and reopened from the last id when it is visible
 * again, a 401 handed to `onUnauthorized`, and a 403, a 204 or a response
 * that is not an event stream stopping the stream for good.
 *
 * @param {Object} options - The stream
 * @param {string} options.url - Where the request is sent
 * @param {string[]} [options.topics] - The topics to subscribe, appended as `topics=`
 * @param {Object|(() => Promise<Object>)} [options.headers] - Request headers, or a function resolving them per connection
 * @param {(name: string, data: unknown, id: string|null) => void} options.onEvent - Every named event but `ready` and `reset`
 * @param {(data: unknown) => void} [options.onReady] - The `ready` frame that opens every connection
 * @param {(data: unknown) => void} [options.onReset] - The `reset` frame when the server could not replay from the last id
 * @param {(state: string) => void} [options.onStatus] - `connecting`, `live`, `reconnecting`, `paused`, `stopped`
 * @param {() => void} [options.onUnauthorized] - The response was a 401
 * @param {AbortSignal} [options.signal] - Aborting it stops the stream
 * @returns {() => void} Stops the stream
 */
export const openEventStream = ({
  url,
  topics = [],
  headers = {},
  onEvent,
  onReady = null,
  onReset = null,
  onStatus = null,
  onUnauthorized = null,
  signal = null,
}) => {
  const target = withTopics(url, topics);
  let stopped = false;
  let paused = false;
  let attempt = 0;
  let retryMs = DEFAULT_RETRY_MS;
  let lastId = '';
  let controller = null;
  let timer = null;
  let connect = null;

  const setStatus = state => onStatus?.(state);

  const onVisibility = () => {
    if (stopped) {
      return;
    }
    if (document.hidden) {
      paused = true;
      if (timer) {
        clearTimeout(timer);
      }
      controller?.abort();
      setStatus('paused');
      return;
    }
    paused = false;
    attempt = 0;
    connect();
  };

  const stop = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    controller?.abort();
    document.removeEventListener('visibilitychange', onVisibility);
    setStatus('stopped');
  };

  const handleRetry = value => {
    retryMs = value;
  };

  const handleFrame = ({ event, data, id }) => {
    if (id !== null) {
      lastId = id;
    }
    if (event === 'message' && data === '') {
      return;
    }
    const parsed = parseData(data);
    if (event === 'ready') {
      onReady?.(parsed);
      return;
    }
    if (event === 'reset') {
      onReset?.(parsed);
      return;
    }
    onEvent(event, parsed, id);
  };

  const scheduleReconnect = () => {
    if (stopped || paused) {
      return;
    }
    setStatus('reconnecting');
    timer = setTimeout(
      () => {
        attempt += 1;
        connect();
      },
      backoffMs(retryMs, attempt)
    );
  };

  const readChunks = async (reader, decoder, parse) => {
    const { value, done } = await reader.read();
    if (value) {
      parse(decoder.decode(value, { stream: true }));
    }
    if (done) {
      return;
    }
    await readChunks(reader, decoder, parse);
  };

  const readStream = body =>
    readChunks(body.getReader(), new TextDecoder(), createParser(handleFrame, handleRetry));

  connect = async () => {
    if (stopped || paused) {
      return;
    }
    controller = new AbortController();
    setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    try {
      const requestHeaders = typeof headers === 'function' ? await headers() : headers;
      const response = await fetch(target, {
        headers: {
          ...requestHeaders,
          Accept: STREAM_TYPE,
          ...(lastId ? { 'Last-Event-ID': lastId } : {}),
        },
        signal: controller.signal,
      });
      if (response.status === 401) {
        onUnauthorized?.();
        stop();
        return;
      }
      if (response.status === 204 || response.status === 403) {
        stop();
        return;
      }
      const type = response.headers.get('Content-Type') || '';
      if (!response.ok || !type.startsWith(STREAM_TYPE) || !response.body) {
        stop();
        return;
      }
      attempt = 0;
      setStatus('live');
      await readStream(response.body);
    } catch {
      if (stopped || controller.signal.aborted) {
        return;
      }
    }
    scheduleReconnect();
  };

  document.addEventListener('visibilitychange', onVisibility);
  signal?.addEventListener('abort', stop);
  if (document.hidden) {
    paused = true;
    setStatus('paused');
  } else {
    connect();
  }
  return stop;
};
