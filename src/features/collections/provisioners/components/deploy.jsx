import { FaDownload, FaPlus } from 'react-icons/fa6';

import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

const PROVIDER = /^[a-z0-9_-]+$/u;

const artifactUrl = (item, version) =>
  item.versions.find(entry => entry.version === version)?.artifacts[0]?.downloadUrl || '';

const catalogUrl = item => {
  const { origin } = window.location;
  return item.isPublic === false && item.organization.uuid
    ? `${origin}/api/private/${item.organization.uuid}/catalog`
    : `${origin}/catalog.json`;
};

const verified = ([provider, box]) =>
  PROVIDER.test(provider) &&
  Boolean(box) &&
  typeof box === 'object' &&
  Boolean(box.organization) &&
  Boolean(box.name);

/**
 * The `box_<provider>` members of one version's seed, one per provider
 * the catalog verified the version with, each
 * `organization/name@version@architecture@url` from the version's
 * `extras.boxes`; none for a version the catalog verified with no box.
 *
 * @param {Object|null} entry - The version
 * @returns {Object<string, string>} The members by key
 */
export const boxSeedOf = entry =>
  Object.fromEntries(
    Object.entries(entry?.extras?.boxes || {})
      .filter(verified)
      .map(([provider, box]) => [
        `box_${provider}`,
        [
          `${box.organization}/${box.name}`,
          box.version || '',
          box.architecture || '',
          box.url || '',
        ].join('@'),
      ])
  );

/**
 * The seed of one provisioner version: the family, the version, its
 * package URL, the catalog document the family came from and the
 * version's verified boxes.
 *
 * @param {{ item: Object, version: string }} pick - The item and the version
 * @returns {Object} The seed
 */
export const seedFor = ({ item, version }) => ({
  provisioner: `${item.organization.name}/${item.name}`,
  provisioner_version: version,
  provisioner_url: artifactUrl(item, version),
  provisioner_catalog: catalogUrl(item),
  ...boxSeedOf(item.versions.find(entry => entry.version === version)),
});

const words = [
  { word: 'provisioner', labelKey: 'pages.deploy.words.provisioner', Icon: FaDownload },
  { word: 'source', labelKey: 'pages.deploy.words.sourceCatalog', Icon: FaPlus },
];

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({ seedFor, words });
