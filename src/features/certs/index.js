import { lazy } from 'react';

export { default as VaultProvider } from './hooks/useVault';
export { sidebar } from './sidebar';

export const VaultPage = lazy(() => import('./components/VaultPage'));
export const SharedPage = lazy(() => import('./components/SharedPage'));
export const SyncPage = lazy(() => import('./components/SyncPage'));
export const RecordPage = lazy(() => import('./components/RecordPage'));
export const ConvertPage = lazy(() => import('./components/ConvertPage'));
export const DecodePage = lazy(() => import('./components/DecodePage'));
export const MatchPage = lazy(() => import('./components/MatchPage'));
export const ComparePage = lazy(() => import('./components/ComparePage'));
export const ChainPage = lazy(() => import('./components/ChainPage'));
export const GeneratePage = lazy(() => import('./components/GeneratePage'));
