import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaLink, FaPlug } from 'react-icons/fa6';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import MethodList, { MethodRow, httpsUrl } from '../../../../components/common/MethodList';
import SectionCard, { foldsShape } from '../../../../components/common/SectionCard';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';
import { formatRelativeTime } from '../../../../utils/relativeTime';

const EMPTY = { linked: [], available: [] };
const STATUS_CLASSES = { valid: 'bg-success', revoked: 'bg-danger', unknown: 'bg-secondary' };
const SAFE_PATH = /^\/(?![/\\])/;

const isStepUp = error => error?.code === 'step_up_required';

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

const followNext = next => {
  if (typeof next !== 'string') {
    return;
  }
  if (SAFE_PATH.test(next) || next.startsWith(`${window.location.origin}/`) || httpsUrl(next)) {
    window.location.assign(next);
  }
};

const useProviderStatuses = (linked, account) => {
  const [statuses, setStatuses] = useState({});
  const ids = linked.map(entry => entry.provider_id).join(',');

  useEffect(() => {
    if (!ids) {
      return undefined;
    }
    let mounted = true;
    ids.split(',').forEach(providerId => {
      account.linked
        .status(providerId)
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
  }, [ids, account]);

  return statuses;
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return null;
  }
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'bg-secondary'}`}>
      {t(`profile.security.linked.status.${status}`)}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

const LinkedSubline = ({ entry }) => {
  const { t, i18n } = useTranslation();
  return (
    <>
      {t('profile.security.linked.linkedAs', {
        name: entry.provider_username || entry.provider_email || '',
      })}
      {entry.last_used_at ? (
        <>
          {' · '}
          {t('profile.security.linked.lastUsed')}{' '}
          <span title={absoluteTime(entry.last_used_at, i18n.language)}>
            {formatRelativeTime(entry.last_used_at, i18n.language)}
          </span>
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

const RowButton = ({ entry, labelKey, className, onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className={`btn btn-sm ${className}`} onClick={() => onClick(entry)}>
      {t(labelKey)}
    </button>
  );
};

RowButton.propTypes = {
  entry: PropTypes.object.isRequired,
  labelKey: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const noticesFor = (profile, t) => {
  const notices = [];
  if (profile.has_local_auth === false) {
    notices.push({ key: 'password', text: t('profile.security.linked.setPassword') });
  }
  if (profile.tfa && !profile.tfa.enabled) {
    notices.push({ key: 'tfa', text: t('profile.security.linked.enableTfa') });
  }
  return notices;
};

/**
 * The Linked accounts section of the Security page, from
 * `GET /api/user/linked-accounts`: the federated providers the person
 * signed in with (the provider icon, the name, "Linked as", the last use,
 * the live status badge, Unlink behind a confirm and stepped up), the
 * providers the site still offers with Link account, which posts the link
 * route stepped up and follows its `next`, and the set-a-password and
 * two-factor notices beside them.
 */
const LinkedAccountsSection = ({ account, profile, guard, onSaved, folds }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [data, setData] = useState(EMPTY);
  const [pending, setPending] = useState(null);
  const statuses = useProviderStatuses(data.linked, account);

  const load = useCallback(
    () =>
      account.linked
        .list()
        .then(next => setData({ ...EMPTY, ...next }))
        .catch(error => notify('danger', t(error.messageKey || 'errors.request'))),
    [account, notify, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const fail = error => {
    if (!isStepUp(error)) {
      notify('danger', t(errorKeys(error)));
    }
  };

  const unlink = async entry => {
    try {
      await guard(
        () => account.linked.unlink(entry.provider_id),
        t('profile.security.linked.unlinkReason', { provider: entry.provider_name })
      );
      notify('success', t('profile.security.linked.unlinked'));
      await load();
      await onSaved();
    } catch (error) {
      fail(error);
    }
  };

  const link = async entry => {
    try {
      const answer = await guard(() => account.linked.link(entry.provider_id));
      followNext(answer?.next);
    } catch (error) {
      fail(error);
    }
  };

  return (
    <SectionCard
      icon={<FaLink aria-hidden />}
      title={t('profile.security.linked.title')}
      folded={folds.folded('linked')}
      onFold={() => folds.toggle('linked')}
    >
      {noticesFor(profile, t).map(notice => (
        <div key={notice.key} className="alert alert-warning small" role="status">
          {notice.text}
        </div>
      ))}
      <MethodList empty={t('profile.security.linked.none')} className="mb-3">
        {data.linked.map(entry => {
          const actions = (
            <RowButton
              entry={entry}
              labelKey="profile.security.linked.unlink"
              className="btn-outline-danger"
              onClick={setPending}
            />
          );
          return (
            <MethodRow
              key={entry.provider_id}
              icon={<FaPlug aria-hidden />}
              iconUrl={entry.icon_url || ''}
              label={entry.provider_name}
              badges={<StatusBadge status={statuses[entry.provider_id]} />}
              subline={<LinkedSubline entry={entry} />}
              actions={actions}
            />
          );
        })}
      </MethodList>
      {data.available.length > 0 ? (
        <>
          <h6>{t('profile.security.linked.available')}</h6>
          <MethodList>
            {data.available.map(entry => {
              const actions = (
                <RowButton
                  entry={entry}
                  labelKey="profile.security.linked.link"
                  className="btn-primary"
                  onClick={link}
                />
              );
              return (
                <MethodRow
                  key={entry.provider_id}
                  icon={<FaPlug aria-hidden />}
                  iconUrl={entry.icon_url || ''}
                  label={entry.provider_name}
                  actions={actions}
                />
              );
            })}
          </MethodList>
        </>
      ) : null}
      <ConfirmModal
        show={pending !== null}
        handleClose={() => setPending(null)}
        handleConfirm={() => unlink(pending)}
        title={t('profile.security.linked.unlink')}
        message={t('profile.security.linked.unlinkBody', {
          provider: pending?.provider_name || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </SectionCard>
  );
};

LinkedAccountsSection.propTypes = {
  account: PropTypes.shape({
    linked: PropTypes.shape({
      list: PropTypes.func.isRequired,
      status: PropTypes.func.isRequired,
      link: PropTypes.func.isRequired,
      unlink: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  profile: PropTypes.shape({
    has_local_auth: PropTypes.bool,
    tfa: PropTypes.shape({ enabled: PropTypes.bool }),
  }).isRequired,
  guard: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default LinkedAccountsSection;
