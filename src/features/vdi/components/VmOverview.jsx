import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaTriangleExclamation } from 'react-icons/fa6';

import { formatRelativeTime } from '../../../utils/relativeTime';
import { vmStaleInfo } from '../utils/vmStatus';

import CacheBadge from './CacheBadge';

const formatUptime = (seconds, t) => {
  if (!seconds) {
    return '—';
  }
  if (seconds >= 86400) {
    return t('vdi.duration.daysHours', {
      days: Math.floor(seconds / 86400),
      hours: Math.round((seconds % 86400) / 3600),
    });
  }
  if (seconds >= 3600) {
    return t('vdi.duration.hours', { hours: Math.round(seconds / 3600) });
  }
  return t('vdi.duration.minutes', { minutes: Math.round(seconds / 60) });
};

const timingClass = value => {
  if (value < 100) {
    return 'bg-success';
  }
  return value < 1000 ? 'bg-warning' : 'bg-danger';
};

const Facts = ({ title, rows }) => (
  <div className="card h-100">
    <div className="card-header">
      <h5 className="mb-0">{title}</h5>
    </div>
    <div className="card-body">
      <dl className="mb-0">
        {rows.map(row => (
          <div className="row mb-1" key={row.key}>
            <dt className="col-sm-5">{row.label}</dt>
            <dd className="col-sm-7 mb-1">{row.content}</dd>
          </div>
        ))}
      </dl>
    </div>
  </div>
);

Facts.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      content: PropTypes.node,
    })
  ).isRequired,
};

const AgentCheckin = ({ label, iso, stale, language }) => {
  const { t } = useTranslation();
  if (!iso) {
    return (
      <span className="text-body-tertiary">
        {label}: — {t('vdi.overview.never')}
      </span>
    );
  }
  return (
    <span className={stale ? 'text-danger' : 'text-success'}>
      {label}: {stale ? <FaTriangleExclamation aria-hidden /> : <FaCheck aria-hidden />}{' '}
      {formatRelativeTime(iso, language)}
    </span>
  );
};

AgentCheckin.propTypes = {
  label: PropTypes.string.isRequired,
  iso: PropTypes.string,
  stale: PropTypes.bool.isRequired,
  language: PropTypes.string.isRequired,
};

const systemRows = ({ vm, now, t, language }) => {
  const stale = vmStaleInfo(vm, now);
  const rows = [
    { key: 'uuid', content: <code className="checksum">{vm.instance_id || '—'}</code> },
    { key: 'os', content: vm.os_version || '—' },
    { key: 'uptime', content: formatUptime(vm.uptime_seconds, t) },
    {
      key: 'lastBoot',
      content: vm.last_boot_time ? new Date(vm.last_boot_time).toLocaleString(language) : '—',
    },
    { key: 'ip', content: vm.ip_address || '—' },
    { key: 'mac', content: vm.mac_address || '—' },
    { key: 'userAgent', content: vm.agent_version ? `v${vm.agent_version}` : '—' },
    {
      key: 'startupAgent',
      content: vm.startup_agent_version ? `v${vm.startup_agent_version}` : '—',
    },
    {
      key: 'checkins',
      content: (
        <span className="d-flex flex-column">
          <AgentCheckin
            label={t('vdi.overview.userAgentShort')}
            iso={vm.last_user_checkin}
            stale={stale.userStale}
            language={language}
          />
          <AgentCheckin
            label={t('vdi.overview.startupAgentShort')}
            iso={vm.last_startup_checkin}
            stale={stale.startupStale}
            language={language}
          />
        </span>
      ),
    },
    { key: 'desktop', content: vm.desktop?.user_desktop_path || t('vdi.overview.localDesktop') },
  ];
  if (vm.user?.display_name) {
    rows.push({ key: 'fullName', content: vm.user.display_name });
  }
  return rows.map(row => ({ ...row, label: t(`vdi.overview.${row.key}`) }));
};

const publicationContent = ({ vm, pools, t }) => {
  const revision = pools[vm.uds.pool_name]?.current_pub_revision || '?';
  return (
    <>
      {revision}{' '}
      {vm.uds.stale_image ? (
        <span className="text-danger">
          <FaTriangleExclamation aria-hidden /> {t('vdi.publication.staleImage')}
        </span>
      ) : (
        <span className="text-success">
          <FaCheck aria-hidden /> {t('vdi.publication.current')}
        </span>
      )}
    </>
  );
};

const udsRows = ({ vm, pools, t }) => {
  const { uds } = vm;
  const rows = [];
  if (uds.pool_name) {
    rows.push({ key: 'pool', content: uds.pool_name });
  }
  rows.push({ key: 'status', content: <CacheBadge uds={uds} /> });
  if (uds.publication_id !== null && uds.publication_id !== undefined) {
    rows.push({ key: 'publication', content: publicationContent({ vm, pools, t }) });
  }
  if (uds.client_ip) {
    rows.push({ key: 'clientIp', content: uds.client_ip });
  }
  if (uds.client_host && uds.client_host !== uds.client_ip) {
    rows.push({ key: 'clientHost', content: uds.client_host });
  }
  if (uds.uds_username) {
    rows.push({ key: 'udsUser', content: uds.uds_username });
  }
  return rows.map(row => ({ ...row, label: t(`vdi.overview.${row.key}`) }));
};

const timingRows = (timings, t) => {
  const rows = Object.entries(timings)
    .filter(([key, value]) => key !== 'server_post' && value !== null && value !== undefined)
    .map(([key, value]) => ({
      key,
      label: key,
      content: (
        <>
          <span
            className={`timing-bar ${timingClass(value)}`}
            style={{ width: `${Math.min(Math.max(value / 50, 2), 200)}px` }}
          />
          {value}ms
        </>
      ),
    }));
  return rows.length > 0
    ? rows
    : [{ key: 'none', label: '', content: t('vdi.overview.noTimings') }];
};

/**
 * The Overview of one VM: the System facts (machine UUID, OS, uptime,
 * last boot, IP, MAC, the two agent versions, each agent's last check-in
 * with its stale mark, the desktop path and the full name), the UDS Pool
 * facts when the VM has UDS data (pool, cache state, publication against
 * the pool's current revision, client IP and host, UDS user), and the
 * check-in timings as bars.
 */
const VmOverview = ({ vm, pools, now }) => {
  const { t, i18n } = useTranslation();
  const { language } = i18n;
  const hasUds = Boolean(vm.uds) && Object.keys(vm.uds).length > 0;
  return (
    <div className="row g-3">
      <div className={hasUds ? 'col-lg-4' : 'col-lg-6'}>
        <Facts title={t('vdi.overview.system')} rows={systemRows({ vm, now, t, language })} />
      </div>
      {hasUds ? (
        <div className="col-lg-4">
          <Facts title={t('vdi.overview.udsPool')} rows={udsRows({ vm, pools, t })} />
        </div>
      ) : null}
      <div className={hasUds ? 'col-lg-4' : 'col-lg-6'}>
        <Facts title={t('vdi.overview.timings')} rows={timingRows(vm.timings_ms || {}, t)} />
      </div>
    </div>
  );
};

VmOverview.propTypes = {
  vm: PropTypes.object.isRequired,
  pools: PropTypes.object.isRequired,
  now: PropTypes.number.isRequired,
};

export default VmOverview;
