import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useHostDevicesData } from '../hooks/useHostDevicesData';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { DEVICE_FILTERS, matchesDevice } from '../utils/DeviceUtils';
import { hostLabel, isServerRole } from '../utils/hosts';

import DeviceDetailsModal from './DeviceDetailsModal';
import DeviceFilters from './DeviceFilters';
import DeviceHeader from './DeviceHeader';
import DeviceInventoryTable, { DEVICE_COLUMNS } from './DeviceInventoryTable';
import DeviceSummary from './DeviceSummary';
import HostTabs from './HostTabs';
import PptDevicesTable from './PptDevicesTable';
import RefreshButton from './RefreshButton';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const FOLD_TITLES = {
  inventory: ['host.deviceInventoryTable.expand', 'host.deviceInventoryTable.collapse'],
  ppt: ['host.pptDevicesTable.expandSection', 'host.pptDevicesTable.collapseSection'],
};

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key];
  return { folded, onFold: () => folds.toggle(key), title: t(folded ? expand : collapse) };
};

/**
 * The devices page of a host that offers it, hyperweaver-ui's host
 * devices page in its order: the heading with Refresh, the tab row of
 * the host's pages, the device summary, the devices table narrowed by
 * the page's one search binding, its category, passthrough and driver
 * filter groups the three selects hyperweaver-ui drew, the export menu
 * in its heading, and the passthrough devices table, every fold kept
 * under the page's `table_prefs_devices`.
 */
const DevicesFrame = ({ id, server, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const folds = useFolds(`${context.prefsPrefix}_devices`);
  const data = useHostDevicesData(id, true);
  const [open, setOpen] = useState(null);
  const ctx = { ...context, t, language: i18n.language };
  const search = useDetailSearch({
    rows: data.devices,
    matches: matchesDevice,
    placeholderKey: 'hosts.devices.search',
    columns: DEVICE_COLUMNS,
    ctx,
    prefsKey: `${context.prefsPrefix}_devices`,
    filterGroups: DEVICE_FILTERS,
    defaultSort: NAME_SORT,
  });
  const label = labelOf({ status, server, id, stats });
  const title = t('host.deviceHeader.title');

  useEffect(() => {
    document.title = `${title} · ${label}`;
  }, [title, label]);

  const refresh = () => {
    refreshServers();
    refreshStats();
    data.refresh();
  };

  const discover = async () => {
    const failure = await data.discover();
    if (failure) {
      notify('danger', failure);
    }
  };

  const actions = (
    <>
      <DeviceFilters devices={search.rows} hostname={server.hostname || label} />
      <DeviceHeader onRefresh={refresh} />
    </>
  );

  return (
    <div className="list row" data-page="devices">
      <PageHeader title={title} subtitle={label} actions={actions} />
      <HostTabs id={id} />
      {data.failed ? (
        <div className="alert alert-danger" role="alert" data-note="devices-failed">
          {data.message}
        </div>
      ) : null}
      <DeviceSummary
        categories={data.categories}
        summary={data.summary}
        ppt={data.ppt}
        folds={folds}
      />
      <DeviceInventoryTable
        search={search}
        count={search.rows.length}
        busy={data.busy}
        loaded={data.loaded}
        fold={foldOf({ folds, key: 'inventory', t })}
        ctx={ctx}
        onDiscover={discover}
        onOpen={setOpen}
      />
      <PptDevicesTable
        devices={Array.isArray(data.ppt.ppt_devices) ? data.ppt.ppt_devices : []}
        fold={foldOf({ folds, key: 'ppt', t })}
        ctx={ctx}
        onOpen={setOpen}
      />
      {open ? <DeviceDetailsModal device={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};

DevicesFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
};

const UnknownHost = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
  };

  return (
    <div className="list row" data-page="devices-unknown">
      <PageHeader
        title={t('host.deviceHeader.title')}
        subtitle={labelOf({ status, server: null, id, stats })}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
    </div>
  );
};

UnknownHost.propTypes = {
  id: PropTypes.string.isRequired,
};

/**
 * The devices of one host at `/hosts/{id}/devices`, hyperweaver-ui's
 * host devices page, behind `devices`, hyperweaver-ui's gate of its
 * Devices tab checked strictly on the host's own row: a host that lists
 * it not draws the not-available stub and nothing is asked of it, and
 * an id the list of servers does not hold draws what the host page
 * draws for it. Its four reads are sent once as the page opens and
 * again on Refresh and after a discovery; nothing reads on a clock.
 */
const DevicesPage = ({ id, context }) => {
  const { t } = useTranslation();
  const { loaded: listed } = useServers();
  const server = useHostRow(id);

  if (!listed) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (!server) {
    return <UnknownHost id={id} />;
  }

  if (!hostHasFeature(server, 'devices')) {
    return <NotAvailableStub title={t('host.deviceHeader.title')} tokenLabel="devices" />;
  }

  return <DevicesFrame id={id} server={server} context={context} />;
};

DevicesPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default DevicesPage;
