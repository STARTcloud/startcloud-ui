import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const FOCUSABLE = '[tabindex], a[href], button, input, select, textarea';

const focusRow = node => {
  const target = node.matches(FOCUSABLE) ? node : node.querySelector(FOCUSABLE);
  (target || node).focus({ preventScroll: true });
};

/**
 * The row the URL's hash names, scrolled into view and focused once per
 * arrival when the rows it is among are rendered.
 *
 * @param {Array} rows - The rows the page has rendered
 * @returns {{ key: string, ref: Function }} The arrived key and `ref(id)`, the ref every row registers with
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

/**
 * The page query a page arrived with, the URL's `q`, for the page to hold
 * as its query's first value.
 *
 * @returns {string} The query, empty for none
 */
export const useArrivalQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search).get('q') || '';
};
