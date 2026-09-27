import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import process from 'process';

const [, , ROLE_WORD = 'server', PORT_WORD = ''] = process.argv;
const FIXTURES = path.resolve('tests/fixtures');
const STARTED_AT = Date.now();
const MINUTE_MS = 60 * 1000;

export const ZONE_MODE = ROLE_WORD === 'zone';
export const AGENT_MODE = ROLE_WORD === 'agent' || ZONE_MODE;
export const SETUP_MODE = ROLE_WORD === 'setup';
export const PORT = Number(PORT_WORD) || 9595;
export const SELF = 'self';
export const PROBLEM_BASE = 'https://auth.startcloud.com/probs/';
export const RED = '\u001b[31m';
export const GREEN = '\u001b[32m';
export const YELLOW = '\u001b[33m';
export const BLUE = '\u001b[34m';
export const MAGENTA = '\u001b[35m';
export const CYAN = '\u001b[36m';
export const BOLD = '\u001b[1m';
export const RESET = '\u001b[0m';
export const ORG_UUIDS = {
  acme: '0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11',
  prominic: '5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622',
  'hart-consulting': '9a3f4c77-10de-4e59-b0a2-6d5e8f1c7a33',
  'nomad-field-team': 'c4d2e9a1-7b3c-4a68-8f15-2e9b0d6c5f44',
  'startcloud-labs': 'e8f1a2b3-4c5d-4e6f-9a7b-0c1d2e3f4a55',
};

export const now = () => new Date().toISOString();

export const ago = minutes => new Date(STARTED_AT - minutes * MINUTE_MS).toISOString();

export const ahead = minutes => new Date(Date.now() + minutes * MINUTE_MS).toISOString();

export const secondsUp = () => Math.floor((Date.now() - STARTED_AT) / 1000);

export const fixture = (folder, file) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, folder, file), 'utf8'));

export const uniqueOf = list => [...new Set(list)];

export const copyOf = value => JSON.parse(JSON.stringify(value));

export const ok = (body, status = 200, headers = {}) => ({ status, body, headers });

export const empty = (status = 204, headers = {}) => ({ status, headers });

export const redirect = location => ({ status: 302, headers: { Location: location } });

export const problem = (status, title, more = {}) => ({
  status,
  problem: true,
  headers: {},
  body: { type: 'about:blank', title, status, ...more },
});

export const typedProblem = ({ status, name, title, more = {} }) => ({
  status,
  problem: true,
  headers: {},
  body: { type: `${PROBLEM_BASE}${name}`, title, status, ...more },
});

export const refusal = (status, error, more = {}) => ok({ error, ...more }, status);

export const unauthenticated = title =>
  typedProblem({
    status: 401,
    name: 'authentication',
    title,
  });

export const denied = (title, more = {}) =>
  typedProblem({ status: 403, name: 'forbidden', title, more });

export const missing = title => typedProblem({ status: 404, name: 'not-found', title });

export const failure = ({ pointer, rule, params = {} }) => ({
  pointer,
  rule,
  params,
  detail: `${pointer} failed ${rule}`,
});

export const invalid = errors =>
  typedProblem({
    status: 422,
    name: 'validation',
    title: 'The request did not pass validation.',
    more: { errors },
  });

export const taken = (pointer, scope) =>
  typedProblem({
    status: 409,
    name: 'conflict',
    title: 'The value is already taken.',
    more: { errors: [failure({ pointer, rule: 'unique', params: { scope } })] },
  });

export const stepUpRequired = () => denied('Confirm it is you.', { code: 'step_up_required' });

export const encodeSegment = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export const decodeSegment = text => {
  try {
    return JSON.parse(Buffer.from(String(text), 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

export const unsignedJwt = payload =>
  `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(payload)}.`;

export const payloadOf = token => {
  const [, segment = ''] = String(token || '').split('.');
  return segment ? decodeSegment(segment) : null;
};

export const pageOf = (rows, url, fallbackSize = 20) => {
  const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
  const size = Math.max(1, Number(url.searchParams.get('size')) || fallbackSize);
  return {
    items: rows.slice(page * size, page * size + size),
    page,
    size,
    total: rows.length,
    total_pages: Math.max(1, Math.ceil(rows.length / size)),
  };
};
