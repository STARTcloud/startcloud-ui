import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { listTasks } from '../api/tasks';
import { agentIdOf, hostLabel, withoutAgentId } from '../utils/hosts';
import {
  columnsOf,
  floorOf,
  mergeTaskRow,
  mergeTasks,
  newestFirst,
  withColumnToggled,
} from '../utils/tasks';

const COLUMNS_KEY = 'tasks_columns';
const FLOOR_KEY = 'tasks_min_priority';
const LIMIT = 50;

const store = {
  columns: null,
  floor: null,
  refreshes: 0,
  listeners: new Set(),
};

const storedColumns = () => {
  try {
    return columnsOf(JSON.parse(localStorage.getItem(COLUMNS_KEY) || 'null'));
  } catch {
    return columnsOf(null);
  }
};

const initStore = () => {
  if (store.columns === null) {
    store.columns = storedColumns();
    store.floor = floorOf(localStorage.getItem(FLOOR_KEY));
  }
  return store;
};

const subscribe = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const announce = () => store.listeners.forEach(listener => listener());

const readColumns = () => store.columns;

const readFloor = () => store.floor;

const readRefreshes = () => store.refreshes;

const writeFloor = value => {
  store.floor = floorOf(value);
  localStorage.setItem(FLOOR_KEY, String(store.floor));
  announce();
};

const toggleColumn = key => {
  store.columns = withColumnToggled(store.columns, key);
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(store.columns));
  announce();
};

/**
 * Ask every mounted tasks table to read again: the pane's Refresh row and
 * the read that follows the person's own action on a task.
 */
export const requestTasksRefresh = () => {
  store.refreshes += 1;
  announce();
};

/**
 * The tasks table's two preferences, one store behind every call so the
 * footer's tools and the table read and write the same values: the
 * column keys shown, persisted per origin under `tasks_columns`, and the
 * priority floor, under `tasks_min_priority`.
 *
 * @returns {{ columns: Array<string>, floor: number, setFloor: Function, toggleColumn: Function }} The preferences and their writers
 */
export const useTaskPrefs = () => {
  useState(initStore);
  const columns = useSyncExternalStore(subscribe, readColumns);
  const floor = useSyncExternalStore(subscribe, readFloor);
  return { columns, floor, setFloor: writeFloor, toggleColumn };
};

const tagged = (server, tasks) =>
  tasks.map(task => ({ ...task, host: hostLabel(server), rowKey: `${server.id}|${task.id}` }));

const readHost = ({ status, server, minPriority }) =>
  listTasks(status, server.id, { minPriority, limit: LIMIT }).then(tasks => tagged(server, tasks));

const readEvery = async ({ status, hosts, minPriority }) => {
  const answers = await Promise.allSettled(
    hosts.map(server => readHost({ status, server, minPriority }))
  );
  return answers
    .filter(answer => answer.status === 'fulfilled')
    .flatMap(answer => answer.value)
    .sort(newestFirst);
};

const readOne = async ({ status, id, minPriority }) => {
  const tasks = await listTasks(status, id, { minPriority, limit: LIMIT });
  return tasks.map(task => ({ ...task, rowKey: String(task.id) })).sort(newestFirst);
};

const EMPTY = { key: '', tasks: [], failed: false, messageKey: '' };

const pushedRow = ({ focus, data, minPriority }) => {
  const id = agentIdOf(data);
  const task = withoutAgentId(data);
  if (!task.id || Number(task.priority) < minPriority) {
    return null;
  }
  if (focus.kind === 'all') {
    const server = focus.hosts.find(row => String(row.id) === id);
    return server ? tagged(server, [task])[0] : null;
  }
  return focus.id === id ? { ...task, rowKey: String(task.id) } : null;
};

/**
 * The tasks of the host in focus, fifty at most above the priority
 * floor: read once when the tasks view opens and whenever the focus or
 * the floor changes while it shows, again when the event stream opens
 * fresh or answers `reset`, on `refresh` and on `requestTasksRefresh`,
 * and never on a timer; between reads the `tasks` topic's `task-updated`
 * event keeps the rows, a pushed row of the host in focus at or above the
 * floor merged into the rows held, so a task's status and progress move
 * by push. On one host a second read is merged into the rows
 * held by id; with every host in focus one read goes to each host whose
 * row lists `tasks`, the answers merged newest first, each row carrying
 * its `host` and a `rowKey` of host and id.
 *
 * @param {Object} options - The table's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.focus - The focus of `useFocus`
 * @param {boolean} options.open - Whether the tasks view shows
 * @param {number} options.minPriority - The priority floor
 * @returns {{ tasks: Array<Object>, loaded: boolean, failed: boolean, messageKey: string, refresh: Function }} The rows
 */
export const useTasks = ({ status, focus, open, minPriority }) => {
  const [state, setState] = useState(EMPTY);
  const refreshes = useSyncExternalStore(subscribe, readRefreshes);
  const key = `${focus.key}|${minPriority}`;
  const keyRef = useRef(key);

  const read = () => {
    if (!open) {
      return;
    }
    const every = focus.kind === 'all';
    const answer = every
      ? readEvery({ status, hosts: focus.hosts, minPriority })
      : readOne({ status, id: focus.id, minPriority });
    answer
      .then(tasks => {
        if (keyRef.current !== key) {
          return;
        }
        setState(previous => ({
          key,
          tasks: !every && previous.key === key ? mergeTasks(previous.tasks, tasks) : tasks,
          failed: false,
          messageKey: '',
        }));
      })
      .catch(error => {
        if (keyRef.current !== key) {
          return;
        }
        log.api.error('Error fetching tasks', { error: error.message });
        setState(previous => ({
          key,
          tasks: previous.key === key ? previous.tasks : [],
          failed: true,
          messageKey: error.messageKey || 'errors.request',
        }));
      });
  };

  const readRef = useRef(read);

  useEffect(() => {
    readRef.current = read;
    keyRef.current = key;
  });

  useEffect(() => {
    readRef.current();
  }, [open, key, refreshes]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      readRef.current();
    }
  });

  useEventStream('reset', () => readRef.current());

  useEventStream('task-updated', data => {
    const row = open ? pushedRow({ focus, data, minPriority }) : null;
    if (!row) {
      return;
    }
    setState(previous =>
      previous.key === key
        ? { ...previous, tasks: mergeTaskRow(previous.tasks, row, LIMIT) }
        : previous
    );
  });

  const refresh = useCallback(() => readRef.current(), []);
  const current = state.key === key ? state : EMPTY;

  return {
    tasks: current.tasks,
    loaded: state.key === key,
    failed: current.failed,
    messageKey: current.messageKey,
    refresh,
  };
};
