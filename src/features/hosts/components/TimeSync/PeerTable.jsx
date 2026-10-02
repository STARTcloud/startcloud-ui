import { useTranslation } from 'react-i18next';

import { PEER_THRESHOLDS, formatMs, healthTone, peerIndicator } from '../../utils/manage';

const notAvailable = ctx => ctx.t('hostTime.timeSyncPeerTable.notAvailable');

const peerName = (row, ctx) =>
  row.remote || row.name || ctx.t('hostTime.timeSyncPeerTable.unknownServer');

const reachOf = row => 100 - (Number(row.reachability_percent) || 0);

const toned = (tone, text) => <span className={tone || undefined}>{text}</span>;

/**
 * The columns of the time peers table, hyperweaver-ui's: the status
 * with the peer's indicator glyph, the server, the stratum, the delay,
 * the offset and the jitter in the tone of their health, and the
 * reachability.
 */
export const PEER_COLUMNS = [
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'hostTime.timeSyncPeerTable.columnStatus',
    value: row => row.status || '',
    render: (row, ctx) => {
      const look = peerIndicator(row.indicator);
      return (
        <span>
          <span className={look.tone} title={ctx.t(`hostTime.timeSyncPeerTable.${look.key}`)}>
            {look.glyph}
          </span>
          <span className="small ms-1">
            {row.status || ctx.t('hostTime.timeSyncPeerTable.statusUnknownLabel')}
          </span>
        </span>
      );
    },
  },
  {
    key: 'server',
    kind: 'name',
    labelKey: 'hostTime.timeSyncPeerTable.columnServer',
    value: peerName,
    render: (row, ctx) => <code>{peerName(row, ctx)}</code>,
  },
  {
    key: 'stratum',
    kind: 'count',
    labelKey: 'hostTime.timeSyncPeerTable.columnStratum',
    priority: 4,
    value: row => Number(row.stratum) || 0,
    render: (row, ctx) => row.stratum || notAvailable(ctx),
  },
  {
    key: 'delay',
    kind: 'count',
    labelKey: 'hostTime.timeSyncPeerTable.columnDelay',
    priority: 3,
    value: row => (typeof row.delay === 'number' ? row.delay : 0),
    render: (row, ctx) =>
      toned(healthTone(row.delay, PEER_THRESHOLDS.delay), formatMs(row.delay) || notAvailable(ctx)),
  },
  {
    key: 'offset',
    kind: 'count',
    labelKey: 'hostTime.timeSyncPeerTable.columnOffset',
    priority: 3,
    value: row => (typeof row.offset === 'number' ? row.offset : 0),
    render: (row, ctx) =>
      toned(
        healthTone(
          typeof row.offset === 'number' ? Math.abs(row.offset) : row.offset,
          PEER_THRESHOLDS.offset
        ),
        formatMs(row.offset, true) || notAvailable(ctx)
      ),
  },
  {
    key: 'jitter',
    kind: 'count',
    labelKey: 'hostTime.timeSyncPeerTable.columnJitter',
    priority: 4,
    value: row => (typeof row.jitter === 'number' ? row.jitter : 0),
    render: (row, ctx) =>
      toned(
        healthTone(row.jitter, PEER_THRESHOLDS.jitter),
        formatMs(row.jitter) || notAvailable(ctx)
      ),
  },
  {
    key: 'reach',
    kind: 'count',
    labelKey: 'hostTime.timeSyncPeerTable.columnReach',
    priority: 4,
    value: row => Number(row.reachability_percent) || 0,
    render: (row, ctx) =>
      toned(
        healthTone(reachOf(row), PEER_THRESHOLDS.reach),
        row.reachability_percent === undefined ? notAvailable(ctx) : `${row.reachability_percent}%`
      ),
  },
];

/**
 * The legend under the peers table, hyperweaver-ui's: what the status
 * indicators mean and the three health colours.
 */
export const PeerLegend = () => {
  const { t } = useTranslation();
  return (
    <div className="small mt-3">
      <p className="mb-1">
        <strong>{t('hostTime.timeSyncPeerTable.statusIndicatorsLabel')}</strong>
      </p>
      <p className="mb-1">{t('hostTime.timeSyncPeerTable.statusIndicatorsDesc')}</p>
      <p className="mb-0">
        <strong>{t('hostTime.timeSyncPeerTable.healthColorsLabel')}</strong>{' '}
        <span className="text-success">{t('hostTime.timeSyncPeerTable.colorGood')}</span> •{' '}
        <span className="text-warning">{t('hostTime.timeSyncPeerTable.colorWarning')}</span> •{' '}
        <span className="text-danger">{t('hostTime.timeSyncPeerTable.colorProblem')}</span>
      </p>
    </div>
  );
};
