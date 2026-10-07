import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { chartOf } from '../charts/registry';
import { ioSpec } from '../utils/chartDefaults';

import ChartCard from './ChartCard';
import OneSampleNote from './OneSampleNote';

const TITLE_KEY = chartOf('disk-io').texts.titleKey;

/**
 * One chart a device, titled by the device's own name, its three lines
 * read, written and both in the order the page's select names, each a
 * `ChartCard` whose pills are the page's, so a line hidden in one is
 * hidden in every chart; the line under them counts the devices and
 * names the order.
 */
const DeviceCharts = ({
  devices,
  names,
  order,
  visibility,
  onToggle,
  host,
  emptyText,
  single,
  folds,
}) => {
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
            <ChartCard
              chart={`device:${name}`}
              metric="disk-io"
              title={t(TITLE_KEY, { id: name })}
              chartTitle={name}
              expandedTitle={t(TITLE_KEY, { id: name })}
              spec={ioSpec(devices[name], t)}
              visibility={visibility}
              onToggle={onToggle}
              emptyText={emptyText}
              host={host}
              folds={folds}
              fold={`chart-device:${name}`}
            >
              <OneSampleNote single={single} />
            </ChartCard>
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
  onToggle: PropTypes.func.isRequired,
  host: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  single: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default DeviceCharts;
