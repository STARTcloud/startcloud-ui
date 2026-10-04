import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDatabase, FaHardDrive } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import { nextSort, sortItems } from '../../../utils/sort';
import { useHostReading } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { sectionOffered } from '../pages';
import { READS, hostOffers } from '../utils/monitoring';
import { interfaceCounts, latestPer } from '../utils/resources';

const DEFAULT_SORT = [{ column: 'link', direction: 'asc' }];

const NO_HIDDEN = new Set();

const stateWord = (row, ctx) => row.state || ctx.t('hosts.overview.unknown');

const columns = [
  {
    key: 'link',
    kind: 'name',
    labelKey: 'hosts.overview.interface',
    value: row => row.link,
    render: row => <strong>{row.link}</strong>,
  },
  {
    key: 'class',
    kind: 'word',
    labelKey: 'hosts.overview.class',
    value: (row, ctx) => row.class || ctx.t('hosts.overview.notAvailable'),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'hosts.machine.state',
    value: stateWord,
    render: (row, ctx) => (
      <span className={`badge ${row.state === 'up' ? 'text-bg-success' : 'text-bg-danger'}`}>
        {stateWord(row, ctx)}
      </span>
    ),
  },
];

const emptyKeyOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'pages.loading';
  }
  return failed ? 'hosts.overview.readError' : 'hosts.overview.noInterfaces';
};

const Interfaces = ({ id }) => {
  const { t, i18n } = useTranslation();
  const server = useHostRow(id);
  const { data, loaded, failed } = useHostReading(id, 'interfaces');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const ctx = useMemo(() => ({ t, language: i18n.language }), [t, i18n.language]);
  const rows = useMemo(() => latestPer(data?.interfaces, row => row.link), [data]);
  const counts = interfaceCounts(rows);
  return (
    <div data-panel="interfaces">
      <SectionHeading
        title={t('hosts.overview.interfaces')}
        count={rows.length > 0 ? t('hosts.overview.interfaceCounts', counts) : null}
        actions={
          sectionOffered('interfaces', server) ? (
            <Link
              to={`/hosts/${id}/network/interfaces`}
              className="btn btn-sm btn-outline-secondary"
              data-link="networking"
            >
              {t('host.networkStorageSummary.viewAll')}
            </Link>
          ) : null
        }
      />
      <SubTable
        columns={columns}
        rows={sortItems(rows, sort, columns, ctx)}
        rowKey={row => row.link}
        sort={sort}
        onSort={(column, options) => setSort(current => nextSort(current, column, options))}
        hiddenColumns={NO_HIDDEN}
        ctx={ctx}
        emptyText={t(emptyKeyOf({ loaded, failed }))}
      />
    </div>
  );
};

Interfaces.propTypes = {
  id: PropTypes.string.isRequired,
};

const Storage = ({ id }) => {
  const { t } = useTranslation();
  const pools = useHostReading(id, 'pools');
  const datasets = useHostReading(id, 'datasets');
  const poolRows = useMemo(() => latestPer(pools.data?.pools, row => row.pool), [pools.data]);
  const datasetRows = useMemo(
    () => latestPer(datasets.data?.datasets, row => row.name),
    [datasets.data]
  );
  const answered = Boolean(pools.data || datasets.data);
  const loaded = pools.loaded && datasets.loaded;
  return (
    <div data-panel="storage">
      <SectionHeading title={t('hosts.overview.storage')} />
      {answered ? (
        <div className="stat-grid stat-grid-2">
          <StatCard
            icon={<FaDatabase />}
            count={poolRows.length}
            label={t('hosts.overview.zfsPools')}
          />
          <StatCard
            icon={<FaHardDrive />}
            count={datasetRows.length}
            label={t('hosts.overview.datasets')}
          />
        </div>
      ) : (
        <p className="text-muted mb-0">
          {t(loaded ? 'hosts.overview.storageUnavailable' : 'pages.loading')}
        </p>
      )}
    </div>
  );
};

Storage.propTypes = {
  id: PropTypes.string.isRequired,
};

/**
 * The network and storage summary of the host page, two glass sections
 * side by side: the network interfaces behind `monitoring`, the newest
 * row of each interface in one table over Interface, Class and State,
 * the heading counting them, its View all linking to the host's
 * Interfaces page while the host's row offers it; and the storage
 * summary behind `monitoring` and `zfs`, the counts of ZFS pools and
 * datasets as two stat cards. Nothing draws on a host whose row does not
 * list `monitoring`.
 */
const NetworkStorageSummary = ({ id }) => {
  const server = useHostRow(id);
  if (!hostOffers(server, READS.interfaces.tokens)) {
    return null;
  }
  const storage = hostOffers(server, READS.pools.tokens);
  return (
    <div>
      <div className="row g-4 mb-3">
        <div className={storage ? 'col-12 col-lg-6' : 'col-12'}>
          <Interfaces id={id} />
        </div>
        {storage ? (
          <div className="col-12 col-lg-6">
            <Storage id={id} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

NetworkStorageSummary.propTypes = {
  id: PropTypes.string.isRequired,
};

export default NetworkStorageSummary;
