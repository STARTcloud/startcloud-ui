import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { algorithmOf, issuerOf, matchesRecord, recordStatus } from '../utils/records';

const FILTER_KEYS = ['kind', 'status', 'algorithm', 'issuer', 'tags'];

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const statusValues =
  ({ now, thresholdDays }) =>
  record => {
    const status = recordStatus(record, now, thresholdDays);
    return status ? [status] : [];
  };

const groupsOf = ctx => [
  {
    key: 'kind',
    labelKey: 'certs.filter.kind',
    values: record => [record.kind],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`certs.kind.${value}`),
  },
  {
    key: 'status',
    labelKey: 'certs.filter.status',
    values: statusValues(ctx),
    activeClass: 'bg-success',
    labelFor: (value, t) => t(`certs.status.${value}`),
  },
  {
    key: 'algorithm',
    labelKey: 'certs.filter.algorithm',
    values: record => (algorithmOf(record) ? [algorithmOf(record)] : []),
    activeClass: 'bg-info',
    labelFor: value => value,
  },
  {
    key: 'issuer',
    labelKey: 'certs.filter.issuer',
    values: record => (issuerOf(record) ? [issuerOf(record)] : []),
    activeClass: 'bg-secondary',
    labelFor: value => value,
  },
  {
    key: 'tags',
    labelKey: 'certs.filter.tags',
    values: record => record.tags || [],
    activeClass: 'bg-warning text-dark',
    labelFor: value => value,
  },
];

/**
 * The vault page's navbar binding over `useDetailSearch`: the query over
 * the records' names, subjects, issuers, serials, fingerprints, tags and
 * notes, the Kind, Status, Algorithm, Issuer and Tags groups held in the
 * URL, so a stat tile's link narrows the table, each drawing the values
 * present alone, then Columns, the sort, the hidden columns and the
 * widths kept under `prefsKey`, and the panel's actions the page hands
 * in; `ctx` is the one context the page's table draws with, its `now`
 * and `thresholdDays` the status is read at.
 *
 * @param {Object} options - The page's data
 * @param {Array<Object>} options.records - Every record of the vault
 * @param {Array<Object>} options.columns - The table's columns
 * @param {Object} options.ctx - The context the columns receive, with `t`, `now` and `thresholdDays`
 * @param {string} options.prefsKey - The localStorage key
 * @param {Array} [options.actions] - The panel's actions
 * @returns {Object} The narrowed, sorted rows and the search state
 */
export const useVaultSearch = ({ records, columns, ctx, prefsKey, actions = [] }) => {
  const url = useUrlNarrowing({ queryKey: 'q', filterKeys: FILTER_KEYS });
  return useDetailSearch({
    rows: records,
    matches: matchesRecord,
    placeholderKey: 'certs.search.placeholder',
    columns,
    ctx,
    prefsKey,
    filterGroups: groupsOf(ctx),
    url,
    defaultSort: NAME_SORT,
    actions,
  });
};
