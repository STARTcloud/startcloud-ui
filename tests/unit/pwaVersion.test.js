import { describe, expect, it, vi } from 'vitest';

import { askWorkerVersion, tellWorkerToken } from '../../src/hooks/usePwa.js';

const workerAnswering = answer => {
  const sent = [];
  return {
    sent,
    postMessage: (data, ports) => {
      sent.push(data);
      ports[0].postMessage(answer);
    },
  };
};

describe('askWorkerVersion', () => {
  it('posts one version message and resolves with the version the worker answers', async () => {
    const worker = workerAnswering({ version: '0.61.0' });
    await expect(askWorkerVersion(worker)).resolves.toBe('0.61.0');
    expect(worker.sent).toEqual([{ type: 'version' }]);
  });

  it('resolves with the empty string for an answer that carries no version', async () => {
    await expect(askWorkerVersion(workerAnswering({}))).resolves.toBe('');
  });
});

describe('tellWorkerToken', () => {
  it('posts the token to the worker and nothing without a worker or a token', () => {
    const worker = { postMessage: vi.fn() };
    tellWorkerToken(worker, 'xsrf-1');
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'xsrf', token: 'xsrf-1' });
    tellWorkerToken(worker, '');
    tellWorkerToken(null, 'xsrf-1');
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });
});
