import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import SectionHeading from '../../../components/common/SectionHeading';

const SEGMENTS = {
  'provisioning-network': [
    { key: 'pages.hostManage.descProvisioningNetworkSeg1' },
    { key: 'pages.hostManage.descProvisioningNetworkOne', strong: true },
    { key: 'pages.hostManage.descProvisioningNetworkSeg2' },
    { code: 'provisioning.network' },
    { key: 'pages.hostManage.descProvisioningNetworkSeg3' },
    { host: true },
    { key: 'pages.hostManage.descProvisioningNetworkSeg4', tight: true },
  ],
  recipes: [
    { key: 'pages.hostManage.descRecipesSeg1' },
    { host: true },
    { key: 'pages.hostManage.descRecipesSeg2' },
    { code: 'zone_setup' },
    { key: 'pages.hostManage.descRecipesSeg3' },
  ],
};

const tokenId = token => token.key || token.code || 'host';

const Token = ({ token, hostname }) => {
  const { t } = useTranslation();
  if (token.host) {
    return <strong>{hostname}</strong>;
  }
  if (token.code) {
    return <code>{token.code}</code>;
  }
  return token.strong ? <strong>{t(token.key)}</strong> : t(token.key);
};

Token.propTypes = {
  token: PropTypes.shape({
    key: PropTypes.string,
    code: PropTypes.string,
    host: PropTypes.bool,
    strong: PropTypes.bool,
  }).isRequired,
  hostname: PropTypes.string.isRequired,
};

/**
 * The sentence under a section's heading, hyperweaver-ui's: the first
 * half, the host's name in bold, a stop and the second half, and for
 * the provisioning network and the recipes their own segments with a
 * code word among them.
 */
const Description = ({ section, hostname }) => {
  const { t } = useTranslation();
  const segments = SEGMENTS[section.key];
  if (segments) {
    return (
      <p className="text-muted">
        {segments.map(token => (
          <span key={tokenId(token)}>
            {token.tight ? '' : ' '}
            <Token token={token} hostname={hostname} />
          </span>
        ))}
      </p>
    );
  }
  if (section.descKeys.length === 0) {
    return null;
  }
  const [pre, post] = section.descKeys;
  return (
    <p className="text-muted">
      {t(pre)} <strong>{hostname}</strong>. {t(post)}
    </p>
  );
};

Description.propTypes = {
  section: PropTypes.shape({
    key: PropTypes.string.isRequired,
    descKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  hostname: PropTypes.string.isRequired,
};

/**
 * One section of the Manage page, hyperweaver-ui's tab as a glass
 * section that folds: the heading with the section's label, a count where the section names one, its actions and the
 * chevron that folds it, the fold kept in the page's preferences, and
 * under it, while it is not folded, hyperweaver-ui's sentence about the
 * host and the section's body; a section whose sub-stage has not landed
 * draws the heading and the sentence alone. `data-panel` carries
 * `manage-` and the section's key and `data-folded` the fold.
 */
const ManageSection = ({
  section,
  hostname,
  fold,
  count = null,
  state = null,
  actions = null,
  children = null,
}) => {
  const { t } = useTranslation();
  const title = t(section.labelKey);
  return (
    <div
      data-panel={`manage-${section.key}`}
      data-folded={fold.folded}
      data-own={Boolean(section.own)}
      className="mb-3"
    >
      <SectionHeading
        title={title}
        count={count}
        state={state}
        actions={actions}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <>
          <Description section={section} hostname={hostname} />
          {children}
        </>
      )}
    </div>
  );
};

ManageSection.propTypes = {
  section: PropTypes.shape({
    key: PropTypes.string.isRequired,
    labelKey: PropTypes.string.isRequired,
    descKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    own: PropTypes.bool,
  }).isRequired,
  hostname: PropTypes.string.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.node,
  state: PropTypes.oneOf(['success', 'warning']),
  actions: PropTypes.node,
  children: PropTypes.node,
};

export default ManageSection;
