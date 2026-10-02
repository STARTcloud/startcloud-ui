import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

export const tabShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  to: PropTypes.string,
  end: PropTypes.bool,
  icon: PropTypes.elementType,
  count: PropTypes.number,
});

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

const TabBody = ({ tab }) => {
  const Icon = tab.icon || null;
  return (
    <>
      {Icon ? <Icon className="me-1" aria-hidden="true" /> : null}
      {tab.label}
      {tab.count > 0 && <span className="badge bg-warning ms-2">{tab.count}</span>}
    </>
  );
};

TabBody.propTypes = {
  tab: tabShape.isRequired,
};

/**
 * The one tab strip of the estate, the pages contract's: a `nav nav-tabs`
 * list of the tabs a page offers, each its glyph where it has one, its
 * label, text the page already translated, and its count as a badge
 * while the count is over zero. A tab that names `to` is a link by
 * route, active while the route is its own, `end` holding it to its
 * exact path; a tab without one is a button that hands its key to
 * `onSelect`, active while `active` names it. Nothing is drawn while
 * fewer than two tabs are offered, because one tab is no choice.
 */
const TabStrip = ({ tabs, active = '', onSelect = null, className = '' }) => {
  if (tabs.length < 2) {
    return null;
  }
  return (
    <ul className={className ? `nav nav-tabs ${className}` : 'nav nav-tabs'}>
      {tabs.map(tab => (
        <li key={tab.key} className="nav-item">
          {tab.to ? (
            <NavLink to={tab.to} end={Boolean(tab.end)} className={linkClass} data-tab={tab.key}>
              <TabBody tab={tab} />
            </NavLink>
          ) : (
            <button
              type="button"
              className={`nav-link ${active === tab.key ? 'active' : ''}`}
              data-tab={tab.key}
              onClick={() => onSelect(tab.key)}
            >
              <TabBody tab={tab} />
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
  className: PropTypes.string,
};

export default TabStrip;
