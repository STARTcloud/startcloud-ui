import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaFileCode, FaFileCsv } from 'react-icons/fa6';

import { exportCsv, exportJson } from '../utils/exportRows';

const download = (text, type, filename) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

/**
 * The JSON and CSV downloads of the rows the page shows, filtered and
 * sorted as they are.
 */
const ExportButtons = ({ rows, now }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={() => download(exportJson(rows), 'application/json', 'vdi-health-export.json')}
        title={t('vdi.toolbar.exportJson')}
      >
        <FaFileCode aria-hidden />
        JSON
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={() => download(exportCsv(rows, { t, now }), 'text/csv', 'vdi-health-export.csv')}
        title={t('vdi.toolbar.exportCsv')}
      >
        <FaFileCsv aria-hidden />
        CSV
      </button>
    </>
  );
};

ExportButtons.propTypes = {
  rows: PropTypes.array.isRequired,
  now: PropTypes.number.isRequired,
};

export default ExportButtons;
