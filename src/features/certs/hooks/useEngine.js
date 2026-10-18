import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { loadCerts } from '../lib/certsClient';
import { downloadBytes, downloadText, textOf } from '../utils/download';
import { fileNameOf, formatOf } from '../utils/formats';

const painted = () =>
  new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

/**
 * The engine as a page presses it: `run(work)` marks the page busy,
 * waits for that to paint, loads the engine and calls `work(engine)`,
 * answering its result or null after one danger notice of the failure;
 * `busy` is true while a run is on; `save(answer, stem, to)` hands the
 * browser a conversion's bytes under the feature's one file name.
 *
 * @returns {{ run: Function, busy: boolean, save: Function }} The runner, its state and the saver
 */
export const useEngine = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async work => {
      setBusy(true);
      try {
        await painted();
        const engine = await loadCerts();
        return await work(engine);
      } catch (error) {
        notify('danger', t('certs.notice.engineFailed', { message: error.message }));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [notify, t]
  );

  const save = useCallback((answer, stem, to) => {
    const name = fileNameOf(stem, to, answer.extension);
    if (formatOf(to)?.binary) {
      downloadBytes(answer.bytes, answer.mime, name);
    } else {
      downloadText(textOf(answer.bytes), answer.mime, name);
    }
  }, []);

  return { run, busy, save };
};
