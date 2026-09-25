import { lazy } from 'react';

export { bootstrapConsume } from './api/bootstrap';
export {
  acceptInvitation,
  activeInvitations,
  consumeInvite,
  invite,
  removeInvitation,
  validateInvitation,
} from './api/invitations';
export { methods } from './api/methods';
export { register } from './api/register';
export { resendVerification, verifyMail } from './api/verify';
export { default as CallbackPage } from './components/CallbackPage';

export const BootstrapLoginPage = lazy(() => import('./components/BootstrapLoginPage'));
export const InvitePage = lazy(() => import('./components/InvitePage'));
export const LoginPage = lazy(() => import('./components/LoginPage'));
export const MagicLinkPage = lazy(() => import('./components/MagicLinkPage'));
export const OrgInvitePage = lazy(() => import('./components/OrgInvitePage'));
export const PasswordRecoveryPage = lazy(() => import('./components/PasswordRecoveryPage'));
export const PasswordResetPage = lazy(() => import('./components/PasswordResetPage'));
export const RegisterPage = lazy(() => import('./components/RegisterPage'));
export const VerifyLinkPage = lazy(() => import('./components/VerifyLinkPage'));
