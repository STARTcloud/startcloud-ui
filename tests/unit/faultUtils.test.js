import { describe, expect, it } from 'vitest';

import {
  FAULT_ACTIONS,
  FAULT_FILTERS,
  FAULT_PARAMS,
  MODULE_FILTERS,
  extractFmriFromAffects,
  faultActionBody,
  faultClass,
  getSeverityTagClass,
  matchesFault,
  matchesFaultModule,
  moduleGlyph,
  moduleType,
  moduleWords,
  severityTone,
} from '../../src/features/hosts/utils/FaultUtils.js';

const fault = {
  uuid: 'e7a1',
  msgId: 'ZFS-8000-8A',
  severity: 'Major',
  time: 'Sep 28 10:16:40',
  details: {
    affects: 'zfs://pool=tank/vdev=c0t5d0 faulted but still in service',
    faultClass: 'fault.fs.zfs.device',
    description: 'A file could not be read.',
  },
};

describe('the severity and the class', () => {
  it('tones a severity', () => {
    expect(severityTone('Critical')).toBe('danger');
    expect(severityTone('major')).toBe('warning');
    expect(severityTone('Minor')).toBe('info');
    expect(severityTone(undefined)).toBe('secondary');
    expect(getSeverityTagClass('Major')).toBe('text-bg-warning');
  });

  it('reads the class from the message id', () => {
    expect(faultClass('ZFS-8000-8A')).toEqual({ key: 'host.faultTable.classZfs', text: '' });
    expect(faultClass('CPU-8000-4E').key).toBe('host.faultTable.classCpu');
    expect(faultClass('SMF-8000-YX')).toEqual({ key: '', text: 'SMF' });
    expect(faultClass('')).toEqual({ key: 'host.faultTable.classUnknown', text: '' });
  });
});

describe('the actions', () => {
  it('reads the FMRI and builds the body of each action', () => {
    expect(extractFmriFromAffects(fault.details.affects)).toBe('zfs://pool=tank/vdev=c0t5d0');
    expect(extractFmriFromAffects('')).toBeNull();
    expect(faultActionBody('acquit', fault)).toEqual({ target: 'e7a1' });
    expect(faultActionBody('repaired', fault)).toEqual({ fmri: 'zfs://pool=tank/vdev=c0t5d0' });
    expect(faultActionBody('replaced', { uuid: 'x' })).toEqual({ fmri: null });
    expect(FAULT_ACTIONS.map(action => action.key)).toEqual(['acquit', 'repaired', 'replaced']);
    expect(FAULT_PARAMS).toEqual({ all: false, summary: false, limit: 50 });
  });
});

describe('the tables', () => {
  it('matches a fault and a module', () => {
    expect(matchesFault(fault, 'tank')).toBe(true);
    expect(matchesFault(fault, 'zfs-8000')).toBe(true);
    expect(matchesFault(fault, 'cpu')).toBe(false);
    expect(matchesFaultModule({ module: 'zfs-retire', version: '1.0' }, 'retire')).toBe(true);
    expect(matchesFaultModule({ module: 'zfs-retire' }, 'disk')).toBe(false);
  });

  it('groups the faults by severity and the modules by type', () => {
    const [severity] = FAULT_FILTERS;
    expect(severity.values(fault)).toEqual(['major']);
    expect(severity.values({})).toEqual([]);
    expect(severity.labelFor('major')).toBe('Major');
    const [type] = MODULE_FILTERS;
    expect(type.values({ module: 'zfs-retire' })).toEqual(['retireAgent']);
    expect(type.labelFor('module', key => key)).toBe('host.faultManagerConfig.moduleTypeModule');
  });
});

describe('the modules', () => {
  it('types a module by its name', () => {
    expect(moduleType('cpumem-retire')).toEqual({
      type: 'retireAgent',
      key: 'host.faultManagerConfig.moduleTypeRetireAgent',
      tone: 'info',
    });
    expect(moduleType('disk-detector').type).toBe('detector');
    expect(moduleType('syslog-response').tone).toBe('success');
    expect(moduleType('eft').type).toBe('module');
  });

  it('picks a glyph and lists the words', () => {
    expect(moduleGlyph('cpumem-retire')).toBe('chip');
    expect(moduleGlyph('disk-transport')).toBe('disk');
    expect(moduleGlyph('zfs-diagnosis')).toBe('database');
    expect(moduleGlyph('ip-network')).toBe('network');
    expect(moduleGlyph('eft')).toBe('gear');
    expect(
      moduleWords([{ module: 'zfs-retire' }, { module: 'cpumem-retire' }, { module: 'eft' }])
    ).toEqual(['retire', 'eft']);
  });
});
