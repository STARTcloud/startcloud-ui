import { lazy } from 'react';

export { useAppSearch } from './hooks/useAppSearch';

export const SearchPage = lazy(() => import('./components/SearchPage'));
