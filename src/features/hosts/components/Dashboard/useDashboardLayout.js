import { useCallback, useState } from 'react';

const STORAGE_KEY = 'hyperweaver_dashboard_layout';

export const DASHBOARD_WIDGET_IDS = ['summary', 'quickActions', 'serverCards', 'topology'];

const defaultLayout = () =>
  DASHBOARD_WIDGET_IDS.map(id => ({ id, hidden: false, collapsed: false }));

/**
 * The dashboard's layout as hyperweaver-ui kept it, read from what was
 * saved: the known widgets in their saved order with their hidden and
 * collapsed flags, an unknown id dropped and a widget never saved
 * appended, so a saved layout survives a change of the widget set.
 *
 * @param {*} saved - The stored value
 * @returns {Array<{ id: string, hidden: boolean, collapsed: boolean }>} The layout
 */
export const normalizeLayout = saved => {
  const rows = Array.isArray(saved) ? saved.filter(row => row && typeof row.id === 'string') : [];
  const known = rows
    .filter(row => DASHBOARD_WIDGET_IDS.includes(row.id))
    .map(row => ({ id: row.id, hidden: row.hidden === true, collapsed: row.collapsed === true }));
  const missing = DASHBOARD_WIDGET_IDS.filter(id => !known.some(row => row.id === id)).map(id => ({
    id,
    hidden: false,
    collapsed: false,
  }));
  return [...known, ...missing];
};

/**
 * The layout with one widget moved to another's place.
 *
 * @param {Array<Object>} layout - The layout
 * @param {string} fromId - The widget moved
 * @param {string} toId - The widget whose place it takes
 * @returns {Array<Object>} The next layout, the same one when nothing moves
 */
export const movedLayout = (layout, fromId, toId) => {
  if (!fromId || fromId === toId) {
    return layout;
  }
  const without = layout.filter(row => row.id !== fromId);
  const moved = layout.find(row => row.id === fromId);
  const targetIndex = without.findIndex(row => row.id === toId);
  if (!moved || targetIndex === -1) {
    return layout;
  }
  return [...without.slice(0, targetIndex), moved, ...without.slice(targetIndex)];
};

const readLayout = () => {
  try {
    return normalizeLayout(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return defaultLayout();
  }
};

/**
 * The dashboard's widget layout, hyperweaver-ui's pfSense-style order
 * with a hidden and a collapsed flag a widget, kept under
 * `hyperweaver_dashboard_layout` in localStorage; a drop of one widget on
 * another moves it, and each flag toggles by id.
 *
 * @returns {{ layout: Array<Object>, draggingId: string|null, setDraggingId: Function, moveWidget: Function, toggleCollapsed: Function, toggleHidden: Function }} The layout and its moves
 */
const useDashboardLayout = () => {
  const [layout, setLayout] = useState(readLayout);
  const [draggingId, setDraggingId] = useState(null);

  const commit = useCallback(next => {
    setLayout(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const moveWidget = useCallback(
    (fromId, toId) => {
      const next = movedLayout(layout, fromId, toId);
      if (next !== layout) {
        commit(next);
      }
    },
    [layout, commit]
  );

  const toggleCollapsed = useCallback(
    id => commit(layout.map(row => (row.id === id ? { ...row, collapsed: !row.collapsed } : row))),
    [layout, commit]
  );

  const toggleHidden = useCallback(
    id => commit(layout.map(row => (row.id === id ? { ...row, hidden: !row.hidden } : row))),
    [layout, commit]
  );

  return { layout, draggingId, setDraggingId, moveWidget, toggleCollapsed, toggleHidden };
};

export default useDashboardLayout;
