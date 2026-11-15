import { hasFeature } from '../../../utils/capabilities';

const HANDS_OVER = ['send_failed', 'sms_unavailable', 'locked'];
const LOCKED_LABELS = {
  SMS: 'shared:profile.security.tfa.sms',
  APP: 'shared:profile.security.tfa.app',
  PASSKEY: 'tfa.method.passkey',
  BACKUP_CODE: 'tfa.method.backup',
  EMAIL: 'tfa.method.email',
};
const OFFERED_FLAG = { SMS: 'sms', PASSKEY: 'passkey', EMAIL: 'email' };

/**
 * The value of one radio card: the method, joined to the authenticator's
 * id where the method has several.
 *
 * @param {string} method - `SMS`, `APP`, `PASSKEY`, `BACKUP_CODE` or `EMAIL`
 * @param {number|string} [id] - The authenticator's id
 * @returns {string} The key
 */
export const keyOf = (method, id) => (id ? `${method}:${id}` : method);

/**
 * The choice a radio card's value names.
 *
 * @param {string} key - A key from `keyOf`
 * @returns {{ tfaMethod: string, authenticatorId: string }}
 */
export const parseKey = key => {
  const [tfaMethod, authenticatorId = ''] = key.split(':');
  return { tfaMethod, authenticatorId };
};

const smsOptions = (answer, t) =>
  (answer.sms || []).map(entry => ({
    key: keyOf('SMS', entry.id),
    method: 'SMS',
    label: t('tfa.method.sms', { label: entry.label }),
    help: entry.masked,
    extra: answer.sms_risk_notice ? t('tfa.method.smsRisk') : '',
  }));

const appOptions = (answer, t) =>
  (answer.app || []).map(entry => ({
    key: keyOf('APP', entry.id),
    method: 'APP',
    label: t('tfa.method.app', { label: entry.label }),
    help: '',
    extra: '',
  }));

const single = (method, label, help) => ({ key: method, method, label, help, extra: '' });

const lockedCard = (method, t) => ({
  key: method,
  method,
  label: t(LOCKED_LABELS[method]),
  help: t('tfa.method.locked'),
  extra: '',
  disabled: true,
});

const lockedCards = (locked, offers, t) =>
  locked
    .filter(method => LOCKED_LABELS[method])
    .filter(method => !OFFERED_FLAG[method] || offers(OFFERED_FLAG[method]))
    .map(method => lockedCard(method, t));

/**
 * The radio cards of the second-factor choice, from the methods answer or
 * from the five members a refusal carried: each phone while the host lists
 * the `sms` sub flag of `tfa`, each app, a passkey while `passkey` is true
 * and listed, a backup code while `backup_codes` is true, and the emailed
 * code while `email` is true and the `email` sub flag is listed; every
 * phone and app listed stays enabled, and each method `locked` names draws
 * one more card, disabled with the locked help, whatever its member says,
 * so a locked app or phone is told while the others stay offered; the
 * enabled cards come first.
 *
 * @param {Object} answer - `{ sms, app, passkey, backup_codes, email, locked, sms_risk_notice }`
 * @param {Object} status - The payload from `probeStatus`
 * @param {Function} t - The `auth` namespace's translator, `shared` loaded beside it
 * @returns {Array<{ key: string, method: string, label: string, help: string, extra: string, disabled?: boolean }>}
 */
export const buildOptions = (answer, status, t) => {
  const locked = Array.isArray(answer.locked) ? answer.locked : [];
  const offers = flag => hasFeature(status, 'tfa', flag);
  return [
    ...(offers('sms') ? smsOptions(answer, t) : []),
    ...appOptions(answer, t),
    ...(answer.passkey && offers('passkey')
      ? [single('PASSKEY', t('tfa.method.passkey'), t('tfa.method.passkeyHelp'))]
      : []),
    ...(answer.backup_codes
      ? [single('BACKUP_CODE', t('tfa.method.backup'), t('tfa.method.backupHelp'))]
      : []),
    ...(answer.email && offers('email')
      ? [single('EMAIL', t('tfa.method.email'), t('tfa.method.emailHelp'))]
      : []),
    ...lockedCards(locked, offers, t),
  ];
};

/**
 * The card checked when the choice opens: the answer's preferred method
 * while it is enabled, else the first enabled card, else none.
 *
 * @param {Object} answer - The methods answer
 * @param {Array<Object>} options - The cards from `buildOptions`
 * @returns {string} The key, or empty
 */
export const preferredKey = (answer, options) => {
  const preferred = answer.preferred
    ? keyOf(answer.preferred.method, answer.preferred.authenticator_id)
    : '';
  const enabled = options.filter(option => !option.disabled);
  if (enabled.some(option => option.key === preferred)) {
    return preferred;
  }
  return enabled[0]?.key || '';
};

/**
 * The five members a `send_failed`, `sms_unavailable` or `locked` refusal
 * carries, the methods the person can use instead, a `locked` refusal
 * adding `locked` with the one method it closed; null for any other
 * failure and for one of those refusals whose body carries no `sms` list.
 *
 * @param {Object} error - The `ApiError`
 * @returns {{ sms: Array, app: Array, passkey: boolean, backup_codes: boolean, email: boolean, locked?: string[] }|null}
 */
export const membersOf = error => {
  if (!HANDS_OVER.includes(error?.code) || !Array.isArray(error.data?.sms)) {
    return null;
  }
  const { sms, app, passkey, backup_codes, email, method } = error.data;
  const members = { sms, app, passkey, backup_codes, email };
  return error.code === 'locked' && typeof method === 'string'
    ? { ...members, locked: [method] }
    : members;
};

/**
 * The methods answer a refusal's members redraw: the members over the
 * answer held, `locked` the union of what the answer named and what the
 * refusal closed, so a refused pick never forgets a method the read
 * named as locked.
 *
 * @param {Object|null} previous - The methods answer held, or null
 * @param {Object} members - The members from `membersOf`
 * @returns {Object} The answer to draw
 */
export const withMembers = (previous, members) => ({
  ...previous,
  ...members,
  locked: [...new Set([...(previous?.locked || []), ...(members.locked || [])])],
});

/**
 * The problem a page opened with `?error=<code>` draws, the form a
 * redirected form post reports its refusal in; null without one.
 *
 * @param {string} search - The location's query string
 * @returns {{ code: string, status: number, wait: number, since: number }|null}
 */
export const queryProblemOf = search => {
  const code = new URLSearchParams(search).get('error');
  return code ? { code, status: 0, wait: 0, since: 0 } : null;
};
