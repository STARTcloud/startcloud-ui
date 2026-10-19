import { describe, expect, it } from 'vitest';

import {
  answeredFieldNames,
  artifactRowsOf,
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
  wantedFileOf,
  withSpecDefaults,
  withoutRestApiSuffix,
} from '../../src/features/hosts/utils/roleFiles.js';

const config = {
  fields: [
    { name: 'DOMINO_INSTALLER', type: 'text', default: 'Domino_14.5_Linux_English.tar' },
    { name: 'DOMINO_INSTALLER_MAJOR_VERSION', type: 'number', default: 14 },
    { name: 'DOMINO_INSTALLER_MINOR_VERSION', type: 'number' },
    { name: 'DOMINO_INSTALLER_PATCH_VERSION', type: 'number' },
    { name: 'DOMINO_INSTALLER_FIXPACK_VERSION', type: 'text' },
  ],
};

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
    expect(artifactRowsOf(artifacts, 'fixpack', 'domino').map(row => row.id)).toEqual(['a3']);
    expect(artifactRowsOf(artifacts, 'installer', 'leap').map(row => row.id)).toEqual(['a4']);
    expect(artifactRowsOf(artifacts, 'installer', '')).toEqual([]);
  });

  it('opens an installer on the first row on the host, a fixpack on none', () => {
    const rows = roleArtifactsOf(artifacts, domino, 'installer');
    expect(defaultPickOf(rows, 'installer').id).toBe('a1');
    expect(defaultPickOf([artifacts[0]], 'installer').id).toBe('a2');
    expect(defaultPickOf(rows, 'fixpack')).toBeNull();
    expect(defaultPickOf([], 'installer')).toBeNull();
  });

  it('reads the default file name and major the configuration names for a kind', () => {
    expect(wantedFileOf(domino, 'installer', config)).toEqual({
      filename: 'Domino_14.5_Linux_English.tar',
      major: '14',
    });
    expect(wantedFileOf(domino, 'fixpack', config)).toEqual({ filename: '', major: '' });
    expect(wantedFileOf(domino, 'installer', null)).toEqual({ filename: '', major: '' });
    expect(wantedFileOf({ name: 'x' }, 'installer', config)).toEqual({ filename: '', major: '' });
  });

  it('prefers the present row the default names, then a present row of the default major, then the first present row', () => {
    const present = { ...artifacts[0], id: 'a2p', file_exists: true };
    const older = {
      id: 'a0',
      filename: 'Domino_12.0.2_Linux_English.tar',
      file_type: 'installer',
      role: 'domino',
      version: '12.0.2',
      file_exists: true,
    };
    const named = { filename: 'Domino_14.5_Linux_English.tar', major: '14' };
    expect(defaultPickOf([older, artifacts[1], present], 'installer', named).id).toBe('a2p');
    expect(defaultPickOf([older, artifacts[1], artifacts[0]], 'installer', named).id).toBe('a1');
    expect(
      defaultPickOf([older, artifacts[1]], 'installer', { filename: 'none.tar', major: '15' }).id
    ).toBe('a0');
    expect(defaultPickOf([artifacts[0]], 'installer', named).id).toBe('a2');
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

  it('answers the one full_version text for the string shape and the object shape alike', () => {
    const asText = artifactVersionOf({ version: '14.5' }).full_version;
    const asObject = artifactVersionOf({
      version: {
        major: '14',
        minor: '5',
        patch: '0',
        fix_pack: '',
        ea_access_release: '',
        full_version: '14.5',
      },
    }).full_version;
    expect(asText).toBe('14.5');
    expect(asObject).toBe(asText);
    expect(typeof asObject).toBe('string');
    expect(artifactVersionOf({ version: null }).full_version).toBe('');
    expect(artifactVersionOf({ version: { major: 14 } }).full_version).toBe('');
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

  it('types a value bound for a number field as a number and an empty one as undefined', () => {
    expect(pickAnswersOf(domino, 'installer', artifacts[0], config)).toEqual({
      DOMINO_INSTALLER: 'Domino_14.5_Linux_English.tar',
      DOMINO_HASH: SHA,
      DOMINO_INSTALLER_MAJOR_VERSION: 14,
      DOMINO_INSTALLER_MINOR_VERSION: 5,
      DOMINO_INSTALLER_PATCH_VERSION: 0,
    });
    const bare = pickAnswersOf(domino, 'installer', { filename: 'x.tar', version: '14' }, config);
    expect(bare.DOMINO_INSTALLER_MAJOR_VERSION).toBe(14);
    expect(bare.DOMINO_INSTALLER_MINOR_VERSION).toBeUndefined();
    expect(bare.DOMINO_INSTALLER_PATCH_VERSION).toBeUndefined();
    expect(
      pickAnswersOf(domino, 'installer', null, config).DOMINO_INSTALLER_MAJOR_VERSION
    ).toBeUndefined();
    expect(
      pickAnswersOf(domino, 'fixpack', artifacts[2], config).DOMINO_INSTALLER_FIXPACK_VERSION
    ).toBe('14.0fp3');
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

  it('seeds the installer the configuration names while it is on the host and types its answers by the configuration', () => {
    const rows = [{ name: 'domino_install', enabled: true, files: {}, vars: {} }];
    const present = { ...artifacts[0], id: 'a2p', file_exists: true };
    const seeded = seedRolePicks(rows, [domino], [...artifacts, present], config);
    expect(seeded.roles[0].files.installer).toBe('Domino_14.5_Linux_English.tar');
    expect(seeded.answers).toEqual({
      DOMINO_INSTALLER: 'Domino_14.5_Linux_English.tar',
      DOMINO_HASH: SHA,
      DOMINO_INSTALLER_MAJOR_VERSION: 14,
      DOMINO_INSTALLER_MINOR_VERSION: 5,
      DOMINO_INSTALLER_PATCH_VERSION: 0,
    });
    const major = seedRolePicks(rows, [domino], artifacts, config);
    expect(major.roles[0].files.installer).toBe('Domino_14.0_Linux_English.tar');
    expect(major.answers.DOMINO_INSTALLER_MAJOR_VERSION).toBe(14);
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

  it('writes the spec defaults a row lacks into its vars, never run_tasks, and leaves a row the spec adds nothing to', () => {
    const spec = {
      options: {
        run_tasks: { type: 'bool', default: true },
        domino_user: { type: 'str', default: 'domino' },
        domino_home_dir: { type: 'str', default: '/local/notesdata' },
        domino_organization: { type: 'str', required: true },
      },
    };
    const row = { name: 'domino_install', enabled: true, vars: { domino_user: 'notes' } };
    expect(withSpecDefaults(row, spec)).toEqual({
      ...row,
      vars: { domino_user: 'notes', domino_home_dir: '/local/notesdata' },
    });
    expect(withSpecDefaults({ name: 'x', vars: {} }, spec).vars).toEqual({
      domino_user: 'domino',
      domino_home_dir: '/local/notesdata',
    });
    const settled = { name: 'x', vars: { domino_user: 'a', domino_home_dir: 'b' } };
    expect(withSpecDefaults(settled, spec)).toBe(settled);
    expect(withSpecDefaults(settled, null)).toBe(settled);
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
