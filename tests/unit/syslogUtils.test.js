import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TARGETS,
  RULE_BUILDER,
  SYSLOG_RULE_FILTERS,
  getActionTypeDisplay,
  getServiceStatusColor,
  getServiceType,
  getValidationColor,
  matchesSyslogRule,
  processRuleDisplay,
  ruleAction,
  ruleKey,
  ruleLine,
} from '../../src/features/hosts/utils/syslogUtils.js';

const rule = (selector, action, more = {}) => ({
  line_number: 1,
  selector,
  action,
  full_line: `${selector}\t${action}`,
  parsed: { action_type: 'unknown', action_target: action },
  ...more,
});

describe('the tones', () => {
  it('tones the validation and the service status', () => {
    expect(getValidationColor(['x'], [])).toBe('danger');
    expect(getValidationColor([], ['x'])).toBe('warning');
    expect(getValidationColor([], [])).toBe('success');
    expect(getValidationColor(undefined, undefined)).toBe('success');
    expect(getServiceStatusColor({ state: 'online' })).toBe('success');
    expect(getServiceStatusColor({ state: 'Offline' })).toBe('danger');
    expect(getServiceStatusColor({ state: 'maintenance' })).toBe('warning');
    expect(getServiceStatusColor(null)).toBe('secondary');
  });
});

describe('getServiceType', () => {
  it('reads rsyslog, syslog and unknown from the FMRI', () => {
    expect(getServiceType({ service_fmri: 'svc:/system/rsyslog:default' }).name).toBe('rsyslog');
    expect(getServiceType({ service_fmri: 'svc:/system/system-log:default' })).toEqual({
      name: 'syslog',
      display: 'syslog (Traditional)',
      icon: 'file',
    });
    expect(getServiceType(null).icon).toBe('question');
  });
});

describe('processRuleDisplay', () => {
  it('reads the rsyslog directives', () => {
    expect(processRuleDisplay({ full_line: 'module(load="imuxsock")' })).toMatchObject({
      actionType: 'rsyslog_module',
      target: 'imuxsock',
    });
    expect(processRuleDisplay({ full_line: 'global(workDirectory="/var")' }).actionType).toBe(
      'rsyslog_global'
    );
    expect(
      processRuleDisplay({ full_line: 'include(file="/etc/rsyslog.d/*.conf")' })
    ).toMatchObject({ actionType: 'rsyslog_include', target: '/etc/rsyslog.d/*.conf' });
    expect(processRuleDisplay({ full_line: 'input(type="imudp" port="514")' }).target).toBe(
      'imudp'
    );
  });

  it('reads the m4 constructs and a malformed line', () => {
    expect(processRuleDisplay({ full_line: ')' }).actionType).toBe('m4_block_end');
    expect(processRuleDisplay({ full_line: "ifdef(`LOGHOST', ," }).actionType).toBe(
      'm4_block_start'
    );
    expect(processRuleDisplay({ full_line: '' })).toMatchObject({
      isValid: false,
      actionType: 'malformed',
    });
  });

  it('reads the special targets', () => {
    expect(processRuleDisplay(rule('*.emerg', ':omusrmsg:*'))).toMatchObject({
      actionType: 'all_users',
      target: '*',
    });
    expect(processRuleDisplay(rule('*.emerg', ':omusrmsg:root'))).toMatchObject({
      actionType: 'user',
      target: 'root',
    });
    expect(processRuleDisplay(rule('mail.*', '-/var/log/mail'))).toMatchObject({
      actionType: 'file_async',
      target: '/var/log/mail',
    });
    expect(
      processRuleDisplay(rule('mail.debug', "ifdef(`LOGHOST', /var/log/syslog, @loghost)"))
    ).toMatchObject({
      actionType: 'conditional_choice',
      target: 'IF LOGHOST: /var/log/syslog ELSE: @loghost',
    });
  });

  it('detects the action type from the target where the agent named none', () => {
    expect(processRuleDisplay(rule('*.err', '/var/adm/messages'))).toMatchObject({
      actionType: 'file',
      isComplex: false,
    });
    expect(processRuleDisplay(rule('*.alert;kern.err', '@loghost'))).toMatchObject({
      actionType: 'remote_host',
      target: 'loghost',
      isComplex: true,
      isMultiSelector: true,
    });
    expect(processRuleDisplay(rule('*.emerg', '*')).actionType).toBe('all_users');
    expect(processRuleDisplay(rule('*.alert', 'root,operator')).actionType).toBe('multiple_users');
    expect(processRuleDisplay(rule('*.alert', 'root')).actionType).toBe('user');
    expect(
      processRuleDisplay(rule('*.err', '/dev/sysmsg', { parsed: { action_type: 'file' } }))
        .actionType
    ).toBe('file');
  });
});

describe('getActionTypeDisplay', () => {
  it('draws a known type, in the warning tone while complex and dimming', () => {
    expect(getActionTypeDisplay('file', false)).toEqual({
      tone: 'info',
      icon: 'file',
      text: 'File',
    });
    expect(getActionTypeDisplay('file', true).tone).toBe('warning');
    expect(getActionTypeDisplay('remote_host', true).tone).toBe('warning');
    expect(getActionTypeDisplay('rsyslog_module', true).tone).toBe('success');
    expect(getActionTypeDisplay('odd', false)).toEqual({
      tone: 'secondary',
      icon: 'question',
      text: 'odd',
    });
    expect(getActionTypeDisplay('', false).text).toBe('Unknown');
  });
});

describe('the rule builder', () => {
  it('opens on a file rule and resets the target by type', () => {
    expect(RULE_BUILDER.action_type).toBe('file');
    expect(DEFAULT_TARGETS.remote_host).toBe('loghost');
  });

  it('writes the action of each type for each service', () => {
    const syslog = { name: 'syslog' };
    const rsyslog = { name: 'rsyslog' };
    expect(ruleAction({ action_type: 'remote_host', action_target: 'loghost' }, syslog)).toBe(
      '@loghost'
    );
    expect(ruleAction({ action_type: 'all_users' }, syslog)).toBe('*');
    expect(ruleAction({ action_type: 'all_users' }, rsyslog)).toBe(':omusrmsg:*');
    expect(ruleAction({ action_type: 'user', action_target: 'root' }, syslog)).toBe('root');
    expect(ruleAction({ action_type: 'user', action_target: 'root' }, rsyslog)).toBe(
      ':omusrmsg:root'
    );
    expect(ruleAction({ action_type: 'file', action_target: '/var/log/x' }, syslog)).toBe(
      '/var/log/x'
    );
  });

  it('writes the line with three tabs', () => {
    expect(ruleLine({ ...RULE_BUILDER, facility: 'mail', level: 'err' }, { name: 'syslog' })).toBe(
      'mail.err\t\t\t/var/log/custom.log'
    );
  });
});

describe('the table', () => {
  it('matches a rule by its parts and by its detected type', () => {
    const row = rule('*.alert;kern.err', '@loghost');
    expect(matchesSyslogRule(row, 'kern')).toBe(true);
    expect(matchesSyslogRule(row, 'remote_host')).toBe(true);
    expect(matchesSyslogRule(row, 'cron')).toBe(false);
  });

  it('groups by action type and keys by line number', () => {
    const [group] = SYSLOG_RULE_FILTERS;
    expect(group.values(rule('*.err', '/var/adm/messages'))).toEqual(['file']);
    expect(group.labelFor('file')).toBe('File');
    expect(ruleKey({ line_number: 4 })).toBe('4');
    expect(ruleKey({ full_line: 'x' })).toBe('x');
  });
});
