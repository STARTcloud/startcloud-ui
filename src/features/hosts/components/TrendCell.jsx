import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Chart from '../../../components/common/Chart';
import { toneAt } from '../../../utils/chart';
import { useChartControls, useDrawnRange } from '../hooks/useChartControls';

const NONE = '-';

const NO_POINTS = [];

/**
 * The sparkline of one table row's entity, the `spark` cell of a table
 * over a host series: one line of `points` in `tone` over the range the
 * page's chart controls draw, frozen while the page is paused, a dash
 * while the entity holds no point.
 */
const TrendCell = ({ name, points, tone }) => {
  const { t } = useTranslation();
  const controls = useChartControls();
  const series = useMemo(() => [{ key: name, name, points, tone }], [name, points, tone]);
  const range = useDrawnRange(series, controls);
  return (
    <Chart
      title={t('hosts.charts.trendTitle', { name })}
      series={series}
      range={range}
      emptyText={NONE}
      size="spark"
    />
  );
};

TrendCell.propTypes = {
  name: PropTypes.string.isRequired,
  points: PropTypes.arrayOf(PropTypes.array).isRequired,
  tone: PropTypes.string.isRequired,
};

const newestOf = points => points.findLast(point => point[1] !== null)?.[1] ?? 0;

/**
 * The Trend column of a table whose rows are the entities of a host
 * series, the interfaces, the devices or the pools: the `spark` kind,
 * each row's `total` points of `entities` as a `TrendCell` in the tone
 * the host's charts give that entity, the tones taken in the order of
 * `entities`, and sorted by the newest total.
 *
 * @param {Object} options - The table's side
 * @param {Object<string, Object>} options.entities - The points per entity, `{ first, second, total }` each
 * @param {Function} options.nameOf - Answers the entity a row names
 * @returns {Object} The column
 */
export const trendColumn = ({ entities, nameOf }) => {
  const pointsOf = row => entities[String(nameOf(row))]?.total ?? NO_POINTS;
  const names = Object.keys(entities);
  return {
    key: 'trend',
    kind: 'spark',
    labelKey: 'hosts.charts.trend',
    value: row => newestOf(pointsOf(row)),
    render: row => (
      <TrendCell
        name={String(nameOf(row))}
        points={pointsOf(row)}
        tone={toneAt(Math.max(0, names.indexOf(String(nameOf(row)))))}
      />
    ),
  };
};

export default TrendCell;
