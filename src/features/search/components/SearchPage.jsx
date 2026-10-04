import PropTypes from 'prop-types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import PageHeader from '../../../components/common/PageHeader';
import SubTable from '../../../components/common/SubTable';
import {
  HighlightedTitle,
  ScopeChip,
  kindLabel,
  matchedLabel,
} from '../../../components/layout/SearchPanel';
import { NavbarSearchContext, usePageSearchRun } from '../../../contexts/SearchContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { pageContextShape } from '../../../utils/itemShape';
import { kindEntryOf, rowKeyOf, searchRowOwner } from '../../../utils/searchRow';

const FILTER_KEYS = ['kinds', 'scope'];
const NO_KINDS = [];
const NO_FACETS = [];

const matchesAny = () => true;

const matchedWord = (row, ctx) =>
  matchedLabel(ctx.t, searchRowOwner(row, ctx.kinds, ctx.query).entry, row);

const COLUMNS = [
  {
    key: 'title',
    kind: 'link',
    labelKey: 'search.columns.title',
    value: row => row.title,
    render: (row, ctx) => {
      const { to } = searchRowOwner(row, ctx.kinds, ctx.query);
      if (row.command) {
        return (
          <button type="button" className="btn btn-link p-0 text-start" onClick={row.command}>
            <HighlightedTitle row={row} />
          </button>
        );
      }
      return to ? (
        <Link to={to}>
          <HighlightedTitle row={row} />
        </Link>
      ) : (
        <HighlightedTitle row={row} />
      );
    },
  },
  {
    key: 'host',
    kind: 'text',
    labelKey: 'search.columns.host',
    priority: 2,
    value: (row, ctx) => ctx.hostLabel(row.host),
  },
  {
    key: 'where',
    kind: 'text',
    labelKey: 'search.columns.where',
    priority: 3,
    prose: true,
    value: row => row.subtitle,
  },
  {
    key: 'matched',
    kind: 'badge',
    labelKey: 'search.columns.matched',
    priority: 4,
    value: matchedWord,
    render: (row, ctx) => (
      <span className="badge bg-secondary badge-xs">{matchedWord(row, ctx)}</span>
    ),
  },
  {
    key: 'score',
    kind: 'count',
    labelKey: 'search.columns.score',
    priority: 5,
    defaultHidden: true,
    value: row => row.score,
  },
];

const countText = count => `${count.value}${count.relation === 'gte' ? '+' : ''}`;

const listOf = value => (value ? value.split(',').filter(Boolean) : NO_KINDS);

const narrowingOf = parsed => ({
  ...(parsed?.kinds.length ? { kinds: parsed.kinds.join(',') } : {}),
  ...(parsed?.scope ? { scope: parsed.scope } : {}),
});

const facetCounts = (rows, key) =>
  rows.reduce((counts, row) => {
    const value = row.facets[key];
    return value ? { ...counts, [value]: (counts[value] || 0) + 1 } : counts;
  }, {});

const FacetPills = ({ facets, rows, picked, onPick }) => (
  <div className="d-flex flex-wrap gap-2 mb-2">
    {facets.flatMap(key =>
      Object.entries(facetCounts(rows, key)).map(([value, count]) => {
        const on = picked[key] === value;
        const tone = on ? 'bg-primary' : 'bg-secondary bg-opacity-25';
        return (
          <button
            key={`${key}:${value}`}
            type="button"
            className={`badge rounded-pill badge-xs border-0 ${tone}`}
            aria-pressed={on}
            data-facet={key}
            onClick={() => onPick(key, on ? '' : value)}
          >
            {value} ({count})
          </button>
        );
      })
    )}
  </div>
);

FacetPills.propTypes = {
  facets: PropTypes.arrayOf(PropTypes.string).isRequired,
  rows: PropTypes.array.isRequired,
  picked: PropTypes.object.isRequired,
  onPick: PropTypes.func.isRequired,
};

const Paging = ({ canPrevious, canNext, onPrevious, onNext }) => {
  const { t } = useTranslation();
  if (!canPrevious && !canNext) {
    return null;
  }
  return (
    <div className="d-flex gap-2 mt-2">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={!canPrevious}
        onClick={onPrevious}
      >
        {t('search.page.previous')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={!canNext}
        onClick={onNext}
      >
        {t('search.page.next')}
      </button>
    </div>
  );
};

Paging.propTypes = {
  canPrevious: PropTypes.bool.isRequired,
  canNext: PropTypes.bool.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

const passesFacets = (row, picked) =>
  Object.entries(picked).every(([key, value]) => !value || row.facets[key] === value);

const KindSection = ({ kind, count, rows, search, ctx, paging }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState({});
  const facets = kindEntryOf(ctx.kinds, kind)?.facets || NO_FACETS;
  const shown = rows.filter(row => passesFacets(row, picked));
  return (
    <div className="list-table mb-4" data-kind={kind}>
      <h4 className="d-flex align-items-center gap-2">
        {kindLabel(t, ctx.kinds, kind)}
        <span className="badge bg-secondary bg-opacity-50">
          {count ? countText(count) : rows.length}
        </span>
      </h4>
      {facets.length > 0 ? (
        <FacetPills
          facets={facets}
          rows={rows}
          picked={picked}
          onPick={(key, value) => setPicked(current => ({ ...current, [key]: value }))}
        />
      ) : null}
      <SubTable
        columns={COLUMNS}
        rows={shown}
        rowKey={rowKeyOf}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t('pages.noMatches')}
      />
      <Paging {...paging} />
    </div>
  );
};

KindSection.propTypes = {
  kind: PropTypes.string.isRequired,
  count: PropTypes.shape({ value: PropTypes.number, relation: PropTypes.string }),
  rows: PropTypes.array.isRequired,
  search: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  paging: PropTypes.shape({
    canPrevious: PropTypes.bool.isRequired,
    canNext: PropTypes.bool.isRequired,
    onPrevious: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
  }).isRequired,
};

const stateKey = state => `search.page.host.${state}`;

const HostLines = ({ run, hostLabel }) => {
  const { t } = useTranslation();
  if (run.states.length === 0) {
    return null;
  }
  return (
    <ul className="list-unstyled small mb-3" role="status">
      {run.states.map(({ source, state }) => (
        <li key={source.key} className="d-flex align-items-center gap-2" data-host={source.key}>
          <span>{hostLabel(source.host)}</span>
          <span className="text-body-secondary">{t(stateKey(state))}</span>
          {state === 'failed' ? (
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => run.retry(source.key)}
            >
              {t('search.page.retry')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

HostLines.propTypes = {
  run: PropTypes.object.isRequired,
  hostLabel: PropTypes.func.isRequired,
};

const KindPills = ({ run, kinds, pinned, onPin }) => {
  const { t } = useTranslation();
  const entries = Object.entries(run.counts);
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {entries.map(([kind, count]) => {
        const on = pinned === kind;
        return (
          <button
            key={kind}
            type="button"
            className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline-secondary'}`}
            aria-pressed={on}
            onClick={() => onPin(on ? '' : kind)}
          >
            {kindLabel(t, kinds, kind)} ({countText(count)})
          </button>
        );
      })}
    </div>
  );
};

KindPills.propTypes = {
  run: PropTypes.object.isRequired,
  kinds: PropTypes.object.isRequired,
  pinned: PropTypes.string.isRequired,
  onPin: PropTypes.func.isRequired,
};

const kindsOf = rows => [...new Set(rows.map(row => row.kind))];

const useCursorStack = request => {
  const [held, setHeld] = useState({ request, stack: [] });
  const stack = held.request === request ? held.stack : [];
  return {
    cursors: stack.length > 0 ? stack[stack.length - 1] : null,
    depth: stack.length,
    push: next => setHeld({ request, stack: [...stack, next] }),
    pop: () => setHeld({ request, stack: stack.slice(0, -1) }),
  };
};

const pagingOf = ({ kind, run, pages, onNarrow }) => {
  const single = run.kinds.length === 1 && run.kinds[0] === kind;
  const more = run.counts[kind]?.relation === 'gte';
  if (single) {
    return {
      canPrevious: pages.depth > 0,
      canNext: Object.keys(run.nexts).length > 0,
      onPrevious: pages.pop,
      onNext: () => pages.push(run.nexts),
    };
  }
  return {
    canPrevious: false,
    canNext: more,
    onPrevious: pages.pop,
    onNext: () => onNarrow(kind),
  };
};

const PageBody = ({ run, search, ctx, pages, onNarrow }) => {
  const { t } = useTranslation();
  if (!run.active) {
    return null;
  }
  if (search.rows.length === 0) {
    return <div>{t(run.pending.length > 0 ? 'search.loading' : 'search.noHits')}</div>;
  }
  return kindsOf(search.rows).map(kind => (
    <KindSection
      key={kind}
      kind={kind}
      count={run.counts[kind]}
      rows={search.rows.filter(row => row.kind === kind)}
      search={search}
      ctx={ctx}
      paging={pagingOf({ kind, run, pages, onNarrow })}
    />
  ));
};

PageBody.propTypes = {
  run: PropTypes.object.isRequired,
  search: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  pages: PropTypes.object.isRequired,
  onNarrow: PropTypes.func.isRequired,
};

/**
 * The results page at `/search?q=&kinds=&scope=`, its state in the URL
 * and its results the one run the navbar search box shares: one table per
 * kind with a Host column and the pills of the kind's facets, a status
 * line per host asked, a count pill per kind narrowing to it, the URL's
 * scope as a removable chip, and per kind the next and previous pages by
 * each host's cursor; a `type:` or `org:` word typed in the box lands in
 * the URL's `kinds` or `scope`, its `q` the text alone.
 */
const SearchPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { appSearch } = useContext(NavbarSearchContext);
  const url = useUrlNarrowing({ queryKey: 'q', filterKeys: FILTER_KEYS });
  const request = [url.query, url.applied.kinds, url.applied.scope].join('\n');
  const pages = useCursorStack(request);
  const run = usePageSearchRun({
    typed: url.query,
    kinds: listOf(url.applied.kinds),
    scope: url.applied.scope,
    cursors: pages.cursors,
  });
  const labels = useMemo(
    () => new Map(appSearch.sources.map(source => [source.host, source.label])),
    [appSearch.sources]
  );
  const hostLabel = host => labels.get(host) || host || status.brand.name;
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    kinds: appSearch.kinds,
    query: run.query,
    hostLabel,
  };
  const search = useDetailSearch({
    rows: run.rows,
    matches: matchesAny,
    placeholderKey: 'search.appPlaceholder',
    columns: COLUMNS,
    ctx,
    prefsKey: `${context.prefsPrefix}_search`,
    bound: {
      query: url.query,
      onQueryChange: (text, parsed) => url.setNarrowing(text, narrowingOf(parsed)),
      placeholder: t('search.appPlaceholder', { app: status.brand.name }),
    },
  });
  const single = run.kinds.length === 1;
  const { scope } = url.applied;

  useEffect(() => {
    document.title = t('search.page.title');
  }, [t]);

  const total = Object.values(run.counts).reduce((sum, count) => sum + count.value, 0);

  return (
    <div className="list row">
      <PageHeader
        title={t('search.page.title')}
        subtitle={run.active ? t('search.page.count', { count: total, query: run.query }) : ''}
        chips={
          scope ? (
            <ScopeChip chip={{ scope, label: scope }} onDrop={() => url.setFilter('scope', '')} />
          ) : null
        }
      />
      {run.active ? (
        <KindPills
          run={run}
          kinds={appSearch.kinds}
          pinned={single ? run.kinds[0] : ''}
          onPin={kind => url.setFilter('kinds', kind)}
        />
      ) : null}
      <HostLines run={run} hostLabel={hostLabel} />
      <PageBody
        run={run}
        search={search}
        ctx={ctx}
        pages={pages}
        onNarrow={kind => url.setFilter('kinds', kind)}
      />
    </div>
  );
};

SearchPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SearchPage;
