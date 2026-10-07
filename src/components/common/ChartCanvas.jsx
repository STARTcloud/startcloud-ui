import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { connect, init, use as register } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

import { useThemeRevision } from '../../hooks/useThemeRevision';
import {
  CHART_PROBES,
  axisSpan,
  chartOption,
  entitiesOf,
  legendSelected,
  newestOf,
  sparkOption,
  zoomedRange,
} from '../../utils/chart';
import { savePng } from '../../utils/chartExport';

import { axisShape, rangeShape, seriesShape } from './chartShapes';

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

const LEAST_RANGE_MS = 10 * 1000;

const readColors = (probes, box) => {
  const colors = { font: getComputedStyle(box).fontFamily };
  probes.querySelectorAll('[data-tone]').forEach(probe => {
    colors[probe.dataset.tone] = getComputedStyle(probe).color;
  });
  return colors;
};

const reducedMotion = () => document.documentElement.getAttribute('data-motion') === 'reduce';

const zoomHandler = held => {
  let pending = null;
  return params => {
    const { onRange, range, slider, series } = held.current;
    if (!onRange || slider || !range) {
      return;
    }
    const first = pending === null;
    pending = zoomedRange(params, axisSpan(range), LEAST_RANGE_MS);
    if (first) {
      requestAnimationFrame(() => {
        const newest = newestOf(held.current.series ?? series);
        onRange(pending, newest !== null && pending.to >= newest);
        pending = null;
      });
    }
  };
};

/**
 * The canvas of the estate's one chart, the module that carries Apache
 * ECharts, loaded by `Chart` the first time a chart draws and never in
 * the build's first load: ECharts' core with the line chart, the grid,
 * the tooltip, the legend, the zoom and the `aria` component and the
 * canvas renderer, nothing else of it. The instance is made once in the
 * box the class sizes, joined to `group` so every chart of the group
 * shows its tooltip at one instant, and follows that box through a
 * `ResizeObserver`, the lines thinned again to its width; the option of
 * `chartOption` is set whenever the series, the axes, the range, the
 * isolated entity or the theme moved, the colours read then from the
 * hidden probes the stylesheet paints in the theme's tokens, so a change
 * of mode or of theme repaints the chart in the new ones. A pointer click
 * on a legend entry of this chart hands its entity to `onIsolate`, once a
 * click; the legend's own toggle, and one a connected chart relays, is
 * overwritten at once with the selection `isolated` names, so the shown
 * entities are only ever the page's state; a drag or a wheel inside
 * the plot hands the range it reached to `onRange`, once a frame, with
 * whether it reached the newest point; `apiRef` is given `png(name)`, which
 * saves the canvas as a PNG. A `compact` chart takes the compact option of
 * `chartOption`, and a `spark` chart the option of `sparkOption`.
 */
const ChartCanvas = ({
  title,
  series,
  axes,
  range,
  slider,
  compact,
  spark,
  group,
  isolated,
  onIsolate,
  onRange,
  apiRef,
  boxClass,
}) => {
  const box = useRef(null);
  const probes = useRef(null);
  const chart = useRef(null);
  const held = useRef({ onIsolate, onRange, range, slider, series, isolated });
  const [width, setWidth] = useState(0);
  const revision = useThemeRevision();

  useEffect(() => {
    held.current = { onIsolate, onRange, range, slider, series, isolated };
  });

  useEffect(() => {
    const element = box.current;
    const instance = init(element, null, { renderer: 'canvas' });
    if (group) {
      instance.group = group;
      connect(group);
    }
    instance.on('legendselectchanged', () => {
      instance.setOption({
        legend: { selected: legendSelected(held.current.series, held.current.isolated) },
      });
    });
    instance.on('click', params => {
      if (
        params.componentType === 'legend' &&
        entitiesOf(held.current.series).includes(params.value)
      ) {
        held.current.onIsolate?.(params.value);
      }
    });
    instance.on('datazoom', zoomHandler(held));
    const observer = new ResizeObserver(() => {
      instance.resize();
      setWidth(instance.getWidth());
    });
    chart.current = instance;
    if (apiRef) {
      apiRef.current = {
        png: name => savePng(instance, readColors(probes.current, element).surface, name),
      };
    }
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.current = null;
      if (apiRef) {
        apiRef.current = null;
      }
      instance.dispose();
    };
  }, [group, apiRef]);

  useEffect(() => {
    const drawn = {
      title,
      series,
      range,
      width: width || chart.current.getWidth(),
      colors: readColors(probes.current, box.current),
      reduced: reducedMotion(),
    };
    chart.current.setOption(
      spark ? sparkOption(drawn) : chartOption({ ...drawn, axes, slider, compact, isolated }),
      MERGE
    );
  }, [title, series, axes, range, width, slider, compact, spark, isolated, revision]);

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
  range: rangeShape,
  slider: PropTypes.bool.isRequired,
  compact: PropTypes.bool.isRequired,
  spark: PropTypes.bool.isRequired,
  group: PropTypes.string.isRequired,
  isolated: PropTypes.string,
  onIsolate: PropTypes.func,
  onRange: PropTypes.func,
  apiRef: PropTypes.shape({ current: PropTypes.any }),
  boxClass: PropTypes.string.isRequired,
};

export default ChartCanvas;
