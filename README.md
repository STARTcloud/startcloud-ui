# STARTcloud UI

One React + Vite web UI for the STARTcloud estate — a single build that serves whichever backend hosts it, starting with **BoxVault**, the **Provisioner Catalog** and the **VDI Health Monitor**, with the identity provider and further apps to follow.

The page asks the origin that served it `GET /api/status` and builds itself from the answer: `brand` and `links` draw the shell, `auth` picks the session (the host's own backend or the browser as an OIDC client), `collections` names the collections to mount, and every route, menu row and control is gated at runtime by the `features` tokens the host advertises. A backend that lacks a token never shows that surface; a new backend is a new status payload, never new UI code.

## Tech stack

- **React 19** + **React Router 7**
- **Vite** (build + dev server)
- **Bootstrap 5.3** + **react-bootstrap**
- **i18next** + **react-i18next** — `public/locales/<lang>/{shared,auth}.json`
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

Output goes to `dist/`, served from `/`. The SPA owns `/` on every host, programs call `/api` and the paths their protocol dictates, and a machine and a browser asking for the same root URL are told apart by the client's own signal (`Accept` or its user agent), never by a redirect or a proxy; the build stays `base: '/'`.

## Distribution

CI (release-please → build) publishes each release as a versioned GitHub Release asset — `startcloud-ui-<version>.tar.gz`, the contents of `dist/`. Each backend pins a version, fetches that tarball into its `ui/` folder at build time and serves it statically with an SPA fallback.

## Hosting the UI

A host is a backend that serves this build and answers `GET /api/status`. Nothing in the UI names a host; a new one is a status payload and the `/api/*` routes its tokens call.

1. Pin a release as `startcloudUiVersion` in your `package.json`, fetch `startcloud-ui-<version>.tar.gz` into `ui/` at build time and serve it statically at `/` with an SPA fallback to `index.html` (and `callback/index.html` at `/callback/` when you answer `idp`), the fallback tried after every `/api` and protocol route; no redirect from `/`, no proxy in front.
2. Answer `GET /api/status` before login, without auth:

   ```json
   {
     "role": "boxvault",
     "version": "0.77.0",
     "brand": {
       "name": "BoxVault",
       "logoUrl": "/brand/boxvault.svg",
       "repo": "https://github.com/Makr91/BoxVault"
     },
     "auth": ["backend"],
     "collections": ["boxes", "isos"],
     "features": [
       "local-accounts",
       "setup",
       "admin",
       "org-console",
       "discover",
       "invitations",
       "uploads",
       "watches",
       "deploy",
       "favorites",
       "notifications",
       "health",
       "search"
     ],
     "links": { "docs": "/docs", "contact": "" },
     "ticket": null
   }
   ```

   | Field             | Meaning                                                                                                                                                                                                                                                   |
   | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `role`, `version` | Your app name and released version; the version is the footer's and the About page's                                                                                                                                                                      |
   | `brand`           | `name`, `logoUrl` (a path you serve, or one of `public/brand/`) and `repo`                                                                                                                                                                                |
   | `auth`            | `["backend"]` for your own session routes (`/api/auth/*`, `/api/user`, `/api/userinfo/claims`, `/api/user/preferences`), `["idp"]` for the browser as the OIDC public client, or `[]` for no session at all (everyone sees everything, no Sign in button) |
   | `idp`             | With `idp` only: `issuer`, `clientId`, `scopes`, `storagePrefix`                                                                                                                                                                                          |
   | `collections`     | The collections to mount, in order, the first with no route segment: `boxes`, `isos`, `provisioners`; `[]` on a host without collections                                                                                                                  |
   | `config`          | The configuration file names the admin page draws one tab each for, served at `/api/config/<name>`; absent means `["app"]`                                                                                                                                |
   | `events`          | With the `events` token only: `{ path, topics }`, the one event stream the runtime opens per tab and every topic the host streams                                                                                                                         |
   | `features`        | The gate; absence hides the surface, no array at all renders everything                                                                                                                                                                                   |
   | `links`           | `docs` and `contact`                                                                                                                                                                                                                                      |
   | `ticket`          | `{ baseUrl, reqType, fallbackCustomerId }`, or `null` when you serve them at `/api/config/ticket`                                                                                                                                                         |

3. Implement the `/api/*` routes behind the tokens you advertise; the `api/` folders under `src/features/` and `src/features/collections/` are the whole list, one call per line.
4. Carry `dependency-bump.yml` so each UI release opens a `bump/startcloud-ui` pull request against your pin, for a human to merge.

| Token              | Surface                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `local-accounts`   | the `/register` form and the profile page's password, email and delete-account sections                               |
| `setup`            | `/setup` and the setup gate before any other route                                                                    |
| `admin`            | `/admin` and the Admin menu row (still needs `ROLE_ADMIN`)                                                            |
| `org-console`      | `/org-console` and its menu row (still needs org OWNER/ADMIN)                                                         |
| `discover`         | `/organizations/discover` and the Discover button on the home page                                                    |
| `invitations`      | the Invitations tab in the org console                                                                                |
| `uploads`          | ISO upload zone, box file upload, the upload slots                                                                    |
| `private-catalogs` | `/api/private/<uuid>/...` per membership, the access-denied banner                                                    |
| `watches`          | watch stars and the Watched filter                                                                                    |
| `deploy`           | the Deploy button and glyph (still needs the hyperweaver entitlement and `/api/config`)                               |
| `rebuild`          | the Rebuild catalog data menu row (still needs `ROLE_ADMIN`)                                                          |
| `favorites`        | the Add to Favorites toggle on About (needs `/api/favorites`)                                                         |
| `notifications`    | the Notifications menu row (still needs the scope)                                                                    |
| `health`           | the footer health heart from `/api/health`                                                                            |
| `search`           | the app-wide search list and `/search?q=` ask `GET /api/search`; without it the UI searches what its collections load |
| `events`           | the one event stream at `events.path`, opened once per tab with every topic the host advertises                       |
| `fleet`            | the fleet page at `/` and `/vm/:instance` over `/api/vdi/*`, `/api/config/grafana` and the `fleet` topic              |

The routes `/login`, `/register`, `/profile`, `/invite/:token` and `/auth/callback` exist only for `backend`; `/callback/` only for `idp`. A deep link to a route the host lacks renders a not-available page naming the missing token. `/search?q=` exists on every host.

The VDI Health Monitor answers `role: "vdi-health"` with `brand.logoUrl: "/brand/vdi-health.svg"`, `auth: []` or `["idp"]`, `collections: []`, `config: ["app"]`, `events: { "path": "/api/events", "topics": ["fleet"] }` and the tokens `health`, `events` and `fleet` (plus `admin` under `idp`).

## Layout

```text
src/
  app/                index.jsx (probes /api/status), App.jsx, provider.jsx, router.jsx, callback.jsx
  components/
    common/           Avatar, BrandLogo, ConfirmModal, ErrorBoundary, NotAvailableStub, PageHeader, ...
    layout/           AppShell, Header, Footer, Breadcrumbs, Search, UserMenu, Notices, ...
  features/
    auth/  admin/  organizations/  profile/  setup/  catalog/  deploy/  about/  notifications/  search/  vdi/
      api/  components/  hooks/  utils/  index.js
    collections/
      registry.js     token -> collection, mounted in status.collections order
      boxes/  isos/  provisioners/   definition, adapter, api, slots, index.js
  hooks/              useSession, useTheme, useFavicon, useSearchBinding, useEventStream
  contexts/           StatusContext, NoticeContext, SearchContext
  lib/                apiClient, backendSession, browserOidc, anonymousSession, createSession, runtime, sse, eventHub, i18n, logger, ...
  utils/              capabilities, routes, relativeTime, gravatar, identity, ticketUrl, membership, ...
  config/             brand fallbacks and constants that are not from status
  css/                styles.css, fonts.css
public/
  brand/              boxvault.svg  boxvault-dark.svg  vdi-health.svg
  locales/<lang>/     shared.json  auth.json
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
