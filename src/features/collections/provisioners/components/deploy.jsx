import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

const artifactUrl = (item, version) =>
  item.versions.find(entry => entry.version === version)?.artifacts[0]?.downloadUrl || '';

const catalogUrl = item => {
  const { origin } = window.location;
  return item.isPublic === false && item.organization.uuid
    ? `${origin}/api/private/${item.organization.uuid}/catalog`
    : `${origin}/catalog.json`;
};

const seedFor = ({ item, version }) => ({
  provisioner: `${item.organization.name}/${item.name}`,
  provisioner_version: version,
  provisioner_url: artifactUrl(item, version),
  provisioner_catalog: catalogUrl(item),
});

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({ seedFor });
