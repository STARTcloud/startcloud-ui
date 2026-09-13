import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import MethodList, { MethodRow } from '../../../components/common/MethodList';
import SectionHeading from '../../../components/common/SectionHeading';
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

const AcceptedAt = ({ labelKey, value }) => {
  const { t, i18n } = useTranslation();
  if (!value) {
    return null;
  }
  return (
    <>
      {' · '}
      {t(labelKey)}{' '}
      <span title={absoluteTime(value, i18n.language)}>
        {formatRelativeTime(value, i18n.language)}
      </span>
    </>
  );
};

AcceptedAt.propTypes = {
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string,
};

const VersionsFold = ({ entry }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const versions = Array.isArray(entry.versions) ? entry.versions : [];
  const earlier = versions.filter(version => version.version !== entry.version);
  if (earlier.length === 0) {
    return null;
  }
  return (
    <span className="d-block">
      <button
        type="button"
        className="btn btn-sm btn-link p-0"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
      >
        {open ? <FaChevronDown aria-hidden /> : <FaChevronRight aria-hidden />}{' '}
        {t('userTerms.versions', { count: earlier.length })}
      </button>
      {open
        ? earlier.map(version => (
            <span key={version.version} className="d-block ps-3">
              {t('userTerms.version', { version: version.version })}
              <AcceptedAt labelKey="userTerms.accepted" value={version.accepted_at} />
            </span>
          ))
        : null}
    </span>
  );
};

VersionsFold.propTypes = {
  entry: PropTypes.shape({
    version: PropTypes.string,
    versions: PropTypes.arrayOf(
      PropTypes.shape({ version: PropTypes.string, accepted_at: PropTypes.string })
    ),
  }).isRequired,
};

const TermsSubline = ({ entry }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="d-block">
        {t('userTerms.version', { version: entry.version })}
        <AcceptedAt labelKey="userTerms.lastAccepted" value={entry.accepted_at} />
        {entry.first_accepted_at && entry.first_accepted_at !== entry.accepted_at ? (
          <AcceptedAt labelKey="userTerms.firstAccepted" value={entry.first_accepted_at} />
        ) : null}
      </span>
      <VersionsFold entry={entry} />
    </>
  );
};

TermsSubline.propTypes = {
  entry: PropTypes.shape({
    version: PropTypes.string,
    accepted_at: PropTypes.string,
    first_accepted_at: PropTypes.string,
    versions: PropTypes.array,
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
 * version last accepted with its accepted time, first accepted when it
 * differs, a fold listing every earlier version accepted with its own
 * time from `versions`, each absolute time in its tooltip, View to
 * `/public/policies/<name>`); the navbar search is bound with a query
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
      <SectionHeading title={t('userTerms.title')} />
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
