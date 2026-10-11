import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { newestOf } from '../../../utils/chart';
import { windowMs } from '../utils/monitoring';

export const ChartControlsContext = createContext(null);

const NO_CONTROLS = {
  paused: false,
  windowMs: 0,
  toggle: () => undefined,
};

const sameRange = (first, second) =>
  Boolean(first && second) && first.from === second.from && first.to === second.to;

/**
 * The chart controls of one page, the value its `ChartControlsContext`
 * provides to every chart on it: `paused`, whether the charts hold their
 * drawn range while samples keep landing in the store; `windowMs`, the
 * page's window; and `toggle`, Pause and Resume.
 *
 * @param {string} window - The page's window key
 * @returns {Object} The controls
 */
export const useChartControlsState = window => {
  const [paused, setPaused] = useState(false);
  const span = windowMs(window);

  const toggle = useCallback(() => {
    setPaused(current => !current);
  }, []);

  return useMemo(() => ({ paused, windowMs: span, toggle }), [paused, span, toggle]);
};

/**
 * The chart controls of the page a chart sits on, live and unpaused
 * where the page provides none.
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
 * The range one chart draws under the page's controls: the window before
 * the newest point its series hold, frozen while the page is paused;
 * null while no series holds a point.
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
  return useHeld(live, controls.paused);
};

/**
 * The range one chart draws and the pan that moves it, the chart's own:
 * the range a drag or a wheel inside this chart reached, held for this
 * chart alone until a pan back to the newest point releases it, re-spanned
 * from its end when the page's window changes; otherwise the range of
 * `useDrawnRange`.
 *
 * @param {Array<Object>} series - The chart's series
 * @param {Object} controls - The page's chart controls
 * @returns {{ range: { from: number, to: number }|null, pan: Function }} The range and `pan(range, atEnd)`
 */
export const useChartRange = (series, controls) => {
  const drawn = useDrawnRange(series, controls);
  const [held, setHeld] = useState(null);
  const span = controls.windowMs;

  const pan = useCallback(
    (range, atEnd) => {
      setHeld(current => {
        if (atEnd) {
          return null;
        }
        return current && sameRange(current.range, range) ? current : { range, windowMs: span };
      });
    },
    [span]
  );

  if (held && held.windowMs !== span) {
    const respanned = {
      range: { from: held.range.to - span, to: held.range.to },
      windowMs: span,
    };
    setHeld(respanned);
    return { range: respanned.range, pan };
  }

  return { range: held ? held.range : drawn, pan };
};
