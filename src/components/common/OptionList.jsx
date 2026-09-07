import PropTypes from 'prop-types';

/**
 * One radio card: a native radio inside its label so arrow keys move and
 * Space selects, the label, an optional help line and any extra lines.
 */
export const Option = ({
  name,
  value,
  checked,
  onChange,
  label,
  help = null,
  disabled = false,
  children = null,
}) => (
  <label className={`option-card${checked ? ' on' : ''}${disabled ? ' off' : ''}`}>
    <input
      className="option-card-input"
      type="radio"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => onChange(value)}
    />
    <span className="option-card-radio" aria-hidden="true" />
    <span className="option-card-text">
      <span className="option-card-label">{label}</span>
      {help ? <span className="option-card-help">{help}</span> : null}
      {children}
    </span>
  </label>
);

Option.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.node.isRequired,
  help: PropTypes.node,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

/**
 * The list of radio cards, a `radiogroup` named by `label`.
 */
const OptionList = ({ label, children }) => (
  <div className="option-list" role="radiogroup" aria-label={label}>
    {children}
  </div>
);

OptionList.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default OptionList;
