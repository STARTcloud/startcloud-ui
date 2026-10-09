import { useEffect, useRef } from 'react';

import { comboOf, isActivation, isEditableTarget, resolve } from '../lib/shortcuts';

const enabled = (rows, tools) => rows.filter(row => !row.when || row.when(tools));

/**
 * The one keydown listener of the keyboard shortcuts, mounted once by the
 * shell: a keydown whose target is an input, a select, a textarea or an
 * editable element fires nothing, and Enter on a link, a button or a menu
 * row is left to that control; every other keydown is read as a combo
 * and resolved against the rows whose `when(tools)` holds, a chord's
 * first key held until the very next keydown; the row found runs with
 * `tools` and the keydown's default is prevented.
 *
 * @param {Array<Object>} rows - The rows, `{ key, category, labelKey, keys, run, when? }`
 * @param {Object} tools - What a row's `run` and `when` receive, `{ navigate, root }`
 */
export const useShortcuts = (rows, tools) => {
  const held = useRef({ rows, tools });
  const pending = useRef('');

  useEffect(() => {
    held.current = { rows, tools };
  });

  useEffect(() => {
    const onKeyDown = event => {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }
      const combo = comboOf(event);
      if (isActivation(combo, event.target)) {
        return;
      }
      const next = resolve(enabled(held.current.rows, held.current.tools), pending.current, combo);
      const started = !pending.current && next.pending;
      pending.current = next.pending;
      if (next.hit) {
        event.preventDefault();
        next.hit.run(held.current.tools);
      } else if (started) {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
};
