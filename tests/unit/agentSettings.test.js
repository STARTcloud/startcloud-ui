import { describe, expect, it } from 'vitest';

import {
  SECRET_CATEGORIES,
  apiKeysOf,
  emptySecretEntry,
  hostHasSettings,
  savedSecretEntries,
  secretEntriesOf,
  updateOf,
} from '../../src/features/hosts/utils/agentSettings.js';

describe('hostHasSettings', () => {
  it('offers the page to a row that names a hypervisor and to no other', () => {
    expect(hostHasSettings({ capabilities: { hypervisors: ['virtualbox'] } })).toBe(true);
    expect(hostHasSettings({ capabilities: { hypervisors: [] } })).toBe(false);
    expect(hostHasSettings({ capabilities: null })).toBe(false);
    expect(hostHasSettings(null)).toBe(false);
  });
});

describe('updateOf', () => {
  it('answers the versions while an update is available and null otherwise', () => {
    expect(
      updateOf({ update_available: true, current_version: '1.2.0', latest_version: '1.3.0' })
    ).toEqual({ current: '1.2.0', latest: '1.3.0' });
    expect(updateOf({ update_available: false, current_version: '1.3.0' })).toBeNull();
    expect(updateOf(null)).toBeNull();
  });
});

describe('apiKeysOf', () => {
  it('answers the entities the agent answers or none', () => {
    const rows = [{ id: 1, name: 'Initial-Setup' }];
    expect(apiKeysOf({ entities: rows })).toBe(rows);
    expect(apiKeysOf(null)).toEqual([]);
  });
});

describe('SECRET_CATEGORIES', () => {
  it('lists the six categories with their fields', () => {
    expect(SECRET_CATEGORIES.map(category => category.key)).toEqual([
      'hcl_download_portal_api_keys',
      'git_api_keys',
      'vagrant_atlas_token',
      'custom_resource_url',
      'docker_hub',
      'ssh_keys',
    ]);
    const [, , , custom] = SECRET_CATEGORIES;
    expect(custom.fields.map(field => field.key)).toEqual([
      'name',
      'url',
      'useAuth',
      'user',
      'pass',
    ]);
    expect(custom.fields[2].type).toBe('checkbox');
    expect(SECRET_CATEGORIES[5].fields[1].multiline).toBe(true);
  });
});

describe('emptySecretEntry', () => {
  it('blanks every field and unticks every switch', () => {
    expect(emptySecretEntry(SECRET_CATEGORIES[3])).toEqual({
      name: '',
      url: '',
      useAuth: false,
      user: '',
      pass: '',
    });
  });
});

describe('secretEntriesOf and savedSecretEntries', () => {
  it('read a category of the document and keep the entries that carry a name', () => {
    const document = { git_api_keys: [{ name: 'github', key: 'x' }] };
    expect(secretEntriesOf(document, 'git_api_keys')).toEqual([{ name: 'github', key: 'x' }]);
    expect(secretEntriesOf(document, 'ssh_keys')).toEqual([]);
    expect(secretEntriesOf(null, 'ssh_keys')).toEqual([]);
    expect(
      savedSecretEntries([
        { name: 'a', key: '1' },
        { name: '', key: '2' },
      ])
    ).toEqual([{ name: 'a', key: '1' }]);
    expect(savedSecretEntries(undefined)).toEqual([]);
  });
});
