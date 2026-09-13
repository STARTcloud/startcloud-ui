import PropTypes from 'prop-types';
import { useId } from 'react';

import { CollapseButton } from './GroupHeading';

export const foldsShape = PropTypes.shape({
  folded: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
});

/**
 * One section card of the pages contract, the house card shape every
 * page's sections share: the header row with the icon, the title, the
 * trailing badge and actions, and the chevron on the right; the card
 * folds from its header, open by default, `folded` and `onFold` the
 * page's own state kept in its prefs object under `folds` (identity
 * contract decision 117); `tone="danger"` draws the border and the header
 * in the danger colours.
 */
const SectionCard = ({
  icon = null,
  title,
  badge = null,
  actions = null,
  tone = '',
  id = undefined,
  sectionRef = undefined,
  className = 'mb-3',
  folded = false,
  onFold,
  children,
}) => {
  const bodyId = useId();
  return (
    <div className={`card ${className}${tone ? ` border-${tone}` : ''}`} id={id} ref={sectionRef}>
      <div
        className={`card-header section-card-head d-flex align-items-center gap-2${
          tone ? ` bg-${tone}-subtle` : ''
        }`}
      >
        <button
          type="button"
          className={`section-card-toggle${tone ? ` text-${tone}` : ''}`}
          aria-expanded={!folded}
          aria-controls={bodyId}
          onClick={onFold}
        >
          {icon ? <span className="d-inline-flex">{icon}</span> : null}
          <h5 className="mb-0 section-card-title">{title}</h5>
          {badge}
        </button>
        {actions}
        <CollapseButton collapsed={folded} onToggle={onFold} />
      </div>
      {folded ? null : (
        <div className="card-body" id={bodyId}>
          {children}
        </div>
      )}
    </div>
  );
};

SectionCard.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
  actions: PropTypes.node,
  tone: PropTypes.string,
  id: PropTypes.string,
  sectionRef: PropTypes.shape({ current: PropTypes.any }),
  className: PropTypes.string,
  folded: PropTypes.bool,
  onFold: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default SectionCard;
