import PropTypes from 'prop-types';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaCaretDown, FaCaretRight, FaDesktop, FaServer } from 'react-icons/fa6';
import { NavLink, useLocation } from 'react-router-dom';

import { ColumnContext } from '../../../contexts/ColumnContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useCssVar } from '../../../hooks/useCssVar';
import { useConfigTitles } from '../hooks/useConfigTitles';
import { useHostRow } from '../hooks/useHostRow';
import { machinePagesFor } from '../machinePages';
import { HOST_PAGES, hostPagesFor } from '../pages';
import { configNamesOf } from '../utils/configNodes';
import { nounKeyOf } from '../utils/machines';

const ROW_SELECTOR = '[data-nav-row]';
const CONFIG_PREFIX = 'config:';
const NO_NAMES = [];
const OPEN_KEY = 'hostnav_open';
const WIDTH_KEY = 'hostnav_width';
const MINIMIZED_KEY = 'hostnav_minimized';
const MIN_WIDTH = 160;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240;

const ALL_OPEN = HOST_PAGES.map(group => group.key);

const storedOpen = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : ALL_OPEN;
  } catch {
    return ALL_OPEN;
  }
};

const useOpenKeys = () => {
  const [open, setOpen] = useState(storedOpen);
  const toggle = useCallback(key => {
    setOpen(previous => {
      const next = previous.includes(key)
        ? previous.filter(entry => entry !== key)
        : [...previous, key];
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return { open, toggle };
};

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

const useNavSize = () => {
  const asideRef = useRef(null);
  const dragging = useRef(false);
  const [minimized, setMinimized] = useState(storedMinimized);
  const [width, setWidth] = useState(storedWidth);

  useEffect(() => {
    const onMove = event => {
      if (dragging.current && asideRef.current) {
        setWidth(clampWidth(event.clientX - asideRef.current.getBoundingClientRect().left));
      }
    };
    const onUp = () => {
      if (!dragging.current) {
        return;
      }
      dragging.current = false;
      setWidth(current => {
        localStorage.setItem(WIDTH_KEY, String(current));
        return current;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startResize = useCallback(() => {
    dragging.current = true;
  }, []);

  const toggleMinimized = useCallback(() => {
    setMinimized(previous => {
      persistMinimized(!previous);
      return !previous;
    });
  }, []);

  return { asideRef, width, minimized, toggleMinimized, startResize };
};

const rowClass = ({ isActive }) => (isActive ? 'host-nav-row active' : 'host-nav-row');

const under = (pathname, page) =>
  page.end ? pathname === page.to : pathname === page.to || pathname.startsWith(`${page.to}/`);

const foldKeys = (event, open, onToggle) => {
  if ((event.key === 'ArrowLeft' && open) || (event.key === 'ArrowRight' && !open)) {
    event.preventDefault();
    onToggle();
  }
};

const focusSibling = (container, step) => {
  const rows = [...container.querySelectorAll(ROW_SELECTOR)];
  const index = rows.indexOf(document.activeElement);
  const next = rows[index + step];
  if (next) {
    next.focus();
  }
};

const pageShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string,
  label: PropTypes.string,
  to: PropTypes.string.isRequired,
  end: PropTypes.bool,
});

const groupShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string.isRequired,
  flat: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(pageShape).isRequired,
});

const Caret = ({ open, onToggle }) => (
  <span
    role="presentation"
    className="host-nav-caret"
    onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      onToggle();
    }}
  >
    {open ? <FaCaretDown /> : <FaCaretRight />}
  </span>
);

Caret.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const PageRow = ({ page, label }) => {
  const Icon = page.icon;
  return (
    <NavLink
      to={page.to}
      end={Boolean(page.end)}
      className={rowClass}
      title={label}
      data-nav-row
      data-nav-page={page.key}
    >
      <Icon className="host-nav-row-icon" />
      <span className="host-nav-row-label">{label}</span>
    </NavLink>
  );
};

PageRow.propTypes = {
  page: pageShape.isRequired,
  label: PropTypes.string.isRequired,
};

const GroupRows = ({ group, label, labelOf, pathname, opened }) => {
  const Icon = group.icon;
  const open = opened.open.includes(group.key) || group.pages.some(page => under(pathname, page));
  const onToggle = () => opened.toggle(group.key);
  return (
    <>
      <button
        type="button"
        className="host-nav-row"
        title={label}
        aria-expanded={open}
        data-nav-row
        data-nav-group={group.key}
        data-folded={open ? undefined : ''}
        onClick={onToggle}
        onKeyDown={event => foldKeys(event, open, onToggle)}
      >
        <Icon className="host-nav-row-icon" />
        <span className="host-nav-row-label">{label}</span>
        <Caret open={open} onToggle={onToggle} />
      </button>
      {open ? (
        <div className="host-nav-children">
          {group.pages.map(page => (
            <PageRow key={page.key} page={page} label={labelOf(page)} />
          ))}
        </div>
      ) : null}
    </>
  );
};

GroupRows.propTypes = {
  group: groupShape.isRequired,
  label: PropTypes.string.isRequired,
  labelOf: PropTypes.func.isRequired,
  pathname: PropTypes.string.isRequired,
  opened: PropTypes.shape({
    open: PropTypes.arrayOf(PropTypes.string).isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
};

const machineGroups = ({ server, id, name, role }) =>
  machinePagesFor({ server, id, name, role }).map(page => ({
    key: page.key,
    icon: page.icon,
    labelKey: page.labelKey,
    flat: true,
    pages: [page],
  }));

/**
 * The column of pages beside every page of a host and, given `name`,
 * every page of a machine, the page's body its children: the column is
 * drawn into the shell's column slot of `ColumnContext`, beside the one
 * scroll region, so it stands from the header to the footer and only its
 * rows scroll, while the body stays in the scroll region.
 * A host's rows are `hostPagesFor`'s groups: a flat group is one root
 * row, every other a parent row whose caret folds its pages, open by
 * default and opened by a route under it, the open set kept under
 * `hostnav_open`; a configuration row reads its file's schema title from
 * `useConfigTitles` and the file's name until the schema answers. A
 * machine's rows are `machinePagesFor`'s pages as root
 * rows. The top row is the column's glyph, a server for a host and a
 * desktop for a machine, then the label, Host or the machine noun, in
 * the rows' text style; the glyph folds the column to a rail of row
 * glyphs and, alone in the rail, opens it again, kept under
 * `hostnav_minimized`. The right edge drags the width between 160 and
 * 360px, 240 by default, kept under `hostnav_width`. Arrow keys move
 * between rows; Left and Right fold a parent.
 *
 * @param {Object} props
 * @param {string} props.id - The registry id, or `self` on an agent role
 * @param {string} [props.name] - The machine name, for a machine's column
 * @param {string} [props.role] - The person's role, for a machine's column
 * @param {import('react').ReactNode} [props.children] - The page's body
 */
const HostNav = ({ id, name = '', role = '', children }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const slot = useContext(ColumnContext);
  const status = useStatus();
  const server = useHostRow(id);
  const titles = useConfigTitles(status, id, name ? NO_NAMES : configNamesOf(server));
  const opened = useOpenKeys();
  const { asideRef, width, minimized, toggleMinimized, startResize } = useNavSize();
  const rowsRef = useRef(null);
  const noun = t(nounKeyOf(server ? [server] : []));
  useCssVar(asideRef, '--host-nav-width', minimized ? null : `${width}px`);

  const groups = useMemo(
    () => (name ? machineGroups({ server, id, name, role }) : hostPagesFor(server, id)),
    [server, id, name, role]
  );

  const labelOf = useCallback(
    entry => {
      if (entry.label === undefined) {
        return t(entry.labelKey, { noun });
      }
      if (entry.key.startsWith(CONFIG_PREFIX)) {
        return titles[entry.key.slice(CONFIG_PREFIX.length)] || entry.label;
      }
      return entry.label;
    },
    [t, noun, titles]
  );

  const onKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusSibling(rowsRef.current, event.key === 'ArrowDown' ? 1 : -1);
    }
  };

  const heading = name ? noun : t('hosts.nav.host');
  const Glyph = name ? FaDesktop : FaServer;
  const expandTitle = t('navbar.sidebar.expand');
  const collapseTitle = t('navbar.sidebar.collapse');

  const column = (
    <aside
      ref={asideRef}
      className={minimized ? 'host-nav host-nav-rail' : 'host-nav'}
      data-nav={name ? 'machine' : 'host'}
      data-rail={minimized ? '' : undefined}
    >
      <div className="host-nav-pane">
        <div className="host-nav-top">
          <button
            type="button"
            className="host-nav-glyph"
            title={minimized ? expandTitle : collapseTitle}
            aria-label={minimized ? expandTitle : collapseTitle}
            aria-expanded={!minimized}
            data-nav-tool={minimized ? 'expand' : 'collapse'}
            onClick={toggleMinimized}
          >
            <Glyph />
          </button>
          {minimized ? null : <span className="host-nav-top-label">{heading}</span>}
        </div>
        <nav className="host-nav-rows" aria-label={heading}>
          <div ref={rowsRef} role="presentation" onKeyDown={onKeyDown}>
            {minimized
              ? groups
                  .flatMap(group => group.pages)
                  .map(page => <PageRow key={page.key} page={page} label={labelOf(page)} />)
              : groups.map(group =>
                  group.flat ? (
                    <PageRow key={group.key} page={group.pages[0]} label={labelOf(group)} />
                  ) : (
                    <GroupRows
                      key={group.key}
                      group={group}
                      label={labelOf(group)}
                      labelOf={labelOf}
                      pathname={pathname}
                      opened={opened}
                    />
                  )
                )}
          </div>
        </nav>
      </div>
      {minimized ? null : (
        <div
          className="host-nav-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('navbar.sidebar.resize')}
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          data-nav-tool="resize"
          onPointerDown={event => {
            event.preventDefault();
            startResize();
          }}
        />
      )}
    </aside>
  );

  return (
    <>
      {slot ? createPortal(column, slot) : null}
      <div className="host-frame-body">{children}</div>
    </>
  );
};

HostNav.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  role: PropTypes.string,
  children: PropTypes.node,
};

export default HostNav;
