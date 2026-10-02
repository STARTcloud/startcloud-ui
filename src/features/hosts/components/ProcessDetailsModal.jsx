import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import TabStrip from '../../../components/common/TabStrip';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchProcessExtra } from '../api/manage';
import { formatByteSize } from '../utils/tasks';

import { DialogTable } from './ManageTable';

const TABS = ['basic', 'files', 'limits', 'stack'];

const TAB_KEYS = {
  basic: 'host.processDetailsModal.tabBasicInfo',
  files: 'host.processDetailsModal.tabOpenFiles',
  limits: 'host.processDetailsModal.tabResourceLimits',
  stack: 'host.processDetailsModal.tabStackTrace',
};

const EXTRA = { files: 'files', limits: 'limits', stack: 'stack' };

const FILE_COLUMNS = [
  {
    key: 'fd',
    kind: 'name',
    labelKey: 'host.processDetailsModal.thFd',
    value: row => Number(row.fd) || 0,
    render: row => <code>{row.fd}</code>,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'host.processDetailsModal.thDescription',
    prose: true,
    value: row => row.description || '',
    render: row => <code className="small">{row.description}</code>,
  },
  {
    key: 'details',
    kind: 'text',
    labelKey: 'host.processDetailsModal.thDetails',
    prose: true,
    value: row => row.details || '',
    render: row => <code className="small">{row.details}</code>,
  },
];

const LIMIT_COLUMNS = [
  {
    key: 'resource',
    kind: 'name',
    labelKey: 'host.processDetailsModal.thResource',
    value: row => row.resource,
    render: row => <strong>{row.resource}</strong>,
  },
  {
    key: 'limit',
    kind: 'text',
    labelKey: 'host.processDetailsModal.thLimit',
    value: row => row.limit,
    render: row => <code>{row.limit}</code>,
  },
];

const memoryText = (bytes, ctx) => {
  if (!bytes) {
    return ctx.t('host.processTable.notAvailable');
  }
  return `${formatByteSize(Number(bytes))} (${bytes} bytes)`;
};

const orWord = (value, ctx) => value || ctx.t('host.processTable.notAvailable');

const basicRows = (details, ctx) => [
  { key: 'pid', label: ctx.t('host.processDetailsModal.labelProcessId'), value: details.pid },
  {
    key: 'ppid',
    label: ctx.t('host.processDetailsModal.labelParentPid'),
    value: orWord(details.ppid, ctx),
  },
  {
    key: 'zone',
    label: ctx.t('host.processDetailsModal.labelZone'),
    value: orWord(details.zone, ctx),
  },
  {
    key: 'uid',
    label: ctx.t('host.processDetailsModal.labelUserId'),
    value: orWord(details.uid, ctx),
  },
  {
    key: 'vsz',
    label: ctx.t('host.processDetailsModal.labelVirtualSize'),
    value: memoryText(details.vsz, ctx),
  },
  {
    key: 'rss',
    label: ctx.t('host.processDetailsModal.labelResidentSize'),
    value: memoryText(details.rss, ctx),
  },
  {
    key: 'command',
    label: ctx.t('host.processDetailsModal.labelCommand'),
    value: <code className="small">{orWord(details.command, ctx)}</code>,
  },
];

const limitRows = limits =>
  Object.entries(limits || {}).map(([resource, limit]) => ({ resource, limit: String(limit) }));

const stackText = stack => (typeof stack === 'string' ? stack : JSON.stringify(stack, null, 2));

const useProcessExtra = ({ id, pid, tab }) => {
  const status = useStatus();
  const [held, setHeld] = useState({});
  const [failed, setFailed] = useState('');
  const kind = EXTRA[tab];

  useEffect(() => {
    if (!kind || kind in held) {
      return;
    }
    fetchProcessExtra(status, id, pid, kind)
      .then(data => setHeld(current => ({ ...current, [kind]: data })))
      .catch(error => setFailed(error.message || ''));
  }, [status, id, pid, kind, held]);

  return { held, failed, loading: Boolean(kind) && !(kind in held) && !failed };
};

const BasicTab = ({ process, ctx }) => {
  const { t } = useTranslation();
  const details = process.details || {};
  const sample = Array.isArray(details.open_files_sample) ? details.open_files_sample : [];
  return (
    <>
      <h6 className="fw-bold mt-3">{t('host.processDetailsModal.processInformation')}</h6>
      <RecordRows rows={basicRows(details, ctx)} />
      {sample.length > 0 ? (
        <>
          <h6 className="fw-bold">{t('host.processDetailsModal.openFilesSample')}</h6>
          <pre className="small p-3 bg-body-tertiary mb-0">{sample.join('\n')}</pre>
        </>
      ) : null}
    </>
  );
};

BasicTab.propTypes = {
  process: PropTypes.shape({ details: PropTypes.object }).isRequired,
  ctx: PropTypes.object.isRequired,
};

const ExtraTab = ({ tab, extra, ctx }) => {
  const { t } = useTranslation();
  const data = extra.held[tab];
  if (extra.loading) {
    return <p className="mt-3">{t('pages.loading')}</p>;
  }
  if (extra.failed) {
    return (
      <div className="alert alert-danger mt-3 mb-0" role="alert">
        {t('host.processDetailsModal.errors.loadTypeError', { type: tab, message: extra.failed })}
      </div>
    );
  }
  if (tab === 'files') {
    return (
      <div className="mt-3">
        <DialogTable
          name="process-files"
          columns={FILE_COLUMNS}
          rows={Array.isArray(data) ? data : []}
          rowKey={row => String(row.fd)}
          ctx={ctx}
          emptyText={t('host.processDetailsModal.noOpenFiles')}
        />
      </div>
    );
  }
  if (tab === 'limits') {
    return (
      <div className="mt-3">
        <DialogTable
          name="process-limits"
          columns={LIMIT_COLUMNS}
          rows={limitRows(data)}
          rowKey={row => row.resource}
          ctx={ctx}
          emptyText={t('host.processDetailsModal.noResourceLimits')}
        />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="alert alert-info mt-3 mb-0" role="status">
        {t('host.processDetailsModal.noStackTrace')}
      </div>
    );
  }
  return (
    <pre className="small p-3 bg-body-tertiary process-stack mt-3 mb-0">{stackText(data)}</pre>
  );
};

ExtraTab.propTypes = {
  tab: PropTypes.oneOf(TABS).isRequired,
  extra: PropTypes.shape({
    held: PropTypes.object.isRequired,
    failed: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
  }).isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The details of one process, hyperweaver-ui's dialog as a list dialog
 * of the pages contract with its four tabs on the one tab strip: the
 * basic information `GET system/processes/{pid}` answered with the
 * sample of open files, and the open files, the resource limits and
 * the stack trace, each read once when its tab is first opened, over
 * the one table where it is a list.
 */
const ProcessDetailsModal = ({ id, process, ctx, onClose }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('basic');
  const extra = useProcessExtra({ id, pid: process.pid, tab });
  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="process-details"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {t('host.processDetailsModal.title', { pid: process.pid })}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TabStrip
          tabs={TABS.map(key => ({ key, label: t(TAB_KEYS[key]) }))}
          active={tab}
          onSelect={setTab}
        />
        {tab === 'basic' ? (
          <BasicTab process={process} ctx={ctx} />
        ) : (
          <ExtraTab tab={tab} extra={extra} ctx={ctx} />
        )}
      </Modal.Body>
    </Modal>
  );
};

ProcessDetailsModal.propTypes = {
  id: PropTypes.string.isRequired,
  process: PropTypes.shape({
    pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    details: PropTypes.object,
  }).isRequired,
  ctx: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ProcessDetailsModal;
