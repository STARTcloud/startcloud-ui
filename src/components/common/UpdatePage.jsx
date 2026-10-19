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

const releaseShape = PropTypes.shape({
  tag: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  prerelease: PropTypes.bool.isRequired,
  publishedAt: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  assets: PropTypes.arrayOf(assetShape).isRequired,
});

const assetOf = (asset, url, checksum) => ({
  name: String(asset.name),
  url: String(url ?? ''),
  size: Number(asset.size) || 0,
  checksum: String(checksum ?? ''),
});

const namedAssets = list =>
  Array.isArray(list) ? list.filter(asset => asset && typeof asset === 'object' && asset.name) : [];

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
  namedAssets(list).map(asset => assetOf(asset, asset.url, asset.checksum));

/**
 * The assets of one release of the check's `releases`: every entry with
 * a name, as `{ name, url, size, checksum }`, the url the entry's
 * `browser_download_url` and the checksum its `sha256`, each an empty
 * string while the entry holds none.
 *
 * @param {Array|null|undefined} list - The `assets` member of a release
 * @returns {Array<{ name: string, url: string, size: number, checksum: string }>} The assets
 */
export const releaseAssetsOf = list =>
  namedAssets(list).map(asset => assetOf(asset, asset.browser_download_url, asset.sha256));

/**
 * Whether a version is a pre-release, a version carrying a `-` suffix
 * such as `0.2.1-dev` or `v1.4.0-beta.1`.
 *
 * @param {string|null|undefined} version - The version or tag
 * @returns {boolean} Whether it is a pre-release
 */
export const isPrerelease = version => String(version ?? '').includes('-');

const bareTag = tag => String(tag ?? '').replace(/^v/u, '');

const listedRelease = answer =>
  Array.isArray(answer.releases)
    ? answer.releases.find(
        release =>
          release &&
          typeof release === 'object' &&
          release.tag &&
          bareTag(release.tag) === bareTag(answer.latest_version)
      )
    : undefined;

const latestRelease = answer => {
  const listed = listedRelease(answer);
  if (listed) {
    return {
      tag: String(listed.tag),
      name: String(listed.name ?? ''),
      prerelease: Boolean(listed.prerelease),
      publishedAt: String(listed.published_at ?? ''),
      author: String(listed.author ?? ''),
      body: String(listed.body ?? ''),
      url: String(listed.html_url ?? ''),
      assets: releaseAssetsOf(listed.assets),
    };
  }
  return {
    tag: String(answer.latest_version),
    name: '',
    prerelease: isPrerelease(answer.latest_version),
    publishedAt: String(answer.release_date ?? ''),
    author: '',
    body: String(answer.release_notes ?? ''),
    url: String(answer.release_url ?? ''),
    assets: assetsOf(answer.assets),
  };
};

/**
 * The one release a check offers, the release whose tag is the check's
 * `latest_version`: the entry of `releases` with that tag, as
 * `{ tag, name, prerelease, publishedAt, author, body, url, assets }`,
 * each string empty while the entry holds none, and otherwise the
 * release the check's own members name, `release_date` the published
 * time, `release_notes` the body, `release_url` the url, `assets` the
 * assets and a `-` suffix on the version the pre-release mark; null
 * while the check names no version, and null while the release is a
 * pre-release and the running `current_version` is not one, so a
 * production install never sees a dev or pre-release.
 *
 * @param {Object|null} answer - The answer of `GET app/updates/check`
 * @returns {Object|null} The release, or null
 */
export const releaseOf = answer => {
  if (!answer?.latest_version) {
    return null;
  }
  const release = latestRelease(answer);
  return release.prerelease && !isPrerelease(answer.current_version) ? null : release;
};

/**
 * The update a check offers: the current and the latest version with the
 * release URL, the release date, the changelog URL, the release notes as
 * markdown and the release assets, each empty while the answer holds
 * none, while the answer says `update_available` and the latest release
 * is one the running version may take, null otherwise, so a backend that
 * is current, answers no check or is offered a pre-release on a
 * production version draws no Update button.
 *
 * @param {Object|null} answer - The answer of `GET app/updates/check`
 * @returns {{ current: string, latest: string, releaseUrl: string, releaseDate: string, changelog: string, releaseNotes: string, assets: Array }|null} The update
 */
export const updateOf = answer =>
  answer?.update_available && releaseOf(answer)
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

const Assets = ({ assets, tag, foldId, folds }) => {
  const { t } = useTranslation();
  const folded = !folds.folded(foldId);
  return (
    <div data-panel="update-assets" data-assets-of={tag} data-folded={folded}>
      <SectionCard
        title={t('hosts.nav.updateAssets')}
        badge={<span className="badge text-bg-secondary rounded-pill">{assets.length}</span>}
        className="mb-0"
        folded={folded}
        onFold={() => folds.toggle(foldId)}
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
  tag: PropTypes.string.isRequired,
  foldId: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

const SideCard = ({ data, release = null, folds, language }) => {
  const { t } = useTranslation();
  const published = String(data.release_date ?? '');
  const releaseUrl = httpsUrl(data.release_url);
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
        {releaseUrl || changelog ? (
          <div className="upd-foot-links">
            {releaseUrl ? (
              <FootLink
                href={releaseUrl}
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
        {release?.assets.length ? (
          <Assets
            assets={release.assets}
            tag={release.tag}
            foldId={`${ASSETS_OPEN}:${release.tag}`}
            folds={folds}
          />
        ) : null}
      </div>
    </div>
  );
};

SideCard.propTypes = {
  data: PropTypes.object.isRequired,
  release: releaseShape,
  folds: foldsShape.isRequired,
  language: PropTypes.string.isRequired,
};

const ReleaseCard = ({ release, language }) => {
  const { t } = useTranslation();
  const url = httpsUrl(release.url);
  const title = release.name || release.tag;
  return (
    <article
      className="card mb-3 upd-release"
      data-panel="update-release"
      data-release={release.tag}
      data-latest={!release.prerelease}
      data-prerelease={release.prerelease}
    >
      <div className="card-body">
        <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
          <h5 className="mb-0 upd-release-title">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
            ) : (
              title
            )}
          </h5>
          {release.name && release.name !== release.tag ? (
            <code className="upd-release-tag">{release.tag}</code>
          ) : null}
          {release.prerelease ? (
            <span className="badge text-bg-warning">{t('hosts.nav.updatePrerelease')}</span>
          ) : (
            <span className="badge text-bg-success">{t('hosts.nav.updateLatest')}</span>
          )}
        </div>
        {release.author || release.publishedAt ? (
          <div className="small text-body-secondary mb-2 upd-release-byline">
            {release.author ? (
              <>
                <span className="upd-release-author">{release.author}</span>
                <span className="ms-1">{t('hosts.nav.updateReleasedThis')}</span>
              </>
            ) : null}
            {release.publishedAt ? (
              <span
                className={release.author ? 'ms-1' : ''}
                title={absoluteTime(release.publishedAt, language)}
              >
                {formatRelativeTime(release.publishedAt, language)}
              </span>
            ) : null}
          </div>
        ) : null}
        {release.body ? <MarkdownText text={release.body} className="prose upd-notes" /> : null}
      </div>
    </article>
  );
};

ReleaseCard.propTypes = {
  release: releaseShape.isRequired,
  language: PropTypes.string.isRequired,
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
 * date as a relative time with the absolute time in its tooltip, the
 * release link and the changelog link as small text links, each drawn
 * only while the check carries its member, and under them the release's
 * Assets fold listing its assets, each a name link with its size and its
 * sha256 where one is carried, folded until opened, the fold kept per tag
 * under `prefsKey` like the page's other folds; beside it the one release
 * whose tag is the check's `latest_version`, the entry of `releases`
 * with that tag where the check lists them and the release the check's
 * own members name otherwise, a card with its name or its tag as the
 * title linking to its page where it names one, the tag beside a name,
 * the Pre-release badge on a pre-release and the Latest badge otherwise,
 * who released it and when as a relative time with the absolute time in
 * its tooltip, and its body rendered as markdown with every link opening
 * its own tab; no other release draws. A pre-release draws, and offers
 * Update, only while the running version is itself a pre-release, one
 * carrying a `-` suffix; on a production version the page says the
 * host is current and draws no release.
 *
 * It takes `update`, the adapter `{ check, apply }`, `check` answering
 * `{ current_version, latest_version, update_available, release_url,
 * release_date, changelog, release_notes, assets, releases }` and `apply`
 * answering `{ message, task_id, target_version }`; `title`, the heading;
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

  const release = releaseOf(check.data);

  return (
    <>
      <SectionHeading title={title} count={count} state={state} actions={actions} />
      <div data-panel="update">
        {check.data ? (
          <div className="row g-3">
            <div className="col-lg-4 col-xl-3">
              <SideCard
                data={check.data}
                release={release}
                folds={folds}
                language={i18n.language}
              />
            </div>
            <div className="col-lg-8 col-xl-9">
              {release ? <ReleaseCard release={release} language={i18n.language} /> : null}
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
