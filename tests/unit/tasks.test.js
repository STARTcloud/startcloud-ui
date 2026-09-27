import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COLUMNS,
  DEFAULT_FLOOR,
  TASK_COLUMNS,
  columnsOf,
  floorOf,
  formatByteSize,
  mergeTaskRow,
  mergeTasks,
  priorityKey,
  taskOperationKey,
  taskOperationLabel,
  taskRowClass,
  ticketMachineOf,
  withColumnToggled,
} from '../../src/features/hosts/utils/tasks.js';

const t = key => key;

describe('priorityKey', () => {
  it('answers the word of each threshold', () => {
    expect(priorityKey(100)).toBe('critical');
    expect(priorityKey(80)).toBe('high');
    expect(priorityKey(60)).toBe('medium');
    expect(priorityKey(50)).toBe('service');
    expect(priorityKey(40)).toBe('low');
    expect(priorityKey(20)).toBe('background');
  });

  it('answers the word under each threshold', () => {
    expect(priorityKey(99)).toBe('high');
    expect(priorityKey(79)).toBe('medium');
    expect(priorityKey(59)).toBe('service');
    expect(priorityKey(49)).toBe('low');
    expect(priorityKey(39)).toBe('background');
    expect(priorityKey(undefined)).toBe('background');
  });
});

describe('floorOf', () => {
  it('keeps a stored floor and falls to 40 otherwise', () => {
    expect(floorOf('60')).toBe(60);
    expect(floorOf(100)).toBe(100);
    expect(floorOf(null)).toBe(DEFAULT_FLOOR);
    expect(floorOf('50')).toBe(DEFAULT_FLOOR);
  });
});

describe('columns', () => {
  it('lists eleven columns and six default ones', () => {
    expect(TASK_COLUMNS).toHaveLength(11);
    expect(DEFAULT_COLUMNS).toEqual([
      'operation',
      'machine_name',
      'status',
      'progress',
      'priority',
      'created_at',
    ]);
  });

  it('keeps the known stored columns and falls to the default ones otherwise', () => {
    expect(columnsOf(['id', 'status', 'nothing'])).toEqual(['id', 'status']);
    expect(columnsOf([])).toEqual(DEFAULT_COLUMNS);
    expect(columnsOf(null)).toEqual(DEFAULT_COLUMNS);
    expect(columnsOf('id')).toEqual(DEFAULT_COLUMNS);
  });

  it('toggles a column and never lets the last one go', () => {
    expect(withColumnToggled(['id'], 'status')).toEqual(['id', 'status']);
    expect(withColumnToggled(['id', 'status'], 'id')).toEqual(['status']);
    expect(withColumnToggled(['id'], 'id')).toEqual(['id']);
  });
});

describe('taskOperationKey', () => {
  it('answers the key of a listed operation and nothing for the wire word', () => {
    expect(taskOperationKey('machine_provision')).toBe('footer.operation.machineProvision');
    expect(taskOperationKey('start')).toBe('');
    expect(taskOperationLabel('snapshot_take', t)).toBe('footer.operation.snapshotTake');
    expect(taskOperationLabel('start', t)).toBe('start');
  });
});

describe('ticketMachineOf', () => {
  it('binds the ticket to the machine unless the task is a host-level one', () => {
    expect(ticketMachineOf({ machine_name: 'dev-1' })).toBe('dev-1');
    expect(ticketMachineOf({ machine_name: 'system' })).toBe('');
    expect(ticketMachineOf({ machine_name: 'artifact' })).toBe('');
    expect(ticketMachineOf({ machine_name: 'filesystem' })).toBe('');
    expect(ticketMachineOf({})).toBe('');
  });
});

describe('taskRowClass', () => {
  it('tints a failed row danger and a running row warning', () => {
    expect(taskRowClass('failed')).toBe('task-failed');
    expect(taskRowClass('completed_with_errors')).toBe('task-failed');
    expect(taskRowClass('running')).toBe('task-running');
    expect(taskRowClass('completed')).toBe('');
  });
});

describe('formatByteSize', () => {
  it('answers the size in the unit that keeps it under 1024', () => {
    expect(formatByteSize(512)).toBe('512 B');
    expect(formatByteSize(1536)).toBe('1.5 KB');
    expect(formatByteSize(432013312)).toBe('412 MB');
    expect(formatByteSize(-1)).toBe('');
    expect(formatByteSize(Number.NaN)).toBe('');
  });
});

describe('mergeTaskRow', () => {
  const held = [
    { rowKey: 'a', status: 'running', progress_percent: 10 },
    { rowKey: 'b', status: 'completed', progress_percent: 100 },
  ];

  it('updates the row held under the same key in place', () => {
    const merged = mergeTaskRow(held, { rowKey: 'a', progress_percent: 60 }, 50);
    expect(merged.map(task => [task.rowKey, task.status, task.progress_percent])).toEqual([
      ['a', 'running', 60],
      ['b', 'completed', 100],
    ]);
  });

  it('puts a row not held first and keeps the limit', () => {
    const merged = mergeTaskRow(held, { rowKey: 'c', status: 'pending' }, 2);
    expect(merged.map(task => task.rowKey)).toEqual(['c', 'a']);
  });
});

describe('mergeTasks', () => {
  it('updates the rows both reads hold and puts the new rows first, newest first', () => {
    const held = [
      { id: 'a', status: 'running', created_at: '2026-09-27T09:00:00.000Z' },
      { id: 'b', status: 'completed', created_at: '2026-09-27T08:00:00.000Z' },
    ];
    const read = [
      { id: 'c', status: 'pending', created_at: '2026-09-27T10:00:00.000Z' },
      { id: 'a', status: 'completed', created_at: '2026-09-27T09:00:00.000Z' },
      { id: 'd', status: 'pending', created_at: '2026-09-27T11:00:00.000Z' },
    ];
    expect(mergeTasks(held, read).map(task => [task.id, task.status])).toEqual([
      ['d', 'pending'],
      ['c', 'pending'],
      ['a', 'completed'],
      ['b', 'completed'],
    ]);
  });
});
