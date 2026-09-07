import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

/**
 * The seconds left of a wait the server answered: `seconds` counted from
 * `since` (the time the answer arrived), re-read four times a second while
 * any remain and zero after.
 *
 * @param {number} seconds - The server's `wait_seconds` or `resend_after_seconds`
 * @param {number} since - The `Date.now()` the answer arrived at
 * @returns {number} The seconds remaining
 */
export const useCountdown = (seconds, since) => {
  const [now, setNow] = useState(() => Date.now());
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const remaining = Math.max(0, seconds - elapsed);

  useEffect(() => {
    if (remaining <= 0) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [remaining, seconds, since]);

  return remaining;
};

/**
 * A seconds countdown that re-enables a control: `children` is a render
 * prop receiving the seconds remaining, zero once the wait is over.
 */
const Countdown = ({ seconds, since, children }) => children(useCountdown(seconds, since));

Countdown.propTypes = {
  seconds: PropTypes.number.isRequired,
  since: PropTypes.number.isRequired,
  children: PropTypes.func.isRequired,
};

export default Countdown;
