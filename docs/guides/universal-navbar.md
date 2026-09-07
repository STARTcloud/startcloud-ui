---
title: Universal Navbar Contract
layout: default
nav_order: 8
parent: Guides
permalink: /docs/guides/universal-navbar/
---

## Universal Navbar Contract

{: .no_toc }

One account cluster and one user menu for every estate app. This contract
governs the right-hand cluster (search, theme, language, account), the
search module and its filter panel, the user menu, and its two modals —
nothing else. Brand, navigation links, layout, and
the app's overall style are the app's own. The visual reference is
[universal-navbar.html](../universal-navbar.html) — the first frame on that
page is live, every control in it works as this text says, and the
annotated frames after it explain each row, the search module in every
state, and the filter panel on BoxVault's and the catalog's pages. An app conforms when its cluster and menu match the live frame row
for row, and every conformance-checklist line below is ticked with a
side-by-side screenshot in the PR.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- The order, labels, conditions, and behaviour of universal rows are
  fixed. An app never re-orders, renames, or relocates a universal row.
- Universal rows render with the app's own component library, icon set,
  and theme. The contract fixes what appears and in what order, not how it
  is drawn.
- Every row has a **shown-when** condition. An app hides a row only by that
  condition never being met — never by choice.
- One app-named section holds the app's own rows, as many as it needs,
  each gated by the app. Anything the app keeps out of its top bar (docs,
  about, API reference, source) belongs there.
- Every UI backend keeps the top bar and its cluster. A UI backend whose
  feature exports an action menu swaps the account slot for it and draws
  the user menu at the foot of the sidebar instead (see Sidebar).
- The identity provider's `/userinfo` is the source of identity,
  organizations and preferences; favorites are read from the identity
  provider's `GET /api/user/favorites`, the one source the menu and the
  profile's Favorites tab share, never from a claim. Server-side apps
  proxy both with the OIDC access token they hold for the user, the
  favorites route at the same path on their own origin the way they
  proxy the hub; public SPAs call the identity provider directly.

---

## Account cluster

The right-hand end of the app's top bar (or its account control). Left of
it is the app's: the brand, the utility links while signed out, and the
route breadcrumb while signed in (see the
[Universal Pages Contract](universal-pages/)).

| Slot     | Signed out                                                                                                                                                                                                                                                                            | Signed in                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Search   | first in the cluster, only while the page has registered a search: magnifier icon that expands into the search input (see Search and filters)                                                                                                                                         | same                                                               |
| Theme    | icon button, cycles auto → light → dark                                                                                                                                                                                                                                               | same; writes through `PATCH /api/user/preferences`                 |
| Language | a globe glyph (`FaGlobe`) with the current language's two-letter code, `aria-label` "Change language, English" → language modal                                                                                                                                                       | same; writes through                                               |
| Account  | primary **Sign in** button; it always carries the page it was pressed on as the return path, the ended session's page while the session-ended banner shows, never an auth page; hidden while the route is an auth path of the identity contract, where the page itself is the sign-in | user's name + avatar as one toggle; clicking either opens the menu |

- Theme and language follow the
  [Preferences, Language & Branding Contract](preferences-and-branding/):
  the account value overwrites local storage on login, toggles write
  through optimistically, `auto` resolves via `prefers-color-scheme`, and
  every app ships the pre-paint script.
- Name = `name` → username → email. Avatar = `picture` (or the app's stored
  avatar URL) → Gravatar by email hash → the app's own mark. Never an empty
  circle.
- No bell in the cluster. Notifications are a menu row.
- Cluster icon buttons (theme, language) are borderless and transparent —
  no outline, no background until hover.
- Utility links the app keeps for anonymous visitors (About, Docs,
  Contact) live in the top bar only while signed out; signed in they move
  into the app-named menu section, and the left nav then carries at most
  the brand and the breadcrumb.
- Left of the cluster, signed in, the app draws a breadcrumb after the
  brand: plain text crumbs separated by a muted `›`, never buttons, pills
  or dropdowns. The crumbs come from the route alone —
  `› org › collection › item › version › provider`, each a plain link up
  the route — and are identical in BoxVault and the catalog; the brand is
  the root. An org crumb carries the org's logo (→ Gravatar → the app's
  mark) and name, a collection crumb its icon. The active organization is
  never a crumb: it is the user menu's organization row and the switcher,
  and switching it never moves the page.

---

## Search and filters

One search module for every page that has something to search. The page
owns what is searched and how; the module owns the shell, and the shell is
identical in every app.

- **Placement**: first control in the account cluster, a 34px borderless
  magnifier button like the theme and language buttons. It exists only
  while the current page has registered a search; a page with nothing to
  search shows no icon.
- **Expand**: click, or hover-dwell of about 400 ms, replaces the icon
  with a 340px input carrying a leading magnifier, the page's placeholder,
  a live `matched / total` count, a gear, and a ×; focus lands in the
  input. Typing filters the page live on every keystroke — there is no
  submit and no server round trip from the shell.
- **Gear**: toggles the filter panel; it is drawn active while the panel is
  open or any filter is on, and is omitted when the page registers no
  filter groups. The collapsed icon is tinted while any filter is on, so a
  filtered page still says so.
- **App-wide**: the module exists on every page of a UI backend that can be
  searched as a whole (see Global scope below), not only on pages that
  registered a binding; on a page without one the box carries the app's
  name as its placeholder ("Search BoxVault"), no count and no gear, and
  drives only the app-wide list. On a page with a binding the box does
  both at once: the page filters live as before, and the same query feeds
  the app-wide list under the panel.
- **Mode** (the everywhere half is planned, see Global scope below): once
  the box is expanded, its leading magnifier is a mode switch. Every click
  on it flips between this app and everywhere; the placeholder and the
  count say which mode is on ("Search boxes", `3 / 16` on this page;
  "Search everywhere" and the hit count in everywhere mode), and the
  filter groups, which belong to the page, are hidden while everywhere is
  on. Escape returns to this-app mode with the query kept.
- **×**: clears the query and every active filter, closes the panel, and
  collapses back to the icon. Escape collapses when the query is empty.
- **Panel**: drops out under the header at full width, on the tertiary
  band with a top border, one row per group: an uppercase group label and
  pills labelled `value (count)`, each toggling that value, active pills
  in the group's colour and inactive pills in the muted secondary tint. The
  label column sizes to the longest label on the page, and a group with no
  values on the page is not drawn. A foot row shows the active-filter count
  and a "Clear filters" link, which empties the sets but keeps the query and
  the panel.
- **Registration**: a page publishes a binding — the query and its
  setter, the placeholder, the matched and total counts, the filter groups
  (key, label, entries with counts, the active set, the active class or a
  per-value class, an optional per-value label, a toggle, and a `columns`
  flag on the one group that picks columns rather than rows), a
  clear-filters handler and, once the results list exists, an optional
  `searchElsewhere(query)` function answering deep-linked hits from the
  rest of the app — for as long as it is mounted; the module reads the
  newest binding on every event, so a page never adapts to the shell.
  Persistence of picked filters is the page's own, per page in local
  storage under `table_prefs_<org or home>`, the same key on every UI backend
  because storage is per origin.
- Groups come from the page in a fixed order: a **Collection** group
  (Boxes, ISOs) whenever the page lists more than one collection, so only
  boxes or only ISOs is a pill and never a page or a tab; the shared
  **Visibility** group (Public, Private) whenever private rows exist on
  the page; the shared **Watched** group, one pill, whenever the viewer is
  signed in and a watched row of any collection is on the page; then each
  collection's own groups, prefixed by the collection name when several
  are listed. Every app brings the filters it already has, not new ones:
  BoxVault's boxes bring Provider (primary), Architecture (info) and OS
  (success); its ISOs bring Organization (primary) across organizations;
  the catalog brings Tier (the tier badge colours) and Provider (primary).
- After a collection's own groups, while the page is in list view, a
  **Columns** group for that collection, prefixed the same way: one pill
  per column of that collection's table, drawn without a count and active
  while the column is shown; a pill shows or hides its column, the choice
  persists with the page's other preferences, columns a collection marks
  `defaultHidden` (Created, Updated and Architectures on boxes and ISOs)
  start hidden, and a sort on a hidden column is dropped until the column
  returns. The group is not a filter: it never counts toward the
  active-filter count, never tints the gear or the icon, and Clear filters
  leaves it alone.

---

## Global scope

Two layers. The in-app layer is built and lives in the shared chrome; the
everywhere layer is planned. The identity provider is what ties the
estate together, so estate-wide search is a contract concern and lives
here, not in any one app's backlog.

- **Results list**: whenever the module has hits beyond the page, they
  drop under the filter panel as one list, grouped by collection and then
  by kind, each row the collection's icon or the kind's glyph, a title, a
  muted subline (`org · collection · version`), a small badge naming the
  field that matched, and the deep link of the universal route shape
  (`/{org}/{collection}/{item}/{version}/{provider}`); click or Enter
  navigates through the router, arrow keys move between rows, Escape
  clears the list first and collapses the box on the next press. Rows
  may carry a right-hand action where the app has one (a console, an SSH
  launcher).
- **Elsewhere in this app**: when the query has two or more characters
  the module, after a 250 ms pause, asks the UI backend for the top five hits
  per kind and lists them under an "Elsewhere in BoxVault" heading (the
  app's own name; "In BoxVault" on a page with no binding of its own),
  followed by a "Show all N results" link into the search page whenever a
  kind had more. A UI backend that advertises the `search` feature token is
  asked through `GET /api/search?q=&limit=`; any other UI backend is searched
  client-side from what its collections' adapters already load (the
  catalog's `catalog.json` plus the private catalogs), the same rows and
  the same list either way.
- **Search page**: `/search?q=`, a reserved segment on every UI backend, is the
  full result: the same query bound to the navbar box so typing refines
  the page, one table per kind (Title, Where, Matched) with header sort
  and Columns pills like every other table, fifty rows per kind, the
  count line, and the deep links. A UI backend with nothing to search says so
  on the page instead of hiding the route.
- **What a UI backend answers**: `/api/search` returns
  `{ query, results, truncated }`, every result
  `{ kind, collection, org, name, version, provider, architecture, title, subtitle, matched }`
  with `kind` one of organization, item, version, provider, architecture,
  artifact, user; `collection` the collection key or null; the route
  parts filled as deep as the hit goes; `subtitle` the plain
  `org · collection · version` chain; `matched` the field name; and
  `truncated` the count beyond `limit` per kind. No ids, no paths, no
  metadata values: the UI builds the path from the parts through the
  universal route shape, which is why no URL may move.
- **What is searched and who sees it**: every kind's query carries the
  same visibility clause as the list endpoint of that kind, so a caller is
  never shown a row it could not already list. BoxVault matches
  organizations (name, display name, description); boxes and ISOs (name,
  description, short description, readme, repository, and the metadata
  facts distro, distro version, OS name, VM type, username, communicator,
  providers, built, provisioner and driver versions, never the password
  fact); versions (number, description, release notes, deprecation
  reason); providers and architectures (name); artifacts (checksum by
  exact value or a prefix of six or more characters, file name); and
  users (username, email) for a global admin everywhere and for an
  organization's owners and admins within it. The catalog matches
  provisioners (name, label, description, repository), their versions and
  artifact names and organizations, client-side.
- **Everywhere**: the same list, answered by every client in the estate
  that has registered its search endpoint on the identity provider's
  shared search channel, the way producers register with the notification
  hub: a client advertises `/api/search` to the channel, the channel fans a
  query out to the registered clients with the token the estate already
  shares, and the rows come back in the shape above, merged and grouped
  by app. The mode switch is the expanded box's leading magnifier; no
  scope row, no pills for scopes. Planned and owned by the identity
  provider; the channel is built there first and each client's part is
  handed out from it afterwards, nothing is built in a client ahead of it.
- **Contract**: the list and the page live once in the shared chrome
  (`src/features/search/` and the search module), and a checklist row is
  added per app that exposes a search endpoint.

---

## Chrome metrics

Page layout stays each app's own, but the header and footer are shared
seams the user crosses between apps, so their metrics are fixed:

- **Header**: one content row of 34px controls (buttons, avatar, brand
  mark) with 14px vertical padding — 62px total.
- **Band**: the header is a distinct surface — the theme's tertiary
  background with a 1px bottom border — mirroring the footer's tertiary
  background and top border, so chrome reads as chrome in both variants.
- **Pinned**: the app is a viewport-high flex column, header, page,
  footer; the page region between them is the one scroll container and the
  window itself never scrolls, so the header and the footer stay in place
  by layout, the header with a small shadow marking the seam; a route
  change scrolls the page region back to the top.
- **Full-bleed**: chrome carries no outer margins and no max-width
  container — header and footer span the viewport, with only the gutter
  inside them.
- **Gutter**: header and footer content align to the same 20px horizontal
  gutter. Bodies may be full-bleed or contained per app; chrome may not.
- **Footer**: one 13px text row with 12px vertical padding. The
  "Powered by" mark may load from a remote URL, but the line must degrade
  to the company-name text alone when the image fails — never a broken
  image.
- **Sidebars** follow the Sidebar section below and share these metrics.

---

## Sidebar

A UI backend gets a sidebar when a mounted feature exports entries for
it, and none otherwise; the shell decides from the exports, never from a
field of the status payload. The visual reference is
[universal-sidebar.html](../universal-sidebar.html), whose "How it fits"
section draws the order the contracts build on one another and one UI
backend assembled from all of them, the auth server and BoxVault side by
side.

- **Grid.** With entries the app is a viewport-high row: the sidebar
  first, spanning the full height, then the header, the notice banners,
  the one scroll region and the footer stacked beside it, so collapsing
  the sidebar moves the whole stack. The window never scrolls: the
  sidebar's entries scroll under its top, the page scrolls between the
  header and the footer, and the footer stays the one fixed row of the
  metrics above.
- **Top.** One 62px button: the brand mark, the product name and a
  chevron; a click or Enter collapses the sidebar to a 38px rail and
  expands it again, and in the rail the mark alone remains, titled
  Expand. While a sidebar is drawn the header row opens with the crumbs
  and carries no brand; without one the header keeps the brand. Never
  two brands at once.
- **Metrics.** The tertiary band with a right border, 260px by default,
  180 to 400px by the drag handle on its right edge, 38px as the rail,
  the same 20px gutter inside.
- **Entries.** Two kinds share the one column. Sections: an uppercase
  label, then rows of an icon, a label and an optional badge, active by
  route with the primary wash and a 3px left tab, the icon alone with the
  label as its title in the rail; a section left without rows by gating
  is not drawn. Tree: nodes with a caret, children loaded on expand, a
  status dot, a right-click menu from one presenter, the selection driven
  by the route and never by checkboxes; a tree may carry views, a select
  at its top switching between the shapes the feature exports (by pool,
  by host, by state), the way Proxmox's resource tree does.
- **Export.** A feature exports `sidebar(status, account)` answering
  `[{ key, labelKey, sections | tree | views }]` after its own token and
  role checks, `views` being `[{ key, labelKey, useTree }]` when a tree
  has more than one shape; the router concatenates every mounted
  feature's answer and hands the list to `AppShell` as `sidebar`, and
  the sidebar never re-decides a gate. Every `to` is a route of a
  contract. Entries come only from features; the status payload adds
  none. A section is `{ key, labelKey?, items }` and a row
  `{ key, icon, labelKey, to, end?, badge?, external? }`, `end` marking a
  row active on its exact path alone and `external` marking a row the
  shell follows as a top-level navigation rather than a router link,
  never active, because a page still served by another chrome is
  reached and left by a full load. A bare `tree` is a hook, the same
  shape a view's `useTree` answers: `{ nodes, menu? }`, every node
  `{ key, icon?, label, to, children?, status? }`, `children` a function
  the sidebar calls on expand answering the child nodes, `status` a word
  the status dot draws (`up`, `idle`, absent for none), and `menu(node)`
  answering the right-click rows as `[{ key, labelKey, onClick }]`; a
  node's `label` is text the feature already has, never a key, because
  a pool or a host is named by its data. A row's `badge` names a count the shell
  resolves from the event hub where the UI backend advertises `events`,
  and from a count route the feature names on a UI backend without a
  stream, never a number the export computes, never a string drawn as is
  and never the full table the count comes from, because the column
  draws on every page and a timer is the last resort, not the first.
- **Foot.** Bare, with one exception: while a mounted feature exports
  `actionMenu`, the header's account slot draws that menu in the same
  toggle shape and the user menu draws at the sidebar's foot as a
  drop-up, the identity card as its toggle and the avatar alone in the
  rail; theme and language stay in the header cluster. No estate app
  uses the exception today.
- **Storage.** `sidebar_width`, `sidebar_minimized`,
  `sidebar_open_<group>` and `sidebar_view_<group>` per origin, in the
  session contract's storage table.
- **Keyboard and small screens.** `nav aria-label`, arrow keys between
  rows, Left collapses a node, Right expands, Escape closes a menu; under
  900px the sidebar overlays from the left behind a header toggle and
  closes on a route change.

---

## Reference implementation

One repository carries the agreed chrome, line for line:
[STARTcloud/startcloud-ui](https://github.com/STARTcloud/startcloud-ui),
one React + Vite build that every estate app serves. There is no
per-app code in it: the page probes the origin that served it for
`GET /api/status` and builds itself from the answer, so a conforming app
is a status payload, never a folder. A UI backend is the application, in
any language, that serves this build and answers `GET /api/status`.
The tree is the feature-first layout
(`app`, `components`, `features`, `hooks`, `contexts`, `lib`, `utils`,
`config`) the UI's README draws, and the parts this contract names are:

| Path                                                                           | Role                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/index.jsx`                                                            | The one entry: `probeStatus` against the serving origin, `initRuntime(status)`, `configureLogger`, `createI18n`, then `AppProvider` and `App`; a failed probe writes one plain line into the page                                                                                                                                                |
| `src/app/App.jsx`                                                              | `useSession` over the session `status.auth` picked, the theme and favicon, the setup gate while the UI backend advertises `setup`, the avatar, the ticket link, the notification adapters, and the menu rows the UI backend's `features` unlock, all handed to `AppShell`                                                                        |
| `src/app/router.jsx`                                                           | Every route: the collection routes from the registry in `status.collections` order and each feature route gated by `hasFeature` or the first `auth` token, `NotAvailableStub` for a route the UI backend lacks                                                                                                                                   |
| `src/app/provider.jsx`, `src/app/callback.jsx`                                 | The providers the app renders through; the `/callback/` entry of an `idp` UI backend                                                                                                                                                                                                                                                             |
| `src/components/layout/`                                                       | The chrome: `AppShell.jsx`, `Sidebar.jsx`, `Header.jsx`, `Breadcrumbs.jsx`, `Search.jsx`, `SearchPanel.jsx`, `UserMenu.jsx` with `IdentityCard.jsx`, `LogoutItem.jsx`, `FavoriteApps.jsx` and `NotificationsItem.jsx`, the three modals `LanguageModal.jsx`, `OrgSwitcherModal.jsx` and `NotificationsModal.jsx`, `Notices.jsx` and `Footer.jsx` |
| `src/components/common/`                                                       | `Avatar.jsx`, `BrandLogo.jsx` (the `status.brand.logoUrl` mark and its dark variant), `ErrorBoundary.jsx`, `NotAvailableStub.jsx`, `ConfirmModal.jsx`, `PageHeader.jsx` and the other pieces every feature draws                                                                                                                                 |
| `src/contexts/StatusContext.jsx`                                               | `probeStatus`, `StatusProvider`, `useStatus` and `statusShape`: the payload every shell reads its brand, links and version from                                                                                                                                                                                                                  |
| `src/utils/capabilities.js`                                                    | `hasFeature` (a UI backend whose `features` is not an array renders everything), `hasFeatureStrict`, `hasCollection`, `authMethod`                                                                                                                                                                                                               |
| `src/lib/`                                                                     | `createSession.js` (the provider and return-path helper for the first `auth` token), `runtime.js` (`initRuntime`: the bus, the session, the API client at the serving origin and the hub client), `apiClient.js`, `backendSession.js`, `browserOidc.js`, `cookieSession.js`, `i18n.js`, `logger.js`, `events.js`, `returnTo.js`                  |
| `src/features/collections/registry.js`                                         | `collectionsFor(status)`: the `boxes`, `isos` and `provisioners` definitions in the UI backend's order, the watch calls dropped when the UI backend lacks `watches`                                                                                                                                                                              |
| `src/features/notifications/`                                                  | The hub inbox client and the browser push subscription behind the Notifications modal, based where the hub answers for the UI backend (the identity provider itself for an `idp` UI backend, the app's own proxying backend otherwise)                                                                                                           |
| `src/css/styles.css`, `src/css/fonts.css`, `index.html`, `callback/index.html` | The one stylesheet, the faces, the entry with the pre-paint script, and the callback entry                                                                                                                                                                                                                                                       |
| `public/locales/<lang>/shared.json`, `auth.json`                               | The two namespaces, every key of every UI backend                                                                                                                                                                                                                                                                                                |
| `public/brand/`                                                                | The brand marks a UI backend may name in `brand.logoUrl` when it does not serve its own                                                                                                                                                                                                                                                          |

### Distribution

`release-please` publishes each UI release as
`startcloud-ui-<version>.tar.gz`, the contents of `dist/`, on the GitHub
Release. Each backend pins one version as `startcloudUiVersion` in its
`package.json` (BoxVault `backend/package.json`, the catalog the root
`package.json`); a backend with no `package.json` pins it where its
packaging already keeps its own version (the VDI Health Monitor as
`[tool.startcloud] ui_version` in `pyproject.toml`, the authorization
server as `version` in `packaging/config/ui-version.yaml` beside its
`version.yaml`). The backend's CI fetches that tarball into `ui/` before
the build runs (`curl -fsSL … | tar -xz -C ui`); the build tool and the
built artefact never fetch it and never contain it, because an artefact
copied between hosts must run with no network and a build must be
reproducible from the checkout plus the pinned tarball, which only CI has
the network to fetch. The package carries `ui/` as a folder on disk
beside the binary (BoxVault `backend/ui`, the VDI Health Monitor
`/opt/vdi-health/ui`, the authorization server
`/opt/prominic/authorization-server/ui`), the backend serves that folder
statically with an SPA fallback, so a file in it is live on the next
reload, and it carries `dependency-bump.yml`: the UI's release workflow sends every
consumer a `dependency-update` repository dispatch, and that workflow
answers it with a `bump/startcloud-ui` pull request, `fix: bump
startcloud-ui to <tag>`, whose CI runs on its own and which a human merges
(the startcloud_roles → provisioner pattern).

### Where the UI is served

Every UI backend serves the SPA at `/`, and everything a program calls lives
under `/api`, plus the paths a client protocol dictates (the Vagrant box
shapes, `/badge`, `/scim/v2`, `/catalog.json`, `/watches`). A machine and a browser
asking for the same root URL are told apart by the client's own signal,
`Accept` or its user agent, the way Vagrant Cloud answers `/myuser/test`
with JSON for `vagrant box add` and a page for a person; no UI backend redirects,
and no UI backend puts a reverse proxy in front of itself to do so. The build is
`base: '/'`, the router owns `/`, and a UI backend's fallback for a browser page
request is `index.html`, tried after every API and protocol route. A UI backend
written in another language keeps the same order: `/api` and the protocol
routes first, the SPA fallback last. hyperweaver-ui is served at `/ui/`
today because its agents mount their whole API at the origin root; it
joins this rule when those routes move under `/api`, and until then the
two families differ by that one fact.

### The status payload

Every UI backend answers `GET /api/status` before login, without auth, and the
UI reads nothing else to decide what to render:

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
    "footer"
  ],
  "links": { "docs": "/docs", "contact": "" },
  "ticket": null
}
```

| Field             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`, `version` | The app name and the UI backend's released version; the version is the footer's and the About page's                                                                                                                                                                                                                                                                                                                                                                                                                |
| `brand`           | `name` (the app section's header and the footer's name), `logoUrl` (a path the UI backend serves, the brand mark, the org mark and the favicon), `repo` (the footer link), optionally `theme`, the site's default variant (`light` or `dark`) the pre-paint script applies before local storage holds a choice, and optionally `pack`, `{ name, css }`, the pack the shell stamps as `data-brand` and links as its stylesheet, per the [branding contract](preferences-and-branding/); absent means stock Bootstrap |
| `auth`            | Session methods, the first entry wins: `backend` is the app's own backend session (`createBackendSession`), `idp` the browser as the OIDC public client (`createBrowserOidc`), `cookie` the identity provider's own session on its own origin (`createCookieSession`, the [Universal Identity Contract](universal-identity/))                                                                                                                                                                                       |
| `analytics`       | Optional: `{ script_url, attribute, value }`; the shell appends the script tag with that data attribute, so a UI backend with a static `index.html` keeps its Plausible or Umami tag                                                                                                                                                                                                                                                                                                                                |
| `idp`             | Present only when `auth` contains `idp`: `issuer`, `clientId`, `scopes`, `storagePrefix`, all required                                                                                                                                                                                                                                                                                                                                                                                                              |
| `collections`     | The collection registry entries to mount, in order; each definition carries its own hard-coded route segment; data, never a gate                                                                                                                                                                                                                                                                                                                                                                                    |
| `features`        | The gate: absence hides the surface; a UI backend with no `features` array at all renders everything                                                                                                                                                                                                                                                                                                                                                                                                                |
| `links`           | `docs` and `contact`: the utility links while signed out, rows of the app section signed in                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ticket`          | `{ baseUrl, reqType, fallbackCustomerId }` for a UI backend with no config route; `null` when the UI backend serves them at `/api/config/ticket`                                                                                                                                                                                                                                                                                                                                                                    |
| `events`          | Present only with the `events` token: `{ path, topics }`, the one stream of the [Universal Events Contract](universal-events/) and every topic the UI backend can stream; the runtime opens it once per tab                                                                                                                                                                                                                                                                                                         |
| `config`          | The config file names the admin page draws one tab each for, served at `/api/config/<name>` (`["app"]` on the VDI Health Monitor; absent means `["app"]`)                                                                                                                                                                                                                                                                                                                                                           |

The feature tokens and the surface each unlocks:

| Token                                                                     | Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local-accounts`                                                          | the `/register` form and the profile page's password, email and delete-account sections (the routes themselves follow the `backend` or `cookie` auth token); on the identity provider it is per site, present while the site allows self-registration                                                                                                                                                                                                                                                                                   |
| `setup`                                                                   | `/setup` and the setup gate before any other route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `admin`                                                                   | `/admin` and the Admin menu row (still needs `ROLE_ADMIN`); on a `cookie` UI backend the row is absent because the sidebar carries the operator's pages                                                                                                                                                                                                                                                                                                                                                                                 |
| `org-console`                                                             | `/org-console` and its menu row (still needs org OWNER/ADMIN on a `backend` UI backend; on the identity provider any member opens the console and the record's own flags gate its controls)                                                                                                                                                                                                                                                                                                                                             |
| `discover`                                                                | `/organizations/discover` and the Discover button on the home page                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `invitations`                                                             | the Invitations tab in the org console                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `uploads`                                                                 | ISO upload zone, box file upload, the upload slots                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `private-catalogs`                                                        | fetch `/api/private/<uuid>/...` per membership, the access-denied banner                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `watches`                                                                 | watch stars and the Watched filter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `deploy`                                                                  | the Deploy button and glyph (still needs the hyperweaver entitlement and a configured URL)                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `rebuild`                                                                 | the Rebuild catalog data menu row (still needs `ROLE_ADMIN`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `favorites`                                                               | the Add to Favorites toggle on About, over `GET` and `PUT /api/user/favorites` through the hub client, the app's own origin on a `backend` UI backend and the identity provider with the user's token on an `idp` or `cookie` one, the same client the user menu reads: the toggle reads the list, adds or removes its own `client_id` and writes the whole ordered list back as `[{ client_id, custom_label, order }]`, `snake_case` as the identity contract's route fixes it; no `/api/favorites` route exists                       |
| `notifications`                                                           | the Notifications menu row (still needs the scope, or the `cookie` auth token)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `health`                                                                  | the footer health heart from `/api/health`, drawn only while `footer` is listed too; a UI backend without `footer` draws no footer at all, one with `footer` and no `health` draws the footer without the heart, and the heart's state arrives on the events stream where the UI backend advertises `events`, on a 60 s poll only where it does not                                                                                                                                                                                     |
| `search`                                                                  | the app-wide search list and the search page ask the UI backend's `GET /api/search`; without it the UI searches what its collections load, client-side                                                                                                                                                                                                                                                                                                                                                                                  |
| `events`                                                                  | the one event stream at `events.path` of the [Universal Events Contract](universal-events/), opened once per tab by the runtime with every topic in `events.topics`, pages subscribing to its events by name                                                                                                                                                                                                                                                                                                                            |
| `fleet`                                                                   | the home route is the fleet page and `/vm/{instance_id}` the per-VM page of the [Universal Pages Contract](universal-pages/#fleet-pages), over `/api/vdi/*` and the `fleet` topic                                                                                                                                                                                                                                                                                                                                                       |
| `footer`                                                                  | the footer row of the Footer status section; a UI backend that lists it draws the footer, one that omits it draws none, and a UI backend with no `features` array renders everything, the footer included                                                                                                                                                                                                                                                                                                                               |
| `tfa`, `onboarding`, `interstitials`, `inbox`, `integrations`, `policies` | the identity provider's own pages of the [Universal Identity Contract](universal-identity/): the second-factor pages, the onboarding chain, the OAuth and OIDC interstitials, the notification inbox page, the integrations page and the public policy pages; each only under the `cookie` auth token, and every one of them drawn without the sidebar and the app-section rows while the route is an auth, onboarding or interstitial page, because a consent dialog inside the signed-in chrome is a distraction from a protocol step |

BoxVault answers from `backend/package.json` in both its configured and its
setup-only mode; the catalog's Worker answers from the `version.txt` the
data job publishes beside `catalog.json` and takes `idp.issuer` and
`idp.clientId` from its `ISSUER` and `AUDIENCE` vars; the VDI Health
Monitor answers from `importlib.metadata.version("vdi-health")` with
`auth: []` under `auth.mode: none` (everyone sees everything, no Sign in
button, no session-ended banner) or `auth: ["idp"]` with the `idp` object
from its YAML, `collections: []`, `config: ["app"]` and
`events: { path: "/api/events", topics: ["fleet"] }` plus `session` under
`idp`.

The native theme every app shares, which the branding contract leaves out
of its v1 scope: stock Bootstrap 5 tokens with no app palette, Open Sans
for body text and Montserrat for headings and the brand, both self-hosted
as bundled `woff2` (never fetched from a font CDN at runtime), and
`react-icons/fa6` glyphs for every chrome icon.

Native theme files, one of each in the repository:

- `src/components/layout/` — the whole chrome as one folder: `Header.jsx`
  (brand slot, empty while a sidebar is drawn, crumbs slot, the cluster
  with search, theme, language and account, the search panel),
  `Sidebar.jsx` (the Sidebar section: the top button, the sections and
  tree entries, the rail, the foot), `Breadcrumbs.jsx` (plain crumbs; the picker
  shape exists but no estate app uses it), `UserMenu.jsx` with
  `IdentityCard.jsx`, `LogoutItem.jsx`, `FavoriteApps.jsx` and
  `NotificationsItem.jsx`, the three modals `LanguageModal.jsx`,
  `OrgSwitcherModal.jsx` and `NotificationsModal.jsx`, `Footer.jsx`,
  `Notices.jsx` (`NoticeBanners` and `NoticeCards`: the in-app notice
  surface of the Notices section, over `NoticeProvider`, `useNotify` and
  `useDismiss` in `src/contexts/NoticeContext.jsx`), `Search.jsx` and
  `SearchPanel.jsx`, and `AppShell.jsx` (the whole chrome around the
  routes: it draws the sidebar first when the mounted features exported
  entries, parses the route and draws the crumbs, resolves the org
  crumb's logo from the memberships or the primary collection's adapter,
  assembles the user menu from the identity, organizations, menu and
  session data, raises the session-ended banner, renders the header with
  the notice banners under its row, the notice cards, the one scroll
  region with the page inside its own error boundary so a page that
  throws keeps the chrome, and the footer with `status.version` and
  `status.brand.repo`, and takes the routes as its children). Everything
  a UI backend differs in comes from `status` or is a prop of `AppShell`: the
  session state, the collections, the avatar, the ticket URL, the
  notification and push adapters, the admin and org-console flags, the
  extra menu rows and the optional health function.
- `src/utils/routes.js` (the route parser and crumb builder of the pages
  contract), `src/hooks/useTheme.js`, `src/utils/relativeTime.js`,
  `src/utils/identity.js` (`userDisplayName` and `userSecondaryLine`, the
  contract's name chain and the email line that shows only when it
  differs), `src/utils/gravatar.js` (one Gravatar profile fetch per email
  hash behind a day-long local-storage cache), `src/components/common/Avatar.jsx`
  (the picture, else the fallback node, else a user glyph),
  `src/components/common/ErrorBoundary.jsx` (the render-error fallback
  card, refresh and home, the stack behind a fold in development),
  `src/lib/logger.js` (`configureLogger`, `log`, `redact` and
  `reportRenderError`: the category loggers `app`, `auth`, `api`, `file`,
  `component`, `error`, with levels from the UI backend's health payload or the
  build-mode defaults, a `loglevel:<category>` local-storage override per
  category, credential redaction of metadata, and error-level entries
  batched to `/api/client-errors` on a `backend` or `cookie` UI backend,
  never carrying a request body or a query string), `src/lib/apiClient.js`
  (`createApiClient`, `ApiError` and `encodePath`: the one HTTP client of
  the session contract's API client section), `src/config/brand.js`
  (`POWERED_BY`, the footer's mark, one value for the estate, and
  `brandLogoUrl`, the dark variant of a mark this build ships).
- `src/lib/` — the whole session layer as one folder: the bus, the
  return-path helper, both providers and `createSession`, as the
  [Universal Session Contract](universal-session/) fixes them; the
  session state hook is `src/hooks/useSession.jsx` and the callback page
  `src/features/auth/components/CallbackPage.jsx`.
- `src/css/styles.css` — the one stylesheet; there is no second one.
- `src/css/fonts.css` — the `@font-face` declarations of the chrome's two
  faces and the account pages' two.
- the pre-paint script in `index.html` — resolves account preference →
  `localStorage.theme` → `auto`, stamps `data-bs-theme` and `lang`.
- the theme state: `themePreference` stored under `localStorage.theme`,
  `auto` resolved through `prefers-color-scheme` via
  `useSyncExternalStore`, write-through on toggle.
- the i18n setup, `createI18n({ loadSupportedLanguages })` in
  `src/lib/i18n.js`: two namespaces, `shared` as the default and the
  fallback and `auth` beside it; `getSupportedLanguages()` from the list
  the UI backend supplies (`supported_languages` in `/api/health`, else the
  build's locale folders), the init promise gating the first render,
  `languageChanged` stamping `<html lang>`. Every key lives in
  `public/locales/<lang>/shared.json`, one file for every UI backend: `loading`,
  `yes`, `no`, `language.changeLanguage`, `error.*`, the chrome's
  `navbar.*` (including the `boxvault` and `catalog` brand rows),
  `theme.*`, `sessionEnded.*`, `notAvailable.*`, `notice.*`, `errors.*`
  (the API client's status keys), `orgSwitcher.*`, `roles.*`, `inbox.*`,
  `notifications.*`, `search.*`, `footer.health.*`, `collections.*`,
  `inviteAccept.*`, the whole `pages.*` block, and the collection and
  About keys under `boxes.*`, `isos.*`, `provisioners.*`, `rebuild.*`,
  `tiers.*`, `rules.*`, `health.*`, `about.boxvault.*` and
  `about.catalog.*`; `auth.json` is the whole `auth` namespace of the
  account pages and the footer's `login.poweredBy*`. Components that name
  a namespace name `shared` or `auth`. CI checks every namespace file of
  every language against `en` for key parity.
- one Prettier configuration (single quotes, width 100) and one ESLint
  configuration (`eslint.config.mjs`, with the Vite globals declared in
  it) for the whole repository.

---

## Footer status

The footer draws only while the UI backend lists the `footer` token; a
white-label site that omits it has no footer, no "Powered by" and no
heart. Its three slots are fixed: on the left the app's name, copyright
year and version, `<name> © <year> · v<version>`, plain text with no
glyph, the whole thing one link to the app's source repository; "Powered
by" in the center; and the status cluster on the right, which holds the
health indicator only while the UI backend lists `health` too — an icon
colored by overall state, with the per-service detail on hover or click,
its state arriving on the events stream where the UI backend advertises
`events` and by a 60-second poll only where it does not.

Every health surface speaks one shape, `{ status, timestamp, services }`,
`status` ok / warning / error and every `services` value a coarse status
word, so the one footer renders BoxVault's `/api/health` and the catalog
Worker's `/health` alike; each app adds its own service names to the
shared `footer.health.*` keys.

Degrade a piece, never the slot: without a public repository the left
slot links to the app's changelog instead, and is plain text when neither
exists; without a health surface the right slot is empty. The left slot is
never empty — every app has a name and a version, the version being the
`version` of the UI backend's `/api/status` payload, read through `useStatus()`,
never a value baked into the UI build. A UI backend that omits `footer`
shows that version as a muted `v<version>` beside `brand.name` in the
user menu's app-section header, because a person reporting a fault must
be able to read the version somewhere and a white-label site has taken
the footer away.

---

## User menu, top to bottom

| #   | Row                                                                | Shown when                                                                                                                                                                                                                                                                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Identity card: avatar, name, email, target glyph, trailing chevron | signed in                                                                                                                                                                                                                                                                  | Whole card is one link → `{issuer}/user/profile`. Email line only when it differs from the name; neither is truncated — the menu grows with them as it does with any row. The glyph and chevron sit in a fixed-width `user-card-actions` slot so the card measures the same in every app: an id-badge glyph marks the IdP profile as the target, a user glyph marks a local profile. Apps with both a local profile page and an IdP session make the glyph a mode toggle that flips the target without navigating (the card body navigates to the shown target); everywhere else it is a static indicator. Apps may additionally list the local profile in their own section. |
| 2   | Active organization: org logo + org name                           | `organizations` claim has ≥ 2 memberships                                                                                                                                                                                                                                  | Opens the organization switcher modal. No subline, no role badge, no chevron.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3   | Preferences                                                        | signed in through the IdP, or the first `auth` token is `cookie`; hidden while a sidebar row already points at the profile, so one destination never has two rows                                                                                                          | Link → `{issuer}/user/profile#preferences` (language, theme, time zone, sign-in approval). Nothing is edited inline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| —   | divider                                                            |                                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | **Favorites** header + one row per app                             | `GET /api/user/favorites` answers at least one row, read once per session through the hub client: the identity provider on an `idp` or `cookie` UI backend, the app's own origin on a `backend` one, which proxies the path to the identity provider with the user's token | Sorted by `order`; label `custom_label` → `client_name` → `client_id`; icon `icon_url` → `{home_url origin}/favicon.ico` → star; opens `home_url` in a new tab with `rel="noopener noreferrer"`. A `home_url` or `icon_url` is drawn only when it parses with the `https:` scheme, and every image carries `referrerpolicy="no-referrer"`, because these values come from client registrations and a `javascript:` or `http:` value would run or leak on every app that draws the menu. Favorites are managed on the IdP profile page, and an app may offer "Add to Favorites" on its own About page.                                                                         |
| —   | divider                                                            |                                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 5   | **App section** — header is the app's name                         | the app defines at least one row                                                                                                                                                                                                                                           | Any number of rows; each row gated by the app (`ROLE_ADMIN`, org OWNER/ADMIN, feature flags). Typical rows: Admin, Organization console, local Profile, About, Docs, API reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| —   | divider                                                            |                                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6   | Notifications + unread badge                                       | access token carries the `notifications` scope, or the first `auth` token is `cookie`                                                                                                                                                                                      | Opens the Notification Channel Notifications modal. The unread count arrives on the events stream where the UI backend advertises `events`, and only a UI backend without a stream polls it every 60 s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7   | Help                                                               | the app's ticket system is enabled and has a base URL                                                                                                                                                                                                                      | Opens the ticket URL in a new tab (see Help ticket).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| —   | divider                                                            |                                                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 8   | Logout                                                             | always                                                                                                                                                                                                                                                                     | Red row: scope icon + "Logout". See Logout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Icons: universal rows use the app's icon set at the app's size; the row
label text is the contract, not the glyph.

---

## Organization switcher modal

Title "Switch Organization". One row per membership from the
`organizations` claim, personal orgs last:

- org logo → Gravatar (org email hash) → the app's mark
- name and description
- role badge: Owner (danger), Administrator (warning), Member (secondary)
- crown icon on the `primary` membership; active row: primary border +
  green check; a row that is both shows crown then check
- picking a row switches and closes and never navigates: the page stays
  where it is; the × in the title bar is the only other way out — no
  Cancel button in either modal

Filter-style apps (hyperweaver) prepend an "All organizations" row.

Persistence: the active org uuid is stored per app in local storage,
validated against the claim on every load, and falls back to the primary
membership, then the first. Any active-org indicator the app shows and
every org-scoped request read the same value.

---

## Notifications modal

Three things carry the word notification in this estate, and the docs and
keys keep them apart:

| Word                                   | Meaning                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Toasts**                             | OS notifications (Windows, macOS, a phone) delivered by Web Push from the app's own origin with its own VAPID keys and service worker    |
| **Notification Channel Notifications** | the hub's feed for the user, read from the identity provider and shown in this modal and in every estate app                             |
| **In-app notices**                     | what the app itself tells the user on the page: the Notices section's banners and cards (failed actions, validation, the session ending) |

Title "Notification Channel Notifications", header action "Mark all read",
close button; the dialog is 720px wide. Rows: type icon coloured by
severity, title (bold when unread, followed by an open-in glyph when the
row carries an `https://` `navigate` link), body, relative time, unread
dot, and on hover a per-row mark-read (unread rows only) beside the
dismiss. Footer, left: the per-device "Toasts (OS notifications) on this
device" switch; right: two small glyph
buttons with tooltips, a screen glyph "Send a test toast" (only while the
switch is on) and a paper-plane glyph "Send a test Notification Channel
Notification", then "View all notifications" → `{issuer}/notifications`.
Each test answers through an in-app notice card, "Test sent." or
"Test failed: …".

- Read API: `GET /api/notifications?page&size&unread_only`,
  `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`,
  `POST /api/notifications/read-all`, `DELETE /api/notifications/{id}` — with
  the user's Bearer token carrying the `notifications` scope. Server-side
  apps call it with the OIDC access token they hold; a public SPA calls the
  issuer directly.
- Row click marks read, then follows `navigate` when it is `https://`.
- Toasts are per app: the app's own VAPID keys and service worker on its
  own origin, subscription posted to the app's own endpoint, the current
  subscription re-POSTed on every page load, `DELETE …?endpoint=` on
  switch-off, and the service worker re-subscribes and re-POSTs on
  `pushsubscriptionchange`. The hub never toasts a producer's events. The
  push worker is the build's `/notification-sw.js` at the origin root,
  carries no `fetch` handler, is registered with scope `/push/` (the UI
  backend sends `Service-Worker-Allowed: /push/` and
  `Cache-Control: no-cache` on that one file), because a worker at
  root scope with a `fetch` handler can rewrite every page and redirect
  of the origin and outlive the script injection that registered it.
- A toast switch failure answers inline in the modal: unsupported browser,
  permission denied, or `403` scope missing. The browser shows its
  permission prompt only while the permission is not yet decided.
- The two test buttons call the app's own backend as the signed-in user:
  BoxVault `POST /api/notifications/test/toast` and
  `POST /api/notifications/test/channel`, the catalog Worker
  `POST /push/test-toast` and `POST /push/test-channel`; the toast route
  pushes to the caller's own subscriptions, the channel route writes one
  hub notification addressed to the caller's identity-provider uuid.

---

## Help ticket

Query parameters on the configured base URL: `req` (default `sso`),
`customerId`, `user` (display name), `email`, `context` (`<app>|<version>`)
and, from the error page alone, `type` (`Backend`) beside a `context`
that carries the reference alone.
`customerId` resolves active org `customer_id` → user `customer_id` → the
app's configured fallback. Hidden when the ticket system is disabled.

---

## Logout

One red row. The icon is a scope toggle, the text logs out.

| Icon                  | Scope         | What happens                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bridge-lock (default) | everywhere    | revoke the app session, then follow the IdP end-session URL: `/connect/logout` with `id_token_hint`, `client_id`, `post_logout_redirect_uri`, `state` (POST from server-side apps; a public SPA submits a form POST). The IdP may show its confirmation page and the front-channel interstitial. |
| house-lock            | this app only | revoke the app session; the SSO session survives for seamless re-login                                                                                                                                                                                                                           |

- Clicking the icon flips the scope without logging out (stop propagation,
  menu stays open); tooltip names the other scope.
- Non-OIDC sessions (local, LDAP, API key) show a plain sign-out icon and
  no toggle.
- Server-side apps register `logout-redirect-uris` and, where they hold
  sessions, a `back-channel-logout-uri`; they store the ID token's `sid` at
  login and revoke on the matching logout token.
- Every app keeps the ID token for the session so "everywhere" can always
  send `id_token_hint`.

---

## Notices

The in-app notices: one surface for everything an app tells the user
outside the data itself, drawn by the chrome from `chrome/notices.jsx`
and raised through one hook, in two tiers (a toast is something else, see
the Notifications modal's vocabulary):

- **Banners**, in the page flow under the header row and above the filter
  panel, on the tinted band of their kind: state the user must know before
  acting — the session ended elsewhere, the catalog's private-catalog
  refusal. One per condition, keyed so a repeat replaces rather than
  stacks, each with its kind icon, text, an optional action and a dismiss;
  they push the page down so they are never missed and stay until
  dismissed or their condition clears.
- **Cards**, at the top right under the header, at most four, newest
  first: feedback on what the user just did — saved, deleted, copied, a
  watch that failed. Success and info fade after six seconds, paused while
  the pointer or focus rests on them; warning and danger stay until
  dismissed. Every card carries its kind icon, text, an optional action
  and a dismiss, and none reflows the page.
- **Inline stays inline**: field validation beside its field, a form's
  submit error under the form, the error boundary's full-page fallback,
  the callback page's failure, progress, empty and help states, one-time
  secrets. Nothing is duplicated into a card.
- **The hook**: `notify(kind, text, { tier, key, sticky, action })` with
  kind `success`, `info`, `warning` or `danger`; `tier` is `card` unless
  `banner`; `key` replaces an earlier notice with the same key and, with
  an empty `text`, dismisses it; `sticky` keeps a success or info card
  until dismissed; `action` is `{ label, onClick | to | href }`. It returns
  the notice id and `useDismiss()` removes one by id. Pages, slots and the
  app's own screens all raise through it; no screen keeps an alert state
  of its own. Banners carry `role="status"` for success and info and
  `role="alert"` for warning and danger; every card is announced as an
  alert.
- **Session ended elsewhere**: when the session dies outside the app —
  back-channel logout, refresh failure, a revoke sweep, a 401 on an
  authenticated call — the app clears its session, renders the signed-out
  cluster, and raises one keyed warning banner, "You were signed out. Your
  session ended. Sign in again to continue where you were.", with no
  action of its own: the cluster's Sign in, right above it, carries the
  return path, and dismissing the banner keeps that path. Server-side apps
  push this over SSE so open tabs react immediately.
- **Keys**: `notice.dismiss`, `sessionEnded.*` and every notice text in
  `shared.json`.

---

## Silent SSO

Where the app has a default provider, the login page tries `prompt=none`
once per browser session before showing a form; a bounce is benign and
never an error. Any `error`, `provider`, or `logout` parameter suppresses
the attempt.

---

## Conformance checklist

Tick each line in the PR that claims conformance, with a screenshot beside
the live frame of the reference page.

| Line                                                                                                                                                                                       | Catalog                                                                     | BoxVault                                                                                                                                           | VDI Health                                                                                                        | hyperweaver-ui | Auth server                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One build of startcloud-ui with no per-app code; every difference a field of the UI backend's `/api/status`                                                                                | ✓ the Worker's status payload                                               | ✓ `status.controller.js`                                                                                                                           | ✓ `routes/status.py`                                                                                              |                | to come — the issuer's status payload of the [Universal Identity Contract](universal-identity/)                                                                          |
| Serves the pinned UI release and answers `GET /api/status` with `role`, `version`, `brand`, `auth`, `collections`, `features`, `links` and `ticket`                                        | ✓ Pages payload, the Worker answers from `version.txt` with `idp`           | ✓ `backend/ui`, the backend answers from its `package.json`                                                                                        | ✓ `/opt/vdi-health/ui`, the version from `importlib.metadata`, `collections: []`, `config: ["app"]`, `events`     |                | to come — `packaging/config/ui-version.yaml`, the deb's `/opt/prominic/authorization-server/ui/` served at `/`, `GET /api/status` per site from `BuildProperties`        |
| Cluster: search · theme · globe · name+avatar, both states                                                                                                                                 | ✓                                                                           | ✓                                                                                                                                                  | ✓ under `idp`; no Sign in button under `auth: []`                                                                 |                | to come — the shared chrome; the Sign in button hidden on the auth routes, theme and language present there                                                              |
| Search: icon first, expands on click/dwell, live count, gear, ×, Escape                                                                                                                    | ✓                                                                           | ✓ every listing page, Discover organizations, the org console's members and the admin's organizations, each with its own placeholder and no groups | ✓ the fleet page's binding                                                                                        |                | to come — the admin Sessions page's binding on user and application; the other admin tables carry their filters on the page                                              |
| Filter panel: full-bleed under the header, Collection then Visibility then the page's groups, then Columns per collection in list view, `value (count)` pills, active count, Clear filters | ✓ Visibility · Watched · Tier · Provider · Columns                          | ✓ Collection · Visibility · Watched · Provider · Architecture · OS · Columns; Organization on ISOs across orgs                                     | ✓ Status (tristate) · Pool (tristate) · Session · Cache · Drives · Publication · Columns under `table_prefs_vdi`  |                | n/a                                                                                                                                                                      |
| App-wide search: the module on every page, the "Elsewhere in …" list under the panel, Show all into `/search?q=`, rows in the universal shape                                              | ✓ client-side over the loaded catalogs                                      | ✓ `search` token, `GET /api/search` with the list endpoints' visibility clauses                                                                    | n/a — no collections, no `search`                                                                                 |                | n/a                                                                                                                                                                      |
| No bell in the cluster                                                                                                                                                                     | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | ✓                                                                                                                                                                        |
| Cluster icon buttons borderless                                                                                                                                                            | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                              |
| Utility links: top bar signed out, app section signed in                                                                                                                                   | ✓ Contact/Docs                                                              | ✓ About/Docs                                                                                                                                       | ✓ Docs                                                                                                            |                |                                                                                                                                                                          |
| Breadcrumb after the brand: plain crumbs from the route, muted › separators, no pickers                                                                                                    | ✓ › org › Provisioners › item › version › provider                          | ✓ › org › Boxes or ISOs › item › version › provider                                                                                                | n/a — no collections                                                                                              |                | n/a                                                                                                                                                                      |
| Switcher sets the active organization only, never navigates                                                                                                                                | ✓ `pickOrg` of `useSession`                                                 | ✓ the same hook                                                                                                                                    | ✓ the same hook under `idp`                                                                                       |                | to come — the same hook; a console context only, never make-primary                                                                                                      |
| Chrome metrics: 62px header, 20px gutter, 13px footer row, full-bleed, tertiary band                                                                                                       | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                              |
| Sidebar only from feature exports, brand at its top, rail persisted, foot bare                                                                                                             | n/a — no feature exports entries                                            | to come — the admin entries                                                                                                                        | to come — the fleet and pools entries                                                                             |                | to come — the Account section for every signed-in person from the profile feature, the operator sections from the identity feature for an admin, none on the auth routes |
| `footer` token listed                                                                                                                                                                      | ✓ the Worker's status payload                                               | to come                                                                                                                                            | to come                                                                                                           |                | to come — per site, `sites.<id>.ui.footer`                                                                                                                               |
| Footer slots: name · year · version as the repo link · powered-by · health where present                                                                                                   | ✓ repo link + Worker `/health` heart                                        | ✓ repo link + `/api/health` heart                                                                                                                  | ✓ repo link + `/api/health` heart over `database`, `uds` and `events`                                             |                | to come — the changelog link; the heart over `database`, `mail`, `sms` and `signing_keys` while `health` is listed, fed by the `admin` topic                             |
| Chrome from the reference implementation; native theme (stock tokens, hosted Open Sans/Montserrat, fa6)                                                                                    | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                              |
| Universal rows drawn with the app's own components and theme                                                                                                                               | ✓ react-bootstrap + react-icons via the shared chrome                       | ✓ react-bootstrap + react-icons via the shared chrome                                                                                              | ✓ the shared chrome                                                                                               |                | to come — the shared chrome                                                                                                                                              |
| Card = avatar, name, email, chevron → IdP profile (local↔IdP mode toggle where a local profile exists)                                                                                     | ✓ static id-badge glyph, no local profile                                   | ✓ toggle icon; local sessions → `/profile`                                                                                                         | ✓ static id-badge glyph, no local profile                                                                         |                | to come — the local-profile glyph, an in-router link to `/user/profile`                                                                                                  |
| Org row = logo + name, ≥ 2 memberships, opens switcher                                                                                                                                     | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come                                                                                                                                                                  |
| Switcher rows: logo, name, description, role badge, crown on primary, check on active                                                                                                      | ✓ from the token's `organizations`                                          | ✓ personal-last via SCIM `personal`, loaded on open                                                                                                | ✓ from the token's `organizations`                                                                                |                | to come — from `GET /api/user` `organizations`                                                                                                                           |
| Active org persisted, validated, falls back primary → first                                                                                                                                | ✓ `localStorage` `activeOrganization` by uuid                               | ✓ `localStorage` `activeOrganization` keyed by org name (local orgs have no uuid)                                                                  | ✓ by uuid                                                                                                         |                | to come — `localStorage` `activeOrganization` by uuid; a console context, never make-primary                                                                             |
| App section rows gated by the UI backend's `features` (`admin`, `org-console`, `rebuild`), the utility rows by `links`                                                                     | ✓ `rebuild`, `links.contact`, `links.docs`                                  | ✓ `admin`, `org-console`, `links.docs`                                                                                                             | ✓ `admin` under `idp`, `links.docs`                                                                               |                | to come — no app rows: the sidebar carries every page; `links.docs` and `links.contact` while set                                                                        |
| Preferences row → IdP profile preferences                                                                                                                                                  | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — hidden, the sidebar's Profile row covers it                                                                                                                    |
| Favorites: order, label chain, icon chain, new tab, read from `GET /api/user/favorites`                                                                                                    | to come — the identity provider's route with the token                      | to come — proxied at its own `/api/user/favorites`                                                                                                 | to come — the identity provider's route with the token                                                            |                | to come — `GET /api/user/favorites` in `snake_case`                                                                                                                      |
| App section named after the app, rows gated                                                                                                                                                | ✓ "Provisioner Catalog": Rebuild catalog data (`ROLE_ADMIN`), Contact, Docs | ✓ "BoxVault": Admin (`ROLE_ADMIN`), Organization console (org OWNER/ADMIN), About, Docs                                                            | ✓ "VDI Health Monitor": Admin (`ROLE_ADMIN`), Docs                                                                |                | to come — the header is `brand.name`, the site's own; no rows while the sidebar draws                                                                                    |
| Notifications row + badge, `notifications` feature and scope-gated, opens modal                                                                                                            | ✓ scope read from the access token                                          | ✓ scope read from `/api/userinfo/claims`                                                                                                           | n/a — no `notifications` token                                                                                    |                | to come — the `cookie` token in place of the scope; the badge from the `notifications` topic                                                                             |
| Modal: mark all, per-row mark read and dismiss, link glyph, view all, toast switch, the two test glyphs                                                                                    | ✓ tests through the Worker's `/push/test-toast` and `/push/test-channel`    | ✓ tests through `/api/notifications/test/toast` and `/test/channel`                                                                                | n/a                                                                                                               |                | to come — View all an in-router link to `/notifications`; the two tests through `POST /api/notifications/test/toast` and `/test/channel` on the issuer                   |
| Toasts: own VAPID + SW, re-POST on load, `pushsubscriptionchange`                                                                                                                          | ✓ `/push/vapid-key`, `/notification-sw.js`, re-POST on load                 | ✓ SW re-subscribes, then the page re-POSTs and drops the old endpoint                                                                              | n/a                                                                                                               |                | to come — `/api/notifications/vapid-key`; the worker from the build at scope `/push/`                                                                                    |
| Help row gated by config, customerId chain, context                                                                                                                                        | ✓ `ticket` in `/api/status`, active org → userinfo → fallback customer id   | ✓ `ticket_system.*` from `/api/config/ticket` incl. `fallback_customer_id`                                                                         | ✓ `ticket_system.*` from `/api/config/ticket`                                                                     |                | to come — `ticket` in `/api/status` from `integrations.improvement_request.*`, the site's `customer_id` as the fallback                                                  |
| Logout row: red, scope icon toggle, text logs out                                                                                                                                          | ✓                                                                           | ✓                                                                                                                                                  | ✓ under `idp`                                                                                                     |                | to come — the plain red row; the IdP session is the SSO session                                                                                                          |
| Everywhere = end-session with `id_token_hint`; this-app = local                                                                                                                            | ✓ form POST to the end-session endpoint                                     | ✓                                                                                                                                                  | ✓ form POST to the end-session endpoint                                                                           |                | n/a — `POST /user/logout` ends the SSO session and answers `{ next }`                                                                                                    |
| ID token kept for the session                                                                                                                                                              | ✓ `<storagePrefix>.id_token`                                                | ✓ inside the BoxVault JWT                                                                                                                          | ✓ `<storagePrefix>.id_token`                                                                                      |                | n/a — issuer                                                                                                                                                             |
| Notices: banners under the header row, cards top right, every notice dismissible; session ended is a keyed warning banner with no action, the cluster's Sign in carries the return path    | ✓ refresh failure or 401 → banner, the cluster's one-click sign in          | ✓ SSE + 401 → banner, the cluster's Sign in → `/login?returnTo=`                                                                                   | ✓ refresh failure, 401 or `session-terminated` on the one stream → banner under `idp`; no banner under `auth: []` |                | to come — `401` on an authenticated call or `session-terminated` → banner; `intended_url` carries the return path; on the auth routes the banner carries its own Sign in |
| Theme + language write through; pre-paint script                                                                                                                                           | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — `PATCH /api/user/preferences`; the served `index.html` stamps `data-brand-theme`, the script resolves the person's choice and `auto`                           |
| Silent SSO once per session                                                                                                                                                                | n/a — no login page, sign in is one click                                   | ✓                                                                                                                                                  | n/a — sign in is one click                                                                                        |                | n/a — issuer                                                                                                                                                             |
| `events` token and `events: { path, topics }`, the one stream of the [Universal Events Contract](universal-events/)                                                                        | n/a — no live data                                                          | ✓ `/api/events`, `["session", "notifications"]`                                                                                                    | ✓ `/api/events`, `["fleet"]` plus `session` under `idp`                                                           |                | to come — `/api/events`, `["notifications", "session", "admin"]`                                                                                                         |

---

**Related:** [Universal Pages Contract](universal-pages/) |
[Universal Session Contract](universal-session/) |
[Universal Events Contract](universal-events/) |
[Preferences, Language & Branding Contract](preferences-and-branding/) |
[Notification Hub](../../features/notification-hub/) |
[Organizations](../../features/organizations/) |
[Integrating Your App](integrating-your-app/)
