import PropTypes from 'prop-types';
import { useState } from 'react';

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
 * The in-router destination a followable link names when it is this
 * origin's, the pages contract's arrival rule: the path with its query
 * and its hash kept, empty for a link that belongs to another origin.
 * @param {string} link - The link `followableUrl` answered
 * @returns {string} The path to navigate in-router, or empty
 */
export const inAppPath = link => {
  if (typeof link !== 'string' || link === '') {
    return '';
  }
  if (SAFE_PATH.test(link)) {
    return link;
  }
  try {
    const url = new URL(link);
    if (url.origin !== window.location.origin) {
      return '';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

/**
 * One row of a method list: an icon or an `https:` image that falls back
 * to the icon when it fails to load, a label with its badges, a subline
 * and the trailing actions; the icon image never sends a referrer; an
 * optional leading checkbox while `selectable`, the row's cell of a
 * list's select column; `rowRef` is `useArrival`'s ref for the row, the
 * row then taking focus so the arrival rule's scroll and focus land on it.
 */
export const MethodRow = ({
  icon = null,
  iconUrl = '',
  label,
  badges = null,
  subline = null,
  actions = null,
  className = '',
  selectable = false,
  selected = false,
  onToggle = null,
  selectLabel = undefined,
  rowRef = null,
}) => {
  const [failed, setFailed] = useState('');
  const image = httpsUrl(iconUrl);
  const showImage = image && failed !== image;
  return (
    <li
      ref={rowRef || undefined}
      tabIndex={rowRef ? -1 : undefined}
      className={`list-group-item d-flex align-items-center gap-3 ${className}`}
    >
      {selectable ? (
        <input
          type="checkbox"
          className="form-check-input flex-shrink-0"
          checked={selected}
          onChange={onToggle}
          aria-label={selectLabel}
        />
      ) : null}
      <span className="d-inline-flex justify-content-center flex-shrink-0 method-row-icon">
        {showImage ? (
          <img
            key={image}
            src={image}
            alt=""
            width={24}
            height={24}
            referrerPolicy="no-referrer"
            onError={event => {
              event.currentTarget.classList.add('d-none');
              setFailed(image);
            }}
          />
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
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  onToggle: PropTypes.func,
  selectLabel: PropTypes.string,
  rowRef: PropTypes.func,
};

export const selectAllShape = PropTypes.shape({
  checked: PropTypes.bool.isRequired,
  indeterminate: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  label: PropTypes.string,
});

/**
 * The list rows of two-factor methods, passkeys, linked accounts,
 * connected applications and sessions share: an empty line while there
 * are no rows, and an optional leading row carrying the real select-all
 * checkbox for the list, indeterminate when some but not all rows are
 * picked, while `selectAll` is given.
 */
const MethodList = ({ children, empty = '', className = '', selectAll = null }) => {
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  if (rows.length === 0) {
    return empty ? <p className="text-body-secondary small mb-0">{empty}</p> : null;
  }
  return (
    <ul className={`list-group ${className}`}>
      {selectAll ? (
        <li className="list-group-item d-flex align-items-center gap-3">
          <input
            type="checkbox"
            className="form-check-input flex-shrink-0"
            checked={selectAll.checked}
            ref={element => {
              if (element) {
                element.indeterminate = Boolean(selectAll.indeterminate && !selectAll.checked);
              }
            }}
            onChange={selectAll.onToggle}
            aria-label={selectAll.label}
          />
        </li>
      ) : null}
      {rows}
    </ul>
  );
};

MethodList.propTypes = {
  children: PropTypes.node,
  empty: PropTypes.string,
  className: PropTypes.string,
  selectAll: selectAllShape,
};

export default MethodList;
