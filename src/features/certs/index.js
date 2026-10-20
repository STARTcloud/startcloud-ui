import { lazy } from 'react';

export { default as CertsPreferencesCard } from './components/CertsPreferencesCard';
export { default as PickSecretModal } from './components/PickSecretModal';
export { default as PullAction } from './components/PullAction';
export { default as SecretRecordModal } from './components/SecretRecordModal';
export { default as SecretsActions } from './components/SecretsActions';
export { syncChipsColumnOf, syncColumnsOf } from './components/SyncMarks';
export { useSecretStores } from './hooks/useSecretStores';
export {
  SECRET_STORE_COLUMNS,
  SECRET_STORE_FILTERS,
  STORE_COLUMNS,
  matchesStoreRow,
  storeFilterGroupsOf,
} from './components/storeColumns';
export { usePullToVault } from './hooks/usePullToVault';
export { default as VaultProvider } from './hooks/useVault';
export { useVault } from './hooks/useVault';
export { sidebar } from './sidebar';
export { DER_KINDS, SECRET_KINDS, isSecretKind, newRecord, nowOf } from './utils/records';
export { profileOf } from './utils/secretProfiles';
export { DETACHED, recordOf, rowOf } from './utils/sync';

export const VaultPage = lazy(() => import('./components/VaultPage'));
export const SharedPage = lazy(() => import('./components/SharedPage'));
export const RecordPage = lazy(() => import('./components/RecordPage'));
export const ConvertPage = lazy(() => import('./components/ConvertPage'));
export const DecodePage = lazy(() => import('./components/DecodePage'));
export const MatchPage = lazy(() => import('./components/MatchPage'));
export const ComparePage = lazy(() => import('./components/ComparePage'));
export const ChainPage = lazy(() => import('./components/ChainPage'));
export const GeneratePage = lazy(() => import('./components/GeneratePage'));
