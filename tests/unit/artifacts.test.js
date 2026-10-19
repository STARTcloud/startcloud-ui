import { describe, expect, it } from 'vitest';

import {
  STORAGE_PATH_FORM,
  artifactTypeOf,
  artifactTypeTone,
  extractFilenameFromUrl,
  getDiskUsageColor,
  parseUsagePercentage,
  storagePathBody,
  storagePathEditBody,
  storagePathEditProblem,
  storagePathProblem,
  transferOf,
  transferStatusKey,
  transferTone,
  transferWithTask,
} from '../../src/features/hosts/utils/artifacts.js';

describe('the artifact types', () => {
  it('reads the type from the file type or the extension and tones it', () => {
    expect(artifactTypeOf('iso', '.iso')).toBe('iso');
    expect(artifactTypeOf('', '.ISO')).toBe('iso');
    expect(artifactTypeOf('image', '')).toBe('image');
    expect(artifactTypeOf('', '.qcow2')).toBe('image');
    expect(artifactTypeOf('', '.txt')).toBe('file');
    expect(artifactTypeTone('iso')).toBe('info');
    expect(artifactTypeTone('image')).toBe('warning');
    expect(artifactTypeTone('file')).toBe('light');
  });
});

describe('the URLs and the usage', () => {
  it('reads a file name from a URL', () => {
    expect(extractFilenameFromUrl('https://x.example/a/b.iso?x=1')).toBe('b.iso');
    expect(extractFilenameFromUrl('https://x.example/a/')).toBe('');
    expect(extractFilenameFromUrl('nope')).toBe('');
  });

  it('parses a usage percentage and tones it', () => {
    expect(parseUsagePercentage('65%')).toBe(65);
    expect(parseUsagePercentage(undefined)).toBe(0);
    expect(getDiskUsageColor(95)).toBe('bg-danger');
    expect(getDiskUsageColor(80)).toBe('bg-warning');
    expect(getDiskUsageColor(10)).toBe('bg-success');
  });
});

describe('the transfers', () => {
  it('tones and names a status', () => {
    expect(transferTone('running')).toBe('primary');
    expect(transferTone('odd')).toBe('secondary');
    expect(transferStatusKey('failed')).toBe('hosts.manage.artifacts.status.failed');
    expect(transferStatusKey('odd')).toBe('');
  });

  it('holds a transfer row and moves it with a pushed task', () => {
    const row = transferOf({ taskId: 't1', filename: 'a.iso', url: 'https://x/a.iso' });
    expect(row).toMatchObject({
      taskId: 't1',
      filename: 'a.iso',
      status: 'queued',
      progress_percent: 0,
    });
    expect(
      transferWithTask(row, {
        status: 'running',
        progress_percent: '40',
        progress_info: { total_mb: 10 },
      })
    ).toMatchObject({ status: 'running', progress_percent: 40, progress_info: { total_mb: 10 } });
    expect(transferWithTask(row, { status: 'failed', error_message: 'no' })).toMatchObject({
      status: 'failed',
      error_message: 'no',
      progress_info: {},
    });
  });
});

describe('the storage path forms', () => {
  it('refuses a short name, a relative path and no type', () => {
    expect(storagePathProblem(STORAGE_PATH_FORM)).toBe(
      'artifacts.storagePathCreateModal.nameRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'a' })).toBe(
      'artifacts.storagePathCreateModal.nameMinLength'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab' })).toBe(
      'artifacts.storagePathCreateModal.pathRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: 'rel' })).toBe(
      'artifacts.storagePathCreateModal.pathAbsoluteRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: '/x', type: '' })).toBe(
      'artifacts.storagePathCreateModal.typeRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: '/x' })).toBe('');
  });

  it('sends the create and the edit bodies', () => {
    expect(storagePathBody({ name: ' ISO ', path: ' /iso ', type: 'iso', enabled: true })).toEqual({
      name: 'ISO',
      path: '/iso',
      type: 'iso',
      enabled: true,
    });
    expect(storagePathEditProblem({ name: '' })).toBe(
      'artifacts.storagePathEditModal.nameRequired'
    );
    expect(storagePathEditProblem({ name: 'x' })).toBe(
      'artifacts.storagePathEditModal.nameMinLength'
    );
    expect(storagePathEditBody({ name: ' New ', enabled: false })).toEqual({
      name: 'New',
      enabled: false,
    });
  });
});
