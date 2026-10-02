import { client } from '../../../lib/runtime';

const boxPath = (orgSlug, boxName = '') =>
  `/api/boxvault/api/organization/${encodeURIComponent(orgSlug)}/box${
    boxName ? `/${encodeURIComponent(boxName)}` : ''
  }`;

/**
 * Every public box of every organization, `GET /api/boxvault/api/discover`
 * through the server's per-user BoxVault proxy, which rides the signed-in
 * person's own OIDC token: 503 while the integration is unconfigured and
 * 403 for a session that is not federated.
 *
 * @returns {Promise<Array<Object>>} The boxes, each with its versions, providers and architectures
 */
export const discoverBoxes = () => client.get('/api/boxvault/api/discover');

/**
 * An organization's boxes, the private ones included where the person's
 * token grants them, `GET /api/boxvault/api/organization/{slug}/box`.
 *
 * @param {string} orgSlug - BoxVault's organization slug
 * @returns {Promise<Array<Object>>} The boxes
 */
export const listOrgBoxes = orgSlug => client.get(boxPath(orgSlug));

/**
 * One box's detail, its versions, providers, architectures and files with
 * their checksums, `GET /api/boxvault/api/organization/{slug}/box/{name}`.
 *
 * @param {string} orgSlug - BoxVault's organization slug
 * @param {string} boxName - The box name
 * @returns {Promise<Object>} The box
 */
export const getBoxDetail = (orgSlug, boxName) => client.get(boxPath(orgSlug, boxName));

/**
 * A signed download link for one box file, minted by BoxVault for about an
 * hour, `POST .../file/get-download-link`, the URL the create spec carries
 * as `settings.box_url` so the agent downloads with no credential.
 *
 * @param {Object} ref - `orgSlug`, `boxName`, `version`, `provider` and `architecture`
 * @returns {Promise<string|null>} The download URL, or null when the answer names none
 */
export const getBoxDownloadLink = ({ orgSlug, boxName, version, provider, architecture }) =>
  client
    .post(
      `${boxPath(orgSlug, boxName)}/version/${encodeURIComponent(version)}/provider/${encodeURIComponent(provider)}/architecture/${encodeURIComponent(architecture)}/file/get-download-link`,
      {}
    )
    .then(data => data?.downloadUrl || null);
