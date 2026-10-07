import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { axisShape, seriesShape } from '../../../components/common/chartShapes';
import { foldsShape } from '../../../components/common/SectionCard';

import ChartCard from './ChartCard';

const Heading = ({ title, subtitle }) =>
  subtitle ? (
    <>
      {title}{' '}
      <code className="small text-muted fw-normal" title={subtitle} data-dataset>
        {subtitle}
      </code>
    </>
  ) : (
    title
  );

Heading.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};

/**
 * One chart of the machine page, a `ChartCard` that folds under
 * `machine-chart-` and the chart's key, in the grid the page's cards
 * share: the title, `subtitle` after it where the chart has one, the
 * dataset of a volume, the chart's badges, its newest values, and
 * Refresh, which reads the chart's series again. While the series holds
 * no sample the box says the chart waits for samples, `waitKey`; a read
 * that failed draws the sentence of `failKey` with the agent's own
 * message under the box, the samples held before it kept on screen; and
 * while the series holds one sample alone the line under it says the
 * chart draws one sample, an agent that answers the one sample it takes
 * at the read answering no more.
 */
const MachineChartCard = ({
  chart,
  metric,
  title,
  subtitle = '',
  badges = null,
  spec,
  state,
  waitKey,
  failKey,
  host,
  folds,
  onRefresh,
}) => {
  const { t } = useTranslation();
  return (
    <ChartCard
      chart={chart}
      metric={metric}
      title={<Heading title={title} subtitle={subtitle} />}
      chartTitle={title}
      expandedTitle={title}
      badges={badges}
      spec={spec}
      emptyText={t(state.loaded ? waitKey : 'pages.loading')}
      host={host}
      folds={folds}
      fold={`machine-chart-${chart}`}
      onRefresh={onRefresh}
      className="col-12 col-lg-6 col-xxl-4"
      cardClassName="mb-0 h-100"
    >
      {state.failed ? (
        <p className="small text-danger mt-2 mb-0" role="alert" data-note="chart-failed">
          {t(failKey, { message: state.message })}
        </p>
      ) : null}
      {state.samples === 1 ? (
        <p className="small text-muted mt-2 mb-0" data-note="one-sample">
          {t('hosts.charts.oneSample')}
        </p>
      ) : null}
    </ChartCard>
  );
};

MachineChartCard.propTypes = {
  chart: PropTypes.string.isRequired,
  metric: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badges: PropTypes.node,
  spec: PropTypes.shape({
    axes: PropTypes.arrayOf(axisShape).isRequired,
    series: PropTypes.arrayOf(seriesShape).isRequired,
  }).isRequired,
  state: PropTypes.shape({
    samples: PropTypes.number.isRequired,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  waitKey: PropTypes.string.isRequired,
  failKey: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default MachineChartCard;
