import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { chartOf } from '../charts/registry';
import { poolSpec } from '../utils/chartDefaults';

import NetworkingChartCard from './NetworkingChartCard';

const TITLE_KEY = chartOf('pool').texts.titleKey;

const typeOf = (latest, name) => latest.find(row => row.pool === name)?.pool_type || '';

/**
 * One chart a pool, hyperweaver-ui's pool charts, titled by the pool's
 * name and its type, its three lines read, written and both, the lines
 * a person hid hidden in every chart; the line under them counts the
 * pools.
 */
const PoolCharts = ({ pools, latest, visibility, host, emptyText, single, folds }) => {
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
            <NetworkingChartCard
              chart={`pool:${name}`}
              title={t(TITLE_KEY, { id: name })}
              chartTitle={typeOf(latest, name) ? `${name} (${typeOf(latest, name)})` : name}
              host={host}
              spec={poolSpec(pools[name], visibility, t)}
              emptyText={emptyText}
              single={single}
              folds={folds}
            />
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
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default PoolCharts;
