import { describe, expect, it } from 'vitest';

import { askWorkerVersion } from '../../src/hooks/usePwa.js';

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
