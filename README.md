# STARTcloud UI

One React + Vite web UI for the STARTcloud estate — a single build that serves whichever backend hosts it, starting with **BoxVault** and the **Provisioner Catalog**, with the identity provider and further apps to follow.

The page asks the origin that served it `GET /api/status` and reads `role` from the answer; that picks the app (`boxvault`, `catalog`) whose routes, adapters and strings load on top of the shared chrome, pages and session code. Everything an app differs in arrives as data; the navbar, footer, notices, search, organization switcher, notifications, account pages, admin pages and listing pages are the same code for every app.

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

`api_target` answers `/api/status` and so decides which app the dev server runs; point it at a BoxVault backend (and set `auth_target` to the same origin) to work on BoxVault. `config.yaml` only affects local development — the built app talks to whatever origin serves it at runtime.

## Building

```bash
npm run build
```

Output goes to `dist/`, served from `/`.

## Distribution

CI (release-please → build) publishes each release as a versioned GitHub Release asset — `startcloud-ui-<version>.tar.gz`, the contents of `dist/`. Each backend pins a version, fetches that tarball into its `ui/` folder at build time and serves it statically with an SPA fallback.

## The `/api` contract

Every host that serves the build must answer `GET /api/status` before login with at least `{ "role": "<app>", "version": "<backend version>" }`, and implement the `/api/*` surface its app's adapter calls. The `auth`, `account`, `organizations`, `admin` and `setup` adapters under `src/apps/<app>/` are the whole list.

## Layout

```text
src/
  main.jsx            probes /api/status and loads apps/<role>
  chrome/  pages/  session/  css/   shared by every app
  apps/<app>/
    main.jsx          boot(status)
    App.jsx           routes
    Shell.jsx         AppChrome wiring
    config.jsx        names, keys, session, client, push
    api.js            every backend call
    adapter.js        item-shape adapters
    collections.jsx   the collections the listing pages draw
    slots/            per-collection action components
public/locales/<lang>/ shared.json  auth.json  <app>.json
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
