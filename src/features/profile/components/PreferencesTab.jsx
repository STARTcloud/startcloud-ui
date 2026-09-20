import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useTheme } from '../../../hooks/useTheme';
import { loadCountries } from '../../../lib/countries';

import ManageLink from './ManageLink';

const PREFS_KEY = 'table_prefs_profile_preferences';
const THEMES = ['light', 'dark', 'auto'];
const CHANNELS = ['PUSH', 'EMAIL', 'SMS'];
const REGION_SETS = ['EU', 'EEA', 'UK'];
const RECORD_SCHEMA = {
  properties: {
    timezone: { $ref: '#/$defs/timezone' },
    region: { $ref: '#/$defs/region' },
    ciba_channel: { type: 'string', enum: CHANNELS },
  },
};
const SCHEMA = {
  properties: { ...RECORD_SCHEMA.properties, ciba_user_code: { type: 'string' } },
};
const LABELS = {
  timezone: 'profile.preferences.timezone',
  region: 'profile.preferences.region',
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
  language: preferences?.language || '',
  theme: preferences?.theme || 'auto',
  timezone: preferences?.timezone || '',
  region: preferences?.region || '',
  ciba_channel: preferences?.ciba_channel || 'PUSH',
});

const patchOf = ({ settings, preferences, pin, clearPin, own }) => {
  const patch = { ciba_channel: settings.ciba_channel };
  if (settings.timezone && settings.timezone !== (preferences.timezone || '')) {
    patch.timezone = settings.timezone;
  }
  if (settings.region !== (preferences.region || '')) {
    patch.region = settings.region || null;
  }
  if (!own) {
    patch.language = settings.language;
    patch.theme = settings.theme;
    return patch;
  }
  if (pin) {
    patch.ciba_user_code = pin;
  }
  if (clearPin) {
    patch.ciba_user_code = null;
  }
  return patch;
};

const supportedLanguages = i18n =>
  (Array.isArray(i18n.options.supportedLngs) ? i18n.options.supportedLngs : []).filter(
    code => code !== 'cimode'
  );

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

const ReadOnlyField = ({ id, label, value }) => (
  <Field id={id} label={label}>
    {aria => <input {...aria} type="text" className="form-control" value={value} readOnly />}
  </Field>
);

ReadOnlyField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
};

const ReadOnlyPreferences = ({ account, profile, folds }) => {
  const { t, i18n } = useTranslation();
  const { preference: themePreference } = useTheme();
  const preferences = profile.preferences || {};
  const fields = [
    ['language', t('profile.preferences.language'), languageName(i18n.language)],
    [
      'theme',
      t('profile.preferences.theme.label'),
      t(`profile.preferences.theme.${themePreference}`),
    ],
    ['timezone', t('profile.preferences.timezone'), preferences.timezone || detectedZone()],
    [
      'region',
      t('profile.preferences.region'),
      preferences.region || t('profile.preferences.regionNotSet'),
    ],
  ];
  return (
    <div className="tab-pane fade show active">
      <SectionCard
        title={t('profile.preferences.title')}
        className="mb-0"
        actions={<ManageLink account={account} />}
        folded={folds.folded('preferences')}
        onFold={() => folds.toggle('preferences')}
      >
        <div className="row">
          {fields.map(([key, label, value]) => (
            <div key={key} className="col-md-3">
              <ReadOnlyField id={`profile-preferences-${key}`} label={label} value={value} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

ReadOnlyPreferences.propTypes = {
  account: PropTypes.object.isRequired,
  profile: PropTypes.shape({ preferences: PropTypes.object }).isRequired,
  folds: PropTypes.shape({
    folded: PropTypes.func.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
};

const PinField = ({ rules, pin, pinSet, pinRef, onPin, onSet, onClear }) => {
  const { t } = useTranslation();
  return (
    <>
      {pinSet ? <p className="small text-muted mb-1">{t('profile.preferences.pinSet')}</p> : null}
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
              onChange={event => onPin(event.target.value)}
              onBlur={() => rules.onBlur('ciba_user_code')}
            />
            <button type="button" className="btn btn-outline-secondary" onClick={onSet}>
              {t('profile.preferences.set')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClear}
              disabled={!pinSet}
            >
              {t('profile.preferences.clear')}
            </button>
          </div>
        )}
      </Field>
    </>
  );
};

PinField.propTypes = {
  rules: PropTypes.object.isRequired,
  pin: PropTypes.string.isRequired,
  pinSet: PropTypes.bool.isRequired,
  pinRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  onPin: PropTypes.func.isRequired,
  onSet: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

const EditablePreferences = ({ account, profile, session, folds, onSaved }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const own = session !== null;
  const languages = supportedLanguages(i18n);
  const preferences = profile.preferences || {};
  const [settings, setSettings] = useState(() => settingsOf(preferences));
  const [pin, setPin] = useState('');
  const [clearPin, setClearPin] = useState(false);
  const pinRef = useRef(null);
  const zones = useMemo(() => timeZones(), []);
  const [detected] = useState(detectedZone);
  const zone = settings.timezone || detected;
  const [countries, setCountries] = useState([]);
  useEffect(() => {
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
  }, [i18n.language]);
  const smsAllowed = Boolean(profile.mobile_number?.verified);
  const values = useMemo(
    () => ({
      timezone: zone,
      region: settings.region,
      ciba_channel: settings.ciba_channel,
      ...(own ? { ciba_user_code: pin } : {}),
    }),
    [zone, settings.region, settings.ciba_channel, pin, own]
  );
  const rules = useFormRules({
    formKey: 'preferences',
    schema: own ? SCHEMA : RECORD_SCHEMA,
    values,
    labels: LABELS,
    idPrefix: 'profile-preferences',
  });

  const set = (field, value) => setSettings(previous => ({ ...previous, [field]: value }));

  const changeLanguage = async language => {
    if (!own) {
      set('language', language);
      return;
    }
    session.savePreferences({ language });
    await i18n.changeLanguage(language);
  };

  const changeTheme = theme => {
    if (!own) {
      set('theme', theme);
      return;
    }
    setThemePreference(theme);
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
    try {
      await account.preferences(patchOf({ settings, preferences, pin, clearPin, own }));
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
        title={t('profile.preferences.title')}
        className="mb-0"
        folded={folds.folded('preferences')}
        onFold={() => folds.toggle('preferences')}
      >
        <form onSubmit={save} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-3">
              <SelectField
                id="profile-preferences-language"
                label={t('profile.preferences.language')}
                hint={own ? t('profile.preferences.languageHint') : ''}
                value={own ? i18n.language : settings.language || i18n.language}
                onChange={event => changeLanguage(event.target.value)}
              >
                {languages.map(code => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-md-3">
              <SelectField
                id="profile-preferences-theme"
                label={t('profile.preferences.theme.label')}
                hint={own ? t('profile.preferences.themeHint') : ''}
                value={own ? themePreference : settings.theme}
                onChange={event => changeTheme(event.target.value)}
              >
                {THEMES.map(theme => (
                  <option key={theme} value={theme}>
                    {t(`profile.preferences.theme.${theme}`)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
              <SelectField
                id={rules.idFor('region')}
                label={t('profile.preferences.region')}
                hint={t('profile.preferences.regionHint')}
                error={rules.errors.region || ''}
                value={settings.region}
                onChange={event => set('region', event.target.value)}
                onBlur={() => rules.onBlur('region')}
              >
                <option value="">{t('profile.preferences.regionNotSet')}</option>
                {REGION_SETS.map(code => (
                  <option key={code} value={code}>
                    {t(`profile.preferences.regionSet.${code.toLowerCase()}`)}
                  </option>
                ))}
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.label}
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
            {own ? (
              <div className="col-md-6">
                <PinField
                  rules={rules}
                  pin={pin}
                  pinSet={pinSet}
                  pinRef={pinRef}
                  onPin={setPin}
                  onSet={setPinMode}
                  onClear={clearPinMode}
                />
              </div>
            ) : null}
          </div>
          <button type="submit" className="btn btn-primary">
            {t('profile.preferences.save')}
          </button>
        </form>
      </SectionCard>
    </div>
  );
};

EditablePreferences.propTypes = {
  account: PropTypes.shape({ preferences: PropTypes.func.isRequired }).isRequired,
  profile: PropTypes.shape({
    preferences: PropTypes.object,
    mobile_number: PropTypes.shape({ verified: PropTypes.bool }),
  }).isRequired,
  session: PropTypes.shape({ savePreferences: PropTypes.func.isRequired }),
  folds: PropTypes.shape({
    folded: PropTypes.func.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
  onSaved: PropTypes.func.isRequired,
};

/**
 * The Preferences section of the identity contract at
 * `/user/profile/preferences`, one `SectionCard` titled Preferences whose
 * fold is kept under `table_prefs_profile_preferences`: language,
 * theme, time zone and region on one row, language and theme as selects
 * that write through on change, the same values the chrome's controls
 * write through the shared `useTheme` and the shared `i18n`; the time
 * zone from the `Intl` list with the detected zone preselected while none
 * is set; region as a select of the two-letter country list plus `EU`,
 * `EEA` and `UK`, the legal region the terms and policy variants resolve
 * to, blank clearing it; on the next row the sign-in approval channel
 * (SMS disabled with a hint while no verified number exists, the stored
 * value kept selected) and the approval PIN as one input with its own Set
 * and Clear buttons beside it, "A PIN is set" drawn as muted text above the
 * field while one is stored; time zone, region, channel and PIN saved together by
 * one Save preferences through `PATCH /api/user/preferences`, the time
 * zone and the region in the patch only when they differ from the stored
 * value, so a detected preselection is never written, while the rules
 * evaluate the zone and region the selects hold; the page remounts it
 * with every re-read of the record. While `readOnly`, the record an
 * identity provider owns, the language, theme, time zone and region draw
 * as `readonly` fields in the same card with the Manage at identity
 * provider link as its action, the approval channel and PIN being the
 * issuer's own and not drawn. Without a `session`, the record another
 * person's on the admin record page, language and theme are the record's
 * own values saved with the rest through `account.preferences` and never
 * the viewer's chrome, and the PIN is not drawn because the admin route
 * takes none.
 */
const PreferencesTab = ({ account, profile, readOnly, onSaved, session = null }) => {
  const folds = useFolds(PREFS_KEY);
  if (readOnly) {
    return <ReadOnlyPreferences account={account} profile={profile} folds={folds} />;
  }
  return (
    <EditablePreferences
      account={account}
      profile={profile}
      session={session}
      folds={folds}
      onSaved={onSaved}
    />
  );
};

PreferencesTab.propTypes = {
  account: PropTypes.shape({ preferences: PropTypes.func }).isRequired,
  profile: PropTypes.shape({
    preferences: PropTypes.object,
    mobile_number: PropTypes.shape({ verified: PropTypes.bool }),
  }).isRequired,
  session: PropTypes.shape({ savePreferences: PropTypes.func.isRequired }),
  readOnly: PropTypes.bool.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default PreferencesTab;
