import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  addCatalogSource,
  fetchCatalog,
  fetchCatalogSources,
  installFromCatalog,
} from '../api/provisioning';
import {
  catalogSourceBody,
  catalogVersionOf,
  installOfferOf,
  seedFamilyOf,
} from '../utils/machineCreate';
import { hostStreamsTasks } from '../utils/machineTools';

import { useTaskRow } from './useHostManage';

const IDLE = { state: '', offer: null, message: '' };

const AUTHENTICATION = 'authentication';

const needsSignIn = error =>
  error?.status === 401 && String(error?.problem?.type || '').endsWith(AUTHENTICATION);

const sourceRowsOf = answer => (Array.isArray(answer?.sources) ? answer.sources : []);

const readCatalogs = (status, id, sources) =>
  Promise.all(
    sources.map(source =>
      fetchCatalog(status, id, source.id).then(
        catalog => ({ source, catalog, refused: false }),
        error => ({ source, catalog: null, refused: needsSignIn(error) })
      )
    )
  );

/**
 * The install of a handed provisioner family the host does not hold, the
 * Provisioning step's card: `looking` while the host's catalog sources and
 * each one's catalog are read, once, as the family is found missing;
 * `install` while a source lists the family and its version, `add` while
 * none does and the handed `provisioner_catalog` is no source of the host,
 * `missing` otherwise; `installing` from the press, the queued task's row
 * moving on `task-updated`; `signin` while the agent answers the handed
 * private catalog 401 with the `authentication` problem; `failed` with the
 * agent's word. The install press sends
 * `POST provisioning/catalog/install` with the source's id, the family and
 * the version, a 409 answer reading as already held; the add press first
 * sends `POST provisioning/catalog/sources` with the handed catalog, a
 * 409 answer naming the source already held; a completed task reads the
 * host's provisioners again through `onInstalled`, and a family still
 * missing after it fails. Nothing is offered on a host whose task ends
 * never reach the stream, and nothing runs on a clock.
 *
 * @param {Object} options - The host, the seed and the provisioners held
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The host's row
 * @param {Object|null} options.seed - The Deploy hand-off's seed
 * @param {Array<Object>} options.provisioners - The host's families
 * @param {boolean} options.loaded - Whether the families answered
 * @param {Function} options.onInstalled - Reads the host's families again, answering them
 * @returns {Object} `{ state, offered, noStream, name, version, message, row, install, retry }`
 */
export const useProvisionerInstall = ({
  status,
  id,
  server,
  seed,
  provisioners,
  loaded,
  onInstalled,
}) => {
  const [held, setHeld] = useState(IDLE);
  const looked = useRef(false);
  const name = seedFamilyOf(seed?.provisioner);
  const wanted = seed?.provisioner_version || '';
  const catalogUrl = seed?.provisioner_catalog || '';
  const streams = hostStreamsTasks(status, server);
  const missing = Boolean(name) && loaded && !provisioners.some(entry => entry.name === name);

  const fail = useCallback(message => setHeld({ state: 'failed', offer: null, message }), []);

  const settle = useCallback(
    () =>
      Promise.resolve(onInstalled()).then(families => {
        if ((families || []).some(entry => entry.name === name)) {
          setHeld(IDLE);
          return;
        }
        fail('');
      }),
    [onInstalled, name, fail]
  );

  const { row, watch, clear } = useTaskRow({
    id,
    onEnd: ended => {
      if (ended.status === 'completed') {
        settle();
        return;
      }
      fail(ended.error_message || ended.status);
    },
  });

  const look = useCallback(() => {
    setHeld({ state: 'looking', offer: null, message: '' });
    clear();
    return fetchCatalogSources(status, id)
      .then(answer => {
        const sources = sourceRowsOf(answer);
        return readCatalogs(status, id, sources).then(reads => {
          const refused = reads.find(read => read.refused && read.source.url === catalogUrl);
          if (refused) {
            setHeld({ state: 'signin', offer: null, message: '' });
            return;
          }
          const catalogs = Object.fromEntries(reads.map(read => [read.source.id, read.catalog]));
          const offer = installOfferOf({ sources, catalogs, name, version: wanted, catalogUrl });
          setHeld({ state: offer.kind, offer, message: '' });
        });
      })
      .catch(error => fail(error.message));
  }, [status, id, name, wanted, catalogUrl, clear, fail]);

  useEffect(() => {
    if (!missing || !streams || looked.current) {
      return;
    }
    looked.current = true;
    look();
  }, [missing, streams, look]);

  const queueInstall = useCallback(
    (source, version) =>
      installFromCatalog(status, id, { source_name: source, name, version }).then(
        answer => watch(answer),
        error => {
          if (error.status === 409) {
            return settle();
          }
          return fail(error.message);
        }
      ),
    [status, id, name, watch, settle, fail]
  );

  const addSource = useCallback(
    () =>
      addCatalogSource(status, id, catalogSourceBody(catalogUrl)).then(
        answer => answer?.source?.id || '',
        error => (error.status === 409 ? error.data?.source?.id || '' : Promise.reject(error))
      ),
    [status, id, catalogUrl]
  );

  const installAdded = useCallback(
    source =>
      fetchCatalog(status, id, source).then(catalog => {
        const version = catalogVersionOf(catalog, name, wanted);
        return version ? queueInstall(source, version) : fail('');
      }),
    [status, id, name, wanted, queueInstall, fail]
  );

  const install = useCallback(() => {
    const { offer } = held;
    if (!offer || (offer.kind !== 'install' && offer.kind !== 'add')) {
      return Promise.resolve();
    }
    setHeld(current => ({ ...current, state: 'installing' }));
    const queued =
      offer.kind === 'install'
        ? queueInstall(offer.source, offer.version)
        : addSource().then(source => (source ? installAdded(source) : fail('')));
    return queued.catch(error => {
      if (needsSignIn(error)) {
        setHeld({ state: 'signin', offer: null, message: '' });
        return;
      }
      fail(error.message);
    });
  }, [held, queueInstall, addSource, installAdded, fail]);

  const offered = missing && streams;

  return useMemo(
    () => ({
      state: offered ? held.state || 'looking' : '',
      offered,
      noStream: missing && !streams,
      name,
      version: held.offer?.version || wanted,
      message: held.message,
      row,
      install,
      retry: look,
    }),
    [offered, missing, streams, held, name, wanted, row, install, look]
  );
};
