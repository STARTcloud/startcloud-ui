import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import DateRange from '../../../components/common/DateRange';

export const EMPTY_USER_FILTERS = {
  search: '',
  enabled: '',
  using_2fa: false,
  has_customer_id: false,
  active_after: { start: '', end: '' },
};

export const usersFilterShape = PropTypes.shape({
  search: PropTypes.string.isRequired,
  enabled: PropTypes.string.isRequired,
  using_2fa: PropTypes.bool.isRequired,
  has_customer_id: PropTypes.bool.isRequired,
  active_after: PropTypes.shape({
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
  }).isRequired,
});

/**
 * The query the Users read sends for a filter state: `search`, `enabled`,
 * `using_2fa` and `has_customer_id` only while set, `active_after` the
 * range's start.
 *
 * @param {Object} filters - The page's filter state
 * @returns {Object} The query parameters, empty values dropped
 */
export const usersParamsOf = filters => {
  const params = {};
  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.enabled) {
    params.enabled = filters.enabled;
  }
  if (filters.using_2fa) {
    params.using_2fa = 'true';
  }
  if (filters.has_customer_id) {
    params.has_customer_id = 'true';
  }
  if (filters.active_after.start) {
    params.active_after = filters.active_after.start;
  }
  return params;
};

const Pill = ({ on, label, onToggle }) => (
  <button
    type="button"
    className={`btn btn-sm rounded-pill ${on ? 'btn-primary' : 'btn-outline-secondary'}`}
    aria-pressed={on}
    onClick={onToggle}
  >
    {label}
  </button>
);

Pill.propTypes = {
  on: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

/**
 * The filter row of the Users page, drawn on the page above the table:
 * the search field, the Status select (one exclusive value), the 2FA and
 * Customer ID pills, the Active after `DateRange` with its presets and
 * All time, and Export.
 */
const UsersFilters = ({ filters, onChange, onSubmit, onExport }) => {
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
      <label className="visually-hidden" htmlFor="users-search">
        {t('admin.users.filter.search')}
      </label>
      <input
        id="users-search"
        type="search"
        className="form-control form-control-sm w-auto flex-grow-1"
        placeholder={t('admin.users.filter.search')}
        value={filters.search}
        onChange={event => set('search', event.target.value)}
      />
      <label className="visually-hidden" htmlFor="users-status">
        {t('admin.users.filter.status')}
      </label>
      <select
        id="users-status"
        className="form-select form-select-sm w-auto"
        value={filters.enabled}
        onChange={event => set('enabled', event.target.value)}
      >
        <option value="">{t('admin.users.filter.anyStatus')}</option>
        <option value="true">{t('admin.users.table.active')}</option>
        <option value="false">{t('admin.users.table.disabled')}</option>
      </select>
      <Pill
        on={filters.using_2fa}
        label={t('admin.users.filter.tfa')}
        onToggle={() => set('using_2fa', !filters.using_2fa)}
      />
      <Pill
        on={filters.has_customer_id}
        label={t('admin.users.filter.customerId')}
        onToggle={() => set('has_customer_id', !filters.has_customer_id)}
      />
      <span className="small text-muted">{t('admin.users.filter.activeAfter')}</span>
      <DateRange
        value={filters.active_after}
        onChange={value => set('active_after', value)}
        idPrefix="users-active"
        startLabel={t('admin.activity.startDate')}
        endLabel={t('admin.activity.endDate')}
      />
      <button type="submit" className="btn btn-sm btn-primary">
        {t('admin.activity.filter')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onChange(EMPTY_USER_FILTERS)}
      >
        {t('admin.activity.clear')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onExport}>
        {t('admin.activity.export')}
      </button>
    </form>
  );
};

UsersFilters.propTypes = {
  filters: usersFilterShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};

export default UsersFilters;
