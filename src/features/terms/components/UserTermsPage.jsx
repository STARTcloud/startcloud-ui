import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import MethodList, { MethodRow } from '../../../components/common/MethodList';
import TermIcon from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { termsShape } from '../api/terms';

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const matches = (entry, needle) =>
  String(entry.label || '')
    .toLowerCase()
    .includes(needle);

const TermsSubline = ({ entry }) => {
  const { t, i18n } = useTranslation();
  return (
    <>
      {t('userTerms.version', { version: entry.version })}
      {entry.accepted_at ? (
        <>
          {' · '}
          {t('userTerms.accepted')}{' '}
          <span title={absoluteTime(entry.accepted_at, i18n.language)}>
            {formatRelativeTime(entry.accepted_at, i18n.language)}
          </span>
        </>
      ) : null}
    </>
  );
};

TermsSubline.propTypes = {
  entry: PropTypes.shape({
    version: PropTypes.string,
    accepted_at: PropTypes.string,
  }).isRequired,
};

const TypeBadge = ({ type }) => {
  const { t } = useTranslation();
  if (!type) {
    return null;
  }
  return (
    <span className="badge bg-secondary">
      {t(`userTerms.type.${String(type).toLowerCase()}`, { defaultValue: type })}
    </span>
  );
};

TypeBadge.propTypes = {
  type: PropTypes.string,
};

const ViewLink = ({ name }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={`/public/policies/${encodeURIComponent(name)}`}
      className="btn btn-sm btn-outline-secondary"
    >
      {t('userTerms.view')}
    </Link>
  );
};

ViewLink.propTypes = {
  name: PropTypes.string.isRequired,
};

/**
 * The Terms and policies page of the identity contract at `/user/terms`,
 * from `GET /api/user/terms`: one row per document the person accepted
 * across the estate's applications (icon, label, the type badge, the
 * version, the acceptance time with its absolute time in the tooltip, View
 * to `/public/policies/<name>`); the navbar search is bound with a query
 * over the documents by label.
 */
const UserTermsPage = ({ terms }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? rows.filter(entry => matches(entry, needle)) : rows;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('userTerms.search'),
    matched: shown.length,
    total: rows.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  useEffect(() => {
    document.title = t('userTerms.title');
  }, [t]);

  const load = useCallback(
    () =>
      terms
        .list()
        .then(list => setRows(Array.isArray(list) ? list : []))
        .catch(error => {
          log.api.error('Error loading accepted terms', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [terms, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="list">
      <h3 className="mb-3">{t('userTerms.title')}</h3>
      <MethodList empty={needle ? t('pages.noMatches') : t('userTerms.none')}>
        {shown.map(entry => (
          <MethodRow
            key={`${entry.name}:${entry.version}`}
            icon={<TermIcon icon={entry.icon} aria-hidden />}
            label={entry.label}
            badges={<TypeBadge type={entry.type} />}
            subline={<TermsSubline entry={entry} />}
            actions={<ViewLink name={entry.name} />}
          />
        ))}
      </MethodList>
    </div>
  );
};

UserTermsPage.propTypes = {
  terms: termsShape.isRequired,
};

export default UserTermsPage;
