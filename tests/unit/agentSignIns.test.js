import { describe, expect, it } from 'vitest';

import { agentSignInsOf, isLoopback } from '../../src/features/auth/utils/agentSignIns.js';

describe('agentSignInsOf', () => {
  it("reads the agent's paths from the words of auth and the bootstrap from bootstrapAvailable", () => {
    expect(agentSignInsOf({ auth: ['apikey', 'oidc'], bootstrapAvailable: true })).toEqual({
      apiKey: true,
      deviceSso: true,
      tray: true,
      bootstrap: true,
    });
    expect(agentSignInsOf({ auth: ['apikey'] })).toEqual({
      apiKey: true,
      deviceSso: false,
      tray: true,
      bootstrap: false,
    });
    expect(agentSignInsOf({ auth: ['backend', 'oidc'], bootstrapAvailable: true })).toEqual({
      apiKey: false,
      deviceSso: false,
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
