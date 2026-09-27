import PropTypes from 'prop-types';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

import { hasPoints } from '../../utils/chart';

import { axisShape, seriesShape } from './chartShapes';

const ChartCanvas = lazy(() => import('./ChartCanvas'));

const SIZES = {
  sm: 'chart-box chart-box-sm',
  lg: 'chart-box chart-box-lg',
};

const ONE_AXIS = [{}];

/**
 * The estate's one chart, the component every feature draws a series
 * over time with: a smoothed line per series over a time axis, one or
 * two value axes, a shared tooltip whose values carry their unit, the
 * legend and the zoom where asked for, every colour from the theme's
 * tokens and following a change of mode or theme, the box sized by a
 * class, `sm` the 200px of a panel and `lg` the expanded dialog's, and
 * the chart following its box. Apache ECharts draws it and is loaded on
 * demand, the first time a chart with a point draws, so a UI backend
 * that draws no chart never downloads it; while it loads the box reads
 * the loading line, and a chart without a point draws `emptyText` in
 * the same box and loads nothing.
 */
const Chart = ({
  title,
  series,
  axes = ONE_AXIS,
  legend = false,
  zoom = false,
  size = 'sm',
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
        legend={legend}
        zoom={zoom}
        boxClass={boxClass}
      />
    </Suspense>
  );
};

Chart.propTypes = {
  title: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(seriesShape).isRequired,
  axes: PropTypes.arrayOf(axisShape),
  legend: PropTypes.bool,
  zoom: PropTypes.bool,
  size: PropTypes.oneOf(Object.keys(SIZES)),
  emptyText: PropTypes.node.isRequired,
};

export default Chart;
