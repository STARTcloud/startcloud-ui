import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircle,
  FaCircleCheck,
  FaCircleInfo,
  FaCircleQuestion,
  FaCircleXmark,
  FaClockRotateLeft,
  FaList,
  FaPlay,
  FaRotate,
  FaRotateRight,
  FaStop,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import { isLegacyService, serviceActions, serviceName, serviceTone } from '../utils/manage';

const STATE_KEYS = {
  online: 'host.serviceManagement.online',
  disabled: 'host.serviceManagement.disabled',
  offline: 'host.serviceManagement.offline',
  legacy_run: 'host.serviceManagement.legacyRun',
  maintenance: 'host.serviceManagement.maintenance',
};

const STATE_GLYPHS = {
  online: { Icon: FaCircleCheck, tone: 'text-success' },
  disabled: { Icon: FaCircle, tone: 'text-muted' },
  offline: { Icon: FaCircleXmark, tone: 'text-danger' },
  legacy_run: { Icon: FaClockRotateLeft, tone: 'text-info' },
  maintenance: { Icon: FaTriangleExclamation, tone: 'text-warning' },
};

const ACTIONS = {
  enable: { Icon: FaPlay, tone: 'success', labelKey: 'host.serviceTable.actions.enable' },
  disable: { Icon: FaStop, tone: 'warning', labelKey: 'host.serviceTable.actions.disable' },
  restart: { Icon: FaRotateRight, tone: 'info', labelKey: 'host.serviceTable.actions.restart' },
  refresh: { Icon: FaRotate, tone: 'secondary', labelKey: 'host.serviceTable.actions.refresh' },
};

const stateWord = row => String(row.state || '').toLowerCase();

const StateGlyph = ({ state }) => {
  const { Icon, tone } = STATE_GLYPHS[state] || { Icon: FaCircleQuestion, tone: 'text-muted' };
  return <Icon className={`${tone} me-2`} aria-hidden="true" />;
};

StateGlyph.propTypes = {
  state: PropTypes.string.isRequired,
};

/**
 * The columns of the services table, hyperweaver-ui's: the service, its
 * name from its FMRI with the glyph of its state, the FMRI, the state as
 * a badge in its tone and the start time, hyperweaver-ui's word where a
 * row carries none.
 */
export const SERVICE_COLUMNS = [
  {
    key: 'service',
    kind: 'name',
    labelKey: 'host.serviceTable.columns.service',
    value: row => serviceName(row.fmri),
    render: row => (
      <span>
        <StateGlyph state={stateWord(row)} />
        <strong>{serviceName(row.fmri)}</strong>
      </span>
    ),
  },
  {
    key: 'fmri',
    kind: 'text',
    labelKey: 'host.serviceTable.columns.fmri',
    priority: 4,
    value: row => row.fmri || '',
    render: row => (
      <code className="small" title={row.fmri}>
        {row.fmri}
      </code>
    ),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.serviceTable.columns.state',
    value: row => row.state || '',
    render: row => <span className={`badge text-bg-${serviceTone(row.state)}`}>{row.state}</span>,
  },
  {
    key: 'stime',
    kind: 'text',
    labelKey: 'host.serviceTable.columns.startTime',
    priority: 5,
    value: row => row.stime || '',
    render: (row, ctx) => row.stime || ctx.t('host.serviceTable.notAvailable'),
  },
];

/**
 * The filter group of the services table, hyperweaver-ui's state
 * select, the one filter it applied on the client.
 */
export const SERVICE_FILTERS = [
  {
    key: 'state',
    labelKey: 'host.serviceManagement.filterState',
    values: row => [stateWord(row)],
    order: Object.keys(STATE_KEYS),
    activeClass: 'bg-primary',
    labelFor: (value, t) => (STATE_KEYS[value] ? t(STATE_KEYS[value]) : value),
  },
];

/**
 * The actions of one row of the services table, hyperweaver-ui's row
 * buttons: Enable while the service is disabled, Disable and Restart
 * while it is online, Refresh for every state but a legacy run, then
 * View details and, for every service but a legacy run, View
 * properties; every button held while a request is in flight.
 */
export const ServiceRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-service={row.fmri}>
      {serviceActions(row.state).map(action => {
        const { Icon, tone, labelKey } = ACTIONS[action];
        return (
          <button
            key={action}
            type="button"
            className={`btn btn-sm btn-outline-${tone}`}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            data-action={action}
            disabled={busy}
            onClick={() => onAction(action, row)}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={t('host.serviceTable.viewDetails')}
        aria-label={t('host.serviceTable.viewDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      {isLegacyService(row.fmri) ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={t('host.serviceTable.viewProperties')}
          aria-label={t('host.serviceTable.viewProperties')}
          data-action="properties"
          disabled={busy}
          onClick={() => onAction('properties', row)}
        >
          <FaList aria-hidden="true" />
        </button>
      )}
    </span>
  );
};

ServiceRowActions.propTypes = {
  row: PropTypes.shape({
    fmri: PropTypes.string.isRequired,
    state: PropTypes.string,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
