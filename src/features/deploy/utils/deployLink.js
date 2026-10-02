const SEED_KEYS = [
  'box',
  'box_version',
  'box_arch',
  'box_url',
  'provisioner',
  'provisioner_version',
  'provisioner_url',
];
const SERVICE = 'hyperweaver';
const LOCAL = 'local';
const SCHEME = 'hwa://open';

/**
 * The query of the Deploy hand-off, `create=machine` first and then the
 * seed's members in the agent's order, `box`, `box_version`, `box_arch`,
 * `box_url`, `provisioner`, `provisioner_version`, `provisioner_url`, an
 * empty member left out, each given once.
 *
 * @param {Object} seed - The seed, one member a key of the two seeds
 * @returns {string} The query, without the leading `?`
 */
export const deployQuery = seed => {
  const params = new URLSearchParams({ create: 'machine' });
  SEED_KEYS.forEach(key => {
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
 * The link the Deploy glyph opens: `hwa://open?<query>` for the `local`
 * target, the agent's protocol link, else `<origin>/?<query>`, the origin
 * with no trailing slash.
 *
 * @param {string} target - `local` or the origin, from `deployTargetOf`
 * @param {Object} seed - The seed of `deployQuery`
 * @returns {string} The link
 */
export const deployHref = (target, seed) => {
  const query = deployQuery(seed);
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
