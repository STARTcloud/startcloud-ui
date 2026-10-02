import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaFileCode, FaFileCsv } from 'react-icons/fa6';

import RowMenu from '../../../components/common/RowMenu';
import { exportDeviceData } from '../utils/DeviceUtils';

/**
 * The export menu of the devices page, what is left of hyperweaver-ui's
 * device filters card once its search and its three selects became the
 * navbar's one search binding and its filter groups: Export as CSV or as
 * JSON, the rows the binding left, named by the host and the day.
 */
const DeviceFilters = ({ devices, hostname }) => {
  const { t } = useTranslation();
  const label = (
    <>
      <FaDownload className="me-2" aria-hidden="true" />
      {t('host.deviceFilters.exportButton')}
    </>
  );
  return (
    <RowMenu label={label}>
      <Dropdown.Item
        as="button"
        type="button"
        data-action="export-csv"
        onClick={() => exportDeviceData(devices, hostname, 'csv')}
      >
        <FaFileCsv className="me-2" aria-hidden="true" />
        {t('host.deviceFilters.exportCsv')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        data-action="export-json"
        onClick={() => exportDeviceData(devices, hostname, 'json')}
      >
        <FaFileCode className="me-2" aria-hidden="true" />
        {t('host.deviceFilters.exportJson')}
      </Dropdown.Item>
    </RowMenu>
  );
};

DeviceFilters.propTypes = {
  devices: PropTypes.array.isRequired,
  hostname: PropTypes.string.isRequired,
};

export default DeviceFilters;
