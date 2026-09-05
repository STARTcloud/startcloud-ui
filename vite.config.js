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

const proxyTo = target => ({ target, changeOrigin: true, secure: false });

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_NAME__: JSON.stringify(pkg.name),
    __SUPPORTED_LOCALES__: JSON.stringify(supportedLocales),
    __API_ORIGIN__: JSON.stringify(command === 'serve' ? apiTarget : ''),
  },
  plugins: [react(), svgr()],
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
      '/admin': proxyTo(apiTarget),
      '/watches': proxyTo(apiTarget),
      '/health': proxyTo(apiTarget),
      '/config': proxyTo(apiTarget),
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
