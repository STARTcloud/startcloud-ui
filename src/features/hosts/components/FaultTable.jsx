import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCheck,
  FaCircleExclamation,
  FaCircleInfo,
  FaCircleQuestion,
  FaRightLeft,
  FaTriangleExclamation,
  FaWrench,
} from 'react-icons/fa6';

import { FAULT_ACTIONS, faultClass, severityTone } from '../utils/FaultUtils';

const SEVERITY_GLYPHS = {
  critical: { Icon: FaCircleExclamation, tone: 'text-danger' },
  major: { Icon: FaTriangleExclamation, tone: 'text-warning' },
  minor: { Icon: FaCircleInfo, tone: 'text-info' },
};

const ACTION_GLYPHS = { acquit: FaCheck, repaired: FaWrench, replaced: FaRightLeft };

const UUID_LENGTH = 8;

const SeverityGlyph = ({ severity }) => {
  const { Icon, tone } = SEVERITY_GLYPHS[String(severity || '').toLowerCase()] || {
    Icon: FaCircleQuestion,
    tone: 'text-muted',
  };
  return <Icon className={`${tone} me-2`} aria-hidden="true" />;
};

SeverityGlyph.propTypes = {
  severity: PropTypes.string,
};

const classWord = (row, ctx) => {
  const { key, text } = faultClass(row.msgId);
  return key ? ctx.t(key) : text;
};

/**
 * The columns of the faults table, hyperweaver-ui's: the time, the
 * severity with its glyph and badge, the class read from the message
 * id, the message id and the uuid cut to eight characters.
 */
export const FAULT_COLUMNS = [
  {
    key: 'time',
    kind: 'date',
    labelKey: 'host.faultTable.time',
    priority: 3,
    value: row => new Date(row.time || 0).getTime() || 0,
    render: (row, ctx) => <span className="small">{row.time || ctx.t('host.faultTable.na')}</span>,
  },
  {
    key: 'severity',
    kind: 'badge',
    labelKey: 'host.faultTable.severity',
    value: row => row.severity || '',
    render: row => (
      <span>
        <SeverityGlyph severity={row.severity} />
        <span className={`badge text-bg-${severityTone(row.severity)}`}>{row.severity}</span>
      </span>
    ),
  },
  {
    key: 'class',
    kind: 'badge',
    labelKey: 'host.faultTable.class',
    priority: 4,
    value: classWord,
    render: (row, ctx) => <span className="badge text-bg-secondary">{classWord(row, ctx)}</span>,
  },
  {
    key: 'msgId',
    kind: 'name',
    labelKey: 'host.faultTable.messageId',
    value: row => row.msgId || '',
    render: row => <span className="font-monospace small fw-semibold">{row.msgId}</span>,
  },
  {
    key: 'uuid',
    kind: 'text',
    labelKey: 'host.faultTable.uuid',
    priority: 5,
    value: row => row.uuid || '',
    render: (row, ctx) => (
      <span className="font-monospace small" title={row.uuid}>
        {row.uuid ? `${row.uuid.substring(0, UUID_LENGTH)}...` : ctx.t('host.faultTable.na')}
      </span>
    ),
  },
];

/**
 * The actions of one row of the faults table, hyperweaver-ui's row
 * buttons: Acquit, Mark repaired and Mark replaced, each opening the
 * confirmation, and View details, every button held while a request is
 * in flight.
 */
export const FaultRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-fault={row.uuid}>
      {FAULT_ACTIONS.map(action => {
        const Icon = ACTION_GLYPHS[action.key];
        return (
          <button
            key={action.key}
            type="button"
            className={`btn btn-sm btn-outline-${action.tone}`}
            title={t(action.labelKey)}
            aria-label={t(action.labelKey)}
            data-action={action.key}
            disabled={busy}
            onClick={() => onAction(action.key, row)}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.faultTable.viewDetails')}
        aria-label={t('host.faultTable.viewDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
    </span>
  );
};

FaultRowActions.propTypes = {
  row: PropTypes.shape({ uuid: PropTypes.string, msgId: PropTypes.string }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
