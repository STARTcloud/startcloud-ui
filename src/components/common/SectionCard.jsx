import PropTypes from 'prop-types';
import { useId } from 'react';
import { Collapse } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa6';

export const foldsShape = PropTypes.shape({
  folded: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
});

const stop = event => event.stopPropagation();

/**
 * One section card of the pages contract, the house card shape every
 * page's sections share: the header row with the icon, the title, the
 * trailing badge and actions, and the chevron last, flush right; the
 * whole header folds the card except its action controls, the body
 * collapsing under it, open by default, `folded` and `onFold` the page's
 * own state kept in its prefs object under `folds` (identity contract
 * decision 117); `tone="danger"` draws the border and the header in the
 * danger colours.
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
  const { t } = useTranslation();
  const bodyId = useId();
  return (
    <div className={`card ${className}${tone ? ` border-${tone}` : ''}`} id={id} ref={sectionRef}>
      <div
        role="presentation"
        className={`card-header section-card-head d-flex align-items-center gap-2${
          tone ? ` bg-${tone}-subtle text-${tone}` : ''
        }`}
        onClick={onFold}
      >
        {icon ? <span className="d-inline-flex">{icon}</span> : null}
        <h5 className="mb-0 section-card-title">{title}</h5>
        {badge}
        {actions ? (
          <span role="presentation" className="d-flex align-items-center gap-2" onClick={stop}>
            {actions}
          </span>
        ) : null}
        <button
          type="button"
          className={`btn btn-link btn-sm p-0 text-reset ms-auto section-card-chevron${
            folded ? ' folded' : ''
          }`}
          aria-expanded={!folded}
          aria-controls={bodyId}
          aria-label={t('pages.toggle')}
          title={t('pages.toggle')}
        >
          <FaChevronDown aria-hidden />
        </button>
      </div>
      <Collapse in={!folded}>
        <div className="card-body" id={bodyId}>
          {children}
        </div>
      </Collapse>
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
