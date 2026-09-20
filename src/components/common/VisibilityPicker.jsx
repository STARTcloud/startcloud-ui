import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaLock, FaUsers } from 'react-icons/fa6';

const OPTIONS = [
  { key: 'public', value: { is_public: true, guest_access: false } },
  { key: 'guests', value: { is_public: false, guest_access: true } },
  { key: 'private', value: { is_public: false, guest_access: false } },
];

const CYCLE = ['private', 'guests', 'public'];

const WIDTH = { private: 0, guests: 1, public: 2 };

const ICONS = { public: FaGlobe, guests: FaUsers, private: FaLock };

const pickedOf = value => {
  if (value.is_public) {
    return 'public';
  }
  return value.guest_access ? 'guests' : 'private';
};

const nextWithin = (current, max) => {
  const limit = max ? WIDTH[pickedOf(max)] : WIDTH.public;
  const allowed = CYCLE.filter(state => WIDTH[state] <= limit);
  return allowed[(allowed.indexOf(current) + 1) % allowed.length];
};

export const visibilityShape = PropTypes.shape({
  is_public: PropTypes.bool.isRequired,
  guest_access: PropTypes.bool.isRequired,
});

/**
 * The one visibility action of every item page and every row page below
 * it: one button that steps the row Private, Guests, Public and round
 * again, its label and icon naming the step it takes next; `value`
 * carries the wire pair and `onChange` answers the pair the next step
 * means, the same pair the radios answer. `max` is the parent row's pair
 * where the row has one: the cycle then stays within the parent's width,
 * so a row under a Guests parent steps Private, Guests, Private and never
 * offers a state the host refuses, and under a Private parent the button
 * is disabled with the reason as its title.
 */
export const VisibilityStep = ({
  value,
  onChange,
  max = null,
  className = 'btn btn-outline-secondary',
}) => {
  const { t } = useTranslation();
  const current = pickedOf(value);
  const next = nextWithin(current, max);
  const stuck = next === current;
  const Icon = ICONS[next];
  return (
    <button
      type="button"
      className={className}
      disabled={stuck}
      title={stuck ? t('pages.visibility.withinParent') : undefined}
      onClick={() => onChange({ ...OPTIONS.find(option => option.key === next).value })}
    >
      <Icon className="me-2" />
      {t(`pages.visibility.${next}`)}
    </button>
  );
};

VisibilityStep.propTypes = {
  value: visibilityShape.isRequired,
  onChange: PropTypes.func.isRequired,
  max: visibilityShape,
  className: PropTypes.string,
};

/**
 * The one publish action of a row page below the item: Publish while the
 * row is pending, Unpublish while it is published, `onChange` answering
 * `{ published }` for the row's PUT.
 */
export const PublishStep = ({ published, onChange }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`btn ${published ? 'btn-warning' : 'btn-outline-primary'} me-2`}
      onClick={() => onChange({ published: !published })}
    >
      {t(published ? 'pages.bulk.unpublish' : 'pages.bulk.publish')}
    </button>
  );
};

PublishStep.propTypes = {
  published: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The one visibility control of every form that writes an item: three
 * radios, Public, Guests and Private, over the wire's two booleans
 * `is_public` and `guest_access`; `value` carries the pair (an object with
 * more members in it is read for those two alone), `onChange` answers the
 * pair the picked value means, `idPrefix` names the radios, `hint` is
 * drawn under the group and `disabled` freezes it.
 */
const VisibilityPicker = ({
  idPrefix,
  value,
  onChange,
  hint = '',
  disabled = false,
  className = 'mb-3',
}) => {
  const { t } = useTranslation();
  const picked = pickedOf(value);
  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="form-label fs-6">{t('pages.table.visibility')}</legend>
      <div className="d-flex flex-wrap">
        {OPTIONS.map(option => (
          <div key={option.key} className="form-check me-3">
            <input
              type="radio"
              className="form-check-input"
              id={`${idPrefix}-${option.key}`}
              name={`${idPrefix}-visibility`}
              value={option.key}
              checked={picked === option.key}
              onChange={() => onChange({ ...option.value })}
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-${option.key}`}>
              {t(`pages.status.${option.key}`)}
            </label>
          </div>
        ))}
      </div>
      {hint ? <div className="form-text">{hint}</div> : null}
    </fieldset>
  );
};

VisibilityPicker.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  value: visibilityShape.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.node,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default VisibilityPicker;
