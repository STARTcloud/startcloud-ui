import { describe, expect, it } from 'vitest';

import {
  MANAGE_SECTIONS,
  MANAGE_TOKENS,
  configServers,
  diskSpaceWarning,
  filterTimezones,
  formatCpu,
  formatMs,
  formatTimezone,
  groupCreateBody,
  healthTone,
  hostHasManage,
  isConfigValid,
  isSystemGroup,
  isSystemUser,
  matchesProcess,
  matchesService,
  movedOrder,
  offeredSections,
  orderDiffers,
  orderOf,
  parseMemorySize,
  passwordBody,
  passwordProblem,
  peerIndicator,
  priorityChanges,
  priorityForIndex,
  roleCreateBody,
  runlevelsOf,
  sectionOffered,
  serviceActions,
  serviceName,
  serviceTone,
  shellName,
  shortHome,
  signalsFor,
  splitList,
  strategyPatch,
  timezoneDescriptionKey,
  timezoneRegions,
  truncateCommand,
  userCreateBody,
  userEditBody,
  validPriority,
  withServer,
  withoutServer,
} from '../../src/features/hosts/utils/manage.js';

const rowOf = (features, hypervisors = [], platform = 'omnios') => ({
  capabilities: { features, hypervisors, platform },
});

const keysOf = sections => sections.map(section => section.key);

describe('hostHasManage', () => {
  it('offers the page for any token of its sections and for none else', () => {
    MANAGE_TOKENS.forEach(token => expect(hostHasManage(rowOf([token]))).toBe(true));
    expect(hostHasManage(rowOf(['host-power', 'tasks']))).toBe(false);
    expect(hostHasManage(null)).toBe(false);
    expect(hostHasManage({ capabilities: {} })).toBe(false);
  });
});

describe('sectionOffered and offeredSections', () => {
  const byKey = key => MANAGE_SECTIONS.find(section => section.key === key);

  it('gates a section by its one token, every token of its list or any of its alternatives', () => {
    expect(sectionOffered(byKey('services'), rowOf(['services']))).toBe(true);
    expect(sectionOffered(byKey('services'), rowOf(['processes']))).toBe(false);
    expect(sectionOffered(byKey('network'), rowOf(['hosts-file']))).toBe(true);
    expect(sectionOffered(byKey('installer-files'), rowOf(['artifacts']))).toBe(false);
    expect(
      sectionOffered(byKey('installer-files'), rowOf(['artifacts', 'provisioner-registry']))
    ).toBe(true);
    expect(sectionOffered(byKey('database'), rowOf([]))).toBe(true);
  });

  it('offers the recipes on a bhyve host alone', () => {
    expect(sectionOffered(byKey('recipes'), rowOf(['provisioning'], ['bhyve']))).toBe(true);
    expect(sectionOffered(byKey('recipes'), rowOf(['provisioning'], ['virtualbox']))).toBe(false);
  });

  it('answers the offered sections in the page order', () => {
    expect(
      keysOf(offeredSections(rowOf(['services', 'packages', 'machines', 'host-power'], ['bhyve'])))
    ).toEqual(['services', 'packages', 'system-updates', 'orchestration', 'runlevel', 'database']);
  });
});

describe('the services', () => {
  it('names a service by the last segment of its FMRI', () => {
    expect(serviceName('svc:/network/ssh:default')).toBe('ssh:default');
    expect(serviceName('lrc:/etc/rc2_d/S20sysetup')).toBe('S20sysetup');
    expect(serviceName('sshd.service')).toBe('sshd.service');
    expect(serviceName('')).toBe('');
  });

  it('tones a state and offers the actions of a state', () => {
    expect(serviceTone('online')).toBe('success');
    expect(serviceTone('Maintenance')).toBe('warning');
    expect(serviceTone('odd')).toBe('secondary');
    expect(serviceActions('disabled')).toEqual(['enable', 'refresh']);
    expect(serviceActions('online')).toEqual(['disable', 'restart', 'refresh']);
    expect(serviceActions('legacy_run')).toEqual([]);
    expect(serviceActions('offline')).toEqual(['refresh']);
  });

  it('matches a row by its FMRI, its name and its state', () => {
    const row = { fmri: 'svc:/network/ssh:default', state: 'online' };
    expect(matchesService(row, 'ssh')).toBe(true);
    expect(matchesService(row, 'online')).toBe(true);
    expect(matchesService(row, 'cron')).toBe(false);
  });
});

describe('the processes', () => {
  it('parses a resident size into megabytes', () => {
    expect(parseMemorySize('7434M')).toBe(7434);
    expect(parseMemorySize('2G')).toBe(2048);
    expect(parseMemorySize('512K')).toBe(0.5);
    expect(parseMemorySize(1048576)).toBe(1);
    expect(parseMemorySize('')).toBe(0);
    expect(parseMemorySize('junk')).toBe(0);
  });

  it('formats the processor share and cuts a command', () => {
    expect(formatCpu(42.567)).toBe('42.6%');
    expect(formatCpu(null)).toBe('');
    expect(truncateCommand('a'.repeat(60))).toBe(`${'a'.repeat(50)}...`);
    expect(truncateCommand('short')).toBe('short');
  });

  it('offers TERM and KILL alone on a Windows host', () => {
    const signals = ['TERM', 'KILL', 'HUP'];
    expect(signalsFor(rowOf([], [], 'windows'), signals)).toEqual(['TERM', 'KILL']);
    expect(signalsFor(rowOf([], [], 'omnios'), signals)).toEqual(signals);
  });

  it('matches a row by its pid, user, zone and command', () => {
    const row = { pid: 128, username: 'root', zone: 'global', command: '/usr/sbin/sshd' };
    expect(matchesProcess(row, '128')).toBe(true);
    expect(matchesProcess(row, 'sshd')).toBe(true);
    expect(matchesProcess(row, 'nginx')).toBe(false);
  });
});

describe('the accounts', () => {
  it('tells a system account and a system group', () => {
    expect(isSystemUser({ uid: 1, comment: '' })).toBe(true);
    expect(isSystemUser({ uid: 1, comment: 'Backup User' })).toBe(false);
    expect(isSystemUser({ uid: 1001, comment: '' })).toBe(false);
    expect(isSystemGroup({ gid: 10 })).toBe(true);
    expect(isSystemGroup({ gid: 1001 })).toBe(false);
  });

  it('shortens a shell and a home', () => {
    expect(shellName('/usr/bin/bash')).toBe('bash');
    expect(shellName('')).toBe('');
    expect(shortHome('/export/home/mark')).toBe('/export/home/mark');
    expect(shortHome('/a/very/long/home/directory/path/for/someone')).toBe(
      '...ctory/path/for/someone'
    );
  });

  it('splits a comma list', () => {
    expect(splitList(' a, b ,,c ')).toEqual(['a', 'b', 'c']);
    expect(splitList('')).toEqual([]);
  });

  it('builds the create body hyperweaver-ui sent, the advanced members only in advanced mode', () => {
    const form = {
      username: ' ada ',
      uid: '1200',
      comment: 'Ada',
      shell: '/bin/zsh',
      groups: 'staff, ops',
      authorizations: '',
      profiles: 'Zone Management',
      roles: '',
      project: '',
      createHome: true,
      forceZfs: true,
      createPersonalGroup: false,
    };
    expect(userCreateBody(form, false)).toEqual({
      username: 'ada',
      comment: 'Ada',
      shell: '/bin/zsh',
      create_home: true,
      create_personal_group: false,
    });
    expect(userCreateBody(form, true)).toEqual({
      username: 'ada',
      comment: 'Ada',
      shell: '/bin/zsh',
      create_home: true,
      create_personal_group: false,
      uid: 1200,
      groups: ['staff', 'ops'],
      profiles: ['Zone Management'],
      force_zfs: true,
    });
    expect(userCreateBody({ ...form, comment: ' ' }, false)).not.toHaveProperty('comment');
  });

  it('builds the edit body of the changed members alone, null for none', () => {
    const user = { username: 'ada', comment: 'Ada', shell: '/bin/bash' };
    expect(
      userEditBody(
        { comment: 'Ada', shell: '/bin/bash', groups: '', authorizations: '', profiles: '' },
        user
      )
    ).toBeNull();
    expect(
      userEditBody(
        { comment: 'Ada L', shell: '/bin/zsh', groups: 'staff', authorizations: '', profiles: '' },
        user
      )
    ).toEqual({ new_comment: 'Ada L', new_shell: '/bin/zsh', new_groups: ['staff'] });
  });

  it('builds the group and the role bodies', () => {
    expect(groupCreateBody({ groupname: ' ops ', gid: '1100' })).toEqual({
      groupname: 'ops',
      gid: 1100,
    });
    expect(groupCreateBody({ groupname: 'ops', gid: '' })).toEqual({ groupname: 'ops' });
    expect(
      roleCreateBody({
        rolename: 'zoneadm',
        comment: '',
        shell: '',
        authorizations: 'a, b',
        profiles: '',
        createHome: false,
      })
    ).toEqual({
      rolename: 'zoneadm',
      comment: 'RBAC Role',
      shell: '/bin/pfsh',
      create_home: false,
      authorizations: ['a', 'b'],
    });
  });

  it('checks a password form and builds its body', () => {
    expect(passwordProblem({ password: '', confirmPassword: '' })).toBe(
      'host.setPasswordModal.passwordRequired'
    );
    expect(passwordProblem({ password: 'abcdefgh', confirmPassword: 'x' })).toBe(
      'host.setPasswordModal.passwordMismatch'
    );
    expect(passwordProblem({ password: 'short', confirmPassword: 'short' })).toBe(
      'host.setPasswordModal.passwordTooShort'
    );
    expect(passwordProblem({ password: 'longenough', confirmPassword: 'longenough' })).toBe('');
    expect(passwordBody({ password: 'p', forceChange: true, unlockAccount: false })).toEqual({
      password: 'p',
      force_change: true,
      unlock_account: false,
    });
  });
});

describe('the time', () => {
  const zones = ['UTC', 'Europe/Berlin', 'America/Chicago', 'Asia/Tokyo', 'America/New_York'];

  it('lists the regions, formats a zone and finds its description', () => {
    expect(timezoneRegions(zones)).toEqual(['America', 'Asia', 'Europe']);
    expect(formatTimezone('America/New_York')).toBe('America → New_York');
    expect(formatTimezone('UTC')).toBe('UTC');
    expect(formatTimezone('')).toBe('');
    expect(timezoneDescriptionKey('Europe/Berlin')).toBe('host.timezoneSettings.regions.europe');
    expect(timezoneDescriptionKey('Mars/Olympus')).toBe('');
  });

  it('narrows the zones by region and by search', () => {
    expect(filterTimezones(zones, 'America', '')).toEqual(['America/Chicago', 'America/New_York']);
    expect(filterTimezones(zones, '', 'tok')).toEqual(['Asia/Tokyo']);
  });

  it('reads, validates and edits the servers of a configuration', () => {
    const config = 'driftfile /var/ntp/ntp.drift\nserver a.example iburst\npool b.example';
    expect(configServers(config)).toEqual(['a.example', 'b.example']);
    expect(isConfigValid(config)).toBe(true);
    expect(isConfigValid('driftfile x')).toBe(false);
    expect(isConfigValid('  ')).toBe(false);
    expect(configServers(withServer(config, ' c.example '))).toEqual([
      'a.example',
      'b.example',
      'c.example',
    ]);
    expect(configServers(withoutServer(config, 'a.example'))).toEqual(['b.example']);
  });

  it('draws a peer indicator, the milliseconds and the health tone', () => {
    expect(peerIndicator('*').key).toBe('statusPrimary');
    expect(peerIndicator('?').key).toBe('statusUnknown');
    expect(formatMs(12.34)).toBe('12.3ms');
    expect(formatMs(1.2, true)).toBe('+1.2ms');
    expect(formatMs(-1.2, true)).toBe('-1.2ms');
    expect(formatMs('x')).toBe('');
    expect(healthTone(5, { good: 10, warning: 50 })).toBe('text-success');
    expect(healthTone(20, { good: 10, warning: 50 })).toBe('text-warning');
    expect(healthTone(80, { good: 10, warning: 50 })).toBe('text-danger');
    expect(healthTone(undefined, { good: 10, warning: 50 })).toBe('');
  });
});

describe('the updates', () => {
  it('reads the disk space warning of the raw output', () => {
    expect(
      diskSpaceWarning(
        'Insufficient disk space for the update. Available space: 1.2 GB. Estimated required: 3.4 GB.'
      )
    ).toEqual({ available: '1.2 GB', required: '3.4 GB' });
    expect(diskSpaceWarning('Packages to update: 6')).toBeNull();
    expect(diskSpaceWarning(undefined)).toBeNull();
  });
});

describe('the orchestration', () => {
  const priorities = {
    machines: [
      { name: 'db-1', priority: 100 },
      { name: 'web-1', priority: 95 },
      { name: 'cache-1', priority: 50 },
    ],
  };

  it('spaces the priorities from the order and orders by priority', () => {
    expect(priorityForIndex(0)).toBe(100);
    expect(priorityForIndex(3)).toBe(85);
    expect(priorityForIndex(40)).toBe(1);
    expect(orderOf(priorities)).toEqual(['db-1', 'web-1', 'cache-1']);
    expect(orderOf(null)).toEqual([]);
  });

  it('writes only the machines whose number the order changes', () => {
    const order = ['db-1', 'web-1', 'cache-1'];
    expect(orderDiffers(order, priorities)).toBe(true);
    expect(priorityChanges(order, priorities)).toEqual([{ name: 'cache-1', priority: 90 }]);
    expect(orderDiffers(['db-1', 'web-1'], { machines: priorities.machines.slice(0, 2) })).toBe(
      false
    );
  });

  it('moves the dragged row to the hovered position', () => {
    const order = ['a', 'b', 'c'];
    expect(movedOrder(order, 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(movedOrder(order, 'a', 'a')).toBe(order);
    expect(movedOrder(order, null, 'a')).toBe(order);
    expect(movedOrder(order, 'a', 'z')).toBe(order);
  });

  it('takes a whole priority from one to a hundred and patches the one strategy leaf', () => {
    expect(validPriority(50)).toBe(true);
    expect(validPriority(0)).toBe(false);
    expect(validPriority(101)).toBe(false);
    expect(validPriority(2.5)).toBe(false);
    expect(strategyPatch('sequential')).toEqual({
      machines: { orchestration: { strategy: 'sequential' } },
    });
    expect(strategyPatch('staggered').machines.orchestration).not.toHaveProperty('enabled');
  });
});

describe('runlevelsOf', () => {
  it('reads the current runlevel and the ones offered', () => {
    expect(runlevelsOf({ current_runlevel: 3, available_runlevels: ['s', 3, '3', 5] })).toEqual({
      current: '3',
      available: ['s', '3', '5'],
    });
    expect(runlevelsOf(null)).toEqual({ current: '', available: [] });
  });
});
