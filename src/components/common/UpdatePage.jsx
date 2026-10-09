import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCircleUp,
  FaFile,
  FaListCheck,
  FaRotate,
} from 'react-icons/fa6';

import { useGuard } from '../../contexts/GuardContext';
import { useNotify } from '../../contexts/NoticeContext';
import { useStatus } from '../../contexts/StatusContext';
import { useEventStream } from '../../hooks/useEventStream';
import { useFolds } from '../../hooks/useFolds';
import { log } from '../../lib/logger';
import { formatFileSize } from '../../utils/formatFileSize';
import { formatRelativeTime } from '../../utils/relativeTime';

import ConfirmModal from './ConfirmModal';
import { absoluteTime } from './InboxList';
import MarkdownText from './MarkdownText';
import { httpsUrl } from './MethodList';
import SectionCard, { foldsShape } from './SectionCard';
import SectionHeading from './SectionHeading';

const EMPTY = { data: null, loaded: false, failed: false };

const ASSETS_OPEN = 'update-assets-open';

const ADMIN_CONFIRM = {
  titleKey: 'admin.update.confirmTitle',
  messageKey: 'admin.update.confirmMessage',
};

const assetShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  checksum: PropTypes.string.isRequired,
});

/**
 * The release assets a check carries: every entry of `assets` with a
 * name, as `{ name, url, size, checksum }`, the size in bytes and the
 * url and the checksum empty strings while the entry holds none; an
 * absent or null `assets` is no asset.
 *
 * @param {Array|null|undefined} list - The `assets` member of the check
 * @returns {Array<{ name: string, url: string, size: number, checksum: string }>} The assets
 */
export const assetsOf = list =>
  Array.isArray(list)
    ? list
        .filter(asset => asset && typeof asset === 'object' && asset.name)
        .map(asset => ({
          name: String(asset.name),
          url: String(asset.url ?? ''),
          size: Number(asset.size) || 0,
          checksum: String(asset.checksum ?? ''),
        }))
    : [];

/**
 * The update a check offers: the current and the latest version with the
 * release URL, the release date, the changelog URL, the release notes as
 * markdown and the release assets, each empty while the answer holds
 * none, while the answer says `update_available`, null otherwise, so a
 * backend that is current or answers no check draws no Update button.
 *
 * @param {Object|null} answer - The answer of `GET app/updates/check`
 * @returns {{ current: string, latest: string, releaseUrl: string, releaseDate: string, changelog: string, releaseNotes: string, assets: Array }|null} The update
 */
export const updateOf = answer =>
  answer?.update_available
    ? {
        current: String(answer.current_version ?? ''),
        latest: String(answer.latest_version ?? ''),
        releaseUrl: String(answer.release_url ?? ''),
        releaseDate: String(answer.release_date ?? ''),
        changelog: String(answer.changelog ?? ''),
        releaseNotes: String(answer.release_notes ?? ''),
        assets: assetsOf(answer.assets),
      }
    : null;

const FootLink = ({ href, label, Icon }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    <Icon aria-hidden />
    {label}
  </a>
);

FootLink.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
};

const SideCard = ({ data, language }) => {
  const { t } = useTranslation();
  const published = String(data.release_date ?? '');
  const release = httpsUrl(data.release_url);
  const changelog = httpsUrl(data.changelog);
  return (
    <div className="card upd-side-card">
      <div className="card-body">
        <dl className="upd-side-rows">
          <dt>{t('hosts.nav.updateCurrentVersion')}</dt>
          <dd>
            <code>{String(data.current_version ?? '')}</code>
          </dd>
          <dt>{t('hosts.nav.updateLatestVersion')}</dt>
          <dd>
            <code>{String(data.latest_version ?? '')}</code>
          </dd>
          {published ? (
            <>
              <dt>{t('hosts.nav.updatePublished')}</dt>
              <dd>
                <span title={absoluteTime(published, language)}>
                  {formatRelativeTime(published, language)}
                </span>
              </dd>
            </>
          ) : null}
        </dl>
        {release || changelog ? (
          <div className="upd-foot-links">
            {release ? (
              <FootLink
                href={release}
                label={t('hosts.nav.updateReleaseNotes')}
                Icon={FaArrowUpRightFromSquare}
              />
            ) : null}
            {changelog ? (
              <FootLink
                href={changelog}
                label={t('hosts.nav.updateChangelog')}
                Icon={FaListCheck}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

SideCard.propTypes = {
  data: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
};

const ReleaseNotes = ({ notes, version }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="upd-label">{t('hosts.nav.updateNotes', { version })}</div>
      <MarkdownText text={notes} className="prose upd-notes" />
    </>
  );
};

ReleaseNotes.propTypes = {
  notes: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
};

const AssetRow = ({ asset }) => {
  const url = httpsUrl(asset.url);
  return (
    <li className="upd-asset">
      <FaFile className="upd-asset-glyph" aria-hidden />
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {asset.name}
        </a>
      ) : (
        <span className="upd-asset-name">{asset.name}</span>
      )}
      {asset.checksum ? (
        <code className="checksum upd-asset-checksum" title={asset.checksum}>
          {asset.checksum}
        </code>
      ) : null}
      <span className="upd-asset-size">{formatFileSize(asset.size)}</span>
    </li>
  );
};

AssetRow.propTypes = {
  asset: assetShape.isRequired,
};

const Assets = ({ assets, folds }) => {
  const { t } = useTranslation();
  const folded = !folds.folded(ASSETS_OPEN);
  return (
    <div data-panel="update-assets" data-folded={folded}>
      <SectionCard
        title={t('hosts.nav.updateAssets')}
        badge={<span className="badge text-bg-secondary rounded-pill">{assets.length}</span>}
        folded={folded}
        onFold={() => folds.toggle(ASSETS_OPEN)}
      >
        <ul className="upd-asset-list">
          {assets.map(asset => (
            <AssetRow key={`${asset.name} ${asset.url}`} asset={asset} />
          ))}
        </ul>
      </SectionCard>
    </div>
  );
};

Assets.propTypes = {
  assets: PropTypes.arrayOf(assetShape).isRequired,
  folds: foldsShape.isRequired,
};

const stateOf = ({ check, available, t }) => {
  if (!check.loaded) {
    return { count: t('pages.loading'), state: null };
  }
  if (check.failed) {
    return { count: t('hosts.overview.readError'), state: 'warning' };
  }
  return available
    ? { count: t('hosts.nav.updateAvailable', { version: available.latest }), state: 'warning' }
    : { count: t('hosts.nav.updateCurrent'), state: 'success' };
};

const UpdateButton = ({ update, busy, onUpdate }) => {
  const { t } = useTranslation();
  if (!update) {
    return null;
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-success"
      data-action="settings-update"
      onClick={onUpdate}
      disabled={busy}
      title={t('agentSettings.agentSettings.updateAvailableTooltip', { version: update.latest })}
    >
      <FaCircleUp className="me-2" aria-hidden="true" />
      {t('agentSettings.agentSettings.updateToButton', { version: update.latest })}
    </button>
  );
};

UpdateButton.propTypes = {
  update: PropTypes.shape({ current: PropTypes.string, latest: PropTypes.string }),
  busy: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

/**
 * The shared Update page of one backend: the heading reading whether a
 * newer release is published, in the success or the warning tone, with
 * Update behind the typed confirmation while one is, then Refresh in its
 * pane; under it two columns, stacked under the large breakpoint: at the
 * side a card with the current and the latest version, the published
 * date as a relative time with the absolute time in its tooltip, and the
 * release link and the changelog link as small text links, each drawn
 * only while the check carries its member; beside it the release notes,
 * `release_notes` of the check rendered as markdown under a small
 * heading naming the version they describe, the latest while an update
 * is available and the installed one when up to date, every link in them
 * opening its own tab, and under them the
 * Assets fold listing `assets` of the check, each a name link with its
 * size and its checksum where one is carried, folded until opened, the
 * fold kept under `prefsKey` like the page's other folds.
 *
 * It takes `update`, the adapter `{ check, apply }`, `check` answering
 * `{ current_version, latest_version, update_available, release_url,
 * release_date, changelog, release_notes, assets }` and `apply` answering
 * `{ message, task_id, target_version }`; `title`, the heading;
 * `prefsKey`, the localStorage key of the page's prefs; `confirm`,
 * `{ titleKey, messageKey }`, the keys of the confirmation, given `app`,
 * `currentVersion` and `latestVersion`, the `admin.update.*` keys by
 * default; and `onRefresh`, called beside the page's own check on
 * Refresh. The check is read once as the page draws, again when the event
 * stream opens fresh or answers `reset`, and on Refresh; Update is one
 * request and one notice.
 *
 * Caveat: `apply` runs through the shell's `useGuard` only where a
 * `GuardProvider` encloses the page, and directly otherwise.
 *
 * @param {Object} props
 * @param {{ check: Function, apply: Function }} props.update - The update adapter
 * @param {import('react').ReactNode} props.title - The heading
 * @param {string} props.prefsKey - The localStorage key of the page's prefs
 * @param {{ titleKey: string, messageKey: string }} [props.confirm] - The confirmation's keys
 * @param {Function|null} [props.onRefresh] - Called on Refresh
 * @returns {import('react').ReactElement} The page
 */
const UpdatePage = ({ update, title, prefsKey, confirm = ADMIN_CONFIRM, onRefresh = null }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const guard = useGuard();
  const folds = useFolds(prefsKey);
  const [check, setCheck] = useState(EMPTY);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const turn = useRef(0);
  const available = check.failed ? null : updateOf(check.data);
  const { count, state } = stateOf({ check, available, t });

  const read = useCallback(() => {
    turn.current += 1;
    const own = turn.current;
    update.check().then(
      data => {
        if (own === turn.current) {
          setCheck({ data, loaded: true, failed: false });
        }
      },
      error => {
        log.api.error('Update check failed', { error: error.message });
        if (own === turn.current) {
          setCheck(previous => ({ data: previous.data, loaded: true, failed: true }));
        }
      }
    );
  }, [update]);

  useEffect(() => {
    read();
  }, [read]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      read();
    }
  });

  useEventStream('reset', () => read());

  const refresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    read();
  };

  const applyUpdate = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const answer = await (guard ? guard(update.apply) : update.apply());
      notify(
        'success',
        t('agentSettings.agentSettings.updateQueuedDetail', {
          message: answer?.message || t('agentSettings.agentSettings.updateQueuedFallback'),
          taskId: answer?.task_id,
          targetVersion: answer?.target_version,
        })
      );
    } catch (error) {
      notify(
        'danger',
        t('agentSettings.agentSettings.failedQueueUpdate', { message: error.message })
      );
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <>
      <UpdateButton update={available} busy={busy} onUpdate={() => setConfirming(true)} />
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refresh}>
        <FaRotate className="me-1" aria-hidden="true" />
        {t('hosts.page.refresh')}
      </button>
    </>
  );

  const values = {
    app: status?.brand?.name || '',
    currentVersion: available?.current,
    latestVersion: available?.latest,
  };

  const notes = String(check.data?.release_notes ?? '');
  const notesVersion = available ? available.latest : String(check.data?.current_version ?? '');
  const assets = assetsOf(check.data?.assets);

  return (
    <>
      <SectionHeading title={title} count={count} state={state} actions={actions} />
      <div data-panel="update">
        {check.data ? (
          <div className="row g-3">
            <div className="col-lg-4 col-xl-3">
              <SideCard data={check.data} language={i18n.language} />
            </div>
            <div className="col-lg-8 col-xl-9">
              {notes ? <ReleaseNotes notes={notes} version={notesVersion} /> : null}
              {assets.length ? <Assets assets={assets} folds={folds} /> : null}
            </div>
          </div>
        ) : null}
      </div>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={applyUpdate}
        title={t(confirm.titleKey, values)}
        message={t(confirm.messageKey, values)}
        confirmText={t('agentSettings.agentSettings.updateNowButton')}
        variant="restart"
        keyword="update"
      />
    </>
  );
};

UpdatePage.propTypes = {
  update: PropTypes.shape({
    check: PropTypes.func.isRequired,
    apply: PropTypes.func.isRequired,
  }).isRequired,
  title: PropTypes.node.isRequired,
  prefsKey: PropTypes.string.isRequired,
  confirm: PropTypes.shape({
    titleKey: PropTypes.string.isRequired,
    messageKey: PropTypes.string.isRequired,
  }),
  onRefresh: PropTypes.func,
};

export default UpdatePage;
