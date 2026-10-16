import { describe, expect, it } from 'vitest';

import {
  answeredFieldNames,
  artifactSourceOf,
  artifactVersionOf,
  defaultPickOf,
  downloadKeyOf,
  fileKindsOf,
  pickAnswersOf,
  pickTextOf,
  pickedArtifactOf,
  roleArtifactsOf,
  roleFilesPatch,
  roleNeedsAttention,
  seedRolePicks,
  shortHashOf,
  waitForOf,
  withoutRestApiSuffix,
} from '../../src/features/hosts/utils/roleFiles.js';

const SHA = '6775d563e826114702fc4aacf20f5f086459bd151c3bf01a9e659eaff47ebe79';

const domino = {
  name: 'domino_install',
  default_enabled: true,
  installer_dir: 'domino',
  files: {
    installer: {
      answers: {
        name: 'DOMINO_INSTALLER',
        hash: 'DOMINO_HASH',
        major: 'DOMINO_INSTALLER_MAJOR_VERSION',
        minor: 'DOMINO_INSTALLER_MINOR_VERSION',
        patch: 'DOMINO_INSTALLER_PATCH_VERSION',
      },
    },
    fixpack: {
      answers: {
        name: 'DOMINO_INSTALLER_FIXPACK',
        hash: 'DOMINO_FP_HASH',
        version: 'DOMINO_INSTALLER_FIXPACK_VERSION',
        install: 'DOMINO_INSTALLER_FIXPACK_INSTALL',
      },
    },
  },
};

const restApi = {
  name: 'domino_rest_api',
  installer_dir: 'domino-rest-api',
  files: {
    installer: {
      answers: { name: 'DOMINO_REST_API_INSTALLER', version: 'DOMINO_REST_API_INSTALLER_VERSION' },
    },
  },
};

const versionOf = (major, minor, patch, fixPack, full) => ({
  major,
  minor,
  patch,
  fix_pack: fixPack,
  full_version: full,
});

const artifacts = [
  {
    id: 'a2',
    filename: 'Domino_14.5_Linux_English.tar',
    file_type: 'installer',
    role: 'domino',
    expected_sha256: SHA,
    version: versionOf('14', '5', '0', '', '14.5.0'),
    file_exists: false,
    source: 'boxvault',
  },
  {
    id: 'a1',
    filename: 'Domino_14.0_Linux_English.tar',
    file_type: 'installer',
    role: 'domino',
    checksum: 'abc',
    version: '14.0.0',
    file_exists: true,
  },
  {
    id: 'a3',
    filename: 'Domino_1400FP3_Linux.tar',
    file_type: 'fixpack',
    role: 'domino',
    expected_sha256: 'fp',
    version: versionOf('14', '0', '0', 'FP3', '14.0fp3'),
    file_exists: false,
    source: 'hcl',
  },
  {
    id: 'a4',
    filename: 'hcl.dleap-1.1.9.36.zip',
    file_type: 'installer',
    role: 'leap',
    version: '1.1.9',
    file_exists: true,
  },
  {
    id: 'a5',
    filename: 'Domino_REST_API_V1.1.6_R14_Installer.tar.gz',
    file_type: 'installer',
    role: 'domino-rest-api',
    version: '1.1.6_R14',
    file_exists: true,
  },
  { id: 'a6', filename: 'SAFE.ids', file_type: 'id_file', role: 'safe_id', file_exists: true },
];

const missingPick = {
  name: 'domino_install',
  enabled: true,
  files: { installer: 'Domino_14.5_Linux_English.tar' },
};

const presentPick = {
  name: 'domino_install',
  enabled: true,
  files: { installer: 'Domino_14.0_Linux_English.tar' },
};

describe('the rows of a role', () => {
  it('lists the kinds a role declares in the fixed order and the rows of its installer_dir, the ones on the host first', () => {
    expect(fileKindsOf(domino)).toEqual(['installer', 'fixpack']);
    expect(fileKindsOf({ name: 'x' })).toEqual([]);
    expect(roleArtifactsOf(artifacts, domino, 'installer').map(row => row.id)).toEqual([
      'a1',
      'a2',
    ]);
    expect(roleArtifactsOf(artifacts, domino, 'fixpack').map(row => row.id)).toEqual(['a3']);
    expect(roleArtifactsOf(artifacts, { name: 'x' }, 'installer')).toEqual([]);
    expect(roleArtifactsOf(null, domino, 'installer')).toEqual([]);
  });

  it('opens an installer on the first row on the host, a fixpack on none', () => {
    const rows = roleArtifactsOf(artifacts, domino, 'installer');
    expect(defaultPickOf(rows, 'installer').id).toBe('a1');
    expect(defaultPickOf([artifacts[0]], 'installer').id).toBe('a2');
    expect(defaultPickOf(rows, 'fixpack')).toBeNull();
    expect(defaultPickOf([], 'installer')).toBeNull();
  });

  it('reads the source word of a missing row and nothing else', () => {
    expect(artifactSourceOf(artifacts[0])).toBe('boxvault');
    expect(artifactSourceOf(artifacts[2])).toBe('hcl');
    expect(artifactSourceOf({ source: 'ftp' })).toBe('');
    expect(artifactSourceOf(null)).toBe('');
  });
});

describe('the text beside a pick', () => {
  it('reads the structured version and splits a plain one, strips the REST API suffix and shortens the hash', () => {
    expect(artifactVersionOf(artifacts[0])).toEqual(versionOf('14', '5', '0', '', '14.5.0'));
    expect(artifactVersionOf(artifacts[1])).toEqual(versionOf('14', '0', '0', '', '14.0.0'));
    expect(artifactVersionOf(artifacts[4]).major).toBe('1');
    expect(withoutRestApiSuffix('1.1.6_R14')).toBe('1.1.6');
    expect(withoutRestApiSuffix('1.1.5_R14.5')).toBe('1.1.5');
    expect(withoutRestApiSuffix('14.5.0')).toBe('14.5.0');
    expect(shortHashOf(SHA)).toBe('6775d563…7ebe79');
    expect(shortHashOf('abc')).toBe('abc');
    expect(pickTextOf(artifacts[0])).toEqual({ version: '14.5.0', hash: '6775d563…7ebe79' });
    expect(pickTextOf(null)).toEqual({ version: '', hash: '' });
  });
});

describe('what a pick writes', () => {
  it('writes the role files under the agent names and clears them for no pick', () => {
    expect(roleFilesPatch('installer', artifacts[1])).toEqual({
      installer: 'Domino_14.0_Linux_English.tar',
      installer_hash: 'abc',
      installer_version: '14.0.0',
    });
    expect(roleFilesPatch('fixpack', null)).toEqual({
      fixpack: '',
      fixpack_hash: '',
      fixpack_version: '',
    });
    expect(roleFilesPatch('installer', artifacts[4]).installer_version).toBe('1.1.6');
  });

  it('fills the manifest fields the role answers name and sets install true, clears them for no pick', () => {
    expect(pickAnswersOf(domino, 'installer', artifacts[0])).toEqual({
      DOMINO_INSTALLER: 'Domino_14.5_Linux_English.tar',
      DOMINO_HASH: SHA,
      DOMINO_INSTALLER_MAJOR_VERSION: '14',
      DOMINO_INSTALLER_MINOR_VERSION: '5',
      DOMINO_INSTALLER_PATCH_VERSION: '0',
    });
    expect(pickAnswersOf(domino, 'fixpack', artifacts[2])).toEqual({
      DOMINO_INSTALLER_FIXPACK: 'Domino_1400FP3_Linux.tar',
      DOMINO_FP_HASH: 'fp',
      DOMINO_INSTALLER_FIXPACK_VERSION: '14.0fp3',
      DOMINO_INSTALLER_FIXPACK_INSTALL: true,
    });
    expect(pickAnswersOf(domino, 'fixpack', null)).toEqual({
      DOMINO_INSTALLER_FIXPACK: undefined,
      DOMINO_FP_HASH: undefined,
      DOMINO_INSTALLER_FIXPACK_VERSION: undefined,
      DOMINO_INSTALLER_FIXPACK_INSTALL: false,
    });
    expect(pickAnswersOf(restApi, 'installer', artifacts[4])).toEqual({
      DOMINO_REST_API_INSTALLER: 'Domino_REST_API_V1.1.6_R14_Installer.tar.gz',
      DOMINO_REST_API_INSTALLER_VERSION: '1.1.6',
    });
    expect(pickAnswersOf({ name: 'x' }, 'installer', artifacts[0])).toEqual({});
  });

  it('names every field the pickers answer, the ones the form never draws', () => {
    expect([...answeredFieldNames([domino, restApi, { name: 'x' }])]).toEqual([
      'DOMINO_INSTALLER',
      'DOMINO_HASH',
      'DOMINO_INSTALLER_MAJOR_VERSION',
      'DOMINO_INSTALLER_MINOR_VERSION',
      'DOMINO_INSTALLER_PATCH_VERSION',
      'DOMINO_INSTALLER_FIXPACK',
      'DOMINO_FP_HASH',
      'DOMINO_INSTALLER_FIXPACK_VERSION',
      'DOMINO_INSTALLER_FIXPACK_INSTALL',
      'DOMINO_REST_API_INSTALLER',
      'DOMINO_REST_API_INSTALLER_VERSION',
    ]);
  });

  it('seeds each file-taking role with its default installer and the answers, keeping a pick already made', () => {
    const seeded = seedRolePicks(
      [
        { name: 'domino_install', enabled: true, files: {}, vars: {} },
        { name: 'domino_rest_api', enabled: false, files: { installer: 'kept.tar.gz' }, vars: {} },
        { name: 'networking', enabled: true, files: {}, vars: {} },
      ],
      [domino, restApi, { name: 'networking' }],
      artifacts
    );
    expect(seeded.roles[0].files).toEqual({
      installer: 'Domino_14.0_Linux_English.tar',
      installer_hash: 'abc',
      installer_version: '14.0.0',
    });
    expect(seeded.roles[1].files).toEqual({ installer: 'kept.tar.gz' });
    expect(seeded.roles[2].files).toEqual({});
    expect(seeded.answers).toEqual({
      DOMINO_INSTALLER: 'Domino_14.0_Linux_English.tar',
      DOMINO_HASH: 'abc',
      DOMINO_INSTALLER_MAJOR_VERSION: '14',
      DOMINO_INSTALLER_MINOR_VERSION: '0',
      DOMINO_INSTALLER_PATCH_VERSION: '0',
    });
  });
});

describe('what needs attention', () => {
  const rows = roleArtifactsOf(artifacts, domino, 'installer');
  const base = { manifestRole: domino, artifacts, queued: {}, spec: null };

  it('finds the picked row by its file name', () => {
    expect(pickedArtifactOf(rows, missingPick, 'installer').id).toBe('a2');
    expect(pickedArtifactOf(rows, { files: {} }, 'installer')).toBeNull();
  });

  it('marks a role on with no installer and a role off never', () => {
    const bare = { name: 'domino_install', enabled: true, files: {} };
    expect(roleNeedsAttention({ ...base, roleRow: bare })).toBe(true);
    expect(roleNeedsAttention({ ...base, roleRow: { ...bare, enabled: false } })).toBe(false);
  });

  it('marks a missing pick until its download is queued and a present pick never', () => {
    expect(roleNeedsAttention({ ...base, roleRow: missingPick })).toBe(true);
    const queued = { 'domino_install/installer': { task_id: 'c2' } };
    expect(roleNeedsAttention({ ...base, roleRow: missingPick, queued })).toBe(false);
    expect(roleNeedsAttention({ ...base, roleRow: presentPick })).toBe(false);
  });

  it('marks a required spec option with no default and no value', () => {
    const spec = {
      options: {
        domino_organization: { required: true },
        domino_user: { default: 'domino', required: true },
      },
    };
    expect(roleNeedsAttention({ ...base, roleRow: presentPick, spec })).toBe(true);
    const answered = { ...presentPick, vars: { domino_organization: 'STARTcloud' } };
    expect(roleNeedsAttention({ ...base, roleRow: answered, spec })).toBe(false);
  });

  it('keys a queued download by role and kind and lists the task ids as wait_for', () => {
    expect(downloadKeyOf('domino_install', 'fixpack')).toBe('domino_install/fixpack');
    expect(waitForOf({ a: { task_id: 'c2' }, b: { task_id: '' }, c: { task_id: 'c3' } })).toEqual([
      'c2',
      'c3',
    ]);
    expect(waitForOf(undefined)).toEqual([]);
  });
});
