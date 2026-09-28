import { describe, expect, it } from 'vitest';

import { KIND_NAMES } from '../../src/components/common/columnKinds.js';
import { TASK_COLUMNS } from '../../src/features/hosts/utils/tasks.js';

const columnOf = key => TASK_COLUMNS.find(column => column.key === key);

const ctx = { t: key => `t:${key}` };

const task = {
  id: '7f3a1c02',
  operation: 'snapshot_take',
  machine_name: 'dev-2',
  status: 'running',
  progress_percent: 42,
  priority: 80,
  created_by: 'mark',
  created_at: '2026-09-27T12:00:00Z',
  started_at: '2026-09-27T12:00:05Z',
  completed_at: null,
  error_message: null,
};

describe('TASK_COLUMNS', () => {
  it('names eleven columns, each of a known kind with a value', () => {
    expect(TASK_COLUMNS).toHaveLength(11);
    TASK_COLUMNS.forEach(column => {
      expect(KIND_NAMES).toContain(column.kind);
      expect(typeof column.value).toBe('function');
    });
  });

  it('never folds the operation and folds the id and the error first', () => {
    expect(columnOf('operation').kind).toBe('name');
    expect(columnOf('operation').priority).toBeUndefined();
    expect(columnOf('id').priority).toBe(6);
    expect(columnOf('error_message').priority).toBe(6);
  });

  it('sorts a date by its instant and a task without one as zero', () => {
    expect(columnOf('created_at').value(task, ctx)).toBe(Date.parse('2026-09-27T12:00:00Z'));
    expect(columnOf('completed_at').value(task, ctx)).toBe(0);
  });

  it('sorts the progress and the priority by number', () => {
    expect(columnOf('progress').value(task, ctx)).toBe(42);
    expect(columnOf('priority').value(task, ctx)).toBe(80);
    expect(columnOf('progress').value({ ...task, progress_percent: null }, ctx)).toBe(0);
  });

  it('sorts the operation by the label it draws', () => {
    expect(columnOf('operation').value(task, ctx)).toBe('t:footer.operation.snapshotTake');
    expect(columnOf('operation').value({ ...task, operation: 'start' }, ctx)).toBe('start');
  });

  it('answers the empty text for a member the task lacks', () => {
    expect(columnOf('error_message').value(task, ctx)).toBe('');
    expect(columnOf('created_by').value({ ...task, created_by: null }, ctx)).toBe('');
  });
});
