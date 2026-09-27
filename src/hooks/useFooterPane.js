import { useRef, useState } from 'react';

const OPEN_KEY = 'footer_open';
const VIEW_KEY = 'footer_view';
const HEIGHT_KEY = 'footer_height';
const OPEN_HEIGHT = 130;
const CLOSE_HEIGHT = 100;
const KEY_STEP = 20;
const MAX_RATIO = 0.9;

const maxHeight = () => Math.floor(window.innerHeight * MAX_RATIO);

const clampHeight = value => Math.max(0, Math.min(maxHeight(), value));

const storedOpen = () => localStorage.getItem(OPEN_KEY) === 'true';

const storedView = () => localStorage.getItem(VIEW_KEY) || '';

const storedHeight = () => {
  const value = Number(localStorage.getItem(HEIGHT_KEY));
  return value > CLOSE_HEIGHT ? clampHeight(value) : OPEN_HEIGHT;
};

const persistOpen = open => {
  if (open) {
    localStorage.setItem(OPEN_KEY, 'true');
  } else {
    localStorage.removeItem(OPEN_KEY);
  }
};

const persistHeight = height => localStorage.setItem(HEIGHT_KEY, String(height));

const persistView = key => localStorage.setItem(VIEW_KEY, key);

/**
 * The state of the footer's pane of the navbar contract's Footer status
 * section, knowing nothing of what a view draws: whether the pane is
 * open, the view that shows and the pane's height, each persisted per
 * origin under `footer_open`, `footer_view` and `footer_height`; with no
 * saved view, or a saved view the host lacks, the pane shows the view the
 * feature marks `first`, and the first one the host has when none is
 * marked. The pane opens at
 * 130px, a drag or a key that leaves it at 100px or under closes it and
 * resets the height to 130, and it grows to ninety percent of the
 * window's height. `grip` is the handlers of the grip, pointer
 * events with the pointer captured and Up and Down moving the height by
 * 20px, all of them still while the pane is closed; `edge` is the
 * handlers of the row's top edge and of the corner, the same drag with
 * the pointer captured, and from a closed pane it starts at no height
 * and opens the pane as it is dragged up, closing again when released
 * at 100px or under; `mounted` is the
 * views that have shown since the page loaded, so a view keeps what it
 * holds while another one shows or the pane is collapsed.
 *
 * @param {Array<Object>} views - The views the feature answers, `[{ key, first?, ... }]`
 * @returns {Object} `{ open, view, shown, height, limits, mounted, show, expand, collapse, grip, edge }`
 */
export const useFooterPane = views => {
  const [open, setOpen] = useState(storedOpen);
  const [saved, setSaved] = useState(storedView);
  const [height, setHeight] = useState(storedHeight);
  const [seen, setSeen] = useState([]);
  const drag = useRef(null);
  const view =
    views.find(entry => entry.key === saved) ||
    views.find(entry => entry.first) ||
    views[0] ||
    null;
  const shown = open && view ? view.key : '';

  if (shown && !seen.includes(shown)) {
    setSeen([...seen, shown]);
  }

  const expand = () => {
    setOpen(true);
    persistOpen(true);
    setHeight(clampHeight(OPEN_HEIGHT));
    persistHeight(clampHeight(OPEN_HEIGHT));
  };

  const collapse = () => {
    setOpen(false);
    persistOpen(false);
  };

  const show = key => {
    setSaved(key);
    persistView(key);
    if (!open) {
      expand();
    }
  };

  const settle = next => {
    if (next > CLOSE_HEIGHT) {
      setOpen(true);
      persistOpen(true);
      setHeight(next);
      persistHeight(next);
      return;
    }
    collapse();
    setHeight(OPEN_HEIGHT);
    persistHeight(OPEN_HEIGHT);
  };

  const release = () => {
    if (!drag.current) {
      return;
    }
    const { last } = drag.current;
    drag.current = null;
    settle(last);
  };

  const press = (event, from) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, from, last: from };
  };

  const follow = event => {
    if (!drag.current) {
      return;
    }
    const next = clampHeight(drag.current.from + (drag.current.y - event.clientY));
    drag.current.last = next;
    setHeight(next);
    if (next > 0) {
      setOpen(true);
    }
  };

  const edge = {
    onPointerDown: event => press(event, open ? height : 0),
    onPointerMove: follow,
    onPointerUp: release,
    onPointerCancel: release,
  };

  const grip = {
    onPointerDown: event => {
      if (open) {
        press(event, height);
      }
    },
    onPointerMove: follow,
    onPointerUp: release,
    onPointerCancel: release,
    onKeyDown: event => {
      if (!open || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
        return;
      }
      event.preventDefault();
      settle(clampHeight(height + (event.key === 'ArrowUp' ? KEY_STEP : -KEY_STEP)));
    },
  };

  return {
    open,
    view,
    shown,
    height,
    limits: { min: CLOSE_HEIGHT, max: maxHeight() },
    mounted: views.filter(entry => seen.includes(entry.key)),
    show,
    expand,
    collapse,
    grip,
    edge,
  };
};
