import { lazy, useMemo } from 'react';
import { FaListCheck, FaRotate, FaSliders, FaTerminal } from 'react-icons/fa6';

import { hasFeatureStrict } from '../../utils/capabilities';

import { useFocus } from './hooks/useFocus';
import { requestTasksRefresh } from './hooks/useTasks';
import { openTerminalPrefs, requestTerminalRestart } from './hooks/useTerminal';

const ShellPane = lazy(() => import('./components/ShellPane'));
const TasksPane = lazy(() => import('./components/TasksPane'));
const TasksTools = lazy(() => import('./components/TasksTools'));

const SHELL_ROWS = [
  {
    key: 'restart',
    labelKey: 'footer.pane.restartShell',
    icon: FaRotate,
    onClick: requestTerminalRestart,
  },
  {
    key: 'preferences',
    labelKey: 'footer.terminal.title',
    icon: FaSliders,
    onClick: openTerminalPrefs,
  },
];

const TASKS_ROWS = [
  {
    key: 'refresh',
    labelKey: 'footer.tasks.menuRefresh',
    icon: FaRotate,
    onClick: requestTasksRefresh,
  },
];

const SHELL_VIEW = {
  key: 'shell',
  labelKey: 'footer.pane.shell',
  icon: FaTerminal,
  Component: ShellPane,
  menu: SHELL_ROWS,
  dropUp: SHELL_ROWS,
};

const TASKS_VIEW = {
  key: 'tasks',
  labelKey: 'footer.pane.tasks',
  icon: FaListCheck,
  Component: TasksPane,
  tools: TasksTools,
  menu: TASKS_ROWS,
};

const listsToken = (focus, token) => focus.kind === 'host' && focus.features.includes(token);

/**
 * The views the footer's pane offers for the host in focus, in the order
 * the row draws their toggles: the shell view while the focus is one
 * host that lists `host-terminal`, its rows Restart shell and Terminal
 * preferences on the right-click menu and on the toggle's drop-up alike,
 * and the tasks view while the focus lists `tasks` or, with every host
 * in focus, while any host does, its tools Refresh, the priority
 * filter and the Columns picker and its menu row Refresh. An empty list means no pane.
 *
 * @returns {Array<Object>} The views, `[{ key, labelKey, icon, Component, tools?, menu?, dropUp? }]`
 */
export const useFooterViews = () => {
  const focus = useFocus();
  const shell = listsToken(focus, 'host-terminal');
  const tasks = focus.kind === 'all' ? focus.hosts.length > 0 : listsToken(focus, 'tasks');
  return useMemo(
    () => [...(shell ? [SHELL_VIEW] : []), ...(tasks ? [TASKS_VIEW] : [])],
    [shell, tasks]
  );
};

/**
 * The hosts feature's `footerPane` export of the navbar contract's Footer
 * status section: nothing unless the host advertises `hosts` and a person
 * is signed in; else the hook the chrome calls for the pane's views,
 * which follow the host in focus, the one serving agent on an agent role
 * and the host the route names on the server role.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Function|null} The views hook, or null for no pane
 */
export const footerPane = (status, account) =>
  hasFeatureStrict(status, 'hosts') && account?.user ? useFooterViews : null;
