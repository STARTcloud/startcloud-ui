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

const CrumbLink = ({ crumb, LinkComponent }) => {
  if (crumb.to) {
    return (
      <LinkComponent to={crumb.to} className={CRUMB_CLASS}>
        {crumb.icon}
        {crumb.label}
      </LinkComponent>
    );
  }
  if (crumb.href) {
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
  LinkComponent: PropTypes.elementType.isRequired,
};

const Crumbs = ({ crumbs, LinkComponent = 'a' }) =>
  crumbs.map(crumb => (
    <Fragment key={crumb.key}>
      <Separator />
      <li className="nav-item">
        <CrumbLink crumb={crumb} LinkComponent={LinkComponent} />
      </li>
    </Fragment>
  ));

Crumbs.propTypes = {
  crumbs: PropTypes.arrayOf(crumbShape).isRequired,
  LinkComponent: PropTypes.elementType,
};

export default Crumbs;
