import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaHardDrive, FaMemory, FaMicrochip } from 'react-icons/fa6';

import { formatFileSize } from '../../../utils/formatFileSize';
import { useHostReading } from '../hooks/useHostReadings';
import { useHostSeries } from '../hooks/useHostSeries';
import {
  NO_CPU,
  arcShare,
  coreCount,
  cpuStep,
  cpuUsage,
  memoryUsage,
  swapUsage,
} from '../utils/resources';
import { latestOf } from '../utils/series';

import UsageBar from './UsageBar';

const cpuSegments = percent => [{ key: 'cpu', percent: percent ?? 0, tone: 'info' }];

const memorySegments = ({ memory, arc, t }) => [
  { key: 'used', percent: memory ? memory.percent - arc : 0, tone: 'warning' },
  ...(arc > 0
    ? [{ key: 'arc', percent: arc, tone: 'success', title: t('hosts.overview.zfsArc') }]
    : []),
];

const memorySummary = ({ memory, arc, arcBytes, t }) =>
  t('hosts.overview.memorySummary', {
    total: memory ? formatFileSize(memory.total) : t('hosts.overview.notAvailable'),
    arc: arc > 0 ? t('hosts.overview.arcSegment', { arc: formatFileSize(arcBytes) }) : '',
  });

const swapSummary = (swap, t) =>
  t('hosts.overview.swapSummary', {
    total: formatFileSize(swap.total),
    used: formatFileSize(swap.used),
    free: formatFileSize(swap.free),
  });

/**
 * The resource utilization of one host, the trailing column of the host
 * overview, three bars: the processor, the newest CPU sample's use
 * where the host's series holds one and the share between two readings
 * of the host's stats otherwise, not available until a second reading
 * came, with the count of its cores; the memory, used of the total, the
 * ZFS ARC drawn as a second segment of the same bar where the host
 * answers one; and the swap, behind `swap`, for a host that has any.
 * The bars follow the samples the `monitoring` topic pushes and the
 * stats the `hosts` topic pushes, and nothing samples again on a clock,
 * hyperweaver-ui's second reading three seconds after the first not
 * carried over.
 */
const ResourceUtilization = ({ id, stats }) => {
  const { t } = useTranslation();
  const [held, setHeld] = useState(NO_CPU);
  const cpuRows = useHostSeries(id, 'cpu').rows;
  const memoryRows = useHostSeries(id, 'memory').rows;
  const arcRows = useHostSeries(id, 'arc').rows;
  const swapAnswer = useHostReading(id, 'swap');

  if (held.id !== id || held.stats !== stats) {
    setHeld(cpuStep(held, id, stats));
  }

  const sample = latestOf(memoryRows);
  const cpu = cpuUsage({ sample: latestOf(cpuRows), held: held.percent });
  const memory = memoryUsage({ stats, sample });
  const arcBytes = Number(latestOf(arcRows)?.arc_size) || 0;
  const arc = arcShare(memory, arcBytes);
  const swap = swapAnswer.offered ? swapUsage({ summary: swapAnswer.data, sample }) : null;
  const cores = coreCount(stats) || t('hosts.overview.notAvailable');

  return (
    <div data-panel="resources">
      <h6 className="mb-3">{t('hosts.overview.resources')}</h6>
      <UsageBar
        name="cpu"
        icon={<FaMicrochip />}
        label={t('hosts.overview.cpuUsage')}
        summary={t('hosts.overview.cores', { cores })}
        percent={cpu}
        segments={cpuSegments(cpu)}
      />
      <UsageBar
        name="memory"
        icon={<FaMemory />}
        label={t('hosts.overview.memoryUsage')}
        summary={memorySummary({ memory, arc, arcBytes, t })}
        percent={memory ? memory.percent : null}
        segments={memorySegments({ memory, arc, t })}
      />
      {swap ? (
        <UsageBar
          name="swap"
          icon={<FaHardDrive />}
          label={t('hosts.overview.swapUsage')}
          summary={swapSummary(swap, t)}
          percent={swap.percent}
          segments={[{ key: 'swap', percent: swap.percent, tone: 'info' }]}
        />
      ) : null}
    </div>
  );
};

ResourceUtilization.propTypes = {
  id: PropTypes.string.isRequired,
  stats: PropTypes.object.isRequired,
};

export default ResourceUtilization;
