import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { chartOf } from '../charts/registry';
import { poolSpec } from '../utils/chartDefaults';

import ChartCard from './ChartCard';
import OneSampleNote from './OneSampleNote';

const TITLE_KEY = chartOf('pool').texts.titleKey;

const typeOf = (latest, name) => latest.find(row => row.pool === name)?.pool_type || '';

/**
 * One chart a pool, titled by the pool's name and its type, its three
 * lines read, written and both, each a `ChartCard` whose pills are the
 * page's, so a line hidden in one is hidden in every chart; the line
 * under them counts the pools.
 */
const PoolCharts = ({ pools, latest, visibility, onToggle, host, emptyText, single, folds }) => {
  const { t } = useTranslation();
  const names = Object.keys(pools)
    .filter(name => pools[name].total.length > 0)
    .sort((a, b) => a.localeCompare(b));
  if (names.length === 0) {
    return null;
  }
  return (
    <div data-panel="storage-pool-charts">
      <SectionHeading title={t('hostCharts.poolCharts.sectionTitle')} />
      <div className="row g-3 mb-2">
        {names.map(name => (
          <div key={name} className="col-12 col-lg-6 col-xxl-4">
            <ChartCard
              chart={`pool:${name}`}
              metric="pool"
              title={t(TITLE_KEY, { id: name })}
              chartTitle={typeOf(latest, name) ? `${name} (${typeOf(latest, name)})` : name}
              expandedTitle={t(TITLE_KEY, { id: name })}
              spec={poolSpec(pools[name], t)}
              visibility={visibility}
              onToggle={onToggle}
              emptyText={emptyText}
              host={host}
              folds={folds}
              fold={`chart-pool:${name}`}
            >
              <OneSampleNote single={single} />
            </ChartCard>
          </div>
        ))}
      </div>
      <p className="small text-muted text-center mb-3" data-note="pool-charts-count">
        {t('hosts.storage.poolChartsNote', { count: names.length })}
      </p>
    </div>
  );
};

PoolCharts.propTypes = {
  pools: PropTypes.object.isRequired,
  latest: PropTypes.array.isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggle: PropTypes.func.isRequired,
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default PoolCharts;
