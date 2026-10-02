import { featuresOf } from './fleet.js';
import { ago, now, ok, problem, refusal } from './kit.js';
import { queue, settles } from './tasks.js';

const TEXT = 'text/plain';
const ROOTS = { windows: 'C:/', darwin: '/', linux: '/', omnios: '/' };
const SEEDED = [
  { name: 'etc', isDirectory: true, mode: '755' },
  { name: 'home', isDirectory: true, mode: '755' },
  { name: 'var', isDirectory: true, mode: '755' },
  {
    name: 'README.md',
    isDirectory: false,
    mode: '644',
    size: 1284,
    mimeType: 'text/markdown',
    isBinary: false,
    syntax: 'markdown',
    content: '# Host\n\nThe files of this host.\n',
  },
  {
    name: 'backup.tar.gz',
    isDirectory: false,
    mode: '644',
    size: 48213904,
    mimeType: 'application/gzip',
    isBinary: true,
  },
  {
    name: 'notes.txt',
    isDirectory: false,
    mode: '600',
    size: 96,
    mimeType: TEXT,
    isBinary: false,
    content: 'remember the scrub\n',
  },
];
const CHILDREN = {
  etc: [
    {
      name: 'hosts',
      isDirectory: false,
      mode: '644',
      size: 220,
      mimeType: TEXT,
      isBinary: false,
      content: '127.0.0.1 localhost\n',
    },
    {
      name: 'motd',
      isDirectory: false,
      mode: '644',
      size: 41,
      mimeType: TEXT,
      isBinary: false,
      content: 'welcome\n',
    },
    { name: 'ssh', isDirectory: true, mode: '755' },
  ],
  home: [{ name: 'mark', isDirectory: true, mode: '750' }],
  var: [
    { name: 'log', isDirectory: true, mode: '755' },
    { name: 'tmp', isDirectory: true, mode: '1777' },
  ],
};

const stores = new Map();

const platformOf = host =>
  host.kind === 'zoneweaver' ? 'omnios' : String(host.facts.platform || 'linux');

const rootOf = host => ROOTS[platformOf(host)] || '/';

const joined = (base, name) => (base.endsWith('/') ? `${base}${name}` : `${base}/${name}`);

const entryOf = (base, seed) => ({
  name: seed.name,
  path: joined(base, seed.name),
  isDirectory: seed.isDirectory,
  size: seed.isDirectory ? 0 : seed.size || 0,
  mtime: ago(seed.isDirectory ? 1440 : 60),
  atime: now(),
  permissions: { octal: seed.mode, string: seed.isDirectory ? 'drwxr-xr-x' : '-rw-r--r--' },
  uid: 1000,
  gid: 1000,
  mimeType: seed.isDirectory ? 'inode/directory' : seed.mimeType,
  isBinary: seed.isDirectory ? false : Boolean(seed.isBinary),
  syntax: seed.syntax || null,
  content: seed.content ?? null,
});

const seeded = host => {
  const root = rootOf(host);
  const entries = new Map();
  SEEDED.forEach(seed => entries.set(joined(root, seed.name), entryOf(root, seed)));
  Object.entries(CHILDREN).forEach(([dir, seeds]) => {
    const base = joined(root, dir);
    seeds.forEach(seed => entries.set(joined(base, seed.name), entryOf(base, seed)));
  });
  return entries;
};

const storeOf = host => {
  if (!stores.has(host.id)) {
    stores.set(host.id, seeded(host));
  }
  return stores.get(host.id);
};

const behind = handler => ctx =>
  featuresOf(ctx.host).includes('file-browser') ? handler(ctx) : problem(404, 'Not Found');

const normalized = (host, path) => {
  const root = rootOf(host);
  const text = String(path || '/').replace(/\\/gu, '/');
  if (text === '/' || text === '') {
    return root;
  }
  return text.replace(/\/+$/u, '') || root;
};

const parentOf = path => {
  const cut = path.lastIndexOf('/');
  return cut <= 0 ? path.slice(0, cut + 1) || '/' : path.slice(0, cut);
};

const wire = entry =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'content'));

const listing = ctx => {
  const { host, url } = ctx;
  const store = storeOf(host);
  const path = normalized(host, url.searchParams.get('path'));
  const hidden = url.searchParams.get('show_hidden') === 'true';
  const dir = store.get(path);
  if (path !== rootOf(host) && (!dir || !dir.isDirectory)) {
    return refusal(404, `Directory not found: ${path}`);
  }
  const items = [...store.values()]
    .filter(entry => parentOf(entry.path) === path && (hidden || !entry.name.startsWith('.')))
    .map(wire)
    .sort((a, b) => a.name.localeCompare(b.name));
  return ok({ success: true, current_path: path, items, total: items.length, root: rootOf(host) });
};

const created = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  if (!body.name || !body.path) {
    return refusal(400, 'path and name are required');
  }
  const base = normalized(host, body.path);
  const path = joined(base, body.name);
  if (store.has(path)) {
    return refusal(409, `Already exists: ${path}`);
  }
  const entry = entryOf(base, {
    name: body.name,
    isDirectory: true,
    mode: body.mode || '755',
  });
  store.set(path, entry);
  return ok({ success: true, item: wire(entry) });
};

const renamed = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const path = normalized(host, body.path);
  const entry = store.get(path);
  if (!entry) {
    return refusal(404, `Not found: ${path}`);
  }
  if (!body.new_name) {
    return refusal(400, 'new_name is required');
  }
  const next = {
    ...entry,
    name: body.new_name,
    path: joined(parentOf(path), body.new_name),
    mtime: now(),
  };
  store.delete(path);
  store.set(next.path, next);
  return ok({ success: true, item: wire(next) });
};

const removed = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const path = normalized(host, body.path);
  const entry = store.get(path);
  if (!entry) {
    return refusal(404, `Not found: ${path}`);
  }
  const children = [...store.keys()].filter(key => key.startsWith(`${path}/`));
  if (children.length > 0 && !body.recursive) {
    return refusal(400, 'Directory not empty; use recursive');
  }
  [path, ...children].forEach(key => store.delete(key));
  return ok({ success: true, message: `Deleted ${path}` });
};

const transferred = operation => ctx => {
  const { host, person, body } = ctx;
  const store = storeOf(host);
  const source = normalized(host, body.source);
  if (!store.has(source)) {
    return refusal(404, `Not found: ${source}`);
  }
  if (!body.destination) {
    return refusal(400, 'destination is required');
  }
  const task = queue({
    host,
    by: person.username,
    operation,
    target: 'filesystem',
    metadata: { source, destination: normalized(host, body.destination) },
  });
  return ok(
    {
      success: true,
      task_id: task.id,
      operation,
      status: 'pending',
      message: `${operation} task queued`,
    },
    202
  );
};

const afterTransfer = keep => (host, task) => {
  const store = storeOf(host);
  const { source, destination } = task.metadata;
  const entry = store.get(source);
  if (!entry) {
    return;
  }
  const copy = { ...entry, name: destination.split('/').pop(), path: destination, mtime: now() };
  store.set(destination, copy);
  if (!keep) {
    store.delete(source);
  }
};

const content = ctx => {
  const { host, url } = ctx;
  const path = normalized(host, url.searchParams.get('path'));
  const entry = storeOf(host).get(path);
  if (!entry || entry.isDirectory) {
    return refusal(404, `Not a file: ${path}`);
  }
  if (entry.isBinary) {
    return refusal(400, 'File is binary');
  }
  return ok({
    success: true,
    path,
    content: entry.content || '',
    size: entry.size,
    encoding: 'utf8',
  });
};

const written = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const path = normalized(host, body.path);
  const held = store.get(path);
  const text = String(body.content ?? '');
  const entry = held
    ? { ...held, content: text, size: text.length, mtime: now() }
    : entryOf(parentOf(path), {
        name: path.split('/').pop(),
        isDirectory: false,
        mode: body.mode || '644',
        size: text.length,
        mimeType: TEXT,
        isBinary: false,
        content: text,
      });
  store.set(path, entry);
  return ok({ success: true, item: wire(entry), message: 'File written' });
};

const archived = ctx => {
  const { host, person, body } = ctx;
  if (!Array.isArray(body.sources) || body.sources.length === 0 || !body.archive_path) {
    return refusal(400, 'sources and archive_path are required');
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'archive_create',
    target: 'filesystem',
    metadata: {
      archive_path: normalized(host, body.archive_path),
      format: body.format || 'tar.gz',
    },
  });
  return ok(
    { success: true, task_id: task.id, operation: 'archive_create', status: 'pending' },
    202
  );
};

const afterArchive = (host, task) => {
  const store = storeOf(host);
  const { archive_path: path } = task.metadata;
  store.set(
    path,
    entryOf(parentOf(path), {
      name: path.split('/').pop(),
      isDirectory: false,
      mode: '644',
      size: 1024 * 1024,
      mimeType: 'application/gzip',
      isBinary: true,
    })
  );
};

const extracted = ctx => {
  const { host, person, body } = ctx;
  if (!body.archive_path || !body.extract_path) {
    return refusal(400, 'archive_path and extract_path are required');
  }
  const task = queue({
    host,
    by: person.username,
    operation: 'archive_extract',
    target: 'filesystem',
    metadata: { extract_path: normalized(host, body.extract_path) },
  });
  return ok(
    { success: true, task_id: task.id, operation: 'archive_extract', status: 'pending' },
    202
  );
};

const afterExtract = (host, task) => {
  const store = storeOf(host);
  const { extract_path: path } = task.metadata;
  if (!store.has(path)) {
    store.set(
      path,
      entryOf(parentOf(path), { name: path.split('/').pop(), isDirectory: true, mode: '755' })
    );
  }
  const file = joined(path, 'extracted.txt');
  store.set(
    file,
    entryOf(path, {
      name: 'extracted.txt',
      isDirectory: false,
      mode: '644',
      size: 12,
      mimeType: TEXT,
      isBinary: false,
      content: 'extracted\n',
    })
  );
};

const permitted = ctx => {
  const { host, body } = ctx;
  const store = storeOf(host);
  const path = normalized(host, body.path);
  const entry = store.get(path);
  if (!entry) {
    return refusal(404, `Not found: ${path}`);
  }
  if (platformOf(host) === 'windows' && (body.uid !== undefined || body.gid !== undefined)) {
    return refusal(400, 'uid and gid are not supported on Windows');
  }
  const next = {
    ...entry,
    permissions: { ...entry.permissions, octal: body.mode || entry.permissions.octal },
    uid: body.uid ?? entry.uid,
    gid: body.gid ?? entry.gid,
  };
  store.set(path, next);
  return ok({ success: true, item: wire(next) });
};

const downloaded = ctx => {
  const { host, url } = ctx;
  const path = normalized(host, url.searchParams.get('path'));
  const entry = storeOf(host).get(path);
  if (!entry || entry.isDirectory) {
    return refusal(404, `Not a file: ${path}`);
  }
  return {
    status: 200,
    headers: {
      'Content-Type': entry.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${entry.name}"`,
    },
    body: entry.content || '',
    text: true,
  };
};

const uploaded = ctx => {
  const { host, raw } = ctx;
  const match = /filename="(?<name>[^"]+)"/u.exec(raw || '');
  const pathMatch = /name="uploadPath"\r?\n\r?\n(?<path>[^\r\n]+)/u.exec(raw || '');
  if (!match) {
    return refusal(400, 'file is required');
  }
  const base = normalized(host, pathMatch?.groups.path || '/');
  const entry = entryOf(base, {
    name: match.groups.name,
    isDirectory: false,
    mode: '644',
    size: (raw || '').length,
    mimeType: 'application/octet-stream',
    isBinary: true,
  });
  storeOf(host).set(entry.path, entry);
  return ok({ success: true, item: wire(entry), message: 'File uploaded' }, 201);
};

/**
 * The file system of a host behind `file-browser`, every route the file
 * manager calls as the agents answer it: `GET filesystem` with `path`,
 * `show_hidden` and the sort, `{ current_path, items }`, the root `C:/`
 * on a Windows host and `/` elsewhere; `POST filesystem/folder`,
 * `PATCH filesystem/rename` and `PATCH filesystem/permissions` each
 * answering `{ item }`, a Windows host refusing `uid` and `gid`;
 * `DELETE filesystem` with `recursive`; `POST filesystem/copy` and
 * `PUT filesystem/move` each a queued task on the target `filesystem`
 * that lands the copy or the move when it completes; `GET` and `PUT
 * filesystem/content`; `POST filesystem/archive/create` and
 * `archive/extract` each a queued task; `GET filesystem/download` the
 * file's bytes; and `POST filesystem/upload`, the multipart's file
 * kept under `uploadPath`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountFiles = agentRoute => {
  settles('file_copy', afterTransfer(true));
  settles('file_move', afterTransfer(false));
  settles('archive_create', afterArchive);
  settles('archive_extract', afterExtract);
  agentRoute('GET', 'filesystem', behind(listing));
  agentRoute('POST', 'filesystem/folder', behind(created));
  agentRoute('PATCH', 'filesystem/rename', behind(renamed));
  agentRoute('DELETE', 'filesystem', behind(removed));
  agentRoute('POST', 'filesystem/copy', behind(transferred('file_copy')));
  agentRoute('PUT', 'filesystem/move', behind(transferred('file_move')));
  agentRoute('GET', 'filesystem/content', behind(content));
  agentRoute('PUT', 'filesystem/content', behind(written));
  agentRoute('POST', 'filesystem/archive/create', behind(archived));
  agentRoute('POST', 'filesystem/archive/extract', behind(extracted));
  agentRoute('PATCH', 'filesystem/permissions', behind(permitted));
  agentRoute('GET', 'filesystem/download', behind(downloaded));
  agentRoute('POST', 'filesystem/upload', behind(uploaded));
};
