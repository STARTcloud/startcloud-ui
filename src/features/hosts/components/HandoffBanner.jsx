import { useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaPlus } from 'react-icons/fa6';

import { NoticeContext, useNotify, useNoticeList } from '../../../contexts/NoticeContext';
import { HyperweaverGlyph } from '../../deploy';
import { handoffTitleOf } from '../utils/machineCreate';

const BANNER_KEY = 'deploy-handoff';

const GLYPHS = {
  machine: HyperweaverGlyph,
  provisioner: FaDownload,
  template: FaDownload,
  source: FaPlus,
};

const bannerOf = ({ word, seed, none, t }) => {
  const Glyph = GLYPHS[word];
  return (
    <span className="d-inline-flex align-items-center gap-2" data-handoff={word}>
      <Glyph aria-hidden="true" />
      <span>
        <strong>{t(`hosts.deploy.title.${word}`, handoffTitleOf(word, seed))}</strong>{' '}
        {t(none ? 'hosts.deploy.none' : `hosts.deploy.pick.${word}`)}
      </span>
    </span>
  );
};

const holds = store => store.get().some(notice => notice.key === BANNER_KEY);

/**
 * The keyed banner of a Deploy hand-off on the hosts page, raised through
 * the Notices banner tier while `shown`: the word's glyph, the title
 * naming what was handed and one line, the pick line while hosts can take
 * it and the none line while no host can, replaced in place as the route's
 * hand-off changes; its dismiss calls `onDismissed`, so the page drops the
 * hand-off from the route, and the banner leaves with the page.
 *
 * @param {Object} options - The hand-off and the page's side
 * @param {{ word: string, seed: Object }|null} options.handoff - The hand-off of `handoffOf`
 * @param {boolean} options.shown - Whether the banner draws
 * @param {boolean} options.none - Whether no host can take the hand-off
 * @param {Function} options.onDismissed - Called once the person dismissed the banner
 */
export const useHandoffBanner = ({ handoff, shown, none, onDismissed }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { store } = useContext(NoticeContext);
  const present = useNoticeList().some(notice => notice.key === BANNER_KEY);
  const raised = useRef(false);
  const latest = useRef(null);
  const stamp = handoff ? JSON.stringify([handoff.word, handoff.seed, none]) : '';

  useEffect(() => {
    latest.current = handoff;
  });

  useEffect(() => {
    if (!shown || !stamp) {
      return;
    }
    const { word, seed } = latest.current;
    notify(none ? 'warning' : 'info', bannerOf({ word, seed, none, t }), {
      tier: 'banner',
      key: BANNER_KEY,
    });
    raised.current = true;
  }, [shown, stamp, none, notify, t]);

  useEffect(() => {
    if (raised.current && !holds(store)) {
      raised.current = false;
      onDismissed();
    }
  }, [present, store, onDismissed]);

  useEffect(() => () => notify('info', '', { key: BANNER_KEY }), [notify]);
};
