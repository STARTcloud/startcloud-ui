import PropTypes from 'prop-types';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSliders } from 'react-icons/fa6';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useTheme } from '../../../hooks/useTheme';

const PREFS_KEY = 'table_prefs_profile_preferences';
const THEMES = ['light', 'dark', 'auto'];
const CHANNELS = ['PUSH', 'EMAIL', 'SMS'];
const SCHEMA = {
  properties: {
    timezone: { $ref: '#/$defs/timezone' },
    ciba_channel: { type: 'string', enum: CHANNELS },
    ciba_user_code: { type: 'string' },
  },
};
const LABELS = {
  timezone: 'profile.preferences.timezone',
  ciba_channel: 'profile.preferences.channel.label',
  ciba_user_code: 'profile.preferences.pin',
};

const timeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
};

const detectedZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

const languageName = code => {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

const settingsOf = preferences => ({
  timezone: preferences?.timezone || '',
  ciba_channel: preferences?.ciba_channel || 'PUSH',
});

const supportedLanguages = i18n =>
  (Array.isArray(i18n.options.supportedLngs) ? i18n.options.supportedLngs : []).filter(
    code => code !== 'cimode'
  );

const PinStatus = ({ pinSet, onSet, onClear }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className={`badge ${pinSet ? 'bg-success' : 'bg-secondary'}`}>
        {t(pinSet ? 'profile.preferences.pinSet' : 'profile.preferences.pinNone')}
      </span>
      {' · '}
      <button
        type="button"
        className="btn btn-link btn-sm p-0 align-baseline"
        onClick={pinSet ? onClear : onSet}
      >
        {t(pinSet ? 'profile.preferences.clear' : 'profile.preferences.set')}
      </button>
    </>
  );
};

PinStatus.propTypes = {
  pinSet: PropTypes.bool.isRequired,
  onSet: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

const SelectField = ({ id, label, hint, error = '', value, onChange, onBlur, children }) => (
  <Field id={id} label={label} hint={hint} error={error}>
    {aria => (
      <select {...aria} className="form-select" value={value} onChange={onChange} onBlur={onBlur}>
        {children}
      </select>
    )}
  </Field>
);

SelectField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  hint: PropTypes.node.isRequired,
  error: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  children: PropTypes.node.isRequired,
};

/**
 * The Preferences section of the identity contract at
 * `/user/profile/preferences`, one `SectionCard` titled Preferences whose
 * fold is kept under `table_prefs_profile_preferences`: language,
 * theme and time zone on one row, language and theme as selects that
 * write through on change, the same values the chrome's controls write
 * through the shared `useTheme` and the shared `i18n`; the time zone from
 * the `Intl` list with the detected zone preselected while none is set;
 * on the next row the sign-in approval channel (SMS disabled with a hint
 * while no verified number exists, the stored value kept selected) and
 * the approval PIN as an input group with Set and Clear inline and its
 * status line, "A PIN is set · Clear" or "No PIN · Set"; time zone,
 * channel and PIN saved together by one Save preferences through
 * `PATCH /api/user/preferences`, the time zone in the patch only when the
 * person chose one that differs from the stored value, so a detected
 * preselection is never written, while the rules evaluate the zone the
 * select holds; the page remounts it with every re-read of the record.
 */
const PreferencesTab = ({ account, profile, session, onSaved }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const folds = useFolds(PREFS_KEY);
  const languages = supportedLanguages(i18n);
  const preferences = profile.preferences || {};
  const [settings, setSettings] = useState(() => settingsOf(preferences));
  const [pin, setPin] = useState('');
  const [clearPin, setClearPin] = useState(false);
  const pinRef = useRef(null);
  const zones = useMemo(() => timeZones(), []);
  const [detected] = useState(detectedZone);
  const zone = settings.timezone || detected;
  const smsAllowed = Boolean(profile.mobile_number?.verified);
  const values = useMemo(
    () => ({ timezone: zone, ciba_channel: settings.ciba_channel, ciba_user_code: pin }),
    [zone, settings.ciba_channel, pin]
  );
  const rules = useFormRules({
    formKey: 'preferences',
    schema: SCHEMA,
    values,
    labels: LABELS,
    idPrefix: 'profile-preferences',
  });

  const set = (field, value) => setSettings(previous => ({ ...previous, [field]: value }));

  const changeLanguage = async language => {
    session.savePreferences({ language });
    await i18n.changeLanguage(language);
  };

  const setPinMode = () => {
    setClearPin(false);
    pinRef.current?.focus();
  };

  const clearPinMode = () => {
    setClearPin(true);
    setPin('');
    rules.clear('ciba_user_code');
  };

  const save = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const patch = { ciba_channel: settings.ciba_channel };
    if (settings.timezone && settings.timezone !== (preferences.timezone || '')) {
      patch.timezone = settings.timezone;
    }
    if (pin) {
      patch.ciba_user_code = pin;
    }
    if (clearPin) {
      patch.ciba_user_code = null;
    }
    try {
      await account.preferences(patch);
      setPin('');
      setClearPin(false);
      rules.reset();
      notify('success', t('profile.preferences.saved'));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const pinSet = Boolean(preferences.ciba_user_code_set) && !clearPin;
  const channelHint = (
    <>
      {t('profile.preferences.channelHint')}
      {smsAllowed ? null : ` ${t('profile.preferences.channelSmsHint')}`}
    </>
  );

  return (
    <div className="tab-pane fade show active">
      <SectionCard
        icon={<FaSliders aria-hidden />}
        title={t('profile.preferences.title')}
        className="mb-0"
        folded={folds.folded('preferences')}
        onFold={() => folds.toggle('preferences')}
      >
        <form onSubmit={save} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-4">
              <SelectField
                id="profile-preferences-language"
                label={t('profile.preferences.language')}
                hint={t('profile.preferences.languageHint')}
                value={i18n.language}
                onChange={event => changeLanguage(event.target.value)}
              >
                {languages.map(code => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-md-4">
              <SelectField
                id="profile-preferences-theme"
                label={t('profile.preferences.theme.label')}
                hint={t('profile.preferences.themeHint')}
                value={themePreference}
                onChange={event => setThemePreference(event.target.value)}
              >
                {THEMES.map(theme => (
                  <option key={theme} value={theme}>
                    {t(`profile.preferences.theme.${theme}`)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-md-4">
              <SelectField
                id={rules.idFor('timezone')}
                label={t('profile.preferences.timezone')}
                hint={t('profile.preferences.timezoneHint')}
                error={rules.errors.timezone || ''}
                value={zone}
                onChange={event => set('timezone', event.target.value)}
                onBlur={() => rules.onBlur('timezone')}
              >
                {zones.includes(zone) ? null : <option value={zone}>{zone}</option>}
                {zones.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <SelectField
                id={rules.idFor('ciba_channel')}
                label={t('profile.preferences.channel.label')}
                hint={channelHint}
                error={rules.errors.ciba_channel || ''}
                value={settings.ciba_channel}
                onChange={event => set('ciba_channel', event.target.value)}
                onBlur={() => rules.onBlur('ciba_channel')}
              >
                {CHANNELS.map(channel => (
                  <option key={channel} value={channel} disabled={channel === 'SMS' && !smsAllowed}>
                    {t(`profile.preferences.channel.${channel}`)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-md-6">
              <p className="small mb-1">
                <PinStatus pinSet={pinSet} onSet={setPinMode} onClear={clearPinMode} />
              </p>
              <Field
                id={rules.idFor('ciba_user_code')}
                label={t('profile.preferences.pin')}
                hint={t('profile.preferences.pinHint')}
                error={rules.errors.ciba_user_code || ''}
              >
                {aria => (
                  <div className="input-group">
                    <input
                      {...aria}
                      ref={pinRef}
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      placeholder={t('profile.preferences.pinPlaceholder')}
                      value={pin}
                      onChange={event => setPin(event.target.value)}
                      onBlur={() => rules.onBlur('ciba_user_code')}
                    />
                    <button type="button" className="btn btn-outline-primary" onClick={setPinMode}>
                      {t('profile.preferences.set')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={clearPinMode}
                      disabled={!pinSet && !pin}
                    >
                      {t('profile.preferences.clear')}
                    </button>
                  </div>
                )}
              </Field>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t('profile.preferences.save')}
          </button>
        </form>
      </SectionCard>
    </div>
  );
};

PreferencesTab.propTypes = {
  account: PropTypes.shape({ preferences: PropTypes.func.isRequired }).isRequired,
  profile: PropTypes.shape({
    preferences: PropTypes.object,
    mobile_number: PropTypes.shape({ verified: PropTypes.bool }),
  }).isRequired,
  session: PropTypes.shape({ savePreferences: PropTypes.func.isRequired }).isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default PreferencesTab;
