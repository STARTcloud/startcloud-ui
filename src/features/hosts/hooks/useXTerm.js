import { Terminal } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';

const DEFAULTS = { theme: { background: '#101420' } };

/**
 * One xterm Terminal bound to a React element: made with the defaults
 * under `options`, the `addons` loaded in order, opened on the element
 * the answered `ref` is set on and focused, disposed when the caller
 * unmounts or `options` or `addons` change. `instance` reads null until
 * the terminal is made.
 *
 * @param {Object} [options] - `{ options, addons }`, the terminal options and the addons to load
 * @returns {{ ref: Object, instance: Terminal|null }} The ref for the element and the terminal
 */
export const useXTerm = ({ options, addons } = {}) => {
  const ref = useRef(null);
  const [instance, setInstance] = useState(null);

  useEffect(() => {
    const terminal = new Terminal({ ...DEFAULTS, ...options });
    addons?.forEach(addon => terminal.loadAddon(addon));
    if (ref.current) {
      terminal.open(ref.current);
      terminal.focus();
    }
    setInstance(terminal);
    return () => {
      terminal.dispose();
      setInstance(null);
    };
  }, [options, addons]);

  return { ref, instance };
};
