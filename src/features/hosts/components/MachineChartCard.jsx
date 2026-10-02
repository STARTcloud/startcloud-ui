import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpand, FaRotate } from 'react-icons/fa6';

import Chart from '../../../components/common/Chart';
import ChartDialog from '../../../components/common/ChartDialog';
import { axisShape, seriesShape } from '../../../components/common/chartShapes';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';

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
 * One chart of the machine page, a section card that folds under
 * `machine-chart-` and the chart's key, in the grid the page's cards
 * share: the title, `subtitle` after it where the chart has one, the
 * dataset of a volume, the chart's badges, its newest values, Refresh,
 * which reads the chart's series again, and the button that opens the
 * chart at size in the card's actions, and the shared chart in the 200px
 * box with its legend under it. While the series holds no sample the box
 * says the chart waits for samples, `waitKey`; a read that failed draws
 * the sentence of `failKey` with the agent's own message under the box,
 * the samples held before it kept on screen; and while the series holds
 * one sample alone the line under it says the chart draws one sample, an
 * agent that answers the one sample it takes at the read answering no
 * more.
 */
const MachineChartCard = ({
  chart,
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
  const [expanded, setExpanded] = useState(false);
  const emptyText = t(state.loaded ? waitKey : 'pages.loading');
  const fold = `machine-chart-${chart}`;
  const refresh = t('hosts.machineCharts.refresh');
  const expand = t('hosts.charts.expand');

  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={refresh}
        aria-label={refresh}
        data-tool="refresh"
        onClick={onRefresh}
      >
        <FaRotate aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={expand}
        aria-label={expand}
        data-tool="expand"
        onClick={() => setExpanded(true)}
      >
        <FaExpand aria-hidden="true" />
      </button>
    </>
  );

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-chart={chart}>
      <SectionCard
        title={<Heading title={title} subtitle={subtitle} />}
        badge={badges}
        actions={actions}
        className="mb-0 h-100"
        folded={folds.folded(fold)}
        onFold={() => folds.toggle(fold)}
      >
        <Chart title={title} series={spec.series} axes={spec.axes} emptyText={emptyText} legend />
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
      </SectionCard>
      {expanded ? (
        <ChartDialog
          title={t('hosts.charts.dialogTitle', { title, host })}
          chartTitle={title}
          series={spec.series}
          axes={spec.axes}
          emptyText={emptyText}
          onHide={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
};

MachineChartCard.propTypes = {
  chart: PropTypes.string.isRequired,
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
