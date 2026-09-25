import { lazy } from 'react';

export const AccountTypeStep = lazy(() => import('./components/AccountTypeStep'));
export const BackupCodesPage = lazy(() => import('./components/BackupCodesPage'));
export const EmailCodeStep = lazy(() => import('./components/EmailCodeStep'));
export const NameStep = lazy(() => import('./components/NameStep'));
export const OnboardingHub = lazy(() => import('./components/OnboardingHub'));
export const PhoneStep = lazy(() => import('./components/PhoneStep'));
export const TeamNameStep = lazy(() => import('./components/TeamNameStep'));
export const TermsPage = lazy(() => import('./components/TermsPage'));
export const TfaEnrollChoiceStep = lazy(() => import('./components/TfaEnrollChoiceStep'));
export const TotpEnrollPage = lazy(() => import('./components/TotpEnrollPage'));
