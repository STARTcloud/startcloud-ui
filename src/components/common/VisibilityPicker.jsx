import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaLock, FaUsers } from 'react-icons/fa6';

const OPTIONS = [
  { key: 'public', value: { is_public: true, guest_access: false } },
  { key: 'guests', value: { is_public: false, guest_access: true } },
  { key: 'private', value: { is_public: false, guest_access: false } },
];

const NEXT = { private: 'guests', guests: 'public', public: 'private' };

const ICONS = { public: FaGlobe, guests: FaUsers, private: FaLock };

const pickedOf = value => {
  if (value.is_public) {
    return 'public';
  }
  return value.guest_access ? 'guests' : 'private';
};

export const visibilityShape = PropTypes.shape({
  is_public: PropTypes.bool.isRequired,
  guest_access: PropTypes.bool.isRequired,
});

/**
 * The one visibility action of every item page: one button that steps the
 * item Private, Guests, Public and round again, its label and icon naming
 * the step it takes next; `value` carries the wire pair and `onChange`
 * answers the pair the next step means, the same pair the radios answer.
 */
export const VisibilityStep = ({ value, onChange, className = 'btn btn-outline-secondary' }) => {
  const { t } = useTranslation();
  const next = NEXT[pickedOf(value)];
  const Icon = ICONS[next];
  return (
    <button
      type="button"
      className={className}
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
