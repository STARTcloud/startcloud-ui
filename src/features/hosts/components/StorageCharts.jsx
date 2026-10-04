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

const ALL_CHARTS = ['summary', 'devices', 'pools', 'arc'];

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

const shownOf = ({ wanted, diskIo, poolIo, arc }) => ({
  summary: diskIo.offered && wanted.includes('summary'),
  devices: diskIo.offered && wanted.includes('devices'),
  pools: poolIo.offered && wanted.includes('pools'),
  arc: arc.offered && wanted.includes('arc'),
});

const empty = series => series.loaded && series.rows.length === 0;

const nothingOf = ({ shown, diskIo, poolIo, arc }) =>
  (!(shown.summary || shown.devices) || empty(diskIo)) &&
  (!shown.pools || empty(poolIo)) &&
  (!shown.arc || empty(arc));

const ChartActions = ({ shown, charts }) => {
  const { t } = useTranslation();
  return (
    <>
      {shown.devices ? <SortSelect order={charts.order} onChange={charts.setOrder} /> : null}
      {shown.devices || shown.pools ? (
        <SeriesToggles
          toggles={ioToggles(t)}
          visibility={charts.visibility}
          onToggle={charts.toggle}
        />
      ) : null}
    </>
  );
};

const ChartBodies = ({ shown, charts, diskIo, poolIo, arc, host, folds }) => {
  const { t } = useTranslation();
  const ioText = t(emptyKeyOf(diskIo));
  return (
    <>
      {shown.summary ? (
        <SummaryCharts
          devices={charts.devices}
          host={host}
          emptyText={ioText}
          single={samplesIn(diskIo.rows) === 1}
          folds={folds}
        />
      ) : null}
      {shown.devices ? (
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
      {shown.pools ? (
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
      {shown.arc ? (
        <ArcCharts
          rows={arc.rows}
          host={host}
          emptyText={t(emptyKeyOf(arc))}
          single={samplesIn(arc.rows) === 1}
          folds={folds}
        />
      ) : null}
      {nothingOf({ shown, diskIo, poolIo, arc }) ? (
        <p className="text-muted" data-note="storage-charts-empty">
          {t('host.storageCharts.noData')}
        </p>
      ) : null}
    </>
  );
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
 * Nothing draws while the host offers none of the three series. The
 * `charts` list names the groups one page draws, `summary`, `devices`,
 * `pools` and `arc`, all four by default: the Pools page asks for the
 * pool charts alone, the ARC page for the ARC charts, the Disks page
 * for the summary and the device charts; the sort select draws with the
 * device charts, the toggles with the device or the pool charts.
 */
const StorageCharts = ({ diskIo, poolIo, arc, host, folds, charts: wanted = ALL_CHARTS }) => {
  const { t } = useTranslation();
  const charts = useStorageCharts({ diskIo: diskIo.rows, poolIo: poolIo.rows });
  const shown = shownOf({ wanted, diskIo, poolIo, arc });
  if (!shown.summary && !shown.devices && !shown.pools && !shown.arc) {
    return null;
  }
  const folded = folds.folded(FOLD);
  return (
    <div data-panel="storage-charts" data-folded={folded}>
      <SectionHeading
        title={t('host.storageCharts.title')}
        actions={<ChartActions shown={shown} charts={charts} />}
        folded={folded}
        onFold={() => folds.toggle(FOLD)}
        foldTitle={t(folded ? 'host.storageCharts.expand' : 'host.storageCharts.collapse')}
      />
      {folded ? null : (
        <ChartBodies
          shown={shown}
          charts={charts}
          diskIo={diskIo}
          poolIo={poolIo}
          arc={arc}
          host={host}
          folds={folds}
        />
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

const poolSeriesShape = PropTypes.shape({
  rows: PropTypes.array.isRequired,
  latest: PropTypes.array.isRequired,
  loaded: PropTypes.bool.isRequired,
  failed: PropTypes.bool.isRequired,
  offered: PropTypes.bool.isRequired,
});

const shownShape = PropTypes.shape({
  summary: PropTypes.bool.isRequired,
  devices: PropTypes.bool.isRequired,
  pools: PropTypes.bool.isRequired,
  arc: PropTypes.bool.isRequired,
});

ChartActions.propTypes = {
  shown: shownShape.isRequired,
  charts: PropTypes.object.isRequired,
};

ChartBodies.propTypes = {
  shown: shownShape.isRequired,
  charts: PropTypes.object.isRequired,
  diskIo: seriesShape.isRequired,
  poolIo: poolSeriesShape.isRequired,
  arc: seriesShape.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

StorageCharts.propTypes = {
  diskIo: seriesShape.isRequired,
  poolIo: poolSeriesShape.isRequired,
  arc: seriesShape.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
  charts: PropTypes.arrayOf(PropTypes.oneOf(ALL_CHARTS)),
};

export default StorageCharts;
