import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileImport, FaServer } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import {
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
import { sourceLabelOf } from '../../utils/boxCatalog';
import { heldFamilyVersionsOf, hostCatalogAdapter } from '../../utils/hostCatalog';
import {
  catalogSourceSeedOf,
  createRouteOf,
  handoffOf,
  hostCreates,
  seedFamilyOf,
  withoutCreateSeed,
} from '../../utils/machineCreate';
import { CATALOG_SOURCES, referencingMachinesOf } from '../../utils/manageCatalog';
import { HeldListing, useSameRows, useSourceWrites, useSourcesPanel } from '../HeldListing';
import {
  HandoffInstallDialog,
  PaneButton,
  SourceWords,
  handoffInstallOf,
  heldProvisionerCollection,
} from '../HostCatalogInstall';
import { DeleteProvisionerConfirm, ImportModal } from '../ProvisionerDialogs';
import ProvisionerInstallCard from '../ProvisionerInstallCard';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import { HeldSourcesModal } from '../SourcesModal';
import TaskDialog from '../TaskDialog';

const NO_SOURCES = [];

const SOURCE_KINDS = ['git', 'folder'];

const SOURCE_KEYS = {
  added: 'host.provisionerManagement.sourceAdded',
  updated: 'hosts.manage.catalog.sourceUpdated',
  removed: 'hosts.manage.catalog.sourceRemoved',
  enabled: 'hosts.manage.catalog.sourceEnabled',
  disabled: 'hosts.manage.catalog.sourceDisabled',
  default: 'hosts.manage.catalog.sourceDefault',
  failed: 'hosts.manage.catalog.sourceFailed',
};

const sourceRowsOf = answer => (Array.isArray(answer?.sources) ? answer.sources : NO_SOURCES);

const seedOf = url => ({ editing: null, seed: catalogSourceSeedOf(url) });

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
 * The words the hand-off's confirmation names the catalog by: the
 * source's name while the host lists the source the item was read from,
 * else the source's URL, and the URL beside the name.
 *
 * @param {Object|null} source - The item's `extras.source`, `{ key, url }`
 * @param {Array<Object>} rows - The rows of `GET provisioning/catalog/sources`
 * @returns {{ name: string, url: string }} The words
 */
const catalogWordsOf = (source, rows) => {
  const row = rows.find(entry => entry.id === source?.key) || null;
  const url = source?.url || '';
  return { name: row?.name || url, url };
};

/**
 * The Provisioners page of a host: every family the host's enabled
 * catalog sources list, drawn as the catalog site draws its provisioners,
 * cards by default and the table as the toggle, each family's
 * organization logo the repository owner's and its initial where none
 * loads, with what the host holds of each from
 * `GET provisioning/provisioners`: in the Deploy glyph's place the split
 * control, the glyph the Install press on a family the host lacks, the
 * Update press with its dot on one it holds an older version of and
 * greyed on one it holds at the newest, the chevron opening the menu of
 * the version, Install or Update to, Install an older version, Update
 * from source on a family imported from git or a folder, then Delete
 * family on a held one; each version
 * line Install on a version the host lacks or Delete on one it holds,
 * and the machine the create wizard makes of it; the Status column
 * reading Installed or Update available, installed families first; the
 * navbar panel's Installed group on when the page opens, and the heading
 * pane Add, turning the group off so every family draws, the installed
 * first and the missing greyed with their controls live, a second press
 * turning it back on, Sources, opening the one modal of the catalog
 * sources with their controls and the source form under its table,
 * Import, the import dialog, Refresh and the view toggle; the heading's
 * count the families shown. Install and Update send
 * `POST provisioning/catalog/install` with the family's source, the
 * family and the version, Update from source
 * `POST provisioning/provisioners/{name}/refresh-from-source`, the
 * deletes `DELETE provisioning/provisioners/{name}` and its version
 * behind the typed confirmation, a 409 naming the machines, Import
 * `POST provisioning/provisioners/import`, each one notice with View
 * task and the families read again at the task's end on `task-updated`
 * and on the answer. The sources are one read,
 * `GET provisioning/catalog/sources`, every configured source with its
 * `enabled`, each read by the host as the signed-in person whenever it
 * holds their token and anonymously otherwise: the listing reads the
 * enabled ones once each per load, a private entry drawn under its own
 * organization, a source that answers 401 drawing no family and named with the
 * agent's message in one warning banner, the modal lists them all, and
 * every write of a source is one merge patch of `PUT config/storage`
 * over the `/catalog_sources/sources` map keyed by each source's id,
 * `null` removing an entry, the sources read again on success and a
 * refused form drawing each `errors[]` pointer on the field it names.
 * The route's `create=provisioner` hand-off draws the handed family's
 * card marked whatever the group says, its version selected, and, once
 * the host's families answered, the confirmation dialog over the listing
 * naming the family, the version and the catalog it comes from, Install
 * sending the same `POST provisioning/catalog/install` the glyph sends
 * and Cancel dropping the hand-off, a family the host already holds at
 * that version told so with no Install; a
 * family missing from every source draws the Add source and install card
 * of `useProvisionerInstall` over the listing instead; `create=source`
 * with a
 * `provisioner_catalog` opens the Sources modal with the form filled; the
 * hand-off leaves the route when its form closes, its dialog closes or
 * the handed version's Install is pressed.
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
  const [handedItem, setHandedItem] = useState(null);
  const onHanded = useCallback(item => setHandedItem(item), []);
  const catalog = useManageCatalogData({ id, server, only: ['provisioners'] });
  const sources = useManageRead(
    useCallback(() => fetchCatalogSources(status, id), [status, id]),
    true
  );
  const sourceRows = useSameRows(sourceRowsOf(sources.data));
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
  const writes = useSourceWrites({
    id,
    send,
    map: CATALOG_SOURCES,
    sources: sourceRows,
    keys: SOURCE_KEYS,
    onSaved: () => {
      setDialog(null);
      sources.refresh();
    },
    closeForm,
    onEdit: source => openSources({ editing: source, seed: null, handoff: false }),
    onRemoveAsk: source => setDialog({ kind: 'source-remove', source }),
  });

  const openForm = form => {
    writes.clearErrors();
    openSources(form);
  };

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
    const family = families.find(entry => entry.name === item.name) || null;
    const refreshes = Boolean(family) && SOURCE_KINDS.includes(family.source?.source_type);
    return {
      fetch: [
        ...(refreshes
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
                      label: t('host.provisionerManagement.fromSourceLabel', {
                        name: family.name,
                      }),
                    },
                  }),
              },
            ]
          : []),
      ],
      remove: family
        ? [
            {
              key: 'delete-family',
              action: 'delete-family',
              label: t('host.provisionerManagement.deleteFamily'),
              onClick: () => setDialog({ kind: 'delete', name: family.name, version: '' }),
            },
          ]
        : [],
    };
  };

  const listingContext = {
    ...context,
    orgMark: null,
    prefsPrefix: `${context.prefsPrefix}_host_catalog`,
    held: {
      versionsOf: item => heldFamilyVersionsOf(families, item),
      busy,
      onFetch: onInstall,
      onDelete: (item, version) => setDialog({ kind: 'delete', name: item.name, version }),
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
    onHanded,
  };

  const confirm =
    handed && handedItem && handedItem.name === handed.name && catalog.reads.provisioners.loaded
      ? handoffInstallOf(handedItem, listingContext)
      : null;
  const confirmWords = confirm ? catalogWordsOf(confirm.source, sourceRows) : null;

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
      {confirm ? (
        <HandoffInstallDialog
          rows={[
            {
              key: 'family',
              label: t('hosts.manage.held.family'),
              value: `${handedItem.organization.name}/${handedItem.name}`,
            },
            {
              key: 'version',
              label: t('host.templatesManagement.version'),
              value: confirm.version,
            },
            {
              key: 'catalog',
              label: t('hosts.manage.held.catalog'),
              value: <SourceWords words={confirmWords} />,
            },
          ]}
          name={`${handedItem.organization.name}/${handedItem.name}`}
          version={confirm.version}
          source={confirmWords.name}
          held={confirm.held}
          busy={busy}
          onInstall={() => onInstall(handedItem, confirm.version)}
          onClose={dropHandoff}
        />
      ) : null}
      {panel.open ? (
        <HeldSourcesModal
          variant="catalog"
          id={id}
          server={server}
          sources={sourceRows}
          panel={panel}
          errors={writes.errors}
          busy={busy}
          onAdd={() => openForm({ editing: null, seed: null, handoff: false })}
          onAction={writes.onSourceAction}
          onSave={writes.onSaveSource}
          onCancel={closeForm}
          onClose={closeSources}
        />
      ) : null}
      <ConfirmModal
        show={dialog?.kind === 'source-remove'}
        handleClose={() => setDialog(null)}
        handleConfirm={() => writes.onRemoveSource(dialog.source)}
        title={t('host.provisionerManagement.removeSource')}
        message={t('host.provisionerManagement.removeSourceConfirm', {
          name: dialog?.source ? sourceLabelOf(dialog.source) : '',
        })}
        confirmText={t('host.templatesManagement.remove')}
      />
      {dialog?.kind === 'import' ? (
        <ImportModal
          id={id}
          server={server}
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
