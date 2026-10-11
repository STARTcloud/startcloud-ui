import PropTypes from 'prop-types';
import { useContext, useMemo, useState } from 'react';

import SectionHeading from '../../../components/common/SectionHeading';
import { useStatus } from '../../../contexts/StatusContext';
import { pageContextShape } from '../../../utils/itemShape';
import Listing from '../../catalog/components/Listing';
import { patchConfigFile } from '../api/manage';
import { ManageRefreshContext } from '../hooks/useHostManage';
import { sourceKeyOf, sourceLabelOf } from '../utils/boxCatalog';
import {
  sourceDefaultPatch,
  sourceEntryPatch,
  sourceFieldErrorsOf,
  sourceRemovePatch,
  sourceTogglePatch,
} from '../utils/manageCatalog';

import { AddButton } from './HostCatalogInstall';

const CLOSED = { url: '', open: false, form: null };

/**
 * The rows a host page's adapter is built over, held by content: the
 * same array while a read answers rows that spell the same, the rows
 * memoized on their JSON spelling alone, so a read the event stream's
 * `ready` or `reset` asks again rebuilds no adapter and the listing
 * reads each source once per load.
 *
 * @param {Array<Object>|null} rows - The rows the read answered
 * @returns {Array<Object>} The held rows
 */
export const useSameRows = rows => {
  const key = JSON.stringify(Array.isArray(rows) ? rows : []);
  return useMemo(() => JSON.parse(key), [key]);
};

/**
 * The writes of a host page's sources map through `PUT config/storage`,
 * one merge patch each over `/<map>/sources`: `onSaveSource(form,
 * editing)` adds or edits an entry, `onRemoveSource(source)` nulls one,
 * `onSourceAction(action, source)` runs a row's Make default or Enable
 * or Disable, opens the form on Edit through `onEdit` and asks the page
 * to confirm a Remove through `onRemoveAsk`; `errors` carries the
 * refused save's entries by form field. A success raises the notice of
 * `keys`, closes the form and calls `onSaved`; a refusal raises the
 * failure notice.
 *
 * @param {Object} options - The host, the sender and the map
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Function} options.send - The sender of `useManageSend`
 * @param {string} options.map - `TEMPLATE_SOURCES` or `CATALOG_SOURCES`
 * @param {Array<Object>} options.sources - The rows the map holds
 * @param {Object<string, string>} options.keys - The notice keys, `added`, `updated`, `removed`, `enabled`, `disabled`, `default` and `failed`
 * @param {Function} options.onSaved - Reads the sources again
 * @param {Function} options.closeForm - Closes the form
 * @param {Function} options.onEdit - Opens the form on a source
 * @param {Function} options.onRemoveAsk - Asks the typed confirmation of a remove
 * @returns {{ errors: Object, clearErrors: Function, onSaveSource: Function, onRemoveSource: Function, onSourceAction: Function }} The writes
 */
export const useSourceWrites = ({
  id,
  send,
  map,
  sources,
  keys,
  onSaved,
  closeForm,
  onEdit,
  onRemoveAsk,
}) => {
  const status = useStatus();
  const [errors, setErrors] = useState({});

  const save = async ({ patch, doneKey, values, id: sourceId = '' }) => {
    setErrors({});
    const { error } = await send({
      call: () => patchConfigFile(status, id, 'storage', patch),
      doneKey,
      values,
      failKey: keys.failed,
    });
    if (!error) {
      closeForm();
      onSaved();
      return;
    }
    setErrors(sourceFieldErrorsOf(error, sourceId, map));
  };

  const onSaveSource = (form, editing) =>
    save({
      patch: sourceEntryPatch(sources, form, editing ? sourceKeyOf(editing) : '', map),
      doneKey: editing ? keys.updated : keys.added,
      values: { name: form.displayName.trim() || form.name.trim() },
      id: form.name.trim(),
    });

  const onRemoveSource = source =>
    save({
      patch: sourceRemovePatch(source, map),
      doneKey: keys.removed,
      values: { name: sourceLabelOf(source) },
    });

  const onSourceAction = (action, source) => {
    if (action === 'edit') {
      setErrors({});
      onEdit(source);
      return;
    }
    if (action === 'remove') {
      onRemoveAsk(source);
      return;
    }
    if (action === 'toggle') {
      save({
        patch: sourceTogglePatch(source, map),
        doneKey: source.enabled === false ? keys.enabled : keys.disabled,
        values: { name: sourceLabelOf(source) },
      });
      return;
    }
    save({
      patch: sourceDefaultPatch(sources, source, map),
      doneKey: keys.default,
      values: { name: sourceLabelOf(source) },
    });
  };

  return { errors, clearErrors: () => setErrors({}), onSaveSource, onRemoveSource, onSourceAction };
};

/**
 * The state of a host page's Sources or Registries modal: `panel`, the
 * hand-off URL it opened on, whether it is open and the form drawn under
 * its table, null while none is; `openSources(form)` opens the modal with
 * that form or none, `closeForm` drops the form and `closeSources` closes
 * the modal, each dropping the hand-off from the route while the form was
 * the hand-off's. A `seedUrl` the route hands opens the modal with
 * `seedOf(seedUrl)` as the form, and the modal stays open when the
 * hand-off leaves the route.
 *
 * @param {Object} options - The page's reading of the route
 * @param {string} options.seedUrl - The URL of a `source` hand-off, empty while the route carries none
 * @param {Function} options.seedOf - The form of a handed URL, without its `handoff` flag
 * @param {Function} options.dropHandoff - Drops the hand-off from the route
 * @returns {{ panel: Object, openSources: Function, closeForm: Function, closeSources: Function }} The panel
 */
export const useSourcesPanel = ({ seedUrl, seedOf, dropHandoff }) => {
  const [panel, setPanel] = useState(CLOSED);
  if (panel.url !== seedUrl) {
    const seed = seedUrl ? { ...seedOf(seedUrl), handoff: true } : null;
    setPanel({ url: seedUrl, open: seed !== null || panel.open, form: seed });
  }
  const dropHanded = () => {
    if (panel.form?.handoff) {
      dropHandoff();
    }
  };
  return {
    panel,
    openSources: form => setPanel(current => ({ ...current, open: true, form })),
    closeForm: () => {
      dropHanded();
      setPanel(current => ({ ...current, form: null }));
    },
    closeSources: () => {
      dropHanded();
      setPanel(current => ({ ...current, open: false, form: null }));
    },
  };
};

/**
 * The listing of a host's Provisioners or Templates page: the one
 * `Listing` over `collections` with the heading of the title, the count
 * of the entries shown, Add, the page's `pane` and the view toggle,
 * keyed by the host's Refresh presses, `children` drawn over it; while
 * `loaded` is false the heading with the pane alone and the children.
 */
export const HeldListing = ({
  table,
  loaded,
  title,
  pane,
  collections,
  context,
  children = null,
}) => {
  const presses = useContext(ManageRefreshContext);
  const heading = ({ count, toggle, filters, setFilter }) => {
    const actions = (
      <>
        <AddButton filters={filters} setFilter={setFilter} />
        {pane}
        {toggle}
      </>
    );
    return <SectionHeading title={title} count={count} actions={actions} />;
  };
  return (
    <div data-table={table}>
      {loaded ? (
        <Listing
          key={presses}
          collections={collections}
          org=""
          member={false}
          grouped
          context={context}
          heading={heading}
        >
          {children}
        </Listing>
      ) : (
        <>
          <SectionHeading title={title} actions={pane} />
          {children}
        </>
      )}
    </div>
  );
};

HeldListing.propTypes = {
  table: PropTypes.string.isRequired,
  loaded: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  pane: PropTypes.node.isRequired,
  collections: PropTypes.array.isRequired,
  context: pageContextShape.isRequired,
  children: PropTypes.node,
};
