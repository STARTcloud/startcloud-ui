import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_FORMATS,
  archiveFormats,
  archiveNameOf,
  filePermissions,
  filesInDirectory,
  getArchiveFormat,
  getFileExtension,
  isArchiveFile,
  isTextFile,
  isWindowsAgent,
  octalOf,
  ownershipFields,
  parentPathsOf,
  permissionBody,
  permissionsOf,
  sortFiles,
  stripArchiveExtension,
  toAgentPath,
  toDisplayPath,
  transformAgentToFile,
  uploadFields,
  withDirectories,
} from '../../src/features/hosts/utils/fileManager.js';

const windows = { capabilities: { platform: 'windows' } };
const omnios = { capabilities: { platform: 'omnios' } };
const linux = { capabilities: { platform: 'linux' } };

describe('the path mapping', () => {
  it('mounts drive paths under / while no root is known', () => {
    expect(toDisplayPath(null, 'C:/Users')).toBe('/C:/Users');
    expect(toDisplayPath(null, 'C:/')).toBe('/C:');
    expect(toDisplayPath(null, '/etc')).toBe('/etc');
    expect(toAgentPath(null, '/C:/Users')).toBe('C:/Users');
    expect(toAgentPath(null, '/C:')).toBe('C:/');
    expect(toAgentPath(null, '/etc')).toBe('/etc');
  });

  it('maps a named root to / and its children to root-relative paths', () => {
    expect(toDisplayPath('/srv/files', '/srv/files')).toBe('/');
    expect(toDisplayPath('/srv/files/', '/srv/files/a/b')).toBe('/a/b');
    expect(toDisplayPath('/srv/files', '/elsewhere')).toBe('/elsewhere');
    expect(toAgentPath('/srv/files', '/')).toBe('/srv/files');
    expect(toAgentPath('/srv/files', '/a/b')).toBe('/srv/files/a/b');
  });

  it('is the identity on a root of /', () => {
    expect(toDisplayPath('/', '/etc/hosts')).toBe('/etc/hosts');
    expect(toAgentPath('/', '/etc/hosts')).toBe('/etc/hosts');
    expect(toAgentPath('/', '/')).toBe('/');
  });
});

describe('the host', () => {
  it('tells a Windows agent, whose ownership is left out', () => {
    expect(isWindowsAgent(windows)).toBe(true);
    expect(isWindowsAgent(omnios)).toBe(false);
    expect(isWindowsAgent(null)).toBe(false);
    expect(ownershipFields(windows)).toEqual({});
    expect(ownershipFields(omnios)).toEqual({ uid: 1000, gid: 1000 });
  });

  it('offers bzip2 and gz formats to the agent that is not the Go one', () => {
    expect(archiveFormats(windows)).toEqual(ARCHIVE_FORMATS);
    expect(archiveFormats(linux)).toEqual(ARCHIVE_FORMATS);
    expect(archiveFormats(omnios).map(format => format.value)).toEqual([
      'tar.gz',
      'tar',
      'zip',
      'tar.bz2',
      'gz',
    ]);
  });
});

describe('the files', () => {
  const item = {
    name: 'a.txt',
    path: '/a.txt',
    isDirectory: false,
    mtime: '2026-09-27T00:00:00Z',
    size: 12,
    permissions: { octal: '644' },
    uid: 1,
    gid: 2,
    mimeType: 'text/plain',
    isBinary: false,
    syntax: null,
  };

  it('carries the agent item with its metadata under _hwMetadata', () => {
    expect(transformAgentToFile(item)).toEqual({
      name: 'a.txt',
      path: '/a.txt',
      isDirectory: false,
      updatedAt: '2026-09-27T00:00:00Z',
      size: 12,
      _hwMetadata: {
        permissions: { octal: '644' },
        uid: 1,
        gid: 2,
        mimeType: 'text/plain',
        isBinary: false,
        syntax: null,
      },
    });
  });

  it('tells a text file by the agent, the MIME type, the syntax, the extension and the name', () => {
    const file = transformAgentToFile(item);
    expect(isTextFile(file)).toBe(true);
    expect(isTextFile({ name: 'x.bin', _hwMetadata: { isBinary: true } })).toBe(false);
    expect(isTextFile({ name: 'x', _hwMetadata: { mimeType: 'application/json' } })).toBe(true);
    expect(isTextFile({ name: 'x', _hwMetadata: { syntax: 'yaml' } })).toBe(true);
    expect(isTextFile({ name: 'notes.log', _hwMetadata: {} })).toBe(true);
    expect(isTextFile({ name: 'Makefile' })).toBe(true);
    expect(isTextFile({ name: '.bashrc' })).toBe(true);
    expect(isTextFile({ name: 'dir', isDirectory: true })).toBe(false);
    expect(isTextFile(null)).toBe(false);
  });

  it('tells an archive and its format', () => {
    expect(isArchiveFile({ name: 'a.tar.gz' })).toBe(true);
    expect(isArchiveFile({ name: 'a.7z' })).toBe(true);
    expect(isArchiveFile({ name: 'a.txt' })).toBe(false);
    expect(isArchiveFile({ name: 'a.zip', isDirectory: true })).toBe(false);
    expect(getArchiveFormat('a.tgz')).toBe('tar.gz');
    expect(getArchiveFormat('a.tar.bz2')).toBe('tar.bz2');
    expect(getArchiveFormat('a.tar')).toBe('tar');
    expect(getArchiveFormat('a.gz')).toBe('gz');
    expect(getArchiveFormat('a.rar')).toBe('zip');
    expect(stripArchiveExtension('a.tar.gz')).toBe('a');
    expect(archiveNameOf([{ name: 'one' }], 'zip')).toBe('one.zip');
    expect(archiveNameOf([{ name: 'one' }, { name: 'two' }], 'tar')).toBe('archive.tar');
    expect(getFileExtension('A.TXT')).toBe('txt');
    expect(getFileExtension('none')).toBe('');
  });

  it('sorts directories first and names naturally', () => {
    const sorted = sortFiles([
      { name: 'b10', isDirectory: false },
      { name: 'b2', isDirectory: false },
      { name: 'z', isDirectory: true },
    ]).map(file => file.name);
    expect(sorted).toEqual(['z', 'b2', 'b10']);
  });

  it('names the parents of a path and combines the directories once', () => {
    expect(parentPathsOf('/a/b/c')).toEqual(['/a', '/a/b']);
    expect(parentPathsOf('/a')).toEqual([]);
    const files = [{ path: '/a/x' }];
    expect(withDirectories(files, [[{ path: '/a' }], [{ path: '/a/x' }, { path: '/b' }]])).toEqual([
      { path: '/a/x' },
      { path: '/a' },
      { path: '/b' },
    ]);
    expect(filesInDirectory([{ path: '/a/x' }, { path: '/a/y/z' }, { path: '/b' }], '/a')).toEqual([
      { path: '/a/x' },
    ]);
    expect(filesInDirectory([{ path: '/a' }, { path: '/a/x' }], '/')).toEqual([{ path: '/a' }]);
  });
});

describe('the permissions', () => {
  it('gates every write on an admin and the download on every role', () => {
    expect(filePermissions('admin')).toMatchObject({
      create: true,
      delete: true,
      download: true,
      edit: true,
    });
    expect(filePermissions('user')).toMatchObject({
      create: false,
      delete: false,
      download: true,
      archive: false,
    });
    expect(filePermissions(undefined).download).toBe(false);
  });

  it('reads and writes an octal mode as boxes', () => {
    expect(permissionsOf('750')).toEqual({
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: false, write: false, execute: false },
    });
    expect(octalOf(permissionsOf('644'))).toBe('644');
    expect(octalOf(permissionsOf('bad'))).toBe('644');
  });

  it('sends the owner and the group on a POSIX agent alone and recursive for a directory alone', () => {
    const form = { user: '1000', group: '10', mode: '755', recursive: true };
    expect(
      permissionBody({ file: { path: '/d', isDirectory: true }, form, server: omnios })
    ).toEqual({
      path: '/d',
      uid: 1000,
      gid: 10,
      mode: '755',
      recursive: true,
    });
    expect(
      permissionBody({ file: { path: '/f', isDirectory: false }, form, server: windows })
    ).toEqual({
      path: '/f',
      mode: '755',
      recursive: false,
    });
    expect(
      permissionBody({
        file: { path: '/f' },
        form: { ...form, user: '', group: '' },
        server: omnios,
      })
    ).toEqual({
      path: '/f',
      mode: '755',
      recursive: false,
    });
  });

  it('appends the upload fields the agent takes', () => {
    expect(uploadFields({ uploadPath: '/up', server: omnios })).toEqual({
      uploadPath: '/up',
      overwrite: false,
      mode: '644',
      uid: 1000,
      gid: 1000,
    });
    expect(uploadFields({ uploadPath: 'C:/up', server: windows })).toEqual({
      uploadPath: 'C:/up',
      overwrite: false,
      mode: '644',
    });
  });
});
