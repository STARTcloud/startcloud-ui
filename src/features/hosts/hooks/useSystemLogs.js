import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchLogContent, startLogStream, stopLogStream } from '../api/logs';
import { socketUrl, wsTicket } from '../api/terminal';
import {
  LOG_FILTERS,
  isFaultManagerLog,
  logParamsOf,
  logRouteOf,
  streamBodyOf,
  withStreamLine,
} from '../utils/logs';

import { useManageRead } from './useHostManage';

const IDLE = { session: null, socket: null, open: false };

/**
 * The state of the system logs, hyperweaver-ui's `SystemLogs` over the
 * Manage page's reads: the log a person selected, its content read
 * through the page's read whenever the selection or the filters change,
 * on the page's Refresh and on the viewer's own; and the live stream,
 * `POST system/logs/{name}/stream/start` then the `logs/stream/{session}`
 * WebSocket the agent pushes each line on, a ticket fetched first, the
 * newest thousand lines kept, the session stopped through
 * `DELETE system/logs/stream/{session}/stop` when the person stops it,
 * picks another log or leaves. A socket that closed says so; nothing
 * reads on a clock, hyperweaver-ui's five-second auto refresh not
 * carried over.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @returns {Object} The state and the handlers
 */
export const useSystemLogs = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState(LOG_FILTERS);
  const [stream, setStream] = useState(IDLE);
  const [streamLines, setStreamLines] = useState([]);
  const [starting, setStarting] = useState(false);
  const streamRef = useRef(IDLE);

  const content = useManageRead(
    useCallback(
      () =>
        selectedLog
          ? fetchLogContent(status, id, logRouteOf(selectedLog), logParamsOf(filters))
          : Promise.resolve(null),
      [status, id, selectedLog, filters]
    ),
    Boolean(selectedLog)
  );

  const stopStream = useCallback(() => {
    const { session, socket } = streamRef.current;
    streamRef.current = IDLE;
    setStream(IDLE);
    setStreamLines([]);
    socket?.close();
    if (session) {
      stopLogStream(status, id, session.session_id).catch(error =>
        log.api.warn('Log stream stop failed', { error: error.message })
      );
    }
  }, [status, id]);

  useEffect(() => () => streamRef.current.socket?.close(), []);

  const connect = async session => {
    const { ticket } = await wsTicket(status, id);
    const socket = new WebSocket(
      socketUrl(status, id, `logs/stream/${session.session_id}`, ticket)
    );
    socket.addEventListener('open', () => {
      streamRef.current = { session, socket, open: true };
      setStream({ session, socket, open: true });
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.type === 'log_line') {
        setStreamLines(lines =>
          withStreamLine(lines, {
            line: message.line,
            timestamp: message.timestamp,
            id: `${message.timestamp}-${lines.length}`,
          })
        );
      } else if (message.type === 'error') {
        notify('danger', t('hosts.manage.logs.streamError', { message: message.message }));
      }
    });
    socket.addEventListener('close', event => {
      if (streamRef.current.socket === socket) {
        streamRef.current = { session, socket: null, open: false };
        setStream({ session, socket: null, open: false });
        if (event.code !== 1000) {
          notify('warning', t('hosts.manage.logs.streamLost'));
        }
      }
    });
  };

  const startStream = async () => {
    if (!selectedLog || isFaultManagerLog(selectedLog)) {
      return;
    }
    setStarting(true);
    try {
      const session = await startLogStream(status, id, selectedLog.name, streamBodyOf(filters));
      streamRef.current = { session, socket: null, open: false };
      setStream({ session, socket: null, open: false });
      setStreamLines([]);
      await connect(session);
    } catch (error) {
      notify('danger', t('hosts.manage.logs.streamFailed', { message: error.message }));
    } finally {
      setStarting(false);
    }
  };

  const selectLog = logFile => {
    if (streamRef.current.session) {
      stopStream();
    }
    setSelectedLog(logFile);
  };

  const setFilter = (field, value) => setFilters(current => ({ ...current, [field]: value }));

  return {
    selectedLog,
    selectLog,
    filters,
    setFilter,
    content,
    streaming: Boolean(stream.session),
    streamOpen: stream.open,
    streamLines,
    starting,
    startStream,
    stopStream,
    clearStreamLines: () => setStreamLines([]),
  };
};
