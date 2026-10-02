import { useEffect, useRef, useState } from 'react';

import { log } from '../../../lib/logger';
import { fetchScreenshot } from '../api/machines';

const NONE = { machine: '', url: '' };

/**
 * One frame of a machine's screen for the console's placeholder, `GET
 * machines/{name}/vnc/screenshot` read as a blob into an object URL,
 * hyperweaver-ui's console screenshot: read once while `asked` and again
 * when `turn` moves, the console's own Refresh screenshot and the page's
 * Refresh, never on a clock, hyperweaver-ui's five-minute read not
 * carried over; the URL of the frame before it is released as the next
 * lands and the last one when the console goes.
 *
 * @param {Object} options - The status, the host, the machine, whether to ask and the turn
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name
 * @param {boolean} options.asked - Whether a frame is wanted
 * @param {string|number} options.turn - Moves when a new frame is wanted
 * @returns {string} The URL, empty until a frame answered
 */
export const useConsoleScreenshot = ({ status, id, name, asked, turn }) => {
  const [held, setHeld] = useState(NONE);
  const current = useRef('');
  const machine = `${id}|${name}`;

  useEffect(() => {
    if (!asked) {
      return undefined;
    }
    let live = true;
    fetchScreenshot(status, id, name)
      .then(blob => {
        if (!live || !(blob instanceof Blob) || blob.size === 0) {
          return;
        }
        const url = URL.createObjectURL(blob);
        if (current.current) {
          URL.revokeObjectURL(current.current);
        }
        current.current = url;
        setHeld({ machine: `${id}|${name}`, url });
      })
      .catch(error => {
        log.api.error('Error fetching the console screenshot', { id, name, error: error.message });
      });
    return () => {
      live = false;
    };
  }, [asked, status, id, name, turn]);

  useEffect(
    () => () => {
      if (current.current) {
        URL.revokeObjectURL(current.current);
        current.current = '';
      }
    },
    []
  );

  return asked && held.machine === machine ? held.url : '';
};
