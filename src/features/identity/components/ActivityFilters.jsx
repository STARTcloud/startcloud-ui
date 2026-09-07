import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import DateRange from '../../../components/common/DateRange';

export const activityFilterShape = PropTypes.shape({
  username: PropTypes.string.isRequired,
  success: PropTypes.string.isRequired,
  start_date: PropTypes.string.isRequired,
  end_date: PropTypes.string.isRequired,
});

/**
 * The filter state of an Activity page read from its URL: `username`,
 * `success`, `start_date` and `end_date`, empty when absent.
 *
 * @param {URLSearchParams} params - The page's query
 * @returns {{ username: string, success: string, start_date: string, end_date: string }} The filters
 */
export const activityFiltersOf = params => ({
  username: params.get('username') || '',
  success: params.get('success') || '',
  start_date: params.get('start_date') || '',
  end_date: params.get('end_date') || '',
});

/**
 * The query an Activity read sends for a filter state, empty values
 * dropped.
 *
 * @param {Object} filters - The filters
 * @returns {Object} The parameters
 */
export const activityParamsOf = filters =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));

/**
 * The filter row of the Logins and Registrations pages, drawn on the
 * page: the presets and the `DateRange`, the username field, Show only
 * while `showOnly`, then Filter, Clear and Export.
 */
const ActivityFilters = ({
  filters,
  onChange,
  onSubmit,
  onClear,
  onExport,
  showOnly,
  idPrefix,
}) => {
  const { t } = useTranslation();
  const set = (key, value) => onChange({ ...filters, [key]: value });
  return (
    <form
      className="d-flex flex-wrap align-items-center gap-2 mb-3"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <DateRange
        value={{ start: filters.start_date, end: filters.end_date }}
        onChange={range => onChange({ ...filters, start_date: range.start, end_date: range.end })}
        idPrefix={idPrefix}
        startLabel={t('admin.activity.startDate')}
        endLabel={t('admin.activity.endDate')}
      />
      <label className="visually-hidden" htmlFor={`${idPrefix}-username`}>
        {t('admin.activity.username')}
      </label>
      <input
        id={`${idPrefix}-username`}
        type="text"
        className="form-control form-control-sm w-auto"
        placeholder={t('admin.activity.username')}
        value={filters.username}
        onChange={event => set('username', event.target.value)}
      />
      {showOnly ? (
        <>
          <label className="visually-hidden" htmlFor={`${idPrefix}-success`}>
            {t('admin.activity.logins.showOnly')}
          </label>
          <select
            id={`${idPrefix}-success`}
            className="form-select form-select-sm w-auto"
            value={filters.success}
            onChange={event => set('success', event.target.value)}
          >
            <option value="">{t('admin.activity.logins.all')}</option>
            <option value="false">{t('admin.activity.logins.failedOnly')}</option>
            <option value="true">{t('admin.activity.logins.successOnly')}</option>
          </select>
        </>
      ) : null}
      <button type="submit" className="btn btn-sm btn-primary">
        {t('admin.activity.filter')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClear}>
        {t('admin.activity.clear')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onExport}>
        {t('admin.activity.export')}
      </button>
    </form>
  );
};

ActivityFilters.propTypes = {
  filters: activityFilterShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  showOnly: PropTypes.bool.isRequired,
  idPrefix: PropTypes.string.isRequired,
};

export default ActivityFilters;
