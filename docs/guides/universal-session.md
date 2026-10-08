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
- **The issuer decides whether a signed-in person is still signed in.**
  A session that came from the identity provider lives exactly as long as
  the provider says: a refresh the token endpoint refuses with
  `invalid_grant` (RFC 6749 §5.2, the grant "invalid, expired, revoked")
  is terminal, the client discards its tokens and the session ends (RFC
  9700 §4.14); a new refresh token in a refresh answer replaces the old
  one at once (RFC 6749 §6, the client "MUST discard the old refresh
  token"); a `401` `invalid_token` from a resource means obtain a fresh
  token once and retry, never retry with the refused one (RFC 6750
  §3.1); a back-channel logout at the relying party clears that session
  (OpenID Connect Back-Channel Logout 1.0 §2.7). No app token, cache or
  keep-alive of this layer outlives a refresh answered `invalid_grant`.
  A refresh answered any other error code of RFC 6749 §5.2
  (`invalid_request`, `invalid_client`, `unauthorized_client`,
  `unsupported_grant_type`, `invalid_scope`) names a fault in the
  client's own request, not a dead grant: the tokens in hand stay and
  the session stays until the access token expires and a resource `401`
  cannot be cleared by one fresh token (RFC 6750 §3.1). A refresh that
  never got an answer (the network, a `5xx`, RFC 9110 §15.6) leaves the
  session as it is until the next attempt, because a session ended on a
  timeout is a person signed out for nothing.
- **The spec supersedes this contract.** Where a clause of this contract
  and a specification it cites disagree, the specification wins and the
  clause changes, and a clause that names a rule names the section it
  comes from, because a contract that only restates a specification has
  nothing of its own to defend against it.
- **A session ends on the bus.** Whatever decides the session is gone — a
  refresh the provider refused, a `401` the client could not clear with
  one fresh token, a server-sent terminate — calls `events.endSession()`
  and nothing else. The hook clears the state and keeps the page; the
  chrome raises the session-ended banner with the page to return to.
- **The return path is a same-origin path and never an auth page.** Every
  sign-in remembers where it started, the callback consumes it once, and a
  path from a query string is taken only when it starts with one `/`.
- **Headers come from the provider, requests go through the client.** No
  component builds an auth header or calls axios; `session.headers(method,
url)` is the one source, and the shared API client of the
  [API client](#api-client) section is the one caller, resolving those
  headers per request against the absolute URL it sends.
- **The provider is built once.** `initRuntime(status)` creates the bus,
  then the provider and the return-path helper through
  `createSession(status, events)`, then the API client at the serving
  origin and the hub client; every screen imports those from the runtime,
  and nothing else reads or writes session storage.
- **Every protocol the estate uses is in the shared folder.** The browser
  shape, the backend shape and the issuer's own cookie session all live
  in the shared layer, behind one contract, so a UI backend changes shape
  by changing the first entry of `auth` in its status.

---

## Session state

`useSession({ provider, events, returnTo, navigate, activeOrgKey, allOrganizations, push, onAdopt, loadFavorites })`
returns the object below; `sessionStateShape` is its prop-type and every
shell takes it as `account`; `navigate` is the router's own, handed by the
hook to the provider's `load`, `reload`, `refresh` and `begin`, so a
provider that must move the page moves it in-router.

| Field                    | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                   | the provider's user: the access token's claims on the browser OIDC provider and the cached display fields on the cookie provider, each with the account's preferences beside them as `preferred_mode`, `preferred_theme`, `preferred_motion` and `preferred_language`, those four cached with the record (`<prefix>.preferences` beside the tokens, the four members inside `account`) and never written into the browser's own keys, and the profile `GET /api/user` answered on the backend provider, which stores the same four; `null` signed out |
| `claims`                 | the provider's memoized claims (`/userinfo` on the IdP, `/api/userinfo/claims` through a backend), `null` until loaded or signed out                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `favorites`              | the list `loadFavorites` answers, read once per session when the session is adopted or, when that adoption happens on an auth path (the sign-in page, the callback), the first time the page leaves the auth paths; reset on sign-out and on every reload; `[]` until loaded or signed out                                                                                                                                                                                                                                                            |
| `organizations`          | memberships in the chrome's organization shape `{ uuid, name, roles, primary }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `oidc`                   | whether the session came from an OpenID Connect sign-in (the backend provider's local, LDAP and service sessions answer `false`)                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `issuerUrl`              | the identity provider behind the session, empty when there is none or it is not yet resolved                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `clientId`               | the registered client this session was issued to, the ID token's `aud` (OpenID Connect Core 1.0 §2) on the browser and backend providers, the configured client id until an ID token is held, empty on the issuer's own cookie session and while signed out; the one id an app names itself by, never a role word or a name in code                                                                                                                                                                                                                   |
| `activeOrgUuid`          | the active organization, resolved stored → primary → first and persisted under `activeOrgKey`; with `allOrganizations`, on a UI backend that narrows by organization, resolved stored → All organizations, the empty uuid, and the key absent while All is the choice, because there a person who chose nothing sees every host and machine their organizations reach                                                                                                                                                                                 |
| `pickOrg(uuid)`          | sets the active organization when it is a membership, and with `allOrganizations` when it is the empty uuid, All organizations; never navigates                                                                                                                                                                                                                                                                                                                                                                                                       |
| `sessionEnded`           | `{ returnTo }` while the session died outside the app, else `null`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `loaded`                 | whether `provider.load()` has answered since mount; `false` while the first render comes from storage                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `signIn()`               | remembers the return path (the ended session's page, else the current page unless it is an auth page) and calls `provider.begin({})`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `signOut()`              | clears the local session through the provider                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `signOutEverywhere()`    | the provider's estate-wide sign-out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `refresh()`              | the provider's refresh, then the new state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `reload()`               | the provider's profile re-read, then the new state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `savePreferences(patch)` | the provider's preferences write                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Behavior fixed by the hook:

- The initial state is `provider.restore()`; `onAdopt` is called with every
  session the hook adopts, before it is rendered, so an app can seed what
  depends on it (the catalog feeds its memberships to its adapter).
- On mount the hook subscribes to the bus and calls `provider.load()`;
  `login` loads again, `logout` signs out locally, `sessionEnded` adopts
  `null` and records the page to return to.
- The active organization is re-resolved on every adopted session and
  written back, so the stored value is always a current membership.
- `allOrganizations` is the option of a UI backend that narrows by
  organization, the `hyperweaver-server` role while it lists `hosts`,
  decided by the app from the status and off on every other UI backend,
  whose behavior it leaves as it is. With it All organizations is a
  choice of its own, the empty uuid: nothing stored, or a stored value
  that is no membership, resolves to All and never to the primary
  membership, because a person who chose nothing must see every host
  their organizations reach; `pickOrg('')` chooses it; and the key is
  removed while All stands, so the stored value is a current membership
  or absent. The choice is a view over what the backend answered and
  never a boundary, the backend deciding access on every request by
  every organization of the person.
- While signed in and browser push is enabled, the hook re-posts the push
  subscription and listens for `pushsubscriptionchange`, as the navbar
  contract requires.
- `loaded` turns `true` once `provider.load()` has answered; until then the
  restored session is a paint hint for the chrome and never a session: a
  page drawn for a signed-in person alone (the profile) waits for `loaded`
  and sends a visitor to sign in only once `loaded` says there is none, and
  a sign-in page sends a signed-in person away only on an adopted session,
  because a stale cache would otherwise draw a profile for nobody and bounce
  a visitor off the register page.

---

## Provider contract

A provider is a plain object; `useSession`, the callback page and the app's
own screens call it and nothing else touches its storage.

| Member                   | Browser OIDC provider (`createBrowserOidc`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Backend session provider (`createBackendSession`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `issuerUrl`        | `'idp'`, the configured issuer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `'backend'`, empty (resolved per session)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `restore()`              | the access token's claims from `localStorage`, synchronously                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the stored profile from `localStorage`, synchronously                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `load()`                 | the same after refreshing a token within a minute of expiry, a refresh answered `invalid_grant` ending the session and any other failure keeping the token in hand, then `/userinfo` through `claims()`, refused when its `sub` differs from the access token's (OpenID Connect Core 1.0 §5.3.2), its `preferences` cached under `<prefix>.preferences` and answered beside the user as `preferred_mode`, `preferred_theme`, `preferred_motion` and `preferred_language`, never mirrored into the browser's own keys, so a change made at the identity provider is picked up on a normal page refresh and never needs a hard refresh or a sign-out and back in; a guest-only account's neither cached nor answered, and a userinfo that does not answer leaves the cached ones standing; the userinfo read is unconditional, the endpoint answering no `ETag` | `GET /api/user` through the API client, conditional on the last `ETag`, a `304` answering the last session, a `200` merged over the stored profile without its `access_token` member and stored, so a profile read never replaces the JWT, like the cookie provider's, the stored profile the fallback on any failure but a `401`, which clears it, so a change made at the identity provider is picked up on a normal page refresh; plus `issuerUrl`: the `iss` of the ID token embedded in the backend's JWT, when it is `https://` and one of `/api/auth/oidc/issuers` |
| `reload()`               | `load()` after resetting the memoized claims, so `/userinfo` and its `preferences` are read again                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `load()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `begin(opts)`            | PKCE S256 authorization request to the discovered authorization endpoint; `opts` unused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `{ method, silent }` → `/api/auth/oidc/<method>`, `?prompt=none` when silent; also `login(username, password, stayLoggedIn)` → `/api/auth/signin` for the app's own form                                                                                                                                                                                                                                                                                                                                                                                                  |
| `complete()`             | reads `code` and `state` from the callback URL, checks the state, exchanges the code with the verifier and a DPoP proof, stores the tokens, awaits `login` on the bus, whose handler is the one `load()`, and answers the restored session; reads nothing itself                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | reads `code` from the callback URL, exchanges it at `/api/auth/oidc/exchange`, stores the token with its `provider`, awaits `login` on the bus, whose handler is the one `load()`, and answers the restored session; reads nothing itself                                                                                                                                                                                                                                                                                                                                 |
| `headers(method, url)`   | `Authorization: DPoP <token>` plus a `DPoP` proof bound to the method, the URL and the token, or `Bearer` when the token was issued as one; `{}` while signed out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `{ 'x-access-token': <jwt> }`, the JWT refreshed first when its own `exp` claim is within a minute while the session is kept, `stay_logged_in` or an OIDC session, which is kept by definition, the provider's refresh token deciding its life; `{}` while signed out                                                                                                                                                                                                                                                                                                     |
| `retryAuth()`            | the refresh grant; `true` when it succeeded, `false` otherwise, the session ending on the bus only when the answer was `invalid_grant`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `POST /api/auth/refresh-token` while the session is kept, `stay_logged_in` or an OIDC session, kept by definition, the provider's refresh token deciding its life; `true` when a new JWT came back                                                                                                                                                                                                                                                                                                                                                                        |
| `adoptResponse(headers)` | n/a                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | stores an `x-refreshed-token` response header as the session's JWT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `endSession()`           | drops the tokens and ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | drops the stored profile and ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `refresh()`              | the refresh grant, then `load()`; `invalid_grant` ends the session, any other failure answers the restored session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `POST /api/auth/refresh-token`, then `load()`; `null` on failure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `claims()`               | memoized `/userinfo` with the session's headers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | memoized `GET /api/userinfo/claims`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `savePreferences(patch)` | `PATCH {issuer}/api/user/preferences` with a proof for that URL, through the dev proxy when one answers same-origin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `PATCH /api/user/preferences`, then `preferred_mode`, `preferred_theme`, `preferred_motion` and `preferred_language` updated in the stored profile                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `signOut()`              | drops the tokens and the DPoP key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | drops the stored profile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `signOutEverywhere()`    | form-`POST` to the discovered end-session endpoint with `client_id`, `post_logout_redirect_uri`, `state` and `id_token_hint` when an ID token is held; `/` when the issuer has none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `POST /api/auth/oidc/logout` for an OIDC session, then the `redirect_url` it answers, else `/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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
`clientId`, `scopes` and `storagePrefix` are the `issuer`, `client_id`,
`scopes` and `storage_prefix` of the UI backend's `idp` object in
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
  `headers()`, one refresh in flight at a time, every concurrent caller
  awaiting the same request, because the catalog is a public client whose
  refresh tokens rotate (RFC 9700 §2.2.2, §4.14.2) and a second
  presentation of the same token is a replay the issuer revokes the grant
  for; a refresh answered `invalid_grant` clears the tokens and ends the
  session on the bus, and any other failure keeps them.

### Backend session provider

`createBackendSession({ baseUrl, events, storageKey })` is the shape of an
app whose backend is the confidential client, `baseUrl` the origin that
served the page:

- the backend's HS256 JWT and the profile it answered live together under
  `storageKey` (`user`) and every request carries the JWT as
  `x-access-token`;
- the provider keeps no interceptors: `headers()` refreshes the JWT when
  its own `exp` claim is within a minute while the session is kept,
  `stay_logged_in` or an OIDC session, which is kept by definition, the
  provider's refresh token deciding its life, before answering it, a
  check of the token at request time and never a clock, `adoptResponse()`
  stores an `x-refreshed-token` header, `retryAuth()` refreshes once
  while the session is kept, and `endSession()` ends it on the bus; the API client
  calls all four, so a request that bypasses the client carries nothing,
  and the provider's own reads of the profile, the claims, the trusted
  issuers and its preferences write go through an instance of that client
  built over itself, so a JWT rotated in a response header on any of
  them is adopted;
- memberships come from the profile's `organizations`, every row in the
  identity provider's shape,
  `{ uuid, name, roles, primary, personal, logo_url, email_hash }`, with
  `display_name` beside `name` where the backend answers one, read
  through `accountMembership`, the cookie provider's own mapping, the
  uuid as the uuid, because the uuid is the organization's identity, a
  name can be renamed, and the rows a resource server answers
  (`org_uuids` on a host and on a machine) are keyed on it; the display
  name is the name a page draws where it draws one, the switcher's row
  and the user menu's organization row among them, and `name` stays the
  word the organization's routes are keyed by; an app's own permission
  rules read the same mapping over `isMember`, `isManager` and `isOwner`;
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
cached under `storageKey` (`account`), `load()` `GET /api/user`,
conditional on the last `ETag`, a `304` answering the last session (a
`401` clears the cache without ending the session on the bus), `login()` a
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
query and must never be remembered as a return path, all but `activate`,
whose query carries only the device's user code, so a sign-in begun there
returns to it with the code prefilled, and which stands with them among
its `barePaths`, the paths drawn without the column and the app section;
its cached `account`
holds the display fields and the four `preferred_*` members; `mode`,
`theme`, `motion` and `language` are the visitor's own keys, written by
the person's own controls alone and never from the account; the
account's values ride the cached record and leave with it at sign-out,
`signOut()` and `endSession()` removing every key of the storage table
but `mode`, `theme`, `themes`, `motion` and `language`, so the next
person on a shared machine inherits neither a profile paint, a pending
invite nor a return path.

### API key session provider

`createApiKeySession({ baseUrl, events, storageKey })` is hyperweaver-agent's
shape, chosen when the UI backend's first `auth` token is `apikey`, `oidc`
as its second token meaning the federated paths are on and never the
session kind: the session is the agent's one cookie, `__Host-hwa_session`,
`HttpOnly`, `Secure`, `SameSite=Strict` and `Path=/`, set by every sign-in
and carried by the browser with its same-origin credentials on every
request and on `GET /api/events`, and the browser never holds the key;
there is no CSRF cookie and no CSRF header, `headers()` answering `{}` for
every method, because the agent guards every method but `GET`, `HEAD` and
`OPTIONS` by the headers the browser sets itself, `Sec-Fetch-Site`
`same-origin` or `none`, else an `Origin` whose host equals `Host`, else a
`403` problem; the `Secure` cookie means the agent serves the UI over HTTPS
alone. Of the profile
`GET /api/api-keys/info` answers, the display members the session reads
are cached under `storageKey` (`apikey`), never the key and never a
member that moves on every request, so a profile read again writes the
same record; `retryAuth()` false because the session has no refresh,
`load()` the profile read again while a record is cached, a `401` there a
dead session, the agent clearing the cookie, that clears the record
while any other failure keeps it, and a `403` on any other route a role
too low that touches the session not at all; `login(key)` the pasted key
handed to `POST /api/auth/session` `{ api_key }`, answered `204` with the
cookie set or `401`, then the profile read; `adopt()` the profile read
of the session the cookie already carries; `begin({ method: 'silent' })` the
`prompt=none` authorize URL of `POST /api/auth/oidc/silent-start` followed
as a top-level navigation, `begin({ method: 'code' })` the RFC 8252
authorization-code flow of `POST /api/auth/oidc/code-start` while the
status lists `oidc-code`, answered
`{ handle, authorize_url, manual_url, expires_in }`: the `authorize_url`
opened in a new tab, the agent's own callback taking the code on the
agent's machine, and the `manual_url`, the same request aimed at the
provider's code page, shown with Copy beside a field for the code the
person pastes from that page, `code#state`, handed to
`POST /api/auth/oidc/code` with the flow's handle, the approval of either
read with `GET /api/auth/oidc/device-status`, one request the agent holds
open until the flow ends or its life runs out, asked again after every
`pending` answer and never on a clock, the approved answer carrying no key
and setting the cookie, the session then taken through `adopt()`; the
device grant is the agent's own, for the machine's notifications and its
joins, and the page offers it to no person; `complete()` the `#tray=`
claim of a tray Open or an `hwa://open`, once per page load with the
fragment stripped before `POST /api/auth/tray-claim` `{ token }` is sent,
answered `204` with the cookie set, and a cached session that still
validates outranking it, the claimed session answered once
and never after the record was forgotten, the hand-off told to the other
tabs of the origin over the `BroadcastChannel` `hw-auth`, `auth-ping`
which every open tab answers with `auth-pong` and `auth-updated` on which
a tab signed out or holding another key's session, the cached profile's
`id` differing from its own, reloads into the session, the tab
the tray or the hand-off opened closing itself the moment a pong arrives
and staying open while none does, so a tab a person opened is never closed
and nothing waits on a clock, `claims()` null; once the profile
is read, `GET /api/user` read on the same session and held in memory,
the person's record in the identity provider's shape without its
`preferred_*` members, because the agent keeps no user preferences: the
mode, the theme, the motion switch and the language are the browser's
own `mode`, `theme`, `motion` and `language` keys, written by the
person's own controls and painted by the pre-paint script, and the time
zone the browser's own `timezone` key, the profile page reading it as
the record's `preferences.timezone`, a `404` there leaving the key's
profile as the whole identity, and `savePreferences()` writing the
patch's `timezone` under that key and sending nothing; a pick of the
`shi` theme on this host writes `ui.shi_mode` true through
`PUT /api/config/app` beside the browser's `theme` key, and a pick of
any other theme writes it false, so the agent's tray swaps its icon on
that save; the cached
record carries the profile's `issuer` and `subject`, the
identity provider's origin and the account's stable id on a key a
federated login minted, and the session's `issuerUrl` is that issuer, so
the user menu's identity card and the profile page's Manage at identity
provider link point at it, the menu's Preferences row opening the local
`/profile/preferences` as the sidebar's row does, the profile page at
`/profile` drawing the record `readOnly` on every key because the agent
serves no write of it;
both sign-outs forgetting the record and sending `POST /api/auth/logout`,
answered `204` with the cookie cleared, and `endSession()` ending the
session on the bus only while a record is cached, so the refusals of
requests sent after a sign-out end no session twice; the key's own role is mapped onto the hosts feature's ladder, the
agent's `admin`, its highest role, to `super-admin`, `operator` to `admin`
and `viewer` to `user`, with `ROLE_ADMIN` beside an `admin` key's record
because the agent's configuration routes are admin-only; a handoff tells
the other tabs over the `BroadcastChannel` `hw-auth` with `auth-updated`,
the `storage` event the fallback, and a tab that hears it while signed out
or holding another key's session reloads. Its `authPaths` are `/login` alone.

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
token and answers `session-terminated` with the provider's
`endSession()`, which clears the cached record and ends the session on
the bus, so a back-channel logout at the identity provider reaches every
open tab; `reset` on the stream re-reads the profile, and a sign-out in
one tab reaches its siblings through the `storage` event. No provider or
screen opens a stream of its own.

---

## Sign-in return

`createReturnTo({ storageKey, signInPath, authPaths, barePaths })` is the
one place a return path is remembered and read; `createSession` builds it
beside the provider, under `intended_url`, with `/login` and the auth
paths for a `backend` UI backend and `/callback` as the only auth path for
an `idp` UI backend:

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
- `onBarePage(pathname)` says whether the current page is one of the
  `barePaths`, drawn without the column and the app section, the
  `authPaths` unless the provider names more, the `cookie` provider
  adding `/activate`;
- `signInTo(returnTo)` builds `<signInPath>?returnTo=` for an app whose
  Sign in button is a link to its login page, and `''` for an app whose
  sign-in is one click.

On a UI backend whose `auth` names a session and whose `features` does not
list `landing`, a signed-out visitor on any route but an auth path is sent
to `signInTo` with the page as the return path, the ended session's page
while the session-ended banner shows, once `loaded` says there is no
session and nothing drawn before; a UI backend whose sign-in is one click
draws its page, because `signInTo` names no page to send the visitor to.

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
`/callback/` and `onDone` replaces the location with the consumed return
path; a `backend` UI backend renders it on the `/auth/callback` route
inside the app and `onDone` navigates there with `replace`.

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

- Mode, theme, motion and language write through the provider's `savePreferences`,
  so the app never knows whether the write reaches the identity provider
  directly (the catalog, with a DPoP proof for the issuer's URL) or its
  backend, which delegates for an OIDC session (BoxVault).
- On sign-in and on every load of the session the account value is
  applied in memory over the browser's own, as the preferences contract
  requires, so the mode and the theme are centrally controlled: a change
  made on one site is picked up on a normal page refresh of any of the
  OAuth apps, never through a hard refresh or a logout and back in, and
  on the stream's `profile-updated` and `reset` while a tab is open. The
  browser provider caches `preferences.mode`, `preferences.theme`,
  `preferences.motion` and `preferences.language` from `/userinfo` under
  `<prefix>.preferences` on every `load()` and `reload()` and answers them
  beside the user as `preferred_mode`, `preferred_theme`,
  `preferred_motion` and `preferred_language`; BoxVault reads
  `GET /api/user` on every `load()` and stores the same four in the
  profile; and the issuer's cookie provider caches them beside the
  display fields on every `200`, so the chrome adopts them the moment the
  profile answers and the pre-paint script paints them before the first
  frame; a member the account holds as null means the operating system's
  mode, the host's own theme or the device's motion and overrides the
  browser's own value in memory, except for a guest-only account, whose
  browser values stand because the issuer refuses its writes. When the
  user goes away, a sign-out or a session ended elsewhere, the mode, the
  theme and the motion switch return to the visitor's own values under
  the browser's keys. The theme is applied from the account's record and
  never mirrored into the browser's own keys, so the theme never spills
  into the app's theme when they are signed out, and nothing is deleted
  at sign-out but the credentials and the cached record.
- `claims()` is memoized per session and reset by a sign-out or a reload,
  so the user menu, the favorites and the ticket URL read one fetch.

---

## Storage

Storage is per origin, so no key carries an app prefix; the only prefix is
the `idp.storage_prefix` the UI backend names for its tokens.

| Value                             | `idp` UI backend (the catalog)                                                                                                                                                                                                                                                                                                 | `backend` UI backend (BoxVault)                                                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| session                           | `<storagePrefix>.access_token`, `.refresh_token`, `.id_token`, `.token_type`, `.expires_at` and `.preferences`, the last userinfo `preferences`, in `localStorage`; `<storagePrefix>.oidc_discovery` in `sessionStorage`; the DPoP key in IndexedDB `<storagePrefix>-dpop`                                                     | `user` in `localStorage`: the profile with its four `preferred_*` members, the JWT, `stay_logged_in`                                                                                                                                                       |
| sign-in round trip                | `<storagePrefix>.pkce_verifier`, `<storagePrefix>.pkce_state`, kept for the one round trip and dropped by `complete()`                                                                                                                                                                                                         | n/a — the backend holds the verifier                                                                                                                                                                                                                       |
| return path                       | `intended_url`                                                                                                                                                                                                                                                                                                                 | `intended_url`                                                                                                                                                                                                                                             |
| active organization               | `activeOrganization` (uuid)                                                                                                                                                                                                                                                                                                    | `activeOrganization` (uuid; on hyperweaver-server the key absent while the choice is All organizations)                                                                                                                                                    |
| push switch                       | `push_enabled`                                                                                                                                                                                                                                                                                                                 | `push_enabled`                                                                                                                                                                                                                                             |
| sign-in method chosen             | n/a — sign-in is one click                                                                                                                                                                                                                                                                                                     | `login_method`                                                                                                                                                                                                                                             |
| join intent kept across a sign-in | n/a                                                                                                                                                                                                                                                                                                                            | `join_org`                                                                                                                                                                                                                                                 |
| silent SSO tried                  | n/a — sign-in is one click                                                                                                                                                                                                                                                                                                     | `silent_sso_attempted` in `sessionStorage`                                                                                                                                                                                                                 |
| table preferences                 | `table_prefs_<org or home>`, one JSON object `{ view, sort, group, hiddenColumns, widths, size, filters, folds }` per key, `view` present only on a page with the view toggle, so a page's choices travel as one value and a key never holds a bare string                                                                     | `table_prefs_<org or home>`, one JSON object `{ view, sort, group, hiddenColumns, widths, size, filters, folds }` per key, `view` present only on a page with the view toggle, so a page's choices travel as one value and a key never holds a bare string |
| networking page preferences       | `table_prefs_networking`, the folds of the networking page as `folds`, and `table_prefs_networking_addresses`, `_routes`, `_interfaces` and `_bandwidth`, one object a table of that page, `{ sort, hiddenColumns, widths, size }`                                                                                             | `table_prefs_networking`, the folds of the networking page as `folds`, and `table_prefs_networking_addresses`, `_routes`, `_interfaces` and `_bandwidth`, one object a table of that page, `{ sort, hiddenColumns, widths, size }`                         |
| sidebar width                     | `sidebar_width` (px)                                                                                                                                                                                                                                                                                                           | `sidebar_width` (px)                                                                                                                                                                                                                                       |
| sidebar collapsed                 | `sidebar_minimized`                                                                                                                                                                                                                                                                                                            | `sidebar_minimized`                                                                                                                                                                                                                                        |
| sidebar open nodes                | `sidebar_open_<group>`                                                                                                                                                                                                                                                                                                         | `sidebar_open_<group>`                                                                                                                                                                                                                                     |
| sidebar tree view                 | `sidebar_view_<group>`                                                                                                                                                                                                                                                                                                         | `sidebar_view_<group>`                                                                                                                                                                                                                                     |
| footer pane height                | `footer_height` (px)                                                                                                                                                                                                                                                                                                           | `footer_height` (px)                                                                                                                                                                                                                                       |
| footer pane open                  | `footer_open`                                                                                                                                                                                                                                                                                                                  | `footer_open`                                                                                                                                                                                                                                              |
| footer pane view                  | `footer_view` (`tasks` or `shell`)                                                                                                                                                                                                                                                                                             | `footer_view` (`tasks` or `shell`)                                                                                                                                                                                                                         |
| tasks priority floor              | `tasks_min_priority` (20, 40, 60, 80 or 100)                                                                                                                                                                                                                                                                                   | `tasks_min_priority` (20, 40, 60, 80 or 100)                                                                                                                                                                                                               |
| tasks columns shown               | `tasks_columns`, a JSON list of column keys                                                                                                                                                                                                                                                                                    | `tasks_columns`, a JSON list of column keys                                                                                                                                                                                                                |
| terminal preferences              | `terminal_prefs`, one JSON object `{ fontSize, fontFamily, scrollback, cursorStyle, cursorBlink }`                                                                                                                                                                                                                             | `terminal_prefs`, one JSON object `{ fontSize, fontFamily, scrollback, cursorStyle, cursorBlink }`                                                                                                                                                         |
| mode, theme, motion and language  | `mode`, `theme`, `themes`, `motion`, `language`, the chrome's own keys, all five kept across a sign-out; `mode`, `theme`, `motion` and `language` are the visitor's own keys, written by the person's own controls alone and never from the account; the account's values ride the cached record and leave with it at sign-out | the same                                                                                                                                                                                                                                                   |

A `cookie` UI backend (the identity provider) keeps `account` (the cached display fields and the four `preferred_*` members, the account's mode and theme leaving with it at sign-out), `intended_url`, `activeOrganization` (uuid), `push_enabled`, `login_method` (`password` or `magic_link`), `mode`, `theme`, `themes`, `motion`, `language`, `table_prefs_admin_users`, `table_prefs_admin_organizations`, `table_prefs_admin_logins`, `table_prefs_admin_registrations`, `table_prefs_admin_sessions`, `table_prefs_admin_dashboard`, `table_prefs_inbox`, `table_prefs_organizations`, `table_prefs_admin_client_health`, `table_prefs_admin_blocked`, `table_prefs_admin_service_usage`, `table_prefs_org_console_requests`, `table_prefs_org_console_invitations` and the sidebar keys; it has no upstream, so `silent_sso_attempted` is unused.

---

## API client

`createApiClient({ baseUrl, requestOrigin, session, onError })` is the one
HTTP client every request of an app goes through; no screen, adapter or
service calls axios or `fetch` with a session header of its own, the root
entry's `probeStatus` being the one call outside it, made before any
session exists. `initRuntime` builds it once over the provider, at the
origin that served the page, and every feature's `api/` file calls it.

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
- A `401` on an authenticated request means no session: it is replayed once
  after `session.retryAuth()` answered true; when it cannot recover, or the
  replay fails again, `session.endSession()` ends the session on the bus
  and the session-ended banner shows, quietly: the client raises no notice
  of its own, the banner of the navbar contract's Notices section being the
  one notice for a session that ended, and the failure is thrown with
  `errors.sessionEnded` as its key, never `errors.accessDenied`, because a
  person whose session ended lacked no permission. `skipAuthRefresh` turns the replay
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
  `messageKey`, a key in `shared.json`: `errors.sessionEnded` for 401,
  `errors.accessDenied` for 403, `errors.notFound` for 404, `errors.network` when the server could
  not be reached, `errors.request` otherwise; a call overrides a status
  through `messageKeys`. An aborted request rethrows the
  abort as is. `onError` sees every `ApiError` once before it is thrown.
- `encodePath(...segments)` builds a path from raw names, each segment
  URL-encoded, so a name with a reserved character never breaks a route.
- Per UI backend: `initRuntime` builds `client` at the serving origin for
  everything under `/api/*`, and `hubClient` for the notification hub, a
  second client at `idp.issuer` for an `idp` UI backend and the same `client`
  for a `backend` UI backend whose backend proxies the hub. The box collection
  sends its files on the same client: 5 MB chunks with in-chunk progress,
  then the assembly poll.

---

## Backends

A backend behind the browser OIDC provider verifies what `session.headers`
sends, the way the catalog Worker and BoxVault's request resolver do:

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
`RegisterPage` and `InvitePage`, drawn from the provider, the return-path
helper and one `auth` adapter the router builds, routed while the UI
backend's first `auth` token is `backend` or `cookie` (`/register` also
needs `local-accounts`) and answered with `NotAvailableStub` on an `idp`
UI backend, whose sign-in is one click.

- `auth` is `{ methods, register, validateInvitation, acceptInvitation,
loginMethodKey, silentSsoKey }`: the four calls of the auth feature's API
  and the two localStorage keys the pages remember the chosen sign-in
  method and the one silent SSO attempt under.
- `LoginPage({ session, account, returnTo, auth, appName })` reads
  `auth.methods()`, draws the local form only where the provider carries
  `login`, one button per identity provider through `session.begin({
method })` (the default provider filled and full width, the rest full
  width while fewer than three and three-column tiles from three on),
  the remembered choice between the two, the silent
  `prompt=none` attempt of the navbar contract, the provider begun at
  once with no chooser drawn while the answer enables exactly one method
  and it is the `default_provider` (a host whose sites map lists one
  sign-in method for a face), under the same guards as the silent
  attempt so a returned `error` or a `provider` parameter still draws
  the one button, and remembers the return path for the callback; `account` is the session state of `useSession`,
  whose adopted session alone (`loaded` and a user) sends a signed-in
  person off a sign-in page to the consumed return path or home, never the
  cached account.
- `RegisterPage({ session, account, returnTo, auth })` draws the local form where
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

## Shared layer

- `createSession(status, events)` builds `createBrowserOidc` over the
  `issuer`, `client_id`, `scopes` and `storage_prefix` of `status.idp`
  with `events` and `apiBase`, and `createReturnTo` with `/callback` as
  the auth path, for an `idp` UI backend; `createCookieSession({ baseUrl:
origin, events })` and `createReturnTo` with `/login` and the identity
  contract's sign-in paths for a `cookie` UI backend;
  `createBackendSession({ baseUrl: origin, events })` and `createReturnTo`
  with `/login` and the auth paths otherwise; `intended_url` in all three.
- `initRuntime(status)` answers `events`, `session`, `returnTo`, `client`
  at the serving origin with `onError` logging, and `hubClient` at
  `idp.issuer` or the same client.
- The app runs `useSession` with `onAdopt` feeding the provisioners
  adapter's memberships while the UI backend advertises
  `private-catalogs`, the mode, theme and language write-through, the
  event stream of the events contract while the UI backend advertises
  `events` (`useSessionKeepalive`, no timer of any kind), and the account
  state into `AppShell`.
- The router builds the `auth` adapter and the `/login`, `/register`,
  `/invite/:token` and `/auth/callback` routes while the UI backend's
  first `auth` token is `backend`, and the `account` adapter and the
  `/profile` route on the shared `ProfilePage`, which calls
  `signOutEverywhere`, `reload` and emits `login` on the bus.
- The layer exports `createBrowserOidc`, `createBackendSession`,
  `profileMemberships`, `createCookieSession`, `accountMembership`,
  `createDpop`, `base64url`, `decodeJwt`, `createSessionEvents`,
  `createReturnTo`, `currentPath`, `safeReturnPath`, `createSession`,
  `initRuntime`, `useSession`, `sessionStateShape` and `CallbackPage`. It
  imports only react, prop-types, react-bootstrap, react-i18next, axios
  and the chrome's organization shape; the `session.*` keys it reads live
  in `shared.json`.

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Pages Contract](universal-pages/) |
[Preferences, Language & Branding Contract](preferences-and-branding/) |
[Integrating Your App](integrating-your-app/) | RFC 6749, RFC 6750, RFC
7009, RFC 9449, RFC 9700, RFC 9110, OpenID Connect Core 1.0, Back-Channel
Logout 1.0, Front-Channel Logout 1.0, RP-Initiated Logout 1.0 and Session
Management 1.0
