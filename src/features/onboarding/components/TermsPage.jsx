import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AddressFields, { EMPTY_ADDRESS } from '../../../components/common/AddressFields';
import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import PhoneInput from '../../../components/common/PhoneInput';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useFormRules } from '../../../hooks/useFormRules';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { loadCountries } from '../../../lib/countries';
import { followNext } from '../../../lib/next';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { NON_BLANK } from '../../../utils/validation';
import {
  acceptProviderTerms,
  acceptTerms,
  geoCountry,
  placesKey as fetchPlacesKey,
  savePreferences,
  terms as fetchTerms,
} from '../api/onboarding';

const PROVIDER_ROUTE = '/provider-registration/tos';
const SESSION_EXPIRED = '/login?error=session_expired';
const SCALES = [0.85, 1, 1.15, 1.3];
const REGION_LABEL_KEYS = { EU: 'eu', EEA: 'eea', UK: 'uk' };
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

const RegionPicker = ({ regionsOffered = [], current = '', value = '', onChange, disabled }) => {
  const { t, i18n } = useTranslation(['auth']);
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([i18n.language], { type: 'region' });
    } catch {
      return null;
    }
  }, [i18n.language]);
  const label = code => {
    if (!code) {
      return t('terms.region.default');
    }
    if (REGION_LABEL_KEYS[code]) {
      return t(`terms.region.${REGION_LABEL_KEYS[code]}`);
    }
    return names?.of(code) || code;
  };
  if (regionsOffered.length < 2) {
    return null;
  }
  return (
    <span className="auth-row auth-row-tight">
      <span className="auth-hint">
        {current ? t('terms.region.notIn', { region: label(current) }) : t('terms.region.choose')}
      </span>
      <select
        className="form-select form-select-sm auth-region-select"
        aria-label={t('terms.region.choose')}
        value={value || ''}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      >
        {regionsOffered.map(code => (
          <option key={code || 'default'} value={code || ''}>
            {label(code)}
          </option>
        ))}
      </select>
    </span>
  );
};

RegionPicker.propTypes = {
  regionsOffered: PropTypes.arrayOf(PropTypes.string),
  current: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const TermsHead = ({ state, scale, onScale, onRegionChange, switchingRegion }) => {
  const { t } = useTranslation(['auth']);
  return (
    <div className="auth-row">
      <span className="auth-hint">{t('terms.version', { version: state.version })}</span>
      {state.region ? <span className="auth-badge">{state.region}</span> : null}
      <span className="auth-badge">{t('terms.step', { n: state.step, m: state.total })}</span>
      <RegionPicker
        regionsOffered={state.regions_offered}
        current={state.region}
        value={state.region}
        onChange={onRegionChange}
        disabled={switchingRegion}
      />
      <FontSize scale={scale} onScale={onScale} />
    </div>
  );
};

TermsHead.propTypes = {
  state: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  switchingRegion: PropTypes.bool.isRequired,
};

const useAccept = ({ returnTo, state, setProblem, reload, setBusy, setAnnounce }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();
  const post = location.pathname === PROVIDER_ROUTE ? acceptProviderTerms : acceptTerms;

  return (fields, rules = null) => {
    setProblem(null);
    setBusy(true);
    post({ tos_name: state.name, fields })
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
}) => {
  const { t } = useTranslation(['auth']);
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
      />
      <MarkdownArticle
        html={state.content_html}
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
};

/**
 * `/oauth2/accept-terms` and `/provider-registration/tos`: one document
 * from `GET /api/auth/terms` in the one wide column, classic (the pane,
 * "I accept and continue") or collecting (the document as page copy, the identity
 * field group and the address as the shared `AddressFields` with the
 * Places lookup, every field prefilled from its `value` and editable, the
 * address parts posted under the listed fields' params, the `tel` field
 * as the shared `PhoneInput`, the blanks in every HTML member filling as
 * the person types, `full_name` joined from the names and `address` from
 * the parts present, the acknowledgment row and "I Agree & Continue");
 * Decline posts `/auth-cancel`; a `next` that is this route
 * again swaps the document, moves focus to the heading and announces the
 * step.
 */
const TermsPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const heading = useRef(null);
  const { state, problem, setProblem, reload, changeRegion, switchingRegion } = useTerms();
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState(false);
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

  return (
    <AuthShell
      title={state?.label || t('terms.pageTitle')}
      subtitle={state && !collecting ? t('terms.before', { client: state.client_name }) : ''}
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
        <>
          <TermsHead
            state={state}
            scale={scale}
            onScale={setScale}
            onRegionChange={changeRegion}
            switchingRegion={switchingRegion}
          />
          <div className="auth-doc">
            <MarkdownArticle html={state.content_html} fontScale={scale} />
          </div>
          <button
            type="button"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy}
            onClick={() => accept({})}
          >
            {t('terms.accept')}
          </button>
        </>
      ) : null}
      {state && collecting ? (
        <CollectingTerms
          key={`${state.name}-${state.step}`}
          state={state}
          scale={scale}
          onScale={setScale}
          busy={busy}
          onAccept={accept}
          onRegionChange={changeRegion}
          switchingRegion={switchingRegion}
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
    </AuthShell>
  );
};

TermsPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TermsPage;
