import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPuzzlePiece, FaXmark } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import MethodList, { MethodRow } from '../../../components/common/MethodList';
import { errorKeys, useStepUp } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { applicationsShape } from '../api/applications';

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const nameOf = app => app.client_name || app.client_id;

const matches = (app, needle) => nameOf(app).toLowerCase().includes(needle);

const RelativeTime = ({ value }) => {
  const { i18n } = useTranslation();
  if (!value) {
    return null;
  }
  return (
    <span title={absoluteTime(value, i18n.language)}>
      {formatRelativeTime(value, i18n.language)}
    </span>
  );
};

RelativeTime.propTypes = {
  value: PropTypes.string,
};

const ScopeChips = ({ app, onRemoveScope }) => {
  const { t } = useTranslation();
  const scopes = Array.isArray(app.consent_scopes) ? app.consent_scopes : [];
  if (scopes.length === 0) {
    return null;
  }
  return (
    <span className="d-flex align-items-center flex-wrap gap-1 mt-1">
      <span>{t('applications.permissions')}</span>
      {scopes.map(scope => (
        <span
          key={scope}
          className="badge rounded-pill bg-secondary d-inline-flex align-items-center"
        >
          {scope}
          {scope === 'openid' ? null : (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-1 text-white d-inline-flex align-items-center justify-content-center scope-chip-remove"
              aria-label={t('applications.removeScope', { scope })}
              title={t('applications.removeScope', { scope })}
              onClick={() => onRemoveScope(app, scope)}
            >
              <FaXmark aria-hidden />
            </button>
          )}
        </span>
      ))}
    </span>
  );
};

ScopeChips.propTypes = {
  app: PropTypes.shape({ consent_scopes: PropTypes.array }).isRequired,
  onRemoveScope: PropTypes.func.isRequired,
};

const AppBadges = ({ app }) => {
  const { t } = useTranslation();
  return (
    <>
      {app.active_sessions > 0 ? (
        <span className="badge bg-success">
          {t('applications.activeSessions', { count: app.active_sessions })}
        </span>
      ) : null}
      {app.registered === false ? (
        <span className="badge bg-warning text-dark">{t('applications.unregistered')}</span>
      ) : null}
    </>
  );
};

AppBadges.propTypes = {
  app: PropTypes.shape({
    active_sessions: PropTypes.number,
    registered: PropTypes.bool,
  }).isRequired,
};

const AppSubline = ({ app, onRemoveScope }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="d-block">
        {app.first_used_at ? (
          <>
            {t('applications.firstUsed')} <RelativeTime value={app.first_used_at} />
          </>
        ) : null}
        {app.first_used_at && app.last_used_at ? ' · ' : null}
        {app.last_used_at ? (
          <>
            {t('applications.lastUsed')} <RelativeTime value={app.last_used_at} />
          </>
        ) : null}
      </span>
      <ScopeChips app={app} onRemoveScope={onRemoveScope} />
    </>
  );
};

AppSubline.propTypes = {
  app: PropTypes.shape({
    first_used_at: PropTypes.string,
    last_used_at: PropTypes.string,
  }).isRequired,
  onRemoveScope: PropTypes.func.isRequired,
};

const AppActions = ({ app, onRevoke }) => {
  const { t } = useTranslation();
  return (
    <>
      <Link to="/user/profile/sessions" className="btn btn-sm btn-outline-secondary">
        {t('applications.sessions')}
      </Link>
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRevoke(app)}>
        {t('applications.revoke')}
      </button>
    </>
  );
};

AppActions.propTypes = {
  app: PropTypes.object.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

const confirmationsFor = (t, applications) => {
  const keyword = t('pages.confirm.keyword');
  return {
    revoke: app => ({
      title: t('applications.revoke'),
      message: t('applications.revokeBody', {
        app: nameOf(app),
        count: app.active_sessions || 0,
        keyword,
      }),
      call: () => applications.revoke(app.client_id),
      reason: t('applications.revokeReason', { app: nameOf(app) }),
    }),
    scope: (app, scope) => ({
      title: t('applications.removeScope', { scope }),
      message: t('applications.removeScopeBody', { scope, app: nameOf(app), keyword }),
      call: () => applications.removeScope(app.client_id, scope),
      reason: '',
    }),
  };
};

/**
 * The Applications page of the identity contract at `/user/applications`,
 * from `GET /api/user/applications`: one row per application of the
 * estate the person authorized (icon, name, the active-session and
 * unregistered badges, first and last use, the permission chips each with
 * a remove control and none on `openid`, a Sessions link to the profile's
 * Sessions route and Revoke access behind a confirm that names the
 * sessions it ends); every stepped-up call goes through the step-up
 * dialog; the navbar search is bound with a query over the applications
 * by name.
 */
const ApplicationsPage = ({ applications, stepUp, user = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const { guard, dialog } = useStepUp({
    stepUp,
    hasPassword: Boolean(user?.has_local_auth),
  });
  const confirmations = confirmationsFor(t, applications);
  const needle = query.trim().toLowerCase();
  const shown = needle ? apps.filter(app => matches(app, needle)) : apps;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('applications.search'),
    matched: shown.length,
    total: apps.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  useEffect(() => {
    document.title = t('applications.title');
  }, [t]);

  const load = useCallback(
    () =>
      applications
        .list()
        .then(list => setApps(Array.isArray(list) ? list : []))
        .catch(error => {
          log.api.error('Error loading applications', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [applications, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const confirmPending = async () => {
    if (!pending) {
      return;
    }
    try {
      await guard(pending.call, pending.reason);
      await load();
    } catch (error) {
      if (error?.code !== 'step_up_required') {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  return (
    <div className="list">
      <h3 className="mb-3">{t('applications.title')}</h3>
      <MethodList empty={needle ? t('pages.noMatches') : t('applications.none')}>
        {shown.map(app => {
          const subline = (
            <AppSubline
              app={app}
              onRemoveScope={(entry, scope) => setPending(confirmations.scope(entry, scope))}
            />
          );
          const actions = (
            <AppActions app={app} onRevoke={entry => setPending(confirmations.revoke(entry))} />
          );
          return (
            <MethodRow
              key={app.client_id}
              icon={<FaPuzzlePiece aria-hidden />}
              iconUrl={app.icon_url || ''}
              label={nameOf(app)}
              badges={<AppBadges app={app} />}
              subline={subline}
              actions={actions}
            />
          );
        })}
      </MethodList>
      <ConfirmModal
        show={pending !== null}
        handleClose={() => setPending(null)}
        handleConfirm={confirmPending}
        title={pending?.title || ''}
        message={pending?.message || ''}
      />
      {dialog}
    </div>
  );
};

ApplicationsPage.propTypes = {
  applications: applicationsShape.isRequired,
  stepUp: PropTypes.func.isRequired,
  user: PropTypes.shape({ has_local_auth: PropTypes.bool }),
};

export default ApplicationsPage;
