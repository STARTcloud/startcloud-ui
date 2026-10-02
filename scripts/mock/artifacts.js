import { featuresOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { queue, settles } from './tasks.js';

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const PAGE = 25;
const EXTENSIONS = ['.iso', '.img', '.vmdk', '.vhd', '.vhdx', '.qcow2'];
const SEEDED_PATHS = [
  {
    name: 'ISO library',
    path: '/rpool/iso',
    type: 'iso',
    enabled: true,
    used: '412G',
    total: '1.8T',
    percent: '23%',
  },
  {
    name: 'Images',
    path: '/rpool/images',
    type: 'image',
    enabled: true,
    used: '1.1T',
    total: '1.8T',
    percent: '61%',
  },
  {
    name: 'Old ISOs',
    path: '/tank/old-iso',
    type: 'iso',
    enabled: false,
    used: '9.1T',
    total: '9.8T',
    percent: '93%',
  },
];
const SEEDED_ARTIFACTS = [
  {
    filename: 'debian-13.0.0-amd64-netinst.iso',
    location: 0,
    size: 741 * MIB,
    checksum: 'sha256',
    verified: true,
  },
  {
    filename: 'omnios-r151054.iso',
    location: 0,
    size: 1.1 * GIB,
    checksum: 'sha256',
    verified: null,
    calculated: true,
  },
  {
    filename: 'windows-11-eval.iso',
    location: 0,
    size: 6.2 * GIB,
    checksum: 'sha1',
    verified: false,
  },
  { filename: 'debian13-base.vmdk', location: 1, size: 8.4 * GIB, checksum: null },
  {
    filename: 'rocky9-cloud.qcow2',
    location: 1,
    size: 2.3 * GIB,
    checksum: 'sha256',
    verified: true,
  },
  { filename: 'freebsd-14.img', location: 1, size: 4.1 * GIB, checksum: null },
  {
    filename: 'debian-11.6.0-amd64-netinst.iso',
    location: 2,
    size: 396 * MIB,
    checksum: 'md5',
    verified: true,
  },
];

const stores = new Map();

const pad = (number, width) => String(number).padStart(width, '0');

const pathId = (host, index) =>
  `7c1e5d3a-0000-4000-8000-${pad(Number(host.id) || 0, 4)}${pad(index, 8)}`;

const artifactId = (host, index) =>
  `9a2b4c6d-0000-4000-8000-${pad(Number(host.id) || 0, 4)}${pad(index, 8)}`;

const typeOf = filename => (filename.toLowerCase().endsWith('.iso') ? 'iso' : 'image');

const extensionOf = filename => filename.slice(filename.lastIndexOf('.')).toLowerCase();

const locationOf = row => ({ id: row.id, name: row.name, path: row.path, type: row.type });

const seededPaths = host =>
  SEEDED_PATHS.map((seed, index) => ({
    id: pathId(host, index + 1),
    name: seed.name,
    path: seed.path,
    type: seed.type,
    enabled: seed.enabled,
    file_count: 0,
    total_size: 0,
    last_scan_at: index === 2 ? null : ago(90),
    disk_usage: { used: seed.used, total: seed.total, use_percent: seed.percent },
    created_at: ago(20000),
    updated_at: ago(90),
  }));

const seededArtifacts = (host, paths) =>
  SEEDED_ARTIFACTS.map((seed, index) => ({
    id: artifactId(host, index + 1),
    filename: seed.filename,
    path: `${paths[seed.location].path}/${seed.filename}`,
    file_type: typeOf(seed.filename),
    extension: extensionOf(seed.filename),
    mime_type:
      typeOf(seed.filename) === 'iso' ? 'application/x-iso9660-image' : 'application/octet-stream',
    size: Math.round(seed.size),
    checksum: seed.checksum ? `${'a1b2c3d4'.repeat(seed.checksum === 'md5' ? 4 : 8)}` : null,
    checksum_algorithm: seed.checksum,
    checksum_verified: seed.verified ?? null,
    calculated_checksum: seed.calculated ? 'a1b2c3d4'.repeat(8) : null,
    user_provided_checksum: seed.verified === null ? null : seed.checksum,
    storage_location: locationOf(paths[seed.location]),
    source_url: index % 3 === 0 ? `https://mirror.example.com/${seed.filename}` : null,
    discovered_at: ago(index * 300 + 200),
    updated_at: ago(index * 300 + 100),
  }));

const counted = store => {
  store.paths.forEach(path => {
    const own = store.artifacts.filter(row => row.storage_location.id === path.id);
    path.file_count = own.length;
    path.total_size = own.reduce((sum, row) => sum + row.size, 0);
  });
};

const storeOf = host => {
  if (!stores.has(host.id)) {
    const paths = seededPaths(host);
    const store = {
      paths,
      artifacts: seededArtifacts(host, paths),
      next: SEEDED_ARTIFACTS.length + 1,
    };
    counted(store);
    stores.set(host.id, store);
  }
  return stores.get(host.id);
};

const behind = handler => ctx =>
  featuresOf(ctx.host).includes('artifacts') ? handler(ctx) : problem(404, 'Not Found');

const pathOf = handler => ctx => {
  const store = storeOf(ctx.host);
  const row = store.paths.find(entry => entry.id === ctx.params.path);
  return row ? handler({ ...ctx, store, row }) : refusal(404, 'Storage location not found');
};

const artifactOf = handler => ctx => {
  const store = storeOf(ctx.host);
  const row = store.artifacts.find(entry => entry.id === ctx.params.artifact);
  return row ? handler({ ...ctx, store, row }) : refusal(404, 'Artifact not found');
};

const listedPaths = ctx => {
  const store = storeOf(ctx.host);
  return ok({ success: true, paths: store.paths, total: store.paths.length });
};

const createdPath = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  if (!body.name || !body.path || !body.type) {
    return refusal(400, 'name, path and type are required');
  }
  if (!String(body.path).startsWith('/')) {
    return refusal(400, 'path must be absolute');
  }
  if (store.paths.some(row => row.path === body.path)) {
    return refusal(409, `Storage location already exists for ${body.path}`);
  }
  const row = {
    id: pathId(host, store.paths.length + 1),
    name: body.name,
    path: body.path,
    type: body.type,
    enabled: body.enabled !== false,
    file_count: 0,
    total_size: 0,
    last_scan_at: null,
    disk_usage: { used: '0G', total: '1.8T', use_percent: '0%' },
    created_at: now(),
    updated_at: now(),
  };
  store.paths = [...store.paths, row];
  return ok({ success: true, message: 'Storage location created', path: row }, 201);
};

const updatedPath = ctx => {
  const { body, row, store } = ctx;
  Object.assign(row, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
    updated_at: now(),
  });
  store.artifacts.forEach(artifact => {
    if (artifact.storage_location.id === row.id) {
      artifact.storage_location = locationOf(row);
    }
  });
  return ok({ success: true, message: 'Storage location updated', path: row });
};

const deletedPath = ctx => {
  const { body, row, store } = ctx;
  const own = store.artifacts.filter(artifact => artifact.storage_location.id === row.id);
  if (own.length > 0 && !body?.force && !body?.remove_db_records) {
    return refusal(409, `Storage location holds ${own.length} artifacts`);
  }
  store.paths = store.paths.filter(entry => entry.id !== row.id);
  if (body?.remove_db_records) {
    store.artifacts = store.artifacts.filter(artifact => artifact.storage_location.id !== row.id);
  }
  return ok({ success: true, message: 'Storage location deleted', removed_records: own.length });
};

const listedArtifacts = ctx => {
  const { host, url } = ctx;
  const store = storeOf(host);
  const type = url.searchParams.get('type') || '';
  const location = url.searchParams.get('storage_location_id') || '';
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const sortBy = url.searchParams.get('sort_by') || 'filename';
  const desc = url.searchParams.get('sort_order') === 'desc';
  const limit = Number(url.searchParams.get('limit')) || PAGE;
  const offset = Number(url.searchParams.get('offset')) || 0;
  const rows = store.artifacts
    .filter(
      row =>
        (!type || row.file_type === type) && (!location || row.storage_location.id === location)
    )
    .filter(row => !search || row.filename.toLowerCase().includes(search))
    .sort((a, b) => {
      const left = sortBy === 'size' ? a.size : String(a[sortBy] ?? '');
      const right = sortBy === 'size' ? b.size : String(b[sortBy] ?? '');
      const result = left < right ? -1 : Number(left > right);
      return desc ? -result : result;
    });
  return ok({
    success: true,
    artifacts: rows.slice(offset, offset + limit),
    pagination: { total: rows.length, limit, offset, has_more: offset + limit < rows.length },
  });
};

const shownArtifact = ({ row }) => ok({ success: true, ...row });

const deletedArtifacts = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const ids = Array.isArray(body.artifact_ids) ? body.artifact_ids : [];
  if (ids.length === 0) {
    return refusal(400, 'artifact_ids is required');
  }
  const before = store.artifacts.length;
  store.artifacts = store.artifacts.filter(row => !ids.includes(row.id));
  counted(store);
  return ok({
    success: true,
    deleted: before - store.artifacts.length,
    files_deleted: Boolean(body.delete_files),
  });
};

const queued = (ctx, { operation, message, metadata, more = {} }) => {
  const task = queue({
    host: ctx.host,
    by: ctx.person.username,
    operation,
    target: 'artifact',
    metadata,
  });
  return ok(
    { success: true, task_id: task.id, operation, status: 'pending', message, ...more },
    202
  );
};

const scanned = ctx =>
  queued(ctx, {
    operation: 'artifact_scan',
    message: 'Artifact scan task queued',
    metadata: {
      verify_checksums: Boolean(ctx.body?.verify_checksums),
      remove_orphaned: Boolean(ctx.body?.remove_orphaned),
    },
  });

const afterScan = host => {
  const store = storeOf(host);
  store.paths.forEach(path => {
    if (path.enabled) {
      path.last_scan_at = now();
    }
  });
  counted(store);
};

const added = (
  store,
  host,
  { filename, location, url = null, checksum = null, algorithm = null }
) => {
  const index = store.next;
  store.next += 1;
  const row = {
    id: artifactId(host, index),
    filename,
    path: `${location.path}/${filename}`,
    file_type: typeOf(filename),
    extension: extensionOf(filename),
    mime_type:
      typeOf(filename) === 'iso' ? 'application/x-iso9660-image' : 'application/octet-stream',
    size: 512 * MIB,
    checksum: checksum || 'e5f6a7b8'.repeat(8),
    checksum_algorithm: algorithm || 'sha256',
    checksum_verified: checksum ? true : null,
    calculated_checksum: 'e5f6a7b8'.repeat(8),
    user_provided_checksum: checksum,
    storage_location: locationOf(location),
    source_url: url,
    discovered_at: now(),
    updated_at: now(),
  };
  store.artifacts = [row, ...store.artifacts];
  counted(store);
  return row;
};

const downloadedFromUrl = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const location = store.paths.find(row => row.id === body.storage_path_id);
  if (!body.url || !location) {
    return refusal(400, 'url and storage_path_id are required');
  }
  if (!location.enabled) {
    return refusal(400, 'Storage location is disabled');
  }
  const filename = body.filename || new URL(body.url).pathname.split('/').pop();
  if (!EXTENSIONS.includes(extensionOf(filename))) {
    return refusal(400, `Unsupported file type: ${extensionOf(filename)}`);
  }
  return queued(ctx, {
    operation: 'artifact_download',
    message: 'Download task queued',
    metadata: {
      url: body.url,
      filename,
      storage_path_id: location.id,
      checksum: body.checksum || null,
      checksum_algorithm: body.checksum_algorithm || null,
    },
    more: { filename, url: body.url, storage_location: locationOf(location) },
  });
};

const afterDownload = (host, task) => {
  const store = storeOf(host);
  const {
    filename,
    url,
    storage_path_id: locationId,
    checksum,
    checksum_algorithm: algorithm,
  } = task.metadata;
  const location = store.paths.find(row => row.id === locationId);
  if (location && !store.artifacts.some(row => row.path === `${location.path}/${filename}`)) {
    added(store, host, { filename, location, url, checksum, algorithm });
  }
};

const uploads = new Map();

const preparedUpload = ctx => {
  const { host, person, body } = ctx;
  const store = storeOf(host);
  const location = store.paths.find(row => row.id === body.storage_path_id);
  if (!body.filename || !body.size || !location) {
    return refusal(400, 'filename, size and storage_path_id are required');
  }
  if (!EXTENSIONS.includes(extensionOf(body.filename))) {
    return refusal(400, `Unsupported file type: ${extensionOf(body.filename)}`);
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'artifact_upload',
    target: 'artifact',
    metadata: { filename: body.filename, size: body.size, storage_path_id: location.id },
    after: 'never',
  });
  uploads.set(task.id, {
    host,
    location,
    filename: body.filename,
    checksum: body.checksum || null,
    algorithm: body.checksum_algorithm || null,
  });
  return ok({
    success: true,
    task_id: task.id,
    filename: body.filename,
    storage_location: locationOf(location),
    message: 'Upload prepared',
  });
};

const receivedUpload = ctx => {
  const { host, params } = ctx;
  const prepared = uploads.get(params.task);
  if (!prepared || prepared.host.id !== host.id) {
    return refusal(404, 'Upload task not found');
  }
  uploads.delete(params.task);
  const task = host.tasks.find(row => row.id === params.task);
  if (task) {
    task.status = 'completed';
    task.completed_at = now();
    task.progress_percent = 100;
  }
  const store = storeOf(host);
  const row = added(store, host, {
    filename: prepared.filename,
    location: prepared.location,
    checksum: prepared.checksum,
    algorithm: prepared.algorithm,
  });
  return ok(
    {
      success: true,
      task_id: params.task,
      filename: row.filename,
      artifact: row,
      storage_location: row.storage_location,
      message: 'Upload complete',
    },
    201
  );
};

const moved = keep => ctx => {
  const { row, store, body } = ctx;
  const destination = store.paths.find(entry => entry.id === body.destination_storage_location_id);
  if (!destination) {
    return refusal(400, 'destination_storage_location_id is required');
  }
  if (destination.id === row.storage_location.id) {
    return refusal(400, 'Artifact is already in that storage location');
  }
  return queued(ctx, {
    operation: keep ? 'artifact_copy' : 'artifact_move',
    message: keep ? 'Copy task queued' : 'Move task queued',
    metadata: { artifact_id: row.id, destination_storage_location_id: destination.id },
  });
};

const afterMove = keep => (host, task) => {
  const store = storeOf(host);
  const { artifact_id: id, destination_storage_location_id: destinationId } = task.metadata;
  const row = store.artifacts.find(entry => entry.id === id);
  const destination = store.paths.find(entry => entry.id === destinationId);
  if (!row || !destination) {
    return;
  }
  const landed = {
    ...row,
    path: `${destination.path}/${row.filename}`,
    storage_location: locationOf(destination),
    updated_at: now(),
  };
  if (keep) {
    store.artifacts = [{ ...landed, id: artifactId(host, store.next) }, ...store.artifacts];
    store.next += 1;
  } else {
    store.artifacts = store.artifacts.map(entry => (entry.id === id ? landed : entry));
  }
  counted(store);
};

const downloadedFile = ({ row }) => ({
  status: 200,
  headers: {
    'Content-Type': row.mime_type,
    'Content-Disposition': `attachment; filename="${row.filename}"`,
  },
  body: `mock bytes of ${row.filename}\n`,
  text: true,
});

/**
 * The ISO and artifact storage of a host behind `artifacts`, every
 * route hyperweaver-ui's artifact management calls as hyperweaver-agent
 * answers it: the storage locations at `artifacts/storage/paths`, read,
 * made, changed and removed; the artifacts at `artifacts` with the
 * type, the location, the search, the sort and the page, one artifact's
 * detail, its bytes at `download`, the batch delete at
 * `artifacts/files`; the scan, the download from a URL, the move and
 * the copy each a queued task on the target `artifact` that changes the
 * rows when it completes; and the two-step upload, `upload/prepare`
 * answering the task the multipart is then sent under at
 * `upload/{task}`, which lands the artifact at once.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountArtifacts = agentRoute => {
  settles('artifact_scan', afterScan);
  settles('artifact_download', afterDownload);
  settles('artifact_move', afterMove(false));
  settles('artifact_copy', afterMove(true));
  agentRoute('GET', 'artifacts/storage/paths', behind(listedPaths));
  agentRoute('POST', 'artifacts/storage/paths', behind(createdPath));
  agentRoute('PUT', 'artifacts/storage/paths/:path', behind(pathOf(updatedPath)));
  agentRoute('DELETE', 'artifacts/storage/paths/:path', behind(pathOf(deletedPath)));
  agentRoute('GET', 'artifacts', behind(listedArtifacts));
  agentRoute('DELETE', 'artifacts/files', behind(deletedArtifacts));
  agentRoute('POST', 'artifacts/scan', behind(scanned));
  agentRoute('POST', 'artifacts/download', behind(downloadedFromUrl));
  agentRoute('POST', 'artifacts/upload/prepare', behind(preparedUpload));
  agentRoute('POST', 'artifacts/upload/:task', behind(receivedUpload));
  agentRoute('GET', 'artifacts/:artifact', behind(artifactOf(shownArtifact)));
  agentRoute('GET', 'artifacts/:artifact/download', behind(artifactOf(downloadedFile)));
  agentRoute('POST', 'artifacts/:artifact/move', behind(artifactOf(moved(false))));
  agentRoute('POST', 'artifacts/:artifact/copy', behind(artifactOf(moved(true))));
};
