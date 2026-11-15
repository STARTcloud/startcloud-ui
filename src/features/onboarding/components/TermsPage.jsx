import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AddressFields, { EMPTY_ADDRESS } from '../../../components/common/AddressFields';
import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FieldError from '../../../components/common/FieldError';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle, {
  documentBroken,
  FIELD_KINDS,
  fieldShape,
} from '../../../components/common/MarkdownArticle';
import OptionList, { Option } from '../../../components/common/OptionList';
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
  address_line_1: 'line1',
  address_line_2: 'line2',
  country: 'country_code',
  state: 'state',
  city: 'city',
  postal_code: 'postal_code',
};
const FULL_KINDS = ['tel', 'checkbox', 'choice', 'signature'];
const NO_FIELDS = [];

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(date);
};

const isAddressPart = field =>
  field.group === 'address' && Object.hasOwn(ADDRESS_PARTS, field.name);

const inputsOf = fields =>
  fields.filter(
    field => FIELD_KINDS.includes(field.kind) && field.kind !== 'composite' && !field.removed
  );

const labelOf = (field, t) =>
  field.group === 'document'
    ? field.label || field.name
    : t(`terms.field.${field.name}`, { defaultValue: field.label || field.name });

const mustBeTicked = value => (value === true ? null : { rule: 'required', params: {} });

const propertyOf = (field, title) => {
  if (field.kind === 'checkbox') {
    return { type: 'boolean', title, ...(field.required ? { custom: mustBeTicked } : {}) };
  }
  const base = field.required ? NON_BLANK : { type: 'string' };
  if (field.kind === 'date') {
    return { ...base, format: 'date', title };
  }
  return field.kind === 'choice'
    ? { ...base, enum: field.options || [], title }
    : { ...base, title };
};

const schemaFor = (inputs, t) => ({
  properties: {
    fields: {
      required: inputs.filter(field => field.required).map(field => field.name),
      properties: Object.fromEntries(
        inputs.map(field => [field.name, propertyOf(field, labelOf(field, t))])
      ),
    },
  },
});

const hasChanges = state => typeof state.changes_html === 'string';

const zonesOf = (state, whatChanged) =>
  whatChanged && hasChanges(state)
    ? {
        top: state.changes_html,
        middle: state.changes_middle_html || '',
        bottom: state.changes_bottom_html || '',
      }
    : {
        top: state.content_html,
        middle: state.content_middle_html || '',
        bottom: state.content_bottom_html || '',
      };

const htmlsOf = state => [
  state.content_html,
  state.content_middle_html,
  state.content_bottom_html,
  state.changes_html,
  state.changes_middle_html,
  state.changes_bottom_html,
];

const initialValues = fields =>
  Object.fromEntries(
    fields.map(field => [field.name, field.kind === 'checkbox' ? false : field.value || ''])
  );

const initialAddress = fields =>
  fields.reduce(
    (address, field) => ({ ...address, [ADDRESS_PARTS[field.name]]: field.value || '' }),
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

const TickField = ({ field, label, value, rules, onChange }) => {
  const name = `fields/${field.name}`;
  const id = rules.idFor(name);
  const error = rules.errors[name] || '';
  const errorId = `${id}-error`;
  return (
    <div className={`field${error ? ' field-invalid' : ''} auth-field auth-grid-full`}>
      <label className="auth-check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-errormessage={error ? errorId : undefined}
          onChange={event => onChange(field.name, event.target.checked)}
          onBlur={() => rules.onBlur(name)}
        />
        <span>{label}</span>
      </label>
      {error ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
};

TickField.propTypes = {
  field: fieldShape.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.bool.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

const FieldControl = ({ field, aria, value, country, onChange, onBlur }) => {
  if (field.kind === 'tel') {
    return (
      <PhoneInput
        id={aria.id}
        aria={{ ...aria, onBlur }}
        value={value}
        initialCountry={country}
        disabled={Boolean(field.read_only)}
        onChange={number => {
          if (!field.read_only) {
            onChange(field.name, number);
          }
        }}
      />
    );
  }
  if (field.kind === 'choice') {
    const [first] = field.options || [];
    return (
      <div aria-describedby={aria['aria-describedby']}>
        <OptionList label={field.label || field.name}>
          {(field.options || []).map(option => (
            <Option
              key={option}
              id={option === first ? aria.id : ''}
              name={aria.id}
              value={option}
              checked={value === option}
              onChange={picked => onChange(field.name, picked)}
              label={option}
            />
          ))}
        </OptionList>
      </div>
    );
  }
  return (
    <div className="auth-input-wrap">
      <input
        {...aria}
        type={field.kind === 'date' ? 'date' : 'text'}
        autoComplete={field.autocomplete}
        value={value}
        disabled={Boolean(field.read_only)}
        onChange={event => onChange(field.name, event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
};

FieldControl.propTypes = {
  field: fieldShape.isRequired,
  aria: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  country: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};

const TermsField = ({ field, value, rules, country, onChange }) => {
  const { t } = useTranslation(['auth']);
  const name = `fields/${field.name}`;
  const base = labelOf(field, t);
  const text = field.required ? base : `${base} ${t('terms.optional')}`;
  const label = field.changed ? (
    <>
      {text} <span className="auth-badge">{t('terms.changed')}</span>
    </>
  ) : (
    text
  );
  if (field.kind === 'checkbox') {
    return (
      <TickField
        field={field}
        label={label}
        value={value === true}
        rules={rules}
        onChange={onChange}
      />
    );
  }
  return (
    <Field
      id={rules.idFor(name)}
      label={label}
      error={rules.errors[name] || ''}
      className={`auth-field${FULL_KINDS.includes(field.kind) ? ' auth-grid-full' : ''}`}
    >
      {aria => (
        <FieldControl
          field={field}
          aria={aria}
          value={String(value || '')}
          country={country}
          onChange={onChange}
          onBlur={() => rules.onBlur(name)}
        />
      )}
    </Field>
  );
};

TermsField.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
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
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
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
  const nameByPart = Object.fromEntries(
    fields.map(field => [ADDRESS_PARTS[field.name], `fields/${field.name}`])
  );
  const errors = Object.fromEntries(
    Object.entries(nameByPart).map(([part, name]) => [part, rules.errors[name] || ''])
  );
  const suffixes = Object.fromEntries(
    fields
      .filter(field => !field.required)
      .map(field => [ADDRESS_PARTS[field.name], t('terms.optional')])
  );
  const onBlur = part => {
    if (nameByPart[part]) {
      rules.onBlur(nameByPart[part]);
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
          parts={Object.keys(nameByPart)}
          suffixes={suffixes}
          idFor={part => rules.idFor(nameByPart[part])}
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
            <MarkdownArticle
              html={viewing.content_html}
              anchorKey={viewing.anchor_key || ''}
              fields={viewing.fields || NO_FIELDS}
              fieldsVersion={viewing.fields_version}
              className="auth-doc-flow"
            />
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
  if (!hasChanges(state)) {
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
      {state.previous ? (
        <span className="auth-hint">
          {t('terms.changedSince', {
            version: state.previous.version,
            date: formatDate(state.previous.accepted_at, i18n.language),
          })}
        </span>
      ) : null}
    </div>
  );
};

WhatChangedRow.propTypes = {
  state: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const useAccept = ({ returnTo, events, state, setProblem, reload, setBusy, setAnnounce }) => {
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
        followNext({ next, navigate, returnTo, events });
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

const useCollectedFields = (inputs, countries) => {
  const plainFields = useMemo(() => inputs.filter(field => !isAddressPart(field)), [inputs]);
  const addressFields = useMemo(() => inputs.filter(isAddressPart), [inputs]);
  const [plain, setPlain] = useState(() => initialValues(plainFields));
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
        ...plain,
        ...Object.fromEntries(
          addressFields.map(field => [field.name, record[ADDRESS_PARTS[field.name]] || ''])
        ),
      },
    }),
    [plain, addressFields, record]
  );
  const changePlain = (name, value) => setPlain(previous => ({ ...previous, [name]: value }));
  return { plainFields, addressFields, values, record, changePlain, setAddress };
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
  const fields = useMemo(() => state.fields || NO_FIELDS, [state.fields]);
  const inputs = useMemo(() => inputsOf(fields), [fields]);
  const schema = useMemo(() => schemaFor(inputs, t), [inputs, t]);
  const countries = useCountries(inputs.some(isAddressPart));
  const placesKey = usePlacesKey(inputs.some(isAddressPart));
  const geo = useGeoCountry(inputs.some(field => field.kind === 'tel'));
  const { plainFields, addressFields, values, record, changePlain, setAddress } =
    useCollectedFields(inputs, countries);
  const rules = useFormRules({ schema, values, idPrefix: 'terms' });
  const { idFor } = rules;
  const inputId = useCallback(
    name => (inputs.some(entry => entry.name === name) ? idFor(`fields/${name}`) : ''),
    [inputs, idFor]
  );
  const broken = useMemo(
    () =>
      documentBroken({
        htmls: htmlsOf(state),
        anchorKey: state.anchor_key || '',
        fields,
        fieldsVersion: state.fields_version,
      }),
    [state, fields]
  );
  const zones = zonesOf(state, whatChanged);
  const article = {
    anchorKey: state.anchor_key || '',
    fields,
    fieldsVersion: state.fields_version,
    values: values.fields,
    inputId,
    fontScale: scale,
  };

  const submit = event => {
    event.preventDefault();
    if (broken || !rules.validateAll()) {
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
      {broken ? <AuthAlert tone="danger">{t('terms.blankErrors')}</AuthAlert> : null}
      <MarkdownArticle html={zones.top} {...article} className="auth-doc-flow" />
      <FormErrorSummary errors={rules.summary} />
      <FieldGroup
        title={t('terms.yourDetails')}
        fields={plainFields.filter(field => field.group !== 'document')}
        values={values.fields}
        rules={rules}
        country={geo}
        onChange={changePlain}
      />
      <AddressGroup
        fields={addressFields}
        address={record}
        rules={rules}
        placesKey={placesKey}
        onChange={setAddress}
      />
      <FieldGroup
        title={t('terms.documentFields')}
        fields={plainFields.filter(field => field.group === 'document')}
        values={values.fields}
        rules={rules}
        country={geo}
        onChange={changePlain}
      />
      <MarkdownArticle html={zones.middle} {...article} className="auth-doc-flow auth-doc-fine" />
      <MarkdownArticle html={zones.bottom} {...article} className="auth-doc-flow auth-doc-fine" />
      <div className="auth-ack">{t('terms.acknowledge')}</div>
      <button
        type="submit"
        className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
        disabled={busy || broken}
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
  const fields = useMemo(() => state.fields || NO_FIELDS, [state.fields]);
  const broken = useMemo(
    () =>
      documentBroken({
        htmls: htmlsOf(state),
        anchorKey: state.anchor_key || '',
        fields,
        fieldsVersion: state.fields_version,
      }),
    [state, fields]
  );
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
      {broken ? <AuthAlert tone="danger">{t('terms.blankErrors')}</AuthAlert> : null}
      <div className="auth-doc">
        <MarkdownArticle
          html={zonesOf(state, whatChanged).top}
          anchorKey={state.anchor_key || ''}
          fields={fields}
          fieldsVersion={state.fields_version}
          fontScale={scale}
        />
      </div>
      <button
        type="button"
        className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
        disabled={busy || broken}
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
 * collecting. A collecting document draws its three zones through the
 * document component, every anchor of the answer's `anchor_key` a blank
 * that mirrors its input as the person types, and one input per `fields`
 * entry that is neither `composite` nor `removed`, by `kind`: `text`,
 * `state`, `country` and `signature` a text field, `tel` the shared
 * `PhoneInput`, `checkbox` a tick box, `date` a date field and `choice`
 * the radio cards of its `options`, the first radio carrying the field's
 * id; `read_only` draws the input disabled and keeps the answer's value
 * whatever the control reports, and `changed` marks its label. The
 * inputs sit in three groups by `group`: the identity grid, the address as the shared
 * `AddressFields` with the Places lookup, and the document's declared
 * fields; a profile field's label is the page's own by `name`, a declared
 * field's the answer's `label`, and a field whose `required` is false is
 * marked optional. A person who accepted an earlier version sees the
 * three `changes_*` members in the three zones under a "What changed"
 * toggle, absent when the answer carries none. An anchor with no entry,
 * a `kind` the page does not know or a `fields_version` it does not know
 * draws an error in the blank's place and an alert, and "I Agree &
 * Continue" stays disabled. The post carries every input by `name`, a
 * tick box as a boolean and a date as `yyyy-MM-dd`; a `422` paints at
 * `/fields/<name>`, and every input, the address parts included, carries
 * the id the form's rules name it by, so a link of the error summary
 * lands on its input. The head row carries the region flag button
 * (`person_region`, opening a list dialog of `regions_offered`) and,
 * while more than one version exists, a "Versions" link into a read-only
 * version list whose documents draw their anchors as blanks with no
 * input; the subtitle names the site for a site-scope acceptance and the
 * client otherwise. Decline posts `/auth-cancel`; a `next` that is this
 * route again swaps the document, moves focus to the heading and
 * announces the step, and any other `next` is followed with the session
 * bus as `events`, so the page it lands on in-router draws signed in.
 */
const TermsPage = ({ returnTo, events }) => {
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
  const accept = useAccept({ returnTo, events, state, setProblem, reload, setBusy, setAnnounce });

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
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default TermsPage;
