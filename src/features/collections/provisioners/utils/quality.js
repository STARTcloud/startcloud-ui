export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const RULES_GUIDE = '/docs/guides/quality-tiers/';

const CATALOG_GUIDE = 'https://provisioner-catalog.startcloud.com/docs/guides/quality-tiers/';

export const HEALTH_GUIDE = {
  artifacts: `${CATALOG_GUIDE}#artifacts`,
  sidecars: `${CATALOG_GUIDE}#sidecars`,
};

/**
 * The rules of one tier as the catalog's `rules` document answers them,
 * `{ <tier>: { <rule>: passed } }`, each `{ key, tier, name, passed }`,
 * the passed ones first, the document's own order kept within each.
 *
 * @param {Object} rules - The `rules` document
 * @param {string} tier - The tier
 * @returns {Array<{ key: string, tier: string, name: string, passed: boolean }>} The rules
 */
export const tierRulesOf = (rules, tier) => {
  const entries = Object.entries(rules?.[tier] || {}).map(([name, passed]) => ({
    key: `${tier}.${name}`,
    tier,
    name,
    passed: passed === true,
  }));
  return [...entries.filter(rule => rule.passed), ...entries.filter(rule => !rule.passed)];
};

/**
 * The score of a `rules` document: the rules passed and every rule, over
 * the five tiers.
 *
 * @param {Object} rules - The `rules` document
 * @returns {{ passed: number, total: number }} The score
 */
export const scoreOf = rules => {
  const all = TIERS.flatMap(tier => tierRulesOf(rules, tier));
  return { passed: all.filter(rule => rule.passed).length, total: all.length };
};

/**
 * The share of a tier's rules passed, a whole percent, 0 for a tier with
 * no rule.
 *
 * @param {Array<Object>} rules - The rules of `tierRulesOf`
 * @returns {number} The percent
 */
export const percentOf = rules =>
  rules.length === 0
    ? 0
    : Math.round((rules.filter(rule => rule.passed).length / rules.length) * 100);

/**
 * The quality a card draws for one version: that version's own tier and
 * rules while the catalog measured it, else the family's, measured on its
 * newest version.
 *
 * @param {Object} item - The provisioner item
 * @param {Object|null} version - The version selected
 * @returns {{ tier: string, rules: Object, measuredOn: string }} The quality
 */
export const qualityOf = (item, version) => {
  if (version?.extras?.tier) {
    return {
      tier: version.extras.tier,
      rules: version.extras.rules || {},
      measuredOn: version.version,
    };
  }
  return {
    tier: item.extras.tier,
    rules: item.extras.rules || {},
    measuredOn: item.versions[0]?.version || '',
  };
};

/**
 * The tier a meter opens on by default, the one above the tier held.
 *
 * @param {string} tier - The tier held
 * @returns {string} The tier above, the first for an unrated family
 */
export const openTierOf = tier => TIERS[TIERS.indexOf(tier) + 1] || '';

/**
 * The verified providers of one version, by name.
 *
 * @param {Object|null} version - The version
 * @returns {Array<string>} The provider names
 */
export const providerNamesOf = version => (version?.providers || []).map(provider => provider.name);

/**
 * The page of the box a version's provider is verified with, the `url` of
 * its entry in the catalog's `boxes` member,
 * `{ organization, name, version, architecture, url }`, empty while it
 * names none.
 *
 * @param {Object|null} version - The version
 * @param {string} provider - The provider
 * @returns {string} The URL
 */
export const boxUrlOf = (version, provider) => {
  const url = version?.extras?.boxes?.[provider]?.url;
  return typeof url === 'string' ? url : '';
};

/**
 * The words a verified box's link carries in its tooltip, the box as
 * `organization/name`, its version and its architecture, empty while the
 * catalog names no box.
 *
 * @param {Object|null} version - The version
 * @param {string} provider - The provider
 * @returns {string} The box
 */
export const boxLabelOf = (version, provider) => {
  const box = version?.extras?.boxes?.[provider];
  if (!box || typeof box !== 'object') {
    return '';
  }
  return [
    box.organization && box.name ? `${box.organization}/${box.name}` : '',
    box.version,
    box.architecture,
  ]
    .filter(Boolean)
    .join(' ');
};
