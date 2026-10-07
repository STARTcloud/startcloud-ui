import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

const seedFor = ({ item, version }) => ({
  box: `${item.organization.name}/${item.name}`,
  box_version: version,
  box_arch: 'amd64',
  box_url: window.location.origin,
});

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({ seedFor });
