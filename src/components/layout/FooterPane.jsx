import PropTypes from 'prop-types';
import { Suspense, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp, FaGripLines } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';

import ContextMenu, { MenuRow, menuRowShape } from './ContextMenu';

export const paneViewShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  Component: PropTypes.elementType.isRequired,
  first: PropTypes.bool,
  tools: PropTypes.elementType,
  menu: PropTypes.arrayOf(menuRowShape),
  dropUp: PropTypes.arrayOf(menuRowShape),
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
  edge: PropTypes.objectOf(PropTypes.func).isRequired,
});

export const sidebarSizeShape = PropTypes.shape({
  minimized: PropTypes.bool.isRequired,
  dragTo: PropTypes.func.isRequired,
  persist: PropTypes.func.isRequired,
});

const toolClass = on => (on ? 'footer-tool on' : 'footer-tool');

/**
 * The grip of the footer's row, the bars alone in the center slot and
 * the one drag area inside the row, so that a press on a button or a
 * link is never a drag: a button the pointer drags and, focused, Up and
 * Down move, disabled while the pane is closed.
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

/**
 * The corner of the footer's row, where the sidebar's right edge meets
 * the row's top edge: one handle for two axes, a drag setting the pane's
 * height as the edge does and the sidebar's width from the same pointer,
 * the width stored when the pointer lifts; while the sidebar is the rail
 * the drag moves the pane alone.
 */
const FooterCorner = ({ pane, sidebar }) => {
  const { t } = useTranslation();
  const held = useRef(false);
  const { edge, height, limits, open } = pane;

  const onPointerDown = event => {
    held.current = true;
    edge.onPointerDown(event);
  };

  const onPointerMove = event => {
    edge.onPointerMove(event);
    if (held.current && !sidebar.minimized) {
      sidebar.dragTo(event.clientX);
    }
  };

  const release = event => {
    edge.onPointerUp(event);
    if (held.current) {
      held.current = false;
      sidebar.persist();
    }
  };

  return (
    <div
      className="footer-corner"
      role="separator"
      aria-label={t('footer.pane.resizeBoth')}
      aria-valuenow={open ? height : 0}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    />
  );
};

FooterCorner.propTypes = {
  pane: paneShape.isRequired,
  sidebar: sidebarSizeShape.isRequired,
};

/**
 * The handles of the footer's row beside the grip: the row's top edge, a
 * strip above the row's border the pointer drags up and down to set the
 * pane's height, opening a closed pane as it is dragged up, the sidebar's
 * own edge turned on its side; and, while the shell hands the sidebar's
 * size, the corner. The strip sits above the border, never over the row,
 * so a press on a button or a link is never a drag.
 */
export const FooterHandles = ({ pane, sidebar = null }) => {
  const { t } = useTranslation();
  const { edge, height, limits, open } = pane;
  return (
    <>
      <div
        className="footer-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('footer.pane.resize')}
        aria-valuenow={open ? height : 0}
        aria-valuemin={limits.min}
        aria-valuemax={limits.max}
        onPointerDown={edge.onPointerDown}
        onPointerMove={edge.onPointerMove}
        onPointerUp={edge.onPointerUp}
        onPointerCancel={edge.onPointerCancel}
      />
      {sidebar ? <FooterCorner pane={pane} sidebar={sidebar} /> : null}
    </>
  );
};

FooterHandles.propTypes = {
  pane: paneShape.isRequired,
  sidebar: sidebarSizeShape,
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
 * opens the view's `menu` at the pointer through `ContextMenu`, the one
 * presenter the sidebar's tree shares, titled by the view's label;
 * Escape, a click away or a right-click elsewhere closes it.
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
      {menu ? <ContextMenu menu={menu} onClose={() => setMenu(null)} /> : null}
    </div>
  );
};

FooterPane.propTypes = {
  pane: paneShape.isRequired,
};

export default FooterPane;
