import { describe, expect, it } from 'vitest';

import {
  addFailureOf,
  isDuplicateServer,
  maskApiKey,
  serverBodyOf,
  testStateOf,
} from '../../src/features/hosts/components/ServersPanel.jsx';

const FORM = {
  hostname: 'agent-7.example.com',
  port: '5001',
  protocol: 'https',
  entityName: '',
  apiKey: 'hws_0123456789abcdef',
  useExistingApiKey: false,
  allowInsecure: true,
};

const t = (key, params = {}) => `${key}${params.hostname ? `:${params.hostname}` : ''}`;

describe('maskApiKey', () => {
  it('keeps the first six and last four characters and masks a short key as nothing', () => {
    expect(maskApiKey('hws_0123456789abcdef')).toBe('hws_01...cdef');
    expect(maskApiKey('short')).toBe('');
    expect(maskApiKey(undefined)).toBe('');
  });
});

describe('isDuplicateServer', () => {
  it('matches a row on hostname, port as a number and protocol', () => {
    const rows = [{ hostname: 'agent-7.example.com', port: 5001, protocol: 'https' }];
    expect(isDuplicateServer(rows, FORM)).toBe(true);
    expect(isDuplicateServer(rows, { ...FORM, port: '5002' })).toBe(false);
    expect(isDuplicateServer(rows, { ...FORM, protocol: 'http' })).toBe(false);
    expect(isDuplicateServer([], FORM)).toBe(false);
  });
});

describe('serverBodyOf', () => {
  it('sends the port as a number, entity_name or its default, allow_insecure and api_key only while one is used', () => {
    expect(serverBodyOf(FORM)).toEqual({
      hostname: 'agent-7.example.com',
      port: 5001,
      protocol: 'https',
      entity_name: 'Hyperweaver-Production',
      allow_insecure: true,
    });
    expect(serverBodyOf({ ...FORM, entityName: 'Lab', useExistingApiKey: true })).toEqual({
      hostname: 'agent-7.example.com',
      port: 5001,
      protocol: 'https',
      entity_name: 'Lab',
      allow_insecure: true,
      api_key: 'hws_0123456789abcdef',
    });
    expect(Object.keys(serverBodyOf(FORM))).not.toContain('entityName');
    expect(Object.keys(serverBodyOf(FORM))).not.toContain('allowInsecure');
  });
});

describe('testStateOf', () => {
  it('reads bootstrap while bootstrapAvailable is true, existing while it is not, error while success is false', () => {
    const info = { hostname: 'agent-7.example.com', agent: 'hyperweaver-agent' };
    expect(testStateOf({ success: true, serverInfo: { ...info, bootstrapAvailable: true } })).toBe(
      'bootstrap'
    );
    expect(testStateOf({ success: true, serverInfo: { ...info, bootstrapAvailable: false } })).toBe(
      'existing'
    );
    expect(testStateOf({ success: true, serverInfo: info })).toBe('existing');
    expect(testStateOf({ success: false, message: 'did not answer', serverInfo: null })).toBe(
      'error'
    );
    expect(testStateOf(null)).toBe('error');
  });
});

describe('addFailureOf', () => {
  it('names a 409 as the duplicate, draws a 502 by the agent reason in its title and falls back to the message', () => {
    expect(addFailureOf({ status: 409, problem: { title: 'taken' } }, FORM, t)).toBe(
      'settings.serverManagementTab.duplicateServer:agent-7.example.com'
    );
    expect(
      addFailureOf(
        { status: 502, problem: { title: 'The agent refused the bootstrap' }, message: 'x' },
        FORM,
        t
      )
    ).toBe('The agent refused the bootstrap');
    expect(addFailureOf({ status: 502, problem: null, message: 'Bad gateway' }, FORM, t)).toBe(
      'Bad gateway'
    );
    expect(addFailureOf({ status: 500, message: '' }, FORM, t)).toBe(
      'settings.serverManagementTab.unexpectedError'
    );
  });
});
