import { localeDate } from '../../../components/common/columns';

const LOCKED_BUNDLE = 'encrypted_bundle';

const LOCKED = ['encrypted_key', LOCKED_BUNDLE];

const isLocked = component => LOCKED.includes(component.kind);

/**
 * One line describing a detected component: the locked line while it
 * has no facts, a key's algorithm and size, else the subject with its
 * expiry.
 *
 * @param {Object} component - The engine's component
 * @param {Function} t - The translator
 * @param {string} language - The viewer's language
 * @returns {string} The line
 */
export const describeComponent = (component, t, language) => {
  const { facts } = component;
  if (!facts) {
    return t('certs.component.locked');
  }
  if ('has_private' in facts) {
    return `${facts.algorithm} ${facts.curve || facts.bits}`;
  }
  const expiry = facts.not_after
    ? ` · ${t('certs.component.expires', { date: localeDate(facts.not_after, language) })}`
    : '';
  return `${facts.subject_dn}${expiry}`;
};

/**
 * What a page holds before any read: no components, no file name, no
 * read made.
 */
export const EMPTY_READ = { components: [], name: '', read: false };

/**
 * The id a detected component is picked and listed by, its kind and the
 * head of its DER, the file it came from for a locked bundle that has
 * none.
 *
 * @param {Object} component - The engine's component
 * @returns {string} The id
 */
export const idOf = component =>
  `${component.kind}:${component.der_b64 ? component.der_b64.slice(0, 48) : component.source || ''}`;

/**
 * Whether a detected component can be picked: every kind but an
 * encrypted key and a locked bundle.
 *
 * @param {Object} component - The engine's component
 * @returns {boolean} True when the component can be picked
 */
export const pickable = component => !isLocked(component);

const unlocked = (held, incoming, source) =>
  incoming.some(pickable)
    ? held.filter(component => !(isLocked(component) && component.source === source))
    : held;

const lockedBundle = name => [{ kind: LOCKED_BUNDLE, der_b64: '', facts: null, source: name }];

const componentsOf = (answer, name) => {
  const incoming = (answer.components || []).map(component => ({ ...component, source: name }));
  return incoming.length === 0 && answer.needs_password ? lockedBundle(name) : incoming;
};

const merged = (held, incoming) => {
  const seen = new Set(held.map(idOf));
  return [...held, ...incoming.filter(component => !seen.has(idOf(component)))];
};

/**
 * The components held after one read: the detection's components, each
 * marked with the file it came from, a locked read that names none
 * standing as one `encrypted_bundle` component with no facts, added to
 * the ones held, a component already held left as it is, and an
 * unlocked read replacing the locked component of the same file; the
 * name the first read's file name.
 *
 * @param {{ components: Array<Object>, name: string, read: boolean }} current - What the page holds
 * @param {Object} answer - The engine's detection
 * @param {string} name - The file the detection came from
 * @returns {{ components: Array<Object>, name: string, read: boolean }} What the page holds after the read
 */
export const withRead = (current, answer, name) => {
  const incoming = componentsOf(answer, name);
  const components = merged(unlocked(current.components, incoming, name), incoming);
  return { components, name: current.name || name, read: true };
};
