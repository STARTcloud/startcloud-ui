import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { session } from '../../../lib/runtime';
import { hasFeature } from '../../../utils/capabilities';
import { itemShape, sortVersionsNewestFirst } from '../../../utils/itemShape';
import { deployHref, deployTargetOf, isLocalTarget } from '../utils/deployLink';

import HyperweaverGlyph from './HyperweaverGlyph';

/**
 * The version Deploy picks when the viewer has not chosen one: the newest
 * version that is not deprecated, else the newest.
 * @param {Array<Object>} versions - The item's versions
 * @returns {string} The version number, or an empty string without versions
 */
export const deployableVersion = versions => {
  const sorted = sortVersionsNewestFirst(versions || []);
  const active = sorted.find(version => !version.deprecated);
  return (active || sorted[0])?.version || '';
};

const deployProps = {
  user: PropTypes.object,
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
};

const slotProps = {
  item: itemShape.isRequired,
  ctx: PropTypes.shape({ user: PropTypes.object }).isRequired,
};

const useDeployTarget = signedIn => {
  const [target, setTarget] = useState('');
  useEffect(() => {
    if (!signedIn) {
      return undefined;
    }
    let mounted = true;
    session
      .claims()
      .then(deployTargetOf, () => deployTargetOf(null))
      .then(value => {
        if (mounted) {
          setTarget(value);
        }
      });
    return () => {
      mounted = false;
    };
  }, [signedIn]);
  return signedIn ? target : '';
};

/**
 * The Deploy control every collection Hyperweaver can turn into a machine
 * draws the same way: one bare link carrying only the Hyperweaver glyph,
 * never a word, the version title on its tooltip and aria-label, the glyph
 * at 1em wherever it sits, a table cell, a card, an action row or the
 * use-this strip alike; drawn only while the host advertises `deploy`,
 * the viewer is signed in, entitled to Hyperweaver and the version is
 * deployable. Where the link goes is the session's `integrations` claim,
 * read once through the runtime session's memoized `claims()` and held:
 * no `hyperweaver` entry, or a `deploy_target` of `local` or none, is the
 * agent's `hwa://open?<query>` link, opened in this window, and any other
 * `deploy_target` is that origin's `/?<query>` page, opened in a new tab.
 * `DeployGlyph` is the control itself, for action rows and the use-this
 * strip; `deployColumn` is the listing column that draws it for each
 * row's deployable version, that version its `value` and so its sort,
 * present only while the host advertises `deploy`, the viewer is
 * entitled and a row has a deployable version; `CardGlyph` draws that
 * column's cell on a card. The collection supplies only who may deploy
 * and the seed of one item version.
 *
 * @param {Object} app - The collection's side of Deploy
 * @param {(user: Object|null) => boolean} app.canDeploy - Whether the viewer holds the Hyperweaver entitlement
 * @param {(args: { item: Object, version: string }) => Object} app.seedFor - The seed of one item version, the members of `deployQuery`
 * @returns {{ DeployGlyph: Function, deployColumn: Object, CardGlyph: Function }} The controls
 */
export const createDeployControls = ({ canDeploy, seedFor }) => {
  const useDeploy = ({ user, item, version }) => {
    const { t } = useTranslation();
    const status = useStatus();
    const target = useDeployTarget(Boolean(user));
    if (!hasFeature(status, 'deploy') || !user || !target || !version || !canDeploy(user)) {
      return null;
    }
    return {
      href: deployHref(target, seedFor({ item, version })),
      local: isLocalTarget(target),
      title: t('pages.deploy.versionTitle', { version }),
    };
  };

  const DeployGlyph = ({ user, item, version }) => {
    const deploy = useDeploy({ user, item, version });
    if (!deploy) {
      return null;
    }
    return (
      <a
        className="text-primary d-inline-flex align-items-center v-align-middle me-2"
        href={deploy.href}
        {...(deploy.local ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        title={deploy.title}
        aria-label={deploy.title}
        data-deploy={deploy.local ? 'local' : 'server'}
      >
        <HyperweaverGlyph />
      </a>
    );
  };

  DeployGlyph.propTypes = deployProps;

  const deployColumn = {
    key: 'deploy',
    kind: 'badge',
    labelKey: 'pages.table.deploy',
    priority: 2,
    when: (rows, ctx) =>
      hasFeature(ctx.status, 'deploy') &&
      canDeploy(ctx.user) &&
      rows.some(row => deployableVersion(row.versions)),
    value: item => deployableVersion(item.versions),
    render: (item, ctx) => (
      <DeployGlyph user={ctx.user} item={item} version={deployableVersion(item.versions)} />
    ),
  };

  const CardGlyph = ({ item, ctx }) => deployColumn.render(item, ctx);

  CardGlyph.propTypes = slotProps;

  return { DeployGlyph, deployColumn, CardGlyph };
};
