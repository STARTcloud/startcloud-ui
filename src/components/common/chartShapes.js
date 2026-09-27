import PropTypes from 'prop-types';

/**
 * One series of a chart: its `key`, the `name` the legend and the tooltip
 * read, its `points` as `[[ms, value]]`, and how it is drawn, the `tone`,
 * the `dash`, the `width`, the `opacity`, the value `axis` it is measured
 * on, the `unit` and `digits` of its tooltip value and whether it is
 * `hidden`.
 */
export const seriesShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  points: PropTypes.arrayOf(PropTypes.array).isRequired,
  tone: PropTypes.string,
  dash: PropTypes.string,
  width: PropTypes.number,
  opacity: PropTypes.number,
  axis: PropTypes.number,
  unit: PropTypes.string,
  digits: PropTypes.number,
  hidden: PropTypes.bool,
});

/**
 * One value axis of a chart: its `name`, its `min` and `max` where the
 * scale is fixed, and the `unit` its series' tooltip values carry.
 */
export const axisShape = PropTypes.shape({
  name: PropTypes.string,
  min: PropTypes.number,
  max: PropTypes.number,
  unit: PropTypes.string,
});
