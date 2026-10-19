import { catalogItemsFrom } from '../../collections/provisioners';
import {
  deleteArtifacts,
  fetchArtifacts,
  fetchCatalog,
  fetchCatalogHealth,
  fetchRemoteTemplates,
} from '../api/provisioning';

import { remoteBoxItemsOf, sourceKeyOf } from './boxCatalog';
import { artifactIdsOf, hostFilesOf } from './hostFiles';
import { ARTIFACT_PAGE_SIZE } from './manageCatalog';

const defaultFirst = sources =>
  sources
    .filter(source => source.enabled !== false)
    .sort((a, b) => Number(Boolean(b.default)) - Number(Boolean(a.default)));

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

const REFUSED_KEY = 'hosts.manage.held.sourceRefused';

const refusedOf = (source, error) =>
  error?.status === 401 ? { name: source.name || source.id, message: error.message || '' } : null;

const withRefused = answers => {
  const items = firstOfEachId(answers.map(answer => answer.items));
  const refused = answers.map(answer => answer.refused).filter(Boolean);
  if (refused.length > 0) {
    items.notice = {
      type: 'warning',
      key: REFUSED_KEY,
      values: { sources: refused.map(entry => `${entry.name}: ${entry.message}`).join('; ') },
    };
  }
  return items;
};

/**
 * The adapter the host's Provisioners page lists through, the catalog
 * site's items read from what the host relays of every enabled catalog
 * source, the default source first: `GET provisioning/catalog` and
 * `GET provisioning/catalog/health` with each source's id, the host
 * reading each as the signed-in person whenever it holds their token, a
 * private entry the folded document carries drawn under its own
 * organization, a source that publishes no health drawing its families
 * unrated, a source that answers nothing drawing none, a source that
 * answers 401 drawing none and naming itself with the agent's message in
 * the items' `notice`, a family two sources list drawn once from the
 * first; each item carries its source as `extras.source`, `{ key, url }`.
 * No watches, no bulk actions and no item pages.
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
          .then(([catalog, health]) => ({
            items: withSource(catalogItemsFrom({ catalog, health }), {
              key: source.id,
              url: source.url,
            }),
            refused: null,
          }))
          .catch(error => ({ items: [], refused: refusedOf(source, error) }))
      )
    ).then(withRefused);
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
 * drawn once from the first, each box's organization logo resolved
 * against its registry's URL; each item carries its registry as
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
      defaultFirst(sources).map(source =>
        fetchRemoteTemplates(status, id, sourceKeyOf(source))
          .then(payload => remoteBoxItemsOf(payload, source.url || ''))
          .then(items => withSource(items, { key: sourceKeyOf(source), url: source.url || '' }))
          .catch(() => [])
      )
    ).then(firstOfEachId);
  return {
    listAll,
    listOrg: listAll,
  };
};

const artifactPages = (status, id, offset = 0) =>
  fetchArtifacts(status, id, { limit: ARTIFACT_PAGE_SIZE, offset }).then(answer => {
    const page = Array.isArray(answer?.artifacts) ? answer.artifacts : [];
    return Boolean(answer?.pagination?.has_more) && page.length > 0
      ? artifactPages(status, id, offset + page.length).then(rest => [...page, ...rest])
      : page;
  });

/**
 * The adapter the host's Installer files page lists through, every
 * artifact row of the host's cache as a file item, `GET artifacts` read
 * page by page until the agent answers no more, the rows held for the
 * writes; `bulk('items', 'delete', names, scope, { delete_files })`
 * sends `DELETE artifacts/files` with the ids of the named rows and
 * answers the bulk result shape. No watches and no item pages.
 *
 * @param {Object} options - The host
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @returns {Object} The adapter
 */
export const hostFilesAdapter = ({ status, id }) => {
  let held = [];
  const listAll = () =>
    artifactPages(status, id).then(rows => {
      held = hostFilesOf(rows);
      return held;
    });
  const bulk = (...args) => {
    const [, action, names, , extra = {}] = args;
    const ids = artifactIdsOf(held, names);
    if (action !== 'delete' || ids.length === 0) {
      return Promise.resolve({ processed: 0, skipped: names.length, errors: [] });
    }
    return deleteArtifacts(status, id, {
      artifact_ids: ids,
      delete_files: Boolean(extra.delete_files),
    }).then(() => ({ processed: ids.length, skipped: 0, errors: [] }));
  };
  return {
    listAll,
    listOrg: listAll,
    bulk,
    rows: () => held,
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
