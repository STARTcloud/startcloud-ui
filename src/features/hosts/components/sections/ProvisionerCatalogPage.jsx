import PropTypes from 'prop-types';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import Listing from '../../../catalog/components/Listing';
import { provisionerCollection } from '../../../collections/provisioners';
import { addCatalogSource, fetchCatalogSources, installFromCatalog } from '../../api/provisioning';
import {
  ManageRefreshContext,
  useManageRead,
  useManageSend,
  useTaskFollow,
} from '../../hooks/useHostManage';
import { useManageCatalogData } from '../../hooks/useManageCatalogData';
import { useProvisionerInstall } from '../../hooks/useProvisionerInstall';
import { hostCatalogAdapter } from '../../utils/hostCatalog';
import { handoffOf, seedFamilyOf, withoutCreateSeed } from '../../utils/machineCreate';
import { installedKeysOf } from '../../utils/manageCatalog';
import CatalogSourceDialog from '../CatalogSourceDialog';
import { InstallGlyph, VersionInstall, installColumn } from '../HostCatalogInstall';
import ProvisionerInstallCard from '../ProvisionerInstallCard';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const HELD = 409;

const sourceRowsOf = answer => (Array.isArray(answer?.sources) ? answer.sources : []);

const heldSource = error => (error.status === HELD ? error.data : Promise.reject(error));

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
 * What the route's hand-off asks of the catalog page: `handed`, the
 * family and the version of a `provisioner` hand-off, the family named by
 * the part after the handed `provisioner`'s slash, and `sourceUrl`, the
 * catalog of a `source` hand-off; each empty while the route carries no
 * such word.
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

/**
 * The catalog source the listing opens on while none is chosen: the
 * source whose URL the handed catalog names, unless it is the default
 * one, so the handed family's card is drawn; the default otherwise.
 *
 * @param {Array<Object>} sources - The host's catalog sources
 * @param {Object|null} handoff - The hand-off of `handoffOf`
 * @returns {string} The source's id, empty for the default
 */
const handedSourceOf = (sources, handoff) => {
  const url = handoff?.seed?.provisioner_catalog || '';
  const held = url ? sources.find(row => row.url === url) : null;
  return held && !held.default ? held.id : '';
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
 * again at the task's end on `task-updated` and on the answer; Add source
 * in the heading opens the Add source dialog, `POST
 * provisioning/catalog/sources` with the display name, the URL and the
 * authentication, a 409 reading as already held, the sources read again;
 * Refresh reads the catalog again with the page's other reads. The
 * route's `create=provisioner` hand-off draws the handed family's card
 * marked with its version selected, the listing opened on the handed
 * catalog's source where the host holds it, and a family missing from
 * every source of the host draws the Add source and install card of
 * `useProvisionerInstall` over the listing; `create=source` with a
 * `provisioner_catalog` opens the Add source dialog filled; the hand-off
 * leaves the route when its dialog closes or the handed version's Install
 * is pressed.
 */
const ProvisionerCatalogPage = ({ id, server, context, section, onRefresh }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const presses = useContext(ManageRefreshContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const { handoff, handed, sourceUrl } = handoffReading(searchParams);
  const [chosen, setChosen] = useState(null);
  const [held, setHeld] = useState({ url: '', dialog: null });
  if (held.url !== sourceUrl) {
    setHeld({ url: sourceUrl, dialog: sourceUrl ? { seed: sourceUrl, handoff: true } : null });
  }
  const { dialog } = held;
  const setDialog = next => setHeld(current => ({ ...current, dialog: next }));
  const catalog = useManageCatalogData({ id, server, only: ['provisioners'] });
  const sources = useManageRead(
    useCallback(() => fetchCatalogSources(status, id), [status, id]),
    true
  );
  const sourceRows = sourceRowsOf(sources.data);
  const source = chosen ?? handedSourceOf(sourceRows, handoff);
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

  const dropHandoff = () =>
    setSearchParams(current => withoutCreateSeed(current), { replace: true });

  const closeDialog = () => {
    if (dialog?.handoff) {
      dropHandoff();
    }
    setDialog(null);
  };

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
      refreshProvisioners();
      if (handed?.name === name) {
        dropHandoff();
      }
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
      closeDialog();
      sources.refresh();
    }
  };

  const listingContext = {
    ...context,
    prefsPrefix: `${context.prefsPrefix}_host_catalog`,
    installedKeys: installedKeysOf(catalog.rows.provisioners),
    busy,
    onInstall,
    handed,
  };

  const actions = (
    <div className="d-flex align-items-center gap-2">
      <SourceSelect sources={sourceRows} source={source} onChange={setChosen} />
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="catalog-source-add"
        onClick={() => setDialog({ seed: '', handoff: false })}
        disabled={busy}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('host.provisionerManagement.addSource')}
      </button>
      <RefreshButton onRefresh={onRefresh} />
    </div>
  );

  return (
    <SectionPane section={section} server={server} actions={actions}>
      {install.offered && install.state && install.state !== 'install' ? (
        <ProvisionerInstallCard install={install} />
      ) : null}
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
      {dialog ? (
        <CatalogSourceDialog
          seed={dialog.seed}
          busy={busy}
          onClose={closeDialog}
          onSubmit={onAddSource}
        />
      ) : null}
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
