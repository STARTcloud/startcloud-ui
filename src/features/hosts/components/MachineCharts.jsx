import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useHostRow } from '../hooks/useHostRow';
import { useMachineSeries } from '../hooks/useMachineSeries';
import {
  diskSpec,
  linkSpec,
  machineCpuSpec,
  machineDiskSpec,
  machineMemorySpec,
  machineNetworkSpec,
  zoneCpuSpec,
  zoneMemorySpec,
} from '../utils/machineChartSpecs';
import { configurationOf, zoneHardware } from '../utils/machines';
import {
  diskDevices,
  linkMetric,
  machineUsageLatest,
  zoneLinks,
  zoneUsageLatest,
} from '../utils/machineSeries';
import { machineChartGates } from '../utils/machineTools';
import { samplesIn } from '../utils/series';

import MachineChartCard from './MachineChartCard';

const ADDITIONS_FOLD = 'machine-chart-memory';

const ZONE_WAIT = 'machine.machineResourceCharts.waitingForSamples';

const MACHINE_WAIT = 'machine.vboxResourceCharts.waitingForSample';

const stateOf = series => ({
  samples: samplesIn(series.rows),
  loaded: series.loaded,
  failed: series.failed,
  message: series.message,
});

const Badge = ({ text, title = '', tone = 'text-bg-light border' }) => (
  <span className={`badge ${tone}`} title={title || undefined}>
    {text}
  </span>
);

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  title: PropTypes.string,
  tone: PropTypes.string,
};

const DeviceBadges = ({ device }) => {
  const { t } = useTranslation();
  return (
    <>
      {device.pool ? (
        <Badge
          text={device.pool}
          title={t('machine.machineResourceCharts.arrayTooltip')}
          tone="text-bg-secondary"
        />
      ) : null}
      {device.readIops === null ? null : (
        <Badge
          text={t('hosts.machineCharts.readOps', { value: device.readIops })}
          title={t('machine.machineResourceCharts.readIopsTooltip')}
        />
      )}
      {device.writeIops === null ? null : (
        <Badge
          text={t('hosts.machineCharts.writeOps', { value: device.writeIops })}
          title={t('machine.machineResourceCharts.writeIopsTooltip')}
        />
      )}
    </>
  );
};

DeviceBadges.propTypes = {
  device: PropTypes.shape({
    pool: PropTypes.string.isRequired,
    readIops: PropTypes.number,
    writeIops: PropTypes.number,
  }).isRequired,
};

const LinkChart = ({ id, name, link, host, folds }) => {
  const { t } = useTranslation();
  const series = useMachineSeries({ id, name, metric: linkMetric(link), wanted: true });
  const spec = useMemo(() => linkSpec({ rows: series.rows, t }), [series.rows, t]);
  if (series.rows.length === 0 && !series.failed) {
    return null;
  }
  return (
    <MachineChartCard
      chart={linkMetric(link)}
      title={t('machine.machineResourceCharts.networkTitle', { link })}
      spec={spec}
      state={stateOf(series)}
      waitKey={ZONE_WAIT}
      failKey="machine.machineResourceCharts.networkFailed"
      host={host}
      folds={folds}
      onRefresh={series.refresh}
    />
  );
};

LinkChart.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

const ZoneCharts = ({ id, name, host, detail, folds }) => {
  const { t } = useTranslation();
  const usage = useMachineSeries({ id, name, metric: 'zone-usage', wanted: true });
  const disk = useMachineSeries({ id, name, metric: 'zone-diskio', wanted: true });
  const cpu = useMemo(() => zoneCpuSpec({ rows: usage.rows, t }), [usage.rows, t]);
  const memory = useMemo(() => zoneMemorySpec({ rows: usage.rows, t }), [usage.rows, t]);
  const devices = useMemo(() => diskDevices(disk.rows), [disk.rows]);
  const latest = zoneUsageLatest(usage.rows);
  const shared = { host, folds, waitKey: ZONE_WAIT };
  const used = {
    state: stateOf(usage),
    failKey: 'machine.machineResourceCharts.cpuMemoryFailed',
    onRefresh: usage.refresh,
  };

  const cpuBadge =
    latest.cpu === null ? null : (
      <Badge
        text={t('machine.machineResourceCharts.pctOfHost', { value: latest.cpu.toFixed(1) })}
        title={t('machine.machineResourceCharts.latestTooltip')}
      />
    );
  const memoryBadge =
    latest.resident === null ? null : (
      <Badge
        text={t('hosts.machineCharts.gigabytes', { value: latest.resident.toFixed(2) })}
        title={t('machine.machineResourceCharts.latestResidentTooltip')}
      />
    );

  return (
    <>
      <MachineChartCard
        chart="cpu"
        title={t('machine.machineResourceCharts.cpuTitle')}
        badges={cpuBadge}
        spec={cpu}
        {...used}
        {...shared}
      />
      <MachineChartCard
        chart="memory"
        title={t('machine.machineResourceCharts.memoryTitle')}
        badges={memoryBadge}
        spec={memory}
        {...used}
        {...shared}
      />
      {disk.failed && devices.length === 0 ? (
        <div className="col-12" data-note="disk-failed">
          <div className="alert alert-danger mb-0" role="alert">
            {t('machine.machineResourceCharts.diskIoFailed', { message: disk.message })}
          </div>
        </div>
      ) : null}
      {devices.map(device => (
        <MachineChartCard
          key={device.dataset}
          chart={`disk:${device.dataset}`}
          title={t('machine.machineResourceCharts.diskTitle', { device: device.device })}
          subtitle={device.dataset}
          badges={<DeviceBadges device={device} />}
          spec={diskSpec({ device, t })}
          state={stateOf(disk)}
          failKey="machine.machineResourceCharts.diskIoFailed"
          onRefresh={disk.refresh}
          {...shared}
        />
      ))}
      {zoneLinks(zoneHardware(configurationOf(detail))).map(link => (
        <LinkChart key={link} id={id} name={name} link={link} host={host} folds={folds} />
      ))}
    </>
  );
};

ZoneCharts.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

const AdditionsNote = ({ folds }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-chart="memory">
      <SectionCard
        title={t('machine.vboxResourceCharts.memoryTitle')}
        className="mb-0 h-100"
        folded={folds.folded(ADDITIONS_FOLD)}
        onFold={() => folds.toggle(ADDITIONS_FOLD)}
      >
        <div className="alert alert-info mb-0" role="status" data-note="guest-additions">
          {t('machine.vboxResourceCharts.additionsRequiredNote')}
        </div>
      </SectionCard>
    </div>
  );
};

AdditionsNote.propTypes = {
  folds: foldsShape.isRequired,
};

const UsageCharts = ({ id, name, host, folds }) => {
  const { t } = useTranslation();
  const usage = useMachineSeries({ id, name, metric: 'machine-usage', wanted: true });
  const specs = useMemo(
    () => ({
      cpu: machineCpuSpec({ rows: usage.rows, t }),
      memory: machineMemorySpec({ rows: usage.rows, t }),
      network: machineNetworkSpec({ rows: usage.rows, t }),
      disk: machineDiskSpec({ rows: usage.rows, t }),
    }),
    [usage.rows, t]
  );
  const latest = machineUsageLatest(usage.rows);
  const shared = {
    state: stateOf(usage),
    waitKey: MACHINE_WAIT,
    failKey: 'machine.vboxResourceCharts.metricsFailed',
    host,
    folds,
    onRefresh: usage.refresh,
  };

  const cpuBadge =
    latest.cpu === null ? null : (
      <Badge
        text={t('machine.vboxResourceCharts.pctOfHost', { value: latest.cpu.toFixed(1) })}
        title={t('machine.vboxResourceCharts.cpuTooltip')}
      />
    );
  const memoryBadge =
    latest.memoryTotal === null ? null : (
      <Badge
        text={t('machine.vboxResourceCharts.ofTotalGb', { value: latest.memoryTotal.toFixed(1) })}
        title={t('machine.vboxResourceCharts.ramTotalTooltip')}
      />
    );
  const networkBadge =
    latest.netRx === null || latest.netTx === null ? null : (
      <Badge
        text={t('hosts.machineCharts.receivedSent', {
          rx: latest.netRx.toFixed(2),
          tx: latest.netTx.toFixed(2),
        })}
        title={t('machine.vboxResourceCharts.rxTxTooltip')}
      />
    );

  return (
    <>
      <MachineChartCard
        chart="cpu"
        title={t('machine.vboxResourceCharts.cpuTitle')}
        badges={cpuBadge}
        spec={specs.cpu}
        {...shared}
      />
      {latest.additions ? (
        <MachineChartCard
          chart="memory"
          title={t('machine.vboxResourceCharts.memoryTitle')}
          badges={memoryBadge}
          spec={specs.memory}
          {...shared}
        />
      ) : (
        <AdditionsNote folds={folds} />
      )}
      <MachineChartCard
        chart="network"
        title={t('machine.vboxResourceCharts.networkTitle')}
        badges={networkBadge}
        spec={specs.network}
        {...shared}
      />
      <MachineChartCard
        chart="disk"
        title={t('machine.vboxResourceCharts.diskTitle')}
        spec={specs.disk}
        {...shared}
      />
    </>
  );
};

UsageCharts.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

/**
 * The charts of one machine on its page, hyperweaver-ui's resource
 * charts, each a card of `MachineChartCard` in the grid the page's cards
 * share, all behind `monitoring` and each family on the hypervisor whose
 * agent answers it (`machineChartGates`). Of a zone, on a host that
 * names `bhyve`: its share of the host's processors and its resident
 * memory and swap, from one read of its usage; the megabytes a second
 * read and written of each of its volumes, one card a volume and never
 * summed, because the volumes of one machine may sit on different
 * pools, the volume's dataset after the card's title and the pool and
 * the operations a second as its badges, a rate the agent answers null
 * adding no point; and the megabits a second of each link its
 * configuration names, one card a link, which grows by the samples the
 * `monitoring` topic pushes, a link that holds no sample drawing
 * nothing. Of a VirtualBox machine that runs, never one on UTM: the
 * guest's and the monitor's share of the processors, the memory used,
 * the megabytes a second over its adapters and over its disks, from one
 * read of the one sample the agent takes; while the guest additions do
 * not answer the memory card says they are needed in the chart's place.
 * Every series is read over the last fifteen minutes once as its card
 * draws, again on the page's Refresh, on the card's own and when the
 * event stream opens fresh, and never on a clock; what is held of it is
 * the fifteen minutes before its newest sample, the window rolling as
 * the series grows. A read that failed draws the agent's own message in
 * hyperweaver-ui's sentence, under the chart it failed for, and in the
 * volumes' place while no volume is held. hyperweaver-ui read each
 * series every thirty seconds, and that clock is not carried over.
 */
const MachineCharts = ({ id, name, host, detail, running, folds }) => {
  const server = useHostRow(id);
  const gates = machineChartGates({ server, machine: detail.machine_info, running });
  if (gates.zone) {
    return <ZoneCharts id={id} name={name} host={host} detail={detail} folds={folds} />;
  }
  return gates.machine ? <UsageCharts id={id} name={name} host={host} folds={folds} /> : null;
};

MachineCharts.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  running: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineCharts;
