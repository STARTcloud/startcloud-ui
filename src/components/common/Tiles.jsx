import PropTypes from 'prop-types';

import FieldError from './FieldError';

const picked = (value, option) =>
  Array.isArray(value) ? value.includes(option) : value === option;

const describedBy = ({ id, error, hint }) => {
  if (error) {
    return `${id}-error`;
  }
  return hint ? `${id}-hint` : undefined;
};

const Tile = ({ group, option, index, multi, value, dim, error, onChange, onBlur }) => {
  const on = picked(value, option.value);
  const off = Boolean(option.disabled) || dim;
  const errorId = error ? `${group}-error` : undefined;
  return (
    <label
      className={`pref-tile${on ? ' on' : ''}${off ? ' off' : ''}${
        option.className ? ` ${option.className}` : ''
      }`}
      title={option.title || undefined}
    >
      <input
        type={multi ? 'checkbox' : 'radio'}
        className="pref-tile-input"
        id={index === 0 ? group : `${group}/${option.value}`}
        name={group}
        value={option.value}
        checked={on}
        disabled={off}
        aria-invalid={error ? true : undefined}
        aria-errormessage={errorId}
        onChange={() => onChange(option.value)}
        onBlur={onBlur}
        data-value={option.value}
      />
      {option.glyph || null}
      <span className="pref-tile-cap">{option.label}</span>
      {option.sub ? <span className="pref-tile-sub">{option.sub}</span> : null}
    </label>
  );
};

const optionShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  sub: PropTypes.node,
  glyph: PropTypes.node,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  className: PropTypes.string,
});

Tile.propTypes = {
  group: PropTypes.string.isRequired,
  option: optionShape.isRequired,
  index: PropTypes.number.isRequired,
  multi: PropTypes.bool.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  dim: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
};

/**
 * One choice drawn as tiles: a labelled group of equal cards, each a label
 * over a visually hidden native radio, or a checkbox while `multi`, so the
 * keyboard moves and picks as it does on any radio group; the picked tile
 * carries the accent outline and no other mark; a disabled option, or
 * every option while `dim`, draws greyed and cannot be picked. `options`
 * are `{ value, label, sub?, glyph?, disabled?, title?, className? }`;
 * `value` is the picked string, or the picked strings while `multi`;
 * `onChange` receives the pressed option's value; the first input carries
 * the group's `id` and every other `${id}/${value}`, the group itself
 * `data-tiles={id}`, and an `error` paints every input invalid with the
 * `FieldError` under the group in place of the hint.
 */
const Tiles = ({
  id,
  label,
  hint = '',
  error = '',
  multi = false,
  dim = false,
  options,
  value,
  onChange,
  onBlur = undefined,
  className = '',
}) => (
  <div className={`field${error ? ' field-invalid' : ''} mb-3`}>
    <div className="form-label" id={`${id}-label`}>
      {label}
    </div>
    <div
      className={`pref-tiles${dim ? ' pref-tiles-dim' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy({ id, error, hint })}
      data-tiles={id}
    >
      {options.map((option, index) => (
        <Tile
          key={option.value}
          group={id}
          option={option}
          index={index}
          multi={multi}
          value={value}
          dim={dim}
          error={error}
          onChange={onChange}
          onBlur={onBlur}
        />
      ))}
    </div>
    {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    {!error && hint ? (
      <div id={`${id}-hint`} className="form-text">
        {hint}
      </div>
    ) : null}
  </div>
);

Tiles.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  hint: PropTypes.node,
  error: PropTypes.string,
  multi: PropTypes.bool,
  dim: PropTypes.bool,
  options: PropTypes.arrayOf(optionShape).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  className: PropTypes.string,
};

export default Tiles;
