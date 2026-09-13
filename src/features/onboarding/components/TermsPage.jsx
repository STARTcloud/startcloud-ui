import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AddressFields, { EMPTY_ADDRESS } from '../../../components/common/AddressFields';
import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import PhoneInput from '../../../components/common/PhoneInput';
import ProblemAlert from '../../../components/common/ProblemAlert';
import RegionModal, { regionFlag, regionLabel } from '../../../components/common/RegionModal';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { loadCountries } from '../../../lib/countries';
import { followNext } from '../../../lib/next';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { NON_BLANK } from '../../../utils/validation';
import {
  acceptTerms,
  geoCountry,
  placesKey as fetchPlacesKey,
  savePreferences,
  terms as fetchTerms,
  termsVersion,
} from '../api/onboarding';

const SESSION_EXPIRED = '/login?error=session_expired';
const SCALES = [0.85, 1, 1.15, 1.3];
const ADDRESS_PARTS = {
  'address-line1': 'line1',
  'address-line2': 'line2',
  'country-name': 'country',
  'address-level1': 'state',
  'address-level2': 'city',
  'postal-code': 'postal_code',
};
const ADDRESS_JOIN = ['line1', 'line2', 'city', 'state', 'postal_code', 'country'];

const fieldShape = PropTypes.shape({
  param: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  autocomplete: PropTypes.string,
  group: PropTypes.string,
  control: PropTypes.string,
  span: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.string,
});

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date);
};

const schemaFor = fields => ({
  properties: {
    fields: {
      required: fields.filter(field => field.required).map(field => field.param),
      properties: Object.fromEntries(
        fields.map(field => [
          field.param,
          { ...(field.required ? NON_BLANK : { type: 'string' }), title: field.label },
        ])
      ),
    },
  },
});

const partOf = field => ADDRESS_PARTS[field.autocomplete] || field.param;

const documentHtmlOf = (state, whatChanged) =>
  whatChanged && state.previous ? state.changes_html : state.content_html;

const initialValues = fields =>
  Object.fromEntries(fields.map(field => [field.param, field.value || '']));

const initialAddress = fields =>
  fields.reduce(
    (address, field) => ({
      ...address,
      [field.control === 'country' ? 'country_code' : partOf(field)]: field.value || '',
    }),
    { ...EMPTY_ADDRESS }
  );

const useCountries = enabled => {
  const { i18n } = useTranslation();
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    loadCountries(i18n.language)
      .then(list => {
        if (active) {
          setCountries(list);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [enabled, i18n.language]);
  return countries;
};

const useGeoCountry = enabled => {
  const [country, setCountry] = useState('');
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    geoCountry()
      .then(answer => {
        if (active && answer?.country_code) {
          setCountry(String(answer.country_code).toLowerCase());
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [enabled]);
  return country;
};

const usePlacesKey = enabled => {
  const [key, setKey] = useState('');
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    fetchPlacesKey()
      .then(data => {
        if (active && typeof data?.key === 'string') {
          setKey(data.key);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [enabled]);
  return key;
};

const FontSize = ({ scale, onScale }) => {
  const { t } = useTranslation(['auth']);
  const index = SCALES.indexOf(scale);
  return (
    <span className="auth-row auth-row-tight">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        aria-label={t('terms.fontSize.smaller')}
        disabled={index <= 0}
        onClick={() => onScale(SCALES[index - 1])}
      >
        A-
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        aria-label={t('terms.fontSize.larger')}
        disabled={index >= SCALES.length - 1}
        onClick={() => onScale(SCALES[index + 1])}
      >
        A+
      </button>
    </span>
  );
};

FontSize.propTypes = {
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
};

const TermsField = ({ field, value, rules, country, onChange }) => {
  const { t } = useTranslation(['auth']);
  const name = `fields/${field.param}`;
  const label = field.required ? field.label : `${field.label} ${t('terms.optional')}`;
  const onBlur = () => rules.onBlur(name);
  return (
    <Field
      id={rules.idFor(name)}
      label={label}
      error={rules.errors[name] || ''}
      className={`auth-field${field.span === 'full' ? ' auth-grid-full' : ''}`}
    >
      {aria =>
        field.autocomplete === 'tel' ? (
          <PhoneInput
            id={aria.id}
            aria={{ ...aria, onBlur }}
            value={value}
            initialCountry={country}
            onChange={number => onChange(field.param, number)}
          />
        ) : (
          <div className="auth-input-wrap">
            <input
              {...aria}
              type={field.control === 'email' ? 'email' : 'text'}
              autoComplete={field.autocomplete}
              value={value}
              onChange={event => onChange(field.param, event.target.value)}
              onBlur={onBlur}
            />
          </div>
        )
      }
    </Field>
  );
};

TermsField.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  country: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const FieldGroup = ({ title, fields, values, rules, country, onChange }) => {
  if (fields.length === 0) {
    return null;
  }
  return (
    <>
      <p className="auth-group">{title}</p>
      <div className="auth-grid">
        {fields.map(field => (
          <TermsField
            key={field.param}
            field={field}
            value={values[field.param] || ''}
            rules={rules}
            country={country}
            onChange={onChange}
          />
        ))}
      </div>
    </>
  );
};

FieldGroup.propTypes = {
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(fieldShape).isRequired,
  values: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  country: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const AddressGroup = ({ fields, address, rules, placesKey, onChange }) => {
  const { t } = useTranslation(['auth']);
  if (fields.length === 0) {
    return null;
  }
  const paramByPart = Object.fromEntries(fields.map(field => [partOf(field), field.param]));
  const nameOf = part => {
    const param = paramByPart[part === 'country_code' ? 'country' : part];
    return param ? `fields/${param}` : '';
  };
  const errors = Object.fromEntries(
    [...Object.keys(paramByPart), 'country_code'].map(part => [
      part,
      rules.errors[nameOf(part)] || '',
    ])
  );
  const onBlur = part => {
    const name = nameOf(part);
    if (name) {
      rules.onBlur(name);
    }
  };
  return (
    <>
      <p className="auth-group">{t('terms.address')}</p>
      <div className="auth-address">
        <AddressFields
          value={address}
          onChange={onChange}
          rules={{ errors, onBlur }}
          idPrefix="terms-address"
          placesKey={placesKey}
        />
      </div>
    </>
  );
};

AddressGroup.propTypes = {
  fields: PropTypes.arrayOf(fieldShape).isRequired,
  address: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  placesKey: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const useTerms = () => {
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [state, setState] = useState(null);
  const [problem, setProblem] = useState(null);
  const [version, setVersion] = useState(0);
  const [requestedRegion, setRequestedRegion] = useState('');
  const [switchingRegion, setSwitchingRegion] = useState(false);

  const reload = () => setVersion(count => count + 1);

  useEffect(() => {
    let active = true;
    fetchTerms(requestedRegion)
      .then(answer => {
        if (active) {
          setState(answer);
          setSwitchingRegion(false);
        }
      })
      .catch(error => {
        if (!active) {
          return;
        }
        setSwitchingRegion(false);
        if (error.status === 401) {
          navigate(SESSION_EXPIRED, { replace: true });
          return;
        }
        setProblem(report(error));
      });
    return () => {
      active = false;
    };
  }, [navigate, report, version, requestedRegion]);

  const changeRegion = code => {
    setSwitchingRegion(true);
    savePreferences({ region: code || null }).catch(() => null);
    setRequestedRegion(code);
  };

  return { state, problem, setProblem, reload, changeRegion, switchingRegion };
};

const RegionButton = ({ state, switchingRegion, onPick }) => {
  const { t } = useTranslation(['auth']);
  const [open, setOpen] = useState(false);
  const regionsOffered = state.regions_offered || [];
  const disabled = regionsOffered.length < 2 || switchingRegion;
  const title =
    regionsOffered.length < 2
      ? t('terms.region.onlyOne')
      : t('terms.region.change', { region: regionLabel(state.person_region, t) });

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary auth-region-btn"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {regionFlag(state.person_region)}
        <span>{regionLabel(state.person_region, t)}</span>
      </button>
      <RegionModal
        show={open}
        regionsOffered={regionsOffered}
        current={state.region || ''}
        onPick={code => {
          setOpen(false);
          onPick(code);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

RegionButton.propTypes = {
  state: PropTypes.object.isRequired,
  switchingRegion: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

const VersionsModal = ({ show, versions, current, onClose }) => {
  const { t, i18n } = useTranslation(['auth', 'shared']);
  const [viewing, setViewing] = useState(null);

  const close = () => {
    setViewing(null);
    onClose();
  };

  const openVersion = targetVersion => {
    setViewing('loading');
    termsVersion(targetVersion)
      .then(answer => setViewing(answer))
      .catch(() => setViewing(null));
  };

  return (
    <Modal show={show} onHide={close} dialogClassName="chrome-modal list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('terms.versions.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {viewing === 'loading' ? <AuthSpinner label={t('shared:loading')} /> : null}
        {viewing && viewing !== 'loading' ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mb-3"
              onClick={() => setViewing(null)}
            >
              {t('policy.back')}
            </button>
            <MarkdownArticle html={viewing.content_html} className="auth-doc-flow" />
          </>
        ) : null}
        {!viewing ? (
          <div className="list-group">
            {versions.map(row => (
              <button
                key={row.version}
                type="button"
                className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                onClick={() => openVersion(row.version)}
              >
                <span>{t('terms.version', { version: row.version })}</span>
                <span className="d-flex align-items-center gap-2">
                  <span className="auth-hint">
                    {t('terms.versions.published', {
                      date: formatDate(row.published_at, i18n.language),
                    })}
                  </span>
                  {row.version === current ? (
                    <span className="auth-badge">{t('terms.versions.current')}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

VersionsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  versions: PropTypes.arrayOf(
    PropTypes.shape({ version: PropTypes.string.isRequired, published_at: PropTypes.string })
  ).isRequired,
  current: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

const TermsHead = ({ state, scale, onScale, onRegionChange, switchingRegion, onOpenVersions }) => {
  const { t } = useTranslation(['auth']);
  const versions = state.versions || [];
  return (
    <div className="auth-row">
      <span className="auth-hint">{t('terms.version', { version: state.version })}</span>
      <span className="auth-badge auth-step-badge">
        {t('terms.step', { n: state.step, m: state.total })}
      </span>
      <span className="auth-head-actions">
        <FontSize scale={scale} onScale={onScale} />
        {versions.length > 1 ? (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onOpenVersions}
          >
            {t('terms.versions.open')}
          </button>
        ) : null}
        <RegionButton state={state} switchingRegion={switchingRegion} onPick={onRegionChange} />
      </span>
    </div>
  );
};

TermsHead.propTypes = {
  state: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  switchingRegion: PropTypes.bool.isRequired,
  onOpenVersions: PropTypes.func.isRequired,
};

const WhatChangedRow = ({ state, active, onToggle }) => {
  const { t, i18n } = useTranslation(['auth']);
  if (!state.previous) {
    return null;
  }
  return (
    <div className="auth-row auth-row-start">
      <button
        type="button"
        className={`btn btn-sm btn-outline-secondary${active ? ' active' : ''}`}
        aria-pressed={active}
        onClick={onToggle}
      >
        {t('terms.whatChanged')}
      </button>
      <span className="auth-hint">
        {t('terms.changedSince', {
          version: state.previous.version,
          date: formatDate(state.previous.accepted_at, i18n.language),
        })}
      </span>
    </div>
  );
};

WhatChangedRow.propTypes = {
  state: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const useAccept = ({ returnTo, state, setProblem, reload, setBusy, setAnnounce }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();

  return (fields, rules = null) => {
    setProblem(null);
    setBusy(true);
    acceptTerms({ tos_name: state.name, fields })
      .then(answer => {
        const next = typeof answer?.next === 'string' ? answer.next : '';
        if (next.split(/[?#]/)[0] === location.pathname) {
          setBusy(false);
          setAnnounce(true);
          reload();
          return;
        }
        followNext({ next, navigate, returnTo });
      })
      .catch(error => {
        setBusy(false);
        if (error.status === 401) {
          navigate(SESSION_EXPIRED, { replace: true });
          return;
        }
        setProblem(report(error, rules));
      });
  };
};

const useCollectedFields = (fields, countries) => {
  const identityFields = useMemo(
    () => fields.filter(field => (field.group || 'identity') !== 'address'),
    [fields]
  );
  const addressFields = useMemo(() => fields.filter(field => field.group === 'address'), [fields]);
  const [identity, setIdentity] = useState(() => initialValues(identityFields));
  const [address, setAddress] = useState(() => initialAddress(addressFields));
  const record = useMemo(
    () => ({
      ...address,
      country_code:
        address.country_code ||
        countries.find(country => country.label === address.country)?.code ||
        '',
      country:
        address.country ||
        countries.find(country => country.code === address.country_code)?.label ||
        '',
    }),
    [address, countries]
  );
  const values = useMemo(
    () => ({
      fields: {
        ...identity,
        ...Object.fromEntries(
          addressFields.map(field => [
            field.param,
            record[field.control === 'country' ? 'country_code' : partOf(field)] || '',
          ])
        ),
      },
    }),
    [identity, addressFields, record]
  );
  const changeIdentity = (param, value) =>
    setIdentity(previous => ({ ...previous, [param]: value }));
  return { identityFields, addressFields, values, record, changeIdentity, setAddress };
};

const CollectingTerms = ({
  state,
  scale,
  onScale,
  busy,
  onAccept,
  onRegionChange,
  switchingRegion,
  onOpenVersions,
}) => {
  const { t } = useTranslation(['auth']);
  const [whatChanged, setWhatChanged] = useState(true);
  const fields = useMemo(() => state.fields || [], [state.fields]);
  const schema = useMemo(() => schemaFor(fields), [fields]);
  const hasAddress = fields.some(field => field.group === 'address');
  const hasPhone = fields.some(field => field.autocomplete === 'tel');
  const countries = useCountries(hasAddress);
  const placesKey = usePlacesKey(hasAddress);
  const geo = useGeoCountry(hasPhone);
  const { identityFields, addressFields, values, record, changeIdentity, setAddress } =
    useCollectedFields(fields, countries);
  const rules = useFormRules({ schema, values, idPrefix: 'terms' });
  const fills = useMemo(() => {
    const { first_name: first = '', last_name: last = '' } = values.fields;
    return {
      ...values.fields,
      full_name: [first, last].filter(Boolean).join(' '),
      address: ADDRESS_JOIN.map(part => record[part])
        .filter(Boolean)
        .join(', '),
    };
  }, [values.fields, record]);
  const documentHtml = documentHtmlOf(state, whatChanged);

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    onAccept(values.fields, rules);
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <TermsHead
        state={state}
        scale={scale}
        onScale={onScale}
        onRegionChange={onRegionChange}
        switchingRegion={switchingRegion}
        onOpenVersions={onOpenVersions}
      />
      <WhatChangedRow
        state={state}
        active={whatChanged}
        onToggle={() => setWhatChanged(value => !value)}
      />
      <MarkdownArticle
        html={documentHtml}
        fills={fills}
        fontScale={scale}
        className="auth-doc-flow"
      />
      <FormErrorSummary errors={rules.summary} />
      <FieldGroup
        title={state.identity_group_title || t('terms.yourDetails')}
        fields={identityFields}
        values={values.fields}
        rules={rules}
        country={geo}
        onChange={changeIdentity}
      />
      <AddressGroup
        fields={addressFields}
        address={record}
        rules={rules}
        placesKey={placesKey}
        onChange={setAddress}
      />
      <MarkdownArticle
        html={state.content_middle_html || ''}
        fills={fills}
        fontScale={scale}
        className="auth-doc-flow auth-doc-fine"
      />
      <MarkdownArticle
        html={state.content_bottom_html || ''}
        fills={fills}
        fontScale={scale}
        className="auth-doc-flow auth-doc-fine"
      />
      <div className="auth-ack">{t('terms.acknowledge')}</div>
      <button
        type="submit"
        className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
        disabled={busy}
      >
        {t('terms.agree')}
      </button>
    </form>
  );
};

CollectingTerms.propTypes = {
  state: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  switchingRegion: PropTypes.bool.isRequired,
  onOpenVersions: PropTypes.func.isRequired,
};

const ClassicTerms = ({
  state,
  scale,
  onScale,
  busy,
  onAccept,
  onRegionChange,
  switchingRegion,
  onOpenVersions,
}) => {
  const { t } = useTranslation(['auth']);
  const [whatChanged, setWhatChanged] = useState(true);
  const documentHtml = documentHtmlOf(state, whatChanged);
  return (
    <>
      <TermsHead
        state={state}
        scale={scale}
        onScale={onScale}
        onRegionChange={onRegionChange}
        switchingRegion={switchingRegion}
        onOpenVersions={onOpenVersions}
      />
      <WhatChangedRow
        state={state}
        active={whatChanged}
        onToggle={() => setWhatChanged(value => !value)}
      />
      <div className="auth-doc">
        <MarkdownArticle html={documentHtml} fontScale={scale} />
      </div>
      <button
        type="button"
        className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
        disabled={busy}
        onClick={() => onAccept({})}
      >
        {t('terms.accept')}
      </button>
    </>
  );
};

ClassicTerms.propTypes = {
  state: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  switchingRegion: PropTypes.bool.isRequired,
  onOpenVersions: PropTypes.func.isRequired,
};

const subtitleOf = (state, collecting, t, status) => {
  if (!state || collecting) {
    return '';
  }
  return state.scope === 'site'
    ? t('terms.site', { site: status.brand.name })
    : t('terms.before', { client: state.client_name });
};

/**
 * `/oauth2/accept-terms`: one document from `GET /api/auth/terms` in the
 * one wide column, classic (the pane, "I accept and continue") or
 * collecting (the document as page copy, the identity field group and the
 * address as the shared `AddressFields` with the Places lookup, every
 * field prefilled from its `value` and editable, the address parts posted
 * under the listed fields' params, the `tel` field as the shared
 * `PhoneInput`, the blanks in every HTML member filling as the person
 * types, `full_name` joined from the names and `address` from the parts
 * present, the acknowledgment row and "I Agree & Continue"); the head row
 * carries the region flag button (`person_region`, opening a list dialog
 * of `regions_offered`) and, while more than one version exists, a
 * "Versions" link into a read-only version list; a person who accepted an
 * earlier version of the copy sees `changes_html` under a "What changed"
 * toggle instead of the plain text; the subtitle names the site for a
 * site-scope acceptance and the client otherwise. Decline posts
 * `/auth-cancel`; a `next` that is this route again swaps the document,
 * moves focus to the heading and announces the step.
 */
const TermsPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const status = useStatus();
  const heading = useRef(null);
  const { state, problem, setProblem, reload, changeRegion, switchingRegion } = useTerms();
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const accept = useAccept({ returnTo, state, setProblem, reload, setBusy, setAnnounce });

  useEffect(() => {
    document.title = state?.label || t('terms.pageTitle');
  }, [state, t]);

  useEffect(() => {
    if (state) {
      heading.current?.focus();
    }
  }, [state]);

  const decline = () =>
    cancelSignIn()
      .then(answer => followNext({ next: answer?.next, navigate, returnTo, trusted: true }))
      .catch(error => setProblem(report(error)));

  const collecting = Boolean(state?.collecting);
  const subtitle = subtitleOf(state, collecting, t, status);

  return (
    <AuthShell
      title={state?.label || t('terms.pageTitle')}
      subtitle={subtitle}
      wide
      headingRef={heading}
    >
      {announce && state ? (
        <div role="status" className="visually-hidden">
          {t('terms.step', { n: state.step, m: state.total })}
        </div>
      ) : null}
      {problem ? <ProblemAlert problem={problem} /> : null}
      {!state && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {state && !collecting ? (
        <ClassicTerms
          key={`${state.name}-${state.step}-${state.version}`}
          state={state}
          scale={scale}
          onScale={setScale}
          busy={busy}
          onAccept={accept}
          onRegionChange={changeRegion}
          switchingRegion={switchingRegion}
          onOpenVersions={() => setVersionsOpen(true)}
        />
      ) : null}
      {state && collecting ? (
        <CollectingTerms
          key={`${state.name}-${state.step}-${state.version}`}
          state={state}
          scale={scale}
          onScale={setScale}
          busy={busy}
          onAccept={accept}
          onRegionChange={changeRegion}
          switchingRegion={switchingRegion}
          onOpenVersions={() => setVersionsOpen(true)}
        />
      ) : null}
      {state ? (
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          disabled={busy}
          onClick={decline}
        >
          {t('terms.decline')}
        </button>
      ) : null}
      {state ? (
        <VersionsModal
          show={versionsOpen}
          versions={state.versions || []}
          current={state.version}
          onClose={() => setVersionsOpen(false)}
        />
      ) : null}
    </AuthShell>
  );
};

TermsPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TermsPage;
