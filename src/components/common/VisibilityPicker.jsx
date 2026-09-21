import PropTypes from 'prop-types';
import { useId, useState } from 'react';
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
 * Whether `next` opens a row wider than `current`, the test a form makes
 * before it draws the cascade check beside its radios.
 *
 * @param {{is_public: boolean, guest_access: boolean}} next - The pair picked
 * @param {{is_public: boolean, guest_access: boolean}} current - The pair the row holds
 * @returns {boolean}
 */
export const opensVisibility = (next, current) => WIDTH[pickedOf(next)] > WIDTH[pickedOf(current)];

/**
 * The one cascade control of the estate: "Also open everything beneath",
 * off by default, drawn beside an action that opens a row (Make public,
 * Make guest, Publish, and the bulk bar's three opening verbs) and never
 * beside one that closes it, because closing always runs to every row
 * beneath and needs no word. Ticked, the write carries `recursive: true`,
 * which lifts every row beneath to the same word and never past the row
 * itself.
 */
export const CascadeCheck = ({ checked, onChange }) => {
  const { t } = useTranslation();
  const id = useId();
  return (
    <span className="form-check form-check-inline mb-0 me-2">
      <input
        type="checkbox"
        className="form-check-input"
        id={id}
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <label className="form-check-label small" htmlFor={id}>
        {t('pages.bulk.cascade')}
      </label>
    </span>
  );
};

CascadeCheck.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The one visibility action of every item page and every row page below
 * it: one button that steps the row Private, Guests, Public and round
 * again, its label and icon naming the step it takes next; `value`
 * carries the wire pair and `onChange` answers the pair the next step
 * means, the same pair the radios answer. `max` is the parent row's pair
 * where the row has one: the cycle then stays within the parent's width,
 * so a row under a Guests parent steps Private, Guests, Private and never
 * offers a state the host refuses, and under a Private parent the button
 * is disabled with the `withinParent` sentence of the validation contract
 * as its title, the parent's word filled in. While the next step opens
 * the row (Guests over Private, Public over Guests) the cascade check
 * draws beside it and a ticked one sends `recursive: true` with the pair.
 */
export const VisibilityStep = ({
  value,
  onChange,
  max = null,
  className = 'btn btn-outline-secondary',
}) => {
  const { t } = useTranslation();
  const [beneath, setBeneath] = useState(false);
  const current = pickedOf(value);
  const next = nextWithin(current, max);
  const stuck = next === current;
  const opens = WIDTH[next] > WIDTH[current];
  const Icon = ICONS[next];
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={stuck}
        title={
          stuck
            ? t('validation.withinParent', {
                label: t('pages.table.visibility'),
                parent: t(`pages.status.${pickedOf(max)}`),
              })
            : undefined
        }
        onClick={() =>
          onChange({
            ...OPTIONS.find(option => option.key === next).value,
            ...(beneath ? { recursive: true } : {}),
          })
        }
      >
        <Icon className="me-2" />
        {t(`pages.visibility.${next}`)}
      </button>
      {opens && !stuck ? <CascadeCheck checked={beneath} onChange={setBeneath} /> : null}
    </>
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
 * `{ published }` for the row's PUT. `parentPublished` is the parent
 * row's word where the row has one: while the parent is pending, Publish
 * is disabled with the `withinParent` sentence of the validation contract
 * as its title, because the host refuses a published row under a pending
 * one. `className` is the button's base, the small variant on a table
 * row's action cell. While the row is pending the click opens it, so the
 * cascade check draws beside the button and a ticked one sends
 * `recursive: true` with the word.
 */
export const PublishStep = ({
  published,
  onChange,
  parentPublished = null,
  className = 'btn me-2',
}) => {
  const { t } = useTranslation();
  const [beneath, setBeneath] = useState(false);
  const stuck = !published && parentPublished === false;
  return (
    <>
      <button
        type="button"
        className={`${className} ${published ? 'btn-warning' : 'btn-outline-primary'}`}
        disabled={stuck}
        title={
          stuck
            ? t('validation.withinParent', {
                label: t('pages.table.status'),
                parent: t('pages.status.pending'),
              })
            : undefined
        }
        onClick={() =>
          onChange({ published: !published, ...(!published && beneath ? { recursive: true } : {}) })
        }
      >
        {t(published ? 'pages.bulk.unpublish' : 'pages.bulk.publish')}
      </button>
      {!published && !stuck ? <CascadeCheck checked={beneath} onChange={setBeneath} /> : null}
    </>
  );
};

PublishStep.propTypes = {
  published: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  parentPublished: PropTypes.bool,
  className: PropTypes.string,
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
