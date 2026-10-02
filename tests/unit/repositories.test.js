import { describe, expect, it } from 'vitest';

import {
  ADD_REPOSITORY_FORM,
  REPOSITORY_FILTERS,
  REPOSITORY_PARAMS,
  addRepositoryBody,
  addRepositoryProblem,
  editRepositoryBody,
  editRepositoryFormOf,
  formatLocation,
  isEnabled,
  matchesRepository,
  repositoryKey,
  repositoryParams,
  repositoryStatus,
  repositoryType,
  usesProxy,
} from '../../src/features/hosts/utils/repositories.js';

describe('the query and the rows', () => {
  it('sends each filter only where set', () => {
    expect(repositoryParams(REPOSITORY_PARAMS)).toEqual({});
    expect(repositoryParams({ enabledOnly: true, publisher: 'omnios', type: 'origin' })).toEqual({
      enabled_only: true,
      publisher: 'omnios',
    });
  });

  it('reads the status, the type and the proxy', () => {
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ enabled: false })).toBe(false);
    expect(repositoryStatus({ status: 'online' })).toMatchObject({
      status: 'online',
      tone: 'success',
    });
    expect(repositoryStatus({ status: 'online', enabled: false }).status).toBe('disabled');
    expect(repositoryStatus({ status: 'offline' }).tone).toBe('danger');
    expect(repositoryType('origin')).toEqual({
      key: 'host.repositoryTable.origin',
      text: '',
      tone: 'primary',
    });
    expect(repositoryType('Mirror').tone).toBe('info');
    expect(repositoryType('odd')).toEqual({ key: '', text: 'odd', tone: 'secondary' });
    expect(repositoryType('').key).toBe('host.repositoryTable.unknown');
    expect(usesProxy('T')).toBe(true);
    expect(usesProxy(true)).toBe(true);
    expect(usesProxy('F')).toBe(false);
  });

  it('cuts a location and keys a row', () => {
    expect(formatLocation('')).toBe('N/A');
    expect(formatLocation('https://pkg.omnios.org/')).toBe('https://pkg.omnios.org/');
    expect(formatLocation(`https://${'a'.repeat(60)}`)).toBe(
      `${`https://${'a'.repeat(60)}`.substring(0, 50)}...`
    );
    expect(repositoryKey({ name: 'omnios', type: 'origin' })).toBe('omnios-origin');
  });

  it('matches a row and groups by type and status', () => {
    const row = { name: 'omnios', type: 'origin', status: 'online', location: 'https://x' };
    expect(matchesRepository(row, 'omni')).toBe(true);
    expect(matchesRepository(row, 'mirror')).toBe(false);
    const [type, status] = REPOSITORY_FILTERS;
    expect(type.values(row)).toEqual(['origin']);
    expect(type.values({})).toEqual([]);
    expect(status.values({ status: 'online', enabled: false })).toEqual(['disabled']);
  });
});

describe('the add form', () => {
  it('needs a name and an origin', () => {
    expect(addRepositoryProblem(ADD_REPOSITORY_FORM)).toBe(
      'host.addRepositoryModal.errors.nameOriginRequired'
    );
    expect(addRepositoryProblem({ ...ADD_REPOSITORY_FORM, name: 'x', origin: 'https://x' })).toBe(
      ''
    );
  });

  it('builds the body with the mirrors that hold a URL and the optional members given', () => {
    expect(
      addRepositoryBody({
        ...ADD_REPOSITORY_FORM,
        name: ' ooce ',
        origin: 'https://pkg.omnios.org/braich/',
        mirrors: [
          { id: 0, url: ' https://mirror/ ' },
          { id: 1, url: '' },
        ],
        proxy: 'http://proxy:3128',
      })
    ).toEqual({
      name: 'ooce',
      origin: 'https://pkg.omnios.org/braich/',
      mirrors: ['https://mirror/'],
      enabled: true,
      sticky: false,
      search_first: false,
      proxy: 'http://proxy:3128',
    });
  });
});

describe('the edit form', () => {
  it('opens on the row with empty lists', () => {
    expect(editRepositoryFormOf({ enabled: false, sticky: true, proxy: 'http://p' })).toMatchObject(
      {
        originsToAdd: [{ id: 0, value: '' }],
        enabled: false,
        sticky: true,
        searchFirst: false,
        proxy: 'http://p',
        refresh: false,
      }
    );
  });

  it('builds the body with the lists that hold a URL', () => {
    const form = editRepositoryFormOf({ status: 'online' });
    expect(editRepositoryBody(form)).toEqual({
      enabled: true,
      sticky: false,
      search_first: false,
      refresh: false,
    });
    expect(
      editRepositoryBody({
        ...form,
        originsToAdd: [{ id: 0, value: 'https://new/' }],
        mirrorsToRemove: [{ id: 0, value: 'https://old/' }],
        searchBefore: 'omnios',
        refresh: true,
      })
    ).toEqual({
      enabled: true,
      sticky: false,
      search_first: false,
      refresh: true,
      origins_to_add: ['https://new/'],
      mirrors_to_remove: ['https://old/'],
      search_before: 'omnios',
    });
  });
});
