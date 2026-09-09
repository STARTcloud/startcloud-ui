import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import PhoneInput from '../../../components/common/PhoneInput';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useFormRules } from '../../../hooks/useFormRules';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { loadCountries, regionsFor } from '../../../lib/countries';
import { followNext } from '../../../lib/next';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { NON_BLANK } from '../../../utils/validation';
import { acceptProviderTerms, acceptTerms, terms as fetchTerms } from '../api/onboarding';

const PROVIDER_ROUTE = '/provider-registration/tos';
const SESSION_EXPIRED = '/login?error=session_expired';
const SCALES = [0.85, 1, 1.15, 1.3];

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

const initialValues = fields => ({
  fields: Object.fromEntries(fields.map(field => [field.param, field.value || ''])),
});

const useCountries = enabled => {
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    loadCountries()
      .then(list => {
        if (active) {
          setCountries(list);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [enabled]);
  return countries;
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

const TermsField = ({ field, value, rules, countries, countryCode, onChange }) => {
  const { t } = useTranslation(['auth']);
  const name = `fields/${field.param}`;
  const label = field.required ? field.label : `${field.label} ${t('terms.optional')}`;
  const control = field.control || 'text';
  const listId = `${rules.idFor(name)}-list`;
  const regions = control === 'state' ? regionsFor(countryCode) : [];
  return (
    <Field
      id={rules.idFor(name)}
      label={label}
      error={rules.errors[name] || ''}
      className={`auth-field${field.span === 'full' ? ' auth-grid-full' : ''}`}
    >
      {aria => {
        if (control === 'country') {
          return (
            <div className="auth-input-wrap">
              <select
                {...aria}
                autoComplete={field.autocomplete}
                value={value}
                onChange={event => onChange(field.param, event.target.value)}
                onBlur={() => rules.onBlur(name)}
              >
                <option value="">{value && countries.length === 0 ? value : ''}</option>
                {countries.map(country => (
                  <option key={country.code} value={country.label}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (control === 'tel' || control === 'phone') {
          return (
            <PhoneInput
              id={aria.id}
              aria={aria}
              value={value}
              onChange={number => onChange(field.param, number)}
            />
          );
        }
        return (
          <div className="auth-input-wrap">
            <input
              {...aria}
              type={control === 'email' ? 'email' : 'text'}
              autoComplete={field.autocomplete}
              value={value}
              list={regions.length > 0 ? listId : undefined}
              onChange={event => onChange(field.param, event.target.value)}
              onBlur={() => rules.onBlur(name)}
            />
            {regions.length > 0 ? (
              <datalist id={listId}>
                {regions.map(region => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            ) : null}
          </div>
        );
      }}
    </Field>
  );
};

TermsField.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  countries: PropTypes.array.isRequired,
  countryCode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const FieldGroup = ({ title, fields, values, rules, countries, countryCode, onChange }) => {
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
            countries={countries}
            countryCode={countryCode}
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
  countries: PropTypes.array.isRequired,
  countryCode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const useTerms = () => {
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [state, setState] = useState(null);
  const [problem, setProblem] = useState(null);
  const [version, setVersion] = useState(0);

  const reload = () => setVersion(count => count + 1);

  useEffect(() => {
    let active = true;
    fetchTerms()
      .then(answer => {
        if (active) {
          setState(answer);
        }
      })
      .catch(error => {
        if (!active) {
          return;
        }
        if (error.status === 401) {
          navigate(SESSION_EXPIRED, { replace: true });
          return;
        }
        setProblem(report(error));
      });
    return () => {
      active = false;
    };
  }, [navigate, report, version]);

  return { state, problem, setProblem, reload };
};

const TermsHead = ({ state, scale, onScale }) => {
  const { t } = useTranslation(['auth']);
  return (
    <div className="auth-row">
      <span className="auth-hint">{t('terms.version', { version: state.version })}</span>
      <span className="auth-badge">{t('terms.step', { n: state.step, m: state.total })}</span>
      <FontSize scale={scale} onScale={onScale} />
    </div>
  );
};

TermsHead.propTypes = {
  state: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  onScale: PropTypes.func.isRequired,
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

const CollectingTerms = ({ state, scale, onScale, busy, onAccept }) => {
  const { t } = useTranslation(['auth']);
  const fields = useMemo(() => state.fields || [], [state.fields]);
  const schema = useMemo(() => schemaFor(fields), [fields]);
  const [values, setValues] = useState(() => initialValues(fields));
  const rules = useFormRules({ schema, values, idPrefix: 'terms' });
  const countries = useCountries(fields.some(field => field.control === 'country'));
  const countryValue = values.fields.country || '';
  const countryCode = countries.find(country => country.label === countryValue)?.code || '';
  const fills = useMemo(() => {
    const { first_name: first = '', last_name: last = '' } = values.fields;
    return { ...values.fields, full_name: [first, last].filter(Boolean).join(' ') };
  }, [values.fields]);

  const change = (param, value) =>
    setValues(previous => ({ fields: { ...previous.fields, [param]: value } }));

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    onAccept(values.fields, rules);
  };

  const group = key => fields.filter(field => (field.group || 'identity') === key);

  return (
    <form className="auth-form auth-form-wide" onSubmit={submit} noValidate>
      <TermsHead state={state} scale={scale} onScale={onScale} />
      <MarkdownArticle html={state.content_html} fontScale={scale} className="auth-doc-flow" />
      <FormErrorSummary errors={rules.summary} />
      <FieldGroup
        title={state.identity_group_title || t('terms.yourDetails')}
        fields={group('identity')}
        values={values.fields}
        rules={rules}
        countries={countries}
        countryCode={countryCode}
        onChange={change}
      />
      <FieldGroup
        title={t('terms.address')}
        fields={group('address')}
        values={values.fields}
        rules={rules}
        countries={countries}
        countryCode={countryCode}
        onChange={change}
      />
      <MarkdownArticle
        html={state.content_middle_html || ''}
        fills={fills}
        fontScale={scale}
        className="auth-doc-flow auth-doc-fine"
      />
      <MarkdownArticle
        html={state.content_bottom_html || ''}
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
};

/**
 * `/oauth2/accept-terms` and `/provider-registration/tos`: one document
 * from `GET /api/auth/terms`, classic (the pane, "I accept and continue")
 * or collecting (the wide column, the document as page copy, the identity
 * and address field groups prefilled and editable, the blanks filling as
 * the person types, the acknowledgment row and "I Agree & Continue");
 * Decline posts `/auth-cancel`; a `next` that is this route again swaps
 * the document, moves focus to the heading and announces the step.
 */
const TermsPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const heading = useRef(null);
  const { state, problem, setProblem, reload } = useTerms();
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
      wide={collecting}
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
          <TermsHead state={state} scale={scale} onScale={setScale} />
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
