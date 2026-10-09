import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaRocket } from 'react-icons/fa6';

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

const MACHINE = 'machine';

const MACHINE_ROW = { word: MACHINE, labelKey: 'pages.deploy.words.machine', Icon: FaRocket };

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
  bare: PropTypes.bool,
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
 * draws the same way, one split control: the bare link carrying only the
 * Hyperweaver glyph, never a word, the version title on its tooltip and
 * aria-label, the glyph at 1em wherever it sits, a table cell, a card, an
 * action row or the use-this strip alike, and beside it a thin chevron
 * opening the menu of the other words the collection sends, Deploy a
 * machine first and then `words`, each row a label and a glyph; drawn
 * while the host advertises `deploy` and the version is deployable, signed
 * in or not. Where every link goes is the session's `integrations` claim,
 * read once through the runtime session's memoized `claims()` and held:
 * signed out, no `hyperweaver` entry, or a `deploy_target` of `local` or
 * none, is the agent's `hwa://open?<query>` link, and any other
 * `deploy_target` is that origin's `/?<query>` page in a new tab. A press
 * on the glyph or on a row asks the target's `GET /api/status` first: the
 * local agent answering follows the link in this window and its silence
 * opens the dialog that offers the agent, a server and support; a server's
 * tab opens on the press and is sent to the page when the server answers,
 * closed when it does not, with a notice that offers this machine's agent
 * while it answers. `DeployGlyph` is the control itself, for action rows
 * and the use-this strip, and given `bare` draws the glyph link alone
 * without the chevron, for a card's version row; `deployColumn` is the
 * listing column that draws it for each row's deployable version, that
 * version its `value` and so its sort, present only while the host
 * advertises `deploy` and a row has a deployable version; `CardGlyph`
 * draws that column's cell on a card. The collection supplies the seed of
 * one item version and the words of its menu.
 *
 * @param {Object} app - The collection's side of Deploy
 * @param {(args: { item: Object, version: string }) => Object} app.seedFor - The seed of one item version, the members of `deployQuery`
 * @param {Array<{ word: string, labelKey: string, Icon: Function }>} [app.words] - The words the menu sends after Deploy a machine, each its label key and glyph
 * @returns {{ DeployGlyph: Function, deployColumn: Object, CardGlyph: Function }} The controls
 */
export const createDeployControls = ({ seedFor, words = [] }) => {
  const menuRows = [MACHINE_ROW, ...words];

  const DeployGlyph = ({ user, item, version, bare = false }) => {
    const { t } = useTranslation();
    const status = useStatus();
    const notify = useNotify();
    const target = useDeployTarget(Boolean(user));
    const [missing, setMissing] = useState(false);
    if (!hasFeature(status, 'deploy') || !target || !version) {
      return null;
    }
    const seed = seedFor({ item, version });
    const local = isLocalTarget(target);
    const title = t('pages.deploy.versionTitle', { version });
    const external = local ? {} : { target: '_blank', rel: 'noopener noreferrer' };
    const hrefOf = word => deployHref(target, seed, word);
    const pressOf = word => event => {
      event.preventDefault();
      const href = hrefOf(word);
      if (local) {
        openLocal({ href, onMissing: () => setMissing(true) });
        return;
      }
      openServer({
        href,
        origin: probeOriginOf(target),
        localHref: deployHref(LOCAL, seed, word),
        notify,
        t,
      });
    };
    const glyph = (
      <a
        className={`deploy-glyph text-primary d-inline-flex align-items-center${bare ? ' me-2' : ''}`}
        href={hrefOf(MACHINE)}
        {...external}
        title={title}
        aria-label={title}
        data-deploy={local ? 'local' : 'server'}
        onClick={pressOf(MACHINE)}
      >
        <HyperweaverGlyph />
      </a>
    );
    const modal = missing ? (
      <DeployAgentModal user={user || null} onClose={() => setMissing(false)} />
    ) : null;
    if (bare) {
      return (
        <>
          {glyph}
          {modal}
        </>
      );
    }
    return (
      <>
        <Dropdown align="end" className="deploy-split card-above me-2">
          {glyph}
          <Dropdown.Toggle
            as="button"
            type="button"
            bsPrefix="deploy-chevron"
            title={t('pages.deploy.more', { version })}
            aria-label={t('pages.deploy.more', { version })}
            data-action="deploy-more"
          >
            <FaChevronDown aria-hidden="true" />
          </Dropdown.Toggle>
          <Dropdown.Menu data-menu="deploy">
            <Dropdown.Header>{t('pages.deploy.sendTo', { version })}</Dropdown.Header>
            {menuRows.map(({ word, labelKey, Icon }) => (
              <Dropdown.Item
                key={word}
                as="a"
                href={hrefOf(word)}
                {...external}
                className="d-flex align-items-center gap-2"
                data-deploy-row={word}
                onClick={pressOf(word)}
              >
                <Icon aria-hidden="true" />
                {t(labelKey)}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        {modal}
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
