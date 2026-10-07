import PropTypes from 'prop-types';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import Listing from '../../../catalog/components/Listing';
import { provisionerCollection } from '../../../collections/provisioners';
import { fetchCatalogSources, installFromCatalog } from '../../api/provisioning';
import {
  ManageRefreshContext,
  useManageRead,
  useManageSend,
  useTaskFollow,
} from '../../hooks/useHostManage';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { hostCatalogAdapter } from '../../utils/hostCatalog';
import { installedKeysOf } from '../../utils/manageCatalog';
import { InstallGlyph, VersionInstall, installColumn } from '../HostCatalogInstall';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const sourceRowsOf = answer => (Array.isArray(answer?.sources) ? answer.sources : []);

const SourceSelect = ({ sources, source, onChange }) => {
  const { t } = useTranslation();
  if (sources.length < 2) {
    return null;
  }
  return (
    <select
      id="catalog-source"
      className="form-select form-select-sm w-auto"
      aria-label={t('host.provisionerManagement.catalogSource')}
      value={source}
      onChange={event => onChange(event.target.value)}
    >
      <option value="">{t('host.provisionerManagement.default')}</option>
      {sources.map(entry => (
        <option key={entry.id} value={entry.id}>
          {entry.name || entry.id}
        </option>
      ))}
    </select>
  );
};

SourceSelect.propTypes = {
  sources: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
  source: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The Provisioner catalog page of a host: the catalog the host relays
 * drawn as the catalog site draws its provisioners, cards by default and
 * the table as the toggle, tier badges, provider chips and each version's
 * checksums, and in the Deploy glyph's place an Install on each version,
 * or Installed once the host holds it; the source select while the host
 * has several catalog sources, sending each source's `id`; Install sends
 * `POST provisioning/catalog/install` with the source, the family and the
 * version, one notice with View task, and the host's families are read
 * again at the task's end on `task-updated` and on the answer; Refresh
 * reads the catalog again with the page's other reads.
 */
const ProvisionerCatalogPage = ({ id, server, context, section, onRefresh }) => {
  const status = useStatus();
  const presses = useContext(ManageRefreshContext);
  const [source, setSource] = useState('');
  const catalog = useManageCatalogData({ id, server, only: ['provisioners'] });
  const sources = useManageRead(
    useCallback(() => fetchCatalogSources(status, id), [status, id]),
    true
  );
  const { send, busy, task, closeTask } = useManageSend(id);
  const follow = useTaskFollow({ id, onEnd: () => catalog.reads.provisioners.refresh() });
  const collection = useMemo(
    () =>
      provisionerCollection({
        adapter: hostCatalogAdapter({ status, id, source }),
        itemRoute: false,
        actionColumn: installColumn,
        CardGlyph: InstallGlyph,
        VersionAction: VersionInstall,
      }),
    [status, id, source]
  );
  const collections = useMemo(() => [collection], [collection]);

  const onInstall = async (name, version) => {
    const { answer, error } = await send({
      call: () =>
        installFromCatalog(status, id, {
          ...(source ? { source_name: source } : {}),
          name,
          version,
        }),
      doneKey: 'host.provisionerManagement.installQueued',
      values: { label: `${name}/${version}` },
      failKey: 'hosts.manage.provisioners.failed',
    });
    if (!error) {
      follow(answer);
      catalog.reads.provisioners.refresh();
    }
  };

  const listingContext = {
    ...context,
    prefsPrefix: `${context.prefsPrefix}_host_catalog`,
    installedKeys: installedKeysOf(catalog.rows.provisioners),
    busy,
    onInstall,
  };

  const actions = (
    <div className="d-flex align-items-center gap-2">
      <SourceSelect sources={sourceRowsOf(sources.data)} source={source} onChange={setSource} />
      <RefreshButton onRefresh={onRefresh} />
    </div>
  );

  return (
    <SectionPane section={section} server={server} actions={actions}>
      <div data-table="provisioner-catalog" data-catalog-source={source}>
        <Listing
          key={`${source}:${presses}`}
          collections={collections}
          org=""
          member={false}
          grouped
          context={listingContext}
        />
      </div>
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </SectionPane>
  );
};

ProvisionerCatalogPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ProvisionerCatalogPage;
