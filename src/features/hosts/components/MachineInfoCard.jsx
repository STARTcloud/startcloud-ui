import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useStatus } from '../../../contexts/StatusContext';
import { useHostReading } from '../hooks/useHostReadings';
import { isServerRole } from '../utils/hosts';
import {
  configurationOf,
  guestSourceKey,
  organizationsOf,
  statusTone,
  zoneFacts,
} from '../utils/machines';
import { healthTone } from '../utils/resources';
import { formatTaskDate } from '../utils/tasks';

const FOLD = 'machine-info';

const hostPath = id => `/hosts/${id}`;

const stateOf = ({ detail, machine, running }) =>
  String(
    detail?.machine_info?.status || machine?.status || (running ? 'running' : 'stopped')
  ).toLowerCase();

const Badge = ({ tone = 'secondary', title = undefined, children }) => (
  <span className={`badge text-bg-${tone}`} title={title}>
    {children}
  </span>
);

Badge.propTypes = {
  tone: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const identityRows = ({ id, name, host, state, t }) => [
  { key: 'name', label: t('hosts.page.name'), value: name },
  { key: 'host', label: t('hosts.machine.host'), value: <Link to={hostPath(id)}>{host}</Link> },
  {
    key: 'state',
    label: t('hosts.machine.state'),
    value: (
      <span
        className={`fw-semibold text-capitalize text-${statusTone(state)}`}
        data-machine-state={state}
      >
        {state}
      </span>
    ),
  },
];

const originRows = (info, t) => [
  ...(info.hypervisor
    ? [
        {
          key: 'hypervisor',
          label: t('hosts.machines.info.hypervisor'),
          value: <Badge>{info.hypervisor}</Badge>,
        },
      ]
    : []),
  ...(info.backing
    ? [
        {
          key: 'backing',
          label: t('hosts.machines.info.backing'),
          value: (
            <>
              <Badge title={t('hosts.machines.info.backingTitle')}>{info.backing}</Badge>
              {info.home ? (
                <code className="small ms-2" title={t('hosts.machines.info.homeTitle')}>
                  {info.home}
                </code>
              ) : null}
            </>
          ),
        },
      ]
    : []),
];

const HealthValue = ({ health }) => {
  const { t } = useTranslation();
  const network = Number(health.networkErrors) || 0;
  const storage = Number(health.storageErrors) || 0;
  return (
    <>
      <span className={`fw-semibold text-capitalize text-${healthTone(health.status)}`}>
        {health.status}
      </span>
      {network + storage > 0 ? (
        <span className="d-flex flex-wrap gap-1 mt-1">
          {network > 0 ? (
            <Badge tone="warning">
              {t('hosts.machines.info.networkErrors', { count: network })}
            </Badge>
          ) : null}
          {storage > 0 ? (
            <Badge tone="warning">
              {t('hosts.machines.info.storageErrors', { count: storage })}
            </Badge>
          ) : null}
        </span>
      ) : null}
    </>
  );
};

HealthValue.propTypes = {
  health: PropTypes.shape({
    status: PropTypes.string.isRequired,
    networkErrors: PropTypes.number,
    storageErrors: PropTypes.number,
  }).isRequired,
};

const healthRows = (health, t) =>
  health?.status
    ? [
        {
          key: 'health',
          label: t('hosts.machines.info.hostHealth'),
          value: <HealthValue health={health} />,
        },
      ]
    : [];

const seenRows = (detail, t) =>
  detail
    ? [
        {
          key: 'last-seen',
          label: t('hosts.machines.info.lastSeen'),
          value: (
            <span className="text-muted">
              {detail.machine_info?.last_seen
                ? formatTaskDate(detail.machine_info.last_seen)
                : t('hosts.overview.notAvailable')}
            </span>
          ),
        },
      ]
    : [];

const guestRows = (guest, t) => {
  const ips = Array.isArray(guest?.ips) ? guest.ips : [];
  if (ips.length === 0) {
    return [];
  }
  return [
    {
      key: 'guest-ip',
      label: t('hosts.machines.info.guestIp'),
      value: (
        <>
          {ips.map(ip => (
            <code key={ip} className="small me-2">
              {ip}
            </code>
          ))}
          <span className="text-muted small">
            {t('hosts.machines.guest.via', { source: t(guestSourceKey(guest.source)) })}
          </span>
        </>
      ),
    },
  ];
};

const flagRows = (info, t) =>
  info.is_orphaned || info.auto_discovered
    ? [
        {
          key: 'flags',
          label: t('hosts.machines.column.flags'),
          value: (
            <span className="d-flex flex-wrap gap-1">
              {info.is_orphaned ? (
                <Badge tone="warning">{t('hosts.machines.flag.orphaned')}</Badge>
              ) : null}
              {info.auto_discovered ? (
                <Badge tone="info">{t('hosts.machines.flag.autoDiscovered')}</Badge>
              ) : null}
            </span>
          ),
        },
      ]
    : [];

const organizationRows = (names, t) =>
  names
    ? [
        {
          key: 'organizations',
          label: t('hosts.machines.info.organizations'),
          value:
            names.length > 0 ? (
              <span className="d-flex flex-wrap gap-1" data-machine-organizations={names.length}>
                {names.map(name => (
                  <Badge key={name}>{name}</Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted" data-machine-organizations="0">
                {t('hosts.machines.info.unassigned')}
              </span>
            ),
        },
      ]
    : [];

const factRows = (configuration, t) =>
  zoneFacts(configuration).map(fact => ({
    key: fact.key,
    label: t(fact.labelKey),
    value:
      fact.kind === 'code' ? (
        <code className="small">{fact.value}</code>
      ) : (
        <Badge>{fact.value}</Badge>
      ),
  }));

/**
 * The machine information of the machine page, hyperweaver-ui's first
 * card, a section card that folds under `machine-info`, as record rows:
 * the name, the host as a link to its page and the state, the detail's
 * own word in its tone, the machine row's while the detail has not
 * answered and running or stopped from the host's stats while neither
 * has; then, each only while the agent answers it, the hypervisor and
 * the backing with the project folder a vagrant machine lives in, which
 * hyperweaver-agent answers and zoneweaver-agent does not; the host's
 * health behind `monitoring` with its network and storage error counts;
 * when the machine was last seen; the guest's addresses with the source
 * that reported them; the orphaned and auto-discovered flags; on the
 * `hyperweaver-server` role the organizations the machine belongs to,
 * by the name of the person's membership and by uuid otherwise; and the
 * facts of a zone, which zoneweaver-agent answers alone.
 */
const MachineInfoCard = ({
  id,
  name,
  host,
  machine = null,
  detail = null,
  running,
  organizations,
  folds,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const health = useHostReading(id, 'monitoring-health');
  const info = detail?.machine_info || machine || {};
  const configuration = configurationOf(detail);
  const state = stateOf({ detail, machine, running });
  const names = isServerRole(status) ? organizationsOf(machine, organizations) : null;

  return (
    <div className="col-12 col-lg-6" data-panel="machine-info">
      <SectionCard
        title={t('hosts.machines.info.title')}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        <RecordRows
          className="mb-0"
          rows={[
            ...identityRows({ id, name, host, state, t }),
            ...originRows(info, t),
            ...healthRows(health.data, t),
            ...seenRows(detail, t),
            ...guestRows(configuration.guest_info, t),
            ...flagRows(info, t),
            ...organizationRows(names, t),
            ...factRows(configuration, t),
          ]}
        />
      </SectionCard>
    </div>
  );
};

MachineInfoCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  machine: PropTypes.object,
  detail: PropTypes.object,
  running: PropTypes.bool.isRequired,
  organizations: PropTypes.arrayOf(PropTypes.object).isRequired,
  folds: foldsShape.isRequired,
};

export default MachineInfoCard;
