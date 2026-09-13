import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBuilding } from 'react-icons/fa6';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import { errorKeys } from '../../../components/common/StepUpDialog';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { readDetailPrefs, writeDetailPrefs } from '../../../utils/prefs';
import { NON_BLANK } from '../../../utils/validation';
import { issuerOrganizationsShape } from '../api/issuer';

const CREATE_SCHEMA = { required: ['name'], properties: { name: NON_BLANK } };
const CREATE_LABELS = { name: 'organizations.name' };
const EMPTY = { organizations: [], organizations_enabled: false, personal_to_team_enabled: false };
const PREFS_KEY = 'table_prefs_organizations';
const VIEWS = ['table', 'cards'];
const NO_COLUMNS = [];

const hashUuid = hash => decodeURIComponent(hash.replace(/^#/, ''));

const storedView = () => readDetailPrefs(PREFS_KEY, NO_COLUMNS, { views: VIEWS }).view;

const membershipShape = PropTypes.shape({
  uuid: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  logo_url: PropTypes.string,
  personal: PropTypes.bool,
  primary: PropTypes.bool,
  my_role: PropTypes.string,
  can_manage: PropTypes.bool,
  invite_code: PropTypes.string,
});

const CreateForm = ({ value, rules, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate className="flex-grow-1">
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('name')}
        label={t('organizations.create')}
        error={rules.errors.name || ''}
        className="mb-0"
      >
        {aria => (
          <div className="d-flex gap-2">
            <input
              {...aria}
              type="text"
              className="form-control"
              value={value}
              onChange={event => onChange(event.target.value)}
              onBlur={() => rules.onBlur('name')}
            />
            <button type="submit" className="btn btn-primary text-nowrap">
              {t('organizations.createButton')}
            </button>
          </div>
        )}
      </Field>
    </form>
  );
};

CreateForm.propTypes = {
  value: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const MembershipBadges = ({ org }) => {
  const { t } = useTranslation();
  return (
    <>
      {org.personal ? (
        <span className="badge bg-secondary">{t('organizations.personal')}</span>
      ) : null}
      {org.primary ? <span className="badge bg-primary">{t('organizations.primary')}</span> : null}
    </>
  );
};

MembershipBadges.propTypes = {
  org: membershipShape.isRequired,
};

const MembershipSubline = ({ org, onRegenerate }) => {
  const { t } = useTranslation();
  return (
    <>
      {t('organizations.yourRole', { role: org.my_role || '' })}
      {org.can_manage && org.invite_code ? (
        <>
          {' · '}
          {t('organizations.inviteCode')} <code>{org.invite_code}</code>{' '}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 align-baseline"
            onClick={() => onRegenerate(org)}
          >
            {t('organizations.regenerate')}
          </button>
        </>
      ) : null}
    </>
  );
};

MembershipSubline.propTypes = {
  org: membershipShape.isRequired,
  onRegenerate: PropTypes.func.isRequired,
};

const MembershipActions = ({ org, onMakePrimary, onOpen }) => {
  const { t } = useTranslation();
  return (
    <>
      {org.primary ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onMakePrimary(org)}
        >
          {t('organizations.makePrimary')}
        </button>
      )}
      <button
        type="button"
        className={`btn btn-sm ${org.can_manage ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onOpen(org)}
      >
        {org.can_manage ? t('organizations.manage') : t('organizations.view')}
      </button>
    </>
  );
};

MembershipActions.propTypes = {
  org: membershipShape.isRequired,
  onMakePrimary: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const MembershipRow = ({ org, onMakePrimary, onRegenerate, onOpen }) => (
  <MethodRow
    icon={<FaBuilding aria-hidden />}
    iconUrl={org.logo_url || ''}
    label={org.name}
    badges={<MembershipBadges org={org} />}
    subline={<MembershipSubline org={org} onRegenerate={onRegenerate} />}
    actions={<MembershipActions org={org} onMakePrimary={onMakePrimary} onOpen={onOpen} />}
  />
);

MembershipRow.propTypes = {
  org: membershipShape.isRequired,
  onMakePrimary: PropTypes.func.isRequired,
  onRegenerate: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const MembershipCard = ({ org, onMakePrimary, onRegenerate, onOpen }) => {
  const image = httpsUrl(org.logo_url || '');
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body className="d-flex flex-column gap-2">
        <div className="d-flex align-items-start gap-2">
          <span className="d-inline-flex justify-content-center flex-shrink-0 method-row-icon">
            {image ? (
              <img src={image} alt="" width={24} height={24} referrerPolicy="no-referrer" />
            ) : (
              <FaBuilding aria-hidden />
            )}
          </span>
          <div className="flex-grow-1 min-width-0">
            <Card.Title className="h6 mb-1 d-flex align-items-center flex-wrap gap-2">
              <span className="text-truncate">{org.name}</span>
              <MembershipBadges org={org} />
            </Card.Title>
            <div className="small text-body-secondary">
              <MembershipSubline org={org} onRegenerate={onRegenerate} />
            </div>
          </div>
        </div>
        <div className="mt-auto d-flex flex-wrap gap-2">
          <MembershipActions org={org} onMakePrimary={onMakePrimary} onOpen={onOpen} />
        </div>
      </Card.Body>
    </Card>
  );
};

MembershipCard.propTypes = {
  org: membershipShape.isRequired,
  onMakePrimary: PropTypes.func.isRequired,
  onRegenerate: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const MembershipCards = ({ organizations, empty, onMakePrimary, onRegenerate, onOpen }) => {
  if (organizations.length === 0) {
    return <p className="text-body-secondary small mb-0">{empty}</p>;
  }
  return (
    <Row xs={1} md={2} xl={3} className="g-3">
      {organizations.map(org => (
        <Col key={org.uuid}>
          <MembershipCard
            org={org}
            onMakePrimary={onMakePrimary}
            onRegenerate={onRegenerate}
            onOpen={onOpen}
          />
        </Col>
      ))}
    </Row>
  );
};

MembershipCards.propTypes = {
  organizations: PropTypes.arrayOf(membershipShape).isRequired,
  empty: PropTypes.string.isRequired,
  onMakePrimary: PropTypes.func.isRequired,
  onRegenerate: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

/**
 * The organizations page of the identity contract at `/user/organizations`:
 * Create a team, a name required, while the answer says
 * `organizations_enabled`, beside a Find an organization link to the
 * directory at `/organizations/discover` while the host advertises
 * `discover`, no join-by-code form, then the memberships under the pages
 * contract's one view toggle, a row or a card per membership with its
 * badges, the person's role, Make primary, the invite code with Regenerate
 * while the person can manage it, and View or Manage, which makes that
 * organization the active one under `activeOrgKey` and opens the shared
 * console; a `#<uuid>` in the URL does the same on load, and the chosen
 * view persists as `view` inside the one prefs object under
 * `table_prefs_organizations`; the navbar search is bound with a query
 * over the memberships by name.
 */
const OrganizationsPage = ({ session, events, organizations, activeOrgKey }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState(storedView);
  const [query, setQuery] = useState('');
  const [createForm, setCreateForm] = useState({ name: '' });
  const createRules = useFormRules({
    schema: CREATE_SCHEMA,
    values: createForm,
    labels: CREATE_LABELS,
    idPrefix: 'org-create',
  });

  useEffect(() => {
    document.title = t('organizations.title');
  }, [t]);

  const load = useCallback(
    () =>
      organizations
        .list()
        .then(next => {
          setData({ ...EMPTY, ...next });
          setLoaded(true);
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

  const open = useCallback(
    async org => {
      localStorage.setItem(activeOrgKey, org.uuid);
      await session.reload();
      events.emit('login');
      navigate('/org-console');
    },
    [activeOrgKey, events, navigate, session]
  );

  useEffect(() => {
    if (!loaded || !location.hash) {
      return;
    }
    const uuid = hashUuid(location.hash);
    const org = data.organizations.find(entry => entry.uuid === uuid);
    if (org) {
      open(org);
    }
  }, [data.organizations, loaded, location.hash, open]);

  const changeView = next => {
    writeDetailPrefs(PREFS_KEY, { view: next });
    setView(next);
  };

  const submit = async ({ rules, call, done, reset }) => {
    if (!rules.validateAll()) {
      return;
    }
    try {
      await call();
      reset();
      rules.reset();
      notify('success', t(done));
      await load();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const create = event => {
    event.preventDefault();
    submit({
      rules: createRules,
      call: () => organizations.create(createForm.name),
      done: 'organizations.created',
      reset: () => setCreateForm({ name: '' }),
    });
  };

  const act = async (call, done) => {
    try {
      await call();
      notify('success', t(done));
      await load();
    } catch (error) {
      notify('danger', t(errorKeys(error)));
    }
  };

  const makePrimary = async org => {
    await act(() => organizations.setPrimary(org.uuid), 'organizations.primarySet');
    await session.reload();
    events.emit('login');
  };

  const regenerate = org =>
    act(() => organizations.regenerateInviteCode(org.uuid), 'organizations.regenerated');

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? data.organizations.filter(org => org.name.toLowerCase().includes(needle))
    : data.organizations;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('organizations.search'),
    matched: shown.length,
    total: data.organizations.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  const loadedEmpty = needle ? t('pages.noMatches') : t('organizations.none');
  const empty = loaded ? loadedEmpty : t('loading');

  return (
    <div className="list">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h3 className="mb-0">{t('organizations.title')}</h3>
        <ViewToggle view={view} onChange={changeView} />
      </div>
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        {data.organizations_enabled ? (
          <CreateForm
            value={createForm.name}
            rules={createRules}
            onChange={name => setCreateForm({ name })}
            onSubmit={create}
          />
        ) : null}
        {hasFeature(status, 'discover') ? (
          <Link to="/organizations/discover" className="btn btn-outline-primary text-nowrap">
            {t('organizations.find')}
          </Link>
        ) : null}
      </div>
      {view === 'cards' ? (
        <MembershipCards
          organizations={shown}
          empty={empty}
          onMakePrimary={makePrimary}
          onRegenerate={regenerate}
          onOpen={open}
        />
      ) : (
        <MethodList empty={empty}>
          {shown.map(org => (
            <MembershipRow
              key={org.uuid}
              org={org}
              onMakePrimary={makePrimary}
              onRegenerate={regenerate}
              onOpen={open}
            />
          ))}
        </MethodList>
      )}
    </div>
  );
};

OrganizationsPage.propTypes = {
  session: PropTypes.shape({ reload: PropTypes.func.isRequired }).isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  organizations: issuerOrganizationsShape.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
};

export default OrganizationsPage;
