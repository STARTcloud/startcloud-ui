import { publicItemsFrom } from '../../collections/provisioners';
import { fetchCatalog, fetchCatalogHealth, fetchRemoteTemplates } from '../api/provisioning';

import { remoteBoxItemsOf, sourceKeyOf } from './boxCatalog';

const defaultFirst = sources =>
  [...sources].sort((a, b) => Number(Boolean(b.default)) - Number(Boolean(a.default)));

const withSource = (items, source) =>
  items.map(item => ({ ...item, extras: { ...item.extras, source } }));

const firstOfEachId = lists => {
  const seen = new Set();
  return lists.flat().filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

/**
 * The adapter the host's Provisioners page lists through, the catalog
 * site's items read from what the host relays of every catalog source,
 * the default source first: `GET provisioning/catalog` and
 * `GET provisioning/catalog/health` with each source's id, a source that
 * publishes no health drawing its families unrated, a source that
 * answers nothing drawing none, a family two sources list drawn once
 * from the first; each item carries its source as `extras.source`,
 * `{ key, url }`. No watches, no bulk actions and no item pages.
 *
 * @param {Object} options - The host and its sources
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Array<Object>} options.sources - The rows of `GET provisioning/catalog/sources`
 * @returns {Object} The adapter
 */
export const hostCatalogAdapter = ({ status, id, sources }) => {
  const listAll = () =>
    Promise.all(
      defaultFirst(sources).map(source =>
        Promise.all([
          fetchCatalog(status, id, source.id),
          fetchCatalogHealth(status, id, source.id).catch(() => null),
        ])
          .then(([catalog, health]) =>
            withSource(publicItemsFrom({ catalog, health }), { key: source.id, url: source.url })
          )
          .catch(() => [])
      )
    ).then(firstOfEachId);
  return {
    listAll,
    listOrg: listAll,
  };
};

/**
 * The adapter the host's Templates page lists through, BoxVault's boxes
 * read from what the host relays of every enabled box registry, the
 * default registry first, `GET templates/remote/{source}` for each, a
 * registry that answers nothing drawing none, a box two registries list
 * drawn once from the first; each item carries its registry as
 * `extras.source`, `{ key, url }`. No watches, no bulk actions and no
 * item pages.
 *
 * @param {Object} options - The host and its registries
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Array<Object>} options.sources - The rows of `GET templates/sources`
 * @returns {Object} The adapter
 */
export const remoteBoxesAdapter = ({ status, id, sources }) => {
  const listAll = () =>
    Promise.all(
      defaultFirst(sources.filter(source => source.enabled !== false)).map(source =>
        fetchRemoteTemplates(status, id, sourceKeyOf(source))
          .then(remoteBoxItemsOf)
          .then(items => withSource(items, { key: sourceKeyOf(source), url: source.url || '' }))
          .catch(() => [])
      )
    ).then(firstOfEachId);
  return {
    listAll,
    listOrg: listAll,
  };
};

/**
 * The versions the host holds of one catalog family, read from the rows
 * of `GET provisioning/provisioners`.
 *
 * @param {Array<Object>} families - The host's families
 * @param {Object} item - A provisioner of the item shape
 * @returns {Array<string>} The versions held
 */
export const heldFamilyVersionsOf = (families, item) =>
  (families.find(family => family.name === item.name)?.versions || [])
    .map(version => version.version)
    .filter(Boolean);

/**
 * The template rows the host holds of one registry box, read from the
 * rows of `GET templates`, matched by the organization and the box.
 *
 * @param {Array<Object>} templates - The host's templates
 * @param {Object} item - A box of the item shape
 * @returns {Array<Object>} The rows
 */
export const heldBoxTemplatesOf = (templates, item) =>
  templates.filter(
    template => template.organization === item.organization.name && template.box_name === item.name
  );

/**
 * The versions the host holds of one registry box, read from the rows of
 * `GET templates`, matched by the organization and the box.
 *
 * @param {Array<Object>} templates - The host's templates
 * @param {Object} item - A box of the item shape
 * @returns {Array<string>} The versions held
 */
export const heldBoxVersionsOf = (templates, item) => [
  ...new Set(
    heldBoxTemplatesOf(templates, item)
      .map(template => template.version)
      .filter(Boolean)
  ),
];
