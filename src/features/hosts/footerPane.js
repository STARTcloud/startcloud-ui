import { lazy, useMemo } from 'react';
import {
  FaListCheck,
  FaPlug,
  FaRotate,
  FaSliders,
  FaTerminal,
  FaWindowRestore,
  FaXmark,
} from 'react-icons/fa6';

import { hasFeatureStrict } from '../../utils/capabilities';

import { useFocus } from './hooks/useFocus';
import { useConsoleActions } from './hooks/useOpenConsole';
import { requestTasksRefresh } from './hooks/useTasks';
import {
  openTerminalPrefs,
  useActiveConsole,
  useConsoleOpens,
  useConsoles,
} from './hooks/useTerminal';
import { consoleDoorsOf } from './utils/consoles';
import { consoleOf, footerConsoles, isHeldKind } from './utils/terminals';

const ConsolesPane = lazy(() => import('./components/ConsolesPane'));
const TasksPane = lazy(() => import('./components/TasksPane'));
const TasksTools = lazy(() => import('./components/TasksTools'));

const TASKS_ROWS = [
  {
    key: 'refresh',
    labelKey: 'footer.tasks.menuRefresh',
    icon: FaRotate,
    onClick: requestTasksRefresh,
  },
];

const TASKS_VIEW = {
  key: 'tasks',
  labelKey: 'footer.pane.tasks',
  icon: FaListCheck,
  Component: TasksPane,
  first: true,
  tools: TasksTools,
  menu: TASKS_ROWS,
};

const listsToken = (focus, token) => focus.kind === 'host' && focus.features.includes(token);

const shellRow = (focus, actions) =>
  listsToken(focus, 'host-terminal')
    ? [
        {
          key: 'host-shell',
          labelKey: 'hosts.controls.openHostShell',
          icon: FaTerminal,
          tone: 'text-info',
          onClick: () =>
            actions.open({
              kind: 'host_shell',
              id: focus.id,
              server: focus.server,
              placed: 'footer',
            }),
        },
      ]
    : [];

const consoleRows = (entry, actions, focus) => {
  if (!entry) {
    return [
      ...shellRow(focus, actions),
      {
        key: 'preferences',
        labelKey: 'footer.terminal.title',
        icon: FaSliders,
        onClick: openTerminalPrefs,
      },
    ];
  }
  return [
    ...shellRow(focus, actions),
    ...(entry.kind === 'zlogin'
      ? []
      : [
          {
            key: 'reconnect',
            labelKey: 'footer.pane.reconnectShell',
            icon: FaPlug,
            onClick: () => actions.reconnect(entry.key),
          },
        ]),
    ...(entry.kind === 'vnc' || entry.kind === 'rdp'
      ? []
      : [
          {
            key: 'restart',
            labelKey: 'footer.pane.restartShell',
            icon: FaRotate,
            onClick: () => actions.restart(entry.key),
          },
        ]),
    ...(isHeldKind(entry.kind) || entry.kind === 'zlogin'
      ? [
          {
            key: 'preferences',
            labelKey: 'footer.terminal.title',
            icon: FaSliders,
            onClick: openTerminalPrefs,
          },
        ]
      : []),
    { key: 'divider-place', divider: true },
    ...(entry.name
      ? [
          {
            key: 'send-to-page',
            labelKey:
              entry.noun === 'zone'
                ? 'footer.console.sendToZonePage'
                : 'footer.console.sendToMachinePage',
            icon: FaWindowRestore,
            onClick: () => actions.move(entry.key, 'page'),
          },
        ]
      : []),
    {
      key: 'close',
      labelKey: 'footer.console.close',
      icon: FaXmark,
      tone: 'text-danger',
      onClick: () => actions.close(entry.key),
    },
  ];
};

/**
 * The views the footer's pane offers for the host in focus, in the order
 * the row draws their toggles: the Consoles view while the focus is one
 * host that lists `host-terminal` or any console of `CONSOLE_DOORS`, and
 * while any console is placed in the footer whatever the route, its
 * rows Open host shell first while the host in focus lists
 * `host-terminal`, then the rows acting on the active tab, Reconnect, a
 * new socket to the same session, Restart, a new session, Terminal
 * preferences, then Send to the machine's or the zone's page and Close,
 * on the right-click menu and on the toggle's drop-up alike, Open host
 * shell and Terminal preferences alone while no tab is open, and
 * `opened` the count of the times a console asked the
 * pane to show the view; and the tasks view while the focus lists
 * `tasks` or, with every host in focus, while any host does, its tools
 * Refresh, the priority filter and the Columns picker and its menu row
 * Refresh. The tasks view is marked `first`, the view a pane with no
 * saved view opens on, as hyperweaver-ui's footer does. An empty list
 * means no pane.
 *
 * @returns {Array<Object>} The views, `[{ key, labelKey, icon, Component, first?, tools?, menu?, dropUp?, opened? }]`
 */
export const useFooterViews = () => {
  const focus = useFocus();
  const consoles = useConsoles();
  const activeKey = useActiveConsole();
  const opened = useConsoleOpens();
  const actions = useConsoleActions();
  const offered =
    listsToken(focus, 'host-terminal') ||
    (focus.kind === 'host' && consoleDoorsOf(focus.server).length > 0) ||
    footerConsoles(consoles).length > 0;
  const tasks = focus.kind === 'all' ? focus.hosts.length > 0 : listsToken(focus, 'tasks');
  const active = consoleOf(consoles, activeKey);
  return useMemo(() => {
    const rows = consoleRows(active, actions, focus);
    const consolesView = {
      key: 'consoles',
      labelKey: 'footer.pane.consoles',
      icon: FaTerminal,
      Component: ConsolesPane,
      menu: rows,
      dropUp: rows,
      opened,
    };
    return [...(offered ? [consolesView] : []), ...(tasks ? [TASKS_VIEW] : [])];
  }, [offered, tasks, active, actions, opened, focus]);
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
