import PropTypes from 'prop-types';

/**
 * One series of a chart: its `key`, the `name` the tooltip reads, the
 * `entity` the legend lists it under where the chart draws several, the
 * `group` the pill that shows and hides it names, its `points` as
 * `[[ms, value|null]]`, a null a break, and how it is drawn, the `tone`,
 * the `dash`, the `width`, the `opacity`, the value `axis` it is measured
 * on, the `unit` and `digits` of its tooltip value and whether it is
 * `hidden`.
 */
export const seriesShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  entity: PropTypes.string,
  group: PropTypes.string,
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

/**
 * The range a chart draws, two instants in milliseconds.
 */
export const rangeShape = PropTypes.shape({
  from: PropTypes.number.isRequired,
  to: PropTypes.number.isRequired,
});

/**
 * One pill of a chart's header: its `key`, the group of series it shows
 * and hides, its `label` and the `tone` it is drawn in while pressed,
 * empty for the neutral one.
 */
export const pillShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
});
