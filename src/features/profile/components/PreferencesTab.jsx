import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FieldError from '../../../components/common/FieldError';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { MOTION_VALUES, useMotion } from '../../../hooks/useMotion';
import { useTheme } from '../../../hooks/useTheme';
import { loadCountries } from '../../../lib/countries';
import {
  HyperweaverServiceCard,
  hyperweaverServiceOf,
  integrationsShape,
} from '../../integrations';

import ManageLink from './ManageLink';

const PREFS_KEY = 'table_prefs_profile_preferences';
const MODES = ['light', 'dark', 'auto'];
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
const LOCAL_TARGET = 'local';
const DEPLOY_TARGET = 'deploy_target';
const DEPLOY_SCHEMA = { properties: { [DEPLOY_TARGET]: { type: 'string' } } };
const DEPLOY_LABELS = { [DEPLOY_TARGET]: 'integrations.hyperweaver.deployTarget' };
const deployShape = PropTypes.shape({
  read: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
});
const NOTICE_WHENS = ['off', 'new', 'all'];
const NOTICE_CHANNELS = ['email', 'inbox', 'push'];
const NOTICES = 'sign_in_notices';
const NOTICES_WHEN = `${NOTICES}/when`;
const NOTICES_CHANNELS = `${NOTICES}/channels`;
const NOTICES_SCHEMA = {
  properties: {
    [NOTICES]: {
      type: 'object',
      properties: {
        when: { type: 'string', enum: NOTICE_WHENS },
        channels: { type: 'array', items: { type: 'string', enum: NOTICE_CHANNELS } },
      },
    },
  },
};
const NOTICES_LABELS = {
  [NOTICES]: 'profile.preferences.signInNotices.title',
  [NOTICES_WHEN]: 'profile.preferences.signInNotices.when.label',
  [NOTICES_CHANNELS]: 'profile.preferences.signInNotices.channels.label',
};

const inOrder = channels => NOTICE_CHANNELS.filter(channel => channels.includes(channel));

/**
 * The sign-in notices of a record's preferences: `when`, the channels in
 * the order the card draws them and `following`, true while the person
 * follows the site's default; null for a record that carries no
 * `sign_in_notices`.
 *
 * @param {Object|undefined} preferences - `preferences` of the record
 * @returns {{ when: string, channels: string[], following: boolean }|null} The setting, or null
 */
export const signInNoticesOf = preferences => {
  const notices = preferences?.sign_in_notices;
  if (!notices || typeof notices !== 'object') {
    return null;
  }
  return {
    when: notices.when,
    channels: inOrder(notices.channels),
    following: notices.default === true,
  };
};

/**
 * The preferences patch that saves the sign-in notices: `when` and
 * `channels` where each differs from the record, never `default`.
 *
 * @param {{ when: string, channels: string[] }} draft - The card's choice
 * @param {{ when: string, channels: string[] }} stored - The record's setting
 * @returns {{ sign_in_notices: { when?: string, channels?: string[] } }|null} The patch, null while nothing differs
 */
export const signInNoticesPatch = (draft, stored) => {
  const channels = inOrder(draft.channels);
  const changed = {
    ...(draft.when === stored.when ? {} : { when: draft.when }),
    ...(channels.join() === inOrder(stored.channels).join() ? {} : { channels }),
  };
  return Object.keys(changed).length > 0 ? { [NOTICES]: changed } : null;
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
  mode: preferences?.mode || 'auto',
  theme: preferences?.theme || '',
  motion: preferences?.motion || 'auto',
  timezone: preferences?.timezone || '',
  region: preferences?.region || '',
  ciba_channel: preferences?.ciba_channel || 'PUSH',
});

const patchOf = ({ settings, preferences, pin, clearPin, own }) => {
  const patch = 'ciba_channel' in preferences ? { ciba_channel: settings.ciba_channel } : {};
  if (settings.timezone && settings.timezone !== (preferences.timezone || '')) {
    patch.timezone = settings.timezone;
  }
  if (settings.region !== (preferences.region || '')) {
    patch.region = settings.region || null;
  }
  if (!own) {
    patch.language = settings.language;
    patch.mode = settings.mode;
    patch.theme = settings.theme || null;
    patch.motion = settings.motion === 'auto' ? null : settings.motion;
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

const LanguageSelect = ({ own, languages, recordLanguage, onChange }) => {
  const { t, i18n } = useTranslation();
  return (
    <SelectField
      id="profile-preferences-language"
      label={t('profile.preferences.language')}
      hint={own ? t('profile.preferences.languageHint') : ''}
      value={own ? i18n.language : recordLanguage || i18n.language}
      onChange={event => onChange(event.target.value)}
    >
      {languages.map(code => (
        <option key={code} value={code}>
          {languageName(code)}
        </option>
      ))}
    </SelectField>
  );
};

LanguageSelect.propTypes = {
  own: PropTypes.bool.isRequired,
  languages: PropTypes.arrayOf(PropTypes.string).isRequired,
  recordLanguage: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ZoneSelect = ({ rules, zones, zone, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      id={rules.idFor('timezone')}
      label={t('profile.preferences.timezone')}
      hint={t('profile.preferences.timezoneHint')}
      error={rules.errors.timezone || ''}
      value={zone}
      onChange={event => onChange(event.target.value)}
      onBlur={() => rules.onBlur('timezone')}
    >
      {zones.includes(zone) ? null : <option value={zone}>{zone}</option>}
      {zones.map(name => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </SelectField>
  );
};

ZoneSelect.propTypes = {
  rules: PropTypes.object.isRequired,
  zones: PropTypes.arrayOf(PropTypes.string).isRequired,
  zone: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const RegionSelect = ({ rules, region, countries, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      id={rules.idFor('region')}
      label={t('profile.preferences.region')}
      hint={t('profile.preferences.regionHint')}
      error={rules.errors.region || ''}
      value={region}
      onChange={event => onChange(event.target.value)}
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
  );
};

RegionSelect.propTypes = {
  rules: PropTypes.object.isRequired,
  region: PropTypes.string.isRequired,
  countries: PropTypes.arrayOf(
    PropTypes.shape({ code: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};

const ChannelSelect = ({ rules, channel, smsAllowed, onChange }) => {
  const { t } = useTranslation();
  const hint = (
    <>
      {t('profile.preferences.channelHint')}
      {smsAllowed ? null : ` ${t('profile.preferences.channelSmsHint')}`}
    </>
  );
  return (
    <SelectField
      id={rules.idFor('ciba_channel')}
      label={t('profile.preferences.channel.label')}
      hint={hint}
      error={rules.errors.ciba_channel || ''}
      value={channel}
      onChange={event => onChange(event.target.value)}
      onBlur={() => rules.onBlur('ciba_channel')}
    >
      {CHANNELS.map(entry => (
        <option key={entry} value={entry} disabled={entry === 'SMS' && !smsAllowed}>
          {t(`profile.preferences.channel.${entry}`)}
        </option>
      ))}
    </SelectField>
  );
};

ChannelSelect.propTypes = {
  rules: PropTypes.object.isRequired,
  channel: PropTypes.string.isRequired,
  smsAllowed: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ModeSelect = ({ own, mode, recordMode, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      id="profile-preferences-mode"
      label={t('profile.preferences.mode.label')}
      hint={own ? t('profile.preferences.modeHint') : ''}
      value={own ? mode : recordMode}
      onChange={event => onChange(event.target.value)}
    >
      {MODES.map(value => (
        <option key={value} value={value}>
          {t(`profile.preferences.mode.${value}`)}
        </option>
      ))}
    </SelectField>
  );
};

ModeSelect.propTypes = {
  own: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
  recordMode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const MotionSelect = ({ own, motion, recordMotion, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      id="profile-preferences-motion"
      label={t('profile.preferences.motion.label')}
      hint={own ? t('profile.preferences.motionHint') : ''}
      value={own ? motion : recordMotion}
      onChange={event => onChange(event.target.value)}
    >
      {MOTION_VALUES.map(value => (
        <option key={value} value={value}>
          {t(`profile.preferences.motion.${value}`)}
        </option>
      ))}
    </SelectField>
  );
};

MotionSelect.propTypes = {
  own: PropTypes.bool.isRequired,
  motion: PropTypes.string.isRequired,
  recordMotion: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ThemeSelect = ({ own, theme, themes, recordTheme, onChange }) => {
  const { t } = useTranslation();
  return (
    <SelectField
      id="profile-preferences-theme"
      label={t('profile.preferences.theme.label')}
      hint={own ? t('profile.preferences.themeHint') : ''}
      value={own ? theme : recordTheme}
      onChange={event => onChange(event.target.value)}
    >
      <option value="">{t('profile.preferences.theme.follow')}</option>
      {themes.map(entry => (
        <option key={entry.name} value={entry.name}>
          {entry.label}
        </option>
      ))}
    </SelectField>
  );
};

ThemeSelect.propTypes = {
  own: PropTypes.bool.isRequired,
  theme: PropTypes.string.isRequired,
  themes: PropTypes.arrayOf(
    PropTypes.shape({ name: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  recordTheme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const themeName = (themes, name) => themes.find(theme => theme.name === name)?.label || name;

/**
 * The deploy target a `GET /api/user/deploy` answer carries, `local`
 * while it carries none.
 *
 * @param {Object|null|undefined} answer - The answer, `{ deploy_target }`
 * @returns {string} `local` or the origin
 */
export const deployChoiceOf = answer =>
  typeof answer?.deploy_target === 'string' && answer.deploy_target
    ? answer.deploy_target
    : LOCAL_TARGET;

/**
 * The values the deploy target select offers: `local`, the server's own
 * origin and, while the stored target is neither, that target too, so a
 * value the page cannot name is still the one shown.
 *
 * @param {string} target - The stored target
 * @param {string} origin - This server's origin
 * @returns {string[]} The values in the order drawn
 */
export const deployChoicesOf = (target, origin) => [
  LOCAL_TARGET,
  origin,
  ...(target === LOCAL_TARGET || target === origin ? [] : [target]),
];

const useDeployRow = deploy => {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    let active = true;
    deploy
      .read()
      .then(answer => {
        if (active) {
          setTarget(deployChoiceOf(answer));
        }
      })
      .catch(() => {
        if (active) {
          setTarget('');
        }
      });
    return () => {
      active = false;
    };
  }, [deploy]);
  return [target, setTarget];
};

const DeployTargetSelect = ({ deploy }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [target, setTarget] = useDeployRow(deploy);
  const values = useMemo(() => ({ [DEPLOY_TARGET]: target || LOCAL_TARGET }), [target]);
  const rules = useFormRules({
    formKey: 'deploy',
    schema: DEPLOY_SCHEMA,
    values,
    labels: DEPLOY_LABELS,
    idPrefix: 'profile-preferences',
  });
  const latest = useRef(rules);
  useLayoutEffect(() => {
    latest.current = rules;
  });
  if (!target) {
    return null;
  }
  const change = async value => {
    setTarget(value);
    try {
      await deploy.save({ [DEPLOY_TARGET]: value });
      latest.current.reset();
    } catch (error) {
      if (!latest.current.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };
  return (
    <SelectField
      id={rules.idFor(DEPLOY_TARGET)}
      label={t(DEPLOY_LABELS[DEPLOY_TARGET])}
      hint={t('integrations.hyperweaver.deployTargetHint')}
      error={rules.errors[DEPLOY_TARGET] || ''}
      value={target}
      onChange={event => change(event.target.value)}
      onBlur={() => rules.onBlur(DEPLOY_TARGET)}
    >
      {deployChoicesOf(target, window.location.origin).map(choice => (
        <option key={choice} value={choice}>
          {choice === LOCAL_TARGET ? t('integrations.hyperweaver.local') : choice}
        </option>
      ))}
    </SelectField>
  );
};

DeployTargetSelect.propTypes = {
  deploy: deployShape.isRequired,
};

const ReadOnlyPreferences = ({ account, profile, folds, after = null }) => {
  const { t, i18n } = useTranslation();
  const { mode, theme, themes } = useTheme();
  const { motion } = useMotion();
  const preferences = profile.preferences || {};
  const fields = [
    ['language', t('profile.preferences.language'), languageName(i18n.language)],
    ['mode', t('profile.preferences.mode.label'), t(`profile.preferences.mode.${mode}`)],
    ['motion', t('profile.preferences.motion.label'), t(`profile.preferences.motion.${motion}`)],
    ...(themes.length > 0
      ? [
          [
            'theme',
            t('profile.preferences.theme.label'),
            theme ? themeName(themes, theme) : t('profile.preferences.theme.follow'),
          ],
        ]
      : []),
    ...('timezone' in preferences
      ? [['timezone', t('profile.preferences.timezone'), preferences.timezone || detectedZone()]]
      : []),
    ...('region' in preferences
      ? [
          [
            'region',
            t('profile.preferences.region'),
            preferences.region || t('profile.preferences.regionNotSet'),
          ],
        ]
      : []),
  ];
  return (
    <div className="tab-pane fade show active">
      <SectionCard
        title={t('profile.preferences.general')}
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
          {account.deploy ? (
            <div className="col-md-3">
              <DeployTargetSelect deploy={account.deploy} />
            </div>
          ) : null}
        </div>
      </SectionCard>
      {after}
    </div>
  );
};

ReadOnlyPreferences.propTypes = {
  account: PropTypes.shape({ deploy: deployShape }).isRequired,
  profile: PropTypes.shape({ preferences: PropTypes.object }).isRequired,
  folds: PropTypes.shape({
    folded: PropTypes.func.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
  after: PropTypes.node,
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

const EditablePreferences = ({ account, profile, session, folds, onSaved, after = null }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { mode, setMode, theme, themes, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();
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

  const changeMode = value => {
    if (!own) {
      set('mode', value);
      return;
    }
    setMode(value);
  };

  const changeTheme = name => {
    if (!own) {
      set('theme', name);
      return;
    }
    setTheme(name);
  };

  const changeMotion = value => {
    if (!own) {
      set('motion', value);
      return;
    }
    setMotion(value);
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
  const zoneField = 'timezone' in preferences;
  const regionField = 'region' in preferences;
  const channelField = 'ciba_channel' in preferences;
  const pinField = own && 'ciba_user_code_set' in preferences;

  return (
    <div className="tab-pane fade show active">
      <SectionCard
        title={t('profile.preferences.general')}
        className="mb-0"
        folded={folds.folded('preferences')}
        onFold={() => folds.toggle('preferences')}
      >
        <form onSubmit={save} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-3">
              <LanguageSelect
                own={own}
                languages={languages}
                recordLanguage={settings.language}
                onChange={changeLanguage}
              />
            </div>
            <div className="col-md-3">
              <ModeSelect own={own} mode={mode} recordMode={settings.mode} onChange={changeMode} />
            </div>
            <div className="col-md-3">
              <MotionSelect
                own={own}
                motion={motion}
                recordMotion={settings.motion}
                onChange={changeMotion}
              />
            </div>
            {account.deploy ? (
              <div className="col-md-3">
                <DeployTargetSelect deploy={account.deploy} />
              </div>
            ) : null}
          </div>
          {themes.length > 0 || zoneField || regionField ? (
            <div className="row">
              {themes.length > 0 ? (
                <div className="col-md-3">
                  <ThemeSelect
                    own={own}
                    theme={theme}
                    themes={themes}
                    recordTheme={settings.theme}
                    onChange={changeTheme}
                  />
                </div>
              ) : null}
              {zoneField ? (
                <div className="col-md-3">
                  <ZoneSelect
                    rules={rules}
                    zones={zones}
                    zone={zone}
                    onChange={value => set('timezone', value)}
                  />
                </div>
              ) : null}
              {regionField ? (
                <div className="col-md-3">
                  <RegionSelect
                    rules={rules}
                    region={settings.region}
                    countries={countries}
                    onChange={value => set('region', value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {channelField || pinField ? (
            <div className="row">
              {channelField ? (
                <div className="col-md-6">
                  <ChannelSelect
                    rules={rules}
                    channel={settings.ciba_channel}
                    smsAllowed={smsAllowed}
                    onChange={value => set('ciba_channel', value)}
                  />
                </div>
              ) : null}
              {pinField ? (
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
          ) : null}
          <button type="submit" className="btn btn-primary" data-action="save-preferences">
            {t('profile.preferences.save')}
          </button>
        </form>
      </SectionCard>
      {after}
    </div>
  );
};

EditablePreferences.propTypes = {
  account: PropTypes.shape({ preferences: PropTypes.func.isRequired, deploy: deployShape })
    .isRequired,
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
  after: PropTypes.node,
};

const withError = (aria, errorId) =>
  errorId
    ? { ...aria, 'aria-invalid': true, 'aria-describedby': errorId, 'aria-errormessage': errorId }
    : aria;

const NoticeChannels = ({ rules, channels, onToggle }) => {
  const { t } = useTranslation();
  const groupId = rules.idFor(NOTICES_CHANNELS);
  const error = rules.errors[NOTICES_CHANNELS] || '';
  const errorId = error ? `${groupId}-error` : '';
  return (
    <div
      className={`field${error ? ' field-invalid' : ''} border-top pt-3`}
      role="group"
      aria-labelledby={`${groupId}-label`}
      data-panel="sign-in-notices-channels"
    >
      <div className="form-label" id={`${groupId}-label`}>
        {t(NOTICES_LABELS[NOTICES_CHANNELS])}
      </div>
      <div className="row">
        {NOTICE_CHANNELS.map((channel, index) => (
          <div key={channel} className="col-md-4">
            <Field
              id={index === 0 ? groupId : `${groupId}/${channel}`}
              label={t(`profile.preferences.signInNotices.channels.${channel}`)}
              className="mb-2"
            >
              {aria => (
                <div className="form-check form-switch">
                  <input
                    {...withError(aria, errorId)}
                    type="checkbox"
                    role="switch"
                    className="form-check-input"
                    checked={channels.includes(channel)}
                    onChange={() => onToggle(channel)}
                    data-channel={channel}
                  />
                </div>
              )}
            </Field>
          </div>
        ))}
      </div>
      <div className="mb-3">
        {error ? (
          <FieldError id={errorId} message={error} />
        ) : (
          <div className="form-text">{t('profile.preferences.signInNotices.channelsHint')}</div>
        )}
      </div>
    </div>
  );
};

NoticeChannels.propTypes = {
  rules: PropTypes.object.isRequired,
  channels: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
};

const useSignInNotices = ({ account, stored, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [draft, setDraft] = useState(() => ({ when: stored.when, channels: stored.channels }));
  const [busy, setBusy] = useState(false);
  const values = useMemo(() => ({ [NOTICES]: draft }), [draft]);
  const rules = useFormRules({
    formKey: 'preferences',
    schema: NOTICES_SCHEMA,
    values,
    labels: NOTICES_LABELS,
    idPrefix: 'profile-preferences',
  });

  const write = async patch => {
    setBusy(true);
    try {
      await account.preferences(patch);
      rules.reset();
      notify('success', t('profile.preferences.saved'));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    } finally {
      setBusy(false);
    }
  };

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return Promise.resolve();
    }
    const patch = signInNoticesPatch(draft, stored);
    if (!patch) {
      notify('success', t('profile.preferences.saved'));
      return Promise.resolve();
    }
    return write(patch);
  };

  const followDefault = () => write({ [NOTICES]: null });

  const setWhen = when => setDraft(current => ({ ...current, when }));

  const toggleChannel = channel =>
    setDraft(current => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter(entry => entry !== channel)
        : inOrder([...current.channels, channel]),
    }));

  return { draft, busy, rules, save, followDefault, setWhen, toggleChannel };
};

const SignInNoticesCard = ({ account, stored, folds, onSaved }) => {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const form = useSignInNotices({ account, stored, onSaved });
  const { draft, busy, rules } = form;
  const badge = stored.following ? (
    <span className="badge bg-secondary" data-badge="sign-in-notices-default">
      {t('profile.preferences.signInNotices.followingDefault')}
    </span>
  ) : null;
  const actions = stored.following ? null : (
    <button
      type="button"
      className="btn btn-sm btn-outline-warning"
      disabled={busy}
      onClick={() => setConfirming(true)}
      data-action="sign-in-notices-default"
    >
      {t('profile.preferences.signInNotices.useDefault')}
    </button>
  );

  return (
    <SectionCard
      title={t(NOTICES_LABELS[NOTICES])}
      badge={badge}
      actions={actions}
      className="mt-3 mb-0"
      folded={folds.folded('signInNotices')}
      onFold={() => folds.toggle('signInNotices')}
      id="sign-in-notices"
    >
      <div data-panel="sign-in-notices">
        <form onSubmit={form.save} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <div className="row">
            <div className="col-md-4">
              <SelectField
                id={rules.idFor(NOTICES_WHEN)}
                label={t(NOTICES_LABELS[NOTICES_WHEN])}
                hint={t('profile.preferences.signInNotices.whenHint')}
                error={rules.errors[NOTICES_WHEN] || ''}
                value={draft.when}
                onChange={event => form.setWhen(event.target.value)}
                onBlur={() => rules.onBlur(NOTICES_WHEN)}
              >
                {NOTICE_WHENS.map(when => (
                  <option key={when} value={when}>
                    {t(`profile.preferences.signInNotices.when.${when}`)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <NoticeChannels rules={rules} channels={draft.channels} onToggle={form.toggleChannel} />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            data-action="save-sign-in-notices"
          >
            {t('profile.preferences.save')}
          </button>
        </form>
        <ConfirmModal
          show={confirming}
          handleClose={() => setConfirming(false)}
          handleConfirm={form.followDefault}
          title={t('profile.preferences.signInNotices.useDefaultTitle')}
          message={t('profile.preferences.signInNotices.useDefaultBody')}
          variant="restart"
          typed={false}
          confirmText={t('profile.preferences.signInNotices.useDefault')}
        />
      </div>
    </SectionCard>
  );
};

SignInNoticesCard.propTypes = {
  account: PropTypes.shape({ preferences: PropTypes.func.isRequired }).isRequired,
  stored: PropTypes.shape({
    when: PropTypes.string.isRequired,
    channels: PropTypes.arrayOf(PropTypes.string).isRequired,
    following: PropTypes.bool.isRequired,
  }).isRequired,
  folds: PropTypes.shape({
    folded: PropTypes.func.isRequired,
    toggle: PropTypes.func.isRequired,
  }).isRequired,
  onSaved: PropTypes.func.isRequired,
};

/**
 * The Preferences section of the identity contract at
 * `/user/profile/preferences`, one `SectionCard` titled General, the
 * crumb and the row already saying Preferences and every card a feature
 * adds under it named for that feature, whose
 * fold is kept under `table_prefs_profile_preferences`: language, mode
 * and motion on one row, each a select that writes through on change,
 * language and mode the same values the chrome's controls write through
 * the shared `useTheme` and the shared `i18n`, the mode select offering
 * Light, Dark and OS, the operating system's scheme, and motion the
 * person's own reduced-motion switch through the shared `useMotion`,
 * "Follow this device" or "Reduced", following saved as a cleared value;
 * on the next row a Theme select while the host offers themes, "Follow
 * this site" or one of them, writing through on change as the mode does,
 * the theme following saved as a cleared value, the time zone from the `Intl` list
 * with the detected zone preselected while none is set, and region as a
 * select of the two-letter country list plus `EU`, `EEA` and `UK`, the
 * legal region the terms and policy variants resolve to, blank clearing
 * it; on the next row the sign-in approval channel
 * (SMS disabled with a hint while no verified number exists, the stored
 * value kept selected) and the approval PIN as one input with its own Set
 * and Clear buttons beside it, "A PIN is set" drawn as muted text above the
 * field while one is stored; time zone, region, channel and PIN saved together by
 * one Save preferences through `PATCH /api/user/preferences`, the time
 * zone and the region in the patch only when they differ from the stored
 * value, so a detected preselection is never written, while the rules
 * evaluate the zone and region the selects hold; the page remounts it
 * with every re-read of the record. The time zone, the region, the
 * approval channel and the PIN each draw only while the record's
 * `preferences` carries its member, `timezone`, `region`, `ciba_channel`
 * and `ciba_user_code_set`, because a control the host stores nothing
 * for writes nowhere: the identity provider's record carries every one,
 * an `apikey` host's record the time zone alone and a `backend` host's
 * local account none, its section the language, mode, theme and motion
 * alone. While the adapter carries `deploy`, the `hyperweaver-server`
 * role's own row for every session, the deploy target draws beside them
 * on the first row, read once from `GET /api/user/deploy`, a select of
 * `local`, this server's origin and the stored value while it is neither,
 * written through on change as `PATCH /api/user/deploy` under the host's
 * `deploy` rules form, a `422` at `/deploy_target` painted on the field
 * and any other refusal a danger notice, nothing drawn while the read
 * fails. While `readOnly`, the record an
 * identity provider owns, the language, mode, motion and theme, and the
 * time zone and region while the record carries them, draw as `readonly`
 * fields in the same card with the Manage
 * at identity provider link as its action, the approval channel and PIN
 * being the issuer's own and not drawn, the deploy target still the
 * editable select because the row is the host's own and not the
 * provider's. Without a `session`, the record
 * another person's on the admin record page, language, mode, theme and
 * motion are the record's own values saved with the rest through
 * `account.preferences` and never the viewer's chrome, and the PIN is not
 * drawn because the admin route takes none. Under the General card,
 * while the record's `preferences` carry `sign_in_notices` and the tab is
 * not `readOnly`, the Sign-in notices card draws, its fold under the same
 * key, one form with one Save preferences at its foot: when a notice is
 * sent as a select of `off`, `new` and `all`, the `email`, `inbox` and
 * `push` channels as three switches, the badge "Following the site's
 * default" while the member's `default` is true and, while it is not, Use
 * the site's default in the card's heading behind a plain confirmation,
 * which sends `"sign_in_notices": null`; Save sends `when` and `channels`
 * where each differs from the record, never `default`, through
 * `account.preferences`, and sends nothing while neither differs, the
 * saved notice drawn all the same, and a `422` is painted on the
 * control its pointer names, `/sign_in_notices/when` on the select,
 * `/sign_in_notices/channels` on the switches and `/sign_in_notices` in
 * the card's summary. Under that card,
 * while the adapter carries `integrations` and the record carries the
 * `integrations` rows the issuer answers for a person who connected a
 * service, the Hyperweaver card draws over its `hyperweaver` row, its
 * writes reading the record again the way the preferences write does,
 * read-only under the same rule as the rest of the tab; under that, the
 * `extra` node the host's features hand the page, the certs feature's
 * Certificates card while the host lists `certs`, a browser preference
 * drawn editable under a read-only record too.
 */
const PreferencesTab = ({ account, profile, readOnly, onSaved, session = null, extra = null }) => {
  const folds = useFolds(PREFS_KEY);
  const hyperweaver =
    account.integrations && Array.isArray(profile.integrations) ? (
      <HyperweaverServiceCard
        integrations={account.integrations}
        service={hyperweaverServiceOf(profile.integrations)}
        readOnly={readOnly}
        onSaved={onSaved}
        className="mt-3 mb-0"
      />
    ) : null;
  const notices = readOnly ? null : signInNoticesOf(profile.preferences);
  const signInNotices = notices ? (
    <SignInNoticesCard account={account} stored={notices} folds={folds} onSaved={onSaved} />
  ) : null;
  const after =
    signInNotices || hyperweaver || extra ? (
      <>
        {signInNotices}
        {hyperweaver}
        {extra}
      </>
    ) : null;
  if (readOnly) {
    return <ReadOnlyPreferences account={account} profile={profile} folds={folds} after={after} />;
  }
  return (
    <EditablePreferences
      account={account}
      profile={profile}
      session={session}
      folds={folds}
      onSaved={onSaved}
      after={after}
    />
  );
};

PreferencesTab.propTypes = {
  account: PropTypes.shape({
    preferences: PropTypes.func,
    integrations: integrationsShape,
    deploy: deployShape,
  }).isRequired,
  profile: PropTypes.shape({
    preferences: PropTypes.object,
    integrations: PropTypes.array,
    mobile_number: PropTypes.shape({ verified: PropTypes.bool }),
  }).isRequired,
  session: PropTypes.shape({ savePreferences: PropTypes.func.isRequired }),
  readOnly: PropTypes.bool.isRequired,
  onSaved: PropTypes.func.isRequired,
  extra: PropTypes.node,
};

export default PreferencesTab;
