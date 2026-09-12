import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTriangleExclamation } from 'react-icons/fa6';

import { useNotify } from '../../contexts/NoticeContext';
import { useEventStream } from '../../hooks/useEventStream';
import { log } from '../../lib/logger';

import ConfirmModal from './ConfirmModal';

const STEP_UP_REQUIRED = 'step_up_required';

const unguarded = call => call();

const timeOf = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString();
};

/**
 * The one restart card of the config contract: reads `restart-status`
 * through `restartStatus` on mount, on every change of `refresh` (the page
 * bumps it after every `PUT`) and on the `admin` topic's `restart-required`
 * event, which triggers the re-read and never carries the list; draws each
 * pending entry's `title` and `reason` with the last actor and time while
 * `restart_required` is true; the Restart button sits behind a confirm
 * dialog and the call runs through `guard`, so a `403 step_up_required`
 * opens the step-up dialog and retries; the card stays until `restart`
 * answers 202, when `configManager.restarting` is drawn as the UI's own
 * success card.
 */
const RestartCard = ({ restartStatus, restart, refresh = 0, guard = unguarded }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [status, setStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [tick, setTick] = useState(0);
  const readRef = useRef(restartStatus);

  useEffect(() => {
    readRef.current = restartStatus;
  });

  useEffect(() => {
    let mounted = true;
    readRef
      .current()
      .then(data => {
        if (mounted) {
          setStatus(data);
        }
      })
      .catch(error => {
        if (mounted) {
          log.api.error('Error reading restart status', { error: error.message });
        }
      });
    return () => {
      mounted = false;
    };
  }, [refresh, tick]);

  const reread = useCallback(() => setTick(current => current + 1), []);

  useEventStream('restart-required', reread);

  if (!status?.restart_required) {
    return null;
  }

  const entries = Array.isArray(status.requires_restart) ? status.requires_restart : [];

  const doRestart = () => {
    guard(restart)
      .then(() => {
        setStatus(null);
        notify('success', t('configManager.restarting'));
      })
      .catch(error => {
        if (error?.code !== STEP_UP_REQUIRED) {
          notify('danger', t(error?.messageKey || 'errors.request'));
        }
      });
  };

  return (
    <div className="alert alert-warning" role="status">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <FaTriangleExclamation aria-hidden="true" />
        <strong className="flex-grow-1">{t('configManager.restart.heading')}</strong>
        <button
          type="button"
          className="btn btn-sm btn-warning"
          onClick={() => setConfirming(true)}
        >
          {t('configManager.restart.button')}
        </button>
      </div>
      {status.last_modified_by ? (
        <div className="small mt-1">
          {t('configManager.restart.by', {
            by: status.last_modified_by,
            time: timeOf(status.last_modified_time),
          })}
        </div>
      ) : null}
      <ul className="mb-0 mt-2">
        {entries.map(entry => (
          <li key={entry.pointer}>
            {t('configManager.restart.entry', { title: entry.title, reason: entry.reason })}
          </li>
        ))}
      </ul>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={doRestart}
        variant="restart"
      />
    </div>
  );
};

RestartCard.propTypes = {
  restartStatus: PropTypes.func.isRequired,
  restart: PropTypes.func.isRequired,
  refresh: PropTypes.number,
  guard: PropTypes.func,
};

export default RestartCard;
