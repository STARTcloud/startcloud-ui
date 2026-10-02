import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

export const hasHyperweaverEntitlement = user =>
  Array.isArray(user?.entitlements) &&
  user.entitlements.some(
    entitlement =>
      typeof entitlement.value === 'string' && entitlement.value.startsWith('hyperweaver')
  );

const seedFor = ({ item, version }) => ({
  box: `${item.organization.name}/${item.name}`,
  box_version: version,
  box_arch: 'amd64',
  box_url: window.location.origin,
});

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({
  canDeploy: hasHyperweaverEntitlement,
  seedFor,
});
