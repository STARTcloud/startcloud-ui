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
 * Publishes a page's search and filter state to the navbar for as long as
 * the calling component is mounted. The newest binding is stored on every
 * render, so the navbar's handlers never go stale; the navbar re-renders
 * only when the visible data (query, counts, groups, active values)
 * changes. A binding that publishes no `total`, a page whose rows the
 * server alone narrows, has `matched` drawn alone as "N results".
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
