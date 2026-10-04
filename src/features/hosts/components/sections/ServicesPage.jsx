import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { useHostMachines } from '../../hooks/useHostMachines';
import { useHostManageData } from '../../hooks/useHostManageData';
import {
  manageParamGroups,
  tableOf,
  useHostManageSearch,
  zonesOf,
} from '../../hooks/useHostManageSearch';
import { hostHasFeature, hostHasHypervisor } from '../../utils/capabilities';
import { matchesService } from '../../utils/manage';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import ServiceManagement from '../ServiceManagement';
import { SERVICE_COLUMNS, SERVICE_FILTERS } from '../ServiceTable';

const NO_USERS = [];

/**
 * The Services page of a host: the heading counting the services the
 * search leaves, Refresh in its pane, and `ServiceManagement` under it,
 * the services read once for this page, the zone and disabled-services
 * filters in the navbar's panel.
 */
const ServicesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: ['services'] });
  const { machines } = useHostMachines(id, hostHasFeature(server, 'machines'));
  const zones = useMemo(() => zonesOf(machines), [machines]);
  const groups = manageParamGroups({
    params: data.params,
    setParam: data.setParam,
    resetParams: data.resetParams,
    zones,
    users: NO_USERS,
    bhyve: hostHasHypervisor(server, 'bhyve'),
    t,
  });
  const ctx = { ...context, t, language: i18n.language, id, server, zones };
  const search = useHostManageSearch({
    section,
    tables: {
      services: tableOf({
        key: 'services',
        labelKey: 'pages.hostManage.tabServices',
        rows: data.rows.services,
        columns: SERVICE_COLUMNS,
        matches: matchesService,
        filterGroups: SERVICE_FILTERS,
        paramGroups: groups.services,
        sort: 'service',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.services.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ServiceManagement
        id={id}
        ctx={ctx}
        table={search.tables.services}
        reading={data.reads.services}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

ServicesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ServicesPage;
