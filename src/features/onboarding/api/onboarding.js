import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };
const PUBLIC = { auth: false };

export const onboardingState = () => client.get('/api/auth/onboarding', OPTIONS);

export const submitName = body => client.post('/complete-onboarding/name', body, OPTIONS);

export const sendPhoneCode = body =>
  client.post('/complete-onboarding/send-phone-code', body, OPTIONS);

export const verifyPhone = body => client.post('/complete-onboarding/phone-setup', body, OPTIONS);

export const submitPassword = body => client.post('/complete-onboarding/password', body, OPTIONS);

export const verifyEmailCode = body =>
  client.post('/complete-onboarding/email-verification', body, OPTIONS);

export const resendEmailCode = () =>
  client.post('/complete-onboarding/email-verification/resend', null, OPTIONS);

export const chooseTfaMethod = body =>
  client.post('/complete-onboarding/choose-2fa-method', body, OPTIONS);

export const tfaEnrollment = () => client.get('/api/auth/tfa/enroll', OPTIONS);

export const verifyApp = body => client.post('/qrcode/verify', body, OPTIONS);

export const backupCodes = () => client.post('/api/auth/tfa/backup-codes', null, OPTIONS);

export const confirmBackupCodes = () =>
  client.post('/complete-onboarding/backup-codes/confirm', null, OPTIONS);

export const submitAccountType = body =>
  client.post('/complete-onboarding/account-type', body, OPTIONS);

export const submitTeamName = body => client.post('/complete-onboarding/team-name', body, OPTIONS);

export const terms = () => client.get('/api/auth/terms', OPTIONS);

export const acceptTerms = body => client.post('/oauth2/accept-terms', body, OPTIONS);

export const acceptProviderTerms = body =>
  client.post('/provider-registration/tos/accept', body, OPTIONS);

export const geoCountry = () => client.get('/api/public/geo/country', PUBLIC);
