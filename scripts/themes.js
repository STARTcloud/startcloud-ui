import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

import YAML from 'yaml';

const THEMES_DIR = path.resolve('public/themes');
const ON_PRIMARY_CHOICES = ['#ffffff', '#000000'];
const TEXT_MIN = 4.5;
const MARK_MIN = 3;
const HEX = /^#(?<digits>[0-9a-f]{6})$/i;
const VARIANTS = ['light', 'dark'];
const TEXT_KEYS = ['body-color', 'emphasis-color', 'secondary-color', 'link-color'];
const SURFACE_KEYS = ['body-bg', 'tertiary-bg', 'secondary-bg'];
const STOCK = {
  light: { 'body-bg': '#ffffff', 'tertiary-bg': '#f8f9fa', 'secondary-bg': '#e9ecef' },
  dark: { 'body-bg': '#212529', 'tertiary-bg': '#2b3035', 'secondary-bg': '#343a40' },
};

const channel = value => {
  const c = value / 255;
  if (c <= 0.03928) {
    return c / 12.92;
  }
  return ((c + 0.055) / 1.055) ** 2.4;
};

const rgbOf = hex => {
  const match = HEX.exec(String(hex));
  if (!match) {
    throw new Error(`${hex} is not a six-digit hex color`);
  }
  const { digits } = match.groups;
  return [0, 2, 4].map(index => parseInt(digits.slice(index, index + 2), 16));
};

const luminance = hex => {
  const [red, green, blue] = rgbOf(hex).map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (first, second) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

const rgbList = hex => rgbOf(hex).join(', ');

const ratioText = ratio => `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;

const failing = (pack, first, second, minimum) => {
  const ratio = contrast(first.value, second.value);
  if (ratio >= minimum) {
    return '';
  }
  return `${pack}: ${first.name} ${first.value} against ${second.name} ${second.value} is ${ratioText(ratio)}, under ${minimum}:1`;
};

const surfacesOf = (source, variant) => ({
  ...STOCK[variant],
  ...(source.surfaces?.[variant] || {}),
});

const textFailures = (pack, source, variant) => {
  const set = source.surfaces?.[variant] || {};
  const surfaces = surfacesOf(source, variant);
  return TEXT_KEYS.filter(key => set[key]).flatMap(key =>
    SURFACE_KEYS.map(surface =>
      failing(
        pack,
        { name: `--bs-${key} (${variant})`, value: set[key] },
        { name: `--bs-${surface}`, value: surfaces[surface] },
        TEXT_MIN
      )
    )
  );
};

const logoColorsOf = source => {
  const light = source.logo_color?.light || source.primary;
  return { light, dark: source.logo_color?.dark || light };
};

const bodyBg = (source, variant) => ({
  name: `--bs-body-bg (${variant})`,
  value: surfacesOf(source, variant)['body-bg'],
});

const RING_MIN = 3;
const RING_ALPHA_FLOOR = 20;
const NUDGE_STEP = 5;
const NUDGE_TARGET = { light: '#000000', dark: '#ffffff' };

const mixToward = (from, toward, share) =>
  rgbOf(from).map((value, index) => value * (1 - share) + rgbOf(toward)[index] * share);

const compositeOver = (rgb, alpha, page) =>
  rgb.map((value, index) => value * alpha + rgbOf(page)[index] * (1 - alpha));

const luminanceOf = rgb => {
  const [red, green, blue] = rgb.map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastOf = (rgb, page) => {
  const lighter = Math.max(luminanceOf(rgb), luminance(page));
  const darker = Math.min(luminanceOf(rgb), luminance(page));
  return (lighter + 0.05) / (darker + 0.05);
};

const ringBase = (accent, page, toward) => {
  for (let share = 0; share <= 100; share += NUDGE_STEP) {
    const base = mixToward(accent, toward, share / 100);
    if (contrastOf(base, page) >= RING_MIN) {
      return base;
    }
  }
  return rgbOf(toward);
};

const ringAlpha = (base, page) => {
  for (let alpha = RING_ALPHA_FLOOR; alpha <= 100; alpha += 1) {
    if (contrastOf(compositeOver(base, alpha / 100, page), page) >= RING_MIN) {
      return alpha;
    }
  }
  return 100;
};

const focusRingOf = (source, variant) => {
  const page = surfacesOf(source, variant)['body-bg'];
  const base = ringBase(source.primary, page, NUDGE_TARGET[variant]);
  const alpha = ringAlpha(base, page);
  const [red, green, blue] = base.map(Math.round);
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 100})`;
};

const markFailures = (pack, source) => {
  if (!source.logo && !source.logo_color) {
    return [];
  }
  const colors = logoColorsOf(source);
  return VARIANTS.map(variant =>
    failing(
      pack,
      { name: `--brand-logo-color (${variant})`, value: colors[variant] },
      bodyBg(source, variant),
      MARK_MIN
    )
  );
};

const onPrimaryFailure = (pack, source) => {
  const primary = { name: '--brand-primary', value: source.primary };
  if (source.on_primary) {
    return failing(
      pack,
      primary,
      { name: '--brand-on-primary', value: source.on_primary },
      TEXT_MIN
    );
  }
  const [better] = [...ON_PRIMARY_CHOICES].sort(
    (first, second) => contrast(source.primary, second) - contrast(source.primary, first)
  );
  source.on_primary = better;
  return failing(pack, primary, { name: '--brand-on-primary', value: better }, TEXT_MIN);
};

const failuresOf = (pack, source) => {
  const failures = [onPrimaryFailure(pack, source)];
  if (source.warning || source.on_warning) {
    failures.push(
      failing(
        pack,
        { name: '--brand-warning', value: source.warning },
        { name: '--brand-on-warning', value: source.on_warning },
        TEXT_MIN
      )
    );
  }
  VARIANTS.forEach(variant => failures.push(...textFailures(pack, source, variant)));
  failures.push(...markFailures(pack, source));
  return failures.filter(Boolean);
};

const fontFace = (pack, font) => {
  const lines = [
    '@font-face {',
    `  font-family: '${font.family}';`,
    `  font-style: ${font.style || 'normal'};`,
    `  font-weight: ${font.weight || 400};`,
    '  font-display: swap;',
    `  src: url('/themes/${pack}/${font.file}') format('${font.format || 'woff2'}');`,
    '}',
  ];
  return lines.join('\n');
};

const brandLines = (pack, source) => {
  const lines = [
    `  --brand-primary: ${source.primary.toLowerCase()};`,
    `  --brand-primary-rgb: ${rgbList(source.primary)};`,
    `  --brand-on-primary: ${source.on_primary.toLowerCase()};`,
  ];
  if (source.warning) {
    lines.push(`  --brand-warning: ${source.warning.toLowerCase()};`);
    lines.push(`  --brand-warning-rgb: ${rgbList(source.warning)};`);
    lines.push(`  --brand-on-warning: ${source.on_warning.toLowerCase()};`);
  }
  if (source.logo) {
    lines.push(`  --brand-logo: url('/themes/${pack}/${source.logo}');`);
    lines.push(`  --brand-logo-color: ${logoColorsOf(source).light.toLowerCase()};`);
  }
  if (source.display) {
    lines.push(`  --brand-auth-display: ${source.display};`);
  }
  return lines;
};

const bridgeLines = source => {
  const lines = [
    '  --bs-primary: var(--brand-primary);',
    `  --bs-primary-rgb: ${rgbList(source.primary)};`,
    '  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, white);',
  ];
  if (source.warning) {
    lines.push('  --bs-warning: var(--brand-warning);');
    lines.push(`  --bs-warning-rgb: ${rgbList(source.warning)};`);
  }
  lines.push('  --bs-btn-bg: var(--brand-primary);');
  lines.push('  --bs-btn-color: var(--brand-on-primary);');
  return lines;
};

const surfaceLines = (source, variant) =>
  Object.entries(source.surfaces?.[variant] || {}).map(
    ([key, value]) => `  --bs-${key}: ${String(value).toLowerCase()};`
  );

const darkLogoLines = source =>
  source.logo && source.logo_color?.dark
    ? [`  --brand-logo-color: ${logoColorsOf(source).dark.toLowerCase()};`]
    : [];

const focusRingsOf = source =>
  Object.fromEntries(VARIANTS.map(variant => [variant, focusRingOf(source, variant)]));

const stylesheetOf = (pack, source, rings) => {
  const blocks = (source.fonts || []).map(font => fontFace(pack, font));
  blocks.push(
    [
      `[data-brand='${pack}'] {`,
      ...brandLines(pack, source),
      `  --brand-focus-ring: ${rings.light};`,
      ...bridgeLines(source),
      ...surfaceLines(source, 'light'),
      '}',
    ].join('\n')
  );
  blocks.push(
    [
      `[data-brand='${pack}'][data-bs-theme='dark'] {`,
      `  --brand-focus-ring: ${rings.dark};`,
      '  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, black);',
      ...darkLogoLines(source),
      ...surfaceLines(source, 'dark'),
      '}',
    ].join('\n')
  );
  return `${blocks.join('\n\n')}\n`;
};

const packNames = () =>
  fs
    .readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => fs.existsSync(path.join(THEMES_DIR, name, `${name}.yaml`)))
    .sort();

const readSource = pack => {
  const source = YAML.parse(fs.readFileSync(path.join(THEMES_DIR, pack, `${pack}.yaml`), 'utf8'));
  if (!source?.primary) {
    throw new Error(`${pack}: primary is required`);
  }
  return source;
};

const writePack = (pack, css) => {
  const hash = createHash('sha256').update(css).digest('hex');
  fs.writeFileSync(path.join(THEMES_DIR, pack, `${pack}.css`), css);
  fs.writeFileSync(path.join(THEMES_DIR, pack, `${pack}.hash`), hash);
  return hash;
};

/**
 * Generate every pack stylesheet under public/themes: for each
 * public/themes/<pack>/<pack>.yaml, write <pack>.css in the branding
 * contract's generated shape and <pack>.hash holding the stylesheet's
 * SHA-256 hex and nothing else, the `?v=` every UI backend reads.
 *
 * The YAML source carries `primary` (six-digit hex, required), `on_primary`
 * (hex, optional: when absent the generator takes `#ffffff` or `#000000`,
 * whichever contrasts more with `primary`, and refuses the pack only when
 * that better one is under 4.5:1), `warning` and `on_warning` (hex,
 * optional, together), `logo`
 * (a file in the pack directory, optional) with `logo_color` (optional,
 * `light` and `dark` hex values, the light one the primary when absent and
 * the dark one the light one when absent, emitted under the dark selector
 * only when named), `display` (the auth column's headline face as a
 * CSS font-family list, optional), `fonts` (optional, one entry per file
 * served with the pack: `family`, `file`, `weight`, `style`, `format`,
 * each declared with font-display swap) and `surfaces` (optional, `light`
 * and `dark` maps of Bootstrap color names without the `--bs-` prefix,
 * such as `body-bg`, `tertiary-bg`, `secondary-bg`, `border-color`,
 * `body-color`, `emphasis-color`, `secondary-color`, `link-color`).
 *
 * A pack is refused, and the process exits non-zero naming every failing
 * pair, when `primary` against `on_primary` (or `warning` against
 * `on_warning`) is under 4.5:1, when a text color a variant sets is under
 * 4.5:1 against any surface of that variant, the pack's own or stock
 * Bootstrap's where the pack names none, or when a variant's mark color
 * is under 3:1 against that variant's body background.
 *
 * The focus ring is the chrome's and never a pack input: for each variant
 * the generator emits `--brand-focus-ring` as an rgba of the accent, nudged
 * toward black on the light variant or white on the dark one in 5% steps
 * only until the opaque color reaches 3:1 against that variant's body
 * background, at the lowest alpha from 20% up whose color composited
 * over that background reaches 3:1, and prints both values beside the
 * hash.
 *
 * @returns {number} The exit code, 0 when every pack was written
 */
export const generateThemes = () => {
  const refused = [];
  packNames().forEach(pack => {
    const source = readSource(pack);
    const failures = failuresOf(pack, source);
    if (failures.length > 0) {
      refused.push(...failures);
      return;
    }
    const rings = focusRingsOf(source);
    const hash = writePack(pack, stylesheetOf(pack, source, rings));
    console.log(
      `${pack}: public/themes/${pack}/${pack}.css ${hash.slice(0, 12)} light ${rings.light} dark ${rings.dark}`
    );
  });
  refused.forEach(line => console.error(`refused ${line}`));
  return refused.length > 0 ? 1 : 0;
};

process.exit(generateThemes());
