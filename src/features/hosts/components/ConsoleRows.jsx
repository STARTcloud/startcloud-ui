import { useNavigate } from 'react-router-dom';

import { consoleDoorsOf, consoleRoute } from '../utils/consoles';

/**
 * The console commands of the machine Controls menu, one a console the
 * host's row lists, each opening the machine's page with that console in
 * its `console` query.
 *
 * @param {Object} options
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {boolean} options.busy - Whether an action is in flight
 * @returns {Array<Object>} The commands
 */
export const useConsoleCommands = ({ id, name, server, busy }) => {
  const navigate = useNavigate();
  return consoleDoorsOf(server).map(door => ({
    key: `console-${door.key}`,
    group: 'console',
    icon: door.icon,
    tone: 'text-info',
    labelKey: door.labelKey,
    action: `console-${door.key}`,
    disabled: busy,
    run: () => navigate(consoleRoute(id, name, door.key)),
  }));
};
