import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { session } from '../../../lib/runtime';
import { hasFeature } from '../../../utils/capabilities';
import { itemShape, sortVersionsNewestFirst } from '../../../utils/itemShape';
import {
  AGENT_ORIGIN,
  deployHref,
  deployTargetOf,
  isLocalTarget,
  probeOriginOf,
} from '../utils/deployLink';
import { answersStatus } from '../utils/deployProbe';

import DeployAgentModal from './DeployAgentModal';
import HyperweaverGlyph from './HyperweaverGlyph';

const LOCAL = 'local';

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
  return signedIn ? target : LOCAL;
};

const openLocal = ({ href, onMissing }) =>
  answersStatus(AGENT_ORIGIN).then(answers => {
    if (answers) {
      window.location.assign(href);
      return;
    }
    onMissing();
  });

const openServer = ({ href, origin, localHref, notify, t }) => {
  const tab = window.open('', '_blank');
  return answersStatus(origin).then(answers => {
    if (answers && tab) {
      tab.opener = null;
      tab.location.assign(href);
      return;
    }
    tab?.close();
    answersStatus(AGENT_ORIGIN).then(local => {
      notify('warning', t('pages.deploy.serverDown'), {
        action: local ? { label: t('pages.deploy.openLocal'), href: localHref } : null,
      });
    });
  });
};

/**
 * The Deploy control every collection Hyperweaver can turn into a machine
 * draws the same way: one bare link carrying only the Hyperweaver glyph,
 * never a word, the version title on its tooltip and aria-label, the glyph
 * at 1em wherever it sits, a table cell, a card, an action row or the
 * use-this strip alike; drawn while the host advertises `deploy` and the
 * version is deployable, signed in or not. Where the link goes is the
 * session's `integrations` claim, read once through the runtime session's
 * memoized `claims()` and held: signed out, no `hyperweaver` entry, or a
 * `deploy_target` of `local` or none, is the agent's
 * `com.startcloud.hyperweaver-agent:/open?<query>` link, and any other
 * `deploy_target` is that origin's `/?<query>` page in a new tab. A press
 * asks the target's `GET /api/status` first: the local agent answering
 * follows the link in this window and its silence opens the dialog that
 * offers the agent, a server and support; a server's tab opens on the
 * press and is sent to the page when the server answers, closed when it
 * does not, with a notice that offers this machine's agent while it
 * answers. `DeployGlyph` is the control itself, for action rows and the
 * use-this strip; `deployColumn` is the listing column that draws it for
 * each row's deployable version, that version its `value` and so its
 * sort, present only while the host advertises `deploy` and a row has a
 * deployable version; `CardGlyph` draws that column's cell on a card. The
 * collection supplies only the seed of one item version.
 *
 * @param {Object} app - The collection's side of Deploy
 * @param {(args: { item: Object, version: string }) => Object} app.seedFor - The seed of one item version, the members of `deployQuery`
 * @returns {{ DeployGlyph: Function, deployColumn: Object, CardGlyph: Function }} The controls
 */
export const createDeployControls = ({ seedFor }) => {
  const DeployGlyph = ({ user, item, version }) => {
    const { t } = useTranslation();
    const status = useStatus();
    const notify = useNotify();
    const target = useDeployTarget(Boolean(user));
    const [missing, setMissing] = useState(false);
    if (!hasFeature(status, 'deploy') || !target || !version) {
      return null;
    }
    const seed = seedFor({ item, version });
    const href = deployHref(target, seed);
    const local = isLocalTarget(target);
    const title = t('pages.deploy.versionTitle', { version });
    const press = event => {
      event.preventDefault();
      if (local) {
        openLocal({ href, onMissing: () => setMissing(true) });
        return;
      }
      openServer({
        href,
        origin: probeOriginOf(target),
        localHref: deployHref(LOCAL, seed),
        notify,
        t,
      });
    };
    return (
      <>
        <a
          className="text-primary d-inline-flex align-items-center v-align-middle me-2"
          href={href}
          {...(local ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          title={title}
          aria-label={title}
          data-deploy={local ? 'local' : 'server'}
          onClick={press}
        >
          <HyperweaverGlyph />
        </a>
        {missing ? (
          <DeployAgentModal user={user || null} onClose={() => setMissing(false)} />
        ) : null}
      </>
    );
  };

  DeployGlyph.propTypes = deployProps;

  const deployColumn = {
    key: 'deploy',
    kind: 'badge',
    labelKey: 'pages.table.deploy',
    priority: 2,
    when: (rows, ctx) =>
      hasFeature(ctx.status, 'deploy') && rows.some(row => deployableVersion(row.versions)),
    value: item => deployableVersion(item.versions),
    render: (item, ctx) => (
      <DeployGlyph user={ctx.user} item={item} version={deployableVersion(item.versions)} />
    ),
  };

  const CardGlyph = ({ item, ctx }) => deployColumn.render(item, ctx);

  CardGlyph.propTypes = slotProps;

  return { DeployGlyph, deployColumn, CardGlyph };
};
