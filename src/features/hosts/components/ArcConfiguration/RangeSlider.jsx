import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotateLeft } from 'react-icons/fa6';

import { useCssVar } from '../../../../hooks/useCssVar';
import { sliderFill } from '../../utils/arcUtils';

/**
 * Two lines of help under a slider, hyperweaver-ui's sentence and the
 * one under it.
 *
 * @param {string} first - The first line
 * @param {string} second - The second line
 * @returns {import('react').ReactElement} The lines
 */
export const twoLines = (first, second) => (
  <>
    {first}
    <br />
    {second}
  </>
);

/**
 * One tunable's slider, hyperweaver-ui's range with its filled track: the
 * label with the value or its word for none, the dynamic badge where the
 * tunable takes effect at once, the range whose fill follows the value
 * through `--hw-slider-fill`, the help under it and the reset button,
 * which sets the tunable to none.
 */
const RangeSlider = ({
  id,
  label,
  shown,
  dynamic = false,
  tone,
  min,
  max,
  step,
  value,
  onChange,
  onReset,
  resetLabel,
  resetTitle,
  help,
  disabled,
}) => {
  const { t } = useTranslation();
  const input = useRef(null);
  useCssVar(input, '--hw-slider-fill', sliderFill(value, Number(min), Number(max)));
  return (
    <div className="mb-4" data-slider={id}>
      <label className="form-label" htmlFor={id}>
        {label}: {shown}
        {dynamic ? (
          <span className="badge text-bg-success ms-2">
            {t('hostCharts.memoryParametersSection.dynamicBadge')}
          </span>
        ) : null}
      </label>
      <input
        ref={input}
        id={id}
        className={`hw-range-slider hw-range-slider-${tone}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
      <div className="form-text text-muted">{help}</div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary mt-2"
        data-action={`${id}-reset`}
        onClick={onReset}
        disabled={disabled}
        title={resetTitle}
      >
        <FaRotateLeft className="me-1" aria-hidden="true" />
        {resetLabel}
      </button>
    </div>
  );
};

RangeSlider.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  shown: PropTypes.node.isRequired,
  dynamic: PropTypes.bool,
  tone: PropTypes.oneOf(['primary', 'info']).isRequired,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  step: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  resetLabel: PropTypes.string.isRequired,
  resetTitle: PropTypes.string.isRequired,
  help: PropTypes.node.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default RangeSlider;
