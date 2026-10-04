import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash } from 'react-icons/fa6';

import { formatLinks, linksArrayOf, protectionTone } from '../utils/networkingManagement';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const PROTECTION_KEYS = {
  stp: 'host.bridgeTable.protectionStp',
  rstp: 'host.bridgeTable.protectionRstp',
  none: 'host.bridgeTable.none',
};

const protectionWord = (row, ctx) => {
  const key = PROTECTION_KEYS[String(row.protection || '').toLowerCase()];
  return key ? ctx.t(key) : row.protection || ctx.t('host.bridgeTable.unknown');
};

const seconds = (value, ctx) =>
  value === undefined || value === null ? ctx.t('host.bridgeTable.notAvailable') : `${value}s`;

const linksCell = (row, ctx) => {
  const links = linksArrayOf(row.links);
  return (
    <span>
      <code title={links.join(', ')}>
        {links.length > 0 ? formatLinks(links) : ctx.t('host.bridgeTable.none')}
      </code>
      {links.length > 0 ? (
        <div className="small text-muted">
          {ctx.t('host.bridgeTable.linkCount', { count: links.length })}
        </div>
      ) : null}
    </span>
  );
};

/**
 * The columns of the bridges table, hyperweaver-ui's: the name, the
 * protection, the priority, the member links, the max age, the hello
 * time and the forward delay.
 */
export const BRIDGE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.bridgeTable.nameHeader',
    value: row => row.name || '',
    render: row => <strong className="font-monospace">{row.name}</strong>,
  },
  {
    key: 'protection',
    kind: 'badge',
    labelKey: 'host.bridgeTable.protectionHeader',
    value: protectionWord,
    render: (row, ctx) => badge(protectionTone(row.protection), protectionWord(row, ctx)),
  },
  {
    key: 'priority',
    kind: 'badge',
    labelKey: 'host.bridgeTable.priorityHeader',
    priority: 4,
    value: row => Number(row.priority) || 0,
    render: (row, ctx) =>
      badge(
        'secondary',
        row.priority === undefined ? ctx.t('host.bridgeTable.notAvailable') : row.priority
      ),
  },
  {
    key: 'links',
    kind: 'text',
    labelKey: 'host.bridgeTable.memberLinksHeader',
    priority: 2,
    value: row => linksArrayOf(row.links).join(', '),
    render: linksCell,
  },
  {
    key: 'max_age',
    kind: 'text',
    labelKey: 'host.bridgeTable.maxAgeHeader',
    priority: 5,
    value: row => Number(row.max_age) || 0,
    render: (row, ctx) => seconds(row.max_age, ctx),
  },
  {
    key: 'hello_time',
    kind: 'text',
    labelKey: 'host.bridgeTable.helloTimeHeader',
    priority: 5,
    value: row => Number(row.hello_time) || 0,
    render: (row, ctx) => seconds(row.hello_time, ctx),
  },
  {
    key: 'forward_delay',
    kind: 'text',
    labelKey: 'host.bridgeTable.forwardDelayHeader',
    priority: 5,
    value: row => Number(row.forward_delay) || 0,
    render: (row, ctx) => seconds(row.forward_delay, ctx),
  },
];

/**
 * The actions of one bridge, hyperweaver-ui's: the details and, for a
 * role that controls hosts, the delete.
 */
export const BridgeRowActions = ({ row, busy, canEdit, onDetails, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onDetails(row)}
        disabled={busy}
        title={t('host.bridgeTable.viewDetailsTitle')}
        data-tool="details"
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      {canEdit ? (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(row)}
          disabled={busy}
          title={t('host.bridgeTable.deleteButtonTitle')}
          data-tool="delete"
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
};

BridgeRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
