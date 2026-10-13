import PropTypes from 'prop-types';
import { FaXmark } from 'react-icons/fa6';
import { NavLink } from 'react-router-dom';

export const tabShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  to: PropTypes.string,
  end: PropTypes.bool,
  icon: PropTypes.elementType,
  count: PropTypes.number,
  detail: PropTypes.string,
  closable: PropTypes.bool,
  accepts: PropTypes.bool,
});

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

const TabBody = ({ tab }) => {
  const Icon = tab.icon || null;
  return (
    <>
      {Icon ? <Icon className="me-1" aria-hidden="true" /> : null}
      {tab.label}
      {tab.detail ? <small className="tab-detail ms-1">{tab.detail}</small> : null}
      {tab.count > 0 && <span className="badge bg-warning ms-2">{tab.count}</span>}
    </>
  );
};

TabBody.propTypes = {
  tab: tabShape.isRequired,
};

const classOf = (tab, active) =>
  ['nav-link', active === tab.key ? 'active' : '', tab.accepts ? 'accepts' : '']
    .filter(Boolean)
    .join(' ');

/**
 * The one tab strip of the estate, the pages contract's: a `nav nav-tabs`
 * list of the tabs a page offers, each its glyph where it has one, its
 * label, text the page already translated, its `detail` as a muted word
 * after the label, and its count as a badge while the count is over
 * zero. A tab that names `to` is a link by route, active while the route
 * is its own, `end` holding it to its exact path; a tab without one is a
 * button that hands its key to `onSelect`, active while `active` names
 * it. A `closable` tab carries an × titled `closeLabel` that hands its
 * key to `onClose`, a right-click on a tab hands the tab and the event
 * to `onContextMenu`, and a tab that `accepts` carries the brand bar
 * along its top edge. Nothing is drawn while fewer than two tabs are
 * offered, because one tab is no choice.
 */
const TabStrip = ({
  tabs,
  active = '',
  onSelect = null,
  onClose = null,
  closeLabel = '',
  onContextMenu = null,
  className = '',
}) => {
  if (tabs.length < 2) {
    return null;
  }
  return (
    <ul className={className ? `nav nav-tabs ${className}` : 'nav nav-tabs'}>
      {tabs.map(tab => (
        <li
          key={tab.key}
          className="nav-item"
          onContextMenu={onContextMenu ? event => onContextMenu(tab, event) : undefined}
        >
          {tab.to ? (
            <NavLink to={tab.to} end={Boolean(tab.end)} className={linkClass} data-tab={tab.key}>
              <TabBody tab={tab} />
            </NavLink>
          ) : (
            <button
              type="button"
              className={classOf(tab, active)}
              data-tab={tab.key}
              onClick={() => onSelect(tab.key)}
            >
              <TabBody tab={tab} />
              {tab.closable && onClose ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="tab-close ms-2"
                  title={closeLabel}
                  aria-label={closeLabel}
                  data-action="close-tab"
                  onClick={event => {
                    event.stopPropagation();
                    onClose(tab.key);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onClose(tab.key);
                    }
                  }}
                >
                  <FaXmark aria-hidden="true" />
                </span>
              ) : null}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

TabStrip.propTypes = {
  tabs: PropTypes.arrayOf(tabShape).isRequired,
  active: PropTypes.string,
  onSelect: PropTypes.func,
  onClose: PropTypes.func,
  closeLabel: PropTypes.string,
  onContextMenu: PropTypes.func,
  className: PropTypes.string,
};

export default TabStrip;
