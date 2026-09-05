import { useContext, useEffect } from 'react';

import { NavbarSearchContext } from '../contexts/SearchContext';

const groupSignature = group => [
  group.key,
  group.label,
  Object.entries(group.entries),
  [...group.activeSet],
  [...(group.excludeSet || [])],
];

const bindingSignature = binding =>
  JSON.stringify([
    binding.query,
    binding.placeholder,
    binding.matched,
    binding.total,
    binding.groups.map(groupSignature),
  ]);

/**
 * Publishes a page's search and filter state to the navbar for as long as
 * the calling component is mounted. The newest binding is stored on every
 * render, so the navbar's handlers never go stale; the navbar re-renders
 * only when the visible data (query, counts, groups, active values)
 * changes.
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
