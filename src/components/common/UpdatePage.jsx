import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleUp, FaRotate } from 'react-icons/fa6';

import { useGuard } from '../../contexts/GuardContext';
import { useNotify } from '../../contexts/NoticeContext';
import { useStatus } from '../../contexts/StatusContext';
import { useEventStream } from '../../hooks/useEventStream';
import { log } from '../../lib/logger';

import ConfirmModal from './ConfirmModal';
import RecordRows from './RecordRows';
import SectionHeading from './SectionHeading';

const EMPTY = { data: null, loaded: false, failed: false };

const ADMIN_CONFIRM = {
  titleKey: 'admin.update.confirmTitle',
  messageKey: 'admin.update.confirmMessage',
};

/**
 * The update a check offers: the current and the latest version while the
 * answer says `update_available`, null otherwise, so a backend that is
 * current or answers no check draws no Update button.
 *
 * @param {Object|null} answer - The answer of `GET app/updates/check`
 * @returns {{ current: string, latest: string }|null} The update
 */
export const updateOf = answer =>
  answer?.update_available
    ? { current: String(answer.current_version ?? ''), latest: String(answer.latest_version ?? '') }
    : null;

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
 * The shared Update page of one backend: whether a newer release is
 * published, with Update behind the typed confirmation while one is.
 *
 * It takes `update`, the adapter `{ check, apply }`, `check` answering
 * `{ current_version, latest_version, update_available }` and `apply`
 * answering `{ message, task_id, target_version }`; `title`, the
 * heading; `confirm`, `{ titleKey, messageKey }`, the keys of the
 * confirmation, given `app`, `currentVersion` and `latestVersion`, the
 * `admin.update.*` keys by default; and `onRefresh`, called beside the
 * page's own check on Refresh. The check is read once as the page draws,
 * again when the event stream opens fresh or answers `reset`, and on
 * Refresh; Update is one request and one notice.
 *
 * Caveat: `apply` runs through the shell's `useGuard` only where a
 * `GuardProvider` encloses the page, and directly otherwise.
 *
 * @param {Object} props
 * @param {{ check: Function, apply: Function }} props.update - The update adapter
 * @param {import('react').ReactNode} props.title - The heading
 * @param {{ titleKey: string, messageKey: string }} [props.confirm] - The confirmation's keys
 * @param {Function|null} [props.onRefresh] - Called on Refresh
 * @returns {import('react').ReactElement} The page
 */
const UpdatePage = ({ update, title, confirm = ADMIN_CONFIRM, onRefresh = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const guard = useGuard();
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

  const rows = [
    {
      key: 'current',
      label: t('hosts.nav.updateCurrentVersion'),
      value: <code>{String(check.data?.current_version ?? '')}</code>,
    },
    {
      key: 'latest',
      label: t('hosts.nav.updateLatestVersion'),
      value: <code>{String(check.data?.latest_version ?? '')}</code>,
    },
  ];

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

  return (
    <>
      <SectionHeading title={title} count={count} state={state} actions={actions} />
      <div data-panel="update">{check.data ? <RecordRows rows={rows} /> : null}</div>
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
  confirm: PropTypes.shape({
    titleKey: PropTypes.string.isRequired,
    messageKey: PropTypes.string.isRequired,
  }),
  onRefresh: PropTypes.func,
};

export default UpdatePage;
