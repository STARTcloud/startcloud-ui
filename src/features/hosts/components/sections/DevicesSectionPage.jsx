import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../../hooks/useDetailSearch';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { useHostDevicesData } from '../../hooks/useHostDevicesData';
import { DEVICE_FILTERS, matchesDevice } from '../../utils/DeviceUtils';
import DeviceDetailsModal from '../DeviceDetailsModal';
import DeviceFilters from '../DeviceFilters';
import DeviceInventoryTable, { DEVICE_COLUMNS } from '../DeviceInventoryTable';
import DeviceSummary from '../DeviceSummary';
import PptDevicesTable from '../PptDevicesTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const FOLD_TITLES = {
  inventory: ['host.deviceInventoryTable.expand', 'host.deviceInventoryTable.collapse'],
  ppt: ['host.pptDevicesTable.expandSection', 'host.pptDevicesTable.collapseSection'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key];
  return { folded, onFold: () => folds.toggle(key), title: t(folded ? expand : collapse) };
};

/**
 * The Devices page of a host, hyperweaver-ui's host devices page as the
 * one body of its own page under the host's column: the heading counting
 * the devices the binding left, the export menu then Refresh in its
 * pane, and under it the device summary, the devices table narrowed by
 * the page's one search binding, its category, passthrough and driver
 * filter groups the three selects hyperweaver-ui drew, and the
 * passthrough devices table, every fold kept under the page's
 * `table_prefs_devices`. Its four reads are sent once as the page opens
 * and again on Refresh and after a discovery; nothing reads on a clock.
 */
const DevicesSectionPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
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

  const refresh = () => {
    onRefresh();
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
      <DeviceFilters devices={search.rows} hostname={host.hostname} />
      <RefreshButton onRefresh={refresh} />
    </>
  );

  return (
    <SectionPane
      section={section}
      server={server}
      count={data.loaded ? search.rows.length : null}
      actions={actions}
    >
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
    </SectionPane>
  );
};

DevicesSectionPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ hostname: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default DevicesSectionPage;
