import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESETS = [30, 60, 90, 120];

const pad = value => String(value).padStart(2, '0');

const dateOf = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * The range a preset names: `start` the given number of days before today
 * and `end` today, or both empty for all time.
 *
 * @param {number|null} days - The preset, null for all time
 * @returns {{ start: string, end: string }} The range as ISO calendar dates
 */
export const presetRange = days => {
  if (days === null) {
    return { start: '', end: '' };
  }
  return { start: dateOf(new Date(Date.now() - days * DAY_MS)), end: dateOf(new Date()) };
};

/**
 * A start and end date with the preset buttons every report page draws,
 * 30, 60, 90 and 120 days and All time, each writing the range at once;
 * `value` is `{ start, end }` as ISO calendar dates, empty for no bound,
 * and the preset matching the value is drawn active.
 */
const DateRange = ({ value, onChange, idPrefix, startLabel, endLabel }) => {
  const { t } = useTranslation();
  const active = days => {
    const range = presetRange(days);
    return range.start === value.start && range.end === value.end;
  };
  return (
    <div className="date-range d-flex flex-wrap align-items-center gap-2">
      <div className="btn-group btn-group-sm" role="group" aria-label={t('dateRange.presets')}>
        {PRESETS.map(days => (
          <button
            key={days}
            type="button"
            className={`btn ${active(days) ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => onChange(presetRange(days))}
          >
            {t('dateRange.days', { count: days })}
          </button>
        ))}
        <button
          type="button"
          className={`btn ${active(null) ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onChange(presetRange(null))}
        >
          {t('dateRange.allTime')}
        </button>
      </div>
      <label className="visually-hidden" htmlFor={`${idPrefix}-start`}>
        {startLabel}
      </label>
      <input
        id={`${idPrefix}-start`}
        type="date"
        className="form-control form-control-sm w-auto"
        value={value.start}
        max={value.end || undefined}
        onChange={event => onChange({ ...value, start: event.target.value })}
      />
      <label className="visually-hidden" htmlFor={`${idPrefix}-end`}>
        {endLabel}
      </label>
      <input
        id={`${idPrefix}-end`}
        type="date"
        className="form-control form-control-sm w-auto"
        value={value.end}
        min={value.start || undefined}
        onChange={event => onChange({ ...value, end: event.target.value })}
      />
    </div>
  );
};

DateRange.propTypes = {
  value: PropTypes.shape({
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  idPrefix: PropTypes.string.isRequired,
  startLabel: PropTypes.string.isRequired,
  endLabel: PropTypes.string.isRequired,
};

export default DateRange;
