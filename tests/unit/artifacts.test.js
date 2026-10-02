import { describe, expect, it } from 'vitest';

import {
  DOWNLOAD_FORM,
  STORAGE_PATH_FORM,
  UPLOAD_FORM,
  artifactQuery,
  artifactTypeOf,
  checksumStateOf,
  defaultPathOf,
  destinationsOf,
  downloadBody,
  downloadProblem,
  extensionOf,
  extractFilenameFromUrl,
  getDiskUsageColor,
  isDownloadUrl,
  isStoragePathSuitable,
  matchesArtifact,
  matchesStoragePath,
  parseUsagePercentage,
  storagePathBody,
  storagePathEditBody,
  storagePathEditProblem,
  storagePathProblem,
  transferOf,
  transferStatusKey,
  transferTone,
  transferWithTask,
  uploadPrepareBody,
  uploadProblem,
} from '../../src/features/hosts/utils/artifacts.js';

const paths = [
  { id: 'a', name: 'ISO', path: '/iso', type: 'iso', enabled: true },
  { id: 'b', name: 'Images', path: '/img', type: 'image', enabled: true },
  { id: 'c', name: 'Old', path: '/old', type: 'iso', enabled: false },
];

describe('the artifact types', () => {
  it('reads the type from the file type or the extension', () => {
    expect(artifactTypeOf('iso', '.iso')).toBe('iso');
    expect(artifactTypeOf('', '.ISO')).toBe('iso');
    expect(artifactTypeOf('image', '')).toBe('image');
    expect(artifactTypeOf('', '.qcow2')).toBe('image');
    expect(artifactTypeOf('', '.txt')).toBe('file');
    expect(extensionOf('a.VMDK')).toBe('.vmdk');
    expect(extensionOf('none')).toBe('');
  });

  it('reads the checksum state', () => {
    expect(checksumStateOf({ checksum_verified: true })).toBe('verified');
    expect(checksumStateOf({ checksum_verified: false })).toBe('mismatch');
    expect(checksumStateOf({ calculated_checksum: 'x' })).toBe('calculated');
    expect(checksumStateOf({ calculated_checksum: 'x', user_provided_checksum: 'y' })).toBe('none');
    expect(checksumStateOf({})).toBe('none');
  });

  it('tells a suitable storage location', () => {
    expect(isStoragePathSuitable(paths[0], '.iso')).toBe(true);
    expect(isStoragePathSuitable(paths[0], '.vmdk')).toBe(false);
    expect(isStoragePathSuitable({ type: 'artifact' }, '.txt')).toBe(true);
    expect(isStoragePathSuitable(null, '.iso')).toBe(false);
  });
});

describe('the URLs and the usage', () => {
  it('reads a file name from a URL and tells a web URL', () => {
    expect(extractFilenameFromUrl('https://x.example/a/b.iso?x=1')).toBe('b.iso');
    expect(extractFilenameFromUrl('https://x.example/a/')).toBe('');
    expect(extractFilenameFromUrl('nope')).toBe('');
    expect(isDownloadUrl('http://x')).toBe(true);
    expect(isDownloadUrl('ftp://x')).toBe(false);
    expect(isDownloadUrl('x')).toBe(false);
  });

  it('parses a usage percentage and tones it', () => {
    expect(parseUsagePercentage('65%')).toBe(65);
    expect(parseUsagePercentage(undefined)).toBe(0);
    expect(getDiskUsageColor(95)).toBe('bg-danger');
    expect(getDiskUsageColor(80)).toBe('bg-warning');
    expect(getDiskUsageColor(10)).toBe('bg-success');
  });
});

describe('the transfers', () => {
  it('tones and names a status', () => {
    expect(transferTone('running')).toBe('primary');
    expect(transferTone('odd')).toBe('secondary');
    expect(transferStatusKey('failed')).toBe('hosts.manage.artifacts.status.failed');
    expect(transferStatusKey('odd')).toBe('');
  });

  it('holds a transfer row and moves it with a pushed task', () => {
    const row = transferOf({ taskId: 't1', filename: 'a.iso', url: 'https://x/a.iso' });
    expect(row).toMatchObject({
      taskId: 't1',
      filename: 'a.iso',
      status: 'queued',
      progress_percent: 0,
    });
    expect(
      transferWithTask(row, {
        status: 'running',
        progress_percent: '40',
        progress_info: { total_mb: 10 },
      })
    ).toMatchObject({ status: 'running', progress_percent: 40, progress_info: { total_mb: 10 } });
    expect(transferWithTask(row, { status: 'failed', error_message: 'no' })).toMatchObject({
      status: 'failed',
      error_message: 'no',
      progress_info: {},
    });
  });
});

describe('the storage path forms', () => {
  it('refuses a short name, a relative path and no type', () => {
    expect(storagePathProblem(STORAGE_PATH_FORM)).toBe(
      'artifacts.storagePathCreateModal.nameRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'a' })).toBe(
      'artifacts.storagePathCreateModal.nameMinLength'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab' })).toBe(
      'artifacts.storagePathCreateModal.pathRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: 'rel' })).toBe(
      'artifacts.storagePathCreateModal.pathAbsoluteRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: '/x', type: '' })).toBe(
      'artifacts.storagePathCreateModal.typeRequired'
    );
    expect(storagePathProblem({ ...STORAGE_PATH_FORM, name: 'ab', path: '/x' })).toBe('');
  });

  it('sends the create and the edit bodies', () => {
    expect(storagePathBody({ name: ' ISO ', path: ' /iso ', type: 'iso', enabled: true })).toEqual({
      name: 'ISO',
      path: '/iso',
      type: 'iso',
      enabled: true,
    });
    expect(storagePathEditProblem({ name: '' })).toBe(
      'artifacts.storagePathEditModal.nameRequired'
    );
    expect(storagePathEditProblem({ name: 'x' })).toBe(
      'artifacts.storagePathEditModal.nameMinLength'
    );
    expect(storagePathEditBody({ name: ' New ', enabled: false })).toEqual({
      name: 'New',
      enabled: false,
    });
  });
});

describe('the download and the upload', () => {
  it('refuses a download without a URL, a valid one or a location', () => {
    expect(downloadProblem(DOWNLOAD_FORM)).toBe('artifacts.artifactDownloadModal.urlRequired');
    expect(downloadProblem({ ...DOWNLOAD_FORM, url: 'nope' })).toBe(
      'artifacts.artifactDownloadModal.invalidUrl'
    );
    expect(downloadProblem({ ...DOWNLOAD_FORM, url: 'https://x/a.iso' })).toBe(
      'artifacts.artifactDownloadModal.storageLocationRequired'
    );
    expect(
      downloadProblem({ ...DOWNLOAD_FORM, url: 'https://x/a.iso', storage_path_id: 'a' })
    ).toBe('');
  });

  it('sends the download body with the optional members where given', () => {
    const form = { ...DOWNLOAD_FORM, url: ' https://x/a.iso ', storage_path_id: 'a' };
    expect(downloadBody(form)).toEqual({
      url: 'https://x/a.iso',
      storage_path_id: 'a',
      overwrite_existing: false,
    });
    expect(
      downloadBody({ ...form, filename: 'b.iso', checksum: 'abc', overwrite_existing: true })
    ).toEqual({
      url: 'https://x/a.iso',
      storage_path_id: 'a',
      overwrite_existing: true,
      filename: 'b.iso',
      checksum: 'abc',
      checksum_algorithm: 'sha256',
    });
  });

  it('refuses an upload without files, a location or with a wrong extension', () => {
    expect(uploadProblem(UPLOAD_FORM, [])).toEqual({
      key: 'artifacts.artifactUploadModal.filesRequired',
      values: {},
    });
    expect(uploadProblem(UPLOAD_FORM, [{ name: 'a.iso' }])).toEqual({
      key: 'artifacts.artifactUploadModal.storageLocationRequired',
      values: {},
    });
    expect(
      uploadProblem({ ...UPLOAD_FORM, storage_path_id: 'a' }, [{ name: 'a.txt' }])
    ).toMatchObject({
      key: 'artifacts.artifactUploadModal.unsupportedFileType',
      values: { filename: 'a.txt' },
    });
    expect(uploadProblem({ ...UPLOAD_FORM, storage_path_id: 'a' }, [{ name: 'a.iso' }])).toBeNull();
  });

  it('prepares an upload with the checksum where given', () => {
    const file = { name: 'a.iso', size: 5 };
    expect(uploadPrepareBody(file, { ...UPLOAD_FORM, storage_path_id: 'a' })).toEqual({
      filename: 'a.iso',
      size: 5,
      storage_path_id: 'a',
      overwrite_existing: false,
    });
    expect(
      uploadPrepareBody(file, { storage_path_id: 'a', checksum: ' x ', checksum_algorithm: 'md5' })
    ).toMatchObject({
      checksum: 'x',
      checksum_algorithm: 'md5',
    });
  });
});

describe('the locations and the query', () => {
  it('offers the enabled locations other than the artifact own and opens on the one enabled', () => {
    expect(destinationsOf(paths, { storage_location: { id: 'a' } }).map(path => path.id)).toEqual([
      'b',
    ]);
    expect(defaultPathOf(paths)).toBe('');
    expect(defaultPathOf([paths[0], paths[2]])).toBe('a');
  });

  it('builds the query with the chosen filters alone', () => {
    expect(
      artifactQuery(
        { type: '', storage_location: '', sort_by: 'filename', sort_order: 'asc' },
        { limit: 25, offset: 50 }
      )
    ).toEqual({ limit: 25, offset: 50, sort_by: 'filename', sort_order: 'asc' });
    expect(
      artifactQuery(
        { type: 'iso', storage_location: 'a', sort_by: 'size', sort_order: 'desc' },
        { limit: 25, offset: 0 }
      )
    ).toMatchObject({ type: 'iso', storage_location_id: 'a', sort_by: 'size' });
  });

  it('matches a row by its words', () => {
    expect(matchesStoragePath(paths[0], 'iso')).toBe(true);
    expect(matchesStoragePath(paths[1], 'iso')).toBe(false);
    expect(
      matchesArtifact({ filename: 'debian.iso', storage_location: { name: 'ISO' } }, 'deb')
    ).toBe(true);
    expect(matchesArtifact({ filename: 'x', source_url: 'https://mirror' }, 'mirror')).toBe(true);
    expect(matchesArtifact({ filename: 'x' }, 'zzz')).toBe(false);
  });
});
