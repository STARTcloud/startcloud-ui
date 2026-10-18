import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { localeDate, timeOf } from '../../../components/common/columns';
import ConfirmModal from '../../../components/common/ConfirmModal';
import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { useRecordActions } from '../hooks/useRecordActions';
import { loadCerts } from '../lib/certsClient';
import { bytesOf } from '../utils/download';
import { focusOn } from '../utils/focus';
import { nowOf, statusOf, stemOf } from '../utils/records';

import StatusBadge from './StatusBadge';

const DEFAULT_SORT = [{ column: 'version', direction: 'desc' }];

const HEADING_ID = 'certs-history-heading';

const columns = [
  {
    key: 'version',
    kind: 'count',
    labelKey: 'certs.history.version',
    priority: 1,
    value: entry => entry.version,
    render: entry => (entry.current ? <strong>{entry.version}</strong> : entry.version),
  },
  {
    key: 'issued',
    kind: 'date',
    labelKey: 'certs.history.issued',
    value: entry => timeOf(entry.not_before),
    render: (entry, ctx) => localeDate(entry.not_before, ctx.language),
  },
  {
    key: 'expires',
    kind: 'date',
    labelKey: 'certs.history.expires',
    value: entry => timeOf(entry.not_after),
    render: (entry, ctx) => localeDate(entry.not_after, ctx.language),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'pages.table.status',
    value: (entry, ctx) =>
      ctx.t(`certs.status.${statusOf(entry.not_after, ctx.now, ctx.thresholdDays)}`),
    render: (entry, ctx) => (
      <StatusBadge status={statusOf(entry.not_after, ctx.now, ctx.thresholdDays)} />
    ),
  },
];

const HistoryActions = ({ entry, onActivate, onDownload, onDelete }) => {
  const { t } = useTranslation();
  return (
    <RowMenu label={t('pages.table.actions')}>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={entry.current}
        onClick={() => onActivate(entry)}
      >
        {t('certs.history.activate')}
      </Dropdown.Item>
      <Dropdown.Item as="button" type="button" onClick={() => onDownload(entry)}>
        {t('certs.actions.download')}
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        as="button"
        type="button"
        className={entry.current ? undefined : 'text-danger'}
        disabled={entry.current}
        onClick={() => onDelete(entry)}
      >
        {t('certs.actions.delete')}
      </Dropdown.Item>
    </RowMenu>
  );
};

HistoryActions.propTypes = {
  entry: PropTypes.object.isRequired,
  onActivate: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The versions a certificate's record holds, newest first: the version
 * number, the issue and expiry dates and the status, the current version
 * in bold, the sort, the hidden columns and the widths kept under the
 * page's prefs key; a row's menu activates it, the record's facts and
 * DER read again from that version, downloads it as PEM, or deletes it
 * behind the typed confirmation while it is not current.
 */
const RecordHistory = ({ record, thresholdDays, prefsKey, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const actions = useRecordActions();
  const prefs = useTablePrefs(prefsKey, columns, DEFAULT_SORT);
  const [target, setTarget] = useState(null);
  const history = record.history || [];
  const ctx = { t, language: i18n.language, now: nowOf(), thresholdDays };

  const activate = async entry => {
    try {
      const engine = await loadCerts();
      const detected = engine.detect(bytesOf(entry.der_b64), 'version.der', '');
      const [component] = detected.components;
      onUpdate({
        facts: component?.facts || record.facts,
        public_der_b64: entry.der_b64,
        history: history.map(held => ({ ...held, current: held.version === entry.version })),
      });
    } catch (error) {
      notify('danger', t('certs.notice.engineFailed', { message: error.message }));
    }
  };

  const download = entry =>
    actions.convertTo(record, {
      to: 'pem',
      der: entry.der_b64,
      stem: `${stemOf(record)}-v${entry.version}`,
    });

  const remove = entry => {
    onUpdate({ history: history.filter(held => held.version !== entry.version) });
    setTarget(null);
  };

  return (
    <div className="mb-4" data-panel="record-history">
      <SectionHeading id={HEADING_ID} title={t('certs.record.history')} count={history.length} />
      <SubTable
        columns={columns}
        rows={history}
        rowKey={entry => String(entry.version)}
        rowProp="entry"
        RowActions={HistoryActions}
        actionsProps={{ onActivate: activate, onDownload: download, onDelete: setTarget }}
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={ctx}
        emptyText={t('pages.empty')}
      />
      <ConfirmModal
        show={Boolean(target)}
        handleClose={() => setTarget(null)}
        handleConfirm={() => remove(target)}
        onConfirmed={() => focusOn(HEADING_ID)}
        title={t('certs.confirm.deleteVersionTitle')}
        message={t('certs.confirm.deleteVersionMessage', { version: target?.version ?? '' })}
      />
    </div>
  );
};

RecordHistory.propTypes = {
  record: PropTypes.object.isRequired,
  thresholdDays: PropTypes.number.isRequired,
  prefsKey: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default RecordHistory;
