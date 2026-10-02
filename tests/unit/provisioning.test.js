import { describe, expect, it } from 'vitest';

import {
  PIPELINE_ACTIONS,
  applyPatch,
  clean,
  hookReasonOf,
  invalidNameProblems,
  needsHookConfirmation,
  pipelineOutcome,
  playbookListsOf,
  provisionStatusTone,
  provisionerDocumentOf,
  provisioningGates,
  provisioningRoute,
  requestedActionOf,
  roleHintsOf,
  rowProvisions,
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
  it('seeds the roles editor from the manifest and reads the depends_on hints', () => {
    const version = {
      metadata: {
        roles: [
          { name: 'domino', defaultEnabled: true, depends_on: [] },
          { name: 'traveler', depends_on: ['domino'] },
          { name: 'leap', enabled: true },
          null,
        ],
      },
    };
    expect(seedRoles(version)).toEqual([
      { name: 'domino', enabled: true, files: {} },
      { name: 'traveler', enabled: false, files: {} },
      { name: 'leap', enabled: true, files: {} },
    ]);
    expect(roleHintsOf(version)).toEqual({ domino: [], traveler: ['domino'], leap: [] });
    expect(seedRoles(null)).toEqual([]);
    expect(roleHintsOf({ metadata: {} })).toBeNull();
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
