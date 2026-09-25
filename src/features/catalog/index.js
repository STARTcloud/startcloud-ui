import { lazy } from 'react';

export { collectionShape, pageContextShape } from '../../utils/itemShape';
export { sidebar } from './sidebar';

export const CollectionPage = lazy(() => import('./components/CollectionPage'));
export const HomePage = lazy(() => import('./components/HomePage'));
export const ItemPage = lazy(() => import('./components/ItemPage'));
export const OrgPage = lazy(() => import('./components/OrgPage'));
export const ProviderPage = lazy(() => import('./components/ProviderPage'));
export const VersionPage = lazy(() => import('./components/VersionPage'));
