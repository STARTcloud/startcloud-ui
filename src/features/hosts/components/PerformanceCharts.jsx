import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { CHART_ORDER, chartOf } from '../charts/registry';
import { useHostRow } from '../hooks/useHostRow';
import { hostOffers } from '../utils/monitoring';

import PerformanceCard from './PerformanceCard';

/**
 * The performance charts of the host page, behind `monitoring`: the
 * heading and under it one card a chart in `CHART_ORDER`, the storage
 * I/O and the ZFS ARC only on a host whose own row lists `zfs` too,
 * then the network, the CPU and the memory, every chart drawn from the
 * browser's store over the window the page's heading row holds and
 * under the controls it provides. The series grow by the samples the
 * `monitoring` topic pushes and nothing reads on a clock.
 */
const PerformanceCharts = ({ id, host, folds }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);

  if (!hostOffers(server, chartOf('cpu').tokens)) {
    return null;
  }

  const metrics = CHART_ORDER.filter(metric => hostOffers(server, chartOf(metric).tokens));

  return (
    <div data-panel="performance">
      <SectionHeading title={t('hosts.charts.heading')} />
      <div className="row g-3 mb-3">
        {metrics.map(metric => (
          <div key={metric} className="col-12 col-lg-6 col-xxl-4">
            <PerformanceCard id={id} metric={metric} host={host} folds={folds} />
          </div>
        ))}
      </div>
    </div>
  );
};

PerformanceCharts.propTypes = {
  id: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

export default PerformanceCharts;
