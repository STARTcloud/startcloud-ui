import fs from 'fs';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import YAML from 'yaml';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const loadDevConfig = () => {
  const configPath = './config.yaml';
  if (fs.existsSync(configPath)) {
    return YAML.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {};
};

const devConfig = loadDevConfig();
const devPort = devConfig.server?.port || 8080;
const apiTarget = devConfig.server?.api_target || 'http://localhost:3443';
const authTarget = devConfig.server?.auth_target || apiTarget;

const localeDirs = fs.existsSync('./public/locales')
  ? fs
      .readdirSync('./public/locales', { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name !== 'cimode')
      .map(entry => entry.name)
  : [];
const supportedLocales = localeDirs.length ? localeDirs : ['en'];

const ISSUER_PATHS = [
  '/login',
  '/webauthn',
  '/authenticator',
  '/resend-tfa',
  '/auth-cancel',
  '/passwordRecovery',
  '/passwordReset',
  '/registration',
  '/complete-onboarding',
  '/qrcode',
  '/oauth2',
  '/provider-registration',
  '/ciba',
  '/connect/logout',
  '/link-account',
  '/user/logout',
  '/.well-known',
  '/scim',
];

const PAGE_PATHS = [
  '/admin',
  '/login',
  '/authenticator',
  '/authenticator-method',
  '/passwordRecovery',
  '/passwordReset',
  '/registration',
  '/complete-onboarding',
  '/qrcode',
  '/oauth2/consent',
  '/oauth2/code',
  '/oauth2/accept-terms',
  '/provider-registration/tos',
  '/ciba/approve',
  '/connect/logout/confirm',
  '/connect/logout/frontchannel',
  '/link-account-consent',
];

const proxyTo = target => ({ target, changeOrigin: true, secure: false });

const isPage = pathname =>
  PAGE_PATHS.some(page => pathname === page || pathname.startsWith(`${page}/`));

const spaBypass = req => {
  const [pathname] = req.url.split('?');
  const accept = String(req.headers.accept || '');
  if (req.method === 'GET' && accept.includes('text/html') && isPage(pathname)) {
    return req.url;
  }
  return null;
};

const issuerProxy = () =>
  Object.fromEntries(
    ISSUER_PATHS.map(path => [path, { ...proxyTo(apiTarget), bypass: spaBypass }])
  );

const callbackRedirect = () => ({
  name: 'callback-redirect',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [pathname, query] = req.url.split('?');
      if (req.method === 'GET' && pathname === '/callback') {
        res.writeHead(302, { Location: `/callback/${query ? `?${query}` : ''}` });
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_NAME__: JSON.stringify(pkg.name),
    __SUPPORTED_LOCALES__: JSON.stringify(supportedLocales),
    __API_ORIGIN__: JSON.stringify(command === 'serve' ? apiTarget : ''),
  },
  plugins: [react(), svgr(), callbackRedirect()],
  base: '/',
  publicDir: 'public',
  server: {
    port: devPort,
    strictPort: true,
    host: 'localhost',
    hmr: {
      port: devPort,
      host: 'localhost',
    },
    proxy: {
      '/api/user/preferences': proxyTo(authTarget),
      '/api/notifications': proxyTo(authTarget),
      '/api': proxyTo(apiTarget),
      '/catalog.json': proxyTo(apiTarget),
      '/health.json': proxyTo(apiTarget),
      '/private': proxyTo(apiTarget),
      '/push': proxyTo(apiTarget),
      '/admin': { ...proxyTo(apiTarget), bypass: spaBypass },
      '/watches': proxyTo(apiTarget),
      '/health': proxyTo(apiTarget),
      '/config': proxyTo(apiTarget),
      ...issuerProxy(),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        callback: fileURLToPath(new URL('./callback/index.html', import.meta.url)),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: assetInfo => {
          if (assetInfo.name === 'favicon.ico' || assetInfo.name === 'dark-favicon.ico') {
            return '[name][extname]';
          }
          return `assets/[name].[ext]`;
        },
        manualChunks: id => {
          if (id.includes('node_modules/leaflet')) {
            return 'leaflet';
          }
          if (id.includes('node_modules/intl-tel-input/dist/js/data')) {
            return 'tel-data';
          }
          if (
            id.includes('node_modules/intl-tel-input') ||
            id.includes('node_modules/@intl-tel-input')
          ) {
            return 'tel-input';
          }
          if (
            id.includes('node_modules/react-bootstrap') ||
            id.includes('node_modules/@restart') ||
            id.includes('node_modules/@popperjs') ||
            id.includes('node_modules/dom-helpers')
          ) {
            return 'react-bootstrap';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
}));
