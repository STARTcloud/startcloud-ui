import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash } from 'react-icons/fa6';

import {
  formatLinks,
  lacpTone,
  linkStateTone,
  linksArrayOf,
  namedKey,
  policyTone,
} from '../utils/networkingManagement';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const NOT_AVAILABLE = 'N/A';

const membersOf = row => linksArrayOf(row.links || row.over);

const linksCell = (row, ctx) => {
  const links = membersOf(row);
  return (
    <span>
      <code title={links.join(', ')}>
        {links.length > 0 ? formatLinks(links) : ctx.t('host.aggregateTable.none')}
      </code>
      {links.length > 0 ? (
        <div className="small text-muted">
          {ctx.t('host.aggregateTable.linkCount', { count: links.length })}
        </div>
      ) : null}
    </span>
  );
};

/**
 * The columns of the aggregates table, hyperweaver-ui's: the aggregate,
 * the policy in its tone, the member links, the state, the LACP mode
 * and the LACP timer.
 */
export const AGGREGATE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.aggregateTable.aggregate',
    value: namedKey,
    render: row => <strong className="font-monospace">{namedKey(row)}</strong>,
  },
  {
    key: 'policy',
    kind: 'badge',
    labelKey: 'host.aggregateTable.policy',
    value: row => row.policy || '',
    render: row => badge(policyTone(row.policy), row.policy || 'Unknown'),
  },
  {
    key: 'links',
    kind: 'text',
    labelKey: 'host.aggregateTable.memberLinks',
    priority: 2,
    value: row => membersOf(row).join(', '),
    render: linksCell,
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.aggregateTable.state',
    value: row => row.state || 'Unknown',
    render: row => badge(linkStateTone(row.state), row.state || 'Unknown'),
  },
  {
    key: 'lacp_mode',
    kind: 'badge',
    labelKey: 'host.aggregateTable.lacpMode',
    priority: 3,
    value: row => row.lacp_mode || '',
    render: row => badge(lacpTone(row.lacp_mode), row.lacp_mode || NOT_AVAILABLE),
  },
  {
    key: 'lacp_timer',
    kind: 'text',
    labelKey: 'host.aggregateTable.timer',
    priority: 4,
    value: row => row.lacp_timer || '',
    render: row => row.lacp_timer || NOT_AVAILABLE,
  },
];

/**
 * The actions of one aggregate, hyperweaver-ui's: the details and the
 * delete.
 */
export const AggregateRowActions = ({ row, busy, onDetails, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onDetails(row)}
        disabled={busy}
        title={t('host.aggregateTable.viewDetails')}
        data-tool="details"
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => onDelete(row)}
        disabled={busy}
        title={t('host.aggregateTable.deleteAggregate')}
        data-tool="delete"
      >
        <FaTrash aria-hidden="true" />
      </button>
    </>
  );
};

AggregateRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
