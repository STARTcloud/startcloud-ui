import { useState } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';

import { useNotify } from '../../../../contexts/NoticeContext';
import { useInboxRows } from '../../../../contexts/UnreadContext';
import { useEventStream } from '../../../../hooks/useEventStream';
import { api } from '../api/provisioners';

const REBUILD_KEY = 'rebuild';
const REBUILD_TAG = 'catalog-rebuild';
const SUCCESS = 'success';

const titleOf = row => String(row?.title || '').trim();

const resultOf = row => {
  const title = titleOf(row);
  return title.slice(title.lastIndexOf(':') + 1).trim();
};

const isRebuildRow = row => row?.tag === REBUILD_TAG;

/**
 * The Rebuild catalog data row: `POST /api/admin/rebuild`, then the row
 * runs until the data job's inbox row for the person arrives, the
 * `notification-created` row tagged `catalog-rebuild` on the stream, or a
 * read of the inbox by the modal or the inbox page answers that row
 * written since the press; a title ending in `success` raises the done
 * notice and any other the failed notice with the title's result word.
 * Nothing polls.
 */
const RebuildItem = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [startedAt, setStartedAt] = useState(0);
  const running = startedAt > 0;

  const finish = row => {
    setStartedAt(0);
    if (titleOf(row).endsWith(SUCCESS)) {
      notify('success', t('provisioners.rebuild.done'), { key: REBUILD_KEY, sticky: true });
      return;
    }
    const message = resultOf(row) || t('provisioners.rebuild.unknown');
    notify('danger', t('provisioners.rebuild.failed', { message }), {
      key: REBUILD_KEY,
      sticky: true,
    });
  };

  useEventStream('notification-created', row => {
    if (running && isRebuildRow(row)) {
      finish(row);
    }
  });

  useInboxRows(rows => {
    if (!running) {
      return;
    }
    const row = rows.find(
      entry => isRebuildRow(entry) && Date.parse(entry.created_at || '') >= startedAt
    );
    if (row) {
      finish(row);
    }
  });

  const rebuild = async () => {
    const pressedAt = Date.now();
    try {
      await api.rebuild.start();
      notify('info', t('provisioners.rebuild.running'), { key: REBUILD_KEY, sticky: true });
      setStartedAt(pressedAt);
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
