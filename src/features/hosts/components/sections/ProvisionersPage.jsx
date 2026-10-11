import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileImport, FaServer } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import {
  addCatalogSource,
  deleteProvisioner,
  deleteProvisionerVersion,
  fetchCatalogSources,
  importProvisioner,
  installFromCatalog,
  refreshProvisionerFromSource,
} from '../../api/provisioning';
import { useManageRead, useManageSend, useTaskFollow } from '../../hooks/useHostManage';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { useProvisionerInstall } from '../../hooks/useProvisionerInstall';
import { sectionTitle } from '../../pages';
import { heldFamilyVersionsOf, hostCatalogAdapter } from '../../utils/hostCatalog';
import {
  createRouteOf,
  handoffOf,
  hostCreates,
  seedFamilyOf,
  withoutCreateSeed,
} from '../../utils/machineCreate';
import { referencingMachinesOf, secretNamesOf } from '../../utils/manageCatalog';
import { CatalogSourceForm } from '../CatalogSourceForm';
import { HeldListing, useSourcesPanel } from '../HeldListing';
import { PaneButton, heldProvisionerCollection } from '../HostCatalogInstall';
import { DeleteProvisionerConfirm, ImportModal } from '../ProvisionerDialogs';
import ProvisionerInstallCard from '../ProvisionerInstallCard';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import SourcesModal from '../SourcesModal';
import TaskDialog from '../TaskDialog';

const HELD = 409;

const NO_SOURCES = [];

const NO_OFFERS = {};

const SOURCE_KINDS = ['git', 'folder'];

const sourceRowsOf = answer => (Array.isArray(answer?.sources) ? answer.sources : NO_SOURCES);

const heldSource = error => (error.status === HELD ? error.data : Promise.reject(error));

const seedOf = url => ({ seed: url });

const sourceRowOf = source => ({
  key: source.id,
  name: source.name || source.id,
  url: source.url || '',
  isDefault: Boolean(source.default),
  enabled: typeof source.enabled === 'boolean' ? source.enabled : null,
  source,
});

/**
 * What the route's hand-off asks of the page: `handed`, the family and
 * the version of a `provisioner` hand-off, the family named by the part
 * after the handed `provisioner`'s slash, and `sourceUrl`, the catalog of
 * a `source` hand-off; each empty while the route carries no such word.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {{ handoff: Object|null, handed: { name: string, version: string }|null, sourceUrl: string }} The reading
 */
const handoffReading = params => {
  const handoff = handoffOf(params);
  return {
    handoff,
    handed:
      handoff?.word === 'provisioner'
        ? {
            name: seedFamilyOf(handoff.seed.provisioner),
            version: handoff.seed.provisioner_version,
          }
        : null,
    sourceUrl: handoff?.word === 'source' ? handoff.seed.provisioner_catalog : '',
  };
};

const installCardOf = install =>
  install.offered && install.state && install.state !== 'install' ? (
    <ProvisionerInstallCard install={install} />
  ) : null;

/**
 * The Provisioners page of a host: every family the host's catalog
 * sources list, drawn as the catalog site draws its provisioners, cards
 * by default and the table as the toggle, with what the host holds of
 * each from `GET provisioning/provisioners`: in the Deploy glyph's place
 * the split control, the glyph the Install press on a family the host
 * lacks, the Update press with its dot on one it holds an older version
 * of and greyed on one it holds at the newest, the chevron opening the
 * menu of the version, Install, Install an older version and Add this
 * catalog as a source on a missing family, Update to, Update from source
 * on a family imported from git or a folder, Delete a held version and
 * Delete family on a held one; each version line Install and the
 * machine the create wizard makes of it; the Status column reading
 * Installed or Update available, installed families first; the navbar
 * panel's Installed group on by default, and the heading pane Add,
 * flipping it to the missing families and back, Sources, opening the one
 * modal of the catalog sources with Add source under its table, Import,
 * the import dialog, Refresh and the view toggle. Install and Update send
 * `POST provisioning/catalog/install` with the family's source, the
 * family and the version, Update from source
 * `POST provisioning/provisioners/{name}/refresh-from-source`, the
 * deletes `DELETE provisioning/provisioners/{name}` and its version
 * behind the typed confirmation, a 409 naming the machines, Import
 * `POST provisioning/provisioners/import`, each one notice with View
 * task and the families read again at the task's end on `task-updated`
 * and on the answer; Add source sends `POST provisioning/catalog/sources`,
 * a 409 reading as already held, the sources read again. The route's
 * `create=provisioner` hand-off draws the handed family's card marked
 * whatever the group says, its version selected, and a family missing
 * from every source draws the Add source and install card of
 * `useProvisionerInstall` over the listing; `create=source` with a
 * `provisioner_catalog` opens the Sources modal with the form filled; the
 * hand-off leaves the route when its form closes or the handed version's
 * Install is pressed.
 */
const ProvisionersPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handoff, handed, sourceUrl } = handoffReading(searchParams);
  const dropHandoff = () =>
    setSearchParams(current => withoutCreateSeed(current), { replace: true });
  const { panel, openSources, closeForm, closeSources } = useSourcesPanel({
    seedUrl: sourceUrl,
    seedOf,
    dropHandoff,
  });
  const [dialog, setDialog] = useState(null);
  const catalog = useManageCatalogData({ id, server, only: ['provisioners'] });
  const sources = useManageRead(
    useCallback(() => fetchCatalogSources(status, id), [status, id]),
    true
  );
  const sourceRows = useMemo(() => sourceRowsOf(sources.data), [sources.data]);
  const { send, busy, task, closeTask } = useManageSend(id);
  const refreshProvisioners = catalog.reads.provisioners.refresh;
  const follow = useTaskFollow({ id, onEnd: () => refreshProvisioners() });
  const onInstalled = useCallback(
    () => refreshProvisioners().then(data => data?.provisioners || []),
    [refreshProvisioners]
  );
  const install = useProvisionerInstall({
    status,
    id,
    server,
    seed: handed ? handoff.seed : null,
    provisioners: catalog.rows.provisioners,
    loaded: catalog.reads.provisioners.loaded,
    onInstalled,
  });
  const collection = useMemo(
    () =>
      heldProvisionerCollection({
        adapter: hostCatalogAdapter({ status, id, sources: sourceRows }),
      }),
    [status, id, sourceRows]
  );
  const collections = useMemo(() => [collection], [collection]);

  const queue = async ({ call, doneKey, values = {} }) => {
    const { answer, error } = await send({
      call,
      doneKey,
      values,
      failKey: 'hosts.manage.provisioners.failed',
    });
    if (!error) {
      setDialog(null);
      follow(answer);
      refreshProvisioners();
    }
    return error;
  };

  const onInstall = async (item, version) => {
    const source = item.extras.source?.key || '';
    const error = await queue({
      call: () =>
        installFromCatalog(status, id, {
          ...(source ? { source_name: source } : {}),
          name: item.name,
          version,
        }),
      doneKey: 'host.provisionerManagement.installQueued',
      values: { label: `${item.name}/${version}` },
    });
    if (!error && handed?.name === item.name) {
      dropHandoff();
    }
  };

  const onAddSource = async body => {
    const { error } = await send({
      call: () => addCatalogSource(status, id, body).catch(heldSource),
      doneKey: 'host.provisionerManagement.sourceAdded',
      values: { name: body.display_name },
      failKey: 'hosts.manage.catalog.sourceFailed',
    });
    if (!error) {
      closeForm();
      sources.refresh();
    }
  };

  const remove = async () => {
    const { name, version } = dialog;
    const { error } = await send({
      call: () =>
        version
          ? deleteProvisionerVersion(status, id, name, version)
          : deleteProvisioner(status, id, name),
      doneKey: 'host.provisionerManagement.deleted',
      failKey: 'hosts.manage.provisioners.deleteFailed',
    });
    setDialog(null);
    if (!error) {
      refreshProvisioners();
      return;
    }
    const machines = referencingMachinesOf(error);
    if (machines.length > 0) {
      notify(
        'warning',
        t('host.provisionerManagement.referencedBy', {
          message: error.message,
          machines: machines.join(', '),
        })
      );
    }
  };

  const families = catalog.rows.provisioners;

  const entriesOf = item => {
    const family = families.find(entry => entry.name === item.name);
    if (!family) {
      return { fetch: [], remove: [] };
    }
    return {
      fetch: SOURCE_KINDS.includes(family.source?.source_type)
        ? [
            {
              key: 'refresh-source',
              action: 'refresh-source',
              label: t('host.provisionerManagement.updateFromSource'),
              onClick: () =>
                queue({
                  call: () => refreshProvisionerFromSource(status, id, family.name),
                  doneKey: 'host.provisionerManagement.installQueued',
                  values: {
                    label: t('host.provisionerManagement.fromSourceLabel', { name: family.name }),
                  },
                }),
            },
          ]
        : [],
      remove: [
        ...(family.versions || []).map(entry => ({
          key: `delete-${entry.version}`,
          action: 'delete-version',
          label: t('hosts.manage.held.deleteVersion', { version: entry.version }),
          onClick: () => setDialog({ kind: 'delete', name: family.name, version: entry.version }),
        })),
        {
          key: 'delete-family',
          action: 'delete-family',
          label: t('host.provisionerManagement.deleteFamily'),
          onClick: () => setDialog({ kind: 'delete', name: family.name, version: '' }),
        },
      ],
    };
  };

  const listingContext = {
    ...context,
    prefsPrefix: `${context.prefsPrefix}_host_catalog`,
    held: {
      versionsOf: item => heldFamilyVersionsOf(families, item),
      busy,
      onFetch: onInstall,
      onAddSource: item => openSources({ seed: item.extras.source?.url || '', handoff: false }),
      sourceWordKey: 'pages.deploy.words.sourceCatalog',
      entriesOf,
      creates: hostCreates(server, context.user?.role),
      createRouteOf: (item, version) =>
        createRouteOf(id, {
          provisioner: `${item.organization.name}/${item.name}`,
          provisioner_version: version,
          provisioner_catalog: item.extras.source?.url || '',
        }),
    },
    handed,
  };

  const pane = (
    <>
      <PaneButton
        icon={FaServer}
        labelKey="hosts.manage.held.catalogSources"
        action="catalog-sources"
        onClick={() => openSources(null)}
      />
      <PaneButton
        icon={FaFileImport}
        labelKey="host.provisionerManagement.importProvisioner"
        action="provisioner-import"
        onClick={() => setDialog({ kind: 'import' })}
        busy={busy}
      />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane section={section} server={server} headed={false}>
      <HeldListing
        table="provisioner-catalog"
        loaded={sources.loaded}
        title={sectionTitle(section, server, '', t)}
        pane={pane}
        collections={collections}
        context={listingContext}
      >
        {installCardOf(install)}
      </HeldListing>
      {panel.open ? (
        <SourcesModal
          kind="catalog"
          title={t('hosts.manage.held.catalogSources')}
          label={t('hosts.manage.sources.sources')}
          addLabelKey="host.provisionerManagement.addSource"
          addAction="catalog-source-add"
          emptyKey="hosts.manage.sources.none"
          rows={sourceRows.map(sourceRowOf)}
          offers={NO_OFFERS}
          busy={busy}
          form={
            panel.form ? (
              <CatalogSourceForm
                key={panel.form.seed}
                seed={panel.form.seed}
                busy={busy}
                onCancel={closeForm}
                onSubmit={onAddSource}
              />
            ) : null
          }
          onAdd={() => openSources({ seed: '', handoff: false })}
          onAction={() => null}
          onClose={closeSources}
        />
      ) : null}
      {dialog?.kind === 'import' ? (
        <ImportModal
          id={id}
          server={server}
          gitKeyNames={secretNamesOf(catalog.reads.secrets.data, 'git_api_keys')}
          busy={busy}
          onClose={() => setDialog(null)}
          onSubmit={body =>
            queue({
              call: () => importProvisioner(status, id, body),
              doneKey: 'host.provisionerManagement.importQueuedDefault',
            })
          }
        />
      ) : null}
      <DeleteProvisionerConfirm
        dialog={dialog}
        onClose={() => setDialog(null)}
        onConfirm={remove}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </SectionPane>
  );
};

ProvisionersPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default ProvisionersPage;
