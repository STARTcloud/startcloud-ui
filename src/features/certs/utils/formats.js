const PEM = 'application/x-pem-file';
const TEXT = 'text/plain';
const JSON_MIME = 'application/json';

/**
 * The formats the engine writes, one row a `to` word the engine's
 * `convert` takes: the file extensions it may wear, its media type, the
 * component kinds it carries, whether a password is required, whether a
 * password is taken at all and whether the bytes are binary.
 */
export const FORMATS = [
  {
    id: 'pem',
    labelKey: 'certs.formats.pem',
    extensions: ['pem', 'crt', 'cer', 'key'],
    mime: PEM,
    carries: ['certificate', 'ca', 'intermediate', 'key', 'encrypted_key', 'public_key', 'csr'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'der',
    labelKey: 'certs.formats.der',
    extensions: ['der', 'cer'],
    mime: 'application/octet-stream',
    carries: ['certificate', 'ca', 'intermediate', 'key', 'public_key', 'csr'],
    needsPassword: false,
    takesPassword: false,
    binary: true,
  },
  {
    id: 'pkcs8',
    labelKey: 'certs.formats.pkcs8',
    extensions: ['key'],
    mime: PEM,
    carries: ['key'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'pkcs8_encrypted',
    labelKey: 'certs.formats.pkcs8Encrypted',
    extensions: ['key'],
    mime: PEM,
    carries: ['key'],
    needsPassword: true,
    takesPassword: true,
    binary: false,
  },
  {
    id: 'pkcs1',
    labelKey: 'certs.formats.pkcs1',
    extensions: ['key'],
    mime: PEM,
    carries: ['key'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'pkcs12',
    labelKey: 'certs.formats.pkcs12',
    extensions: ['pfx', 'p12'],
    mime: 'application/x-pkcs12',
    carries: ['certificate', 'ca', 'intermediate', 'key'],
    needsPassword: false,
    takesPassword: true,
    binary: true,
  },
  {
    id: 'pkcs7',
    labelKey: 'certs.formats.pkcs7',
    extensions: ['p7b', 'p7c'],
    mime: 'application/x-pkcs7-certificates',
    carries: ['certificate', 'ca', 'intermediate'],
    needsPassword: false,
    takesPassword: false,
    binary: true,
  },
  {
    id: 'openssh',
    labelKey: 'certs.formats.openssh',
    extensions: ['key'],
    mime: TEXT,
    carries: ['key'],
    needsPassword: false,
    takesPassword: true,
    binary: false,
  },
  {
    id: 'openssh_public',
    labelKey: 'certs.formats.opensshPublic',
    extensions: ['pub'],
    mime: TEXT,
    carries: ['key', 'public_key', 'certificate', 'ca', 'intermediate', 'csr'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'ppk',
    labelKey: 'certs.formats.ppk',
    extensions: ['ppk'],
    mime: TEXT,
    carries: ['key'],
    needsPassword: false,
    takesPassword: true,
    binary: false,
  },
  {
    id: 'jwk',
    labelKey: 'certs.formats.jwk',
    extensions: ['json'],
    mime: JSON_MIME,
    carries: ['key', 'public_key', 'certificate', 'ca', 'intermediate', 'csr'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'jwks_public',
    labelKey: 'certs.formats.jwksPublic',
    extensions: ['json'],
    mime: JSON_MIME,
    carries: ['key', 'public_key', 'certificate', 'ca', 'intermediate', 'csr'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'fullchain',
    labelKey: 'certs.formats.fullchain',
    extensions: ['pem'],
    mime: PEM,
    carries: ['certificate', 'ca', 'intermediate'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
  {
    id: 'combined',
    labelKey: 'certs.formats.combined',
    extensions: ['pem'],
    mime: PEM,
    carries: ['certificate', 'ca', 'intermediate', 'key'],
    needsPassword: false,
    takesPassword: false,
    binary: false,
  },
];

const KNOWN_EXTENSIONS = [
  ...new Set([...FORMATS.flatMap(format => format.extensions), 'csr', 'req', 'p8', 'jwk', 'txt']),
];

/**
 * The file input's accept list, every extension the formats wear and
 * the ones a dropped file may carry besides.
 */
export const ACCEPT = KNOWN_EXTENSIONS.map(extension => `.${extension}`).join(',');

/**
 * The stem of a file name: the name with a known extension taken off,
 * any other dotted name kept whole, so `leaf.pem` gives `leaf` and
 * `www.example.com` stays as it is.
 *
 * @param {string} name - The file name
 * @returns {string} The stem
 */
export const fileStemOf = name => {
  const at = name.lastIndexOf('.');
  if (at <= 0) {
    return name;
  }
  return KNOWN_EXTENSIONS.includes(name.slice(at + 1).toLowerCase()) ? name.slice(0, at) : name;
};

/**
 * One format by its `to` word, null for a word the table lacks.
 *
 * @param {string} id - The `to` word
 * @returns {Object|null} The format
 */
export const formatOf = id => FORMATS.find(format => format.id === id) || null;

/**
 * The `to` words of the formats that cannot be written without a
 * password.
 */
export const PASSWORD_FORMATS = FORMATS.filter(format => format.needsPassword).map(
  format => format.id
);

/**
 * The formats that can be written from the component kinds picked: every
 * format whose `carries` covers every one of the kinds, so nothing picked
 * is dropped on the way out.
 *
 * @param {Array<string>} kinds - The picked component kinds
 * @returns {Array<Object>} The formats offered
 */
export const formatsFor = kinds =>
  FORMATS.filter(format => kinds.length > 0 && kinds.every(kind => format.carries.includes(kind)));

/**
 * The components a format carries out of the ones given, the rest left
 * behind.
 *
 * @param {Array<Object>} components - The components, each with a `kind`
 * @param {string} to - The format's `to` word
 * @returns {Array<Object>} The components the format writes
 */
export const carriedBy = (components, to) => {
  const format = formatOf(to);
  return format ? components.filter(component => format.carries.includes(component.kind)) : [];
};

const PLAIN = 'pem';

/**
 * The one file name every download of the feature saves under: the stem,
 * the format's word and the extension, the word left out where it says
 * nothing the extension does not, when it is the extension itself and
 * when it is `pem`, the text encoding of whatever the extension names
 * (`leaf.pem`, `leaf.crt`, `req.csr`, `leaf.key`, `leaf.pkcs8.key`,
 * `leaf.fullchain.pem`, `leaf.pkcs12.pfx`).
 *
 * @param {string} stem - The file's stem
 * @param {string} to - The format's `to` word
 * @param {string} extension - The extension the file wears
 * @returns {string} The file name
 */
export const fileNameOf = (stem, to, extension) => {
  const base = stem || 'certificate';
  return to === extension || to === PLAIN ? `${base}.${extension}` : `${base}.${to}.${extension}`;
};
