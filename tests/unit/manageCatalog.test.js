import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_TYPES,
  artifactFiltersOf,
  artifactStatusOf,
  buildSteps,
  buildVariables,
  componentDetail,
  componentHealth,
  downloadBody,
  formatPackageSize,
  formatSize,
  hclBody,
  hclProblem,
  importBody,
  importProblem,
  installedKeysOf,
  locationBody,
  locationNeedsRole,
  locationProblem,
  matchesArtifact,
  matchesPackage,
  matchesProvisioner,
  matchesRecipe,
  matchesTemplate,
  packageActionBody,
  packageActionOf,
  packageBadgeOf,
  packageDetailRows,
  packageStatuses,
  pullBody,
  pullFormOf,
  pullProblem,
  recipeBody,
  recipeFormOf,
  recipeProblem,
  recipeTestBody,
  recipesOf,
  referencingMachinesOf,
  registerBody,
  roleOptionsOf,
  searchRowsOf,
  secretNamesOf,
  seedStepRows,
  seedVariableRows,
  sourceDefaultPatch,
  sourceEntryPatch,
  sourceFieldErrorsOf,
  sourceProblem,
  sourceRemovePatch,
  sourceTogglePatch,
  sourcesPatch,
  tableStateOf,
  targetProblem,
  templateKey,
  templateLabel,
  templatePublishBody,
  templatePublishProblem,
  transferOptionsOf,
  uploadPrepareBody,
  versionNewer,
} from '../../src/features/hosts/utils/manageCatalog.js';

const LOCATIONS = [
  { id: 'iso', name: 'ISO', type: 'iso', enabled: true },
  { id: 'inst', name: 'Installers', type: 'installer', enabled: true },
  { id: 'old', name: 'Old', type: 'iso', enabled: false },
];

describe('the sizes and the table state', () => {
  it('formats a size as hyperweaver-ui did and names the table state', () => {
    expect(formatSize(0)).toBe('-');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(3 * 1024 ** 3)).toBe('3.0 GB');
    expect(tableStateOf({ loaded: false, failed: false, filtering: false, rows: 0 })).toBe(
      'loading'
    );
    expect(tableStateOf({ loaded: true, failed: true, filtering: false, rows: 0 })).toBe('failed');
    expect(tableStateOf({ loaded: true, failed: false, filtering: false, rows: 2 })).toBe('rows');
    expect(tableStateOf({ loaded: true, failed: false, filtering: true, rows: 0 })).toBe(
      'filtered'
    );
    expect(tableStateOf({ loaded: true, failed: false, filtering: false, rows: 0 })).toBe('empty');
  });
});

describe('the installer files', () => {
  it('knows the five types and which locations store per role', () => {
    expect(ARTIFACT_TYPES).toEqual(['iso', 'image', 'installer', 'fixpack', 'hotfix']);
    expect(locationNeedsRole(LOCATIONS, 'inst')).toBe(true);
    expect(locationNeedsRole(LOCATIONS, 'iso')).toBe(false);
    expect(locationNeedsRole(LOCATIONS, 'none')).toBe(false);
  });

  it('refuses a target without a location and a role-less installer target', () => {
    expect(targetProblem(LOCATIONS, '', '')).toBe('host.installerFilesModals.pickStorageLocation');
    expect(targetProblem(LOCATIONS, 'inst', ' ')).toBe('host.installerFilesModals.roleRequired');
    expect(targetProblem(LOCATIONS, 'inst', 'domino')).toBe('');
    expect(targetProblem(LOCATIONS, 'iso', '')).toBe('');
  });

  it('reads the five states of an artifact', () => {
    expect(artifactStatusOf({ file_exists: false }).key).toBe('missing');
    expect(
      artifactStatusOf({ checksum_verified: false, checksum: 'a', expected_sha256: 'b' })
    ).toEqual({ key: 'mismatch', tone: 'danger', values: { checksum: 'a', expected: 'b' } });
    expect(artifactStatusOf({ checksum_verified: true }).key).toBe('verified');
    expect(artifactStatusOf({ checksum: null }).key).toBe('unhashed');
    expect(artifactStatusOf({ checksum: 'abc' }).key).toBe('hashed');
  });

  it('builds the location bodies and refuses an empty one', () => {
    const form = { name: ' Images ', path: ' /rpool/images ', type: 'image', enabled: false };
    expect(locationBody(form, false)).toEqual({
      name: 'Images',
      path: '/rpool/images',
      type: 'image',
      enabled: false,
    });
    expect(locationBody(form, true)).toEqual({ name: 'Images', enabled: false });
    expect(locationProblem({ name: '', path: '/x', type: 'iso', enabled: true }, false)).toBe(
      'host.installerFiles.locationNamePathRequired'
    );
    expect(locationProblem({ name: 'x', path: '', type: 'iso', enabled: true }, true)).toBe('');
  });

  it('offers the other locations of the same type, reads the roles and the query', () => {
    expect(
      transferOptionsOf(LOCATIONS, { file_type: 'iso', storage_location_id: 'iso' }).map(l => l.id)
    ).toEqual(['old']);
    expect(
      transferOptionsOf(LOCATIONS, { file_type: 'iso', storage_location: { id: 'iso' } }).map(
        l => l.id
      )
    ).toEqual(['old']);
    expect(roleOptionsOf([{ role: 'b' }, { role: 'a' }, { role: '' }, { role: 'b' }])).toEqual([
      'a',
      'b',
    ]);
    expect(artifactFiltersOf({ type: 'iso', storage_path_id: '', limit: 200 })).toEqual({
      limit: 200,
      offset: 0,
      type: 'iso',
    });
  });

  it('builds the upload, register, download and HCL bodies hyperweaver-ui sent', () => {
    const file = { name: 'a.iso', size: 12 };
    expect(
      uploadPrepareBody(file, { locationId: 'iso', role: '', checksum: ' abc ', overwrite: true })
    ).toEqual({
      filename: 'a.iso',
      size: 12,
      storage_path_id: 'iso',
      overwrite_existing: true,
      checksum: 'abc',
    });
    expect(registerBody({ locationId: 'inst', role: 'domino', path: ' /p ', move: false })).toEqual(
      {
        path: '/p',
        storage_path_id: 'inst',
        move: false,
        role: 'domino',
      }
    );
    expect(
      downloadBody({
        locationId: 'iso',
        role: '',
        url: ' https://x/y.iso ',
        filename: '',
        checksum: '',
        overwrite: false,
        resourceName: 'creds',
      })
    ).toEqual({
      url: 'https://x/y.iso',
      storage_path_id: 'iso',
      overwrite_existing: false,
      resource_name: 'creds',
    });
    expect(hclBody({ keyName: 'k', filename: 'f', role: 'r', kind: 'fixpack' })).toEqual({
      key_name: 'k',
      filename: 'f',
      role: 'r',
      kind: 'fixpack',
    });
    expect(hclProblem({ keyName: '', filename: 'f', role: 'r' })).toBe(
      'host.installerFilesModals.hclFieldsRequired'
    );
    expect(hclProblem({ keyName: 'k', filename: 'f', role: 'r' })).toBe('');
  });

  it('reads the secrets names, null while the document could not be read', () => {
    expect(secretNamesOf({ git_api_keys: [{ name: 'a' }] }, 'git_api_keys')).toEqual(['a']);
    expect(secretNamesOf({}, 'git_api_keys')).toEqual([]);
    expect(secretNamesOf(null, 'git_api_keys')).toBeNull();
  });

  it('matches an artifact by its name, type, role, version and location', () => {
    const row = {
      filename: 'Domino.tar',
      file_type: 'installer',
      role: 'domino_install',
      version: '14.5',
      storage_location: { name: 'HCL' },
    };
    expect(matchesArtifact(row, 'domino')).toBe(true);
    expect(matchesArtifact(row, 'hcl')).toBe(true);
    expect(matchesArtifact(row, 'iso')).toBe(false);
  });
});

describe('the packages', () => {
  it('names the statuses, the badge and the action of a package', () => {
    expect(packageStatuses({ installed: true, frozen: true, manually_installed: true })).toEqual([
      'installed',
      'frozen',
      'manual',
    ]);
    expect(packageStatuses({ installed: false })).toEqual([]);
    expect(packageBadgeOf({ installed: true, manually_installed: true }, false).key).toBe('manual');
    expect(packageBadgeOf({ installed: true }, false).key).toBe('installed');
    expect(packageBadgeOf({ frozen: true }, false).key).toBe('frozen');
    expect(packageBadgeOf({}, true).key).toBe('available');
    expect(packageBadgeOf({}, false).key).toBe('notInstalled');
    expect(packageActionOf({ installed: true, frozen: false })).toBe('uninstall');
    expect(packageActionOf({ installed: true, frozen: true })).toBe('');
    expect(packageActionOf({ installed: false })).toBe('install');
  });

  it('formats a size, shapes the search hits and the action body', () => {
    expect(formatPackageSize('2.61 MB')).toBe('2.61 MB');
    expect(formatPackageSize(50331648)).toBe('48.00 MB');
    expect(formatPackageSize(2048)).toBe('2.00 KB');
    expect(formatPackageSize(12)).toBe('12 B');
    expect(formatPackageSize('')).toBe('');
    expect(formatPackageSize('odd')).toBe('odd');
    const rows = searchRowsOf([
      { index: 'pkg.fmri', package: 'pkg:/ooce/text/vim@9.1' },
      { index: 'pkg.description', package: 'pkg:/ooce/text/vim@9.1' },
      { index: 'pkg.fmri', package: 'pkg:/ooce/text/vim@9.1' },
      { index: 'pkg.fmri', package: 'pkg:/ooce/editor/nano@8' },
    ]);
    expect(rows.map(row => row.name)).toEqual(['ooce/text/vim', 'ooce/editor/nano']);
    expect(rows[0]).toMatchObject({ publisher: 'Available', version: 'Latest', remote: true });
    expect(searchRowsOf(null)).toEqual([]);
    expect(packageActionBody('vim', { dryRun: true, acceptLicenses: false, beName: '' })).toEqual({
      packages: ['vim'],
      dry_run: true,
      accept_licenses: false,
      be_name: '',
    });
  });

  it('reads a detail as text lines and as an object', () => {
    expect(packageDetailRows('Name: vim\nOdd line\n')).toEqual([
      { label: 'Name', value: 'vim' },
      { label: 'Info', value: 'Odd line' },
    ]);
    expect(packageDetailRows({ install_size: 12, deps: ['a'] })).toEqual([
      { label: 'Install Size', value: '12' },
      { label: 'Deps', value: '[\n  "a"\n]' },
    ]);
    expect(packageDetailRows(null)).toEqual([]);
    expect(matchesPackage({ name: 'pkg:/a', publisher: 'ooce', version: '1' }, 'ooce')).toBe(true);
  });
});

describe('the recipes', () => {
  it('seeds and builds the steps and the variables', () => {
    const rows = seedStepRows([
      { type: 'wait', pattern: 'login:' },
      { type: 'delay', seconds: 5 },
      { type: 'odd' },
    ]);
    expect(rows.map(row => row.type)).toEqual(['wait', 'delay', 'command']);
    expect(rows[1].seconds).toBe('5');
    expect(buildSteps(rows.slice(0, 2))).toEqual([
      { type: 'wait', pattern: 'login:' },
      { type: 'delay', seconds: 5 },
    ]);
    expect(buildVariables(seedVariableRows({ a: 1, b: 'x' }))).toEqual({ a: '1', b: 'x' });
    expect(buildVariables([{ key: 'k', name: ' ', value: 'v' }])).toEqual({});
  });

  it('opens the form on a recipe or on the defaults and refuses a nameless or stepless one', () => {
    expect(recipeFormOf(null)).toMatchObject({
      osFamily: 'linux',
      brand: 'bhyve',
      timeoutSeconds: '',
    });
    expect(recipeFormOf({ name: 'r', timeout_seconds: 30, is_default: true })).toMatchObject({
      name: 'r',
      timeoutSeconds: '30',
      isDefault: true,
    });
    expect(recipeProblem(recipeFormOf(null), [])).toBe('host.recipeEditModal.nameRequired');
    expect(recipeProblem(recipeFormOf({ name: 'r' }), [])).toBe(
      'host.recipeEditModal.stepRequired'
    );
  });

  it('builds the recipe body, the test body and reads the list', () => {
    const form = { ...recipeFormOf({ name: 'r' }), description: 'd', timeoutSeconds: '9' };
    const body = recipeBody(form, seedStepRows([{ type: 'command', value: 'ls' }]), []);
    expect(body).toEqual({
      name: 'r',
      os_family: 'linux',
      brand: 'bhyve',
      is_default: false,
      steps: [{ type: 'command', value: 'ls' }],
      variables: {},
      description: 'd',
      timeout_seconds: 9,
    });
    expect(
      recipeTestBody({
        machineName: 'db-1',
        variableRows: [{ key: 'k', name: 'a', value: 'b' }],
        dryRun: true,
      })
    ).toEqual({ machine_name: 'db-1', variables: { a: 'b' }, dry_run: true });
    expect(recipeTestBody({ machineName: 'db-1', variableRows: [], dryRun: false })).toEqual({
      machine_name: 'db-1',
    });
    expect(recipesOf([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(recipesOf({ recipes: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(recipesOf(null)).toEqual([]);
    expect(matchesRecipe({ name: 'debian', os_family: 'linux', brand: 'bhyve' }, 'lx')).toBe(false);
  });
});

describe('the templates', () => {
  const sources = [
    { id: 'mirror', name: 'Mirror', url: 'https://m', enabled: true, default: false },
    { id: 'boxvault', name: 'BoxVault', url: 'https://b', enabled: true, default: true },
  ];

  const sourceForm = {
    name: ' new ',
    displayName: ' New ',
    url: ' https://n ',
    isDefault: true,
    auth_token: '',
    ca_file: '',
  };

  it('keys and labels a template and builds the pull body', () => {
    const row = { organization: 'o', box_name: 'b', version: '1', architecture: 'amd64' };
    expect(templateKey(row)).toBe('o/b/1/amd64');
    expect(templateLabel(row)).toBe('o/b 1');
    expect(
      pullBody({ organization: 'o', boxName: 'b', version: '1', architecture: '' }, 'boxvault')
    ).toEqual({ organization: 'o', box_name: 'b', version: '1', source_name: 'boxvault' });
    expect(pullProblem({ organization: 'o', boxName: 'b', version: '', architecture: '' })).toBe(
      'hosts.manage.templates.pullRequired'
    );
    expect(
      pullFormOf({
        organization: 'o',
        boxName: 'b',
        versions: ['2', '1'],
        architectures: ['arm64'],
      })
    ).toEqual({ organization: 'o', boxName: 'b', version: '2', architecture: 'arm64' });
  });

  it('builds the publish body and refuses an incomplete one', () => {
    const form = {
      machine: 'm',
      source: 's',
      organization: 'o',
      boxName: 'b',
      version: '1',
      description: '',
      architecture: 'amd64',
    };
    expect(templatePublishBody(form)).toEqual({
      machine_name: 'm',
      source_name: 's',
      organization: 'o',
      box_name: 'b',
      version: '1',
      architecture: 'amd64',
    });
    expect(templatePublishProblem({ ...form, source: '' })).toBe(
      'hosts.manage.templates.publishRequired'
    );
    expect(templatePublishProblem(form)).toBe('');
  });

  it('adds a registry as one merge patch under its id, the default moved off the one that held it', () => {
    expect(sourceEntryPatch(sources, sourceForm, '')).toEqual(
      sourcesPatch({
        boxvault: { default: false },
        new: { display_name: 'New', url: 'https://n', default: true },
      })
    );
    const kept = sourceEntryPatch(sources, { ...sourceForm, isDefault: false }, '');
    expect(kept.template_sources.sources).toEqual({
      new: { display_name: 'New', url: 'https://n', default: false },
    });
  });

  it('edits a registry with the typed credentials alone, a new id removing the old entry', () => {
    const edited = sourceEntryPatch(
      sources,
      { ...sourceForm, name: 'boxvault', isDefault: false, auth_token: ' t ', ca_file: '/ca' },
      'boxvault'
    );
    expect(edited.template_sources.sources).toEqual({
      boxvault: {
        display_name: 'New',
        url: 'https://n',
        default: false,
        auth_token: 't',
        ca_file: '/ca',
      },
    });
    const renamed = sourceEntryPatch(sources, { ...sourceForm, name: 'vault' }, 'boxvault');
    expect(renamed.template_sources.sources).toEqual({
      boxvault: null,
      vault: { display_name: 'New', url: 'https://n', default: true },
    });
  });

  it('toggles, defaults and removes a registry, each one patch of the map', () => {
    expect(sourceTogglePatch(sources[0])).toEqual(sourcesPatch({ mirror: { enabled: false } }));
    expect(sourceTogglePatch({ name: 'mirror', enabled: false })).toEqual(
      sourcesPatch({ mirror: { enabled: true } })
    );
    expect(sourceDefaultPatch(sources, sources[0])).toEqual(
      sourcesPatch({ boxvault: { default: false }, mirror: { default: true } })
    );
    expect(sourceDefaultPatch(sources, sources[1])).toEqual(
      sourcesPatch({ boxvault: { default: true } })
    );
    expect(sourceRemovePatch(sources[0])).toEqual(sourcesPatch({ mirror: null }));
  });

  it('keys a row that carries no id by its own name, as its agent answers it', () => {
    const zones = [
      { name: 'mirror', url: 'https://m', enabled: true, default: false },
      { name: 'boxvault', url: 'https://b', enabled: true, default: true },
    ];
    expect(sourceDefaultPatch(zones, zones[0])).toEqual(
      sourcesPatch({ boxvault: { default: false }, mirror: { default: true } })
    );
    expect(sourceRemovePatch(zones[1])).toEqual(sourcesPatch({ boxvault: null }));
  });

  it('lays each entry of a refused save on the form field its pointer names', () => {
    const error = {
      fieldErrors: [
        {
          pointer: '/template_sources/sources/boxvault/url',
          rule: 'format',
          params: { format: 'uri' },
        },
        { pointer: '/template_sources/sources/boxvault/url', rule: 'required', params: {} },
        { pointer: '/template_sources/sources/boxvault/display_name', rule: 'required' },
        { pointer: '/template_sources/sources/mirror/url', rule: 'format', params: {} },
      ],
    };
    expect(sourceFieldErrorsOf(error, 'boxvault')).toEqual({
      url: { rule: 'format', params: { format: 'uri' } },
      displayName: { rule: 'required', params: {} },
    });
    expect(
      sourceFieldErrorsOf(
        {
          fieldErrors: [
            { pointer: '/template_sources/sources', rule: 'propertyNames', params: { key: 'Bad' } },
          ],
        },
        'Bad'
      )
    ).toEqual({ name: { rule: 'propertyNames', params: { key: 'Bad' } } });
    expect(
      sourceFieldErrorsOf(
        {
          fieldErrors: [
            {
              pointer: '/template_sources/sources/new',
              rule: 'required',
              params: { required: ['display_name', 'url'] },
            },
          ],
        },
        'new'
      )
    ).toEqual({
      displayName: { rule: 'required', params: {} },
      url: { rule: 'required', params: {} },
    });
    expect(sourceFieldErrorsOf(null, 'new')).toEqual({});
  });

  it('refuses a registry without an id, a URL or a display name, and an id outside the key rule', () => {
    expect(sourceProblem({ ...sourceForm, url: '' })).toBe('hosts.manage.templates.sourceRequired');
    expect(sourceProblem({ ...sourceForm, name: 'vagrant-cloud' })).toBe(
      'hosts.manage.templates.sourceIdInvalid'
    );
    expect(sourceProblem({ ...sourceForm, displayName: ' ' })).toBe(
      'hosts.manage.templates.sourceDisplayNameRequired'
    );
    expect(sourceProblem(sourceForm)).toBe('');
    expect(matchesTemplate({ organization: 'o', box_name: 'debian13', version: '1' }, 'deb')).toBe(
      true
    );
  });
});

describe('the provisioners', () => {
  const families = [
    { name: 'startcloud', versions: [{ version: '0.1.27' }, { version: '0.1.26' }] },
    { name: 'dev', versions: [{ version: '2.0.0-dev' }] },
  ];

  it('compares dotted versions', () => {
    expect(versionNewer('0.1.28', '0.1.27')).toBe(true);
    expect(versionNewer('0.1.27', '0.1.27')).toBe(false);
    expect(versionNewer('1.0', '1.0.1')).toBe(false);
    expect(versionNewer('1.b', '1.a')).toBe(true);
  });

  it('keys the installed versions and builds the import body', () => {
    expect([...installedKeysOf(families)]).toEqual([
      'startcloud/0.1.27',
      'startcloud/0.1.26',
      'dev/2.0.0-dev',
    ]);
    expect(
      importBody({ sourceType: 'git', path: '', url: ' u ', branch: 'b', tokenName: '' })
    ).toEqual({
      source_type: 'git',
      url: 'u',
      branch: 'b',
    });
    expect(
      importBody({ sourceType: 'folder', path: '/p', url: '', branch: '', tokenName: '' })
    ).toEqual({
      source_type: 'folder',
      path: '/p',
    });
    expect(importProblem({ sourceType: 'git', url: '', path: '' })).toBe(
      'host.provisionerManagement.repoUrlRequired'
    );
    expect(importProblem({ sourceType: 'archive', url: '', path: '' })).toBe(
      'host.provisionerManagement.pathRequired'
    );
  });

  it('reads the machines a refused delete names and matches a family', () => {
    expect(referencingMachinesOf({ status: 409, data: { machines: ['a'] } })).toEqual(['a']);
    expect(referencingMachinesOf({ status: 400, data: { machines: ['a'] } })).toEqual([]);
    expect(referencingMachinesOf(null)).toEqual([]);
    expect(
      matchesProvisioner(
        {
          name: 'startcloud',
          metadata: { label: 'STARTcloud' },
          versions: [{ version: '0.1.27' }],
        },
        '0.1.2'
      )
    ).toBe(true);
  });
});

describe('the provisioning network', () => {
  it('reads a component health and its detail', () => {
    expect(componentHealth(true)).toBe('ok');
    expect(componentHealth(false)).toBe('bad');
    expect(componentHealth({ exists: true, up: true })).toBe('ok');
    expect(componentHealth({ exists: true, up: false })).toBe('bad');
    expect(componentHealth({ name: 'x' })).toBe('unknown');
    expect(componentHealth('x')).toBe('unknown');
    expect(componentDetail(true)).toEqual({ key: 'host.provisioningNetworkPanel.ok' });
    expect(componentDetail({ a: 1, b: true })).toEqual({ text: 'a: 1 · b: true' });
    expect(componentDetail(4)).toEqual({ text: '4' });
  });
});
