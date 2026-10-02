import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

export const hasHyperweaverEntitlement = user =>
  Array.isArray(user?.entitlements) &&
  user.entitlements.some(
    entitlement =>
      typeof entitlement.value === 'string' && entitlement.value.startsWith('hyperweaver')
  );

const artifactUrl = (item, version) =>
  item.versions.find(entry => entry.version === version)?.artifacts[0]?.downloadUrl || '';

const seedFor = ({ item, version }) => ({
  provisioner: `${item.organization.name}/${item.name}`,
  provisioner_version: version,
  provisioner_url: artifactUrl(item, version),
});

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({
  canDeploy: hasHyperweaverEntitlement,
  seedFor,
});
