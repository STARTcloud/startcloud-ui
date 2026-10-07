import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExpand, FaRotate } from 'react-icons/fa6';

import Chart from '../../../components/common/Chart';
import ChartDialog from '../../../components/common/ChartDialog';
import { axisShape, seriesShape } from '../../../components/common/chartShapes';
import LinePills from '../../../components/common/LinePills';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { isolatedAfter } from '../../../utils/chart';
import { chartOf } from '../charts/registry';
import { useChartControls, useDrawnRange, useHeld } from '../hooks/useChartControls';
import { chartPills, visibleSeries } from '../utils/chartSpecs';

const toggled = (visibility, key) => ({ ...visibility, [key]: visibility[key] === false });

/**
 * One chart card of the hosts feature, the shape every chart of the
 * host, Bandwidth, storage and machine pages takes: a section card that
 * folds under `fold`, its header carrying the title, `badges` after it
 * and in its actions the pills of the chart's lines, Refresh as a glyph
 * where the card has one, and the glyph that opens the chart at size;
 * under it the one `Chart` over `spec` in the page's crosshair group,
 * over the range the page's controls fix, its lines frozen while the
 * page is paused, and `children`, the notes under the chart. The pills
 * are the registry entry's, kept by the card unless `visibility` and
 * `onToggle` are given, and the entity a click on the legend isolates
 * is the card's own; the expanded dialog draws the same lines, pills and
 * isolation.
 */
const ChartCard = ({
  chart,
  metric,
  title,
  chartTitle,
  expandedTitle,
  badges = null,
  spec,
  visibility = null,
  onToggle = null,
  emptyText,
  host,
  folds,
  fold,
  onRefresh = null,
  className = '',
  cardClassName = 'mb-0',
  children = null,
}) => {
  const { t } = useTranslation();
  const controls = useChartControls();
  const [expanded, setExpanded] = useState(false);
  const [isolated, setIsolated] = useState(null);
  const [own, setOwn] = useState(() => chartOf(metric).groups);
  const drawn = useHeld(spec, controls.paused);
  const shown = visibility ?? own;
  const pills = useMemo(() => chartPills(metric, drawn.series, t), [metric, drawn.series, t]);
  const series = useMemo(() => visibleSeries(drawn.series, shown), [drawn.series, shown]);
  const range = useDrawnRange(drawn.series, controls);
  const toggle = onToggle ?? (key => setOwn(current => toggled(current, key)));
  const isolate = useCallback(name => setIsolated(current => isolatedAfter(current, name)), []);
  const expand = t('hosts.charts.expand');
  const refresh = t('hosts.machineCharts.refresh');

  const actions = (
    <>
      {pills.length > 0 ? <LinePills pills={pills} visibility={shown} onToggle={toggle} /> : null}
      {onRefresh ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary btn-glyph"
          title={refresh}
          aria-label={refresh}
          data-tool="refresh"
          onClick={onRefresh}
        >
          <FaRotate aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary btn-glyph"
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
    <div
      className={className}
      data-chart={chart}
      data-isolated={isolated ?? ''}
      data-range-to={range ? range.to : ''}
    >
      <SectionCard
        title={title}
        badge={badges}
        actions={actions}
        className={cardClassName}
        folded={folds.folded(fold)}
        onFold={() => folds.toggle(fold)}
      >
        <Chart
          title={chartTitle}
          series={series}
          axes={drawn.axes}
          range={range}
          group={controls.group}
          isolated={isolated}
          onIsolate={isolate}
          onRange={controls.pan}
          emptyText={emptyText}
        />
        {children}
      </SectionCard>
      {expanded ? (
        <ChartDialog
          title={t('hosts.charts.dialogTitle', { title: expandedTitle, host })}
          chartTitle={chartTitle}
          series={series}
          axes={drawn.axes}
          range={range}
          emptyText={emptyText}
          pills={pills}
          visibility={shown}
          onToggle={toggle}
          isolated={isolated}
          onIsolate={isolate}
          onHide={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
};

ChartCard.propTypes = {
  chart: PropTypes.string.isRequired,
  metric: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  chartTitle: PropTypes.string.isRequired,
  expandedTitle: PropTypes.string.isRequired,
  badges: PropTypes.node,
  spec: PropTypes.shape({
    axes: PropTypes.arrayOf(axisShape).isRequired,
    series: PropTypes.arrayOf(seriesShape).isRequired,
  }).isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool),
  onToggle: PropTypes.func,
  emptyText: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
  fold: PropTypes.string.isRequired,
  onRefresh: PropTypes.func,
  className: PropTypes.string,
  cardClassName: PropTypes.string,
  children: PropTypes.node,
};

export default ChartCard;
