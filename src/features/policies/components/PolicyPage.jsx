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

const NO_FIELDS = [];

const languageName = (tag, language) => {
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(tag) || tag;
  } catch {
    return tag;
  }
};

const usePolicy = (name, region) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [loaded, setLoaded] = useState(EMPTY);

  useEffect(() => {
    let active = true;
    fetchPolicy(name, region)
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
  }, [name, region, notify, t]);

  return loaded.name === name ? loaded : EMPTY;
};

/**
 * `/public/policies/:name`: the wide article column with the title, the
 * version badge, the badge of the copy's language while the answer names
 * a `locale`, and the dates, the prose from `GET /api/policies/{name}`
 * drawn through the document component with every anchor of the answer's
 * `anchor_key` a blank and no input, the URL's `?region=` passed to the
 * read to force a regional variant, and "Back" to the referring page when
 * there is one, else "Back to sign in". The page offers no language
 * chooser.
 */
const PolicyPage = () => {
  const { t, i18n } = useTranslation(['auth', 'shared']);
  const { name } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const region = new URLSearchParams(location.search).get('region') || '';
  const { answer: state, failed } = usePolicy(name, region);
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
            {state.locale ? (
              <span className="auth-badge auth-date" data-badge="locale">
                {languageName(state.locale, i18n.language)}
              </span>
            ) : null}
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
      {state ? (
        <MarkdownArticle
          html={state.content_html}
          anchorKey={state.anchor_key || ''}
          fields={state.fields || NO_FIELDS}
          fieldsVersion={state.fields_version}
          className="auth-doc-flow"
        />
      ) : null}
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
