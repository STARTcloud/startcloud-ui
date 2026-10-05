import { describe, expect, it } from 'vitest';

import { agentSignInsOf, isLoopback } from '../../src/features/auth/utils/agentSignIns.js';

describe('agentSignInsOf', () => {
  it("reads the agent's paths from the words of auth, the SSO from oidc with oidc-code and the bootstrap from bootstrapAvailable", () => {
    expect(
      agentSignInsOf({
        auth: ['apikey', 'oidc'],
        features: ['oidc-code'],
        bootstrapAvailable: true,
      })
    ).toEqual({
      apiKey: true,
      sso: true,
      tray: true,
      bootstrap: true,
    });
    expect(agentSignInsOf({ auth: ['apikey', 'oidc'] })).toEqual({
      apiKey: true,
      sso: false,
      tray: true,
      bootstrap: false,
    });
    expect(agentSignInsOf({ auth: ['apikey'], features: ['oidc-code'] })).toEqual({
      apiKey: true,
      sso: false,
      tray: true,
      bootstrap: false,
    });
    expect(agentSignInsOf({ auth: ['backend', 'oidc'], bootstrapAvailable: true })).toEqual({
      apiKey: false,
      sso: false,
      tray: false,
      bootstrap: false,
    });
    expect(agentSignInsOf(null).apiKey).toBe(false);
  });
});

describe('isLoopback', () => {
  it('names the loopback hosts alone', () => {
    expect(isLoopback('localhost')).toBe(true);
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('[::1]')).toBe(true);
    expect(isLoopback('lab-1.example.com')).toBe(false);
  });
});
