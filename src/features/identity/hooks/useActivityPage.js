import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { exportUrl } from '../api/activity';
import { activityFiltersOf, activityParamsOf } from '../components/ActivityFilters';

import { useAdminRead } from './useAdminRead';

const PAGE_SIZE = 25;

const pageOf = params => Math.max(0, Number(params.get('page')) || 0);

/**
 * The state of one Activity page whose filters live in its URL: the
 * draft the form edits, the applied filters and the zero-based page read
 * from the query, the paged read over them with the contract's example
 * on a 404, and the handlers to apply, clear, page and export.
 *
 * @param {Object} options - The page
 * @param {Function} options.read - Answers the paged list for the parameters
 * @param {Object} options.example - The contract's example payload
 * @param {string} options.exportName - The export attachment's name
 * @returns {Object} `draft`, `setDraft`, `applied`, `page`, `data`, `loading`, `reload`, `apply`, `clear`, `setPage`, `doExport`
 */
export const useActivityPage = ({ read, example, exportName }) => {
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => activityFiltersOf(params), [params]);
  const page = pageOf(params);
  const [edited, setEdited] = useState({ base: applied, value: applied });
  const draft = edited.base === applied ? edited.value : applied;

  const query = useMemo(
    () => ({ ...activityParamsOf(applied), page, size: PAGE_SIZE }),
    [applied, page]
  );

  const { data, loading, reload } = useAdminRead({
    read: () => read(query),
    example,
    key: JSON.stringify(query),
  });

  const write = (filters, nextPage) => {
    const next = activityParamsOf(filters);
    if (nextPage > 0) {
      next.page = String(nextPage);
    }
    setParams(next);
  };

  return {
    draft,
    setDraft: value => setEdited({ base: applied, value }),
    applied,
    page,
    data,
    loading,
    reload,
    apply: () => write(draft, 0),
    clear: () => setParams({}),
    setPage: nextPage => write(applied, nextPage),
    doExport: () => window.location.assign(exportUrl(exportName, activityParamsOf(applied))),
  };
};
