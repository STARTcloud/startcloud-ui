import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { ioSpec } from '../utils/chartDefaults';

import NetworkingChartCard from './NetworkingChartCard';

/**
 * One chart a device, hyperweaver-ui's individual device charts, titled
 * by the device's own name, its three lines read, written and both in
 * the order the page's select names, the lines a person hid hidden in
 * every chart; the line under them counts the devices and names the
 * order.
 */
const DeviceCharts = ({ devices, names, order, visibility, host, emptyText, single, folds }) => {
  const { t } = useTranslation();
  if (names.length === 0) {
    return null;
  }
  return (
    <div data-panel="storage-device-charts">
      <SectionHeading title={t('hostCharts.deviceCharts.sectionTitle')} />
      <div className="row g-3 mb-2">
        {names.map(name => (
          <div key={name} className="col-12 col-lg-6 col-xxl-4">
            <NetworkingChartCard
              chart={`device:${name}`}
              title={t('host.expandedChartOptions.individualTitle', { id: name })}
              chartTitle={name}
              host={host}
              spec={ioSpec(devices[name], visibility, t)}
              emptyText={emptyText}
              single={single}
              folds={folds}
            />
          </div>
        ))}
      </div>
      <p className="small text-muted text-center mb-3" data-note="device-charts-order">
        {t('hosts.storage.deviceChartsNote', { count: names.length, order })}
      </p>
    </div>
  );
};

DeviceCharts.propTypes = {
  devices: PropTypes.object.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  order: PropTypes.string.isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool).isRequired,
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default DeviceCharts;
