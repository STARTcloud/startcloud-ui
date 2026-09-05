import { useEffect, useRef, useState } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';

import { useNotify } from '../../../../contexts/NoticeContext';
import { api } from '../api';

const POLL_INTERVAL_MS = 10000;
const POLL_LIMIT = 90;
const REBUILD_KEY = 'rebuild';

const RebuildItem = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [running, setRunning] = useState(false);
  const pollRef = useRef(null);
  const sawRunRef = useRef(false);
  const pollCountRef = useRef(0);

  useEffect(
    () => () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    },
    []
  );

  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    setRunning(false);
  };

  const settle = data => {
    if (data.status === 'queued' || data.status === 'in_progress') {
      sawRunRef.current = true;
      return;
    }
    if (data.status === 'completed' && sawRunRef.current) {
      stopPolling();
      if (data.conclusion === 'success') {
        notify('success', t('provisioners.rebuild.done'), { key: REBUILD_KEY, sticky: true });
      } else {
        const message = data.conclusion || t('provisioners.rebuild.unknown');
        notify('danger', t('provisioners.rebuild.failed', { message }), {
          key: REBUILD_KEY,
          sticky: true,
        });
      }
    }
  };

  const pollOnce = async () => {
    pollCountRef.current += 1;
    if (pollCountRef.current > POLL_LIMIT) {
      stopPolling();
      return;
    }
    try {
      settle(await api.rebuild.status());
    } catch {
      stopPolling();
    }
  };

  const rebuild = async () => {
    try {
      await api.rebuild.start();
      notify('info', t('provisioners.rebuild.running'), { key: REBUILD_KEY, sticky: true });
      setRunning(true);
      sawRunRef.current = false;
      pollCountRef.current = 0;
      pollRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    } catch (rebuildError) {
      notify('danger', t('provisioners.rebuild.failed', { message: rebuildError.message }), {
        key: REBUILD_KEY,
        sticky: true,
      });
    }
  };

  return (
    <Dropdown.Item as="button" type="button" onClick={rebuild} disabled={running}>
      {running ? (
        <Spinner animation="border" size="sm" role="status" className="me-2" />
      ) : (
        <FaArrowsRotate className="me-2" />
      )}
      {t('navbar.rebuild')}
    </Dropdown.Item>
  );
};

export default RebuildItem;
