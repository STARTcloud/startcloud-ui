import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { useHostRow } from '../hooks/useHostRow';
import { CHART_ORDER, DEFAULT_VISIBILITY } from '../utils/chartSpecs';
import { SERIES, hostOffers } from '../utils/monitoring';

import PerformanceCard from './PerformanceCard';

const toggled = (visibility, metric, key) => ({
  ...visibility,
  [metric]: { ...visibility[metric], [key]: !visibility[metric][key] },
});

/**
 * The performance charts of the host page, behind `monitoring`: the
 * heading and under it one card a chart in hyperweaver-ui's order, the
 * storage I/O and the ZFS ARC only on a host whose own row lists `zfs`
 * too, then the network, the CPU and the memory, every chart read over
 * the time window and at the resolution the page's heading row holds.
 * The groups of series a person hid are the page's own and are kept
 * while the page is drawn. hyperweaver-ui's refresh interval and its
 * Auto and Manual switch are not carried over, because the series grow
 * by the samples the `monitoring` topic pushes and nothing reads on a
 * clock.
 */
const PerformanceCharts = ({ id, host, folds }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);

  if (!hostOffers(server, SERIES.cpu.tokens)) {
    return null;
  }

  const metrics = CHART_ORDER.filter(metric => hostOffers(server, SERIES[metric].tokens));

  return (
    <div data-panel="performance">
      <SectionHeading title={t('hosts.charts.heading')} />
      <div className="row g-3 mb-3">
        {metrics.map(metric => (
          <div key={metric} className="col-12 col-lg-6 col-xxl-4">
            <PerformanceCard
              id={id}
              metric={metric}
              host={host}
              folds={folds}
              visibility={visibility[metric]}
              onToggle={key => setVisibility(current => toggled(current, metric, key))}
            />
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
