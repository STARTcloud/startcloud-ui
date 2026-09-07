import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCaretDown, FaCaretRight, FaChevronLeft } from 'react-icons/fa6';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const WIDTH_KEY = 'sidebar_width';
const MINIMIZED_KEY = 'sidebar_minimized';
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 260;
const ROW_SELECTOR = '[data-sidebar-row]';

const openKeyOf = group => `sidebar_open_${group}`;
const viewKeyOf = group => `sidebar_view_${group}`;

const clampWidth = value => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

const storedWidth = () => {
  const value = Number(localStorage.getItem(WIDTH_KEY));
  return value ? clampWidth(value) : DEFAULT_WIDTH;
};

const storedMinimized = () => localStorage.getItem(MINIMIZED_KEY) === 'true';

const storedOpen = group => {
  try {
    const parsed = JSON.parse(localStorage.getItem(openKeyOf(group)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistMinimized = minimized => {
  if (minimized) {
    localStorage.setItem(MINIMIZED_KEY, 'true');
  } else {
    localStorage.removeItem(MINIMIZED_KEY);
  }
};

const rowClass = ({ isActive }) => (isActive ? 'sidebar-row active' : 'sidebar-row');

const focusSibling = (container, step) => {
  const rows = [...container.querySelectorAll(ROW_SELECTOR)];
  const index = rows.indexOf(document.activeElement);
  const next = rows[index + step];
  if (next) {
    next.focus();
  }
};

export const sidebarRowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  end: PropTypes.bool,
  badge: PropTypes.string,
});

export const sidebarSectionShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string,
  items: PropTypes.arrayOf(sidebarRowShape).isRequired,
});

export const sidebarViewShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  useTree: PropTypes.func.isRequired,
});

export const sidebarGroupShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(sidebarSectionShape),
  tree: PropTypes.func,
  views: PropTypes.arrayOf(sidebarViewShape),
});

const RowBadge = ({ count }) =>
  count > 0 ? <span className="badge rounded-pill bg-danger">{count}</span> : null;

RowBadge.propTypes = {
  count: PropTypes.number.isRequired,
};

const SectionRows = ({ section, badges }) => {
  const { t } = useTranslation();
  if (section.items.length === 0) {
    return null;
  }
  return (
    <div className="sidebar-section">
      {section.labelKey ? <div className="sidebar-section-label">{t(section.labelKey)}</div> : null}
      {section.items.map(row => {
        const Icon = row.icon;
        const label = t(row.labelKey);
        return (
          <NavLink
            key={row.key}
            to={row.to}
            end={Boolean(row.end)}
            className={rowClass}
            title={label}
            data-sidebar-row
          >
            <Icon className="sidebar-row-icon" />
            <span className="sidebar-row-label">{label}</span>
            {row.badge ? <RowBadge count={badges[row.badge] || 0} /> : null}
          </NavLink>
        );
      })}
    </div>
  );
};

SectionRows.propTypes = {
  section: sidebarSectionShape.isRequired,
  badges: PropTypes.objectOf(PropTypes.number).isRequired,
};

const nodeShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  status: PropTypes.string,
  children: PropTypes.func,
});

const TreeNode = ({ node, depth, tree, current }) => {
  const navigate = useNavigate();
  const Icon = node.icon || null;
  const open = tree.open.includes(node.key);
  const kids = tree.kids[node.key] || null;
  const branch = Boolean(node.children);
  const active = current === node.to;

  const onKeyDown = event => {
    if (event.key === 'ArrowLeft' && branch && open) {
      event.preventDefault();
      tree.toggle(node);
    }
    if (event.key === 'ArrowRight' && branch && !open) {
      event.preventDefault();
      tree.toggle(node);
    }
  };

  const onContextMenu = event => {
    if (!tree.menu) {
      return;
    }
    event.preventDefault();
    tree.openMenu({ x: event.clientX, y: event.clientY, items: tree.menu(node) });
  };

  return (
    <>
      <button
        type="button"
        className={active ? 'sidebar-row active' : 'sidebar-row'}
        style={{ paddingLeft: `${20 + depth * 18}px` }}
        title={node.label}
        aria-expanded={branch ? open : undefined}
        data-sidebar-row
        onClick={() => {
          if (branch && !open) {
            tree.toggle(node);
          }
          navigate(node.to);
        }}
        onKeyDown={onKeyDown}
        onContextMenu={onContextMenu}
      >
        {branch ? (
          <span
            role="presentation"
            className="sidebar-caret"
            onClick={event => {
              event.stopPropagation();
              tree.toggle(node);
            }}
          >
            {open ? <FaCaretDown /> : <FaCaretRight />}
          </span>
        ) : null}
        {Icon ? (
          <Icon className="sidebar-row-icon" />
        ) : (
          <span className={node.status === 'up' ? 'sidebar-dot up' : 'sidebar-dot'} />
        )}
        <span className="sidebar-row-label">{node.label}</span>
      </button>
      {branch && open && kids ? (
        <div className="sidebar-children">
          {kids.map(child => (
            <TreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              tree={tree}
              current={current}
            />
          ))}
        </div>
      ) : null}
    </>
  );
};

TreeNode.propTypes = {
  node: nodeShape.isRequired,
  depth: PropTypes.number.isRequired,
  tree: PropTypes.shape({
    open: PropTypes.arrayOf(PropTypes.string).isRequired,
    kids: PropTypes.object.isRequired,
    toggle: PropTypes.func.isRequired,
    menu: PropTypes.func,
    openMenu: PropTypes.func.isRequired,
  }).isRequired,
  current: PropTypes.string.isRequired,
};

const ContextMenu = ({ menu, onClose }) => {
  const { t } = useTranslation();
  return (
    <ul className="dropdown-menu show sidebar-menu" style={{ left: menu.x, top: menu.y }}>
      {menu.items.map(item => (
        <li key={item.key}>
          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              onClose();
              item.onClick();
            }}
          >
            {t(item.labelKey)}
          </button>
        </li>
      ))}
    </ul>
  );
};

ContextMenu.propTypes = {
  menu: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        labelKey: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
      })
    ).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

const TreeView = ({ groupKey, useTree, current }) => {
  const { nodes, menu = null } = useTree();
  const [open, setOpen] = useState(() => storedOpen(groupKey));
  const [kids, setKids] = useState({});
  const [contextMenu, setContextMenu] = useState(null);

  const load = useCallback(node => {
    Promise.resolve(node.children()).then(children => {
      setKids(previous => ({ ...previous, [node.key]: children }));
    });
  }, []);

  const toggle = useCallback(
    node => {
      setOpen(previous => {
        const next = previous.includes(node.key)
          ? previous.filter(key => key !== node.key)
          : [...previous, node.key];
        localStorage.setItem(openKeyOf(groupKey), JSON.stringify(next));
        return next;
      });
      if (!kids[node.key] && node.children) {
        load(node);
      }
    },
    [groupKey, kids, load]
  );

  useEffect(() => {
    nodes.forEach(node => {
      if (open.includes(node.key) && node.children && !kids[node.key]) {
        load(node);
      }
    });
  }, [nodes, open, kids, load]);

  const tree = { open, kids, toggle, menu, openMenu: setContextMenu };

  return (
    <div
      className="sidebar-tree"
      role="presentation"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setContextMenu(null);
        }
      }}
    >
      {nodes.map(node => (
        <TreeNode key={node.key} node={node} depth={0} tree={tree} current={current} />
      ))}
      {contextMenu ? <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} /> : null}
    </div>
  );
};

TreeView.propTypes = {
  groupKey: PropTypes.string.isRequired,
  useTree: PropTypes.func.isRequired,
  current: PropTypes.string.isRequired,
};

const GroupView = ({ group, badges, current }) => {
  const { t } = useTranslation();
  const [view, setView] = useState(
    () => localStorage.getItem(viewKeyOf(group.key)) || group.views?.[0]?.key || ''
  );
  const activeView = group.views?.find(entry => entry.key === view) || group.views?.[0] || null;
  const useTree = activeView?.useTree || group.tree || null;

  return (
    <div className="sidebar-group">
      {(group.sections || []).map(section => (
        <SectionRows key={section.key} section={section} badges={badges} />
      ))}
      {group.views && group.views.length > 1 ? (
        <label className="sidebar-view">
          <span className="sidebar-section-label p-0">{t('navbar.sidebar.view')}</span>
          <select
            className="form-select form-select-sm"
            value={activeView?.key || ''}
            onChange={event => {
              localStorage.setItem(viewKeyOf(group.key), event.target.value);
              setView(event.target.value);
            }}
          >
            {group.views.map(entry => (
              <option key={entry.key} value={entry.key}>
                {t(entry.labelKey)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {useTree ? (
        <TreeView
          key={activeView?.key || 'tree'}
          groupKey={group.key}
          useTree={useTree}
          current={current}
        />
      ) : null}
    </div>
  );
};

GroupView.propTypes = {
  group: sidebarGroupShape.isRequired,
  badges: PropTypes.objectOf(PropTypes.number).isRequired,
  current: PropTypes.string.isRequired,
};

const useResize = (asideRef, setWidth) => {
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = event => {
      if (!dragging.current || !asideRef.current) {
        return;
      }
      setWidth(clampWidth(event.clientX - asideRef.current.getBoundingClientRect().left));
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
  }, [asideRef, setWidth]);

  return () => {
    dragging.current = true;
  };
};

/**
 * The sidebar of the navbar contract's Sidebar section: the 62px top
 * button with the brand mark, the product name and a chevron that
 * collapses the column to a 38px rail and expands it again; the tertiary
 * band, 260px by default and 180 to 400px by the drag handle on its right
 * edge; the section entries (an uppercase label, rows of an icon, a label
 * and an optional badge, active by route) and the tree entries (nodes
 * with a caret, lazy children, a status dot, a right-click menu, the
 * selection driven by the route, a view select when the group exports
 * more than one shape); the rail, the width, the open nodes and the
 * chosen view persisted per origin; arrow keys between rows, Left and
 * Right on a node, Escape closing a menu; and under 900px an overlay from
 * the left the header toggle opens. Every entry comes from the mounted
 * features' `sidebar(status, account)` exports; the column decides nothing.
 */
const Sidebar = ({ entries, brand, badges, open, onClose }) => {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const asideRef = useRef(null);
  const navRef = useRef(null);
  const [minimized, setMinimized] = useState(storedMinimized);
  const [width, setWidth] = useState(storedWidth);
  const startResize = useResize(asideRef, setWidth);
  const current = `${pathname}${search}`;

  const toggleMinimized = () => {
    setMinimized(previous => {
      persistMinimized(!previous);
      return !previous;
    });
  };

  const onKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusSibling(navRef.current, event.key === 'ArrowDown' ? 1 : -1);
    }
    if (event.key === 'Escape') {
      onClose();
    }
  };

  const className = ['sidebar', minimized ? 'sidebar-rail' : '', open ? 'sidebar-open' : '']
    .filter(Boolean)
    .join(' ');
  const topTitle = minimized ? t('navbar.sidebar.expand') : t('navbar.sidebar.collapse');

  return (
    <>
      {open ? <div className="sidebar-backdrop" role="presentation" onClick={onClose} /> : null}
      <aside
        ref={asideRef}
        className={className}
        style={minimized ? undefined : { width: `${width}px` }}
      >
        <button
          type="button"
          className="sidebar-top"
          title={topTitle}
          aria-label={topTitle}
          aria-expanded={!minimized}
          onClick={toggleMinimized}
        >
          {brand.logo}
          <span className="sidebar-top-name">{brand.name}</span>
          <FaChevronLeft className="sidebar-top-chevron" />
        </button>
        <nav className="sidebar-nav" aria-label={t('navbar.sidebar.navigation')}>
          <div ref={navRef} role="presentation" onKeyDown={onKeyDown}>
            {entries.map(group => (
              <GroupView key={group.key} group={group} badges={badges} current={current} />
            ))}
          </div>
        </nav>
        {minimized ? null : (
          <div
            className="sidebar-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label={t('navbar.sidebar.resize')}
            aria-valuenow={width}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            onPointerDown={event => {
              event.preventDefault();
              startResize();
            }}
          />
        )}
      </aside>
    </>
  );
};

Sidebar.propTypes = {
  entries: PropTypes.arrayOf(sidebarGroupShape).isRequired,
  brand: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo: PropTypes.node.isRequired,
  }).isRequired,
  badges: PropTypes.objectOf(PropTypes.number).isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Sidebar;
