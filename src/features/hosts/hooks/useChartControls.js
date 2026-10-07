import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';

import { newestOf } from '../../../utils/chart';
import { windowMs } from '../utils/monitoring';

export const ChartControlsContext = createContext(null);

const LIVE = { paused: false, held: null };

const NO_CONTROLS = {
  ...LIVE,
  windowMs: 0,
  group: '',
  toggle: () => undefined,
  pan: () => undefined,
  respan: () => undefined,
};

const sameRange = (first, second) =>
  Boolean(first && second) && first.from === second.from && first.to === second.to;

/**
 * The chart controls of one page, the value its `ChartControlsContext`
 * provides to every chart on it: `paused`, whether the charts hold their
 * drawn range while samples keep landing in the store; `held`, the one
 * range every chart draws after a pan or a zoom, null while each follows
 * its own; `windowMs`, the page's window; `group`, the name the page's
 * charts share their crosshair under; `toggle`, Pause and Resume;
 * `pan(range, atEnd)`, a pan or a zoom, which holds the range and pauses
 * unless it reached the newest sample, when the charts follow live
 * again; and `respan(ms)`, the held range widened or narrowed to a new
 * window from its end.
 *
 * @param {string} window - The page's window key
 * @returns {Object} The controls
 */
export const useChartControlsState = window => {
  const [state, setState] = useState(LIVE);
  const group = useId();
  const span = windowMs(window);

  const toggle = useCallback(() => {
    setState(current => (current.paused ? LIVE : { paused: true, held: null }));
  }, []);

  const pan = useCallback((range, atEnd) => {
    setState(current => {
      if (atEnd) {
        return current.paused || current.held ? LIVE : current;
      }
      return sameRange(current.held, range) ? current : { paused: true, held: range };
    });
  }, []);

  const respan = useCallback(ms => {
    setState(current =>
      current.held
        ? { ...current, held: { from: current.held.to - ms, to: current.held.to } }
        : current
    );
  }, []);

  return useMemo(
    () => ({ ...state, windowMs: span, group, toggle, pan, respan }),
    [state, span, group, toggle, pan, respan]
  );
};

/**
 * The chart controls of the page a chart sits on, live and unpaused with
 * no group where the page provides none.
 *
 * @returns {Object} The controls of `useChartControlsState`
 */
export const useChartControls = () => useContext(ChartControlsContext) || NO_CONTROLS;

/**
 * A value as it was the moment `held` became true, and the value itself
 * while `held` is false.
 *
 * @param {*} value - The live value
 * @param {boolean} held - Whether to keep the value
 * @returns {*} The value drawn
 */
export const useHeld = (value, held) => {
  const [kept, setKept] = useState({ held, value });
  if (kept.held !== held) {
    setKept({ held, value });
    return value;
  }
  return held ? kept.value : value;
};

/**
 * The range one chart draws: the page's held range after a pan or a
 * zoom; otherwise the window before the newest point its series hold,
 * frozen while the page is paused; null while no series holds a point.
 *
 * @param {Array<Object>} series - The chart's series
 * @param {Object} controls - The page's chart controls
 * @returns {{ from: number, to: number }|null} The range
 */
export const useDrawnRange = (series, controls) => {
  const newest = newestOf(series);
  const live = useMemo(
    () => (newest === null ? null : { from: newest - controls.windowMs, to: newest }),
    [newest, controls.windowMs]
  );
  const frozen = useHeld(live, controls.paused);
  return controls.held || frozen;
};
