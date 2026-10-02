import { describe, expect, it } from 'vitest';

import {
  BOOT_ENVIRONMENT_FILTERS,
  BOOT_ENVIRONMENT_FORM,
  BOOT_ENVIRONMENT_PARAMS,
  bootEnvironmentActions,
  bootEnvironmentCreateBody,
  bootEnvironmentParams,
  bootEnvironmentProblem,
  bootEnvironmentStatus,
  formatBootEnvironmentDate,
  isMounted,
  isValidBootEnvironmentName,
  matchesBootEnvironment,
  policyTone,
} from '../../src/features/hosts/utils/bootEnvironments.js';

describe('the query', () => {
  it('sends each filter only where set', () => {
    expect(bootEnvironmentParams(BOOT_ENVIRONMENT_PARAMS)).toEqual({});
    expect(
      bootEnvironmentParams({ name: 'omnios', showDetailed: true, showSnapshots: true })
    ).toEqual({ detailed: true, snapshots: true, name: 'omnios' });
  });
});

describe('the rows', () => {
  it('reads the active status', () => {
    expect(bootEnvironmentStatus({ is_active_now: true, is_active_on_reboot: true })).toMatchObject(
      { status: 'both', badge: 'NR', tone: 'success' }
    );
    expect(bootEnvironmentStatus({ is_active_now: true }).status).toBe('now');
    expect(bootEnvironmentStatus({ is_active_on_reboot: true })).toMatchObject({
      status: 'reboot',
      badge: 'R',
      tone: 'info',
    });
    expect(bootEnvironmentStatus({})).toMatchObject({ status: 'inactive', badge: '-' });
  });

  it('tells a mounted environment and offers the actions of a row', () => {
    expect(isMounted({ mountpoint: '/' })).toBe(true);
    expect(isMounted({ mountpoint: '-' })).toBe(false);
    expect(isMounted({})).toBe(false);
    expect(
      bootEnvironmentActions({ is_active_now: true, is_active_on_reboot: true, mountpoint: '/' })
    ).toEqual(['unmount']);
    expect(bootEnvironmentActions({ mountpoint: '-' })).toEqual(['activate', 'mount', 'delete']);
    expect(bootEnvironmentActions({ is_active_on_reboot: true, mountpoint: '/mnt/x' })).toEqual([
      'unmount',
    ]);
  });

  it('tones a policy and formats a date', () => {
    expect(policyTone('static')).toBe('info');
    expect(policyTone('Dynamic')).toBe('warning');
    expect(policyTone('')).toBe('secondary');
    expect(formatBootEnvironmentDate('')).toBe('N/A');
    expect(formatBootEnvironmentDate('2026-08-01 09:12')).toContain('2026');
    expect(formatBootEnvironmentDate('created 2026-08-01 09:12 by beadm')).toContain('09:12');
    expect(formatBootEnvironmentDate('never')).toBe('never');
  });

  it('matches a row and groups by status and policy', () => {
    const row = { name: 'omnios-r151054', mountpoint: '/', policy: 'static', space: '6G' };
    expect(matchesBootEnvironment(row, 'r151054')).toBe(true);
    expect(matchesBootEnvironment(row, 'dynamic')).toBe(false);
    const [status, policy] = BOOT_ENVIRONMENT_FILTERS;
    expect(status.values({ is_active_now: true })).toEqual(['now']);
    expect(status.labelFor('both', key => key)).toBe('host.bootEnvironmentTable.activeReboot');
    expect(policy.values(row)).toEqual(['static']);
    expect(policy.values({})).toEqual([]);
  });
});

describe('the create form', () => {
  it('checks the name', () => {
    expect(isValidBootEnvironmentName('omnios-r151054')).toBe(true);
    expect(isValidBootEnvironmentName('-bad')).toBe(false);
    expect(isValidBootEnvironmentName('has space')).toBe(false);
    expect(bootEnvironmentProblem(BOOT_ENVIRONMENT_FORM)).toBe(
      'host.createBEModal.errors.nameRequired'
    );
    expect(bootEnvironmentProblem({ ...BOOT_ENVIRONMENT_FORM, name: '/x' })).toBe(
      'host.createBEModal.errors.nameInvalid'
    );
    expect(bootEnvironmentProblem({ ...BOOT_ENVIRONMENT_FORM, name: 'ok' })).toBe('');
  });

  it('builds the body of the members given alone', () => {
    expect(bootEnvironmentCreateBody({ ...BOOT_ENVIRONMENT_FORM, name: ' test-be ' })).toEqual({
      name: 'test-be',
    });
    expect(
      bootEnvironmentCreateBody({
        name: 'test-be',
        description: 'Test',
        sourceBE: 'omnios-r151054',
        snapshot: '',
        activate: true,
        zpool: 'rpool',
        properties: [
          { key: 'compression', value: 'lz4' },
          { key: '', value: 'x' },
        ],
      })
    ).toEqual({
      name: 'test-be',
      description: 'Test',
      source_be: 'omnios-r151054',
      activate: true,
      zpool: 'rpool',
      properties: { compression: 'lz4' },
    });
  });
});
