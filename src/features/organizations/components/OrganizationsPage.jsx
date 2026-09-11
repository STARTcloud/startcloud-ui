import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBuilding } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MethodList, { MethodRow, httpsUrl } from '../../../components/common/MethodList';
import { errorKeys } from '../../../components/common/StepUpDialog';
import ViewToggle from '../../../components/common/ViewToggle';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import { NON_BLANK } from '../../../utils/validation';
import { issuerOrganizationsShape } from '../api/issuer';

const CREATE_SCHEMA = { required: ['name'], properties: { name: NON_BLANK } };
const CREATE_LABELS = { name: 'organizations.name' };
const JOIN_SCHEMA = { required: ['invite_code'], properties: { invite_code: NON_BLANK } };
const JOIN_LABELS = { invite_code: 'organizations.inviteCode' };
const EMPTY = { organizations: [], organizations_enabled: false, personal_to_team_enabled: false };
const VIEW_KEY = 'table_prefs_organizations';
const VIEWS = ['table', 'cards'];

const hashUuid = hash => decodeURIComponent(hash.replace(/^#/, ''));

const storedView = () => {
  const saved = localStorage.getItem(VIEW_KEY);
  return VIEWS.includes(saved) ? saved : 'table';
};

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

const InlineForm = ({ id, label, value, rules, onChange, onSubmit, button, primary }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate className="mb-3">
      <FormErrorSummary errors={rules.summary} />
      <Field id={rules.idFor(id)} label={t(label)} error={rules.errors[id] || ''} className="mb-2">
        {aria => (
          <div className="d-flex gap-2">
            <input
              {...aria}
              type="text"
              className="form-control"
              value={value}
              onChange={event => onChange(event.target.value)}
              onBlur={() => rules.onBlur(id)}
            />
            <button
              type="submit"
              className={`btn ${primary ? 'btn-primary' : 'btn-outline-secondary'} text-nowrap`}
            >
              {t(button)}
            </button>
          </div>
        )}
      </Field>
    </form>
  );
};

InlineForm.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  button: PropTypes.string.isRequired,
  primary: PropTypes.bool.isRequired,
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
 * Create an organization while the answer says `organizations_enabled`,
 * Join with an invite code, then the memberships under the pages contract's
 * one view toggle, a row or a card per membership with its badges, the
 * person's role, Make primary, the invite code with Regenerate while the
 * person can manage it, and View or Manage, which makes that organization
 * the active one under `activeOrgKey` and opens the shared console; a
 * `#<uuid>` in the URL does the same on load, and the chosen view persists
 * under `table_prefs_organizations`.
 */
const OrganizationsPage = ({ session, events, organizations, activeOrgKey }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState(storedView);
  const [createForm, setCreateForm] = useState({ name: '' });
  const [joinForm, setJoinForm] = useState({ invite_code: '' });
  const createRules = useFormRules({
    schema: CREATE_SCHEMA,
    values: createForm,
    labels: CREATE_LABELS,
    idPrefix: 'org-create',
  });
  const joinRules = useFormRules({
    schema: JOIN_SCHEMA,
    values: joinForm,
    labels: JOIN_LABELS,
    idPrefix: 'org-join',
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
    localStorage.setItem(VIEW_KEY, next);
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

  const join = event => {
    event.preventDefault();
    submit({
      rules: joinRules,
      call: () => organizations.join(joinForm.invite_code),
      done: 'organizations.joined',
      reset: () => setJoinForm({ invite_code: '' }),
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

  const empty = loaded ? t('organizations.none') : t('loading');

  return (
    <div className="list">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h3 className="mb-0">{t('organizations.title')}</h3>
        <ViewToggle view={view} onChange={changeView} />
      </div>
      {data.organizations_enabled ? (
        <InlineForm
          id="name"
          label="organizations.create"
          value={createForm.name}
          rules={createRules}
          onChange={name => setCreateForm({ name })}
          onSubmit={create}
          button="organizations.createButton"
          primary
        />
      ) : null}
      <InlineForm
        id="invite_code"
        label="organizations.join"
        value={joinForm.invite_code}
        rules={joinRules}
        onChange={code => setJoinForm({ invite_code: code })}
        onSubmit={join}
        button="organizations.joinButton"
        primary={false}
      />
      {view === 'cards' ? (
        <MembershipCards
          organizations={data.organizations}
          empty={empty}
          onMakePrimary={makePrimary}
          onRegenerate={regenerate}
          onOpen={open}
        />
      ) : (
        <MethodList empty={empty}>
          {data.organizations.map(org => (
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
