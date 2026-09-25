import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const LOCALES = path.resolve('public/locales');

const flat = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const keysOf = (language, file) =>
  new Set(flat(JSON.parse(fs.readFileSync(path.join(LOCALES, language, file), 'utf8'))));

const files = fs.readdirSync(path.join(LOCALES, 'en')).filter(name => name.endsWith('.json'));
const languages = fs
  .readdirSync(LOCALES, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name !== 'en' && entry.name !== 'cimode')
  .map(entry => entry.name);

describe('locale parity against en', () => {
  languages.forEach(language => {
    files.forEach(file => {
      it(`${language}/${file} carries exactly the keys of en/${file}`, () => {
        const en = keysOf('en', file);
        const keys = keysOf(language, file);
        expect([...en].filter(key => !keys.has(key))).toEqual([]);
        expect([...keys].filter(key => !en.has(key))).toEqual([]);
      });
    });
  });
});
