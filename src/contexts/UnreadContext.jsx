import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UnreadContext = createContext(null);

const NO_PROVIDER = { unread: 0, set: () => undefined, adjust: () => undefined };

/**
 * The notifications feature's one context: the unread count the user
 * menu's row, the sidebar's Inbox badge, the modal and the inbox page
 * share, `set(count)` from a read or the `unread-count` event and
 * `adjust(delta)` after a row is read or deleted (`-Infinity` clears it),
 * so no router prop carries a callback to a page.
 */
export const UnreadProvider = ({ children }) => {
  const [unread, setUnread] = useState(0);
  const set = useCallback(count => setUnread(Math.max(0, Number(count) || 0)), []);
  const adjust = useCallback(
    delta => setUnread(count => (delta === -Infinity ? 0 : Math.max(0, count + delta))),
    []
  );
  const value = useMemo(() => ({ unread, set, adjust }), [unread, set, adjust]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
};

UnreadProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The shared unread count and its two writers; a component outside the
 * provider reads zero and its writes go nowhere.
 *
 * @returns {{ unread: number, set: Function, adjust: Function }}
 */
export const useUnread = () => useContext(UnreadContext) || NO_PROVIDER;
