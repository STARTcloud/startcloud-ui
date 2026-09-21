import PropTypes from 'prop-types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import { KindGlyph, levelLabel } from '../../../components/common/SearchResults';
import SubTable from '../../../components/common/SubTable';
import { EMPTY_APP_RESULTS, NavbarSearchContext } from '../../../contexts/SearchContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { pageContextShape } from '../../../utils/itemShape';
import { SEARCH_KINDS, collectionOfRow, searchRowPath } from '../../../utils/searchRow';

const PAGE_LIMIT = 50;
const MIN_QUERY = 2;

const rowKey = row =>
  [row.kind, row.org, row.name, row.version, row.provider, row.architecture, row.matched].join(':');

const matchesAny = () => true;

const matchedWord = (row, ctx) =>
  ctx.t(`search.matched.${row.matched}`, { defaultValue: row.matched });

const columnsFor = appSearch => [
  {
    key: 'title',
    kind: 'link',
    labelKey: 'search.columns.title',
    value: row => row.title,
    render: row => <Link to={searchRowPath(row, appSearch)}>{row.title}</Link>,
  },
  {
    key: 'where',
    kind: 'text',
    labelKey: 'search.columns.where',
    value: row => row.subtitle,
  },
  {
    key: 'matched',
    kind: 'badge',
    labelKey: 'search.columns.matched',
    value: matchedWord,
    render: (row, ctx) => (
      <span className="badge bg-secondary badge-xs">{matchedWord(row, ctx)}</span>
    ),
  },
];

const sumOf = counts => Object.values(counts).reduce((sum, count) => sum + count, 0);

const kindsOf = rows => [
  ...SEARCH_KINDS.filter(kind => rows.some(row => row.kind === kind)),
  ...[...new Set(rows.map(row => row.kind))].filter(kind => !SEARCH_KINDS.includes(kind)),
];

const usePageResults = ({ appSearch, query }) => {
  const [answered, setAnswered] = useState(EMPTY_APP_RESULTS);
  const active = query.length >= MIN_QUERY;

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

const KindSection = ({ kind, rows, columns, search, collection, ctx }) => {
  const { t } = useTranslation();
  return (
    <div className="list-table mb-4">
      <h4 className="d-flex align-items-center gap-2">
        <KindGlyph kind={kind} collection={collection} />
        {levelLabel(t, kind, collection)}
        <span className="badge bg-secondary bg-opacity-50">{rows.length}</span>
      </h4>
      <SubTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t('pages.noMatches')}
      />
    </div>
  );
};

KindSection.propTypes = {
  kind: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  search: PropTypes.object.isRequired,
  collection: PropTypes.object,
  ctx: PropTypes.object.isRequired,
};

const PageBody = ({ data, query, columns, search, collections, ctx }) => {
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
  return kindsOf(search.rows).map(kind => {
    const rows = search.rows.filter(row => row.kind === kind);
    return (
      <KindSection
        key={kind}
        kind={kind}
        rows={rows}
        columns={columns}
        search={search}
        collection={collectionOfRow(rows[0], collections)}
        ctx={ctx}
      />
    );
  });
};

PageBody.propTypes = {
  data: PropTypes.object.isRequired,
  query: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  search: PropTypes.object.isRequired,
  collections: PropTypes.array.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The app-wide search page at `/search?q=`, mounted only while the host
 * lists the `search` feature token: the query lives in the URL through
 * `useUrlNarrowing` and the navbar box is bound to it, so typing there
 * refines the page; the results come from the host's own search, one
 * table per kind with the header sort and the Columns pills the detail
 * pages use.
 */
const SearchPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { appSearch } = useContext(NavbarSearchContext);
  const url = useUrlNarrowing({ queryKey: 'q' });
  const query = url.query.trim();
  const data = usePageResults({ appSearch, query });
  const columns = useMemo(() => columnsFor(appSearch), [appSearch]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useDetailSearch({
    rows: data.results,
    matches: matchesAny,
    placeholderKey: 'search.appPlaceholder',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_search`,
    bound: {
      query: url.query,
      onQueryChange: url.setQuery,
      placeholder: t('search.appPlaceholder', { app: status.brand.name }),
    },
  });

  useEffect(() => {
    document.title = t('search.page.title');
  }, [t]);

  const total = data.results.length + sumOf(data.truncated);

  return (
    <div className="list row">
      <PageHeader
        title={t('search.page.title')}
        subtitle={query.length >= MIN_QUERY ? t('search.page.count', { count: total, query }) : ''}
      />
      <PageBody
        data={data}
        query={query}
        columns={columns}
        search={search}
        collections={appSearch.collections}
        ctx={ctx}
      />
    </div>
  );
};

SearchPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SearchPage;
