import { Terminal } from '@xterm/xterm';
import { useEffect, useMemo, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';

const DEFAULTS = { theme: { background: '#101420' } };

/**
 * One xterm Terminal bound to a React element: made with the defaults
 * under `options` and the `addons` loaded in order, made again when
 * either changes, opened on the element the answered `ref` is set on and
 * focused once that element is mounted, disposed when it is replaced or
 * the caller unmounts.
 *
 * @param {Object} [options] - `{ options, addons }`, the terminal options and the addons to load
 * @returns {{ ref: Object, instance: Terminal }} The ref for the element and the terminal
 */
export const useXTerm = ({ options, addons } = {}) => {
  const ref = useRef(null);
  const instance = useMemo(() => {
    const terminal = new Terminal({ ...DEFAULTS, ...options });
    addons?.forEach(addon => terminal.loadAddon(addon));
    return terminal;
  }, [options, addons]);

  useEffect(() => {
    if (ref.current) {
      instance.open(ref.current);
      instance.focus();
    }
    return () => instance.dispose();
  }, [instance]);

  return { ref, instance };
};
