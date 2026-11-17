import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import Tiles from '../../../components/common/Tiles';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { MOTION_VALUES, useMotion } from '../../../hooks/useMotion';
import { useTheme } from '../../../hooks/useTheme';
import { loadCountries } from '../../../lib/countries';
import { detectedHourCycle, detectedLocale, detectedZone } from '../../../utils/browserFacts';
import { hasFeature } from '../../../utils/capabilities';
import {
  HyperweaverServiceCard,
  hyperweaverServiceOf,
  integrationsShape,
} from '../../integrations';

import ManageLink from './ManageLink';

const PREFS_KEY = 'table_prefs_profile_preferences';
const MODES = ['auto', 'light', 'dark'];
const CHANNELS = ['in_app', 'push', 'email', 'sms'];
const DEFAULT_CHANNELS = ['in_app'];
const REGION_SETS = ['EU', 'EEA', 'UK'];
const HOUR_CYCLES = ['h12', 'h23'];
const NOTICE_WHENS = ['off', 'new', 'all'];
const NOTICE_DEFAULT = 'default';
const NOTICE_CHANNELS = ['email', 'in_app', 'push'];
const NOTICES = 'sign_in_notices';
const NOTICES_WHEN = `${NOTICES}/when`;
const NOTICES_CHANNELS = `${NOTICES}/channels`;
const CLOCK_MEMBERS = ['timezone', 'locale', 'hour_cycle'];
const SWATCH_VARS = {
  'body-bg': '--pref-page',
  'tertiary-bg': '--pref-bar',
  'border-color': '--pref-line',
  'secondary-color': '--pref-text',
};
const MEMBER_SCHEMAS = {
  timezone: { $ref: '#/$defs/timezone' },
  locale: { $ref: '#/$defs/languageTag' },
  hour_cycle: { type: 'string', enum: HOUR_CYCLES },
  region: { $ref: '#/$defs/region' },
  ciba_channels: { type: 'array', items: { type: 'string', enum: CHANNELS } },
  [NOTICES]: {
    type: 'object',
    properties: {
      when: { type: 'string', enum: NOTICE_WHENS },
      channels: { type: 'array', items: { type: 'string', enum: NOTICE_CHANNELS } },
    },
  },
};
const ALWAYS_MEMBERS = ['timezone', 'locale', 'hour_cycle', 'region'];
const CARRIED_MEMBERS = ['ciba_channels', NOTICES];

const schemaFor = (preferences, own) => ({
  properties: {
    ...Object.fromEntries(ALWAYS_MEMBERS.map(member => [member, MEMBER_SCHEMAS[member]])),
    ...Object.fromEntries(
      CARRIED_MEMBERS.filter(member => member in preferences).map(member => [
        member,
        MEMBER_SCHEMAS[member],
      ])
    ),
    ...(own ? { ciba_user_code: { type: 'string' } } : {}),
  },
});
const LABELS = {
  timezone: 'profile.preferences.timezone',
  locale: 'profile.preferences.locale',
  hour_cycle: 'profile.preferences.hourCycle.label',
  region: 'profile.preferences.region',
  ciba_channels: 'profile.preferences.channel.label',
  ciba_user_code: 'profile.preferences.pin',
  [NOTICES]: 'profile.preferences.signInNotices.title',
  [NOTICES_WHEN]: 'profile.preferences.signInNotices.when.label',
  [NOTICES_CHANNELS]: 'profile.preferences.signInNotices.channels.label',
};
const LOCAL_TARGET = 'local';
const DEPLOY_TARGET = 'deploy_target';
const DEPLOY_SCHEMA = { properties: { [DEPLOY_TARGET]: { type: 'string' } } };
const DEPLOY_LABELS = { [DEPLOY_TARGET]: 'integrations.hyperweaver.deployTarget' };
const deployShape = PropTypes.shape({
  read: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
});

const inOrder = (order, list) => order.filter(word => list.includes(word));

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
    channels: inOrder(NOTICE_CHANNELS, notices.channels || []),
    following: notices.default === true,
  };
};

/**
 * The preferences patch that saves the sign-in notices: `when` and
 * `channels` where each differs from the record, never `default`.
 *
 * @param {{ when: string, channels: string[] }} draft - The page's choice
 * @param {{ when: string, channels: string[] }} stored - The record's setting
 * @returns {{ sign_in_notices: { when?: string, channels?: string[] } }|null} The patch, null while nothing differs
 */
export const signInNoticesPatch = (draft, stored) => {
  const channels = inOrder(NOTICE_CHANNELS, draft.channels);
  const changed = {
    ...(draft.when === stored.when ? {} : { when: draft.when }),
    ...(channels.join() === inOrder(NOTICE_CHANNELS, stored.channels).join() ? {} : { channels }),
  };
  return Object.keys(changed).length > 0 ? { [NOTICES]: changed } : null;
};

/**
 * The preferences patch of the sign-in notices tiles: `default` picked
 * sends `sign_in_notices: null` unless the record already follows the
 * site; a choice over a following record sends `when` and `channels`
 * whole, because the record's values are the site's and not the person's;
 * a choice over a chosen record sends what differs.
 *
 * @param {{ when: string, channels: string[] }} choice - The tiles' state, `when` `default` or one of the three
 * @param {{ when: string, channels: string[], following: boolean }} stored - The record's setting
 * @returns {Object|null} The patch, null while nothing is to be sent
 */
export const noticesPatchOf = (choice, stored) => {
  if (choice.when === NOTICE_DEFAULT) {
    return stored.following ? null : { [NOTICES]: null };
  }
  if (stored.following) {
    return { [NOTICES]: { when: choice.when, channels: inOrder(NOTICE_CHANNELS, choice.channels) } };
  }
  return signInNoticesPatch(choice, stored);
};

/**
 * The preferences patch of the approval channel tiles, `ciba_channels`
 * in the drawn order while the set differs from the record's.
 *
 * @param {string[]} chosen - The picked channels
 * @param {string[]} held - The record's channels
 * @returns {{ ciba_channels: string[] }|null} The patch, null while equal
 */
export const channelsPatchOf = (chosen, held) => {
  const next = inOrder(CHANNELS, chosen);
  return next.join() === inOrder(CHANNELS, held).join() ? null : { ciba_channels: next };
};

/**
 * The CSS custom properties a Theme card paints its preview with, from
 * the manifest row's `primary` and the `surfaces` of the mode in force;
 * null while the row carries neither, so the card draws its name alone.
 *
 * @param {{ primary?: string, surfaces?: Object }} theme - The offered theme's row
 * @param {string} resolved - `light` or `dark`
 * @returns {Object|null} The properties, `--pref-accent`, `--pref-page`, `--pref-bar`, `--pref-line` and `--pref-text`
 */
export const themeSwatchOf = (theme, resolved) => {
  const surfaces = theme?.surfaces?.[resolved];
  if (!theme?.primary || !surfaces) {
    return null;
  }
  return {
    '--pref-accent': theme.primary,
    ...Object.fromEntries(
      Object.entries(SWATCH_VARS)
        .filter(([key]) => surfaces[key])
        .map(([key, name]) => [name, surfaces[key]])
    ),
  };
};

const timeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
};

const languageName = code => {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

const localeName = (code, language) => {
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

/**
 * The locales the Locale select offers: the chosen one, the detected one
 * and every language the UI ships, each once, the empty entries dropped.
 *
 * @param {string} chosen - The locale the record or the person holds
 * @param {string} detected - The browser's locale
 * @param {string[]} languages - The UI's supported languages
 * @returns {string[]} The locales in the order drawn
 */
export const localeChoicesOf = (chosen, detected, languages) => [
  ...new Set([chosen, detected, ...languages].filter(Boolean)),
];

const noticesChoiceOf = stored =>
  stored
    ? { when: stored.following ? NOTICE_DEFAULT : stored.when, channels: stored.channels }
    : null;

const settingsOf = preferences => ({
  language: preferences?.language || '',
  mode: preferences?.mode || 'auto',
  theme: preferences?.theme || '',
  motion: preferences?.motion || 'auto',
  timezone: preferences?.timezone || '',
  locale: preferences?.locale || '',
  hour_cycle: preferences?.hour_cycle || '',
  region: preferences?.region || '',
  ciba_channels: Array.isArray(preferences?.ciba_channels)
    ? inOrder(CHANNELS, preferences.ciba_channels)
    : DEFAULT_CHANNELS,
  notices: noticesChoiceOf(signInNoticesOf(preferences)),
});

const clockPatch = (settings, preferences) =>
  Object.fromEntries(
    CLOCK_MEMBERS.filter(
      member => settings[member] && settings[member] !== (preferences[member] || '')
    ).map(member => [member, settings[member]])
  );

/**
 * The one PATCH the General card's Save sends: the time zone, the locale
 * and the hour cycle where each differs from the record, the region where
 * it differs, `null` clearing it, `ciba_channels` where the set differs,
 * the sign-in notices as `noticesPatchOf` answers, the PIN while typed
 * or cleared on the person's own record, and on another's record the
 * language, mode, theme and motion too; empty while nothing differs.
 *
 * @param {Object} options - The form
 * @param {Object} options.settings - The form's state from `settingsOf` and the tiles
 * @param {Object} options.preferences - The record's `preferences`
 * @param {string} options.pin - The typed PIN
 * @param {boolean} options.clearPin - Whether Clear was pressed
 * @param {boolean} options.own - Whether the record is the viewer's own
 * @returns {Object} The patch
 */
export const preferencesPatch = ({ settings, preferences, pin, clearPin, own }) => {
  const patch = clockPatch(settings, preferences);
  if (settings.region !== (preferences.region || '')) {
    patch.region = settings.region || null;
  }
  if ('ciba_channels' in preferences) {
    const held = Array.isArray(preferences.ciba_channels)
      ? preferences.ciba_channels
      : DEFAULT_CHANNELS;
    Object.assign(patch, channelsPatchOf(settings.ciba_channels, held) || {});
  }
  const stored = signInNoticesOf(preferences);
  if (stored && settings.notices) {
    Object.assign(patch, noticesPatchOf(settings.notices, stored) || {});
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

const channelOff = (status, word, smsAllowed) =>
  !hasFeature(status, 'notifications', word) || (word === 'sms' && !smsAllowed);

const Section = ({ id = undefined, title, lead = '', badge = null, children }) => (
  <div className="pref-section" id={id}>
    <div className="pref-section-head">
      <h3 className="pref-section-title">
        {title}
        {badge}
      </h3>
      {lead ? <p className="pref-section-lead">{lead}</p> : null}
    </div>
    <div className="pref-section-body">{children}</div>
  </div>
);

Section.propTypes = {
  id: PropTypes.string,
  title: PropTypes.node.isRequired,
  lead: PropTypes.node,
  badge: PropTypes.node,
  children: PropTypes.node.isRequired,
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

const ModeGlyph = ({ mode }) => (
  <span className={`pref-glyph pref-glyph-${mode}`} aria-hidden>
    <span className="pref-glyph-bar" />
    <span className="pref-glyph-page" />
  </span>
);

ModeGlyph.propTypes = {
  mode: PropTypes.oneOf(MODES).isRequired,
};

const MotionGlyph = () => (
  <span className="pref-glyph pref-glyph-dark pref-glyph-motion" aria-hidden>
    <span className="pref-glyph-bar">
      <span className="pref-spin" />
    </span>
    <span className="pref-glyph-page" />
    <span className="pref-toast" />
  </span>
);

const ThemeSwatch = ({ swatch }) => (
  <span className={`pref-swatch${swatch ? '' : ' pref-swatch-plain'}`} style={swatch || undefined}>
    <span className="pref-swatch-bar">
      <span className="pref-swatch-mark" />
    </span>
    <span className="pref-swatch-page">
      <i />
      <i />
      <i />
      <span className="pref-swatch-btn" />
    </span>
  </span>
);

ThemeSwatch.propTypes = {
  swatch: PropTypes.object,
};

const FollowSwatch = () => <span className="pref-swatch pref-swatch-follow" aria-hidden />;

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

const LocaleSelect = ({ rules, locales, locale, onChange }) => {
  const { t, i18n } = useTranslation();
  return (
    <SelectField
      id={rules.idFor('locale')}
      label={t('profile.preferences.locale')}
      hint={t('profile.preferences.localeHint')}
      error={rules.errors.locale || ''}
      value={locale}
      onChange={event => onChange(event.target.value)}
      onBlur={() => rules.onBlur('locale')}
    >
      {locales.map(code => (
        <option key={code} value={code}>
          {localeName(code, i18n.language)}
        </option>
      ))}
    </SelectField>
  );
};

LocaleSelect.propTypes = {
  rules: PropTypes.object.isRequired,
  locales: PropTypes.arrayOf(PropTypes.string).isRequired,
  locale: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const HourCycleTiles = ({ rules, hourCycle, onChange }) => {
  const { t } = useTranslation();
  return (
    <Tiles
      id={rules.idFor('hour_cycle')}
      label={t('profile.preferences.hourCycle.label')}
      hint={t('profile.preferences.hourCycleHint')}
      error={rules.errors.hour_cycle || ''}
      className="pref-tiles-seg"
      options={HOUR_CYCLES.map(cycle => ({
        value: cycle,
        label: t(`profile.preferences.hourCycle.${cycle}`),
      }))}
      value={hourCycle}
      onChange={onChange}
      onBlur={() => rules.onBlur('hour_cycle')}
    />
  );
};

HourCycleTiles.propTypes = {
  rules: PropTypes.object.isRequired,
  hourCycle: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const hourCycleText = (value, t) => t(`profile.preferences.hourCycle.${value}`);

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

const toggled = (list, word) =>
  list.includes(word) ? list.filter(entry => entry !== word) : [...list, word];

const ChannelTiles = ({ rules, channels, smsAllowed, onChange }) => {
  const { t } = useTranslation();
  const status = useStatus();
  return (
    <Tiles
      id={rules.idFor('ciba_channels')}
      label={t('profile.preferences.channel.label')}
      hint={t('profile.preferences.channelHint')}
      error={rules.errors.ciba_channels || ''}
      multi
      className="pref-tiles-words"
      options={CHANNELS.map(word => ({
        value: word,
        label: t(`profile.preferences.channel.${word}`),
        disabled: channelOff(status, word, smsAllowed),
        title: channelOff(status, word, smsAllowed)
          ? t(`profile.preferences.channelOff.${word}`)
          : '',
      }))}
      value={channels}
      onChange={word => onChange(inOrder(CHANNELS, toggled(channels, word)))}
      onBlur={() => rules.onBlur('ciba_channels')}
    />
  );
};

ChannelTiles.propTypes = {
  rules: PropTypes.object.isRequired,
  channels: PropTypes.arrayOf(PropTypes.string).isRequired,
  smsAllowed: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ModeTiles = ({ mode, onChange, hint }) => {
  const { t } = useTranslation();
  return (
    <Tiles
      id="profile-preferences-mode"
      label={t('profile.preferences.mode.label')}
      hint={hint}
      className="pref-tiles-cards"
      options={MODES.map(value => ({
        value,
        label: t(`profile.preferences.mode.${value}`),
        glyph: <ModeGlyph mode={value} />,
      }))}
      value={mode}
      onChange={onChange}
    />
  );
};

ModeTiles.propTypes = {
  mode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string.isRequired,
};

const MotionTiles = ({ motion, onChange, hint }) => {
  const { t } = useTranslation();
  return (
    <Tiles
      id="profile-preferences-motion"
      label={t('profile.preferences.motion.label')}
      hint={hint}
      className="pref-tiles-cards"
      options={MOTION_VALUES.map(value => ({
        value,
        label: t(`profile.preferences.motion.${value}`),
        glyph: <MotionGlyph />,
        className: value === 'auto' ? 'pref-motion-full' : '',
      }))}
      value={motion}
      onChange={onChange}
    />
  );
};

MotionTiles.propTypes = {
  motion: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string.isRequired,
};

const ThemeTiles = ({ theme, themes, resolved, onChange, hint }) => {
  const { t } = useTranslation();
  return (
    <Tiles
      id="profile-preferences-theme"
      label={t('profile.preferences.theme.label')}
      hint={hint}
      className="pref-tiles-cards pref-tiles-themes"
      options={[
        { value: '', label: t('profile.preferences.theme.follow'), glyph: <FollowSwatch /> },
        ...themes.map(entry => ({
          value: entry.name,
          label: entry.label,
          glyph: <ThemeSwatch swatch={themeSwatchOf(entry, resolved)} />,
        })),
      ]}
      value={theme}
      onChange={onChange}
    />
  );
};

ThemeTiles.propTypes = {
  theme: PropTypes.string.isRequired,
  themes: PropTypes.arrayOf(
    PropTypes.shape({ name: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  resolved: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  hint: PropTypes.string.isRequired,
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

const DeploySection = ({ deploy }) => {
  const { t } = useTranslation();
  return (
    <Section
      title={t('profile.preferences.sections.deploy.title')}
      lead={t('integrations.hyperweaver.deployTargetHint')}
    >
      <div className="row">
        <div className="col-md-4">
          <DeployTargetSelect deploy={deploy} />
        </div>
      </div>
    </Section>
  );
};

DeploySection.propTypes = {
  deploy: deployShape.isRequired,
};

const readOnlyRows = ({ preferences, mode, motion, theme, themes, t, i18n }) => [
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
  ...('locale' in preferences
    ? [
        [
          'locale',
          t('profile.preferences.locale'),
          localeName(preferences.locale || detectedLocale(), i18n.language),
        ],
      ]
    : []),
  ...('hour_cycle' in preferences
    ? [
        [
          'hour_cycle',
          t('profile.preferences.hourCycle.label'),
          hourCycleText(preferences.hour_cycle || detectedHourCycle(), t),
        ],
      ]
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

const ReadOnlyPreferences = ({ account, profile, folds, after = null }) => {
  const { t, i18n } = useTranslation();
  const { mode, theme, themes } = useTheme();
  const { motion } = useMotion();
  const preferences = profile.preferences || {};
  const rows = readOnlyRows({ preferences, mode, motion, theme, themes, t, i18n });
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
          {rows.map(([key, label, value]) => (
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

const AppearanceSection = ({ own, settings, onMode, onMotion, onTheme }) => {
  const { t } = useTranslation();
  const { mode, resolved, theme, themes } = useTheme();
  const { motion } = useMotion();
  return (
    <Section
      title={t('profile.preferences.sections.appearance.title')}
      lead={t('profile.preferences.sections.appearance.lead')}
    >
      <div className="pref-side">
        <ModeTiles
          mode={own ? mode : settings.mode}
          onChange={onMode}
          hint={own ? t('profile.preferences.modeHint') : ''}
        />
        <MotionTiles
          motion={own ? motion : settings.motion}
          onChange={onMotion}
          hint={own ? t('profile.preferences.motionHint') : ''}
        />
      </div>
      {themes.length > 0 ? (
        <ThemeTiles
          theme={own ? theme : settings.theme}
          themes={themes}
          resolved={resolved}
          onChange={onTheme}
          hint={own ? t('profile.preferences.themeHint') : ''}
        />
      ) : null}
    </Section>
  );
};

AppearanceSection.propTypes = {
  own: PropTypes.bool.isRequired,
  settings: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    motion: PropTypes.string.isRequired,
    theme: PropTypes.string.isRequired,
  }).isRequired,
  onMode: PropTypes.func.isRequired,
  onMotion: PropTypes.func.isRequired,
  onTheme: PropTypes.func.isRequired,
};

const LanguageSection = ({ own, languages, settings, rules, clock, lists, onLanguage, onSet }) => {
  const { t } = useTranslation();
  const fields = {
    timezone: 'timezone' in settings.preferences,
    locale: 'locale' in settings.preferences,
    hour_cycle: 'hour_cycle' in settings.preferences,
    region: 'region' in settings.preferences,
  };
  return (
    <Section
      title={t('profile.preferences.sections.languageTime.title')}
      lead={t('profile.preferences.sections.languageTime.lead')}
    >
      <div className="row">
        <div className="col-md-4">
          <LanguageSelect
            own={own}
            languages={languages}
            recordLanguage={settings.language}
            onChange={onLanguage}
          />
        </div>
        {fields.timezone ? (
          <div className="col-md-4">
            <ZoneSelect
              rules={rules}
              zones={lists.zones}
              zone={clock.zone}
              onChange={value => onSet('timezone', value)}
            />
          </div>
        ) : null}
        {fields.region ? (
          <div className="col-md-4">
            <RegionSelect
              rules={rules}
              region={settings.region}
              countries={lists.countries}
              onChange={value => onSet('region', value)}
            />
          </div>
        ) : null}
        {fields.locale ? (
          <div className="col-md-4">
            <LocaleSelect
              rules={rules}
              locales={lists.locales}
              locale={clock.locale}
              onChange={value => onSet('locale', value)}
            />
          </div>
        ) : null}
        {fields.hour_cycle ? (
          <div className="col-md-4">
            <HourCycleTiles
              rules={rules}
              hourCycle={clock.hourCycle}
              onChange={value => onSet('hour_cycle', value)}
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
};

LanguageSection.propTypes = {
  own: PropTypes.bool.isRequired,
  languages: PropTypes.arrayOf(PropTypes.string).isRequired,
  settings: PropTypes.shape({
    preferences: PropTypes.object.isRequired,
    language: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
  }).isRequired,
  rules: PropTypes.object.isRequired,
  clock: PropTypes.shape({
    zone: PropTypes.string.isRequired,
    locale: PropTypes.string.isRequired,
    hourCycle: PropTypes.string.isRequired,
  }).isRequired,
  lists: PropTypes.shape({
    zones: PropTypes.arrayOf(PropTypes.string).isRequired,
    locales: PropTypes.arrayOf(PropTypes.string).isRequired,
    countries: PropTypes.array.isRequired,
  }).isRequired,
  onLanguage: PropTypes.func.isRequired,
  onSet: PropTypes.func.isRequired,
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

const ApprovalSection = ({ rules, channels, smsAllowed, onChannels, pin }) => {
  const { t } = useTranslation();
  return (
    <Section
      title={t('profile.preferences.sections.approval.title')}
      lead={t('profile.preferences.sections.approval.lead')}
    >
      <ChannelTiles
        rules={rules}
        channels={channels}
        smsAllowed={smsAllowed}
        onChange={onChannels}
      />
      {pin ? (
        <div className="row">
          <div className="col-md-6">
            <PinField rules={rules} {...pin} />
          </div>
        </div>
      ) : null}
    </Section>
  );
};

ApprovalSection.propTypes = {
  rules: PropTypes.object.isRequired,
  channels: PropTypes.arrayOf(PropTypes.string).isRequired,
  smsAllowed: PropTypes.bool.isRequired,
  onChannels: PropTypes.func.isRequired,
  pin: PropTypes.shape({
    pin: PropTypes.string.isRequired,
    pinSet: PropTypes.bool.isRequired,
    pinRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
    onPin: PropTypes.func.isRequired,
    onSet: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
  }),
};

const NoticesSection = ({ rules, notices, following, onWhen, onChannels }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const badge = following ? (
    <span className="badge bg-secondary ms-2" data-badge="sign-in-notices-default">
      {t('profile.preferences.signInNotices.followingDefault')}
    </span>
  ) : null;
  return (
    <Section
      id="sign-in-notices"
      title={t('profile.preferences.signInNotices.title')}
      lead={t('profile.preferences.signInNotices.lead')}
      badge={badge}
    >
      <Tiles
        id={rules.idFor(NOTICES_WHEN)}
        label={t('profile.preferences.signInNotices.when.label')}
        hint={t(`profile.preferences.signInNotices.whenHint.${notices.when}`)}
        error={rules.errors[NOTICES_WHEN] || ''}
        className="pref-tiles-words"
        options={[...NOTICE_WHENS, NOTICE_DEFAULT].map(when => ({
          value: when,
          label: t(`profile.preferences.signInNotices.when.${when}`),
        }))}
        value={notices.when}
        onChange={onWhen}
        onBlur={() => rules.onBlur(NOTICES_WHEN)}
      />
      <Tiles
        id={rules.idFor(NOTICES_CHANNELS)}
        label={t('profile.preferences.signInNotices.channels.label')}
        hint={t('profile.preferences.signInNotices.channelsHint')}
        error={rules.errors[NOTICES_CHANNELS] || ''}
        multi
        dim={notices.when === NOTICE_DEFAULT}
        className="pref-tiles-words"
        options={NOTICE_CHANNELS.map(channel => ({
          value: channel,
          label: t(`profile.preferences.signInNotices.channels.${channel}`),
          disabled: !hasFeature(status, 'notifications', channel),
          title: hasFeature(status, 'notifications', channel)
            ? ''
            : t(`profile.preferences.channelOff.${channel}`),
        }))}
        value={notices.channels}
        onChange={channel => onChannels(inOrder(NOTICE_CHANNELS, toggled(notices.channels, channel)))}
        onBlur={() => rules.onBlur(NOTICES_CHANNELS)}
      />
    </Section>
  );
};

NoticesSection.propTypes = {
  rules: PropTypes.object.isRequired,
  notices: PropTypes.shape({
    when: PropTypes.string.isRequired,
    channels: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  following: PropTypes.bool.isRequired,
  onWhen: PropTypes.func.isRequired,
  onChannels: PropTypes.func.isRequired,
};

const useCountries = language => {
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    let active = true;
    loadCountries(language)
      .then(list => {
        if (active) {
          setCountries(list);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [language]);
  return countries;
};

const noticeValues = (notices, stored) => {
  if (!notices || !stored) {
    return {};
  }
  const chosen = notices.when === NOTICE_DEFAULT ? stored : notices;
  return { [NOTICES]: { when: chosen.when, channels: chosen.channels } };
};

const usePreferencesForm = ({ profile, own, languages }) => {
  const preferences = profile.preferences || {};
  const stored = signInNoticesOf(preferences);
  const schema = useMemo(() => schemaFor(preferences, own), [preferences, own]);
  const [settings, setSettings] = useState(() => settingsOf(preferences));
  const [pin, setPin] = useState('');
  const [clearPin, setClearPin] = useState(false);
  const zones = useMemo(() => timeZones(), []);
  const [detected] = useState(() => ({
    zone: detectedZone(),
    locale: detectedLocale(),
    hourCycle: detectedHourCycle(),
  }));
  const clock = {
    zone: settings.timezone || detected.zone,
    locale: settings.locale || detected.locale,
    hourCycle: settings.hour_cycle || detected.hourCycle,
  };
  const locales = useMemo(
    () => localeChoicesOf(clock.locale, detected.locale, languages),
    [clock.locale, detected.locale, languages]
  );
  const values = useMemo(
    () => ({
      timezone: clock.zone,
      locale: clock.locale,
      hour_cycle: clock.hourCycle,
      region: settings.region,
      ciba_channels: settings.ciba_channels,
      ...noticeValues(settings.notices, stored),
      ...(own ? { ciba_user_code: pin } : {}),
    }),
    [clock.zone, clock.locale, clock.hourCycle, settings, stored, pin, own]
  );
  const rules = useFormRules({
    formKey: 'preferences',
    schema,
    values,
    labels: LABELS,
    idPrefix: 'profile-preferences',
  });
  const set = (field, value) => setSettings(previous => ({ ...previous, [field]: value }));
  const setNotices = part => set('notices', { ...settings.notices, ...part });
  return {
    preferences,
    settings,
    set,
    setNotices,
    pin,
    setPin,
    clearPin,
    setClearPin,
    zones,
    locales,
    clock,
    rules,
  };
};

const useChromeWrites = ({ own, session, set }) => {
  const { i18n } = useTranslation();
  const { setMode, setTheme } = useTheme();
  const { setMotion } = useMotion();
  const through = (field, write) => value => {
    if (!own) {
      set(field, value);
      return;
    }
    write(value);
  };
  return {
    changeLanguage: through('language', async language => {
      session.savePreferences({ language });
      await i18n.changeLanguage(language);
    }),
    changeMode: through('mode', setMode),
    changeTheme: through('theme', setTheme),
    changeMotion: through('motion', setMotion),
  };
};

const EditablePreferences = ({ account, profile, session, folds, onSaved, after = null }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const own = session !== null;
  const languages = supportedLanguages(i18n);
  const form = usePreferencesForm({ profile, own, languages });
  const { preferences, settings, set, rules, pin, clearPin } = form;
  const writes = useChromeWrites({ own, session, set });
  const pinRef = useRef(null);
  const countries = useCountries(i18n.language);
  const smsAllowed = Boolean(profile.mobile_number?.verified);
  const stored = signInNoticesOf(preferences);

  const setPinMode = () => {
    form.setClearPin(false);
    pinRef.current?.focus();
  };

  const clearPinMode = () => {
    form.setClearPin(true);
    form.setPin('');
    rules.clear('ciba_user_code');
  };

  const save = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const patch = preferencesPatch({ settings, preferences, pin, clearPin, own });
    try {
      if (Object.keys(patch).length > 0) {
        await account.preferences(patch);
      }
      form.setPin('');
      form.setClearPin(false);
      rules.reset();
      notify('success', t('profile.preferences.saved'));
      if (Object.keys(patch).length > 0) {
        await onSaved();
      }
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const pinSet = Boolean(preferences.ciba_user_code_set) && !clearPin;
  const pinField =
    own && 'ciba_user_code_set' in preferences
      ? { pin, pinSet, pinRef, onPin: form.setPin, onSet: setPinMode, onClear: clearPinMode }
      : null;

  return (
    <div className="tab-pane fade show active">
      <SectionCard
        title={t('profile.preferences.general')}
        className="mb-0 pref-card"
        folded={folds.folded('preferences')}
        onFold={() => folds.toggle('preferences')}
      >
        <form onSubmit={save} noValidate data-panel="preferences">
          <FormErrorSummary errors={rules.summary} />
          <AppearanceSection
            own={own}
            settings={settings}
            onMode={writes.changeMode}
            onMotion={writes.changeMotion}
            onTheme={writes.changeTheme}
          />
          <LanguageSection
            own={own}
            languages={languages}
            settings={{ preferences, language: settings.language, region: settings.region }}
            rules={rules}
            clock={form.clock}
            lists={{ zones: form.zones, locales: form.locales, countries }}
            onLanguage={writes.changeLanguage}
            onSet={set}
          />
          {'ciba_channels' in preferences || pinField ? (
            <ApprovalSection
              rules={rules}
              channels={settings.ciba_channels}
              smsAllowed={smsAllowed}
              onChannels={value => set('ciba_channels', value)}
              pin={pinField}
            />
          ) : null}
          {stored && settings.notices ? (
            <NoticesSection
              rules={rules}
              notices={settings.notices}
              following={stored.following}
              onWhen={when => form.setNotices({ when })}
              onChannels={channels => form.setNotices({ channels })}
            />
          ) : null}
          {account.deploy ? <DeploySection deploy={account.deploy} /> : null}
          <div className="pref-foot">
            <button type="submit" className="btn btn-primary" data-action="save-preferences">
              {t('profile.preferences.save')}
            </button>
          </div>
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

/**
 * The Preferences section of the identity contract at
 * `/user/profile/preferences`, one `SectionCard` titled General whose fold
 * is kept under `table_prefs_profile_preferences`, drawn as sections, each
 * a heading and a lead at the left and its controls at the right, one form
 * and one Save preferences at the card's foot. Appearance: the mode as
 * three tiles, System, Light and Dark, the motion as two, Follow this
 * device and Reduced, each a label over a native radio, written through on
 * a pick as the chrome's controls write through the shared `useTheme` and
 * `useMotion`, and while the host offers themes a Theme card per theme
 * beside Follow this site, each card a preview painted from the manifest
 * row's `primary` and the `surfaces` of the mode in force, written through
 * on a pick the same way. Language and time: the language select writing
 * through the shared `i18n`, and while the record carries each member the
 * time zone from the `Intl` list with the detected zone preselected,
 * the region as a select of the country list plus `EU`, `EEA` and `UK`,
 * blank clearing it, the locale the form dates and numbers are written in
 * with the detected one preselected, and the hour cycle as two tiles, 12
 * hour and 24 hour, the detected one preselected. Sign-in approval, while
 * the record carries `ciba_channels`: the four channels In-app, Push,
 * Email and SMS as tick tiles saved as `ciba_channels`, a channel the
 * status does not list as a sub flag of `notifications` greyed and
 * unpickable, SMS greyed too while no verified mobile number exists, and
 * on the person's own record the approval PIN as one input with Set and
 * Clear beside it, "A PIN is set" above it while one is stored. Sign-in
 * notices, while the record carries `sign_in_notices`: When as four
 * tiles, Never, New devices, Every sign-in and Site default, a line under
 * them saying what the picked one means, Sent to as the tick tiles Email,
 * In-app and Push by the same words and greying, dimmed while Site default
 * is picked, and the badge "Following the site's default" in the section's
 * heading while the record follows it. Deploy target, while the adapter
 * carries `deploy`, the `hyperweaver-server` role's own row: a select of
 * `local`, this server's origin and the stored value while it is neither,
 * written through on change as `PATCH /api/user/deploy` under the host's
 * `deploy` rules form. Save sends one `PATCH /api/user/preferences`
 * carrying the time zone, the locale and the hour cycle where each
 * differs from the record, the region where it differs, `ciba_channels`
 * where the set differs, the sign-in notices as `noticesPatchOf` answers,
 * Site default sending `sign_in_notices: null`, and the PIN while typed or
 * cleared; it sends nothing while nothing differs and draws the saved
 * notice all the same; a `422` is painted on the control its pointer
 * names, `/sign_in_notices/when` on the When tiles, `/sign_in_notices/channels`
 * on the Sent to tiles, `/ciba_channels` on the channel tiles and
 * `/sign_in_notices` in the form's summary; the page remounts the section
 * with every re-read of the record. While `readOnly`, the record an
 * identity provider owns, the language, mode, motion and theme and the
 * clock members the record carries draw as `readonly` fields with the
 * Manage at identity provider link as the card's action, the approval
 * and notices being the issuer's own and not drawn, the deploy target
 * still the editable select because the row is the host's own. Without a
 * `session`, the record another person's on the admin record page,
 * language, mode, theme and motion are the record's own values saved with
 * the rest through `account.preferences` and never the viewer's chrome,
 * and the PIN is not drawn because the admin route takes none. Under the
 * card, while the adapter carries `integrations` and the record carries
 * the `integrations` rows, the Hyperweaver card draws over its
 * `hyperweaver` row, and under that the `extra` node the host's features
 * hand the page, the certs feature's Certificates card while the host
 * lists `certs`.
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
  const after =
    hyperweaver || extra ? (
      <>
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
