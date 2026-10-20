import PropTypes from 'prop-types';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CloseButton, Toast, ToastContainer } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCircleInfo,
  FaCircleXmark,
  FaRegCopy,
  FaTriangleExclamation,
} from 'react-icons/fa6';

import { NoticeContext, useNoticeList } from '../../contexts/NoticeContext';
import { useCssVar } from '../../hooks/useCssVar';
import CopyButton from '../common/CopyButton';

const AUTO_HIDE_MS = 6000;
const ALERT_KINDS = ['warning', 'danger'];
const KIND_ICONS = {
  success: FaCircleCheck,
  info: FaCircleInfo,
  warning: FaTriangleExclamation,
  danger: FaCircleXmark,
};

const roleOf = kind => (ALERT_KINDS.includes(kind) ? 'alert' : 'status');

const spanOf = kind => (ALERT_KINDS.includes(kind) ? AUTO_HIDE_MS * 2 : AUTO_HIDE_MS);

const linkOf = action => {
  const target = action?.to || action?.href;
  return target ? new URL(target, window.location.href).href : '';
};

const actionShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  to: PropTypes.string,
  href: PropTypes.string,
  action: PropTypes.string,
});

const noticeShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  kind: PropTypes.oneOf(['success', 'info', 'warning', 'danger']).isRequired,
  text: PropTypes.node.isRequired,
  tier: PropTypes.oneOf(['card', 'banner']).isRequired,
  key: PropTypes.string.isRequired,
  sticky: PropTypes.bool.isRequired,
  action: actionShape,
});

const NoticeAction = ({ action, LinkComponent }) => {
  const className = 'btn btn-sm btn-outline-secondary text-nowrap';
  if (action.to) {
    return (
      <LinkComponent to={action.to} className={className} data-action={action.action}>
        {action.label}
      </LinkComponent>
    );
  }
  if (action.href) {
    return (
      <a href={action.href} className={className} data-action={action.action}>
        {action.label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      data-action={action.action}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
};

NoticeAction.propTypes = {
  action: actionShape.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

const Banner = ({ notice, onDismiss, LinkComponent }) => {
  const { t } = useTranslation();
  const Icon = KIND_ICONS[notice.kind];
  return (
    <div className={`notice-banner notice-banner-${notice.kind} w-100`} role={roleOf(notice.kind)}>
      <Icon className="flex-shrink-0" aria-hidden />
      <span className="flex-grow-1">{notice.text}</span>
      {notice.action ? <NoticeAction action={notice.action} LinkComponent={LinkComponent} /> : null}
      <CloseButton onClick={() => onDismiss(notice.id)} aria-label={t('notice.dismiss')} />
    </div>
  );
};

Banner.propTypes = {
  notice: noticeShape.isRequired,
  onDismiss: PropTypes.func.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

/**
 * The band under the header row: every banner-tier notice, newest first,
 * each with its kind icon, text, optional action and a dismiss button.
 */
export const NoticeBanners = ({ LinkComponent = 'a' }) => {
  const { dismiss } = useContext(NoticeContext);
  return useNoticeList()
    .filter(notice => notice.tier === 'banner')
    .map(notice => (
      <Banner key={notice.id} notice={notice} onDismiss={dismiss} LinkComponent={LinkComponent} />
    ));
};

NoticeBanners.propTypes = {
  LinkComponent: PropTypes.elementType,
};

const Countdown = ({ span, paused, children }) => {
  const ring = useRef(null);
  useCssVar(ring, '--notice-span', `${span}ms`);
  return (
    <span ref={ring} className={paused ? 'notice-countdown paused' : 'notice-countdown'}>
      <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <circle className="notice-countdown-track" cx="18" cy="18" r="15.9155" />
        <circle className="notice-countdown-fill" cx="18" cy="18" r="15.9155" />
      </svg>
      {children}
    </span>
  );
};

Countdown.propTypes = {
  span: PropTypes.number.isRequired,
  paused: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

const NoticeCard = ({ notice, onDismiss, LinkComponent }) => {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(0);
  const textRef = useRef(null);
  const span = spanOf(notice.kind);
  const autoHide = !notice.sticky;
  const dismiss = useCallback(() => onDismiss(notice.id), [onDismiss, notice.id]);

  useEffect(() => {
    if (!autoHide || paused) {
      return undefined;
    }
    const timer = setTimeout(dismiss, span);
    return () => clearTimeout(timer);
  }, [autoHide, paused, dismiss, span, round]);

  const resume = () => {
    setRound(current => current + 1);
    setPaused(false);
  };

  const leaveFocus = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      resume();
    }
  };

  const copied = () =>
    [textRef.current?.textContent || '', linkOf(notice.action)].filter(Boolean).join('\n');

  const close = <CloseButton onClick={dismiss} aria-label={t('notice.dismiss')} />;
  const Icon = KIND_ICONS[notice.kind];
  return (
    <Toast
      className={`notice-card notice-card-${notice.kind}`}
      data-round={round}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={resume}
      onFocus={() => setPaused(true)}
      onBlur={leaveFocus}
    >
      <Toast.Body className="d-flex align-items-start gap-2">
        <Icon className={`text-${notice.kind} flex-shrink-0 mt-1`} aria-hidden />
        <span ref={textRef} className="flex-grow-1 notice-text">
          {notice.text}
        </span>
        {notice.action ? (
          <NoticeAction action={notice.action} LinkComponent={LinkComponent} />
        ) : null}
        <CopyButton
          text={copied}
          glyph={FaRegCopy}
          className="btn btn-sm btn-glyph notice-copy flex-shrink-0"
        />
        {autoHide ? (
          <Countdown key={round} span={span} paused={paused}>
            {close}
          </Countdown>
        ) : (
          close
        )}
      </Toast.Body>
    </Toast>
  );
};

NoticeCard.propTypes = {
  notice: noticeShape.isRequired,
  onDismiss: PropTypes.func.isRequired,
  LinkComponent: PropTypes.elementType.isRequired,
};

/**
 * The in-app notice cards at the top right under the header: the four
 * newest card-tier notices, success and info gone after six seconds and
 * warning and danger after twelve, each paused while the pointer or focus
 * rests on it and given its whole span again when the pointer or focus
 * leaves, its dismiss ringed by a countdown arc in its kind's tone that
 * drains over the card's span, freezes while paused and starts full on
 * every leave, `data-round` counting the leaves; beside the dismiss a
 * Copy glyph puts the card's text on the clipboard, the link of its
 * action on a second line where the action carries `to` or `href`; a
 * sticky card draws no ring and stays until dismissed.
 */
export const NoticeCards = ({ LinkComponent = 'a' }) => {
  const { dismiss } = useContext(NoticeContext);
  const cards = useNoticeList().filter(notice => notice.tier === 'card');
  return (
    <ToastContainer position="top-end" containerPosition="fixed" className="notice-cards">
      {cards.map(notice => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onDismiss={dismiss}
          LinkComponent={LinkComponent}
        />
      ))}
    </ToastContainer>
  );
};

NoticeCards.propTypes = {
  LinkComponent: PropTypes.elementType,
};
