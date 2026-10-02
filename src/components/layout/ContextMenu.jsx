import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const MENU_EDGE = 8;
const MENU_MIN = 4;

export const menuRowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  divider: PropTypes.bool,
  labelKey: PropTypes.string,
  icon: PropTypes.elementType,
  tone: PropTypes.string,
  onClick: PropTypes.func,
});

export const menuShape = PropTypes.shape({
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(menuRowShape).isRequired,
});

const within = (value, room) => Math.max(MENU_MIN, Math.min(value, room - MENU_EDGE));

/**
 * The inside of one menu row, the glyph in its tone when the row carries
 * one and the label; the footer's drop-up draws its rows with it too.
 */
export const MenuRow = ({ row }) => {
  const { t } = useTranslation();
  const Icon = row.icon || null;
  return (
    <>
      {Icon ? <Icon className={row.tone ? `${row.tone} me-2` : 'me-2'} /> : null}
      {t(row.labelKey)}
    </>
  );
};

MenuRow.propTypes = {
  row: menuRowShape.isRequired,
};

/**
 * The one presenter of every right-click menu of the chrome, the sidebar
 * tree's and the footer pane's: a menu at the pointer, kept inside the
 * window, titled by `menu.title`, its `items` rows of
 * `{ key, labelKey, icon?, tone?, onClick }` and dividers of
 * `{ key, divider: true }`; a row closes the menu and then runs; Escape,
 * a click away or a right-click elsewhere closes it, a right-click that
 * opened another menu leaving that one open.
 */
const ContextMenu = ({ menu, onClose }) => {
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
        <h6 className="dropdown-header text-truncate">{menu.title}</h6>
      </li>
      {menu.items.map(row =>
        row.divider ? (
          <li key={row.key}>
            <hr className="dropdown-divider" />
          </li>
        ) : (
          <li key={row.key}>
            <button
              type="button"
              className="dropdown-item"
              data-menu-row={row.key}
              onClick={() => {
                onClose();
                row.onClick();
              }}
            >
              <MenuRow row={row} />
            </button>
          </li>
        )
      )}
    </ul>
  );
};

ContextMenu.propTypes = {
  menu: menuShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ContextMenu;
