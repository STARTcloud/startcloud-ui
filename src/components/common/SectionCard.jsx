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
 * page's sections share: the header row with the title, the trailing
 * badge, the actions flush right and the chevron last, the chevron alone
 * flush right while no action draws; the whole header
 * folds the card except its action controls, the body collapsing under
 * it, open by default, `folded` and `onFold` the page's own state kept in
 * its prefs object under `folds` (identity contract decision 117), the
 * chevron's tooltip `foldTitle` where a page names one;
 * `tone="danger"` draws the border and the header in the danger colours.
 */
const SectionCard = ({
  title,
  badge = null,
  actions = null,
  tone = '',
  id = undefined,
  sectionRef = undefined,
  className = 'mb-3',
  folded = false,
  onFold,
  foldTitle = '',
  children,
}) => {
  const { t } = useTranslation();
  const bodyId = useId();
  const chevronTitle = foldTitle || t('pages.toggle');
  return (
    <div className={`card ${className}${tone ? ` border-${tone}` : ''}`} id={id} ref={sectionRef}>
      <div
        role="presentation"
        className={`card-header section-card-head d-flex align-items-center gap-2${
          tone ? ` bg-${tone}-subtle text-${tone}` : ''
        }`}
        onClick={onFold}
      >
        <h5 className="mb-0 section-card-title">{title}</h5>
        {badge}
        {actions ? (
          <span
            role="presentation"
            className="d-flex align-items-center gap-2 ms-auto"
            onClick={stop}
          >
            {actions}
          </span>
        ) : null}
        <button
          type="button"
          className={`btn btn-link btn-sm p-0 text-reset section-card-chevron${
            folded ? ' folded' : ''
          }${actions ? '' : ' ms-auto'}`}
          aria-expanded={!folded}
          aria-controls={bodyId}
          aria-label={chevronTitle}
          title={chevronTitle}
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
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
  actions: PropTypes.node,
  tone: PropTypes.string,
  id: PropTypes.string,
  sectionRef: PropTypes.shape({ current: PropTypes.any }),
  className: PropTypes.string,
  folded: PropTypes.bool,
  onFold: PropTypes.func.isRequired,
  foldTitle: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default SectionCard;
