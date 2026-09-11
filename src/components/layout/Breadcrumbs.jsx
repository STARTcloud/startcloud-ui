import PropTypes from 'prop-types';
import { Fragment } from 'react';

const CRUMB_CLASS = 'nav-link py-0 px-2 d-inline-flex align-items-center gap-2 crumb';

export const crumbShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  icon: PropTypes.node,
  href: PropTypes.string,
  to: PropTypes.string,
});

const Separator = () => (
  <li className="nav-item crumb-sep" aria-hidden>
    ›
  </li>
);

const CrumbLink = ({ crumb, last, LinkComponent }) => {
  if (!last && crumb.to) {
    return (
      <LinkComponent to={crumb.to} className={CRUMB_CLASS}>
        {crumb.icon}
        {crumb.label}
      </LinkComponent>
    );
  }
  if (!last && crumb.href) {
    return (
      <a href={crumb.href} className={CRUMB_CLASS}>
        {crumb.icon}
        {crumb.label}
      </a>
    );
  }
  return (
    <span className={CRUMB_CLASS}>
      {crumb.icon}
      {crumb.label}
    </span>
  );
};

CrumbLink.propTypes = {
  crumb: crumbShape.isRequired,
  last: PropTypes.bool.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

/**
 * The crumbs of the header row: every crumb but the last a link to its
 * route, the last the page itself as plain text, a muted separator
 * before each one and, with `leading` off, none before the first, the
 * case of a host with a column whose row opens with the root crumb.
 */
const Crumbs = ({ crumbs, LinkComponent = 'a', leading = true }) =>
  crumbs.map((crumb, index) => (
    <Fragment key={crumb.key}>
      {leading || index > 0 ? <Separator /> : null}
      <li className="nav-item">
        <CrumbLink crumb={crumb} last={index === crumbs.length - 1} LinkComponent={LinkComponent} />
      </li>
    </Fragment>
  ));

Crumbs.propTypes = {
  crumbs: PropTypes.arrayOf(crumbShape).isRequired,
  LinkComponent: PropTypes.elementType,
  leading: PropTypes.bool,
};

export default Crumbs;
