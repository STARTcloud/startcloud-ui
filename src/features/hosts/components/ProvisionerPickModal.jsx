import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { drawnColumns } from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useStatus } from '../../../contexts/StatusContext';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { itemShape } from '../../../utils/itemShape';
import ItemCards from '../../catalog/components/ItemCards';
import { provisionerCollection } from '../../collections/provisioners';
import { hostCatalogAdapter } from '../utils/hostCatalog';
import { compareVersions, highestVersionOf } from '../utils/machineCreate';

import { DialogTable } from './ManageTable';
import { FilterPills } from './PickDialogParts';

const NO_GROUPS = {};

const NO_ITEMS = [];

const noop = () => undefined;

const UNMEASURED = { tier: '', rules: {}, failedRules: [], boxes: {} };

const textOf = value => (typeof value === 'string' ? value : '');

const bareVersionOf = version => ({
  version,
  createdAt: null,
  description: '',
  releaseNotes: null,
  deprecated: false,
  deprecationReason: null,
  providers: [],
  artifacts: [],
  extras: UNMEASURED,
});

const bareItemOf = (family, owner) => ({
  id: `${owner}/${family.name}`,
  organization: { name: owner },
  name: family.name,
  label: textOf(family.metadata?.label) || family.name,
  description: textOf(family.metadata?.description) || textOf(family.description),
  icon: '',
  artwork: '',
  isPublic: true,
  published: null,
  createdAt: null,
  latestReleaseAt: null,
  downloads: null,
  os: null,
  metadata: null,
  readme: null,
  links: {},
  extras: {
    repo: '',
    tier: 'unrated',
    rules: {},
    failedRules: [],
    artifactsOk: true,
    sidecarsOk: true,
    coverage: { counts: {}, total: 0 },
  },
  versions: [],
});

const heldVersionsOf = family => [
  ...new Set(
    (Array.isArray(family.versions) ? family.versions : [])
      .map(entry => entry?.version)
      .filter(Boolean)
  ),
];

/**
 * The provisioner items a host holds, one a family of
 * `GET provisioning/provisioners`: the item the Provisioners page's
 * adapter lists for the family, else an unrated item under `owner` with
 * no links, each carrying the versions the host holds alone, highest
 * first, a held version the catalog lists drawn with its catalog entry.
 *
 * @param {Array<Object>} families - The host's families
 * @param {Array<Object>} listed - The items of `hostCatalogAdapter`
 * @param {string} owner - The organization name of a family no catalog lists
 * @returns {Array<Object>} The items
 */
export const heldProvisionerItemsOf = (families, listed, owner) =>
  (Array.isArray(families) ? families : []).map(family => {
    const base =
      (Array.isArray(listed) ? listed : []).find(item => item.name === family.name) ||
      bareItemOf(family, owner);
    const entries = new Map(base.versions.map(entry => [entry.version, entry]));
    const versions = heldVersionsOf(family).sort((left, right) => compareVersions(right, left));
    return {
      ...base,
      label: textOf(family.metadata?.label) || base.label,
      versions: versions.map(version => entries.get(version) || bareVersionOf(version)),
    };
  });

const PickFamily = ({ item, ctx }) => {
  const { t } = useTranslation();
  const version = highestVersionOf(item.versions.map(entry => entry.version));
  if (!version) {
    return null;
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="provisioner-pick"
      data-family={item.name}
      data-version={version}
      onClick={() => ctx.pick.onPick(item.name, version)}
      disabled={ctx.pick.busy}
    >
      {t('machineEdit.provisionerPick.pickVersion', { version })}
    </button>
  );
};

PickFamily.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

const PickVersion = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary py-0"
      data-action="provisioner-pick-version"
      data-family={item.name}
      data-version={version}
      onClick={() => ctx.pick.onPick(item.name, version)}
      disabled={ctx.pick.busy}
    >
      {t('machineEdit.provisionerPick.pick')}
    </button>
  );
};

PickVersion.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
};

const pickColumn = {
  key: 'pick',
  kind: 'badge',
  labelKey: 'host.templatesManagement.version',
  priority: 2,
  value: item => highestVersionOf(item.versions.map(entry => entry.version)),
  render: (item, ctx) => <PickFamily item={item} ctx={ctx} />,
};

const plainLabel = column =>
  column.key === 'label' ? { ...column, render: item => item.label || item.name } : column;

const familyPickOf = (item, ctx) => {
  const version = highestVersionOf(item.versions.map(entry => entry.version));
  return version
    ? { press: () => ctx.pick.onPick(item.name, version), action: 'pick-family' }
    : null;
};

/**
 * The Provisioners page's collection with the Pick actions in the held
 * controls' place: the provisioners collection over the page's own
 * adapter, `hostCatalogAdapter`, the card's glyph and the Version column
 * the family's Pick, each version line the version's Pick, and its
 * `rowPick` making the whole card and the whole row the press that picks
 * the family at its highest version, `pick-family` as its `data-action`.
 *
 * @param {Object} adapter - The adapter of `hostCatalogAdapter`
 * @returns {Object} The collection
 */
export const pickProvisionerCollection = adapter => ({
  ...provisionerCollection({
    adapter,
    itemRoute: false,
    actionColumn: pickColumn,
    CardGlyph: PickFamily,
    VersionAction: PickVersion,
  }),
  rowPick: familyPickOf,
});

const filterSpecsOf = collection =>
  collection.filterGroups.map(group => ({ labelFor: value => value, ...group }));

const itemKey = item => item.id;

const useListed = adapter => {
  const [listed, setListed] = useState({ adapter: null, items: NO_ITEMS });
  useEffect(() => {
    let mounted = true;
    adapter
      .listAll()
      .catch(() => NO_ITEMS)
      .then(items => {
        if (mounted) {
          setListed({ adapter, items });
        }
      });
    return () => {
      mounted = false;
    };
  }, [adapter]);
  return { loaded: listed.adapter === adapter, items: listed.items };
};

/**
 * Pick provisioner, the dialog the General step's Pick provisioner opens,
 * the Provisioners page's listing in the pattern of the artifact pick
 * dialog: the provisioners collection of `pickProvisionerCollection`
 * over the page's adapter, read once as the dialog opens over the host's
 * catalog `sources`, drawn through the listing's own card grid and table,
 * narrowed to the families the host holds, each with the versions it
 * holds highest first, a held family no catalog lists drawn unrated; the
 * dialog's own search, the tier and provider pills and the table or cards
 * toggle; a press on a card or a row, or its Pick, hands the family and
 * its highest version by semantic order to `onPick`, a version line's
 * Pick that version. `picked`
 * names the family and the version the wizard holds, whose card opens on
 * that version. The dialog carries `provisioner-pick` as `data-dialog`.
 */
const ProvisionerPickModal = ({
  status: hostStatus,
  id,
  sources,
  families,
  owner,
  picked = null,
  busy = false,
  onPick,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('cards');
  const collection = useMemo(
    () => pickProvisionerCollection(hostCatalogAdapter({ status: hostStatus, id, sources })),
    [hostStatus, id, sources]
  );
  const listed = useListed(collection.adapter);
  const items = useMemo(
    () => heldProvisionerItemsOf(families, listed.items, owner),
    [families, listed.items, owner]
  );
  const needle = query.trim().toLowerCase();
  const searched = needle ? items.filter(item => collection.matches(item, needle)) : items;
  const filters = useClientFilters({ specs: filterSpecsOf(collection), rows: searched });
  const filtering = Boolean(needle) || filters.active;
  const ctx = {
    t,
    language: i18n.language,
    status,
    user: null,
    collection,
    orgMark: null,
    groupedBy: '',
    filtering,
    handed: picked?.name ? { name: picked.name, version: picked.version || '' } : null,
    pick: { busy, onPick },
  };
  const emptyText = t(filtering ? 'pages.noMatches' : 'machineEdit.provisionerPick.none');
  const rowPick = item => collection.rowPick(item, ctx);
  return (
    <Modal show onHide={onClose} size="xl" scrollable>
      <div data-dialog="provisioner-pick">
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('machineEdit.provisionerPick.title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <input
              className="form-control form-control-sm w-auto"
              type="search"
              placeholder={t('provisioners.search.placeholder')}
              aria-label={t('provisioners.search.placeholder')}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
            <FilterPills groups={filters.groups} />
            <span className="ms-auto">
              <ViewToggle view={view} onChange={setView} />
            </span>
          </div>
          <div
            data-table="provisioner-pick"
            data-view={view}
            data-state={listed.loaded ? 'ready' : 'loading'}
          >
            {!listed.loaded ? <p className="text-muted mb-0">{t('pages.loading')}</p> : null}
            {listed.loaded && view === 'cards' ? (
              <ItemCards
                collection={collection}
                items={filters.rows}
                groups={null}
                collapsed={NO_GROUPS}
                onToggleGroup={noop}
                rowPick={rowPick}
                ctx={ctx}
                emptyBody={emptyText}
              />
            ) : null}
            {listed.loaded && view === 'table' ? (
              <DialogTable
                name="provisioner-pick-table"
                columns={drawnColumns(collection.columns.map(plainLabel), filters.rows, ctx)}
                rows={filters.rows}
                rowKey={itemKey}
                rowPick={rowPick}
                ctx={ctx}
                emptyText={emptyText}
              />
            ) : null}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('pages.confirm.cancel')}
          </button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

ProvisionerPickModal.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  sources: PropTypes.array.isRequired,
  families: PropTypes.array.isRequired,
  owner: PropTypes.string.isRequired,
  picked: PropTypes.shape({
    name: PropTypes.string.isRequired,
    version: PropTypes.string,
  }),
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ProvisionerPickModal;
