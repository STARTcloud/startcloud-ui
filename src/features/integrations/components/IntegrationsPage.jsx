import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlug, FaPuzzlePiece, FaXmark } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import MethodList, { MethodRow } from '../../../components/common/MethodList';
import { errorKeys, useStepUp } from '../../../components/common/StepUpDialog';
import TermIcon from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { integrationsShape } from '../api/integrations';

const EMPTY = { linked: [], available: [], accepted_terms: [], apps: [] };
const STATUS_CLASSES = { valid: 'bg-success', revoked: 'bg-danger', unknown: 'bg-secondary' };
const SAFE_PATH = /^\/(?![/\\])/;

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const nameOf = app => app.client_name || app.client_id;

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

const useProviderStatuses = (linked, integrations) => {
  const [statuses, setStatuses] = useState({});
  const ids = linked.map(entry => entry.provider_id).join(',');

  useEffect(() => {
    if (!ids) {
      return undefined;
    }
    let mounted = true;
    ids.split(',').forEach(providerId => {
      integrations
        .providerStatus(providerId)
        .then(data => {
          if (mounted && data?.status) {
            setStatuses(previous => ({ ...previous, [providerId]: data.status }));
          }
        })
        .catch(() => null);
    });
    return () => {
      mounted = false;
    };
  }, [ids, integrations]);

  return statuses;
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return null;
  }
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'bg-secondary'}`}>
      {t(`integrations.linked.status.${status}`)}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

const LinkedSubline = ({ entry }) => {
  const { t } = useTranslation();
  return (
    <>
      {t('integrations.linked.linkedAs', {
        name: entry.provider_username || entry.provider_email || '',
      })}
      {entry.last_used_at ? (
        <>
          {' · '}
          {t('integrations.linked.lastUsed')} <RelativeTime value={entry.last_used_at} />
        </>
      ) : null}
    </>
  );
};

LinkedSubline.propTypes = {
  entry: PropTypes.shape({
    provider_username: PropTypes.string,
    provider_email: PropTypes.string,
    last_used_at: PropTypes.string,
  }).isRequired,
};

const UnlinkButton = ({ entry, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={() => onClick(entry)}
    >
      {t('integrations.linked.unlink')}
    </button>
  );
};

UnlinkButton.propTypes = {
  entry: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

const LinkButton = ({ entry, onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-primary" onClick={() => onClick(entry)}>
      {t('integrations.available.link')}
    </button>
  );
};

LinkButton.propTypes = {
  entry: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

const ViewPolicyLink = ({ name }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={`/public/policies/${encodeURIComponent(name)}`}
      className="btn btn-sm btn-outline-secondary"
    >
      {t('integrations.terms.view')}
    </Link>
  );
};

ViewPolicyLink.propTypes = {
  name: PropTypes.string.isRequired,
};

const LinkedAccounts = ({ data, statuses, onLink, onUnlink }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-4">
      <h5>{t('integrations.linked.title')}</h5>
      <MethodList empty={t('integrations.linked.none')}>
        {data.linked.map(entry => (
          <MethodRow
            key={entry.provider_id}
            icon={<FaPlug aria-hidden />}
            iconUrl={entry.icon_url || ''}
            label={entry.provider_name}
            badges={<StatusBadge status={statuses[entry.provider_id]} />}
            subline={<LinkedSubline entry={entry} />}
            actions={<UnlinkButton entry={entry} onClick={onUnlink} />}
          />
        ))}
        {data.available.map(entry => (
          <MethodRow
            key={entry.provider_id}
            icon={<FaPlug aria-hidden />}
            iconUrl={entry.icon_url || ''}
            label={entry.provider_name}
            subline={t('integrations.available.notLinked')}
            actions={<LinkButton entry={entry} onClick={onLink} />}
          />
        ))}
      </MethodList>
    </section>
  );
};

LinkedAccounts.propTypes = {
  data: PropTypes.shape({
    linked: PropTypes.array.isRequired,
    available: PropTypes.array.isRequired,
  }).isRequired,
  statuses: PropTypes.object.isRequired,
  onLink: PropTypes.func.isRequired,
  onUnlink: PropTypes.func.isRequired,
};

const TermsSubline = ({ entry }) => {
  const { t } = useTranslation();
  return (
    <>
      {t('integrations.terms.version', { version: entry.version })}
      {entry.accepted_at ? (
        <>
          {' · '}
          {t('integrations.terms.accepted')} <RelativeTime value={entry.accepted_at} />
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

const AcceptedTerms = ({ terms }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-4">
      <h5>{t('integrations.terms.title')}</h5>
      <MethodList empty={t('integrations.terms.none')}>
        {terms.map(entry => (
          <MethodRow
            key={`${entry.name}:${entry.version}`}
            icon={<TermIcon icon={entry.icon} aria-hidden />}
            label={entry.label}
            badges={
              entry.type ? (
                <span className="badge bg-secondary">
                  {t(`integrations.terms.type.${String(entry.type).toLowerCase()}`, {
                    defaultValue: entry.type,
                  })}
                </span>
              ) : null
            }
            subline={<TermsSubline entry={entry} />}
            actions={<ViewPolicyLink name={entry.name} />}
          />
        ))}
      </MethodList>
    </section>
  );
};

AcceptedTerms.propTypes = {
  terms: PropTypes.array.isRequired,
};

const ScopeChips = ({ app, onRemoveScope }) => {
  const { t } = useTranslation();
  const scopes = Array.isArray(app.consent_scopes) ? app.consent_scopes : [];
  if (scopes.length === 0) {
    return null;
  }
  return (
    <span className="d-flex align-items-center flex-wrap gap-1 mt-1">
      <span>{t('integrations.apps.permissions')}</span>
      {scopes.map(scope => (
        <span
          key={scope}
          className="badge rounded-pill bg-secondary d-inline-flex align-items-center"
        >
          {scope}
          {scope === 'openid' ? null : (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 ms-1 text-white d-inline-flex align-items-center justify-content-center"
              style={{ minWidth: 24, minHeight: 24 }}
              aria-label={t('integrations.apps.removeScope', { scope })}
              title={t('integrations.apps.removeScope', { scope })}
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
          {t('integrations.apps.activeSessions', { count: app.active_sessions })}
        </span>
      ) : null}
      {app.registered === false ? (
        <span className="badge bg-warning text-dark">{t('integrations.apps.unregistered')}</span>
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
            {t('integrations.apps.firstUsed')} <RelativeTime value={app.first_used_at} />
          </>
        ) : null}
        {app.first_used_at && app.last_used_at ? ' · ' : null}
        {app.last_used_at ? (
          <>
            {t('integrations.apps.lastUsed')} <RelativeTime value={app.last_used_at} />
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
      <Link to="/user/profile#sessions" className="btn btn-sm btn-outline-secondary">
        {t('integrations.apps.sessions')}
      </Link>
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRevoke(app)}>
        {t('integrations.apps.revoke')}
      </button>
    </>
  );
};

AppActions.propTypes = {
  app: PropTypes.object.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

const ConnectedApps = ({ apps, onRevoke, onRemoveScope }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-4">
      <h5>{t('integrations.apps.title')}</h5>
      <MethodList empty={t('integrations.apps.none')}>
        {apps.map(app => (
          <MethodRow
            key={app.client_id}
            icon={<FaPuzzlePiece aria-hidden />}
            iconUrl={app.icon_url || ''}
            label={nameOf(app)}
            badges={<AppBadges app={app} />}
            subline={<AppSubline app={app} onRemoveScope={onRemoveScope} />}
            actions={<AppActions app={app} onRevoke={onRevoke} />}
          />
        ))}
      </MethodList>
    </section>
  );
};

ConnectedApps.propTypes = {
  apps: PropTypes.array.isRequired,
  onRevoke: PropTypes.func.isRequired,
  onRemoveScope: PropTypes.func.isRequired,
};

const noticesFor = (user, t) => {
  const notices = [];
  if (user && user.has_local_auth === false) {
    notices.push({ key: 'password', text: t('integrations.notices.setPassword') });
  }
  if (user && user.tfa && !user.tfa.enabled) {
    notices.push({ key: 'tfa', text: t('integrations.notices.enableTfa') });
  }
  return notices;
};

const followNext = next => {
  if (typeof next !== 'string') {
    return;
  }
  if (SAFE_PATH.test(next) || next.startsWith(`${window.location.origin}/`)) {
    window.location.assign(next);
  }
};

const confirmationsFor = (t, integrations) => {
  const keyword = t('pages.confirm.keyword');
  return {
    unlink: entry => ({
      title: t('integrations.linked.unlink'),
      message: t('integrations.linked.unlinkBody', { provider: entry.provider_name, keyword }),
      call: () => integrations.unlink(entry.provider_id),
      reason: t('integrations.linked.unlinkReason', { provider: entry.provider_name }),
    }),
    revoke: app => ({
      title: t('integrations.apps.revoke'),
      message: t('integrations.apps.revokeBody', {
        app: nameOf(app),
        count: app.active_sessions || 0,
        keyword,
      }),
      call: () => integrations.revokeApp(app.client_id),
      reason: t('integrations.apps.revokeReason', { app: nameOf(app) }),
    }),
    scope: (app, scope) => ({
      title: t('integrations.apps.removeScope', { scope }),
      message: t('integrations.apps.removeScopeBody', { scope, app: nameOf(app), keyword }),
      call: () => integrations.removeScope(app.client_id, scope),
      reason: '',
    }),
  };
};

/**
 * The integrations page of the identity contract at `/user/integrations`:
 * the linked external accounts with their live status and Unlink behind a
 * confirm, the available providers with Link account posting the link
 * route and following its `next`, the set-a-password and two-factor
 * notices, the accepted terms and policies with View, and the connected
 * applications with their permission chips, a Sessions link to the
 * profile's Sessions tab and Revoke access behind a confirm; every
 * stepped-up call goes through the step-up dialog.
 */
const IntegrationsPage = ({ integrations, stepUp, user = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [data, setData] = useState(EMPTY);
  const [pending, setPending] = useState(null);
  const { guard, dialog } = useStepUp({
    stepUp,
    hasPassword: Boolean(user?.has_local_auth),
  });
  const statuses = useProviderStatuses(data.linked, integrations);
  const confirmations = confirmationsFor(t, integrations);

  useEffect(() => {
    document.title = t('integrations.title');
  }, [t]);

  const load = useCallback(
    () =>
      integrations
        .list()
        .then(next => setData({ ...EMPTY, ...next }))
        .catch(error => {
          log.api.error('Error loading integrations', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [integrations, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const fail = error => {
    if (error?.code !== 'step_up_required') {
      notify('danger', t(errorKeys(error)));
    }
  };

  const confirmPending = async () => {
    if (!pending) {
      return;
    }
    try {
      await guard(pending.call, pending.reason);
      await load();
    } catch (error) {
      fail(error);
    }
  };

  const link = async entry => {
    try {
      const answer = await guard(() => integrations.link(entry.provider_id));
      followNext(answer?.next);
    } catch (error) {
      fail(error);
    }
  };

  return (
    <div className="list">
      <h3 className="mb-3">{t('integrations.title')}</h3>
      {noticesFor(user, t).map(notice => (
        <div key={notice.key} className="alert alert-warning" role="status">
          {notice.text}
        </div>
      ))}
      <LinkedAccounts
        data={data}
        statuses={statuses}
        onLink={link}
        onUnlink={entry => setPending(confirmations.unlink(entry))}
      />
      <AcceptedTerms terms={data.accepted_terms} />
      <ConnectedApps
        apps={data.apps}
        onRevoke={app => setPending(confirmations.revoke(app))}
        onRemoveScope={(app, scope) => setPending(confirmations.scope(app, scope))}
      />
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

IntegrationsPage.propTypes = {
  integrations: integrationsShape.isRequired,
  stepUp: PropTypes.func.isRequired,
  user: PropTypes.shape({
    has_local_auth: PropTypes.bool,
    tfa: PropTypes.shape({ enabled: PropTypes.bool }),
  }),
};

export default IntegrationsPage;
