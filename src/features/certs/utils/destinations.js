import {
  createCert,
  createIdpCert,
  fetchCerts,
  fetchIdpCerts,
  removeCert,
  removeIdpCert,
  updateCert,
  updateIdpCert,
} from '../api/certsStore';

import { DETACHED, linkedRecord, ownMembersOf, recordOf } from './sync';

/**
 * The key of the identity provider's store in the `sync` preference and
 * in a row's own `sync` map.
 */
export const IDP = 'idp';

const keptHalves = (record, held) => ({
  private_der_b64: record.private_der_b64 ?? held.private_der_b64,
  secret: record.secret ?? held.secret,
});

/**
 * The serving backend as a destination of the mirror: its `/api/certs`,
 * a record linked to its row by `remote_id` with the row's organization,
 * creator and `synced_at`, a pulled row taking the record's place with
 * the record's id, origin, identity provider link and secret halves kept.
 */
export const BACKEND_DESTINATION = {
  fetch: fetchCerts,
  create: createCert,
  update: updateCert,
  remove: removeCert,
  idOf: record => record.remote_id || null,
  link: linkedRecord,
  unlink: DETACHED,
  merged: (row, held) => {
    const record = recordOf(row);
    return held
      ? {
          ...record,
          id: held.id,
          origin: held.origin,
          idp_id: held.idp_id ?? null,
          ...keptHalves(record, held),
        }
      : record;
  },
};

/**
 * The identity provider as a destination of the mirror: its
 * `/api/certs` at the issuer under the person's token, a record linked to
 * its row by `idp_id` alone, so the serving backend's members stay the
 * record's own, a pulled row taking the record's place with the record's
 * id, its backend members and its secret halves kept.
 */
export const IDP_DESTINATION = {
  fetch: fetchIdpCerts,
  create: createIdpCert,
  update: updateIdpCert,
  remove: removeIdpCert,
  idOf: record => record.idp_id || null,
  link: (record, row) => ({ ...record, idp_id: row.id }),
  unlink: { idp_id: null },
  merged: (row, held) => {
    const record = recordOf(row);
    return held
      ? {
          ...record,
          ...ownMembersOf(held),
          id: held.id,
          idp_id: row.id,
          ...keptHalves(record, held),
        }
      : { ...record, ...DETACHED, idp_id: row.id };
  },
};
