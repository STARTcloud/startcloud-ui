const SEED_KEYS = [
  'box',
  'box_version',
  'box_arch',
  'box_url',
  'provisioner',
  'provisioner_version',
  'provisioner_url',
  'provisioner_catalog',
];
const BOX_PROVIDER = /^box_[a-z0-9_-]+$/u;
const SERVICE = 'hyperweaver';
const LOCAL = 'local';
// Do not change this scheme without reading docs/guides/universal-deploy.md, "The agent's scheme".
const SCHEME = 'hwa://open';
const MACHINE = 'machine';
const SOURCE = 'source';

/**
 * The seed keys of each word of the Deploy hand-off, in the agent's order:
 * `machine` every fixed member, `provisioner` the family's four,
 * `template` the box's four and `source` the one catalog or registry URL.
 */
export const WORD_KEYS = {
  machine: SEED_KEYS,
  provisioner: ['provisioner', 'provisioner_version', 'provisioner_url', 'provisioner_catalog'],
  template: ['box', 'box_version', 'box_arch', 'box_url'],
  source: ['provisioner_catalog', 'box_url'],
};

export const DEPLOY_WORDS = Object.keys(WORD_KEYS);

export const AGENT_ORIGIN = 'https://127.0.0.1:9421';

export const AGENT_DOWNLOAD_URL = 'https://github.com/Makr91/hyperweaver-agent/releases/latest';

/**
 * Whether a seed key is a `box_<provider>` member, the catalog's verified
 * box of one provider, a provider name of lowercase letters, digits,
 * underscores and hyphens; the fixed box members, `box_version`,
 * `box_arch` and `box_url`, are never one.
 *
 * @param {string} key - The seed key
 * @returns {boolean} True for a `box_<provider>` member
 */
export const isBoxProviderKey = key => BOX_PROVIDER.test(key) && !SEED_KEYS.includes(key);

const providerKeysOf = seed =>
  Object.keys(seed || {})
    .filter(key => isBoxProviderKey(key) && seed[key])
    .sort();

const keysOf = (seed, word) => {
  const keys = WORD_KEYS[word] || SEED_KEYS;
  if (word === SOURCE) {
    return keys.filter(key => seed?.[key]).slice(0, 1);
  }
  return word === MACHINE ? [...keys, ...providerKeysOf(seed)] : keys;
};

/**
 * The query of the Deploy hand-off: `create=<word>` first and then the
 * word's own seed members in the agent's order, an empty member left out,
 * each given once; `machine` carries the `box_<provider>` members sorted
 * by key after the fixed ones, and `source` carries the one URL the seed
 * holds, `provisioner_catalog` before `box_url`.
 *
 * @param {Object} seed - The seed, one member a key of the two seeds
 * @param {string} [word] - The word under `create`, `machine` unless given
 * @returns {string} The query, without the leading `?`
 */
export const deployQuery = (seed, word = MACHINE) => {
  const params = new URLSearchParams({ create: word });
  keysOf(seed, word).forEach(key => {
    if (seed?.[key]) {
      params.set(key, String(seed[key]));
    }
  });
  return params.toString();
};

/**
 * Where a person's deploys go, read from the `integrations` claim: `local`
 * while the claim is absent, carries no `hyperweaver` entry, or that
 * entry's `settings.deploy_target` is `local` or absent, else the origin
 * `deploy_target` names.
 *
 * @param {Object|null} claims - The session's claims
 * @returns {string} `local` or the origin
 */
export const deployTargetOf = claims => {
  const entries = Array.isArray(claims?.integrations) ? claims.integrations : [];
  const target = entries.find(entry => entry?.id === SERVICE)?.settings?.deploy_target;
  return typeof target === 'string' && target && target !== LOCAL ? target : LOCAL;
};

/**
 * The link a Deploy control opens: `hwa://open?<query>` for the `local`
 * target, the agent's protocol scheme of the Universal Deploy Contract,
 * else `<origin>/?<query>`, the origin with no trailing slash, the query
 * that of `deployQuery` for the seed and the word.
 *
 * @param {string} target - `local` or the origin, from `deployTargetOf`
 * @param {Object} seed - The seed of `deployQuery`
 * @param {string} [word] - The word under `create`, `machine` unless given
 * @returns {string} The link
 */
export const deployHref = (target, seed, word = MACHINE) => {
  const query = deployQuery(seed, word);
  if (target === LOCAL) {
    return `${SCHEME}?${query}`;
  }
  return `${target.replace(/\/+$/, '')}/?${query}`;
};

/**
 * Whether a deploy link opens in this window: the agent's protocol link
 * does, a hyperweaver-server's page opens in a new tab.
 *
 * @param {string} target - `local` or the origin
 * @returns {boolean} True for the protocol link
 */
export const isLocalTarget = target => target === LOCAL;

/**
 * The origin whose `GET /api/status` a press asks before it follows the
 * link: the local agent's for the `local` target, else the target itself.
 *
 * @param {string} target - `local` or the origin
 * @returns {string} The origin, no trailing slash
 */
export const probeOriginOf = target =>
  target === LOCAL ? AGENT_ORIGIN : target.replace(/\/+$/, '');
