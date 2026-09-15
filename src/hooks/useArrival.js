import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const FOCUSABLE = '[tabindex], a[href], button, input, select, textarea';

const focusRow = node => {
  const target = node.matches(FOCUSABLE) ? node : node.querySelector(FOCUSABLE);
  (target || node).focus({ preventScroll: true });
};

/**
 * The row a page arrived at, the pages contract's arrival rule: the URL's
 * hash names the row, read on mount and on every hash change, and the row
 * the page registers under that id is scrolled into view and given focus
 * once the rows are rendered, once per arrival and with nothing painted.
 *
 * @param {Array} rows - The rows the page has rendered, so the arrival runs when they arrive
 * @returns {{ key: string, ref: Function }} The arrived key and the ref every row registers with
 */
export const useArrival = (rows = []) => {
  const { hash } = useLocation();
  const key = hash ? decodeURIComponent(hash.slice(1)) : '';
  const nodes = useRef(new Map());
  const arrived = useRef('');

  const ref = useCallback(
    id => node => {
      if (node) {
        nodes.current.set(String(id), node);
      } else {
        nodes.current.delete(String(id));
      }
    },
    []
  );

  useEffect(() => {
    if (!key) {
      arrived.current = '';
      return;
    }
    const node = nodes.current.get(key);
    if (!node || arrived.current === key) {
      return;
    }
    arrived.current = key;
    node.scrollIntoView({ block: 'center' });
    focusRow(node);
  }, [key, rows]);

  return { key, ref };
};
