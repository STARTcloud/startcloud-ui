import { useCallback, useEffect, useRef, useState } from 'react';

const WIDTH_KEY = 'sidebar_width';
const MINIMIZED_KEY = 'sidebar_minimized';
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 260;

const clampWidth = value => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

const storedWidth = () => {
  const value = Number(localStorage.getItem(WIDTH_KEY));
  return value ? clampWidth(value) : DEFAULT_WIDTH;
};

const storedMinimized = () => localStorage.getItem(MINIMIZED_KEY) === 'true';

const persistMinimized = minimized => {
  if (minimized) {
    localStorage.setItem(MINIMIZED_KEY, 'true');
  } else {
    localStorage.removeItem(MINIMIZED_KEY);
  }
};

/**
 * The size of the sidebar of the navbar contract's Sidebar section, held
 * by the shell so that the column's own edge and the footer's corner
 * handle move one value: the width, 260px by default and 180 to 400px,
 * and whether the column is the rail, each persisted per origin under
 * `sidebar_width` and `sidebar_minimized`. `asideRef` is the column's
 * element, the width measured from its left edge; `startResize` begins
 * the drag of the column's own edge, followed on the window until the
 * pointer lifts; `dragTo(clientX)` sets the width from a pointer a
 * caller already holds and `persist()` stores it when that pointer
 * lifts, the two the footer's corner handle drives.
 *
 * @returns {Object} `{ asideRef, width, minimized, limits, toggleMinimized, startResize, dragTo, persist }`
 */
export const useSidebarSize = () => {
  const asideRef = useRef(null);
  const dragging = useRef(false);
  const [minimized, setMinimized] = useState(storedMinimized);
  const [width, setWidth] = useState(storedWidth);

  const dragTo = useCallback(clientX => {
    if (!asideRef.current) {
      return;
    }
    setWidth(clampWidth(clientX - asideRef.current.getBoundingClientRect().left));
  }, []);

  const persist = useCallback(() => {
    setWidth(current => {
      localStorage.setItem(WIDTH_KEY, String(current));
      return current;
    });
  }, []);

  useEffect(() => {
    const onMove = event => {
      if (dragging.current) {
        dragTo(event.clientX);
      }
    };
    const onUp = () => {
      if (!dragging.current) {
        return;
      }
      dragging.current = false;
      persist();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragTo, persist]);

  const startResize = useCallback(() => {
    dragging.current = true;
  }, []);

  const toggleMinimized = useCallback(() => {
    setMinimized(previous => {
      persistMinimized(!previous);
      return !previous;
    });
  }, []);

  return {
    asideRef,
    width,
    minimized,
    limits: { min: MIN_WIDTH, max: MAX_WIDTH },
    toggleMinimized,
    startResize,
    dragTo,
    persist,
  };
};
