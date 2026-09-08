import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useTheme } from '../../../hooks/useTheme';

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

const PinStatus = ({ pinSet, onClear }) => {
  const { t } = useTranslation();
  if (!pinSet) {
    return <span className="badge bg-secondary">{t('profile.preferences.pinNone')}</span>;
  }
  return (
    <>
      <span className="badge bg-success me-2">{t('profile.preferences.pinSet')}</span>
      <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={onClear}>
        {t('profile.preferences.clear')}
      </button>
    </>
  );
};

PinStatus.propTypes = {
  pinSet: PropTypes.bool.isRequired,
  onClear: PropTypes.func.isRequired,
};

/**
 * The Preferences tab of the identity contract at `#preferences`: language
 * and theme as selects that write through on change, the same values the
 * chrome's controls write; the time zone from the `Intl` list with the
 * detected zone preselected while none is set, the sign-in approval
 * channel (SMS while a verified number exists) and the approval PIN with
 * its status line, saved together by one Save through
 * `PATCH /api/user/preferences`, the time zone in the patch only when the
 * person chose one that differs from the stored value, so a detected
 * preselection is never written; the theme goes through the shared
 * `useTheme` and the language through the shared `i18n`, the same the
 * chrome reads and writes; the page remounts it with every re-read of the
 * record.
 */
const PreferencesTab = ({ account, profile, session, onSaved }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const languages = supportedLanguages(i18n);
  const preferences = profile.preferences || {};
  const [settings, setSettings] = useState(() => settingsOf(preferences));
  const [pin, setPin] = useState('');
  const [clearPin, setClearPin] = useState(false);
  const zones = useMemo(() => timeZones(), []);
  const [detected] = useState(detectedZone);
  const zone = settings.timezone || detected;
  const smsAllowed = Boolean(profile.mobile_number?.verified);
  const channels = smsAllowed ? CHANNELS : CHANNELS.filter(channel => channel !== 'SMS');
  const values = useMemo(
    () => ({
      timezone: settings.timezone,
      ciba_channel: settings.ciba_channel,
      ciba_user_code: pin,
    }),
    [settings, pin]
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

  const changeTheme = theme => setThemePreference(theme);

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

  return (
    <div className="tab-pane fade show active">
      <div className="row">
        <div className="col-md-6">
          <Field
            id="profile-preferences-language"
            label={t('profile.preferences.language')}
            hint={t('profile.preferences.languageHint')}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={i18n.language}
                onChange={event => changeLanguage(event.target.value)}
              >
                {languages.map(code => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="col-md-6">
          <Field
            id="profile-preferences-theme"
            label={t('profile.preferences.theme.label')}
            hint={t('profile.preferences.themeHint')}
          >
            {aria => (
              <select
                {...aria}
                className="form-select"
                value={themePreference}
                onChange={event => changeTheme(event.target.value)}
              >
                {THEMES.map(theme => (
                  <option key={theme} value={theme}>
                    {t(`profile.preferences.theme.${theme}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>
      <form onSubmit={save} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <div className="row">
          <div className="col-md-6">
            <Field
              id={rules.idFor('timezone')}
              label={t('profile.preferences.timezone')}
              hint={t('profile.preferences.timezoneHint')}
              error={rules.errors.timezone || ''}
            >
              {aria => (
                <select
                  {...aria}
                  className="form-select"
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
                </select>
              )}
            </Field>
          </div>
          <div className="col-md-6">
            <Field
              id={rules.idFor('ciba_channel')}
              label={t('profile.preferences.channel.label')}
              hint={t('profile.preferences.channelHint')}
              error={rules.errors.ciba_channel || ''}
            >
              {aria => (
                <select
                  {...aria}
                  className="form-select"
                  value={settings.ciba_channel}
                  onChange={event => set('ciba_channel', event.target.value)}
                  onBlur={() => rules.onBlur('ciba_channel')}
                >
                  {channels.map(channel => (
                    <option key={channel} value={channel}>
                      {t(`profile.preferences.channel.${channel}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="col-md-6">
            <p className="small mb-1">
              <PinStatus pinSet={pinSet} onClear={() => setClearPin(true)} />
            </p>
            <Field
              id={rules.idFor('ciba_user_code')}
              label={t('profile.preferences.pin')}
              hint={t('profile.preferences.pinHint')}
              error={rules.errors.ciba_user_code || ''}
            >
              {aria => (
                <input
                  {...aria}
                  type="password"
                  className="form-control"
                  autoComplete="off"
                  value={pin}
                  onChange={event => setPin(event.target.value)}
                  onBlur={() => rules.onBlur('ciba_user_code')}
                />
              )}
            </Field>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          {t('profile.preferences.save')}
        </button>
      </form>
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
