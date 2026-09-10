---
title: Universal Session Contract
layout: default
nav_order: 11
parent: Guides
permalink: /docs/guides/universal-session/
---

## Universal Session Contract

{: .no_toc }

One session layer for every estate app that renders the shared chrome: one
state shape the chrome and the pages read, one bus a session ends on, one
return-path rule, one callback page, and behind them a provider that speaks
the app's own protocol. A public SPA talks to the identity provider
directly and holds its tokens in the browser (the provisioner catalog); an
app with a backend talks to that backend and lets it hold the
identity-provider tokens (BoxVault); the identity provider itself keeps
its own session cookie on its own origin. All three run the one session
layer of the STARTcloud UI and differ only in the first `auth` token their
`/api/status` answers, which `createSession` turns into the provider. This contract extends the
[Universal Navbar Contract](universal-navbar/), which owns the account
cluster, the user menu and the session-ended banner this layer feeds, and the
[Preferences, Language & Branding Contract](preferences-and-branding/),
whose write-through the provider carries.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **One state, several providers.** The chrome, the shell and the pages
  read one session state from one hook, `useSession`, and never a token, a
  cookie or a storage key. What differs between apps is the provider the
  hook is given, and the shared folder carries every provider the estate
  has, so an app picks one and the screens never learn which.
- **Restore first, validate second.** The first render comes from storage
  synchronously, so a signed-in user never sees the signed-out cluster
  flash; the provider then loads, refreshing a token or resolving the
  issuer, and the state updates once.
- **A session ends on the bus.** Whatever decides the session is gone — a
  refresh that fails, a `401`, a server-sent terminate — calls
  `events.endSession()` and nothing else. The hook clears the state and
  keeps the page; the chrome raises the session-ended banner with the page
  to return to.
- **The return path is a same-origin path and never an auth page.** Every
  sign-in remembers where it started, the callback consumes it once, and a
  path from a query string is taken only when it starts with one `/`.
- **Headers come from the provider, requests go through the client.** No
  component builds an auth header or calls axios; `session.headers(method,
url)` is the one source, and the shared API client of the
  [API client](#api-client) section is the one caller, resolving those
  headers per request against the absolute URL it sends.
- **The provider is built once.** `initRuntime(status)` in `src/lib/runtime.js`
  creates the bus, then the provider and the return-path helper through
  `createSession(status, events)`, then the API client at the serving
  origin and the hub client; every screen imports those from `runtime.js`,
  and nothing else reads or writes session storage.
- **Every protocol the estate uses is in the shared folder.** Converging
  did not mean choosing between the browser and the backend as the OIDC
  client; the browser shape, the backend shape and the issuer's own cookie
  session all live in `src/lib/`, behind one contract, so a UI backend
  changes shape by changing the first entry of `auth` in its status.

---

## Session state

`useSession({ provider, events, returnTo, navigate, activeOrgKey, push, onAdopt, loadFavorites })`
returns the object below; `sessionStateShape` in `src/hooks/useSession.jsx`
is its prop-type and every shell takes it as `account`; `navigate` is the
router's own, handed by the hook to the provider's `load`, `reload`,
`refresh` and `begin`, so a provider that must move the page moves it
in-router.

| Field                    | Meaning                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `user`                   | the provider's user: the access token's claims on the browser OIDC provider, the stored profile on the backend provider; `null` signed out |
| `claims`                 | the provider's memoized claims (`/userinfo` on the IdP, `/api/userinfo/claims` through a backend), `null` until loaded or signed out       |
| `favorites`              | the list `loadFavorites` answers, read once per session, reset on sign-out and on every reload; `[]` until loaded or signed out            |
| `organizations`          | memberships in the chrome's organization shape `{ uuid, name, roles, primary }`                                                            |
| `oidc`                   | whether the session came from an OpenID Connect sign-in (the backend provider's local, LDAP and service sessions answer `false`)           |
| `issuerUrl`              | the identity provider behind the session, empty when there is none or it is not yet resolved                                               |
| `activeOrgUuid`          | the active organization, resolved stored → primary → first and persisted under `activeOrgKey`                                              |
| `pickOrg(uuid)`          | sets the active organization when it is a membership; never navigates                                                                      |
| `sessionEnded`           | `{ returnTo }` while the session died outside the app, else `null`                                                                         |
| `signIn()`               | remembers the return path (the ended session's page, else the current page unless it is an auth page) and calls `provider.begin({})`       |
| `signOut()`              | clears the local session through the provider                                                                                              |
| `signOutEverywhere()`    | the provider's estate-wide sign-out                                                                                                        |
| `refresh()`              | the provider's refresh, then the new state                                                                                                 |
| `reload()`               | the provider's profile re-read, then the new state                                                                                         |
| `savePreferences(patch)` | the provider's preferences write                                                                                                           |

Behavior fixed by the hook:

- The initial state is `provider.restore()`; `onAdopt` is called with every
  session the hook adopts, before it is rendered, so an app can seed what
  depends on it (the catalog feeds its memberships to its adapter).
- On mount the hook subscribes to the bus and calls `provider.load()`;
  `login` loads again, `logout` signs out locally, `sessionEnded` adopts
  `null` and records the page to return to.
- The active organization is re-resolved on every adopted session and
  written back, so the stored value is always a current membership.
- While signed in and browser push is enabled, the hook re-posts the push
  subscription and listens for `pushsubscriptionchange`, as the navbar
  contract requires.

---

## Provider contract

A provider is a plain object; `useSession`, the callback page and the app's
own screens call it and nothing else touches its storage.

| Member                   | Browser OIDC provider (`createBrowserOidc`)                                                                                                                                                                                                      | Backend session provider (`createBackendSession`)                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`, `issuerUrl`        | `'idp'`, the configured issuer                                                                                                                                                                                                                   | `'backend'`, empty (resolved per session)                                                                                                                                            |
| `restore()`              | the access token's claims from `localStorage`, synchronously                                                                                                                                                                                     | the stored profile from `localStorage`, synchronously                                                                                                                                |
| `load()`                 | the same after refreshing a token within a minute of expiry; a failed refresh ends the session                                                                                                                                                   | the same plus `issuerUrl`: the `iss` of the ID token embedded in the backend's JWT, when it is `https://` and one of `/api/auth/oidc/issuers`                                        |
| `reload()`               | `load()`                                                                                                                                                                                                                                         | `GET /api/user` merged over the stored profile, then `load()`                                                                                                                        |
| `begin(opts)`            | PKCE S256 authorization request to the discovered authorization endpoint; `opts` unused                                                                                                                                                          | `{ method, silent }` → `/api/auth/oidc/<method>`, `?prompt=none` when silent; also `login(username, password, stayLoggedIn)` → `/api/auth/signin` for the app's own form             |
| `complete()`             | reads `code` and `state` from the callback URL, checks the state, exchanges the code with the verifier and a DPoP proof, stores the tokens, applies the account's `preferences.theme` and `preferences.language` to local storage, emits `login` | reads `code` from the callback URL, exchanges it at `/api/auth/oidc/exchange`, reads `/api/user` with the token, stores the profile with the token and its `provider`, emits `login` |
| `headers(method, url)`   | `Authorization: DPoP <token>` plus a `DPoP` proof bound to the method, the URL and the token, or `Bearer` when the token was issued as one; `{}` while signed out                                                                                | `{ 'x-access-token': <jwt> }`, the JWT refreshed first four minutes after the last refresh while the session was kept; `{}` while signed out                                         |
| `retryAuth()`            | the refresh grant; `true` when it succeeded, else the session ends on the bus and `false`                                                                                                                                                        | `POST /api/auth/refresh-token` while the session was kept (`stayLoggedIn`); `true` when a new JWT came back                                                                          |
| `adoptResponse(headers)` | n/a                                                                                                                                                                                                                                              | stores an `x-refreshed-token` response header as the session's JWT                                                                                                                   |
| `endSession()`           | drops the tokens and ends the session on the bus                                                                                                                                                                                                 | drops the stored profile and ends the session on the bus                                                                                                                             |
| `refresh()`              | the refresh grant, then `load()`; failure ends the session                                                                                                                                                                                       | `POST /api/auth/refresh-token`, then `load()`; `null` on failure                                                                                                                     |
| `claims()`               | memoized `/userinfo` with the session's headers                                                                                                                                                                                                  | memoized `GET /api/userinfo/claims`                                                                                                                                                  |
| `savePreferences(patch)` | `PATCH {issuer}/api/user/preferences` with a proof for that URL, through the dev proxy when one answers same-origin                                                                                                                              | `PATCH /api/user/preferences`, then `preferredTheme` and `preferredLanguage` updated in the stored profile                                                                           |
| `signOut()`              | drops the tokens and the DPoP key                                                                                                                                                                                                                | drops the stored profile                                                                                                                                                             |
| `signOutEverywhere()`    | form-`POST` to the discovered end-session endpoint with `client_id`, `post_logout_redirect_uri`, `state` and `id_token_hint` when an ID token is held; `/` when the issuer has none                                                              | `POST /api/auth/oidc/logout` for an OIDC session, then the `redirect_url` it answers, else `/`                                                                                       |

A failure from `complete()` may carry `messageKey`; the callback page shows
that key translated, else the message. The backend provider raises
`auth:errors.authenticationFailed`, `auth:errors.invalidResponse` and
`auth:errors.failedToProcess`; the browser provider raises
`session.noCode` and `session.stateMismatch` from a bad callback,
`session.clockSkew` when the issuer refuses the proof as
`invalid_dpop_proof`, and `session.tokenFailed` when a token request fails
without a description.

### Browser OIDC provider

`createBrowserOidc({ issuer, clientId, scopes, storagePrefix, events, apiBase, redirectPath })`
is the public-SPA shape of the
[Integrating Your App](integrating-your-app/) guide, verbatim; `issuer`,
`clientId`, `scopes` and `storagePrefix` are the UI backend's `idp` object in
`/api/status`, so no issuer is baked into the UI:

- discovery from `{issuer}/.well-known/openid-configuration`, cached for
  the browser session; no endpoint is baked, only the issuer;
- authorization code with PKCE S256; the verifier and state are kept for
  the one round trip and dropped by `complete()`;
- DPoP on every token request and every call the headers are built for:
  an ES256 key pair generated non-extractable and kept in IndexedDB
  (`<prefix>-dpop`), a proof carrying `jti`, `htm`, `htu` (origin and
  path), `iat` and, when bound to a token, `ath`; the header scheme follows
  the token type the issuer answered;
- tokens under `<prefix>.access_token`, `.refresh_token`, `.id_token`,
  `.token_type`, `.expires_at`; the user is the access token's claims and
  the memberships its `organizations` claim;
- the refresh grant a minute before expiry on every `load()` and every
  `headers()`; a refresh that fails clears the tokens and ends the session
  on the bus.

### Backend session provider

`createBackendSession({ baseUrl, events, storageKey })` is the shape of an
app whose backend is the confidential client, `baseUrl` the origin that
served the page:

- the backend's HS256 JWT and the profile it answered live together under
  `storageKey` (`user`) and every request carries the JWT as
  `x-access-token`;
- the provider keeps no interceptors: `headers()` refreshes the JWT four
  minutes after the last refresh while the session was kept
  (`stayLoggedIn`) before answering it, `adoptResponse()` stores an
  `x-refreshed-token` header, `retryAuth()` refreshes once while the
  session was kept, and `endSession()` ends it on the bus; the API client
  calls all four, so a request that bypasses the client carries nothing;
- memberships come from the profile's `organizations`, mapped to the chrome
  shape by the exported `profileMemberships` with the name as the uuid,
  because local organizations have none; an app's own permission rules
  read the same mapping (BoxVault's `permissions.js` adds only its
  global-admin flag and its box-owner rule over `isMember`, `isManager`
  and `isOwner`);
- `oidc` is whether the profile's `provider` starts with `oidc-`, and
  `issuerUrl` is resolved from the ID token the backend embeds in its JWT,
  checked against the backend's trusted issuers, so the user menu's profile
  link and View all notifications point at the right identity provider.

### Cookie session provider

`createCookieSession({ baseUrl, events, storageKey })` is the identity
provider's own shape, chosen when the UI backend's first `auth` token is
`cookie`: the session is the issuer's HttpOnly session cookie on its own
origin, the CSRF token the `XSRF-TOKEN` cookie echoed as `X-XSRF-TOKEN`
on every method but `GET`, `HEAD` and `OPTIONS`, `restore()` the profile
cached under `storageKey` (`account`), `load()` `GET /api/user` (a `401`
clears the cache without ending the session on the bus), `login()` a
form-encoded `POST /login` with `Accept: application/json` answering
`next`, `begin({ method })` an in-router move to `/login` for `local` and
`magic-link` and a top-level navigation to `/oauth2/authorization/<id>`
for `oidc-<id>`, `begin` and `load` receiving the router's `navigate`
through the hook and never setting `window.location` for a same-origin
path, `retryAuth()` false, `signOut()` and
`signOutEverywhere()` both `POST /user/logout` (the local session is the
SSO session, so the logout row draws plain), `claims()`
`GET /api/userinfo/claims`, `savePreferences()`
`PATCH /api/user/preferences`; the full member table is the
[Universal Identity Contract](universal-identity/)'s. Its `authPaths`
are every reserved segment of the identity contract's sign-in, onboarding
and interstitial groups plus `error`, because a page such as
`/continue?token=` or `/oauth2/code?code=` carries a bearer secret in its
query and must never be remembered as a return path; its cached `account`
holds display fields only, and `signOut()` and `endSession()` remove
every key of the storage table but `theme` and `language`, so the next
person on a shared machine inherits neither a profile paint, a pending
invite nor a return path.

---

## Events

`createSessionEvents()` returns the bus every provider and screen shares:
`on(event, callback)` returning its unsubscribe, `emit(event, detail)`, and
`endSession({ returnTo })`, which emits `sessionEnded` with the current
path and query when no `returnTo` is given.

| Event          | Emitted by                                                                                                                                         | Effect in the hook                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `login`        | a provider after `complete()` or the backend's `login()`; a screen after a change the profile must reflect (BoxVault's profile page after an edit) | `provider.load()` and adopt                                         |
| `logout`       | a screen that decided the session is invalid                                                                                                       | `provider.signOut()` and adopt `null`                               |
| `sessionEnded` | `endSession()` from a provider (refresh failure), from the API client (a `401` the provider could not recover) or from a stream                    | adopt `null`, record `{ returnTo }`, the session-ended banner shows |

A UI backend's session-terminated signal arrives on the one stream of the
[Universal Events Contract](universal-events/): the runtime's
`useSessionKeepalive` connects it while the UI backend advertises the `events`
token and answers `session-terminated` with `events.endSession()`, so a
back-channel logout at the identity provider reaches every open tab. No
provider or screen opens a stream of its own.

---

## Sign-in return

`createReturnTo({ storageKey, signInPath, authPaths })` is the one place a
return path is remembered and read; `createSession` builds it beside the
provider, under `intended_url`, with `/login` and the auth paths for a
`backend` UI backend and `/callback` as the only auth path for an `idp` UI backend:

- `remember(path)` stores it; `consume()` reads and clears it and answers
  `''` unless the path matches `^/(?![/\\])`, because `/\evil.com` starts
  with one slash and a browser resolves it as `//evil.com`; a page's path
  is stored with its query so a person returns to the page they were on,
  but a path on one of the `authPaths` is never stored, since those
  carry codes and tokens in their query;
- `fromParams(params)` reads a `returnTo` query parameter under the same
  rule, so a link to the login page can carry the page it came from;
- `onAuthPage(pathname)` says whether the current page is one of the
  `authPaths`, which are never remembered;
- `signInTo(returnTo)` builds `<signInPath>?returnTo=` for an app whose
  Sign in button is a link to its login page, and `''` for an app whose
  sign-in is one click.

The navbar's Sign in button carries the page it was pressed on, the ended
session's page while the session-ended banner shows, and never an auth page; on BoxVault
every sign-in path on the login page — the form, the provider buttons and
the silent SSO redirect — remembers the same path and the callback lands
there, never on the profile page. On a `cookie` UI backend a sign-in step
answers `next`, and the two are ordered: `next` wins unless it is `/`,
then the consumed `intended_url`, then `/`, because a server that parked
an authorization request must resume it before the page the person
came from, and a person who came from a page must land back on it rather
than on the profile.

---

## Callback page

`CallbackPage({ complete, onDone, homeHref })` is the page a sign-in lands
on: it runs `complete()` exactly once, hands the session to `onDone`, and
on failure shows `session.failed` with the translated `messageKey` or the
message, a `session.returnLink` to `homeHref` and `session.tryAgain`;
while it runs it shows `session.completing`. Those keys live in
`shared.json`. An `idp` UI backend renders it as its own HTML entry at
`/callback/` (`src/app/callback.jsx`) and `onDone` replaces the location
with the consumed return path; a `backend` UI backend renders it on the
`/auth/callback` route inside the app and `onDone` navigates there with
`replace`.

---

## Session ended elsewhere

When `sessionEnded` arrives the hook adopts `null`, the cluster turns
signed-out, and the chrome raises the session-ended banner of the navbar
contract's Notices section with the page to return to. Sources per app:
the catalog's refresh grant failing on `load()`, `headers()` or the API
client's replay; BoxVault's `401` the API client could not recover with a
refresh, and `session-terminated` on its event stream. The banner carries no action; the
cluster's Sign in carries that page, and dismissing the banner keeps it.

---

## Preferences and claims

- Theme and language write through the provider's `savePreferences`, so the
  app never knows whether the write reaches the identity provider directly
  (the catalog, with a DPoP proof for the issuer's URL) or its backend,
  which delegates for an OIDC session (BoxVault).
- On sign-in the account value overwrites local storage, as the preferences
  contract requires: the browser provider applies `preferences.theme` and
  `preferences.language` from `/userinfo` in `complete()`; BoxVault applies
  `preferredTheme` and `preferredLanguage` from the profile whenever the
  session is adopted.
- `claims()` is memoized per session and reset by a sign-out or a reload,
  so the user menu, the favorites and the ticket URL read one fetch.

---

## Storage

Storage is per origin, so no key carries an app prefix; the only prefix is
the `idp.storagePrefix` the UI backend names for its tokens.

| Value                             | `idp` UI backend (the catalog)                                                                                                                                                                                        | `backend` UI backend (BoxVault)                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| session                           | `<storagePrefix>.access_token`, `.refresh_token`, `.id_token`, `.token_type`, `.expires_at` in `localStorage`; `<storagePrefix>.oidc_discovery` in `sessionStorage`; the DPoP key in IndexedDB `<storagePrefix>-dpop` | `user` in `localStorage`: the profile, the JWT, `stayLoggedIn`, `tokenRefreshTime` |
| sign-in round trip                | `<storagePrefix>.pkce_verifier`, `<storagePrefix>.pkce_state`, kept for the one round trip and dropped by `complete()`                                                                                                | n/a — the backend holds the verifier                                               |
| return path                       | `intended_url`                                                                                                                                                                                                        | `intended_url`                                                                     |
| active organization               | `activeOrganization` (uuid)                                                                                                                                                                                           | `activeOrganization` (organization name)                                           |
| push switch                       | `push_enabled`                                                                                                                                                                                                        | `push_enabled`                                                                     |
| sign-in method chosen             | n/a — sign-in is one click                                                                                                                                                                                            | `login_method`                                                                     |
| join intent kept across a sign-in | n/a                                                                                                                                                                                                                   | `join_org`                                                                         |
| silent SSO tried                  | n/a — sign-in is one click                                                                                                                                                                                            | `silent_sso_attempted` in `sessionStorage`                                         |
| table preferences                 | `table_prefs_<org or home>`                                                                                                                                                                                           | `table_prefs_<org or home>`                                                        |
| sidebar width                     | `sidebar_width` (px)                                                                                                                                                                                                  | `sidebar_width` (px)                                                               |
| sidebar collapsed                 | `sidebar_minimized`                                                                                                                                                                                                   | `sidebar_minimized`                                                                |
| sidebar open nodes                | `sidebar_open_<group>`                                                                                                                                                                                                | `sidebar_open_<group>`                                                             |
| sidebar tree view                 | `sidebar_view_<group>`                                                                                                                                                                                                | `sidebar_view_<group>`                                                             |
| theme and language                | `theme`, `language`, the chrome's own keys, kept across a sign-out                                                                                                                                                    | the same                                                                           |

A `cookie` UI backend (the identity provider) keeps `account` (the cached display fields), `intended_url`, `activeOrganization` (uuid), `push_enabled`, `login_method` (`password` or `magic_link`), `theme`, `language`, `table_prefs_admin_users`, `table_prefs_admin_organizations`, `table_prefs_admin_logins`, `table_prefs_admin_registrations`, `table_prefs_admin_sessions`, `table_prefs_inbox` and the sidebar keys; it has no upstream, so `silent_sso_attempted` is unused.

---

## API client

`createApiClient({ baseUrl, requestOrigin, session, onError })` in
`src/lib/apiClient.js` is the one HTTP client every request of an app goes
through; no screen, adapter or service calls axios or `fetch` with a
session header of its own, the root entry's `probeStatus` being the one
call outside it, made before any session exists. `initRuntime` builds it
once over the provider, at the origin that served the page, and every
feature's `api/` file calls it.

- `baseUrl` is the public origin the API answers at and the one the
  session signs headers for; `requestOrigin` is where the browser sends
  the request, the same origin unless a dev proxy answers same-origin
  (then empty), so a DPoP proof binds to the URL the backend verifies.
- `request({ method, path, params, body, headers, contentType, auth, signal,
onUploadProgress, responseType, skipAuthRefresh, messageKeys })` and the
  shorthands `get`, `post`, `put`, `patch` and `delete` resolve to the
  response body; `raw(method, path, init)` sends the same headers on a
  `fetch` for a stream; `resolve(path)` is the absolute URL.
- Headers are `session.headers(method, url)` resolved per request against
  the absolute URL; `auth: false` sends none (a health surface, a VAPID
  key, the catalog's public files); `contentType` is `json`,
  `octet-stream`, `form` (the browser sets the multipart boundary) or
  `none`.
- A `401` on an authenticated request is replayed once after
  `session.retryAuth()` answered true; when it cannot recover, or the
  replay fails again, `session.endSession()` ends the session on the bus
  and the session-ended banner shows. `skipAuthRefresh` turns the replay
  off for a call that must not. `auth: 'optional'` sends the session's
  headers but neither replays nor ends the session on a `401`, for the
  one call that asks whether anyone is signed in at all, the cookie
  provider's `load()` and the keepalive's first probe, because a visitor
  who was never signed in must not be told they were signed out.
- Every response's headers go to `session.adoptResponse(headers)`, so a
  backend that rotates its token in a response header is followed.
- Every failure is thrown as `ApiError`: `status` (0 when no response
  came), `code`, `serverMessage`, `data`, `response`
  (`{ status, data, headers }`), `request` (`{ method, url }`), `cause` and
  `messageKey`, a key in `shared.json`: `errors.accessDenied` for 401 and
  403, `errors.notFound` for 404, `errors.network` when the server could
  not be reached, `errors.request` otherwise; a call overrides a status
  through `messageKeys`. An aborted request rethrows the
  abort as is. `onError` sees every `ApiError` once before it is thrown;
  BoxVault logs it through the shared logger's `api` category.
- `encodePath(...segments)` builds a path from raw names, each segment
  URL-encoded, so a name with a reserved character never breaks a route.
- Per UI backend: `initRuntime` builds `client` at the serving origin for
  everything under `/api/*`, and `hubClient` for the notification hub, a
  second client at `idp.issuer` for an `idp` UI backend and the same `client`
  for a `backend` UI backend whose backend proxies the hub. The box collection
  sends its files through `uploadChunked.js` on the same client: 5 MB
  chunks with in-chunk progress, then the assembly poll.

---

## Backends

A backend behind the browser OIDC provider verifies what `session.headers`
sends, the way the catalog Worker does (`worker/src/index.js`) and
BoxVault's request resolver does (`backend/app/utils/requestAuth.js`):

- the access token against the issuer's JWKS, its `iss` a configured
  provider and its `aud` the backend's own audience (on BoxVault
  `auth.resource_server.audience`, refused when blank, behind
  `auth.resource_server.enabled`);
- a key-bound token (`cnf.jkt`) only with the `DPoP` scheme and a proof:
  `typ dpop+jwt`, ES256 with an EC P-256 public key, `htm` the method,
  `htu` the public origin and path without the query, `iat` within 60 s,
  `ath` the SHA-256 of the token, the key's thumbprint equal to `cnf.jkt`,
  and a `jti` unseen for 300 s; a bound token presented as `Bearer` is
  refused, and so is an unbound token presented as `DPoP`;
- the user by the token's `UUID` (else `sub`) under the issuer's credential
  namespace, provisioned on first contact through the same path as the
  browser sign-in;
- CORS admitting `Authorization` and `DPoP`.

On BoxVault one resolver sits under every gate — `authJwt.verifyToken` on
the write routes, the profile and the watches, `sessionAuth` on the
optional-auth read routes, and the discover routes' user resolution — in
the order session JWT on `x-access-token`, identity-provider token on
`Authorization`, raw service-account key; the refresh route takes the
session JWT alone. Every delegated call to the identity provider
(favorites, claims, preferences, invitations, notifications) uses the
presented token itself. The refresh endpoint keeps `id_token`,
`oidc_access_token`, `oidc_refresh_token`, `oidc_expires_at` and the
token's `provider` tag, so a backend-provider session keeps its issuer
across refreshes.

So a BoxVault deployment without local accounts answers `auth: ["idp"]`
with an `idp` object in its `/api/status` and nothing in the UI changes;
one with local accounts keeps `auth: ["backend"]`. Either way the catalog can call BoxVault with its own
`session.headers` once the catalog's origin is in BoxVault's
`boxvault.allowed_origins` list; BoxVault's own origin is always allowed.

---

## Sign-in, registration and invitation pages

The three pages an app with its own accounts routes to are shared pages of
the [Universal Pages Contract](universal-pages/): `LoginPage`,
`RegisterPage` and `InvitePage` in `src/features/auth/`, drawn from the
provider, the return-path helper and one `auth` adapter the router builds,
routed while the UI backend's first `auth` token is `backend` or `cookie`
(`/register` also needs `local-accounts`) and answered with
`NotAvailableStub` on an `idp` UI backend, whose sign-in is one click.

- `auth` is `{ methods, register, validateInvitation, acceptInvitation,
loginMethodKey, silentSsoKey }`: the four calls of `features/auth/api`
  and the two localStorage keys the pages remember the chosen sign-in
  method and the one silent SSO attempt under.
- `LoginPage({ session, returnTo, auth, appName })` reads
  `auth.methods()`, draws the local form only where the provider carries
  `login`, one button per identity provider through `session.begin({
method })`, the remembered choice between the two, the silent
  `prompt=none` attempt of the navbar contract, and remembers the return
  path for the callback.
- `RegisterPage({ session, returnTo, auth })` draws the local form where
  self-registration is on or the URL carries an invitation token, the
  provider buttons, and the check-your-inbox state after a local sign-up.
- `InvitePage({ session, returnTo, auth, activeOrgKey })` validates the
  token, sends a visitor to sign in or register with the invite as the
  return path, refuses an account the invitation was not addressed to, and
  on accept stores the organization under `activeOrgKey` and calls
  `session.refresh()`.
- Their keys are the `auth` namespace (`login.*`, `register.*`,
  `errors.*`, with `{{app}}` where the app's name appears) and
  `inviteAccept.*` in `shared.json`; the pages name no namespace but
  `auth` and `shared`.

---

## Reference implementation

One repository, [STARTcloud/startcloud-ui](https://github.com/STARTcloud/startcloud-ui):

| Path                                                  | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/`                                            | The shared layer, see below                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/lib/createSession.js`                            | `createSession(status, events)`: `createBrowserOidc({ ...status.idp, events, apiBase })` and `createReturnTo` with `/callback` as the auth path for an `idp` UI backend; `createCookieSession({ baseUrl: origin, events })` and `createReturnTo` with `/login` and the identity contract's sign-in paths for a `cookie` UI backend; `createBackendSession({ baseUrl: origin, events })` and `createReturnTo` with `/login` and the auth paths otherwise; `intended_url` in all three |
| `src/lib/runtime.js`                                  | `initRuntime(status)`: `events`, `session`, `returnTo`, `client` at the serving origin with `onError` logging, `hubClient` at `idp.issuer` or the same client; every feature's `api/` file calls `client`                                                                                                                                                                                                                                                                            |
| `src/app/App.jsx`                                     | `useSession` with `onAdopt` feeding the provisioners adapter's memberships while the UI backend advertises `private-catalogs`, the theme and language write-through, the profile reload interval and the event stream of the events contract while the UI backend advertises `events` (`useSessionKeepalive`), the account state into `AppShell`                                                                                                                                     |
| `src/app/router.jsx`                                  | The `auth` adapter over `features/auth/api` and the `/login`, `/register`, `/invite/:token` and `/auth/callback` routes while the UI backend's first `auth` token is `backend`; the `account` adapter over `features/profile/api` and the `/profile` route on the shared `ProfilePage`, which calls `signOutEverywhere`, `reload` and emits `login` on the bus                                                                                                                       |
| `src/app/callback.jsx`                                | The `/callback/` entry of an `idp` UI backend rendering `CallbackPage`                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/features/collections/boxes/api/uploadChunked.js` | The chunked box upload on `client`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Shared by every UI backend, once: `src/lib/` — `browserOidc.js`,
`backendSession.js` (`createBackendSession`, `profileMemberships`),
`cookieSession.js` (`createCookieSession`), `dpop.js` (`createDpop`, `base64url`), `jwt.js`
(`decodeJwt`), `events.js` (`createSessionEvents`), `returnTo.js` (`createReturnTo`,
`currentPath`, `safeReturnPath`), `createSession.js` and `runtime.js`;
`src/hooks/useSession.jsx` (`useSession`, `sessionStateShape`) and
`src/features/auth/components/CallbackPage.jsx`. The layer imports only
react, prop-types, react-bootstrap, react-i18next, axios and the chrome's
organization shape; the `session.*` keys it reads live in `shared.json`.

---

## Conformance checklist

| Line                                                                                                                                                 | Catalog                                                                                 | BoxVault                                                                                           | Auth server                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| One session layer in startcloud-ui; the provider, the bus and the return-path helper built by `initRuntime` from the UI backend's first `auth` token | ✓ `["idp"]` with `idp`                                                                  | ✓ `["backend"]`                                                                                    | to come — `["cookie"]`, `createCookieSession`                                                                  |
| First render from the stored session, then `load()`                                                                                                  | ✓ token claims, refresh a minute before expiry                                          | ✓ stored profile, issuer resolved from the embedded ID token                                       | to come — the cached `account` profile, then `GET /api/user`                                                   |
| Every request through the shared API client, its header from the provider, one replay on `401`, every failure an `ApiError`                          | ✓ `session.headers` with DPoP proofs; `client` at the Worker, `hubClient` at the issuer | ✓ `x-access-token` through `session.headers`; one client, every call in the features' `api/` files | to come — `X-XSRF-TOKEN` through `session.headers`, no replay (`retryAuth` false)                              |
| The backend verifies the browser provider's token and DPoP proof on every gate                                                                       | ✓ the Worker                                                                            | ✓ `requestAuth.js` under `verifyToken`, `sessionAuth` and discover                                 | n/a — the issuer                                                                                               |
| Sign-in returns to the page it started on, never an auth page                                                                                        | ✓ `/callback/` consumes `intended_url`                                                  | ✓ `/auth/callback` consumes `intended_url`; form, providers and silent SSO remember it             | to come — `intended_url` consumed after the sign-in step's `next`                                              |
| Session ended elsewhere ends on the bus and raises the session-ended banner with the return path                                                     | ✓ refresh failure, the client's unrecovered `401`                                       | ✓ the client's unrecovered `401`, `session-terminated` on the `events` stream                      | to come — the client's `401` on an authenticated call                                                          |
| Claims memoized from the provider                                                                                                                    | ✓ `/userinfo`                                                                           | ✓ `/api/userinfo/claims`                                                                           | to come — `/api/userinfo/claims`                                                                               |
| Preferences write through the provider; account value applied on sign-in                                                                             | ✓ `PATCH` the issuer with a proof; `preferences` from `/userinfo` in `complete()`       | ✓ `PATCH` the backend; `preferredTheme` and `preferredLanguage` from the profile                   | to come — `PATCH /api/user/preferences`; `preferences.theme` and `language` applied by `load()` on every adopt |
| Sign out: this app and everywhere                                                                                                                    | ✓ tokens and key dropped; end-session form `POST` with `id_token_hint`                  | ✓ profile dropped; `/api/auth/oidc/logout` then its redirect                                       | to come — `POST /user/logout` for both answering `{ next }`; the plain red row                                 |
| Active organization persisted, validated, primary → first                                                                                            | ✓ by uuid                                                                               | ✓ by name                                                                                          | to come — `activeOrganization` by uuid, a console context only                                                 |
| Push subscription synced while signed in                                                                                                             | ✓                                                                                       | ✓                                                                                                  | to come — the push worker at scope `/push/`                                                                    |

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Pages Contract](universal-pages/) |
[Preferences, Language & Branding Contract](preferences-and-branding/) |
[Integrating Your App](integrating-your-app/)
