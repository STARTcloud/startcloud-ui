import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '../../../lib/logger';
import { socketUrl, wsTicket } from '../api/terminal';
import { ticketMachineOf } from '../utils/tasks';

const CONNECTING = { key: '', frames: null, state: 'connecting' };

const held = (stream, key) => (stream.key === key ? stream : { ...CONNECTING, key });

/**
 * One task's output stream, the `/tasks/{id}/stream` WebSocket the agent
 * pushes on: a ticket first, bound to the task's machine unless the task
 * is a host-level one, then the socket; every `output` frame is appended
 * to `frames`, which stays null until the first one arrives, every
 * `status` frame is handed to `onStatus`, and the socket is closed when
 * the dialog goes. A socket that closed is not opened again on a clock:
 * `state` reads `closed` and `reopen` opens a new one.
 *
 * @param {Object} options - The dialog's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object} options.task - The task row the dialog opened on
 * @param {Function} options.onStatus - Called with the status of every `status` frame
 * @returns {{ frames: Array<Object>|null, state: string, reopen: Function }} The stream
 */
export const useTaskStream = ({ status, id, task, onStatus }) => {
  const [stream, setStream] = useState(CONNECTING);
  const [attempt, setAttempt] = useState(0);
  const onStatusRef = useRef(onStatus);
  const taskId = task.id;
  const machine = ticketMachineOf(task);
  const key = `${id}|${taskId}|${attempt}`;

  useEffect(() => {
    onStatusRef.current = onStatus;
  });

  useEffect(() => {
    let live = true;
    let socket = null;
    let count = 0;

    const onMessage = event => {
      if (!live) {
        return;
      }
      const frame = JSON.parse(event.data);
      if (frame.type === 'status') {
        onStatusRef.current(frame.status);
        return;
      }
      if (frame.type !== 'output') {
        return;
      }
      count += 1;
      const entry = { ...frame, uid: `stream-${count}` };
      setStream(previous => {
        const current = held(previous, key);
        return { ...current, frames: [...(current.frames || []), entry] };
      });
    };

    const onOpen = () => setStream(previous => ({ ...held(previous, key), state: 'open' }));

    const onClose = () => {
      if (live) {
        setStream(previous => ({ ...held(previous, key), state: 'closed' }));
      }
    };

    wsTicket(status, id, machine)
      .then(({ ticket }) => {
        if (!live) {
          return;
        }
        socket = new WebSocket(socketUrl(status, id, `tasks/${taskId}/stream`, ticket));
        socket.addEventListener('open', onOpen);
        socket.addEventListener('message', onMessage);
        socket.addEventListener('close', onClose);
      })
      .catch(error => {
        log.api.error('Error opening task stream', { task_id: taskId, error: error.message });
        onClose();
      });

    return () => {
      live = false;
      socket?.close();
    };
  }, [status, id, taskId, machine, key]);

  const reopen = useCallback(() => setAttempt(previous => previous + 1), []);
  const current = held(stream, key);

  return { frames: current.frames, state: current.state, reopen };
};
