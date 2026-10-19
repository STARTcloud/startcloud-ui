const KEY = 'certs.profile';

const labelOf = id => `${KEY}.${id}.label`;

const helpOf = (id, members) =>
  Object.fromEntries(members.map(member => [member, `${KEY}.${id}.help.${member}`]));

const extraOf = (id, key, options = null) => ({
  key,
  labelKey: `${KEY}.${id}.extra.${key}`,
  ...(options ? { options } : {}),
});

const profile = ({ id, kinds, url = '', help = [], extras = [], icon }) => ({
  id,
  kinds,
  labelKey: labelOf(id),
  help: helpOf(id, help),
  url,
  extras,
  icon,
});

/**
 * The known services a secret row may name through its `profile`: each
 * its id, the kinds it takes, the key of its label, the key of a help
 * line per member, the url it seeds, the `extra` members the form draws
 * with the key of each label and, where one is a choice, its options,
 * and the name of its glyph among `react-icons/fa6`.
 */
export const PROFILES = [
  profile({
    id: 'hcl_portal',
    kinds: ['api_key'],
    url: 'https://my.hcltechsw.com',
    help: ['key'],
    icon: 'FaCloudArrowDown',
  }),
  profile({
    id: 'github',
    kinds: ['api_key'],
    url: 'https://github.com',
    help: ['key'],
    icon: 'FaGithub',
  }),
  profile({
    id: 'digitalocean',
    kinds: ['api_key'],
    url: 'https://api.digitalocean.com',
    help: ['key'],
    icon: 'FaDigitalOcean',
  }),
  profile({
    id: 'cloudflare',
    kinds: ['api_key'],
    url: 'https://api.cloudflare.com',
    help: ['key'],
    icon: 'FaCloudflare',
  }),
  profile({
    id: 'wix',
    kinds: ['api_key'],
    url: 'https://www.wixapis.com',
    help: ['key', 'account_id'],
    extras: [extraOf('wix', 'account_id')],
    icon: 'FaWix',
  }),
  profile({
    id: 'openai',
    kinds: ['api_key'],
    url: 'https://api.openai.com/v1',
    help: ['key', 'url'],
    extras: [
      extraOf('openai', 'model'),
      extraOf('openai', 'assistant_id'),
      extraOf('openai', 'enabled'),
    ],
    icon: 'FaRobot',
  }),
  profile({
    id: 'stripe',
    kinds: ['api_key'],
    url: 'https://api.stripe.com',
    help: ['key'],
    icon: 'FaStripe',
  }),
  profile({
    id: 'atlas',
    kinds: ['api_key'],
    url: 'https://vagrantcloud.com',
    help: ['key'],
    icon: 'FaBoxOpen',
  }),
  profile({
    id: 'installer_server',
    kinds: ['basic_auth', 'api_key'],
    help: ['url', 'user', 'password', 'key'],
    icon: 'FaServer',
  }),
  profile({
    id: 'docker_hub',
    kinds: ['basic_auth'],
    url: 'https://index.docker.io/v1/',
    help: ['user', 'password'],
    icon: 'FaDocker',
  }),
  profile({
    id: 'aws',
    kinds: ['key_pair'],
    help: ['access_key', 'secret_key', 'region'],
    icon: 'FaAws',
  }),
  profile({
    id: 'acme_dns',
    kinds: ['custom'],
    help: ['custom'],
    icon: 'FaGlobe',
  }),
  profile({
    id: 'machine_login',
    kinds: ['password', 'ssh_key'],
    help: ['password', 'private_key'],
    extras: [extraOf('machine_login', 'username')],
    icon: 'FaUserLock',
  }),
  profile({
    id: 'notes_id',
    kinds: ['file'],
    help: ['bytes', 'password'],
    extras: [extraOf('notes_id', 'id_type', ['safe', 'server', 'user', 'certifier'])],
    icon: 'FaIdCard',
  }),
  profile({
    id: 'license',
    kinds: ['file', 'api_key'],
    help: ['bytes', 'key'],
    extras: [
      extraOf('license', 'product'),
      extraOf('license', 'holder'),
      extraOf('license', 'expiry'),
    ],
    icon: 'FaFileContract',
  }),
];

/**
 * The map a `custom` row of a profile starts from, the acme-dns profile
 * one domain's four members under the domain's name.
 */
export const CUSTOM_SEEDS = {
  acme_dns: {
    'example.com': { username: '', password: '', subdomain: '', fulldomain: '' },
  },
};

/**
 * The profiles that take a kind, every profile while no kind is named.
 *
 * @param {string} kind - The secret kind, empty for every profile
 * @returns {Array<Object>} The profiles
 */
export const profilesOf = kind =>
  kind ? PROFILES.filter(entry => entry.kinds.includes(kind)) : PROFILES;

/**
 * One profile by id, null for none or for the generic row.
 *
 * @param {string} id - The profile id
 * @returns {Object|null} The profile
 */
export const profileOf = id => PROFILES.find(entry => entry.id === id) || null;
