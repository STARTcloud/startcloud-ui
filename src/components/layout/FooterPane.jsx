import PropTypes from 'prop-types';
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp, FaGripLines } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';

const MENU_EDGE = 8;
const MENU_MIN = 4;

const rowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  onClick: PropTypes.func.isRequired,
});

export const paneViewShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  Component: PropTypes.elementType.isRequired,
  tools: PropTypes.elementType,
  menu: PropTypes.arrayOf(rowShape),
  dropUp: PropTypes.arrayOf(rowShape),
});

export const paneShape = PropTypes.shape({
  open: PropTypes.bool.isRequired,
  view: paneViewShape,
  shown: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  limits: PropTypes.shape({
    min: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
  }).isRequired,
  mounted: PropTypes.arrayOf(paneViewShape).isRequired,
  show: PropTypes.func.isRequired,
  expand: PropTypes.func.isRequired,
  collapse: PropTypes.func.isRequired,
  grip: PropTypes.objectOf(PropTypes.func).isRequired,
});

const toolClass = on => (on ? 'footer-tool on' : 'footer-tool');

const within = (value, room) => Math.max(MENU_MIN, Math.min(value, room - MENU_EDGE));

const MenuRow = ({ row }) => {
  const { t } = useTranslation();
  const Icon = row.icon || null;
  return (
    <>
      {Icon ? <Icon className="me-2" /> : null}
      {t(row.labelKey)}
    </>
  );
};

MenuRow.propTypes = {
  row: rowShape.isRequired,
};

/**
 * The grip of the footer's row, the bars alone in the center slot and
 * the one drag area of the row, so that a press on a button or a link is
 * never a drag: a button the pointer drags and, focused, Up and Down
 * move, disabled while the pane is closed.
 */
export const FooterGrip = ({ pane }) => {
  const { t } = useTranslation();
  const { grip, open } = pane;
  const label = t('footer.pane.resize');
  return (
    <button
      type="button"
      className={`footer-grip mx-auto p-0 border-0 bg-transparent${open ? ' draggable' : ''}`}
      aria-label={label}
      title={label}
      disabled={!open}
      onPointerDown={grip.onPointerDown}
      onPointerMove={grip.onPointerMove}
      onPointerUp={grip.onPointerUp}
      onPointerCancel={grip.onPointerCancel}
      onKeyDown={grip.onKeyDown}
    >
      <FaGripLines />
    </button>
  );
};

FooterGrip.propTypes = {
  pane: paneShape.isRequired,
};

const toggled = (key, next) => current => {
  if (next) {
    return key;
  }
  return current === key ? '' : current;
};

const ViewToggle = ({ view, pane, menu, onMenu }) => {
  const { t } = useTranslation();
  const Icon = view.icon;
  const label = t(view.labelKey);
  const showing = pane.shown === view.key;

  if (!view.dropUp) {
    return (
      <button
        type="button"
        className={toolClass(showing)}
        title={label}
        aria-label={label}
        aria-pressed={showing}
        data-view={view.key}
        onClick={() => pane.show(view.key)}
      >
        <Icon />
      </button>
    );
  }

  const onToggle = next => {
    if (showing) {
      onMenu(toggled(view.key, next));
      return;
    }
    onMenu('');
    if (next) {
      pane.show(view.key);
    }
  };

  return (
    <Dropdown drop="up" align="end" show={showing && menu === view.key} onToggle={onToggle}>
      <Dropdown.Toggle
        as="button"
        type="button"
        bsPrefix="footer-tool"
        className={showing ? 'on' : ''}
        title={label}
        aria-label={label}
        data-view={view.key}
      >
        <Icon />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {view.dropUp.map(row => (
          <Dropdown.Item as="button" type="button" key={row.key} onClick={row.onClick}>
            <MenuRow row={row} />
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

ViewToggle.propTypes = {
  view: paneViewShape.isRequired,
  pane: paneShape.isRequired,
  menu: PropTypes.string.isRequired,
  onMenu: PropTypes.func.isRequired,
};

/**
 * The pane's controls in the footer's right cluster, after the heart: one
 * toggle per view in the order the feature answers them, the tools of
 * the view that shows, then the chevron. A toggle opens the pane on its
 * view; pressed on the view that shows, it opens that view's drop-up
 * when the view has one and does nothing otherwise; the chevron
 * collapses and expands the pane.
 */
export const FooterTools = ({ pane, views }) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState('');
  const Tools = pane.open && pane.view?.tools ? pane.view.tools : null;
  const chevron = t(pane.open ? 'footer.pane.collapse' : 'footer.pane.expand');
  return (
    <div className="footer-tools">
      {views.map(view => (
        <ViewToggle key={view.key} view={view} pane={pane} menu={menu} onMenu={setMenu} />
      ))}
      {Tools ? (
        <Suspense fallback={null}>
          <Tools />
        </Suspense>
      ) : null}
      <button
        type="button"
        className="footer-tool"
        title={chevron}
        aria-label={chevron}
        aria-expanded={pane.open}
        data-view="chevron"
        onClick={pane.open ? pane.collapse : pane.expand}
      >
        {pane.open ? <FaChevronDown /> : <FaChevronUp />}
      </button>
    </div>
  );
};

FooterTools.propTypes = {
  pane: paneShape.isRequired,
  views: PropTypes.arrayOf(paneViewShape).isRequired,
};

const PaneMenu = ({ menu, onClose }) => {
  const list = useRef(null);

  useLayoutEffect(() => {
    const element = list.current;
    const box = element.getBoundingClientRect();
    const x = within(menu.x, window.innerWidth - box.width);
    const y = within(menu.y, window.innerHeight - box.height);
    element.style.setProperty('--sidebar-menu-x', `${x}px`);
    element.style.setProperty('--sidebar-menu-y', `${y}px`);
  }, [menu]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const away = event => {
      if (event.type === 'contextmenu' && event.defaultPrevented) {
        return;
      }
      if (list.current && !list.current.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', away);
    window.addEventListener('contextmenu', away);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', away);
      window.removeEventListener('contextmenu', away);
    };
  }, [onClose]);

  return (
    <ul ref={list} className="dropdown-menu show sidebar-menu">
      <li>
        <h6 className="dropdown-header">{menu.title}</h6>
      </li>
      {menu.items.map(row => (
        <li key={row.key}>
          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              onClose();
              row.onClick();
            }}
          >
            <MenuRow row={row} />
          </button>
        </li>
      ))}
    </ul>
  );
};

PaneMenu.propTypes = {
  menu: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(rowShape).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

const PaneView = ({ view, active, height }) => {
  const View = view.Component;
  return (
    <div className={active ? 'footer-view' : 'footer-view d-none'}>
      <Suspense fallback={null}>
        <View active={active} height={height} />
      </Suspense>
    </div>
  );
};

PaneView.propTypes = {
  view: paneViewShape.isRequired,
  active: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
};

/**
 * The pane under the footer's row, the chrome of the navbar contract's
 * Footer status section that knows nothing of tasks or shells: it takes
 * the state of `useFooterPane`, draws every view that has shown since
 * the page loaded, hiding all but the one that shows, and hands each
 * view's `Component` whether it shows, `active`, and the pane's `height`.
 * The height reaches the stylesheet as a custom property, never a style
 * attribute; the pane is the last child of the app's column and scrolls
 * inside itself while the page region gives up the height. A right-click
 * opens the view's `menu` at the pointer in the sidebar tree's menu
 * shape, titled by the view's label; Escape, a click away or a
 * right-click elsewhere closes it.
 */
const FooterPane = ({ pane }) => {
  const { t } = useTranslation();
  const box = useRef(null);
  const [menu, setMenu] = useState(null);
  const { view } = pane;
  useCssVar(box, '--footer-pane-height', pane.open ? `${pane.height}px` : null);

  const onContextMenu = event => {
    if (!view?.menu) {
      return;
    }
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, title: t(view.labelKey), items: view.menu });
  };

  return (
    <div
      ref={box}
      className={pane.open ? 'footer-pane open' : 'footer-pane'}
      role="presentation"
      onContextMenu={onContextMenu}
    >
      {pane.mounted.map(entry => (
        <PaneView
          key={entry.key}
          view={entry}
          active={entry.key === pane.shown}
          height={pane.height}
        />
      ))}
      {menu ? <PaneMenu menu={menu} onClose={() => setMenu(null)} /> : null}
    </div>
  );
};

FooterPane.propTypes = {
  pane: paneShape.isRequired,
};

export default FooterPane;
