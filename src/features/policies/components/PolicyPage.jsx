import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import { useNotify } from '../../../contexts/NoticeContext';
import { policy as fetchPolicy } from '../api/policies';

const EMPTY = { name: '', answer: null, failed: false };

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date);
};

const usePolicy = name => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [loaded, setLoaded] = useState(EMPTY);

  useEffect(() => {
    let active = true;
    fetchPolicy(name)
      .then(answer => {
        if (active) {
          setLoaded({ name, answer, failed: false });
        }
      })
      .catch(error => {
        if (active) {
          notify('danger', t(error.messageKey || 'errors.request'));
          setLoaded({ name, answer: null, failed: true });
        }
      });
    return () => {
      active = false;
    };
  }, [name, notify, t]);

  return loaded.name === name ? loaded : EMPTY;
};

/**
 * `/public/policies/:name`: the wide article column with the title, the
 * version badge and dates, the prose from `GET /api/policies/{name}`, and
 * "Back" to the referring page when there is one, else "Back to sign in".
 */
const PolicyPage = () => {
  const { t, i18n } = useTranslation(['auth', 'shared']);
  const { name } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { answer: state, failed } = usePolicy(name);
  const hasReferrer = location.key !== 'default';

  useEffect(() => {
    document.title = state?.label || t('policy.pageTitle');
  }, [state, t]);

  const dates = state
    ? [
        state.updated_at
          ? t('policy.updated', { date: formatDate(state.updated_at, i18n.language) })
          : '',
        state.created_at
          ? t('policy.created', { date: formatDate(state.created_at, i18n.language) })
          : '',
      ].filter(Boolean)
    : [];

  return (
    <AuthShell
      title={state?.label || t('policy.pageTitle')}
      subtitle={
        state ? (
          <>
            <span className="auth-badge">{t('policy.version', { version: state.version })}</span>
            {dates.map(line => (
              <span key={line} className="auth-date">
                {line}
              </span>
            ))}
          </>
        ) : (
          ''
        )
      }
      wide
    >
      {!state && !failed ? <AuthSpinner label={t('shared:loading')} /> : null}
      {state ? <MarkdownArticle html={state.content_html} className="auth-doc-flow" /> : null}
      {hasReferrer ? (
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          onClick={() => navigate(-1)}
        >
          {t('policy.back')}
        </button>
      ) : (
        <Link to="/login" className="auth-btn auth-btn-secondary auth-btn-block">
          {t('policy.return')}
        </Link>
      )}
    </AuthShell>
  );
};

export default PolicyPage;
