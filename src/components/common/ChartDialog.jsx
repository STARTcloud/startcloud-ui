import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';

import Chart from './Chart';
import { axisShape, seriesShape } from './chartShapes';
import SeriesToggles, { toggleShape } from './SeriesToggles';

const NO_TOGGLES = [];
const NO_VISIBILITY = {};

/**
 * The expanded chart dialog, the one dialog a chart of any feature opens
 * to be read at size: the title, the series toggles of the chart centred
 * over it while it has any, the same ones the panel carries so a group
 * hidden in one is hidden in the other, and the chart in the `lg` box
 * with its legend and its zoom. It takes the form dialog's metric,
 * because a chart needs the width a form does.
 */
const ChartDialog = ({
  title,
  chartTitle,
  series,
  axes,
  emptyText,
  toggles = NO_TOGGLES,
  visibility = NO_VISIBILITY,
  onToggle = null,
  onHide,
}) => (
  <Modal show onHide={onHide} dialogClassName="form-modal" scrollable>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {toggles.length > 0 ? (
        <div className="d-flex justify-content-center">
          <SeriesToggles toggles={toggles} visibility={visibility} onToggle={onToggle} />
        </div>
      ) : null}
      <Chart
        title={chartTitle}
        series={series}
        axes={axes}
        emptyText={emptyText}
        size="lg"
        legend
        zoom
      />
    </Modal.Body>
  </Modal>
);

ChartDialog.propTypes = {
  title: PropTypes.string.isRequired,
  chartTitle: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(seriesShape).isRequired,
  axes: PropTypes.arrayOf(axisShape).isRequired,
  emptyText: PropTypes.node.isRequired,
  toggles: PropTypes.arrayOf(toggleShape),
  visibility: PropTypes.objectOf(PropTypes.bool),
  onToggle: PropTypes.func,
  onHide: PropTypes.func.isRequired,
};

export default ChartDialog;
