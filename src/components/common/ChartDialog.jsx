import PropTypes from 'prop-types';
import { useRef } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaFileCsv, FaImage } from 'react-icons/fa6';

import { csvOf, exportName, saveCsv } from '../../utils/chartExport';

import Chart from './Chart';
import { axisShape, pillShape, rangeShape, seriesShape } from './chartShapes';
import LinePills from './LinePills';

const GROUP = 'chart-dialog';

const NO_PILLS = [];

const NO_VISIBILITY = {};

/**
 * The expanded chart dialog, the one dialog a chart of any feature opens
 * to be read at size: in its header the title, the same pills the card
 * carries, so a line hidden in one is hidden in the other, Export as two
 * glyphs, a CSV of the drawn range and a PNG of the canvas, and Close;
 * under it the chart in the `lg` box with the zoom slider, its legend
 * where the card has one and the entity the card isolates. A click on
 * the backdrop and Escape close it. It takes the form dialog's metric,
 * because a chart needs the width a form does.
 */
const ChartDialog = ({
  title,
  chartTitle,
  series,
  axes,
  range = null,
  emptyText,
  pills = NO_PILLS,
  visibility = NO_VISIBILITY,
  onToggle = null,
  isolated = null,
  onIsolate = null,
  onHide,
}) => {
  const { t } = useTranslation();
  const apiRef = useRef(null);
  const exportCsv = t('hosts.charts.exportCsv');
  const exportPng = t('hosts.charts.exportPng');
  return (
    <Modal show onHide={onHide} dialogClassName="form-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
        <span className="d-flex align-items-center flex-wrap gap-2 ms-auto me-2">
          {pills.length > 0 ? (
            <LinePills pills={pills} visibility={visibility} onToggle={onToggle} />
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary btn-glyph"
            title={exportCsv}
            aria-label={exportCsv}
            data-tool="export-csv"
            onClick={() => saveCsv(csvOf(series, range), exportName(title, 'csv'))}
          >
            <FaFileCsv aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary btn-glyph"
            title={exportPng}
            aria-label={exportPng}
            data-tool="export-png"
            onClick={() => apiRef.current?.png(exportName(title, 'png'))}
          >
            <FaImage aria-hidden="true" />
          </button>
        </span>
      </Modal.Header>
      <Modal.Body>
        <Chart
          title={chartTitle}
          series={series}
          axes={axes}
          range={range}
          emptyText={emptyText}
          size="lg"
          group={GROUP}
          isolated={isolated}
          onIsolate={onIsolate}
          apiRef={apiRef}
          slider
        />
      </Modal.Body>
    </Modal>
  );
};

ChartDialog.propTypes = {
  title: PropTypes.string.isRequired,
  chartTitle: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(seriesShape).isRequired,
  axes: PropTypes.arrayOf(axisShape).isRequired,
  range: rangeShape,
  emptyText: PropTypes.node.isRequired,
  pills: PropTypes.arrayOf(pillShape),
  visibility: PropTypes.objectOf(PropTypes.bool),
  onToggle: PropTypes.func,
  isolated: PropTypes.string,
  onIsolate: PropTypes.func,
  onHide: PropTypes.func.isRequired,
};

export default ChartDialog;
