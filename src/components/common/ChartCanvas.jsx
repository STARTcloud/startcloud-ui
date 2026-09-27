import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { init, use as register } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

import { useThemeRevision } from '../../hooks/useThemeRevision';
import { CHART_PROBES, chartOption } from '../../utils/chart';

import { axisShape, seriesShape } from './chartShapes';

register([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  AriaComponent,
  CanvasRenderer,
]);

const MERGE = { replaceMerge: ['series'] };

const readColors = (probes, box) => {
  const colors = { font: getComputedStyle(box).fontFamily };
  probes.querySelectorAll('[data-tone]').forEach(probe => {
    colors[probe.dataset.tone] = getComputedStyle(probe).color;
  });
  return colors;
};

const reducedMotion = () => document.documentElement.getAttribute('data-motion') === 'reduce';

/**
 * The canvas of the estate's one chart, the module that carries Apache
 * ECharts, loaded by `Chart` the first time a chart draws and never in
 * the build's first load: ECharts' core with the line chart, the grid,
 * the tooltip, the legend, the zoom and the `aria` component and the
 * canvas renderer, nothing else of it. The instance is made once in the
 * box the class sizes and follows that box through a `ResizeObserver`;
 * the option of `chartOption` is set whenever the series, the axes or
 * the theme moved, the colours read then from the hidden probes the
 * stylesheet paints in the theme's tokens, so a change of mode or of
 * theme repaints the chart in the new ones.
 */
const ChartCanvas = ({ title, series, axes, legend, zoom, boxClass }) => {
  const box = useRef(null);
  const probes = useRef(null);
  const chart = useRef(null);
  const revision = useThemeRevision();

  useEffect(() => {
    const element = box.current;
    const instance = init(element, null, { renderer: 'canvas' });
    const observer = new ResizeObserver(() => instance.resize());
    chart.current = instance;
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.current = null;
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    chart.current.setOption(
      chartOption({
        title,
        series,
        axes,
        legend,
        zoom,
        colors: readColors(probes.current, box.current),
        reduced: reducedMotion(),
      }),
      MERGE
    );
  }, [title, series, axes, legend, zoom, revision]);

  return (
    <div className="chart">
      <span ref={probes} className="chart-probes" aria-hidden="true">
        {CHART_PROBES.map(tone => (
          <span key={tone} data-tone={tone} className={`chart-tone-${tone}`} />
        ))}
      </span>
      <div ref={box} className={boxClass} role="img" />
    </div>
  );
};

ChartCanvas.propTypes = {
  title: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(seriesShape).isRequired,
  axes: PropTypes.arrayOf(axisShape).isRequired,
  legend: PropTypes.bool.isRequired,
  zoom: PropTypes.bool.isRequired,
  boxClass: PropTypes.string.isRequired,
};

export default ChartCanvas;
