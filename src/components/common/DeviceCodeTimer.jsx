import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthAlert } from './AuthShell';
import { useCountdown } from './Countdown';

const ACTIVATE = '/activate';
const NOT_FOUND = 404;
const NONE = { code: '', clientName: '', seconds: 0, since: 0, answered: false, gone: false };

/**
 * The device code a return path carries: the `user_code` of a path whose
 * page is `/activate`, empty for any other path.
 *
 * @param {string} path - A path with its query, such as the remembered return path
 * @returns {string} The device code, or empty
 */
export const userCodeOf = path => {
  const [pathname, query = ''] = String(path || '')
    .split('#')[0]
    .split('?');
  return pathname === ACTIVATE ? new URLSearchParams(query).get('user_code') || '' : '';
};

/**
 * Seconds as minutes and seconds, `4:05`.
 *
 * @param {number} seconds - The seconds left
 * @returns {string} The clock text
 */
export const timeLeftOf = seconds =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * What the identity provider says of a device code: `read(code)` is called
 * once per non-empty `code`, its answer `{ client_name, expires_in_seconds }`
 * counted down through `useCountdown` from the moment it arrived; a `404`
 * and a count that reached zero are both `expired`, and `known` is false
 * until the code was answered either way.
 *
 * @param {(code: string) => Promise<Object>} read - The feature's call of `GET /api/auth/device`
 * @param {string} code - The device code, empty for none
 * @returns {{ clientName: string, remaining: number, expired: boolean, known: boolean }}
 */
export const useDeviceCode = (read, code) => {
  const [held, setHeld] = useState(NONE);

  useEffect(() => {
    if (!code) {
      return undefined;
    }
    let active = true;
    read(code)
      .then(answer => {
        if (active) {
          setHeld({
            code,
            clientName: answer.client_name,
            seconds: answer.expires_in_seconds,
            since: Date.now(),
            answered: true,
            gone: false,
          });
        }
      })
      .catch(error => {
        if (active) {
          setHeld({ ...NONE, code, gone: error.status === NOT_FOUND });
        }
      });
    return () => {
      active = false;
    };
  }, [read, code]);

  const current = held.code === code ? held : NONE;
  const remaining = useCountdown(current.seconds, current.since);

  return {
    clientName: current.clientName,
    remaining,
    expired: current.gone || (current.answered && remaining === 0),
    known: current.answered || current.gone,
  };
};

export const deviceCodeShape = PropTypes.shape({
  clientName: PropTypes.string.isRequired,
  remaining: PropTypes.number.isRequired,
  expired: PropTypes.bool.isRequired,
  known: PropTypes.bool.isRequired,
});

/**
 * The time a waiting device login has left, drawn from `useDeviceCode`:
 * the client's name with the time left beside it in a `role="timer"` span
 * that is never re-announced, the danger alert once the code has expired,
 * and nothing while the code is not known.
 */
const DeviceCodeTimer = ({ device }) => {
  const { t } = useTranslation(['auth']);
  if (!device.known) {
    return null;
  }
  if (device.expired) {
    return <AuthAlert tone="danger">{t('device.expired')}</AuthAlert>;
  }
  return (
    <div className="auth-alert-stack">
      <AuthAlert tone="info">{t('device.waiting', { client: device.clientName })}</AuthAlert>
      <span className="auth-alert-timer" role="timer" aria-live="off">
        {t('device.timeLeft', { time: timeLeftOf(device.remaining) })}
      </span>
    </div>
  );
};

DeviceCodeTimer.propTypes = {
  device: deviceCodeShape.isRequired,
};

export default DeviceCodeTimer;
