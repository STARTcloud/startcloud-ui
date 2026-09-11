import PropTypes from 'prop-types';

const SAFE_PATH = /^\/(?![/\\])/;

/**
 * A URL member a page may draw: the value when it parses with the
 * `https:` scheme, empty otherwise, so a `javascript:` or `http:` value
 * from a registration never runs or leaks.
 * @param {string|null|undefined} value - The URL member
 * @returns {string} The URL, or empty
 */
export const httpsUrl = value => {
  if (typeof value !== 'string') {
    return '';
  }
  try {
    return new URL(value).protocol === 'https:' ? value : '';
  } catch {
    return '';
  }
};

/**
 * A `navigate` member the page may follow: an `https:` URL, or a
 * same-origin path starting with one slash.
 * @param {string|null|undefined} value - The member
 * @returns {string} The URL or path, or empty
 */
export const followableUrl = value => {
  if (typeof value === 'string' && SAFE_PATH.test(value)) {
    return value;
  }
  return httpsUrl(value);
};

/**
 * One row of a method list: an icon or an `https:` image, a label with
 * its badges, a subline and the trailing actions; the icon image never
 * sends a referrer.
 */
export const MethodRow = ({
  icon = null,
  iconUrl = '',
  label,
  badges = null,
  subline = null,
  actions = null,
  className = '',
}) => {
  const image = httpsUrl(iconUrl);
  return (
    <li className={`list-group-item d-flex align-items-center gap-3 ${className}`}>
      <span className="d-inline-flex justify-content-center flex-shrink-0 method-row-icon">
        {image ? (
          <img src={image} alt="" width={24} height={24} referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </span>
      <span className="flex-grow-1 min-width-0">
        <span className="d-flex align-items-center flex-wrap gap-2 fw-semibold">
          <span className="text-truncate">{label}</span>
          {badges}
        </span>
        {subline ? <span className="d-block small text-body-secondary">{subline}</span> : null}
      </span>
      {actions ? (
        <span className="d-flex align-items-center flex-wrap justify-content-end gap-2 flex-shrink-0">
          {actions}
        </span>
      ) : null}
    </li>
  );
};

MethodRow.propTypes = {
  icon: PropTypes.node,
  iconUrl: PropTypes.string,
  label: PropTypes.node.isRequired,
  badges: PropTypes.node,
  subline: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
};

/**
 * The list rows of two-factor methods, passkeys, linked accounts,
 * connected applications and sessions share: an empty line while there
 * are no rows.
 */
const MethodList = ({ children, empty = '', className = '' }) => {
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  if (rows.length === 0) {
    return empty ? <p className="text-body-secondary small mb-0">{empty}</p> : null;
  }
  return <ul className={`list-group ${className}`}>{rows}</ul>;
};

MethodList.propTypes = {
  children: PropTypes.node,
  empty: PropTypes.string,
  className: PropTypes.string,
};

export default MethodList;
