import PropTypes from 'prop-types';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

import { hasPoints } from '../../utils/chart';

import { axisShape, rangeShape, seriesShape } from './chartShapes';

const ChartCanvas = lazy(() => import('./ChartCanvas'));

const SIZES = {
  spark: 'chart-spark',
  xs: 'chart-box chart-box-xs',
  sm: 'chart-box chart-box-sm',
  lg: 'chart-box chart-box-lg',
};

const ONE_AXIS = [{}];

/**
 * The estate's one chart, the component every feature draws a series
 * over time with: a smoothed line per series over a time axis, filled
 * under it and dotted at its newest point, broken at every null, one or
 * two value axes, a shared tooltip whose values carry their unit, the
 * legend only for a chart of several entities, a click on an entry
 * isolating that entity, pan by drag and zoom by wheel over `range`, the
 * slider too while `slider`, every line thinned to the pixels across the
 * box, every colour from the theme's tokens and following a change of
 * mode or theme, the box sized by a class, `sm` a panel's, `lg` the
 * expanded dialog's, `xs` a dashboard widget's, which draws `compact`, and
 * `spark` a table cell's, which draws the first series as a sparkline,
 * the chart following its box, and its crosshair
 * shared with every chart of its `group`. Apache ECharts draws it and is
 * loaded on demand, the first time a chart with a point draws, so a UI
 * backend that draws no chart never downloads it; while it loads the box
 * reads the loading line, and a chart without a point draws `emptyText`
 * in the same box and loads nothing.
 */
const Chart = ({
  title,
  series,
  axes = ONE_AXIS,
  range = null,
  slider = false,
  compact = false,
  size = 'sm',
  group = '',
  isolated = null,
  onIsolate = null,
  onRange = null,
  apiRef = null,
  emptyText,
}) => {
  const { t } = useTranslation();
  const boxClass = SIZES[size];

  if (!hasPoints(series)) {
    return (
      <div className={`${boxClass} chart-empty`} role="status">
        {emptyText}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className={`${boxClass} chart-empty`}>{t('pages.loading')}</div>}>
      <ChartCanvas
        title={title}
        series={series}
        axes={axes}
        range={range}
        slider={slider}
        compact={compact}
        spark={size === 'spark'}
        group={group}
        isolated={isolated}
        onIsolate={onIsolate}
        onRange={onRange}
        apiRef={apiRef}
        boxClass={boxClass}
      />
    </Suspense>
  );
};

Chart.propTypes = {
  title: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(seriesShape).isRequired,
  axes: PropTypes.arrayOf(axisShape),
  range: rangeShape,
  slider: PropTypes.bool,
  compact: PropTypes.bool,
  size: PropTypes.oneOf(Object.keys(SIZES)),
  group: PropTypes.string,
  isolated: PropTypes.string,
  onIsolate: PropTypes.func,
  onRange: PropTypes.func,
  apiRef: PropTypes.shape({ current: PropTypes.any }),
  emptyText: PropTypes.node.isRequired,
};

export default Chart;
