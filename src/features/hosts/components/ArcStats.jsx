import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import {
  arcRatios,
  compressionRatioTone,
  dataEfficiencyTone,
  formatBytes,
  hitRatioTone,
  l2HitRatioTone,
  prefetchEfficiencyTone,
} from '../utils/StorageUtils';

const FOLD = 'arcStats';

const NOT_AVAILABLE = 'N/A';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const bytesOf = (arc, member) => formatBytes(Number(arc[member]) || 0);

const countOf = (arc, member, language) => (Number(arc[member]) || 0).toLocaleString(language);

const percentOf = value => (value ? `${value}%` : NOT_AVAILABLE);

const Group = ({ tone, titleKey, rows }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-lg-4">
      <h6 className={`fs-6 fw-bold mb-2 text-${tone}`}>{t(titleKey)}</h6>
      <RecordRows rows={rows} className="mb-0" />
    </div>
  );
};

Group.propTypes = {
  tone: PropTypes.string.isRequired,
  titleKey: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
};

const overviewRows = ({ arc, ratios, t, language }) => [
  {
    key: 'size',
    label: t('host.arcStats.currentSize'),
    value: badge('info', bytesOf(arc, 'arc_size')),
  },
  {
    key: 'target',
    label: t('host.arcStats.targetSize'),
    value: badge('primary', bytesOf(arc, 'arc_target_size')),
  },
  {
    key: 'bounds',
    label: t('host.arcStats.minMaxSize'),
    value: (
      <span className="d-inline-flex flex-wrap gap-2">
        <span className="badge text-bg-secondary" title={t('host.arcStats.minSizeTitle')}>
          {bytesOf(arc, 'arc_min_size')}
        </span>
        <span className="badge text-bg-dark" title={t('host.arcStats.maxSizeTitle')}>
          {bytesOf(arc, 'arc_max_size')}
        </span>
      </span>
    ),
  },
  {
    key: 'hitRatio',
    label: t('host.arcStats.hitRatio'),
    value: badge(hitRatioTone(ratios.hitRatio), `${ratios.hitRatio}%`),
  },
  {
    key: 'demand',
    label: t('host.arcStats.dataEfficiency'),
    value: badge(
      dataEfficiencyTone(Number(arc.data_demand_efficiency)),
      percentOf(arc.data_demand_efficiency)
    ),
  },
  {
    key: 'prefetch',
    label: t('host.arcStats.prefetchEfficiency'),
    value: badge(
      prefetchEfficiencyTone(Number(arc.data_prefetch_efficiency)),
      percentOf(arc.data_prefetch_efficiency)
    ),
  },
  {
    key: 'compression',
    label: t('host.arcStats.compressionRatio'),
    value: badge(
      compressionRatioTone(ratios.compressionRatio ?? 0),
      `${ratios.compressionRatio ?? NOT_AVAILABLE}x`
    ),
  },
  {
    key: 'updated',
    label: t('host.arcStats.lastUpdated'),
    value: (
      <span className="text-muted small">
        {new Date(arc.scan_timestamp).toLocaleTimeString(language)}
      </span>
    ),
  },
];

const memoryRows = (arc, t) =>
  [
    ['mru_size', 'host.arcStats.mruSize'],
    ['mfu_size', 'host.arcStats.mfuSize'],
    ['data_size', 'host.arcStats.dataSize'],
    ['metadata_size', 'host.arcStats.metadataSize'],
    ['arc_meta_used', 'host.arcStats.metaUsed'],
    ['arc_meta_limit', 'host.arcStats.metaLimit'],
  ].map(([member, labelKey]) => ({ key: member, label: t(labelKey), value: bytesOf(arc, member) }));

const hitRows = (arc, t, language) => [
  {
    key: 'hits',
    label: t('host.arcStats.totalHits'),
    value: badge('success', countOf(arc, arc.hits === undefined ? 'arc_hits' : 'hits', language)),
  },
  {
    key: 'misses',
    label: t('host.arcStats.totalMisses'),
    value: badge(
      'warning',
      countOf(arc, arc.misses === undefined ? 'arc_misses' : 'misses', language)
    ),
  },
  { key: 'mruHits', label: t('host.arcStats.mruHits'), value: countOf(arc, 'mru_hits', language) },
  { key: 'mfuHits', label: t('host.arcStats.mfuHits'), value: countOf(arc, 'mfu_hits', language) },
  {
    key: 'mruGhost',
    label: t('host.arcStats.mruGhostHits'),
    value: countOf(arc, 'mru_ghost_hits', language),
  },
  {
    key: 'mfuGhost',
    label: t('host.arcStats.mfuGhostHits'),
    value: countOf(arc, 'mfu_ghost_hits', language),
  },
];

const demandRows = (arc, t, language) =>
  [
    ['demand_data_hits', 'host.arcStats.demandDataHits', 'success'],
    ['demand_data_misses', 'host.arcStats.demandDataMisses', 'warning'],
    ['demand_metadata_hits', 'host.arcStats.demandMetaHits', 'success'],
    ['demand_metadata_misses', 'host.arcStats.demandMetaMisses', 'warning'],
    ['prefetch_data_hits', 'host.arcStats.prefetchDataHits', 'info'],
    ['prefetch_data_misses', 'host.arcStats.prefetchDataMisses', 'dark'],
  ].map(([member, labelKey, tone]) => ({
    key: member,
    label: t(labelKey),
    value: badge(tone, countOf(arc, member, language)),
  }));

const l2Rows = (arc, ratios, t, language) => [
  { key: 'size', label: t('host.arcStats.l2Size'), value: badge('info', bytesOf(arc, 'l2_size')) },
  {
    key: 'hits',
    label: t('host.arcStats.l2Hits'),
    value: badge('success', countOf(arc, 'l2_hits', language)),
  },
  {
    key: 'misses',
    label: t('host.arcStats.l2Misses'),
    value: badge('warning', countOf(arc, 'l2_misses', language)),
  },
  {
    key: 'ratio',
    label: t('host.arcStats.l2HitRatio'),
    value: badge(l2HitRatioTone(ratios.l2HitRatio), `${ratios.l2HitRatio}%`),
  },
];

/**
 * The ZFS ARC statistics of the storage page, hyperweaver-ui's card over
 * the newest ARC sample the host's series holds: the overview, the
 * memory breakdown, the hit and miss statistics, the demand against the
 * prefetch, and the L2ARC where the sample carries one, each a record of
 * its values in hyperweaver-ui's tones; the chevron folds the card, the
 * fold kept in the page's preferences. Nothing draws while the series
 * holds no sample.
 */
const ArcStats = ({ arc, folds }) => {
  const { t, i18n } = useTranslation();
  if (!arc) {
    return null;
  }
  const { language } = i18n;
  const ratios = arcRatios(arc);
  const folded = folds.folded(FOLD);
  return (
    <div data-panel="storage-arc" data-folded={folded}>
      <SectionCard
        title={t('host.arcStats.title')}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.arcStats.expand' : 'host.arcStats.collapse')}
      >
        <h6 className="fs-6 fw-bold mb-2 text-info">{t('host.arcStats.arcOverview')}</h6>
        <RecordRows rows={overviewRows({ arc, ratios, t, language })} />
        <div className="row g-3">
          <Group
            tone="success"
            titleKey="host.arcStats.memoryBreakdown"
            rows={memoryRows(arc, t)}
          />
          <Group
            tone="warning"
            titleKey="host.arcStats.hitMissStats"
            rows={hitRows(arc, t, language)}
          />
          <Group
            tone="info"
            titleKey="host.arcStats.demandVsPrefetch"
            rows={demandRows(arc, t, language)}
          />
        </div>
        {ratios.l2 ? (
          <div className="mt-4" data-panel="storage-l2arc">
            <h6 className="fs-6 fw-bold mb-2 text-danger">{t('host.arcStats.l2arcStats')}</h6>
            <RecordRows rows={l2Rows(arc, ratios, t, language)} className="mb-0" />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
};

ArcStats.propTypes = {
  arc: PropTypes.object,
  folds: foldsShape.isRequired,
};

export default ArcStats;
