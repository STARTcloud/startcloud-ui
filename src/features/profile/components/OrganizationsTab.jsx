import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaClock } from 'react-icons/fa6';

import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import SectionHeading from '../../../components/common/SectionHeading';
import { OrgLogo, organizationShape } from '../../../components/layout/OrgSwitcherModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { membershipOf } from '../../../utils/membership';

const ROLE_CLASSES = { owner: 'bg-danger', admin: 'bg-warning' };

const nameOf = org => org.name || org.organization?.name || '';

const descriptionOf = org => org.description || org.organization?.description || '';

const keyOf = org => org.id || org.organization?.id || nameOf(org);

const includesTerm = (term, ...fields) =>
  !term || fields.some(field => typeof field === 'string' && field.toLowerCase().includes(term));

const dateOf = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleDateString(language);
};

const MembershipLogo = ({ org, organizations }) => {
  const matched = membershipOf(organizations, nameOf(org));
  return (
    <OrgLogo
      org={{ logo: matched?.logo || httpsUrl(org.logo_url), emailHash: matched?.emailHash || '' }}
      size={24}
      className="rounded-circle"
      fallback={<FaBuilding aria-hidden />}
    />
  );
};

MembershipLogo.propTypes = {
  org: PropTypes.shape({ logo_url: PropTypes.string }).isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
};

const MembershipBadges = ({ org }) => {
  const { t } = useTranslation();
  return (
    <>
      {org.isPrimary ? (
        <span className="badge bg-primary">{t('profile.organizations.primary')}</span>
      ) : null}
      {org.role ? (
        <span className={`badge ${ROLE_CLASSES[org.role] || 'bg-secondary'}`}>
          {t(`roles.${org.role}`)}
        </span>
      ) : null}
    </>
  );
};

MembershipBadges.propTypes = {
  org: PropTypes.shape({ isPrimary: PropTypes.bool, role: PropTypes.string }).isRequired,
};

const MembershipSubline = ({ org }) => {
  const { t, i18n } = useTranslation();
  const description = descriptionOf(org);
  return (
    <>
      {description ? <span className="d-block">{description}</span> : null}
      <span className="d-block">
        {t('profile.organizations.joined')}: {dateOf(org.joinedAt, i18n.language)}
      </span>
    </>
  );
};

MembershipSubline.propTypes = {
  org: PropTypes.shape({ joinedAt: PropTypes.string }).isRequired,
};

const MembershipActions = ({ org, canSetPrimary, canLeave, onSetPrimary, onLeave }) => {
  const { t } = useTranslation();
  return (
    <>
      {canSetPrimary && !org.isPrimary ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => onSetPrimary(org)}
        >
          {t('profile.organizations.makePrimary')}
        </button>
      ) : null}
      {canLeave ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onLeave(org)}
        >
          {t('profile.buttons.leave')}
        </button>
      ) : null}
    </>
  );
};

MembershipActions.propTypes = {
  org: PropTypes.shape({ isPrimary: PropTypes.bool }).isRequired,
  canSetPrimary: PropTypes.bool.isRequired,
  canLeave: PropTypes.bool.isRequired,
  onSetPrimary: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};

const RequestSubline = ({ request }) => {
  const { t, i18n } = useTranslation();
  const description = request.organization?.description || '';
  return (
    <>
      {description ? <span className="d-block">{description}</span> : null}
      <span className="d-block">
        {t('profile.organizations.requested')}: {dateOf(request.created_at, i18n.language)}
      </span>
    </>
  );
};

RequestSubline.propTypes = {
  request: PropTypes.shape({
    organization: PropTypes.shape({ description: PropTypes.string }),
    created_at: PropTypes.string,
  }).isRequired,
};

const CancelButton = ({ request, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={() => onClick(request)}
    >
      {t('profile.buttons.cancel')}
    </button>
  );
};

CancelButton.propTypes = {
  request: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The Organizations section of the profile page on a UI backend with
 * memberships of its own: the memberships as `MethodRow`s under a
 * `SectionHeading` (the organization's logo from the session's
 * `organizations` matched by name, the row's own `logo_url` else, the
 * building glyph otherwise; the name, the Primary and role badges, the
 * description and the joined date, Make primary while the adapter carries
 * `setPrimary` and Leave while more than one membership remains) and the
 * pending join requests under a second heading with Cancel per row, both
 * glass lists on the page's ground, searched from the navbar; a change of
 * the primary organization re-reads the session through `onSaved`.
 */
const OrganizationsTab = ({ account, organizations: sessionOrganizations, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [memberships, setMemberships] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const { organizations } = account;

  const fail = (message, error) => {
    log.api.error(message, { error: error.message });
    notify('danger', t(error.messageKey || 'errors.request'));
  };

  const load = useCallback(
    () =>
      Promise.all([organizations.list(), organizations.requests()])
        .then(([list, pending]) => {
          setMemberships(Array.isArray(list) ? list : []);
          setRequests(Array.isArray(pending) ? pending : []);
        })
        .catch(error => {
          log.api.error('Error loading organizations', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [notify, organizations, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const leave = async org => {
    const orgName = nameOf(org);
    try {
      await organizations.leave(orgName);
      notify('success', t('profile.messages.leftOrganization', { orgName }));
      await load();
    } catch (error) {
      fail('Error leaving organization', error);
    }
  };

  const setPrimary = async org => {
    const orgName = nameOf(org);
    try {
      await organizations.setPrimary(orgName);
      notify('success', t('profile.messages.primaryOrganizationSet', { orgName }));
      await load();
      await onSaved();
    } catch (error) {
      fail('Error setting primary organization', error);
    }
  };

  const cancel = async request => {
    try {
      await organizations.cancelRequest(request.id);
      notify('success', t('profile.messages.requestCanceled'));
      await load();
    } catch (error) {
      fail('Error canceling join request', error);
    }
  };

  const term = query.trim().toLowerCase();
  const shownMemberships = memberships.filter(org =>
    includesTerm(term, nameOf(org), descriptionOf(org))
  );
  const shownRequests = requests.filter(request =>
    includesTerm(term, request.organization?.name, request.organization?.description)
  );

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('profile.search.organizations'),
    matched: shownMemberships.length + shownRequests.length,
    total: memberships.length + requests.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  const canSetPrimary = typeof organizations.setPrimary === 'function';
  const canLeave = memberships.length > 1;

  return (
    <div className="tab-pane fade show active">
      <SectionHeading title={t('profile.organizations.belongToTitle')} count={memberships.length} />
      <MethodList
        empty={term ? t('pages.noMatches') : t('profile.organizations.noOrgs')}
        className="mb-4"
      >
        {shownMemberships.map(org => {
          const actions = (
            <MembershipActions
              org={org}
              canSetPrimary={canSetPrimary}
              canLeave={canLeave}
              onSetPrimary={setPrimary}
              onLeave={leave}
            />
          );
          return (
            <MethodRow
              key={keyOf(org)}
              icon={<MembershipLogo org={org} organizations={sessionOrganizations} />}
              label={nameOf(org)}
              badges={<MembershipBadges org={org} />}
              subline={<MembershipSubline org={org} />}
              actions={actions}
            />
          );
        })}
      </MethodList>
      {requests.length > 0 ? (
        <>
          <SectionHeading
            title={t('profile.organizations.pendingRequestsTitle')}
            count={requests.length}
          />
          <MethodList empty={t('pages.noMatches')}>
            {shownRequests.map(request => (
              <MethodRow
                key={request.id}
                icon={<FaClock aria-hidden />}
                label={request.organization?.name || ''}
                badges={<span className="badge bg-warning">{t('pages.status.pending')}</span>}
                subline={<RequestSubline request={request} />}
                actions={<CancelButton request={request} onClick={cancel} />}
              />
            ))}
          </MethodList>
        </>
      ) : null}
    </div>
  );
};

OrganizationsTab.propTypes = {
  account: PropTypes.shape({
    organizations: PropTypes.shape({
      list: PropTypes.func.isRequired,
      leave: PropTypes.func.isRequired,
      setPrimary: PropTypes.func,
      requests: PropTypes.func.isRequired,
      cancelRequest: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default OrganizationsTab;
