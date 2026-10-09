import { FaDownload, FaPlus } from 'react-icons/fa6';

import { createDeployControls, deployableVersion } from '../../../deploy';

export { deployableVersion };

const seedFor = ({ item, version }) => ({
  box: `${item.organization.name}/${item.name}`,
  box_version: version,
  box_arch: 'amd64',
  box_url: window.location.origin,
});

const words = [
  { word: 'template', labelKey: 'pages.deploy.words.template', Icon: FaDownload },
  { word: 'source', labelKey: 'pages.deploy.words.sourceRegistry', Icon: FaPlus },
];

export const { DeployGlyph, deployColumn, CardGlyph } = createDeployControls({ seedFor, words });
