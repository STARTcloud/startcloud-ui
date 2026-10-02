import { describe, expect, it } from 'vitest';

import {
  isDuplicateServer,
  maskApiKey,
  serverBodyOf,
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
  it('sends the port as a number, the default entity name and the key only while one is used', () => {
    expect(serverBodyOf(FORM)).toEqual({
      hostname: 'agent-7.example.com',
      port: 5001,
      protocol: 'https',
      entityName: 'Hyperweaver-Production',
      allowInsecure: true,
    });
    expect(serverBodyOf({ ...FORM, entityName: 'Lab', useExistingApiKey: true })).toEqual({
      hostname: 'agent-7.example.com',
      port: 5001,
      protocol: 'https',
      entityName: 'Lab',
      allowInsecure: true,
      apiKey: 'hws_0123456789abcdef',
    });
  });
});
