import { useContext, useEffect } from 'react';

import { NavbarSearchContext } from '../contexts/SearchContext';

const groupSignature = group => {
  if (group.kind === 'date-range') {
    return [group.key, group.label, group.value.start, group.value.end];
  }
  return [
    group.key,
    group.label,
    Object.entries(group.entries),
    [...group.activeSet],
    [...(group.excludeSet || [])],
  ];
};

const bindingSignature = binding =>
  JSON.stringify([
    binding.query,
    binding.placeholder,
    binding.matched,
    typeof binding.total === 'number' ? binding.total : null,
    binding.groups.map(groupSignature),
    binding.action ? [binding.action.key, binding.action.labelKey] : null,
  ]);

/**
 * Publishes a page's search and filter state to the navbar search box while
 * the calling component is mounted, notifying it when the query, counts,
 * groups or active values change; the box draws `matched / total`, or
 * `matched` alone as "N results" for a binding with no `total`, and calls
 * `onQueryChange(text, parsed)` with the typed text less its `type:` and
 * `org:` words and the `parseQuery` reading of the whole.
 *
 * @param {Object} binding - `{ query, onQueryChange, placeholder, matched, total?, groups, onClearFilters, action? }`
 */
export const useNavbarSearchBinding = binding => {
  const context = useContext(NavbarSearchContext);
  const store = context?.store;
  const signature = bindingSignature(binding);

  useEffect(() => {
    store?.replace(binding);
  });

  useEffect(() => {
    store?.notify();
  }, [store, signature]);

  useEffect(
    () => () => {
      store?.replace(null);
      store?.notify();
    },
    [store]
  );
};
