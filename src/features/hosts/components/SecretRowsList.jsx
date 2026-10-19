import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ViewToggle from '../../../components/common/ViewToggle';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { SECRET_STORE_COLUMNS, SECRET_STORE_FILTERS, matchesStoreRow, nowOf } from '../../certs';

import { DialogTable } from './ManageTable';
import { FilterPills, RowCards } from './PickDialogParts';

const rowKey = row => String(row.id);

/**
 * The Vault's table over a host store's secret rows, the list the
 * secret pick dialog draws: a search over the
 * rows, the Kind and Profile pills, the table or cards toggle, the
 * store's secret columns and the caller's row actions; `openers` draw
 * before the toggle, `name` is the table's `data-table` and the cards'
 * `data-list`.
 */
const SecretRowsList = ({
  name,
  rows,
  loaded,
  RowActions,
  actionsProps,
  openers = null,
  emptyKey = 'agentSettings.agentSecretsTab.noRows',
}) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('table');
  const needle = query.trim().toLowerCase();
  const searched = needle ? rows.filter(row => matchesStoreRow(row, needle)) : rows;
  const filters = useClientFilters({ specs: SECRET_STORE_FILTERS, rows: searched });
  const ctx = { t, language: i18n.language, now: nowOf(), thresholdDays: 0 };
  const emptyKeyOf = () => {
    if (!loaded) {
      return 'pages.loading';
    }
    return needle || filters.active ? 'pages.noMatches' : emptyKey;
  };
  const emptyText = t(emptyKeyOf());
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {openers}
        <span className="ms-auto">
          <ViewToggle view={view} onChange={setView} />
        </span>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <input
          className="form-control form-control-sm w-auto"
          type="search"
          placeholder={t('certs.search.sharedPlaceholder')}
          aria-label={t('certs.search.sharedPlaceholder')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <FilterPills groups={filters.groups} />
      </div>
      <div data-view={view}>
        {view === 'cards' ? (
          <RowCards
            name={`${name}-cards`}
            rows={filters.rows}
            columns={SECRET_STORE_COLUMNS}
            rowKey={rowKey}
            ctx={ctx}
            RowActions={RowActions}
            actionsProps={actionsProps}
            emptyText={emptyText}
          />
        ) : (
          <DialogTable
            name={name}
            columns={SECRET_STORE_COLUMNS}
            rows={filters.rows}
            rowKey={rowKey}
            RowActions={RowActions}
            actionsProps={actionsProps}
            ctx={ctx}
            emptyText={emptyText}
          />
        )}
      </div>
    </>
  );
};

SecretRowsList.propTypes = {
  name: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  loaded: PropTypes.bool.isRequired,
  RowActions: PropTypes.elementType.isRequired,
  actionsProps: PropTypes.object.isRequired,
  openers: PropTypes.node,
  emptyKey: PropTypes.string,
};

export default SecretRowsList;
