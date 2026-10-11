import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowUp, FaFileExport, FaFileImport, FaServer } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { deleteTemplate, moveTemplate, pullTemplate } from '../../api/provisioning';
import { exportTemplate, publishTemplate } from '../../api/templates';
import { useHostMachines } from '../../hooks/useHostMachines';
import { useManageSend, useTaskFollow } from '../../hooks/useHostManage';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { useTemplateSource } from '../../hooks/useTemplateSource';
import { sectionTitle } from '../../pages';
import { firstArchitectureOf } from '../../utils/boxCatalog';
import { heldBoxTemplatesOf, heldBoxVersionsOf, remoteBoxesAdapter } from '../../utils/hostCatalog';
import {
  createRouteOf,
  handoffOf,
  hostCreates,
  templateSourceFormOf,
  withoutCreateSeed,
} from '../../utils/machineCreate';
import { exportBody } from '../../utils/machineTools';
import { TEMPLATE_SOURCES, pullBody } from '../../utils/manageCatalog';
import BoxSourceCard from '../BoxSourceCard';
import { HeldListing, useSameRows, useSourceWrites, useSourcesPanel } from '../HeldListing';
import { PaneButton, heldBoxesCollection } from '../HostCatalogInstall';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import { TemplateDialogsOf, pullFormOfSeed } from '../TemplateDialogs';

const SOURCE_KEYS = {
  added: 'hosts.manage.templates.sourceAdded',
  updated: 'hosts.manage.templates.sourceUpdated',
  removed: 'hosts.manage.templates.sourceRemoved',
  enabled: 'hosts.manage.templates.sourceEnabled',
  disabled: 'hosts.manage.templates.sourceDisabled',
  default: 'hosts.manage.templates.sourceDefault',
  failed: 'hosts.manage.templates.sourceFailed',
};

const seedOf = url => ({ editing: null, seed: templateSourceFormOf(url) });

/**
 * What the route's hand-off asks of the Templates page: `box`, the four
 * box members of a `template` hand-off, or `registryUrl`, the registry of
 * a `source` hand-off; null while the route carries neither.
 *
 * @param {URLSearchParams} params - The route's search params
 * @returns {{ box: Object|null, registryUrl: string }|null} The hand-off
 */
const templatesHandoffOf = params => {
  const handoff = handoffOf(params);
  if (handoff?.word === 'template') {
    return { box: handoff.seed, registryUrl: '' };
  }
  if (handoff?.word === 'source' && handoff.seed.box_url) {
    return { box: null, registryUrl: handoff.seed.box_url };
  }
  return null;
};

/**
 * The handed box as the listing marks it: the box's name, its
 * organization and the handed version.
 *
 * @param {Object} box - The seed of a `template` hand-off
 * @returns {{ name: string, organization: string, version: string }} The handed box
 */
const handedBoxOf = box => {
  const form = pullFormOfSeed(box);
  return { name: form.boxName, organization: form.organization, version: form.version };
};

const versionLabelOf = (row, rows) =>
  rows.filter(entry => entry.version === row.version).length > 1 && row.architecture
    ? `${row.version} (${row.architecture})`
    : row.version;

const firstAnswerOf = answers => (answers.length === 1 ? answers[0] : null);

/**
 * The Templates page of a host: every box the host's enabled registries
 * list, BoxVault's boxes collection drawn by the one listing over
 * `GET templates/remote/{source}` of each, read once per registry per
 * load, cards by default and the table as the toggle, each box's
 * organization logo the registry's own, resolved against the registry's
 * URL, its Gravatar else and its initial where neither loads, with what
 * the host holds of each from `GET templates`: in the Deploy glyph's
 * place the split control, the glyph the Install press on a box the host
 * lacks, the Update press with its dot on one it holds an older version
 * of and greyed on one it holds at the newest, greyed and titled no
 * version listed on a box whose registry lists none, the chevron opening
 * the menu of the version, Install or Update to, Install an older
 * version, Add this registry as a source, Move of each held version, then
 * Delete of every held version on a held one, one confirmation; each
 * version line Install on a version the host lacks or Delete on one it
 * holds, and the machine the create wizard makes of it; the Status
 * column reading Installed or Update available, installed boxes first;
 * the navbar panel's Installed group on when the page opens, and the
 * heading pane Add, turning the group off so every box draws, the
 * installed first and the missing greyed with their controls live, a
 * second press turning it back on, Registries, opening the one modal of
 * the box registries with their controls and the registry form under its
 * table, Import, the pull by name, Export machine, Publish, Refresh and
 * the view toggle; the heading's count the boxes shown. Install and
 * Update send `POST templates/pull` with the organization, the box, the
 * version, its first architecture and the box's registry, Move
 * `POST templates/{id}/move`, Delete `DELETE templates/{id}` a held row
 * behind the typed confirmation, Export `POST templates/export` and
 * Publish `POST templates/publish`, each a queued task followed on
 * `task-updated` with the templates read again at its end, the notice
 * carrying View task; every write of a registry one merge patch of
 * `PUT config/storage` over the `/template_sources/sources` map keyed by
 * each registry's key, `null` removing an entry, the registries read
 * again on success and a refused form drawing each `errors[]` pointer on
 * the field it names. The route's `create=template` hand-off lands with
 * the handed box's card marked whatever the group says, Install sending
 * the handed version and architecture, and a host that holds no such
 * registry drawing the Add registry and continue card over the listing,
 * whose press writes the registry; `create=source` with a `box_url`
 * opens the Registries modal with the form filled; the hand-off leaves
 * the route when its form closes or the handed box's Install is pressed.
 */
const TemplatesPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const handoff = templatesHandoffOf(searchParams);
  const [asked, setAsked] = useState('');
  const [dialog, setDialog] = useState(null);
  const dropHandoff = useCallback(
    () => setSearchParams(current => withoutCreateSeed(current), { replace: true }),
    [setSearchParams]
  );
  const { panel, openSources, closeForm, closeSources } = useSourcesPanel({
    seedUrl: handoff?.registryUrl || '',
    seedOf,
    dropHandoff,
  });
  const catalog = useManageCatalogData({ id, server, only: ['templates'] });
  const sources = useSameRows(catalog.rows.sources);
  const { templates } = catalog.rows;
  const box = handoff?.box || null;
  const { send, busy, task, closeTask } = useManageSend(id);
  const { machines } = useHostMachines(id);
  const refreshTemplates = catalog.reads.templates.refresh;
  const follow = useTaskFollow({ id, onEnd: () => refreshTemplates() });
  const boxSource = useTemplateSource({
    status,
    id,
    box,
    sources,
    loaded: catalog.reads.sources.loaded,
    onAdded: catalog.reads.sources.refresh,
  });
  const collection = useMemo(
    () => heldBoxesCollection({ adapter: remoteBoxesAdapter({ status, id, sources }) }),
    [status, id, sources]
  );
  const collections = useMemo(() => [collection], [collection]);
  const handed = useMemo(() => (box ? handedBoxOf(box) : null), [box]);
  const writes = useSourceWrites({
    id,
    send,
    map: TEMPLATE_SOURCES,
    sources,
    keys: SOURCE_KEYS,
    onSaved: () => {
      setDialog(null);
      catalog.reads.sources.refresh();
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
      failKey: 'hosts.manage.templates.failed',
    });
    if (!error) {
      setAsked('');
      setDialog(null);
      follow(answer);
      refreshTemplates();
    }
    return error;
  };

  const queuePull = body =>
    queue({
      call: () => pullTemplate(status, id, body),
      doneKey: 'hosts.manage.templates.installQueued',
      values: { box: `${body.organization}/${body.box_name}` },
    });

  const onPull = async (item, version) => {
    const own =
      Boolean(handed) &&
      handed.name === item.name &&
      handed.organization === item.organization.name;
    const body = pullBody(
      {
        organization: item.organization.name,
        boxName: item.name,
        version,
        architecture: (own && box.box_arch) || firstArchitectureOf(item, version),
      },
      item.extras.source?.key || ''
    );
    const error = await queuePull(body);
    if (!error && own) {
      dropHandoff();
    }
  };

  const onExport = form =>
    queue({
      call: () =>
        exportTemplate(status, id, exportBody({ name: form.machine, filename: form.filename })),
      doneKey: 'hosts.manage.templates.exportQueued',
      values: { name: form.machine },
    });

  const onPublish = body =>
    queue({
      call: () => publishTemplate(status, id, body),
      doneKey: 'hosts.manage.templates.publishQueued',
      values: { name: body.machine_name },
    });

  const onMove = (row, path) =>
    queue({
      call: () => moveTemplate(status, id, row.id, path),
      doneKey: 'hosts.manage.templates.moveQueued',
    });

  const removeTemplates = () =>
    queue({
      call: () =>
        Promise.all(dialog.rows.map(row => deleteTemplate(status, id, row.id))).then(firstAnswerOf),
      doneKey: 'hosts.manage.templates.deleteQueued',
    });

  const addSourceEntryOf = item => ({
    key: 'source',
    action: 'held-add-source',
    label: t('pages.deploy.words.sourceRegistry'),
    onClick: () =>
      openForm({
        editing: null,
        seed: templateSourceFormOf(item.extras.source?.url || ''),
        handoff: false,
      }),
  });

  const entriesOf = item => {
    const rows = heldBoxTemplatesOf(templates, item);
    return {
      fetch: [
        addSourceEntryOf(item),
        ...rows.map(row => ({
          key: `move-${row.id}`,
          action: 'template-move',
          label: t('hosts.manage.held.moveVersion', { version: versionLabelOf(row, rows) }),
          onClick: () => setDialog({ kind: 'move', row }),
        })),
      ],
      remove:
        rows.length > 0
          ? [
              {
                key: 'delete',
                action: 'template-delete',
                label: t('host.templatesManagement.delete'),
                onClick: () => setDialog({ kind: 'delete', rows }),
              },
            ]
          : [],
    };
  };

  const listingContext = {
    ...context,
    orgMark: null,
    prefsPrefix: `${context.prefsPrefix}_host_registry`,
    held: {
      versionsOf: item => heldBoxVersionsOf(templates, item),
      busy,
      onFetch: onPull,
      onDelete: (item, version) =>
        setDialog({
          kind: 'delete',
          rows: heldBoxTemplatesOf(templates, item).filter(row => row.version === version),
        }),
      entriesOf,
      creates: hostCreates(server, context.user?.role),
      createRouteOf: (item, version) =>
        createRouteOf(id, {
          box: `${item.organization.name}/${item.name}`,
          box_version: version,
          box_arch: firstArchitectureOf(item, version),
          box_url: item.extras.source?.url || '',
        }),
    },
    handed,
  };

  const pane = (
    <>
      <PaneButton
        icon={FaServer}
        labelKey="host.templatesManagement.boxRegistries"
        action="template-sources"
        onClick={() => openSources(null)}
      />
      <PaneButton
        icon={FaFileImport}
        labelKey="host.provisionerManagement.importSubmit"
        action="template-import"
        onClick={() => setAsked('import')}
        busy={busy}
      />
      <PaneButton
        icon={FaFileExport}
        labelKey="host.templatesManagement.exportMachine"
        action="template-export"
        variant="outline-info"
        onClick={() => setAsked('export')}
        busy={busy}
      />
      <PaneButton
        icon={FaCloudArrowUp}
        labelKey="host.templatesManagement.publish"
        action="template-publish"
        variant="outline-info"
        onClick={() => setAsked('publish')}
        busy={busy}
      />
      <RefreshButton onRefresh={onRefresh} />
    </>
  );

  return (
    <SectionPane section={section} server={server} headed={false}>
      <HeldListing
        table="box-registry"
        loaded={catalog.reads.sources.loaded}
        title={sectionTitle(section, server, '', t)}
        pane={pane}
        collections={collections}
        context={listingContext}
      >
        <BoxSourceCard source={boxSource} />
      </HeldListing>
      <TemplateDialogsOf
        id={id}
        server={server}
        status={status}
        sources={sources}
        machines={machines}
        busy={busy}
        asked={asked}
        dialog={dialog}
        panel={panel}
        sourceErrors={writes.errors}
        task={task}
        onCloseAsked={() => setAsked('')}
        onCloseDialog={() => setDialog(null)}
        onPull={queuePull}
        onExport={onExport}
        onPublish={onPublish}
        onMove={onMove}
        onDeleteTemplate={removeTemplates}
        onAddSource={() => openForm({ editing: null, seed: null, handoff: false })}
        onSourceAction={writes.onSourceAction}
        onSaveSource={writes.onSaveSource}
        onRemoveSource={writes.onRemoveSource}
        onCancelForm={closeForm}
        onCloseSources={closeSources}
        onCloseTask={closeTask}
      />
    </SectionPane>
  );
};

TemplatesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default TemplatesPage;
