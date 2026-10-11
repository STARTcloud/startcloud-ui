import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowUp, FaFileExport, FaFileImport, FaServer } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { patchConfigFile } from '../../api/manage';
import { deleteTemplate, moveTemplate, pullTemplate } from '../../api/provisioning';
import { exportTemplate, publishTemplate } from '../../api/templates';
import { useHostMachines } from '../../hooks/useHostMachines';
import { useManageSend, useTaskFollow } from '../../hooks/useHostManage';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { useTemplateSource } from '../../hooks/useTemplateSource';
import { sectionTitle } from '../../pages';
import { firstArchitectureOf, sourceKeyOf, sourceLabelOf } from '../../utils/boxCatalog';
import { heldBoxTemplatesOf, heldBoxVersionsOf, remoteBoxesAdapter } from '../../utils/hostCatalog';
import {
  createRouteOf,
  handoffOf,
  hostCreates,
  templateSourceFormOf,
  withoutCreateSeed,
} from '../../utils/machineCreate';
import { exportBody } from '../../utils/machineTools';
import {
  pullBody,
  sourceDefaultPatch,
  sourceEntryPatch,
  sourceFieldErrorsOf,
  sourceRemovePatch,
  sourceTogglePatch,
} from '../../utils/manageCatalog';
import BoxSourceCard from '../BoxSourceCard';
import { HeldListing, useSourcesPanel } from '../HeldListing';
import { PaneButton, heldBoxesCollection } from '../HostCatalogInstall';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import { TemplateDialogsOf, pullFormOfSeed } from '../TemplateDialogs';

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

/**
 * The Templates page of a host: every box the host's enabled registries
 * list, BoxVault's boxes collection drawn by the one listing over
 * `GET templates/remote/{source}` of each, cards by default and the table
 * as the toggle, with what the host holds of each from `GET templates`:
 * in the Deploy glyph's place the split control, the glyph the Install
 * press on a box the host lacks, the Update press with its dot on one it
 * holds an older version of and greyed on one it holds at the newest, the
 * chevron opening the menu of the version, Install, Install an older
 * version and Add this registry as a source on a missing box, Update to,
 * Move a held version and Delete a held version on a held one; each
 * version line Install and the machine the create wizard makes of it; the
 * Status column reading Installed or Update available, installed boxes
 * first; the navbar panel's Installed group on by default, and the
 * heading pane Add, flipping it to the missing boxes and back,
 * Registries, opening the one modal of the box registries with their
 * controls and the registry form under its table, Import, the pull by
 * name, Export machine, Publish, Refresh and the view toggle. Install and
 * Update send `POST templates/pull` with the organization, the box, the
 * version, its first architecture and the box's registry, Move
 * `POST templates/{id}/move`, Delete `DELETE templates/{id}` behind the
 * typed confirmation, Export `POST templates/export` and Publish
 * `POST templates/publish`, each a queued task followed on `task-updated`
 * with the templates read again at its end, the notice carrying View
 * task; every write of a registry one merge patch of `PUT config/storage`
 * over the `/template_sources/sources` map keyed by each registry's key,
 * `null` removing an entry, the registries read again on success and a
 * refused form drawing each `errors[]` pointer on the field it names. The
 * route's `create=template` hand-off lands with the handed box's card
 * marked whatever the group says, Install sending the handed version and
 * architecture, and a host that holds no such registry drawing the Add
 * registry and continue card over the listing, whose press writes the
 * registry; `create=source` with a `box_url` opens the Registries modal
 * with the form filled; the hand-off leaves the route when its form
 * closes or the handed box's Install is pressed.
 */
const TemplatesPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const handoff = templatesHandoffOf(searchParams);
  const [asked, setAsked] = useState('');
  const [dialog, setDialog] = useState(null);
  const [sourceErrors, setSourceErrors] = useState({});
  const dropHandoff = useCallback(
    () => setSearchParams(current => withoutCreateSeed(current), { replace: true }),
    [setSearchParams]
  );
  const clearErrors = useCallback(() => setSourceErrors({}), []);
  const { panel, openSources, closeForm, closeSources } = useSourcesPanel({
    seedUrl: handoff?.registryUrl || '',
    seedOf,
    dropHandoff,
    onReset: clearErrors,
  });
  const catalog = useManageCatalogData({ id, server, only: ['templates'] });
  const { sources, templates } = catalog.rows;
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

  const saveSources = async ({ patch, doneKey, values, id: sourceId = '' }) => {
    setSourceErrors({});
    const { error } = await send({
      call: () => patchConfigFile(status, id, 'storage', patch),
      doneKey,
      values,
      failKey: 'hosts.manage.templates.sourceFailed',
    });
    if (!error) {
      closeForm();
      setDialog(null);
      catalog.reads.sources.refresh();
      return;
    }
    setSourceErrors(sourceFieldErrorsOf(error, sourceId));
  };

  const onSaveSource = (form, editing) =>
    saveSources({
      patch: sourceEntryPatch(sources, form, editing ? sourceKeyOf(editing) : ''),
      doneKey: editing
        ? 'hosts.manage.templates.sourceUpdated'
        : 'hosts.manage.templates.sourceAdded',
      values: { name: form.displayName.trim() || form.name.trim() },
      id: form.name.trim(),
    });

  const onRemoveSource = source =>
    saveSources({
      patch: sourceRemovePatch(source),
      doneKey: 'hosts.manage.templates.sourceRemoved',
      values: { name: sourceLabelOf(source) },
    });

  const onSourceAction = (action, source) => {
    if (action === 'edit') {
      openSources({ editing: source, seed: null, handoff: false });
      return;
    }
    if (action === 'remove') {
      setDialog({ kind: 'source-remove', source });
      return;
    }
    if (action === 'toggle') {
      saveSources({
        patch: sourceTogglePatch(source),
        doneKey:
          source.enabled === false
            ? 'hosts.manage.templates.sourceEnabled'
            : 'hosts.manage.templates.sourceDisabled',
        values: { name: sourceLabelOf(source) },
      });
      return;
    }
    saveSources({
      patch: sourceDefaultPatch(sources, source),
      doneKey: 'hosts.manage.templates.sourceDefault',
      values: { name: sourceLabelOf(source) },
    });
  };

  const removeTemplate = async () => {
    const { row } = dialog;
    const { answer, error } = await send({
      call: () => deleteTemplate(status, id, row.id),
      doneKey: 'hosts.manage.templates.deleteQueued',
      failKey: 'hosts.manage.templates.failed',
    });
    setDialog(null);
    if (!error) {
      follow(answer);
      refreshTemplates();
    }
  };

  const entriesOf = item => {
    const rows = heldBoxTemplatesOf(templates, item);
    return {
      fetch: rows.map(row => ({
        key: `move-${row.id}`,
        action: 'template-move',
        label: t('hosts.manage.held.moveVersion', { version: versionLabelOf(row, rows) }),
        onClick: () => setDialog({ kind: 'move', row }),
      })),
      remove: rows.map(row => ({
        key: `delete-${row.id}`,
        action: 'template-delete',
        label: t('hosts.manage.held.deleteVersion', { version: versionLabelOf(row, rows) }),
        onClick: () => setDialog({ kind: 'delete', row }),
      })),
    };
  };

  const listingContext = {
    ...context,
    prefsPrefix: `${context.prefsPrefix}_host_registry`,
    held: {
      versionsOf: item => heldBoxVersionsOf(templates, item),
      busy,
      onFetch: onPull,
      onAddSource: item =>
        openSources({
          editing: null,
          seed: templateSourceFormOf(item.extras.source?.url || ''),
          handoff: false,
        }),
      sourceWordKey: 'pages.deploy.words.sourceRegistry',
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
        sourceErrors={sourceErrors}
        task={task}
        onCloseAsked={() => setAsked('')}
        onCloseDialog={() => setDialog(null)}
        onPull={queuePull}
        onExport={onExport}
        onPublish={onPublish}
        onMove={onMove}
        onDeleteTemplate={removeTemplate}
        onAddSource={() => openSources({ editing: null, seed: null, handoff: false })}
        onSourceAction={onSourceAction}
        onSaveSource={onSaveSource}
        onRemoveSource={onRemoveSource}
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
