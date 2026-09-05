import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import {
  authShape,
  readStoredLoginMethod,
  returnToShape,
  sortMethodsByDefault,
  storeLoginMethod,
} from '../../../utils/auth';
import { responseMessage } from '../../../utils/responseMessage';

import AuthShell, { AuthAlert, AuthSpinner, InboxIcon } from './AuthShell';
import ProviderButtons from './ProviderButtons';

const REGISTER_SCHEMA = {
  required: ['username', 'email', 'password'],
  properties: {
    username: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
  },
};
const REGISTER_LABELS = {
  username: 'auth:register.username',
  name: 'auth:register.name',
  email: 'auth:register.email',
  password: 'auth:register.password',
};

const resolveInitialMode = ({ localAllowed, hasOidc, loginMethodKey }) => {
  if (!localAllowed) {
    return 'sso';
  }
  if (!hasOidc) {
    return 'local';
  }
  return readStoredLoginMethod(loginMethodKey) === 'password' ? 'local' : 'sso';
};

const deriveRegisterView = ({ mode, localAllowed, hasOidc }) => {
  const localMode = mode === 'local' && localAllowed;
  return {
    showClosed: !hasOidc && !localAllowed,
    showLocalForm: localMode,
    showDivider: localMode && hasOidc,
    showButtons: hasOidc,
    showLocalToggle: !localMode && localAllowed,
    showSsoToggle: localMode && hasOidc,
  };
};

const RegisterField = ({
  name,
  label,
  hint = '',
  type,
  autoComplete,
  value,
  rules,
  onChange,
  children = null,
}) => (
  <Field
    id={rules.idFor(name)}
    label={label}
    hint={hint}
    error={rules.errors[name] || ''}
    className="auth-field"
  >
    {aria => (
      <div className={`auth-input-wrap${children ? ' auth-input-wrap--password' : ''}`}>
        <input
          {...aria}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={() => rules.onBlur(name)}
        />
        {children}
      </div>
    )}
  </Field>
);

RegisterField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  type: PropTypes.string.isRequired,
  autoComplete: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
};

const LocalRegisterForm = ({ formValues, rules, onChange, onSubmit, loading }) => {
  const { t } = useTranslation(['auth']);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <RegisterField
        name="username"
        label={t('register.username')}
        type="text"
        autoComplete="username"
        value={formValues.username}
        rules={rules}
        onChange={onChange}
      />
      <RegisterField
        name="name"
        label={t('register.name')}
        hint={t('register.nameHint')}
        type="text"
        autoComplete="name"
        value={formValues.name}
        rules={rules}
        onChange={onChange}
      />
      <RegisterField
        name="email"
        label={t('register.email')}
        type="email"
        autoComplete="email"
        value={formValues.email}
        rules={rules}
        onChange={onChange}
      />
      <RegisterField
        name="password"
        label={t('register.password')}
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={formValues.password}
        rules={rules}
        onChange={onChange}
      >
        <button
          type="button"
          className="auth-reveal"
          onClick={() => setShowPassword(visible => !visible)}
          aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </RegisterField>

      <button
        type="submit"
        className={`auth-btn auth-btn-primary auth-btn-block${loading ? ' is-loading' : ''}`}
        disabled={loading}
      >
        {t('register.signUpButton')}
      </button>
    </form>
  );
};

LocalRegisterForm.propTypes = {
  formValues: PropTypes.shape({
    username: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

const RegisterMethods = ({
  view,
  oidcMethods,
  defaultProvider,
  loading,
  loadingProvider,
  formValues,
  rules,
  onChange,
  onSubmit,
  onSelectProvider,
  onSwitchMode,
}) => {
  const { t } = useTranslation(['auth']);
  const hasLinks = view.showLocalToggle || view.showSsoToggle;

  return (
    <>
      {view.showClosed && <AuthAlert tone="info">{t('register.closed')}</AuthAlert>}
      {view.showLocalForm && (
        <LocalRegisterForm
          formValues={formValues}
          rules={rules}
          onChange={onChange}
          onSubmit={onSubmit}
          loading={loading}
        />
      )}
      {view.showDivider && <div className="auth-or">{t('login.orSeparator')}</div>}
      {view.showButtons && (
        <ProviderButtons
          methods={oidcMethods}
          defaultProvider={defaultProvider}
          loading={loading}
          loadingProvider={loadingProvider}
          onSelect={onSelectProvider}
        />
      )}
      {hasLinks && (
        <div className="auth-links">
          {view.showLocalToggle && (
            <button
              type="button"
              className="auth-link auth-link-muted"
              onClick={() => onSwitchMode('local')}
            >
              {t('register.useLocal')}
            </button>
          )}
          {view.showSsoToggle && (
            <button
              type="button"
              className="auth-link auth-link-muted"
              onClick={() => onSwitchMode('sso')}
            >
              {t('register.useSso')}
            </button>
          )}
        </div>
      )}
    </>
  );
};

RegisterMethods.propTypes = {
  view: PropTypes.shape({
    showClosed: PropTypes.bool.isRequired,
    showLocalForm: PropTypes.bool.isRequired,
    showDivider: PropTypes.bool.isRequired,
    showButtons: PropTypes.bool.isRequired,
    showLocalToggle: PropTypes.bool.isRequired,
    showSsoToggle: PropTypes.bool.isRequired,
  }).isRequired,
  oidcMethods: PropTypes.arrayOf(PropTypes.object).isRequired,
  defaultProvider: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  loadingProvider: PropTypes.string,
  formValues: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSelectProvider: PropTypes.func.isRequired,
  onSwitchMode: PropTypes.func.isRequired,
};

/**
 * The registration page every estate app with a register route draws the
 * same way: the local form where `auth.methods()` allows self-registration
 * or the URL carries an invitation token, one button per identity provider
 * through `session.begin`, and the check-your-inbox state after a local
 * sign-up.
 */
const RegisterPage = ({ session, returnTo, auth }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const location = useLocation();

  useEffect(() => {
    document.title = t('register.pageTitle');
  }, [t]);

  const [formValues, setFormValues] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rules = useFormRules({
    formKey: 'register',
    schema: REGISTER_SCHEMA,
    values: formValues,
    labels: REGISTER_LABELS,
  });
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [status, setStatus] = useState(null);
  const [invitationToken, setInvitationToken] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [authMethods, setAuthMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [defaultProvider, setDefaultProvider] = useState(null);
  const [localRegistrationEnabled, setLocalRegistrationEnabled] = useState(false);
  const [chosenMode, setChosenMode] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAuthMethods = async () => {
      try {
        const result = await auth.methods();
        if (cancelled) {
          return;
        }
        setAuthMethods(result.methods || []);
        setDefaultProvider(result.default_provider || null);
        setLocalRegistrationEnabled(!!result.local_registration_enabled);
      } catch (error) {
        if (!cancelled) {
          log.auth.error('Error loading auth methods', {
            error: error.message,
          });
          setAuthMethods([{ id: 'local', name: t('login.localAccount'), enabled: true }]);
          setLocalRegistrationEnabled(true);
        }
      } finally {
        if (!cancelled) {
          setMethodsLoading(false);
        }
      }
    };

    loadAuthMethods();

    return () => {
      cancelled = true;
    };
  }, [auth, t]);

  useEffect(() => {
    const validateToken = async () => {
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');
      if (token) {
        setInvitationToken(token);
        try {
          const invitation = await auth.validateInvitation(token);
          setOrganizationName(invitation.organizationName);
        } catch (error) {
          log.auth.error('Invalid or expired token', {
            token,
            error: error.message,
          });
        }
      }
    };

    validateToken();
  }, [auth, location]);

  const enabledAuthMethods = useMemo(
    () => authMethods.filter(method => method.enabled),
    [authMethods]
  );
  const localEnabled = enabledAuthMethods.some(method => method.id === 'local');
  const oidcMethods = useMemo(
    () =>
      sortMethodsByDefault(
        enabledAuthMethods.filter(method => method.id.startsWith('oidc-')),
        defaultProvider
      ),
    [enabledAuthMethods, defaultProvider]
  );
  const hasOidc = oidcMethods.length > 0;
  const localAllowed = localEnabled && (localRegistrationEnabled || !!invitationToken);
  const mode =
    chosenMode ||
    resolveInitialMode({ localAllowed, hasOidc, loginMethodKey: auth.loginMethodKey });
  const view = deriveRegisterView({ mode, localAllowed, hasOidc });

  const handleSwitchMode = next => {
    setChosenMode(next);
    storeLoginMethod(auth.loginMethodKey, next === 'local' ? 'password' : 'sso');
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleOidcRegister = provider => {
    try {
      returnTo.remember(
        invitationToken
          ? `/invite/${encodeURIComponent(invitationToken)}`
          : '/organizations/discover'
      );
      setLoadingProvider(provider);
      session.begin({ method: provider });
    } catch (err) {
      log.auth.error('Invalid OIDC provider selected', { error: err.message });
      setLoadingProvider(null);
      setStatus({ success: false, message: t('errors.invalidProvider') });
    }
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    auth
      .register({
        username: formValues.username,
        email: formValues.email,
        password: formValues.password,
        invitationToken,
        name: formValues.name,
      })
      .then(data => {
        setStatus({ success: true, message: data.message });
        setIsSubmitting(false);
      })
      .catch(error => {
        if (!rules.applyServerErrors(error)) {
          setStatus({
            success: false,
            message: responseMessage(error, error.message || error.toString()),
          });
        }
        setIsSubmitting(false);
      });
  };

  if (status?.success) {
    return (
      <AuthShell title={t('register.checkInbox')} subtitle={status.message} icon={<InboxIcon />}>
        <p className="auth-note">{t('register.checkInboxHint')}</p>
        <Link to="/login" className="auth-btn auth-btn-secondary auth-btn-block">
          {t('register.signIn')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('register.headline')} subtitle={t('register.subhead')}>
      {organizationName && (
        <AuthAlert tone="info">
          {t('register.joiningOrganization')} <strong>{organizationName}</strong>
        </AuthAlert>
      )}

      {status?.message && <AuthAlert tone="danger">{status.message}</AuthAlert>}

      {methodsLoading ? (
        <AuthSpinner label={t('shared:loading')} />
      ) : (
        <RegisterMethods
          view={view}
          oidcMethods={oidcMethods}
          defaultProvider={defaultProvider}
          loading={isSubmitting}
          loadingProvider={loadingProvider}
          formValues={formValues}
          rules={rules}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onSelectProvider={handleOidcRegister}
          onSwitchMode={handleSwitchMode}
        />
      )}

      <p className="auth-foot">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="auth-link">
          {t('register.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
};

RegisterPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
  auth: authShape.isRequired,
};

export default RegisterPage;
