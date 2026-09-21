import PropTypes from 'prop-types';
import { useState } from 'react';
import { ButtonGroup, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaGlobe, FaLock, FaRegSquare, FaSitemap, FaUsers } from 'react-icons/fa6';

const OPTIONS = [
  { key: 'public', value: { is_public: true, guest_access: false } },
  { key: 'guests', value: { is_public: false, guest_access: true } },
  { key: 'private', value: { is_public: false, guest_access: false } },
];

const ORDER = ['private', 'guests', 'public'];

const WIDTH = { private: 0, guests: 1, public: 2 };

const ICONS = { public: FaGlobe, guests: FaUsers, private: FaLock };

const MARGIN = 'me-2';

const splitMargin = className => {
  const tokens = className.split(' ').filter(Boolean);
  return {
    group: tokens.filter(token => token === MARGIN).join(' '),
    button: tokens.filter(token => token !== MARGIN).join(' '),
  };
};

/**
 * The visibility word a wire pair means: `public`, `guests` or `private`.
 *
 * @param {{is_public?: boolean, guest_access?: boolean}} value - The pair
 * @returns {string} The word
 */
export const pickedOf = value => {
  if (value.is_public) {
    return 'public';
  }
  return value.guest_access ? 'guests' : 'private';
};

/**
 * The wire pair a visibility word means.
 *
 * @param {string} key - `public`, `guests` or `private`
 * @returns {{is_public: boolean, guest_access: boolean}} The pair
 */
export const pairOf = key => OPTIONS.find(option => option.key === key).value;

export const visibilityShape = PropTypes.shape({
  is_public: PropTypes.bool.isRequired,
  guest_access: PropTypes.bool.isRequired,
});

/**
 * Whether `next` opens wider than `current`, the test an edit form makes
 * before its PUT carries `recursive: true`, so a word picked in a form
 * flows down the way one picked from a menu does.
 *
 * @param {{is_public?: boolean, guest_access?: boolean}} next - The pair picked
 * @param {{is_public?: boolean, guest_access?: boolean}} current - The pair held
 * @returns {boolean}
 */
export const opensVisibility = (next, current) => WIDTH[pickedOf(next)] > WIDTH[pickedOf(current)];

const withScope = (body, beneath) => (beneath ? { ...body, recursive: true } : body);

const ScopeGlyph = ({ alone, count, onToggle }) => {
  const { t } = useTranslation();
  const title = alone ? t('pages.bulk.scopeAlone', { count }) : t('pages.bulk.scopeBeneath');
  const toggle = event => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  };
  return (
    <span
      role="button"
      tabIndex={0}
      className="d-inline-flex ms-3 scope-glyph"
      onClick={toggle}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          toggle(event);
        }
      }}
      title={title}
      aria-label={title}
    >
      {alone ? <FaRegSquare /> : <FaSitemap />}
    </span>
  );
};

ScopeGlyph.propTypes = {
  alone: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const lineShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  opens: PropTypes.bool.isRequired,
  active: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  title: PropTypes.string,
});

/**
 * The one menu of the estate for a word that flows down a tree: a face
 * naming the word or its current value, and one line per value; a line
 * that opens what it acts on carries the scope glyph at its right, the
 * tree glyph meaning the value flows to everything beneath, the default,
 * and one click on the glyph alone, which leaves the menu open the way the
 * Logout item's scope glyph does, flipping it to the square meaning only
 * the thing itself; the line's own click answers `onPick(key, beneath)`
 * with the scope the glyph shows. A closing line runs beneath on its own
 * and carries no glyph; a line beyond what the parent allows is disabled
 * with the parent's word in its title; the current value is ticked.
 * `className` is the face's button classes, an `me-2` in it moving to the
 * wrapper so the bar's spacing holds.
 */
const ScopedMenu = ({ face, className, disabled, count, lines, onPick }) => {
  const [alone, setAlone] = useState({});
  const { group, button } = splitMargin(className);
  return (
    <Dropdown as={ButtonGroup} className={group}>
      <Dropdown.Toggle as="button" type="button" className={button} disabled={disabled}>
        {face}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {lines.map(line => (
          <Dropdown.Item
            key={line.key}
            as="button"
            type="button"
            className="d-flex align-items-center"
            disabled={line.disabled}
            title={line.title}
            onClick={() => onPick(line.key, line.opens && !alone[line.key])}
          >
            {line.icon ? <span className="me-2 d-inline-flex">{line.icon}</span> : null}
            <span className="flex-grow-1">{line.label}</span>
            {line.active ? <FaCheck className="ms-2 text-success" aria-hidden /> : null}
            {line.opens && !line.disabled ? (
              <ScopeGlyph
                alone={Boolean(alone[line.key])}
                count={count}
                onToggle={() =>
                  setAlone(current => ({ ...current, [line.key]: !current[line.key] }))
                }
              />
            ) : null}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

ScopedMenu.propTypes = {
  face: PropTypes.node.isRequired,
  className: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
  lines: PropTypes.arrayOf(lineShape).isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * The one visibility control of every action bar, every file line and
 * the bulk pane: the `ScopedMenu` over Private, Guests and Public.
 * `current` is the pair the thing holds, its word the face and the
 * ticked line, and a line wider than it opens; with no `current`, the
 * bulk pane's mixed pick, the face is the word Visibility and Guests and
 * Public open. `max` is the parent's pair where there is one, the lines
 * beyond it disabled with the `withinParent` sentence as their title.
 * `onPick` answers the wire pair, `recursive: true` beside it while the
 * scope is everything beneath.
 */
export const VisibilityMenu = ({
  current = null,
  max = null,
  count = 1,
  className = 'btn btn-outline-secondary',
  disabled = false,
  onPick,
}) => {
  const { t } = useTranslation();
  const picked = current ? pickedOf(current) : '';
  const limit = max ? WIDTH[pickedOf(max)] : WIDTH.public;
  const lines = ORDER.map(key => {
    const Icon = ICONS[key];
    const beyond = WIDTH[key] > limit;
    return {
      key,
      label: t(`pages.status.${key}`),
      icon: <Icon />,
      opens: picked ? WIDTH[key] > WIDTH[picked] : key !== 'private',
      active: key === picked,
      disabled: beyond,
      title: beyond
        ? t('validation.withinParent', {
            label: t('pages.table.visibility'),
            parent: t(`pages.status.${pickedOf(max)}`),
          })
        : undefined,
    };
  });
  const FaceIcon = picked ? ICONS[picked] : null;
  const face = picked ? (
    <>
      <FaceIcon className="me-2" />
      {t(`pages.status.${picked}`)}
    </>
  ) : (
    t('pages.table.visibility')
  );
  return (
    <ScopedMenu
      face={face}
      className={className}
      disabled={disabled}
      count={count}
      lines={lines}
      onPick={(key, beneath) => onPick(withScope(pairOf(key), beneath))}
    />
  );
};

VisibilityMenu.propTypes = {
  current: visibilityShape,
  max: visibilityShape,
  count: PropTypes.number,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
};

/**
 * The one status control of every action bar, every file line and the
 * bulk pane: the `ScopedMenu` over Publish and Unpublish. `published` is
 * the thing's own word, its face and ticked line, null on the bulk
 * pane's mixed pick where the face is the word Status; Publish opens and
 * carries the scope glyph, and is disabled with the `withinParent`
 * sentence while `parentPublished` is false. `onPick` answers
 * `{ published }`, `recursive: true` beside it while the scope is
 * everything beneath.
 */
export const StatusMenu = ({
  published = null,
  parentPublished = null,
  count = 1,
  className = 'btn btn-outline-secondary',
  disabled = false,
  onPick,
}) => {
  const { t } = useTranslation();
  const stuck = parentPublished === false;
  const lines = [
    {
      key: 'publish',
      label: t('pages.bulk.publish'),
      opens: true,
      active: published === true,
      disabled: stuck,
      title: stuck
        ? t('validation.withinParent', {
            label: t('pages.table.status'),
            parent: t('pages.status.pending'),
          })
        : undefined,
    },
    {
      key: 'unpublish',
      label: t('pages.bulk.unpublish'),
      opens: false,
      active: published === false,
    },
  ];
  const face =
    published === null
      ? t('pages.table.status')
      : t(published ? 'pages.status.published' : 'pages.status.pending');
  return (
    <ScopedMenu
      face={face}
      className={className}
      disabled={disabled}
      count={count}
      lines={lines}
      onPick={(key, beneath) => onPick(withScope({ published: key === 'publish' }, beneath))}
    />
  );
};

StatusMenu.propTypes = {
  published: PropTypes.bool,
  parentPublished: PropTypes.bool,
  count: PropTypes.number,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
};

/**
 * The one visibility control of every form that writes an item: three
 * radios, Public, Guests and Private, over the wire's two booleans
 * `is_public` and `guest_access`; `value` carries the pair (an object with
 * more members in it is read for those two alone), `onChange` answers the
 * pair the picked value means, `idPrefix` names the radios, `hint` is
 * drawn under the group and `disabled` freezes it. A form's save carries
 * `recursive: true` while the pair it saves opens wider than the one
 * held, read through `opensVisibility`.
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
