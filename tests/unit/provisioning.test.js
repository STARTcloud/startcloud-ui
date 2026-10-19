import { describe, expect, it } from 'vitest';

import {
  PIPELINE_ACTIONS,
  applyPatch,
  catalogRoleMatches,
  changedRolesOf,
  clean,
  dependencyWarnings,
  hookReasonOf,
  invalidNameProblems,
  manifestRoleOf,
  manifestRolesOf,
  needsHookConfirmation,
  pipelineOutcome,
  playbookListsOf,
  provisionStatusTone,
  provisionerDocumentOf,
  provisioningGates,
  provisioningRoute,
  requestedActionOf,
  roleHintsOf,
  roleSearchCounts,
  roleSpecOf,
  rowProvisions,
  runRoleMatches,
  seedRoles,
  stripTag,
  structureOf,
  tagRow,
  tagRows,
  textToVar,
  varToText,
  withPlaybookLists,
  yamlProblemPosition,
  yamlProblemText,
} from '../../src/features/hosts/utils/provisioning.js';

const t = (key, values = {}) =>
  `${key}${Object.keys(values).length > 0 ? ` ${JSON.stringify(values)}` : ''}`;

const hostOf = features => ({ capabilities: { hypervisors: ['virtualbox'], features } });

const full = hostOf(['machines', 'provisioning', 'provisioner-registry', 'machine-create']);
const bare = hostOf(['machines']);

const document = {
  provisioner_name: 'startcloud',
  provisioner_version: '0.1.27',
  folders: [{ map: './a', to: '/a' }],
  roles: [{ name: 'startcloud.hcl_roles.domino', vars: { x: 1 } }],
  provisioning: {
    shell: { enabled: true, scripts: ['./a.sh'] },
    pre: [{ script: './pre.sh', target: 'host' }],
    ansible: { playbooks: [{ local: [{ playbook: 'a.yml' }], remote: [] }] },
  },
};

describe('the route and the run', () => {
  it('opens the Provisioning page with the action in run', () => {
    expect(provisioningRoute(1, 'dev 1')).toBe('/hosts/1/machines/dev%201/provisioning');
    expect(provisioningRoute('self', 'web-1', 'run-provisioners')).toBe(
      '/hosts/self/machines/web-1/provisioning?run=run-provisioners'
    );
  });

  it('reads the four actions of run and nothing else', () => {
    PIPELINE_ACTIONS.forEach(action => expect(requestedActionOf(action)).toBe(action));
    expect(requestedActionOf('destroy')).toBe('');
    expect(requestedActionOf(null)).toBe('');
  });
});

describe('the gates', () => {
  it('reads the document from the detail configuration', () => {
    expect(provisionerDocumentOf({ configuration: { provisioner: document } })).toBe(document);
    expect(provisionerDocumentOf({ configuration: { provisioner: 'x' } })).toBeNull();
    expect(provisionerDocumentOf(null)).toBeNull();
  });

  it('offers the pipeline behind provisioning, the rows with a document, the editor to an admin', () => {
    const detail = { configuration: { provisioner: document } };
    expect(provisioningGates({ server: full, detail, role: 'admin' })).toEqual({
      pipeline: true,
      rows: true,
      reshape: true,
      registry: true,
    });
    expect(provisioningGates({ server: full, detail: null, role: 'user' })).toEqual({
      pipeline: true,
      rows: false,
      reshape: false,
      registry: true,
    });
    expect(provisioningGates({ server: bare, detail, role: 'admin' })).toEqual({
      pipeline: false,
      rows: false,
      reshape: false,
      registry: false,
    });
    expect(provisioningGates({ server: null, detail, role: 'admin' }).pipeline).toBe(false);
  });

  it('draws Provision on a row that names its provisioner on a host that lists provisioning', () => {
    const spec = { spec: { provisioner: { name: 'startcloud', version: '1' } } };
    const zone = { configuration: { provisioner: { provisioner_name: 'startcloud' } } };
    expect(rowProvisions({ server: full, machine: spec, role: 'user' })).toBe(true);
    expect(rowProvisions({ server: full, machine: zone, role: 'admin' })).toBe(true);
    expect(rowProvisions({ server: full, machine: { spec: null }, role: 'admin' })).toBe(false);
    expect(rowProvisions({ server: bare, machine: spec, role: 'admin' })).toBe(false);
    expect(rowProvisions({ server: full, machine: spec, role: 'guest' })).toBe(false);
  });
});

describe('the playbook lists', () => {
  it('reads the first group whether wrapped in a list or bare', () => {
    expect(playbookListsOf(document)).toEqual({ local: [{ playbook: 'a.yml' }], remote: [] });
    expect(
      playbookListsOf({ provisioning: { ansible: { playbooks: { remote: [{ playbook: 'r' }] } } } })
    ).toEqual({ local: [], remote: [{ playbook: 'r' }] });
    expect(playbookListsOf({})).toEqual({ local: [], remote: [] });
  });

  it('writes the lists back in the wrapping it found and grows no empty key', () => {
    const written = withPlaybookLists(document, { local: [{ playbook: 'b.yml' }], remote: [] });
    expect(written.provisioning.ansible.playbooks).toEqual([
      { local: [{ playbook: 'b.yml' }], remote: [] },
    ]);
    const bareGroup = withPlaybookLists({}, { local: [{ playbook: 'c' }], remote: [] });
    expect(bareGroup.provisioning.ansible.playbooks).toEqual({ local: [{ playbook: 'c' }] });
    const several = {
      provisioning: { ansible: { playbooks: [{ local: [] }, { local: [{ playbook: 'z' }] }] } },
    };
    expect(
      withPlaybookLists(several, { local: [], remote: [{ playbook: 'r' }] }).provisioning.ansible
        .playbooks
    ).toEqual([{ local: [], remote: [{ playbook: 'r' }] }, { local: [{ playbook: 'z' }] }]);
  });
});

describe('the tagged rows', () => {
  it('tags every row with an identity of its own and strips it again', () => {
    const one = tagRow({ a: 1 });
    const two = tagRow({ a: 2 });
    expect(one._ui_id).not.toBe(two._ui_id);
    expect(stripTag(one)).toEqual({ a: 1 });
  });

  it('tags the folders, the roles, the playbooks and the hooks and wraps the scripts', () => {
    const tagged = tagRows(document);
    expect(tagged.folders[0]._ui_id).toBeDefined();
    expect(tagged.roles[0]._ui_id).toBeDefined();
    expect(tagged.provisioning.ansible.playbooks[0].local[0]._ui_id).toBeDefined();
    expect(tagged.provisioning.pre[0]._ui_id).toBeDefined();
    expect(tagged.provisioning.shell.scripts[0]).toMatchObject({ script: './a.sh' });
    expect(clean(tagged)).toEqual(document);
    expect(clean(tagRows({}))).toEqual({});
  });

  it('applies a patch, an undefined value deleting its key', () => {
    expect(applyPatch({ a: 1, b: 2 }, { a: undefined, c: 3 })).toEqual({ b: 2, c: 3 });
  });
});

describe('the names Store refuses', () => {
  it('names a variable that is no identifier and a role name that is no name', () => {
    const problems = invalidNameProblems(
      {
        vars: { 'bad-name': 1, good: 2 },
        roles: [{ name: 'bad role', vars: { 'x-y': 1 } }, { name: '' }, { name: 'ok.role' }],
      },
      t
    );
    expect(problems).toHaveLength(4);
    expect(problems[0]).toContain('"key":"bad-name"');
    expect(problems[1]).toContain('bad role');
    expect(invalidNameProblems({ vars: { a: 1 }, roles: [{ name: 'a.b' }] }, t)).toEqual([]);
  });
});

describe('the variable text', () => {
  it('draws a string as it is and everything else as JSON, and reads JSON back where it parses', () => {
    expect(varToText('a')).toBe('a');
    expect(varToText([1, 2])).toBe('[1,2]');
    expect(textToVar('[1,2]')).toEqual([1, 2]);
    expect(textToVar('plain')).toBe('plain');
    expect(structureOf('{"a":1}')).toEqual({ a: 1 });
    expect(structureOf('3')).toBeNull();
    expect(structureOf('x')).toBeNull();
  });
});

describe('the roles of a version', () => {
  const version = {
    metadata: {
      roles: [
        { name: 'domino', label: 'Domino Server', default_enabled: true, depends_on: [] },
        { name: 'traveler', default_enabled: false, depends_on: ['domino'] },
        { name: 'leap', enabled: true },
        { name: 'networking', defaultEnabled: true },
        null,
      ],
    },
  };

  it('lists the manifest roles in their order and finds one by its bare name', () => {
    expect(manifestRolesOf(version).map(role => role.name)).toEqual([
      'domino',
      'traveler',
      'leap',
      'networking',
    ]);
    expect(manifestRolesOf(null)).toEqual([]);
    expect(manifestRoleOf(manifestRolesOf(version), 'startcloud.hcl_roles.domino')).toMatchObject({
      label: 'Domino Server',
    });
    expect(manifestRoleOf(manifestRolesOf(version), 'other')).toBeNull();
  });

  it('seeds the roles editor from default_enabled alone, in manifest order, with no file and no variable', () => {
    expect(seedRoles(version)).toEqual([
      { name: 'domino', enabled: true, files: {}, vars: {} },
      { name: 'traveler', enabled: false, files: {}, vars: {} },
      { name: 'leap', enabled: false, files: {}, vars: {} },
      { name: 'networking', enabled: false, files: {}, vars: {} },
    ]);
    expect(roleHintsOf(version)).toEqual({
      domino: [],
      traveler: ['domino'],
      leap: [],
      networking: [],
    });
    expect(seedRoles(null)).toEqual([]);
    expect(roleHintsOf({ metadata: {} })).toBeNull();
  });

  it('names the rows whose switch differs from the provisioner default, a row without enabled reading as on', () => {
    const manifest = manifestRolesOf(version);
    expect(
      changedRolesOf(
        [
          { name: 'domino', enabled: false },
          { name: 'startcloud.hcl_roles.traveler' },
          { name: 'leap', enabled: false },
          { name: 'custom.role', enabled: true },
        ],
        manifest
      ).map(row => row.name)
    ).toEqual(['domino', 'startcloud.hcl_roles.traveler']);
    expect(changedRolesOf([{ name: 'domino', enabled: true }], manifest)).toEqual([]);
  });

  it('warns a role that is on of a dependency absent, below or off, and a role that is off of nothing', () => {
    const hints = { traveler: ['domino', 'genesis'], domino: [], leap: ['traveler'] };
    const rows = [
      { name: 'startcloud.hcl_roles.leap', enabled: true },
      { name: 'domino', enabled: false },
      { name: 'traveler', enabled: true },
    ];
    expect(dependencyWarnings(rows, hints, 2)).toEqual([
      { dep: 'domino', kind: 'off' },
      { dep: 'genesis', kind: 'absent' },
    ]);
    expect(dependencyWarnings(rows, hints, 0)).toEqual([{ dep: 'traveler', kind: 'below' }]);
    expect(dependencyWarnings(rows, hints, 1)).toEqual([]);
    expect(dependencyWarnings([{ name: 'traveler', enabled: false }], hints, 0)).toEqual([]);
    expect(dependencyWarnings([{ name: 'traveler' }], hints, 0)).toEqual([
      { dep: 'domino', kind: 'absent' },
      { dep: 'genesis', kind: 'absent' },
    ]);
    expect(dependencyWarnings(rows, null, 2)).toEqual([]);
    expect(dependencyWarnings(rows, hints, 7)).toEqual([]);
  });
});

describe('the roles search', () => {
  const specs = {
    domino: { collection: 'startcloud.hcl_roles', short_description: 'Installs HCL Domino' },
    traveler: {
      collection: 'startcloud.hcl_roles',
      short_description: 'Installs HCL Traveler on a Domino server',
    },
    networking: { collection: 'startcloud.startcloud_roles', short_description: 'Guest network' },
  };
  const manifest = [{ name: 'domino', label: 'Domino Server', description: 'The mail server' }];

  it('reads the spec of a bare or matching dotted name and none of another collection', () => {
    expect(roleSpecOf(specs, 'domino')).toBe(specs.domino);
    expect(roleSpecOf(specs, 'startcloud.hcl_roles.domino')).toBe(specs.domino);
    expect(roleSpecOf(specs, 'other.coll.domino')).toBeNull();
    expect(roleSpecOf(null, 'domino')).toBeNull();
    expect(roleSpecOf(specs, 'leap')).toBeNull();
  });

  it('matches a catalog entry by its name and its description and every entry for no needle', () => {
    expect(catalogRoleMatches('traveler', specs.traveler, 'domino server')).toBe(true);
    expect(catalogRoleMatches('domino', specs.domino, 'domino server')).toBe(false);
    expect(catalogRoleMatches('networking', specs.networking, 'netw')).toBe(true);
    expect(catalogRoleMatches('networking', specs.networking, '')).toBe(true);
  });

  it('matches a role of the run by its name, its label and the descriptions', () => {
    const role = { name: 'startcloud.hcl_roles.domino' };
    const found = { manifestRole: manifest[0], spec: specs.domino };
    expect(runRoleMatches(role, found, 'domino server')).toBe(true);
    expect(runRoleMatches(role, found, 'mail')).toBe(true);
    expect(runRoleMatches(role, found, 'hcl_roles')).toBe(true);
    expect(runRoleMatches(role, found, 'leap')).toBe(false);
    expect(runRoleMatches({ name: 'x' }, { manifestRole: null, spec: null }, '')).toBe(true);
  });

  it('counts the catalog and the run a needle matches', () => {
    const roles = [{ name: 'startcloud.hcl_roles.domino' }, { name: 'custom.role' }];
    expect(roleSearchCounts({ specs, roles, manifest, needle: 'domino' })).toEqual({
      matched: 3,
      total: 5,
    });
    expect(roleSearchCounts({ specs: null, roles, manifest: [], needle: '' })).toEqual({
      matched: 2,
      total: 2,
    });
  });
});

describe('the answers of the pipeline', () => {
  it('reports a queued task with its steps and the skipped suffix', () => {
    const outcome = pipelineOutcome(
      { message: 'Queued', parent_task_id: 'p1', steps: 3, playbooks_skipped: ['a.yml'] },
      'dev-1',
      t
    );
    expect(outcome.nothing).toBe('');
    expect(outcome.parts).toEqual([
      'Queued',
      'provisioning.machineProvisioning.taskWithSteps {"id":"p1","steps":3}',
      'provisioning.machineProvisioning.skippedSuffix {"skipped":"a.yml"}',
    ]);
    expect(outcome.task).toMatchObject({ id: 'p1', machine_name: 'dev-1' });
  });

  it('reports a no-op that skipped everything and queued no task', () => {
    const outcome = pipelineOutcome({ playbooks_skipped: [{ playbook: 'a.yml' }] }, 'dev-1', t);
    expect(outcome.nothing).toBe(
      'provisioning.machineProvisioning.nothingToRun {"skipped":"a.yml"}'
    );
    expect(outcome.task).toBeNull();
  });

  it('falls back to the queued word for an answer without a message or a task', () => {
    const outcome = pipelineOutcome({}, 'dev-1', t);
    expect(outcome.parts).toEqual(['provisioning.machineProvisioning.queued']);
    expect(outcome.task).toBeNull();
  });

  it('tells the host-hooks refusal apart and reads its reason', () => {
    const refusal = { status: 409, data: { needs_confirmation: true, reason: 'Hooks' } };
    expect(needsHookConfirmation(refusal)).toBe(true);
    expect(hookReasonOf(refusal)).toBe('Hooks');
    expect(needsHookConfirmation({ status: 409, data: {} })).toBe(false);
    expect(needsHookConfirmation({ status: 400, data: { needs_confirmation: true } })).toBe(false);
    expect(hookReasonOf({ message: 'Refused' })).toBe('Refused');
  });

  it('draws the status in its tone', () => {
    expect(provisionStatusTone('provisioned')).toBe('success');
    expect(provisionStatusTone('not_started')).toBe('warning');
  });
});

describe('a refused YAML', () => {
  it('names the line and the column where the agent does', () => {
    const error = { data: { error: 'Bad', line: 3, column: 7 } };
    expect(yamlProblemPosition(error)).toEqual({ line: 3, column: 7 });
    expect(yamlProblemPosition({ data: { error: 'Bad', line: 3 } })).toEqual({
      line: 3,
      column: 0,
    });
    expect(yamlProblemPosition({ data: { error: 'Bad' } })).toBeNull();
    expect(yamlProblemText(error, t)).toBe(
      'Bad provisioning.hostsYmlModal.lineColumnSuffix {"line":3,"column":7}'
    );
    expect(yamlProblemText({ data: { error: 'Bad', line: 2 } }, t)).toBe(
      'Bad provisioning.hostsYmlModal.lineSuffix {"line":2}'
    );
    expect(yamlProblemText({ message: 'Down' }, t)).toBe('Down');
  });
});
