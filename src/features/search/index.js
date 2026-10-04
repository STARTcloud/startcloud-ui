import { lazy } from 'react';

export { useAppSearch } from './hooks/useAppSearch';
export { searchKinds } from './sources';

export const SearchPage = lazy(() => import('./components/SearchPage'));
