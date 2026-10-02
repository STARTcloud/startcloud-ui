import { describe, expect, it } from 'vitest';

import {
  FAULT_MANAGER_LOGS,
  LOG_FILTERS,
  STREAM_LINE_CAP,
  groupLogFiles,
  isFaultManagerLog,
  logDownloadName,
  logDownloadText,
  logGlyph,
  logLevelClass,
  logParamsOf,
  logRouteOf,
  matchesLogFile,
  splitLogLine,
  streamBodyOf,
  withStreamLine,
} from '../../src/features/hosts/utils/logs.js';

describe('the logs', () => {
  it('tells a fault manager log and groups the files by type', () => {
    expect(isFaultManagerLog(FAULT_MANAGER_LOGS[0])).toBe(true);
    expect(isFaultManagerLog({ type: 'system' })).toBe(false);
    expect(isFaultManagerLog(null)).toBe(false);
    const groups = groupLogFiles([
      { name: 'messages', type: 'system' },
      { name: 'authlog', type: 'authentication' },
      { name: 'syslog', type: 'system' },
    ]);
    expect(groups.map(group => group.type)).toEqual(['system', 'authentication', 'fault-manager']);
    expect(groups[0].logs).toHaveLength(2);
    expect(groups[2].logs).toBe(FAULT_MANAGER_LOGS);
    expect(groupLogFiles([{ name: 'x', type: 'fault-manager' }])).toHaveLength(1);
  });

  it('routes a read and builds its query and the stream body', () => {
    expect(logRouteOf({ name: 'messages', type: 'system' })).toBe('system/logs/messages');
    expect(logRouteOf(FAULT_MANAGER_LOGS[3])).toBe('system/logs/fault-manager/info-hival');
    expect(logParamsOf(LOG_FILTERS)).toEqual({ lines: 100, tail: true });
    expect(logParamsOf({ ...LOG_FILTERS, grep: 'ssh', since: '1h' })).toEqual({
      lines: 100,
      tail: true,
      grep: 'ssh',
      since: '1h',
    });
    expect(streamBodyOf(LOG_FILTERS)).toEqual({ follow_lines: 100, grep_pattern: null });
    expect(streamBodyOf({ ...LOG_FILTERS, grep: 'x' }).grep_pattern).toBe('x');
  });

  it('tones and splits a line', () => {
    expect(logLevelClass('daemon.error: failed')).toBe('text-danger');
    expect(logLevelClass('WARNING: x')).toBe('text-warning');
    expect(logLevelClass('auth.info')).toBe('text-info');
    expect(logLevelClass('debug')).toBe('text-muted');
    expect(logLevelClass('plain')).toBe('text-white');
    expect(splitLogLine('Sep 28 10:14:02 zone-1 sshd[1281]: Accepted')).toEqual({
      timestamp: 'Sep 28 10:14:02',
      content: 'zone-1 sshd[1281]: Accepted',
    });
    expect(splitLogLine('no stamp')).toEqual({ timestamp: '', content: 'no stamp' });
  });

  it('names and fills a download', () => {
    expect(logDownloadText({ raw_output: 'a\nb' })).toBe('a\nb');
    expect(logDownloadText({ lines: ['a', 'b'] })).toBe('a\nb');
    expect(logDownloadText(null)).toBe('');
    expect(logDownloadName({ name: 'messages' }, new Date('2026-09-28T12:00:00Z'))).toBe(
      'messages-2026-09-28.log'
    );
  });

  it('keeps the newest thousand stream lines', () => {
    const lines = [...Array(STREAM_LINE_CAP).keys()].map(id => ({ id }));
    const next = withStreamLine(lines, { id: 'new' });
    expect(next).toHaveLength(STREAM_LINE_CAP);
    expect(next[0]).toEqual({ id: 1 });
    expect(next[STREAM_LINE_CAP - 1]).toEqual({ id: 'new' });
  });

  it('matches a file and picks a glyph', () => {
    expect(matchesLogFile({ name: 'messages', type: 'system' }, 'sys')).toBe(true);
    expect(matchesLogFile({ name: 'messages', displayName: 'Messages' }, 'auth')).toBe(false);
    expect(logGlyph('system')).toBe('server');
    expect(logGlyph('authentication')).toBe('key');
    expect(logGlyph('fault-manager')).toBe('warning');
    expect(logGlyph('other')).toBe('file');
  });
});
