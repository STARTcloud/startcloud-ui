import axios from 'axios';

/**
 * Whether a Hyperweaver origin answers: `GET <origin>/api/status` from the
 * browser, no session headers, resolving true on any answer the origin
 * gives as a status payload and false on a refusal, a failed request or a
 * body that names no role. It ends when the browser ends the request.
 *
 * @param {string} origin - The origin, no trailing slash
 * @returns {Promise<boolean>} True while the origin answers its status
 */
export const answersStatus = origin =>
  axios.get(`${origin}/api/status`).then(
    ({ data }) => typeof data?.role === 'string' && data.role !== '',
    () => false
  );
