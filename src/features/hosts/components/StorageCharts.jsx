import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { foldsShape } from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import SeriesToggles from '../../../components/common/SeriesToggles';
import { useStorageCharts } from '../hooks/useStorageCharts';
import { ioToggles } from '../utils/chartDefaults';
import { samplesIn } from '../utils/series';
import { STORAGE_CHART_SORTS } from '../utils/StorageUtils';

import ArcCharts from './ArcCharts';
import DeviceCharts from './DeviceCharts';
import PoolCharts from './PoolCharts';
import SummaryCharts from './SummaryCharts';

const FOLD = 'charts';

const emptyKeyOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.charts.loadError' : 'host.storageCharts.noData';
};

const SortSelect = ({ order, onChange }) => {
  const { t } = useTranslation();
  return (
    <Form.Select
      size="sm"
      className="w-auto"
      name="chart-sort"
      value={order}
      title={t('host.storageCharts.sortTitle')}
      aria-label={t('host.storageCharts.sortTitle')}
      onChange={event => onChange(event.target.value)}
    >
      {STORAGE_CHART_SORTS.map(entry => (
        <option key={entry.key} value={entry.key}>
          {t(entry.labelKey)}
        </option>
      ))}
    </Form.Select>
  );
};

SortSelect.propTypes = {
  order: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The storage charts of the storage page, hyperweaver-ui's section over
 * the series the host's context holds: one heading with its title, the
 * select that orders the device charts, the busiest first,
 * by name, or by the rate read or written, the buttons that show and
 * hide the read, the write and the total lines of the device and pool
 * charts, and the chevron that folds the whole section, the fold kept in
 * the page's preferences; under it the summary charts, one chart a
 * device, one chart a pool and the three ARC charts, and the line saying
 * there is nothing to draw while no device and no ARC sample is held.
 * Nothing draws while the host offers none of the three series.
 */
const StorageCharts = ({ diskIo, poolIo, arc, host, folds }) => {
  const { t } = useTranslation();
  const charts = useStorageCharts({ diskIo: diskIo.rows, poolIo: poolIo.rows });
  if (!diskIo.offered && !poolIo.offered && !arc.offered) {
    return null;
  }
  const folded = folds.folded(FOLD);
  const ioText = t(emptyKeyOf(diskIo));
  const nothing = diskIo.loaded && diskIo.rows.length === 0 && arc.loaded && arc.rows.length === 0;
  const actions = (
    <>
      <SortSelect order={charts.order} onChange={charts.setOrder} />
      <SeriesToggles
        toggles={ioToggles(t)}
        visibility={charts.visibility}
        onToggle={charts.toggle}
      />
    </>
  );
  return (
    <div data-panel="storage-charts" data-folded={folded}>
      <SectionHeading
        title={t('host.storageCharts.title')}
        actions={actions}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.storageCharts.expand' : 'host.storageCharts.collapse')}
      />
      {folded ? null : (
        <>
          {diskIo.offered ? (
            <SummaryCharts
              devices={charts.devices}
              host={host}
              emptyText={ioText}
              single={samplesIn(diskIo.rows) === 1}
              folds={folds}
            />
          ) : null}
          {diskIo.offered ? (
            <DeviceCharts
              devices={charts.devices}
              names={charts.names}
              order={charts.order}
              visibility={charts.visibility}
              host={host}
              emptyText={ioText}
              single={samplesIn(diskIo.rows) === 1}
              folds={folds}
            />
          ) : null}
          {poolIo.offered ? (
            <PoolCharts
              pools={charts.pools}
              latest={poolIo.latest}
              visibility={charts.visibility}
              host={host}
              emptyText={t(emptyKeyOf(poolIo))}
              single={samplesIn(poolIo.rows) === 1}
              folds={folds}
            />
          ) : null}
          {arc.offered ? (
            <ArcCharts
              rows={arc.rows}
              host={host}
              emptyText={t(emptyKeyOf(arc))}
              single={samplesIn(arc.rows) === 1}
              folds={folds}
            />
          ) : null}
          {nothing ? (
            <p className="text-muted" data-note="storage-charts-empty">
              {t('host.storageCharts.noData')}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};

const seriesShape = PropTypes.shape({
  rows: PropTypes.array.isRequired,
  loaded: PropTypes.bool.isRequired,
  failed: PropTypes.bool.isRequired,
  offered: PropTypes.bool.isRequired,
});

StorageCharts.propTypes = {
  diskIo: seriesShape.isRequired,
  poolIo: PropTypes.shape({
    rows: PropTypes.array.isRequired,
    latest: PropTypes.array.isRequired,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    offered: PropTypes.bool.isRequired,
  }).isRequired,
  arc: seriesShape.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

export default StorageCharts;
