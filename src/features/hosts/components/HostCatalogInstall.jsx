import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaDownload, FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { itemShape, sortVersionsNewestFirst } from '../../../utils/itemShape';
import { boxes } from '../../collections/boxes';
import { cardBodyWith } from '../../collections/boxes/components/BoxCard';
import { provisionerCollection } from '../../collections/provisioners';
import { HyperweaverGlyph, deployableVersion } from '../../deploy';
import { versionNewer } from '../utils/manageCatalog';

import ToolFormDialog from './ToolFormDialog';

const WORDS = {
  held: 'hosts.manage.held.installed',
  missing: 'hosts.manage.held.notInstalled',
  fetchVersion: 'hosts.manage.held.installVersion',
  update: 'host.provisionerManagement.updateTo',
  updateAvailable: 'hosts.manage.held.updateAvailable',
};

const HELD_SORT = [{ column: 'status', direction: 'desc' }];

const NO_ENTRIES = { fetch: [], remove: [] };

const entryShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
});

const heldCtxShape = PropTypes.shape({
  held: PropTypes.shape({
    versionsOf: PropTypes.func.isRequired,
    busy: PropTypes.bool.isRequired,
    onFetch: PropTypes.func.isRequired,
    onAddSource: PropTypes.func,
    sourceWordKey: PropTypes.string,
    entriesOf: PropTypes.func,
    creates: PropTypes.bool,
    createRouteOf: PropTypes.func,
  }).isRequired,
  handed: PropTypes.shape({
    name: PropTypes.string.isRequired,
    organization: PropTypes.string,
    version: PropTypes.string,
  }),
});

const isHanded = (item, ctx) =>
  Boolean(ctx.handed) &&
  ctx.handed.name === item.name &&
  (!ctx.handed.organization || ctx.handed.organization === item.organization.name);

/**
 * What the host holds of one item: `held`, the versions it holds, and
 * `state`, `missing` while it holds none, `behind` while every version it
 * holds is older than the newest the source lists, and `current`
 * otherwise; `newest` is the version the source's newest deployable one.
 *
 * @param {Object} item - An item of the item shape
 * @param {Object} ctx - The listing context carrying `held`
 * @returns {{ state: string, newest: string, held: Array<string> }} The reading
 */
export const heldStateOf = (item, ctx) => {
  const held = ctx.held.versionsOf(item);
  const newest = deployableVersion(item.versions);
  if (held.length === 0) {
    return { state: 'missing', newest, held };
  }
  const behind = !held.includes(newest) && held.every(version => versionNewer(newest, version));
  return { state: behind ? 'behind' : 'current', newest, held };
};

/**
 * The version the control of one item acts on: the handed version while
 * the item is the handed one and the source lists it, else the newest.
 *
 * @param {Object} item - An item of the item shape
 * @param {Object} ctx - The listing context
 * @returns {string} The version
 */
export const fetchVersionOf = (item, ctx) => {
  const handed = isHanded(item, ctx) ? ctx.handed.version : '';
  return handed && item.versions.some(entry => entry.version === handed)
    ? handed
    : deployableVersion(item.versions);
};

const olderVersionsOf = (item, newest, held) =>
  sortVersionsNewestFirst(item.versions)
    .map(entry => entry.version)
    .filter(version => version !== newest && !held.includes(version));

/**
 * The dialog of Install an older version: one select of the versions the
 * host lacks under the newest; the submit hands the item and the picked
 * version to `ctx.held.onFetch`.
 */
const OlderVersionDialog = ({ item, ctx, versions, onClose }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState(versions[0] || '');
  return (
    <ToolFormDialog
      dialog="held-version"
      title={t('hosts.manage.held.installOlder')}
      submitKey="host.provisionerManagement.install"
      busy={ctx.held.busy}
      disabled={!picked}
      onClose={onClose}
      onSubmit={() => {
        ctx.held.onFetch(item, picked);
        onClose();
      }}
    >
      <label className="form-label" htmlFor="held-version">
        {t('host.templatesManagement.version')}
      </label>
      <select
        id="held-version"
        className="form-select"
        value={picked}
        onChange={event => setPicked(event.target.value)}
      >
        {versions.map(version => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
      </select>
    </ToolFormDialog>
  );
};

OlderVersionDialog.propTypes = {
  item: itemShape.isRequired,
  ctx: heldCtxShape.isRequired,
  versions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
};

const menuOf = ({ item, ctx, state, newest, held, version, t, onOlder }) => {
  if (state === 'missing') {
    return {
      fetch: [
        {
          key: 'install',
          action: 'held-install',
          label: t(WORDS.fetchVersion, { version }),
          onClick: () => ctx.held.onFetch(item, version),
        },
        ...(olderVersionsOf(item, version, held).length > 0
          ? [
              {
                key: 'older',
                action: 'held-older',
                label: t('hosts.manage.held.installOlder'),
                onClick: onOlder,
              },
            ]
          : []),
        ...(ctx.held.onAddSource && ctx.held.sourceWordKey
          ? [
              {
                key: 'source',
                action: 'held-add-source',
                label: t(ctx.held.sourceWordKey),
                onClick: () => ctx.held.onAddSource(item),
              },
            ]
          : []),
      ],
      remove: [],
    };
  }
  const own = ctx.held.entriesOf ? ctx.held.entriesOf(item) : NO_ENTRIES;
  return {
    fetch: [
      ...(state === 'behind'
        ? [
            {
              key: 'update',
              action: 'held-update',
              label: t(WORDS.update, { version: newest }),
              onClick: () => ctx.held.onFetch(item, newest),
            },
          ]
        : []),
      ...own.fetch,
    ],
    remove: own.remove,
  };
};

const MenuEntry = ({ entry, busy }) => (
  <Dropdown.Item
    as="button"
    type="button"
    data-action={entry.action}
    onClick={entry.onClick}
    disabled={busy}
  >
    {entry.label}
  </Dropdown.Item>
);

MenuEntry.propTypes = {
  entry: entryShape.isRequired,
  busy: PropTypes.bool.isRequired,
};

/**
 * The one control of an item in the Deploy glyph's place, the split
 * control: the Hyperweaver glyph at full colour as the Install press
 * while the host holds none of the item, at full colour with a small
 * exclamation dot as the Update press while it holds an older version,
 * and greyed and disabled while it holds the newest; beside it the
 * chevron opening the menu headed by the newest version, a missing item
 * offering Install, Install an older version and Add this catalog or
 * registry as a source, a held one Update to while behind and then the
 * page's own fetch entries, a divider, and its delete entries. A press
 * hands the item and the version to `ctx.held.onFetch`, held while
 * `ctx.held.busy`.
 */
export const HeldControl = ({ item, ctx }) => {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const { state, newest, held } = heldStateOf(item, ctx);
  const version = fetchVersionOf(item, ctx);
  if (!version) {
    return null;
  }
  const behind = state === 'behind';
  const current = state === 'current';
  const menu = menuOf({
    item,
    ctx,
    state,
    newest,
    held,
    version,
    t,
    onOlder: () => setPicking(true),
  });
  const title = behind
    ? t(WORDS.update, { version: newest })
    : t(current ? WORDS.held : WORDS.fetchVersion, { version });
  const glyph = current ? (
    <span
      className="deploy-glyph held-glyph d-inline-flex align-items-center opacity-50"
      aria-disabled="true"
      title={title}
      data-note="held-current"
    >
      <HyperweaverGlyph />
    </span>
  ) : (
    <button
      type="button"
      className="deploy-glyph held-glyph btn btn-link p-0 d-inline-flex align-items-center"
      title={title}
      aria-label={title}
      data-action={behind ? 'catalog-update' : 'catalog-install'}
      data-family={item.name}
      data-version={behind ? newest : version}
      data-note={behind ? 'update-available' : undefined}
      onClick={() => ctx.held.onFetch(item, behind ? newest : version)}
      disabled={ctx.held.busy}
    >
      <HyperweaverGlyph />
      {behind ? (
        <span className="glyph-dot" aria-hidden="true">
          !
        </span>
      ) : null}
    </button>
  );
  return (
    <>
      <Dropdown align="end" className="deploy-split card-above">
        {glyph}
        <Dropdown.Toggle
          as="button"
          type="button"
          bsPrefix="deploy-chevron"
          title={t('hosts.manage.held.more')}
          aria-label={t('hosts.manage.held.more')}
          data-action="held-more"
        >
          <FaChevronDown aria-hidden="true" />
        </Dropdown.Toggle>
        <Dropdown.Menu data-menu="held">
          <Dropdown.Header>{t('hosts.manage.held.version', { version: newest })}</Dropdown.Header>
          {menu.fetch.map(entry => (
            <MenuEntry key={entry.key} entry={entry} busy={ctx.held.busy} />
          ))}
          {menu.fetch.length > 0 && menu.remove.length > 0 ? <Dropdown.Divider /> : null}
          {menu.remove.map(entry => (
            <MenuEntry key={entry.key} entry={entry} busy={ctx.held.busy} />
          ))}
        </Dropdown.Menu>
      </Dropdown>
      {picking ? (
        <OlderVersionDialog
          item={item}
          ctx={ctx}
          versions={olderVersionsOf(item, version, held)}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  );
};

HeldControl.propTypes = {
  item: itemShape.isRequired,
  ctx: heldCtxShape.isRequired,
};

/**
 * The two square outlined buttons of one version line: the download
 * glyph that installs that version onto the host, greyed and disabled,
 * titled Installed, on a version the host holds, and the Hyperweaver mark
 * that opens the create wizard with that version while the host creates
 * machines; the install hands the item and the version to
 * `ctx.held.onFetch`.
 */
export const VersionHeld = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  if (!version) {
    return null;
  }
  const held = ctx.held.versionsOf(item).includes(version);
  const create =
    ctx.held.creates && ctx.held.createRouteOf ? ctx.held.createRouteOf(item, version) : '';
  const createTitle = t('hosts.manage.held.createWith', { version });
  return (
    <>
      <button
        type="button"
        className="btn btn-outline-secondary version-action"
        data-action={held ? undefined : 'version-install'}
        data-note={held ? 'installed' : undefined}
        data-family={item.name}
        data-version={version}
        title={t(held ? WORDS.held : WORDS.fetchVersion, { version })}
        aria-label={t(held ? WORDS.held : WORDS.fetchVersion, { version })}
        onClick={held ? undefined : () => ctx.held.onFetch(item, version)}
        disabled={held || ctx.held.busy}
      >
        <FaDownload aria-hidden="true" />
      </button>
      {create ? (
        <Link
          to={create}
          className="btn btn-outline-secondary version-action"
          title={createTitle}
          aria-label={createTitle}
          data-action="version-create"
          data-version={version}
        >
          <HyperweaverGlyph />
        </Link>
      ) : null}
    </>
  );
};

VersionHeld.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  ctx: heldCtxShape.isRequired,
};

const statusWordOf = (item, ctx) => {
  const { state } = heldStateOf(item, ctx);
  if (state === 'current') {
    return ctx.t(WORDS.held);
  }
  return state === 'behind' ? ctx.t(WORDS.updateAvailable) : '';
};

const HeldStatus = ({ item, ctx }) => {
  const { state } = heldStateOf(item, ctx);
  if (state === 'missing') {
    return null;
  }
  return (
    <span
      className={`badge ${state === 'behind' ? 'text-bg-warning' : 'text-bg-success'}`}
      data-note={state === 'behind' ? 'update-available' : 'installed'}
    >
      {statusWordOf(item, ctx)}
    </span>
  );
};

HeldStatus.propTypes = {
  item: itemShape.isRequired,
  ctx: heldCtxShape.isRequired,
};

/**
 * The Deploy column of a host's listing: the `HeldControl` of each item,
 * sorted by the version the control acts on.
 */
export const heldDeployColumn = {
  key: 'deploy',
  kind: 'badge',
  labelKey: 'pages.table.deploy',
  priority: 2,
  value: (item, ctx) => fetchVersionOf(item, ctx),
  render: (item, ctx) => <HeldControl item={item} ctx={ctx} />,
};

/**
 * The Status column of a host's listing: Installed on an item whose
 * newest version the host holds, Update available on one it holds an
 * older version of, nothing on one it lacks.
 */
export const heldStatusColumn = {
  key: 'status',
  kind: 'badge',
  labelKey: 'pages.table.status',
  priority: 4,
  value: statusWordOf,
  render: (item, ctx) => <HeldStatus item={item} ctx={ctx} />,
};

const HELD_GROUP = {
  key: 'held',
  labelKey: WORDS.held,
  values: (item, ctx) =>
    isHanded(item, ctx)
      ? ['held', 'missing']
      : [heldStateOf(item, ctx).state === 'missing' ? 'missing' : 'held'],
  activeClass: 'bg-primary',
  labelFor: (value, t) => t(WORDS[value]),
  order: ['held', 'missing'],
  defaultActive: ['held'],
};

const heldPick = (item, ctx) => ({
  held:
    heldStateOf(item, ctx).state === 'missing' &&
    !isHanded(item, ctx) &&
    Boolean(ctx.filters?.held) &&
    ctx.filters.held.size === 0,
});

const withStatus = columns => {
  if (columns.some(column => column.key === 'status')) {
    return columns.map(column => (column.key === 'status' ? heldStatusColumn : column));
  }
  const at = columns.findIndex(column => column.key === 'downloads');
  return [...columns.slice(0, at + 1), heldStatusColumn, ...columns.slice(at + 1)];
};

/**
 * Whether the panel's Installed group is on the missing entries alone,
 * the Add state of a host's listing.
 *
 * @param {Object<string, Set>} filters - The collection's active sets by group key
 * @returns {boolean} True in the Add state
 */
export const addingOf = filters =>
  Boolean(filters?.held) && filters.held.size === 1 && filters.held.has('missing');

/**
 * The active set of the held group after a press of Add: the missing
 * entries alone, or back to the held ones from the Add state.
 *
 * @param {Object<string, Set>} filters - The collection's active sets by group key
 * @returns {Set<string>} The next active set
 */
export const toggledAddOf = filters =>
  addingOf(filters) ? new Set(['held']) : new Set(['missing']);

/**
 * One press of a host listing's heading pane: the glyph alone, its
 * label as the tooltip and the accessible name; `pressed` draws it as a
 * toggle that is on.
 */
export const PaneButton = ({
  icon: Icon,
  labelKey,
  action,
  onClick,
  busy = false,
  variant = 'outline-secondary',
  pressed = null,
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`btn btn-sm btn-${variant}${pressed ? ' active' : ''}`}
      data-action={action}
      title={t(labelKey)}
      aria-label={t(labelKey)}
      aria-pressed={pressed === null ? undefined : pressed}
      onClick={onClick}
      disabled={busy}
    >
      <Icon aria-hidden="true" />
    </button>
  );
};

PaneButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  busy: PropTypes.bool,
  variant: PropTypes.string,
  pressed: PropTypes.bool,
};

/**
 * The Add press of a host's listing heading: on while the panel's held
 * group is on the missing entries alone, a press flipping the group there
 * and back.
 */
export const AddButton = ({ filters, setFilter }) => (
  <PaneButton
    icon={FaPlus}
    labelKey="hosts.manage.held.add"
    action="catalog-add"
    variant="primary"
    pressed={addingOf(filters)}
    onClick={() => setFilter('held', toggledAddOf(filters))}
  />
);

AddButton.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilter: PropTypes.func.isRequired,
};

/**
 * The muted text after a host's listing title: Add while the held group
 * is on the missing entries alone, else the count the binding left.
 *
 * @param {Object<string, Set>} filters - The collection's active sets by group key
 * @param {number|null} count - The items left, null until they answered
 * @param {Function} t - The translator
 * @returns {string|number|null} The text
 */
export const headingCountOf = (filters, count, t) =>
  addingOf(filters) ? t('hosts.manage.held.add') : count;

const withHeld = collection => ({
  ...collection,
  columns: withStatus(collection.columns),
  filterGroups: [...collection.filterGroups, HELD_GROUP],
  defaultSort: HELD_SORT,
  rowPick: heldPick,
});

/**
 * The catalog's provisioners collection as a host draws it: the held
 * control in the Deploy glyph's place and the two version buttons on each
 * version line, the Status column after Downloads, the Installed group on
 * by default, the status the default sort descending so the installed
 * families come first, and a missing family greyed while the group
 * narrows nothing.
 *
 * @param {Object} options - What differs per host
 * @param {Object} options.adapter - The adapter of `hostCatalogAdapter`
 * @returns {Object} The collection
 */
export const heldProvisionerCollection = ({ adapter }) =>
  withHeld(
    provisionerCollection({
      adapter,
      itemRoute: false,
      actionColumn: heldDeployColumn,
      CardGlyph: HeldControl,
      VersionAction: VersionHeld,
    })
  );

/**
 * BoxVault's boxes collection as a host draws it over its registries: no
 * item pages, no bulk actions and no write slots, the held control in the
 * Deploy glyph's place, the box card body with the two version buttons on
 * each version line, the Status column in BoxVault's status column's
 * place, the Installed group on by default, the status the default sort
 * descending so the installed boxes come first, and a missing box greyed
 * while the group narrows nothing.
 *
 * @param {Object} options - What differs per host
 * @param {Object} options.adapter - The adapter of `remoteBoxesAdapter`
 * @returns {Object} The collection
 */
export const heldBoxesCollection = ({ adapter }) =>
  withHeld({
    key: boxes.key,
    labelKey: boxes.labelKey,
    countKey: boxes.countKey,
    icon: boxes.icon,
    segment: boxes.segment,
    hasVersions: boxes.hasVersions,
    hasProviders: boxes.hasProviders,
    itemRoute: false,
    searchKey: boxes.searchKey,
    defaultView: 'cards',
    adapter,
    canManage: () => false,
    filterGroups: boxes.filterGroups,
    columns: boxes.columns.map(column => (column.key === 'deploy' ? heldDeployColumn : column)),
    levels: boxes.levels,
    slots: {
      CardGlyph: HeldControl,
      CardBody: cardBodyWith({ VersionAction: VersionHeld, Glyph: HeldControl }),
    },
  });
