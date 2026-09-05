import PropTypes from 'prop-types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import { EMPTY_APP_RESULTS, NavbarSearchContext } from '../../../contexts/SearchContext';
import { useStatus } from '../../../contexts/StatusContext';
import SubTable from '../../catalog/components/SubTable';
import { useDetailSearch } from '../../catalog/hooks/useDetailSearch';
import { pageContextShape } from '../../catalog/utils/itemShape';
import { SEARCH_KINDS, searchRowPath } from '../utils/searchRow';

import { KindGlyph } from './SearchResults';

const PAGE_LIMIT = 50;
const MIN_QUERY = 2;

const rowKey = row =>
  [row.kind, row.org, row.name, row.version, row.provider, row.architecture, row.matched].join(':');

const matchesAny = () => true;

const columnsFor = collections => [
  {
    key: 'title',
    labelKey: 'search.columns.title',
    sortValue: row => row.title.toLowerCase(),
    render: row => <Link to={searchRowPath(row, collections)}>{row.title}</Link>,
  },
  {
    key: 'where',
    labelKey: 'search.columns.where',
    sortValue: row => row.subtitle.toLowerCase(),
    render: row => row.subtitle,
  },
  {
    key: 'matched',
    labelKey: 'search.columns.matched',
    sortValue: row => row.matched,
    render: (row, ctx) => (
      <span className="badge bg-secondary badge-xs">
        {ctx.t(`search.matched.${row.matched}`, { defaultValue: row.matched })}
      </span>
    ),
  },
];

const sumOf = counts => Object.values(counts).reduce((sum, count) => sum + count, 0);

const usePageResults = ({ appSearch, query }) => {
  const [answered, setAnswered] = useState(EMPTY_APP_RESULTS);
  const active = appSearch.available && query.length >= MIN_QUERY;

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let mounted = true;
    appSearch
      .search(query, PAGE_LIMIT)
      .then(answer => {
        if (mounted) {
          setAnswered({
            query,
            results: answer.results || [],
            truncated: answer.truncated || {},
            loading: false,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setAnswered({ query, results: [], truncated: {}, loading: false });
        }
      });
    return () => {
      mounted = false;
    };
  }, [active, appSearch, query]);

  if (!active) {
    return EMPTY_APP_RESULTS;
  }
  if (answered.query !== query) {
    return { ...EMPTY_APP_RESULTS, query, loading: true };
  }
  return answered;
};

const KindSection = ({ kind, rows, columns, search, ctx }) => {
  const { t } = useTranslation();
  return (
    <div className="list-table mb-4">
      <h4 className="d-flex align-items-center gap-2">
        <KindGlyph kind={kind} />
        {t(`search.kinds.${kind}`)}
        <span className="badge bg-secondary bg-opacity-50">{rows.length}</span>
      </h4>
      <SubTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        ctx={ctx}
        emptyText={t('pages.noMatches')}
      />
    </div>
  );
};

KindSection.propTypes = {
  kind: PropTypes.oneOf(SEARCH_KINDS).isRequired,
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  search: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const PageBody = ({ data, query, columns, search, ctx }) => {
  const { t } = useTranslation();
  if (query.length < MIN_QUERY) {
    return null;
  }
  if (data.loading || data.query !== query) {
    return <div>{t('search.loading')}</div>;
  }
  if (search.rows.length === 0) {
    return <div>{t('search.noHits')}</div>;
  }
  return SEARCH_KINDS.filter(kind => search.rows.some(row => row.kind === kind)).map(kind => (
    <KindSection
      key={kind}
      kind={kind}
      rows={search.rows.filter(row => row.kind === kind)}
      columns={columns}
      search={search}
      ctx={ctx}
    />
  ));
};

PageBody.propTypes = {
  data: PropTypes.object.isRequired,
  query: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  search: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The app-wide search page at `/search?q=`: the query lives in the URL and
 * the navbar box is bound to it, so typing there refines the page; the
 * results come from the host's own search or the local walk, one table per
 * kind with the header sort and the Columns pills the detail pages use.
 */
const SearchPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { appSearch } = useContext(NavbarSearchContext);
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const data = usePageResults({ appSearch, query });
  const columns = useMemo(() => columnsFor(appSearch.collections), [appSearch.collections]);
  const search = useDetailSearch({
    rows: data.results,
    matches: matchesAny,
    placeholderKey: 'search.appPlaceholder',
    columns,
    prefsKey: `${context.prefsPrefix}_search`,
    bound: {
      query,
      onQueryChange: next => setParams(next ? { q: next } : {}, { replace: true }),
      placeholder: t('search.appPlaceholder', { app: status.brand.name }),
    },
  });

  useEffect(() => {
    document.title = t('search.page.title');
  }, [t]);

  const ctx = { ...context, t, language: i18n.language };
  const total = data.results.length + sumOf(data.truncated);

  if (!appSearch.available) {
    return (
      <div className="list row">
        <PageHeader title={t('search.page.title')} />
        <div>{t('search.unavailable')}</div>
      </div>
    );
  }

  return (
    <div className="list row">
      <PageHeader
        title={t('search.page.title')}
        subtitle={query.length >= MIN_QUERY ? t('search.page.count', { count: total, query }) : ''}
      />
      <PageBody data={data} query={query} columns={columns} search={search} ctx={ctx} />
    </div>
  );
};

SearchPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SearchPage;
