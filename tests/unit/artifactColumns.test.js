import { describe, expect, it } from 'vitest';

import { KIND_NAMES } from '../../src/components/common/columnKinds.js';
import { ARTIFACT_COLUMNS } from '../../src/features/hosts/components/ArtifactColumns.jsx';

const columnOf = key => ARTIFACT_COLUMNS.find(column => column.key === key);

const ctx = { t: key => `t:${key}` };

const asText = {
  id: 13,
  filename: 'Domino_14.5_Linux_English.tar',
  file_type: 'installer',
  role: 'domino_install',
  version: '14.5',
  file_exists: true,
};

const asObject = {
  ...asText,
  version: {
    major: '14',
    minor: '5',
    patch: '0',
    fix_pack: 'FP1',
    ea_access_release: '',
    full_version: '14.5.0FP1',
  },
};

describe('ARTIFACT_COLUMNS', () => {
  it('names seven columns, each of a known kind with a value', () => {
    expect(ARTIFACT_COLUMNS).toHaveLength(7);
    ARTIFACT_COLUMNS.forEach(column => {
      expect(KIND_NAMES).toContain(column.kind);
      expect(typeof column.value).toBe('function');
    });
  });

  it('sorts and draws the version as the one text of either shape, a dash for none', () => {
    const version = columnOf('version');
    expect(version.value(asText, ctx)).toBe('14.5');
    expect(version.value(asObject, ctx)).toBe('14.5.0FP1');
    expect(typeof version.value(asObject, ctx)).toBe('string');
    expect(version.value({ ...asText, version: null }, ctx)).toBe('');
    expect(version.render(asObject, ctx).props.children).toBe('14.5.0FP1');
    expect(version.render({ ...asText, version: null }, ctx).props.children).toBe('-');
  });
});
