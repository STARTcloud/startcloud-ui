import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { hasFeature } from '../../../utils/capabilities';
import { itemShape, sortVersionsNewestFirst } from '../../catalog/utils/itemShape';

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

/**
 * The Deploy controls every collection Hyperweaver can turn into a machine
 * draws the same way: a filled button carrying only the Hyperweaver glyph,
 * never a word, for action rows and the use-this strip, the bare glyph for
 * rows and cards through the `ItemQuickActions` slot, the version title on
 * the tooltip and aria-label of both; each drawn only while the host
 * advertises `deploy`, the viewer is signed in, entitled to Hyperweaver and
 * Hyperweaver is configured. The collection supplies only where its
 * Hyperweaver lives, who may deploy and the deep link.
 *
 * @param {Object} app - The collection's side of Deploy
 * @param {() => Promise<string>} app.fetchHyperweaverUrl - Resolves the Hyperweaver origin, an empty string when none is configured; called once per page load
 * @param {(user: Object|null) => boolean} app.canDeploy - Whether the viewer holds the Hyperweaver entitlement
 * @param {(args: { hyperweaverUrl: string, item: Object, version: string }) => string} app.hrefFor - The deep link into Hyperweaver for one item version
 * @returns {{ DeployButton: Function, DeployGlyph: Function, ItemQuickActions: Function }} The controls
 */
export const createDeployControls = ({ fetchHyperweaverUrl, canDeploy, hrefFor }) => {
  let urlPromise = null;
  const loadUrl = () => {
    urlPromise ||= Promise.resolve()
      .then(fetchHyperweaverUrl)
      .then(url => (url || '').replace(/\/+$/, ''))
      .catch(() => '');
    return urlPromise;
  };

  const useHyperweaverUrl = () => {
    const [url, setUrl] = useState('');
    useEffect(() => {
      let mounted = true;
      loadUrl().then(value => {
        if (mounted) {
          setUrl(value);
        }
      });
      return () => {
        mounted = false;
      };
    }, []);
    return url;
  };

  const useDeploy = ({ user, item, version }) => {
    const { t } = useTranslation();
    const status = useStatus();
    const hyperweaverUrl = useHyperweaverUrl();
    if (!hasFeature(status, 'deploy') || !user || !hyperweaverUrl || !version || !canDeploy(user)) {
      return null;
    }
    return {
      href: hrefFor({ hyperweaverUrl, item, version }),
      title: t('pages.deploy.versionTitle', { version }),
    };
  };

  const DeployButton = ({ user, item, version, size = '' }) => {
    const deploy = useDeploy({ user, item, version });
    if (!deploy) {
      return null;
    }
    return (
      <a
        className={`btn btn-primary ${size} d-inline-flex align-items-center me-2`}
        href={deploy.href}
        target="_blank"
        rel="noopener noreferrer"
        title={deploy.title}
        aria-label={deploy.title}
      >
        <HyperweaverGlyph />
      </a>
    );
  };

  DeployButton.propTypes = { ...deployProps, size: PropTypes.string };

  const DeployGlyph = ({ user, item, version }) => {
    const deploy = useDeploy({ user, item, version });
    if (!deploy) {
      return null;
    }
    return (
      <a
        className="text-primary"
        href={deploy.href}
        target="_blank"
        rel="noopener noreferrer"
        title={deploy.title}
        aria-label={deploy.title}
      >
        <HyperweaverGlyph />
      </a>
    );
  };

  DeployGlyph.propTypes = deployProps;

  const ItemQuickActions = ({ item, ctx }) => (
    <DeployGlyph user={ctx.user} item={item} version={deployableVersion(item.versions)} />
  );

  ItemQuickActions.propTypes = {
    item: itemShape.isRequired,
    ctx: PropTypes.shape({ user: PropTypes.object }).isRequired,
  };

  return { DeployButton, DeployGlyph, ItemQuickActions };
};
