# STARTcloud UI

One React + Vite web UI for the STARTcloud estate — a single build that serves whichever backend hosts it, starting with **BoxVault** and the **Provisioner Catalog**, with the identity provider and further apps to follow.

The page asks the origin that served it `GET /api/status` and builds itself from the answer: `brand` and `links` draw the shell, `auth` picks the session (the host's own backend or the browser as an OIDC client), `collections` names the collections to mount, and every route, menu row and control is gated at runtime by the `features` tokens the host advertises. A backend that lacks a token never shows that surface; a new backend is a new status payload, never new UI code.

## Tech stack

- **React 19** + **React Router 7**
- **Vite** (build + dev server)
- **Bootstrap 5.3** + **react-bootstrap**
- **i18next** + **react-i18next** — `public/locales/<lang>/{shared,auth,<app>}.json`
- **axios** against the hosting backend's `/api/*` surface

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). The dev server proxies the API to the backends set in `config.yaml`:

```yaml
server:
  port: 8080
  api_target: https://provisioner-catalog.startcloud.com
  auth_target: https://dev-auth.startcloud.com
```

`api_target` answers `/api/status` and so decides which host the dev server renders; point it at a BoxVault backend (and set `auth_target` to the same origin) to work on BoxVault. `config.yaml` only affects local development — the built app talks to whatever origin serves it at runtime.

## Building

```bash
npm run build
```

Output goes to `dist/`, served from `/`.

## Distribution

CI (release-please → build) publishes each release as a versioned GitHub Release asset — `startcloud-ui-<version>.tar.gz`, the contents of `dist/`. Each backend pins a version, fetches that tarball into its `ui/` folder at build time and serves it statically with an SPA fallback.

## The `/api` contract

Every host that serves the build must answer `GET /api/status` before login with `role`, `version`, `brand`, `auth`, `collections`, `features`, `links` and `ticket` (`idp` when `auth` carries it), and implement the `/api/*` surface the features it advertises call. The `api/` folders under `src/features/` are the whole list.

## Layout

```text
src/
  app/                index.jsx (probes /api/status), App.jsx, provider.jsx, router.jsx, callback.jsx
  components/
    common/           Avatar, BrandLogo, ConfirmModal, ErrorBoundary, NotAvailableStub, PageHeader, ...
    layout/           AppShell, Header, Footer, Breadcrumbs, Search, UserMenu, Notices, ...
  features/
    auth/  admin/  organizations/  profile/  setup/  catalog/  deploy/  about/  notifications/
      api/  components/  hooks/  utils/  index.js
    collections/
      registry.js     token -> collection, mounted in status.collections order
      boxes/  isos/  provisioners/   definition, adapter, api, slots, index.js
  hooks/              useSession, useTheme, useFavicon, useSearchBinding
  contexts/           StatusContext, NoticeContext, SearchContext
  lib/                apiClient, backendSession, browserOidc, createSession, runtime, i18n, logger, ...
  utils/              capabilities, routes, relativeTime, gravatar, identity, ticketUrl, membership, ...
  config/             brand fallbacks and constants that are not from status
  css/                styles.css, fonts.css
public/
  brand/              boxvault.svg  boxvault-dark.svg
  locales/<lang>/     shared.json  auth.json  boxvault.json  catalog.json
```

## Scripts

| Script                              | Description                                         |
| ----------------------------------- | --------------------------------------------------- |
| `npm run dev`                       | Start the Vite dev server (localhost:8080)          |
| `npm run client`                    | Dev server bound to all interfaces (LAN access)     |
| `npm run build`                     | Production build to `dist/`                         |
| `npm run preview`                   | Preview the production build locally                |
| `npm run lint` / `npm run lint:fix` | ESLint (strict React + hooks + a11y + import rules) |
| `npm run quality` / `npm run fix`   | Lint plus Prettier check, or fix both               |

## License

[GPL-3.0](LICENSE.md)
