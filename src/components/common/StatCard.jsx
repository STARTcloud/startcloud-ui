import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * The icon, count and label tile of a dashboard or a report: a link into
 * the page the count comes from while `to` is given, a plain tile
 * otherwise; `tone` colors the icon.
 */
const StatCard = ({ icon, count, label, to = '', tone = 'primary' }) => {
  const body = (
    <>
      <span className={`stat-card-icon text-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="stat-card-text">
        <span className="stat-card-count">{count}</span>
        <span className="stat-card-label">{label}</span>
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="stat-card text-decoration-none">
        {body}
      </Link>
    );
  }
  return <div className="stat-card">{body}</div>;
};

StatCard.propTypes = {
  icon: PropTypes.node,
  count: PropTypes.node.isRequired,
  label: PropTypes.node.isRequired,
  to: PropTypes.string,
  tone: PropTypes.string,
};

export default StatCard;
