import { describe, expect, it } from 'vitest';

import {
  assetsOf,
  isPrerelease,
  releaseAssetsOf,
  releaseOf,
  updateOf,
} from '../../src/components/common/UpdatePage.jsx';
import {
  SECRET_CATEGORIES,
  apiKeysOf,
  emptySecretEntry,
  hostHasSettings,
  savedSecretEntries,
  secretEntriesOf,
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
  it('answers the versions and the release members while an update is available and null otherwise', () => {
    expect(
      updateOf({ update_available: true, current_version: '1.2.0', latest_version: '1.3.0' })
    ).toEqual({
      current: '1.2.0',
      latest: '1.3.0',
      releaseUrl: '',
      releaseDate: '',
      changelog: '',
      releaseNotes: '',
      assets: [],
    });
    expect(
      updateOf({
        update_available: true,
        current_version: '1.2.0',
        latest_version: '1.3.0',
        release_url: 'https://example.test/releases/1.3.0',
        release_date: '2026-10-01T00:00:00Z',
        changelog: 'https://example.test/CHANGELOG.md',
        release_notes: '### Features\n\n* one',
        assets: [
          {
            name: 'agent-1.3.0-linux-amd64.deb',
            url: 'https://example.test/agent-1.3.0-linux-amd64.deb',
            size: 38692454,
            checksum: 'abc',
          },
          { name: 'checksums.txt', url: 'https://example.test/checksums.txt', size: 486 },
        ],
      })
    ).toEqual({
      current: '1.2.0',
      latest: '1.3.0',
      releaseUrl: 'https://example.test/releases/1.3.0',
      releaseDate: '2026-10-01T00:00:00Z',
      changelog: 'https://example.test/CHANGELOG.md',
      releaseNotes: '### Features\n\n* one',
      assets: [
        {
          name: 'agent-1.3.0-linux-amd64.deb',
          url: 'https://example.test/agent-1.3.0-linux-amd64.deb',
          size: 38692454,
          checksum: 'abc',
        },
        {
          name: 'checksums.txt',
          url: 'https://example.test/checksums.txt',
          size: 486,
          checksum: '',
        },
      ],
    });
    expect(updateOf({ update_available: false, current_version: '1.3.0' })).toBeNull();
    expect(updateOf(null)).toBeNull();
  });

  it('offers a pre-release to a pre-release version alone', () => {
    const offered = {
      update_available: true,
      current_version: '1.3.0',
      latest_version: '1.4.0-beta.1',
      releases: [{ tag: 'v1.4.0-beta.1', prerelease: true }],
    };
    expect(updateOf(offered)).toBeNull();
    expect(updateOf({ ...offered, current_version: '1.4.0-dev' })).toMatchObject({
      current: '1.4.0-dev',
      latest: '1.4.0-beta.1',
    });
    expect(updateOf({ ...offered, releases: undefined })).toBeNull();
  });

  it('reads null notes and null assets as none', () => {
    expect(
      updateOf({
        update_available: true,
        current_version: '1.2.0',
        latest_version: '1.3.0',
        release_notes: null,
        assets: null,
      })
    ).toMatchObject({ releaseNotes: '', assets: [] });
  });
});

describe('assetsOf', () => {
  it('keeps the entries that carry a name, the size a number and the checksum a string', () => {
    expect(
      assetsOf([
        { name: 'a.deb', url: 'https://example.test/a.deb', size: '12', checksum: null },
        { url: 'https://example.test/nameless' },
        null,
        { name: 'b.txt' },
      ])
    ).toEqual([
      { name: 'a.deb', url: 'https://example.test/a.deb', size: 12, checksum: '' },
      { name: 'b.txt', url: '', size: 0, checksum: '' },
    ]);
    expect(assetsOf(null)).toEqual([]);
    expect(assetsOf(undefined)).toEqual([]);
    expect(assetsOf('x')).toEqual([]);
  });
});

describe('isPrerelease', () => {
  it('reads a dash suffix as a pre-release', () => {
    expect(isPrerelease('1.4.0-dev')).toBe(true);
    expect(isPrerelease('v1.4.0-beta.1')).toBe(true);
    expect(isPrerelease('1.3.0')).toBe(false);
    expect(isPrerelease(null)).toBe(false);
  });
});

describe('releaseOf', () => {
  const releases = [
    {
      tag: 'v1.4.0-beta.1',
      name: 'v1.4.0-beta.1',
      prerelease: true,
      published_at: '2026-10-02T08:00:00Z',
      author: 'Makr91',
      html_url: 'https://example.test/releases/v1.4.0-beta.1',
      body: '### Features\n\n* one',
      assets: [
        {
          name: 'agent-1.4.0-beta.1.deb',
          browser_download_url: 'https://example.test/agent-1.4.0-beta.1.deb',
          size: 39116800,
          sha256: null,
        },
      ],
    },
    { tag: 'v1.3.0', body: null, assets: null },
    { name: 'tagless' },
    null,
  ];

  it('answers the listed release whose tag is the latest version, the v prefix ignored', () => {
    expect(releaseOf({ current_version: '1.2.0', latest_version: '1.3.0', releases })).toEqual({
      tag: 'v1.3.0',
      name: '',
      prerelease: false,
      publishedAt: '',
      author: '',
      url: '',
      body: '',
      assets: [],
    });
  });

  it('answers a listed pre-release to a pre-release version and null to a production one', () => {
    const check = { current_version: '1.4.0-dev', latest_version: '1.4.0-beta.1', releases };
    expect(releaseOf(check)).toEqual({
      tag: 'v1.4.0-beta.1',
      name: 'v1.4.0-beta.1',
      prerelease: true,
      publishedAt: '2026-10-02T08:00:00Z',
      author: 'Makr91',
      url: 'https://example.test/releases/v1.4.0-beta.1',
      body: '### Features\n\n* one',
      assets: [
        {
          name: 'agent-1.4.0-beta.1.deb',
          url: 'https://example.test/agent-1.4.0-beta.1.deb',
          size: 39116800,
          checksum: '',
        },
      ],
    });
    expect(releaseOf({ ...check, current_version: '1.3.0' })).toBeNull();
  });

  it('answers the release the check names while it lists none, a dash suffix the pre-release mark', () => {
    expect(
      releaseOf({
        update_available: true,
        current_version: '1.2.0',
        latest_version: '1.3.0',
        release_url: 'https://example.test/releases/1.3.0',
        release_date: '2026-10-01T00:00:00Z',
        release_notes: '### Features\n\n* one',
        assets: [{ name: 'a.deb', url: 'https://example.test/a.deb', size: 12, checksum: 'abc' }],
      })
    ).toEqual({
      tag: '1.3.0',
      name: '',
      prerelease: false,
      publishedAt: '2026-10-01T00:00:00Z',
      author: '',
      url: 'https://example.test/releases/1.3.0',
      body: '### Features\n\n* one',
      assets: [{ name: 'a.deb', url: 'https://example.test/a.deb', size: 12, checksum: 'abc' }],
    });
    expect(
      releaseOf({ current_version: '1.3.0', latest_version: '1.4.0-rc.1', release_notes: null })
    ).toBeNull();
    expect(
      releaseOf({ current_version: '1.4.0-dev', latest_version: '1.4.0-rc.1', assets: null })
    ).toMatchObject({ tag: '1.4.0-rc.1', prerelease: true, body: '', assets: [] });
    expect(
      releaseOf({ update_available: false, current_version: '1.3.0', latest_version: null })
    ).toBeNull();
    expect(releaseOf(null)).toBeNull();
  });
});

describe('releaseAssetsOf', () => {
  it('reads the browser download url and the sha256 of every named entry', () => {
    expect(
      releaseAssetsOf([
        {
          name: 'a.deb',
          browser_download_url: 'https://example.test/a.deb',
          size: '12',
          sha256: 'abc',
        },
        { browser_download_url: 'https://example.test/nameless' },
        { name: 'b.txt', sha256: null },
      ])
    ).toEqual([
      { name: 'a.deb', url: 'https://example.test/a.deb', size: 12, checksum: 'abc' },
      { name: 'b.txt', url: '', size: 0, checksum: '' },
    ]);
    expect(releaseAssetsOf(null)).toEqual([]);
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
