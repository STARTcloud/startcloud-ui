import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaGear, FaRegCircle, FaToggleOff, FaToggleOn } from 'react-icons/fa6';

import ContextMenu from '../../../components/layout/ContextMenu';
import { presenceOf } from '../utils/stores';

const storeShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  letter: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

const syncShape = PropTypes.shape({
  busy: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  settings: PropTypes.func,
});

const pointOf = event => {
  if (event.clientX || event.clientY) {
    return { x: event.clientX, y: event.clientY };
  }
  const box = event.currentTarget.getBoundingClientRect();
  return { x: box.left, y: box.bottom };
};

const markClass = (chip, equal) => {
  if (chip) {
    return `badge rounded-pill border-0 ${equal ? 'text-bg-success' : 'text-bg-light border'}`;
  }
  return `btn btn-link btn-sm p-0 ${equal ? 'text-success' : 'text-body-secondary'}`;
};

/**
 * One store's mark on one row: a check while the store holds the row's
 * newest copy, an empty mark otherwise, its letter before it as a chip
 * while `chip`; a click turns the store's sync off and removes its copy
 * from a check, and turns it on and writes the copy from an empty mark;
 * a right click, or the context-menu key on the focused mark, opens the
 * menu of Enable sync, Disable sync and Settings. `data-sync-state` reads
 * `equal`, `behind` or `none`.
 */
export const SyncMark = ({ row, store, sync, chip = false }) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(null);
  const state = presenceOf(row, store.key);
  const equal = state === 'equal';
  const label = t(equal ? 'certs.stores.turnOff' : 'certs.stores.turnOn', { store: store.name });
  const Glyph = equal ? FaCircleCheck : FaRegCircle;

  const openMenu = event => {
    event.preventDefault();
    setMenu({
      ...pointOf(event),
      title: store.name,
      items: [
        {
          key: 'enable',
          labelKey: 'certs.stores.enable',
          icon: FaToggleOn,
          onClick: () => sync.toggle(row, store.key, true),
        },
        {
          key: 'disable',
          labelKey: 'certs.stores.disable',
          icon: FaToggleOff,
          onClick: () => sync.toggle(row, store.key, false),
        },
        ...(sync.settings
          ? [
              { key: 'divider', divider: true },
              {
                key: 'settings',
                labelKey: 'certs.stores.settings',
                icon: FaGear,
                onClick: sync.settings,
              },
            ]
          : []),
      ],
    });
  };

  return (
    <>
      <button
        type="button"
        className={markClass(chip, equal)}
        data-action="sync-mark"
        data-store={store.key}
        data-sync-state={state}
        aria-pressed={equal}
        title={label}
        aria-label={label}
        disabled={sync.busy}
        onClick={() => sync.toggle(row, store.key, !equal)}
        onContextMenu={openMenu}
      >
        {chip ? <span className="me-1">{store.letter}</span> : null}
        <Glyph aria-hidden="true" />
      </button>
      {menu ? <ContextMenu menu={menu} onClose={() => setMenu(null)} /> : null}
    </>
  );
};

SyncMark.propTypes = {
  row: PropTypes.object.isRequired,
  store: storeShape.isRequired,
  sync: syncShape.isRequired,
  chip: PropTypes.bool,
};

/**
 * One narrow column a store over the rows of `unionOf`, headed by the
 * store's letter with its name as the tooltip, each cell the store's
 * `SyncMark` over `ctx.sync`, sorting by the mark's state.
 *
 * @param {Array<{ key: string, letter: string, name: string }>} stores - The stores drawn
 * @returns {Array<Object>} The columns
 */
export const syncColumnsOf = stores =>
  stores.map(store => ({
    key: `sync-${store.key}`,
    kind: 'badge',
    labelKey: 'certs.stores.column',
    label: store.letter,
    title: store.name,
    priority: 2,
    value: row => presenceOf(row, store.key),
    render: (row, ctx) => <SyncMark row={row} store={store} sync={ctx.sync} />,
  }));

/**
 * The cards' column of the stores: every store's mark on one row as a
 * small lettered chip.
 *
 * @param {Array<{ key: string, letter: string, name: string }>} stores - The stores drawn
 * @returns {Object} The column
 */
export const syncChipsColumnOf = stores => ({
  key: 'sync',
  kind: 'badges',
  labelKey: 'certs.stores.column',
  value: row => stores.map(store => `${store.letter} ${presenceOf(row, store.key)}`).join(' '),
  render: (row, ctx) => (
    <span className="d-inline-flex flex-wrap gap-1" data-list="sync-chips">
      {stores.map(store => (
        <SyncMark key={store.key} row={row} store={store} sync={ctx.sync} chip />
      ))}
    </span>
  ),
});
