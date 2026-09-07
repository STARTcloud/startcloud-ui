import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../../../components/common/BrandLogo';
import { useNotify } from '../../../contexts/NoticeContext';
import AuthShell from '../../auth/components/AuthShell';
import { errorDetails } from '../api/errors';

const STATUS = /^\d{3}$/;
const REFERENCE = /^[0-9a-f]{16}$/;
const SAFE_PATH = /^\/(?![/\\])/;
const TITLED = ['403', '404', '500'];
const GENERIC = { status: '500', reference: '', path: '' };
const COPIED_MS = 2000;

const stamped = () => {
  const html = document.documentElement;
  return {
    status: html.getAttribute('data-error-status') || '',
    reference: html.getAttribute('data-error-reference') || '',
    path: html.getAttribute('data-error-path') || '',
  };
};

const fromUrl = search => {
  const params = new URLSearchParams(search);
  return {
    status: params.get('status') || '',
    reference: params.get('reference') || '',
    path: params.get('path') || '',
  };
};

const accepted = ({ status, reference, path }) =>
  STATUS.test(status) &&
  (reference === '' || REFERENCE.test(reference)) &&
  (path === '' || SAFE_PATH.test(path));

const faultOf = ({ notFound, pathname, search }) => {
  if (notFound) {
    return { status: '404', reference: '', path: SAFE_PATH.test(pathname) ? pathname : '' };
  }
  const attributes = stamped();
  const candidate = attributes.status ? attributes : fromUrl(search);
  return accepted(candidate) ? candidate : GENERIC;
};

const formatTime = date => {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
};

const reportUrlOf = (ticketUrl, reference) => {
  if (!ticketUrl) {
    return '';
  }
  try {
    const url = new URL(ticketUrl);
    url.searchParams.set('type', 'Backend');
    url.searchParams.set('context', reference);
    return url.href;
  } catch {
    return '';
  }
};

const DETAIL_ROWS = ['code', 'message', 'path', 'time', 'reference', 'user'];

const copyText = ({ fault, time, details }) =>
  [
    `status: ${fault.status}`,
    `path: ${fault.path}`,
    `time: ${time}`,
    `reference: ${fault.reference}`,
    `browser: ${navigator.userAgent}`,
    `screen: ${window.screen.width}x${window.screen.height}`,
    ...(details ? DETAIL_ROWS.map(row => `${row}: ${details[row] ?? ''}`) : []),
    details?.trace || '',
  ]
    .filter(Boolean)
    .join('\n');

const useErrorDetails = ({ reference, admin }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!admin || !reference) {
      return undefined;
    }
    let mounted = true;
    errorDetails(reference)
      .then(data => {
        if (mounted) {
          setDetails(data);
        }
      })
      .catch(error => {
        if (mounted && error.status !== 404) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [admin, notify, reference, t]);

  return details;
};

const useCopied = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = text =>
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      })
      .catch(() => null);

  return { copied, copy };
};

/**
 * The issuer's error page at `/error` and for a route the router does not
 * know: the brand mark, the title and body by status (`403`, `404`, `500`,
 * any other "{{status}} error"), the reference line, Go home, Go back while
 * the history holds a page, Report this issue while signed in (the menu's
 * ticket URL with `type=Backend` and the reference alone as `context`) and
 * Copy error details; the values come from the `data-error-*` attributes
 * the server stamped on `<html>`, from the URL after a `303`, or `404` with
 * the current path for an unknown route, each accepted only under its
 * pattern, else the generic 500. For an admin the closed Technical details
 * fold draws `GET /api/admin/errors/{reference}`, its rows labelled from
 * `errors.detail.*` and its trace copied, never sent in a URL.
 */
const ErrorPage = ({ theme, ticketUrl = '', admin = false, notFound = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const fault = useMemo(
    () => faultOf({ notFound, pathname, search }),
    [notFound, pathname, search]
  );
  const [time] = useState(() => formatTime(new Date()));
  const details = useErrorDetails({ reference: fault.reference, admin });
  const { copied, copy } = useCopied();
  const canGoBack = window.history.length > 1;
  const known = TITLED.includes(fault.status);
  const title = t(known ? `errors.title.${fault.status}` : 'errors.title.other', {
    status: fault.status,
  });
  const body = t(known ? `errors.body.${fault.status}` : 'errors.body.500');
  const report = reportUrlOf(ticketUrl, fault.reference);
  const line = [fault.path, fault.status, time].filter(Boolean);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <AuthShell
      title={title}
      subtitle={body}
      icon={<BrandLogo theme={theme} className="auth-brand-mark" />}
    >
      <div className="auth-ack">
        <span>
          {fault.reference ? (
            <>
              {t('errors.reference')} <code>{fault.reference}</code> ·{' '}
            </>
          ) : null}
          {line.join(' · ')}
        </span>
      </div>
      {details ? (
        <details className="auth-details">
          <summary>{t('errors.details')}</summary>
          <dl className="auth-details-rows">
            {DETAIL_ROWS.map(row => (
              <div key={row} className="auth-details-row">
                <dt>{t(`errors.detail.${row}`)}</dt>
                <dd>{details[row] ?? ''}</dd>
              </div>
            ))}
          </dl>
          {details.trace ? <pre>{details.trace}</pre> : null}
        </details>
      ) : null}
      <div className="auth-form">
        <Link to="/" className="auth-btn auth-btn-primary">
          {t('errors.goHome')}
        </Link>
        {canGoBack ? (
          <button
            type="button"
            className="auth-btn auth-btn-secondary"
            onClick={() => navigate(-1)}
          >
            {t('errors.goBack')}
          </button>
        ) : null}
        {report ? (
          <a
            href={report}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-btn auth-btn-secondary"
          >
            {t('errors.report')}
          </a>
        ) : null}
        <button
          type="button"
          className="auth-btn auth-btn-secondary"
          onClick={() => copy(copyText({ fault, time, details }))}
          aria-live="polite"
        >
          {copied ? t('errors.copied') : t('errors.copy')}
        </button>
      </div>
    </AuthShell>
  );
};

ErrorPage.propTypes = {
  theme: PropTypes.string.isRequired,
  ticketUrl: PropTypes.string,
  admin: PropTypes.bool,
  notFound: PropTypes.bool,
};

export default ErrorPage;
