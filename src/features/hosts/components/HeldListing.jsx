import PropTypes from 'prop-types';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SectionHeading from '../../../components/common/SectionHeading';
import { pageContextShape } from '../../../utils/itemShape';
import Listing from '../../catalog/components/Listing';
import { ManageRefreshContext } from '../hooks/useHostManage';

import { AddButton, headingCountOf } from './HostCatalogInstall';

const CLOSED = { url: '', open: false, form: null };

/**
 * The state of a host page's Sources or Registries modal: `panel`, the
 * hand-off URL it opened on, whether it is open and the form drawn under
 * its table, null while none is; `openSources(form)` opens the modal with
 * that form or none, `closeForm` drops the form and `closeSources` closes
 * the modal, each dropping the hand-off from the route while the form was
 * the hand-off's and calling `onReset` first. A `seedUrl` the route hands
 * opens the modal with `seedOf(seedUrl)` as the form.
 *
 * @param {Object} options - The page's reading of the route
 * @param {string} options.seedUrl - The URL of a `source` hand-off, empty while the route carries none
 * @param {Function} options.seedOf - The form of a handed URL, without its `handoff` flag
 * @param {Function} options.dropHandoff - Drops the hand-off from the route
 * @param {Function} [options.onReset] - Called before every change of the panel
 * @returns {{ panel: Object, openSources: Function, closeForm: Function, closeSources: Function }} The panel
 */
export const useSourcesPanel = ({ seedUrl, seedOf, dropHandoff, onReset = null }) => {
  const [panel, setPanel] = useState(CLOSED);
  if (panel.url !== seedUrl) {
    const seed = seedUrl ? { ...seedOf(seedUrl), handoff: true } : null;
    setPanel({ url: seedUrl, open: seed !== null || panel.open, form: seed });
  }
  const reset = () => {
    if (onReset) {
      onReset();
    }
  };
  const dropHanded = () => {
    if (panel.form?.handoff) {
      dropHandoff();
    }
  };
  return {
    panel,
    openSources: form => {
      reset();
      setPanel(current => ({ ...current, open: true, form }));
    },
    closeForm: () => {
      dropHanded();
      reset();
      setPanel(current => ({ ...current, form: null }));
    },
    closeSources: () => {
      dropHanded();
      reset();
      setPanel(current => ({ ...current, open: false, form: null }));
    },
  };
};

/**
 * The listing of a host's Provisioners or Templates page: the one
 * `Listing` over `collections` with the heading of the title, the Add
 * state's word or the count, Add, the page's `pane` and the view toggle,
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
  const { t } = useTranslation();
  const presses = useContext(ManageRefreshContext);
  const heading = ({ count, toggle, filters, setFilter }) => {
    const actions = (
      <>
        <AddButton filters={filters} setFilter={setFilter} />
        {pane}
        {toggle}
      </>
    );
    return (
      <SectionHeading title={title} count={headingCountOf(filters, count, t)} actions={actions} />
    );
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
