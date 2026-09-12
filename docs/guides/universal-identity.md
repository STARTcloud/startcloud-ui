---
title: Universal Identity Contract
layout: default
nav_order: 15
parent: Guides
permalink: /docs/guides/universal-identity/
---

## Universal Identity Contract

{: .no_toc }

The identity provider's own pages as pages of the STARTcloud UI. The
authorization server becomes a UI backend like every other: it serves the
one build at `/`, answers `GET /api/status` with `role: "auth-server"` and
`auth: ["cookie"]`, and every page a person sees on it, sign-in, second
factor, registration, consent, profile, organizations, notifications,
admin, policies and errors, is a page of the shared UI drawn from JSON the
server answers. The server renders no HTML. This contract fixes, page
group by page group, the routes the SPA owns, the state each page reads,
the action each page sends, the answer the server gives, and the keys and
components the page draws with. It extends the
[Universal Navbar Contract](universal-navbar/) (the `cookie` auth token
and the `auth-server` role), the
[Universal Session Contract](universal-session/) (the cookie session
provider), the [Universal Pages Contract](universal-pages/) (the page
registry and reserved segments) and the
[Universal Validation Contract](universal-validation/) (every refused
write). The visual reference is
[universal-identity.html](../universal-identity.html): the first frame is
live and every callout after it is a rule of this text. The contracts
build on one another in the order branding, navbar, session, pages,
sidebar, identity, and the "How it fits" section of
[universal-sidebar.html](../universal-sidebar.html) draws that order and
the issuer assembled from every one of them beside BoxVault.

Five groups: sign-in; registration, onboarding and terms; the OAuth and
OIDC interstitials; the signed-in pages; admin, health and errors.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **The server answers, the page draws.** Every page GET on the issuer is
  the SPA; every page state is a JSON call under `/api/auth/*`; every
  action is the POST the server already takes, answered as JSON when the
  request says `Accept: application/json`. No route moves: `/login`,
  `/authenticator`, `/passwordReset` and the rest keep their paths because
  relying parties, emails and bookmarks carry them.
- **GET is the page, POST is the action.** Every page GET on the issuer is
  `permitAll` and answers `index.html`; authorization lives on `/api/*`,
  on the POST actions and on the protocol endpoints, and the SPA sends an
  anonymous visitor to `/login` with the page kept under `intended_url`,
  so `SecurityConfig` neither gates nor redirects a page GET, because a
  `403` on `/admin/users` or a `302` on `/activate` would otherwise answer
  a request for `index.html`. Where the SPA route and the server action
  share a path (`/login`, `/authenticator`, `/authenticator-method`,
  `/passwordRecovery`, `/passwordReset`), the method tells them apart: a
  browser GET falls through to `index.html`, a POST reaches Spring. A GET
  a controller maps wins over the fallback, and those GETs are exactly
  `/oauth2/authorization/{id}`, `/provider-registration/continue`,
  `/api/admin/export/*`, `/.well-known/*` and the OAuth, OIDC, SCIM and
  other protocol endpoints; every other GET is a page. The authorization
  server is FAPI 2.0 Security Profile conformant (RFC 9126 PAR, RFC 9449
  DPoP, RFC 9101 JAR, RFC 8705 mTLS, RFC 9700 security BCP) and remains
  so: the OAuth2 protocol chain, its filters, and the authorize, token,
  PAR, device, introspection, revocation, userinfo, registration and JWKS
  endpoints are outside every page-route change, no fix from the UI
  backend work touches them, and the OpenID conformance suite against the
  deployed server is the gate before any release.
- **One answer shape for a sign-in step.** A step that succeeds answers
  `200 { "next": "<path or URL>" }`; a step that fails answers RFC 9457
  `application/problem+json` with `code` naming the reason and, for a
  throttled step, `wait_seconds` beside a `Retry-After` header carrying
  the same number (RFC 9110 §10.2.3). The page never parses `title` or
  `detail`; it translates from `code`. One problem `type` per meaning,
  from the validation contract's registry: `…/probs/authentication` for a
  refused sign-in, `…/probs/throttled` for a `429`,
  `…/probs/method-locked` for a locked second-factor method, and one
  `code` per meaning, so `locked` never means three things. A `401` from
  `POST /login` carries a `WWW-Authenticate` challenge, as RFC 9110
  §15.5.2 requires of every `401`. JSON is answered only when `Accept`
  lists `application/json` by name and `*/*` is ignored, because a browser
  form post sends `*/*` and would otherwise be answered JSON; every
  dual-answer POST sends `Vary: Accept`, and the form fallback redirect
  is a `303`.
- **Redirects stay where a browser must follow them.** The federated hop
  (`GET /oauth2/authorization/{id}`) and the resumed `/oauth2/authorize`
  are top-level navigations, never fetches. The emailed links are not:
  `/login/magic`, `/login/bootstrap`, `/registration/verify` and
  `/org/invite/:token` are SPA routes whose page posts `{ email, token }`
  (`{ token }` for the invitation, `{ email, token, return }` for the
  bootstrap link) to consume the token, and
  the cancel is `POST /auth-cancel` answering `{ next }`, because a
  single-use token consumed by a GET is burned by a mail scanner's
  prefetch, a link preview or the back-forward cache before the person
  arrives (RFC 9110 §9.2.1), and a read that answers once stays
  idempotent for the session until a POST clears it.
- **Nothing sent from the page is a secret the page keeps.** The CSRF
  token is the `XSRF-TOKEN` cookie echoed as `X-XSRF-TOKEN`; the session
  is the HttpOnly `ASJSESSIONID` cookie; the page keeps a display cache of
  the profile (`name`, `email`, `picture`, `roles`, `organizations` and
  `has_local_auth`, a boolean the step-up dialog reads on any page to ask
  for a password or a code; never the address, the birthdate or the
  preferences) and the chosen sign-in mode. Every POST on the issuer, `POST /login` included and whatever
  `Accept` it carries, is refused with `403` unless the header or a
  `_csrf` field matches the cookie, because a cross-site form that signs a
  victim into an attacker's account is a POST without the header. The
  session and remember-me cookies are `Secure; HttpOnly; SameSite=Lax;
Path=/` and `XSRF-TOKEN` is `Secure; SameSite=Lax; Path=/`, each with
  the `__Host-` prefix wherever the deployment allows it, so a sibling
  subdomain cannot plant either. The issuer's CORS answer lists the
  sibling origins and sends `Access-Control-Allow-Credentials: false`:
  a browser app on another origin reaches the issuer with a Bearer or
  DPoP token in a header, which crosses origins with or without
  credentials, while the session cookie never rides a cross-origin call,
  so a compromised sibling page cannot act as the signed-in person and no
  estate app loses a call it makes today. Every session-bound answer under `/api/*`
  carries `Cache-Control: no-store`, so a one-time secret such as a
  backup-code list or an enrollment key is never kept by a cache on the
  path. `401` is reserved for "no valid session" and always ends the
  session on the bus; a wrong password, a wrong code or a missing step-up
  on a live session answers `403` with its `code`, so a person is never
  signed out for a typo. The logger and the client-error report never
  carry a request body or a query string, because a retried step-up body
  holds the password and a reset link holds its token.
- **Anti-enumeration answers are the same either way.** The magic-link
  request and the password-recovery request answer `202` whether or not
  the address exists; the page shows the sent state on `202` and nothing
  else.
- **Every string is a key.** Every word a page of this contract shows is
  a key of `shared.json` or `auth.json` in `en`, `es` and `cimode`, written
  with the page; the server sends codes and data, never prose, and the
  `messages.properties` keys retire with the templates that read them. The
  shared UI already has one i18n system with CI parity across its locales,
  and a second vocabulary on the server would drift from it on the first
  release.
- **The contract drives the code.** Where a file in a repository and a
  clause here disagree, the clause wins and the file changes; a rule that
  matters is written here, with its reason, and nowhere else, because a
  rule kept in a repository note is invisible to the other repositories
  that must honor it.

---

## The cookie session provider

`createCookieSession({ baseUrl, events, storageKey })` is the fourth
provider of the session contract, chosen when the UI backend's first
`auth` token is `cookie`.

| Member                                    | Cookie session provider (`createCookieSession`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `issuerUrl`                         | `'cookie'`, the serving origin (the issuer is itself)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `restore()`                               | the cached profile from `localStorage` under `storageKey` (`account`), synchronously; `null` when none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `load()`                                  | `GET /api/user` through the API client's `auth: 'optional'` mode, which neither replays nor ends the session on a `401`: on `200` caches the display fields, applies `preferences.theme` and `preferences.language` to local storage as the branding contract requires on every adopt, and answers the profile; on `401` clears the cache and answers `null` (nobody was signed in); on `403` with `code: onboarding_required` caches the pending profile the body carries beside `code` and `next`, its display fields `name`, `email`, `picture`, `roles`, `organizations` and `has_local_auth`, answers it as signed-in-pending and navigates in-router to the answer's `next` |
| `reload()`                                | `load()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `begin(opts)`                             | `{}` navigates in-router to `/login`, the cluster's Sign in on a page that is not an auth page; `{ method }`: `local` and `magic-link` navigate in-router to `/login`; `oidc-<id>` sets `window.location` to `/oauth2/authorization/<id>`; `silent` is unsupported on the issuer and ignored                                                                                                                                                                                                                                                                                                                                                                                      |
| `login(username, password, stayLoggedIn)` | `POST /login`, `application/x-www-form-urlencoded`, `username`, `password`, `remember-me` when `stayLoggedIn`, `Accept: application/json`, the CSRF header; answers the `next` of a `200`; throws `ApiError` on a problem body                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `complete()`                              | a no-op; no callback page on the issuer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `headers(method, url)`                    | `{ 'X-XSRF-TOKEN': <XSRF-TOKEN cookie> }` on every method but `GET`, `HEAD` and `OPTIONS`; `{}` otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `retryAuth()`                             | `false`; a `401` on an authenticated call ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `adoptResponse(headers)`                  | a no-op, since the API client calls it on every response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `endSession()`                            | drops every storage key but `theme` and `language` and ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `refresh()`                               | `load()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `claims()`                                | memoized `GET /api/userinfo/claims`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `savePreferences(patch)`                  | `PATCH /api/user/preferences`, then `preferences.theme` and `preferences.language` of the answer applied to local storage as `load()` does; the cache holds the display fields alone and is never widened, so nothing in it is updated                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `signOut()`                               | `POST /user/logout` with the CSRF header, answering `200 { "next": "/connect/logout/frontchannel" }` while relying parties registered front-channel URIs and `{ "next": "/login?logout" }` otherwise; the provider drops every storage key but `theme` and `language` and sets `window.location` to `next`                                                                                                                                                                                                                                                                                                                                                                        |
| `signOutEverywhere()`                     | `signOut()`; on the issuer the local session is the SSO session, so the logout row draws the plain red row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `oidc`                                    | always `false`: a federated sign-in on the issuer still ends in the issuer's own session, so the logout row never offers the two-scope toggle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Storage on the issuer, per the session contract's storage table:
`account` (the cached display fields), `intended_url`, `activeOrganization`
(uuid), `push_enabled`, `login_method` (`password` or `magic_link`,
replacing the `login_method_pref` cookie the server read), `theme` and
`language` (the chrome's own keys), `table_prefs_admin_users`,
`table_prefs_admin_organizations`, `table_prefs_admin_logins`,
`table_prefs_admin_registrations`, `table_prefs_admin_sessions`,
`table_prefs_inbox`, `table_prefs_organizations`, and the sidebar keys
`sidebar_width`, `sidebar_minimized`, `sidebar_open_<group>` and
`sidebar_view_<group>`. The `silent_sso_attempted` key is not used: the
issuer has no upstream to try silently.

The API client sends every request with credentials on the same origin;
`hubClient` is the same client; `reportUrl` for client errors is
`/api/client-errors` on the issuer as on every `backend` UI backend,
since decision 61 opens that route to anonymous reports from the first
release.

---

## The issuer's status payload

`GET /api/status`, answered per site from the host the request carries,
before login, without auth, the navbar contract's payload in the issuer's
shape:

```json
{
  "role": "auth-server",
  "version": "1.9.1",
  "brand": {
    "name": "STARTcloud",
    "logoUrl": "/brand/startcloud/icon.png",
    "changelog": "https://github.com/STARTcloud/authorization-server-private/releases",
    "theme": "light"
  },
  "auth": ["cookie"],
  "collections": [],
  "features": [
    "local-accounts",
    "tfa",
    "onboarding",
    "interstitials",
    "policies",
    "org-console",
    "invitations",
    "integrations",
    "inbox",
    "admin",
    "notifications",
    "health",
    "events",
    "footer"
  ],
  "links": { "docs": "", "contact": "" },
  "ticket": {
    "baseUrl": "https://xd.prominic.net/app/apprequest.nsf/router?openagent",
    "reqType": "sso",
    "fallbackCustomerId": "A55DF1"
  },
  "events": { "path": "/api/events", "topics": ["notifications", "session", "health", "admin"] }
}
```

The example is the `startcloud` site of `application.yml` as it stands:
`sites.sites.startcloud.name`, `assets.logo_icon`, `assets.changelog_url`,
`theme_id: light`, `customer_id: A55DF1`,
`integrations.improvement_request.base_url` and `req`; no `help_url`, no
`support_email` and no analytics script are configured, so those members
are empty or absent. The payload's own members keep the navbar contract's
camelCase (`logoUrl`, `baseUrl`, `reqType`, `fallbackCustomerId`), the one
named exception to the estate's `snake_case` bodies, because every UI
backend and the shared UI's status reader speak it today and the
convergence is a later round across all of them.

| Field                           | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `role`                          | `auth-server`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | the navbar contract's name for the UI backend whose session is the `cookie` provider                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `version`                       | the Spring Boot build-info version (`BuildProperties`), the number release-please writes into `build.gradle`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | one number, read at runtime from the artifact that is running, the way every other UI backend answers its own released version; never a value in the UI build, never a second file to bump                                                                                                                                                                                                                                                                                                                                                                                                       |
| `brand.name`, `brand.logoUrl`   | `sites.sites.<id>.name` and the site's mark under `/brand/<site>/` in the served `ui/` tree, the pack directory's artwork for a site with a pack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | the mark, the org mark and the favicon of the chrome are the site's, so a person on `moonshinedev` never sees another site's mark; the jar serves no `/assets` once the templates go, so the issuer's images, site marks and provider icons alike, live in the build's `public/brand/` and the pack directories, and `/assets` is Vite's alone                                                                                                                                                                                                                                                   |
| `brand.theme`                   | `sites.<id>.ui.default_theme`, `light` or `dark`, beside the site's other `ui` switches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | a pack name in `theme_id` says nothing about a variant once `auth.css` is gone, so the site's default variant is its own word in config; the pre-paint script and the mount apply it only while neither the account nor local storage holds a choice, per the branding contract                                                                                                                                                                                                                                                                                                                  |
| `brand.pack`                    | `{ name, css }` while the site's `theme_id` names a pack, `name` the pack and `css` the stylesheet URL on the serving origin with the pack's `.hash` as `?v=`, the same values the site's `index.html` is stamped with; absent on a `theme_id: light` site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | the shell reads one member for a pack on every UI backend and calls no branding route; the issuer stamps the same two values into `index.html` so the pack paints with the first frame and the shell appends nothing                                                                                                                                                                                                                                                                                                                                                                             |
| `brand.repo`, `brand.changelog` | `repo` omitted; `changelog` from `sites.<id>.assets.changelog_url` when set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the source is private, so the footer's left slot links to the changelog, the navbar contract's second tier, and is plain text when neither exists                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `auth`                          | `["cookie"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the issuer is its own session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `collections`                   | `[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | the issuer lists nothing; the navbar contract's search page says so on the page, and the `search` token is not advertised because the estate-wide channel is planned on the issuer and is not this conversion                                                                                                                                                                                                                                                                                                                                                                                    |
| `features`                      | exactly the tokens a contract gates a surface on, no more, no fewer: `local-accounts` (per site, while `self_registration_enabled`), `tfa`, `onboarding`, `interstitials`, `policies`, `org-console`, `invitations`, `integrations`, `inbox`, `admin`, `notifications`, `health`, `events`, and `footer` per site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | a token gates a surface a contract names; a token no contract names would gate nothing and mislead the reader of the payload, and a surface the contracts name but the payload omits would never draw. A new token lands in the navbar contract's token table before any payload answers it                                                                                                                                                                                                                                                                                                      |
| `footer`                        | present only while `sites.<id>.ui.footer` is true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | a white-label site may carry no footer and no "Powered by" line; the switch is per site so one issuer serves branded and white-label sites from the same build, and the chrome draws no footer for a payload that omits the token                                                                                                                                                                                                                                                                                                                                                                |
| `health`                        | present while the issuer answers `GET /api/health` in the navbar contract's shape, `{ status, timestamp, services: { database, mail, sms, signing_keys } }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the footer's heart draws only while both `footer` and `health` are listed: no `footer`, no footer at all; `footer` without `health`, a footer without the heart; both, the heart from `/api/health`, refreshed from the events stream rather than a timer                                                                                                                                                                                                                                                                                                                                        |
| `links`                         | `docs` from `sites.<id>.assets.help_url`, `contact` as `mailto:` of `sites.<id>.mail.support_email`; an unset value answers `""`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | the chrome hides an empty link; the issuer never invents a destination                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ticket`                        | `baseUrl` from `integrations.improvement_request.base_url`, `reqType` its `req`, `fallbackCustomerId` the site's `customer_id`; `null` while `improvement_request.enabled` is false                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | when neither the active organization nor the person carries a customer id, the ticket belongs to the site the person was on, not to the global `improvement_request.customer_id`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `events`                        | `{ "path": "/api/events", "topics": ["notifications", "session", "health", "admin"] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | the one stream of the events contract; `health` is the core topic every streaming UI backend sends for the footer's heart, and `admin` is the operator's topic (`restart-required`, `blocked-count`), answered `403` to anyone without `ROLE_ADMIN`; `admin` is listed in `events.topics` only for a session holding `ROLE_ADMIN`, so the stream never refuses a topic the same session's status listed; the `403` remains for a caller who asks for `admin` unlisted; `/api/notifications/stream` and `notifications.js` retire with it, so a tab holds one connection and no page runs a timer |
| `analytics`                     | `{ script_url, attribute, value }` from `integrations.analytics.script_url`, `data_attribute_name` and `data_attribute_value` while `enabled` is true and `script_url` is set; absent otherwise. The collector is one the estate runs (a self-hosted Plausible or Umami), `script_url` names that host, and the tag is configured never to send the query string (`data-exclude-search` on Umami; Plausible drops it by default), so the tag stays on every page, the sign-in pages included, and the failures it records are ours; the issuer answers `analytics` only while the host of `script_url` is a configured hostname of one of its sites and leaves the member absent otherwise, so the shell appends whatever the payload carries on every page and decides nothing, because the sign-in, onboarding, interstitial and error pages carry reset tokens, codes and the desktop token in their URL and the UI has no list of the estate's hosts to judge a script by | the served `index.html` is the shared build's, so the tag a site wants rides the payload instead of the template; insight into sign-in failures is kept by owning the collector rather than by dropping the tag                                                                                                                                                                                                                                                                                                                                                                                  |

---

## Build, packaging and tests

- **The UI never enters this repository or the jar.** The pinned release
  is `version` in `packaging/config/ui-version.yaml`, beside
  `version.yaml`; CI fetches `startcloud-ui-<version>.tar.gz` from the
  UI's GitHub Release and unpacks it into `ui/` in the checkout, and the
  deb carries that folder as `/opt/prominic/authorization-server/ui/`
  beside `authorization-server.jar`, the shape of every sibling
  (BoxVault's `backend/ui`, the VDI Health Monitor's
  `/opt/vdi-health/ui`). Spring serves that folder on disk at `/`,
  `index.html` the fallback after every `/api` and protocol route, the
  navbar contract's serving rule; in development the folder is `ui/`
  under the working directory. A file in the folder is live on the next
  reload, which is what lets a pack or a page be edited on disk; a folder
  inside the jar could not be. Every file in the folder is served as it
  is except `index.html`: the fallback that answers a page GET is a
  controller that reads `ui/index.html` and stamps `data-brand-theme`,
  `data-brand`, the pack's `<link>` and, for the front-channel logout
  route, `frame-src`, from the site the `Host` header names, because the
  static handler sends a file byte for byte and the branding contract
  requires those values on the first frame, before any fetch. That answer
  and `/` carry `Cache-Control: no-store`, a direct `/index.html` answers
  404, the content-hashed files under `/assets/` carry
  `public, max-age=31536000, immutable` and everything else in the
  folder `no-cache` with an ETag, because a shell cached for a year pins
  the asset names of a release the bump has already replaced. The
  folder is served through a resolver rooted at the folder that refuses
  dotfiles and `*.map`, and the site's absolute URLs, the branding
  answer's included, are built from the site's configured hostname and
  never from the request's `Host`, an unrecognized host answering the
  default site. The push worker in the folder carries no `fetch`
  handler, is registered at scope `/push/` and is served `no-cache`, per
  the navbar contract's toast rules.
- **CI is the only fetcher.** The dev, prod and CI workflows fetch and
  unpack before the build step; Gradle and the jar never download
  anything and never contain the UI. A jar handed from one host to
  another runs with no network, the UI arrives with the package, and a
  build is reproducible from the checkout plus the pinned tarball, which
  only CI has the network to fetch.
- **The bump is the estate's.** `dependency-bump.yml` answers the UI's
  `dependency-update` dispatch by rewriting the pin and opening the
  `bump/startcloud-ui` pull request, the same shape as every other
  consumer, so the issuer moves with the family and never lags it by
  accident.
- **Tests are tools, never scripts.** No workflow of this repository
  carries a hand-written smoke script; a check that must survive becomes
  a proper tool in a reusable workflow, and a browser test tool,
  Playwright if chosen, is a normal step of the repository's standard
  `ci.yml`, the same shape in every repository of its class. A curl
  script encodes assumptions nobody maintains and diverges per
  repository; one tool in one workflow shape keeps the family convergent.
  Tests follow the conversion, they do not lead it; the Universal Testing
  Contract fixes the tool, where tests live and what every UI backend
  proves, and is written after the shared UI changes land.
- **Until the cutover the server keeps serving its own pages.** The
  shared UI grows first and runs from its own dev server against a local
  authorization server through the Vite proxy; the JSON routes of this
  contract land beside the templates, each answering the shared UI while
  the template still answers a browser GET, so no path on the server has
  two owners and no flag chooses between them. The cutover is the one
  change where the SPA fallback takes every page GET and the templates
  retire, `admin/config.html` among them, because the shared configuration
  editor of the config contract answers `/admin/config` over the
  `/api/config/*` routes the server serves (decision 16). A developer's `ui/` is the same
  tarball CI fetches, unpacked by hand with the documented
  `curl -fsSL … | tar -xz -C ui` line, and `ui/` is ignored by git, so
  no build of the UI ever enters this repository.
- **A feature's heavy libraries load only when its route renders.** The
  admin Dashboard's map library, the profile's address autocomplete and
  anything of that size are imported lazily by the route that draws
  them, never bundled into the shared build's first load, because the one
  build serves every UI backend and a BoxVault visitor must not download
  the issuer's login map.
- **Retirement is one change after the cutover.** The Thymeleaf templates,
  `auth.css`, `auth.js`, `notifications.js`, the Bootstrap layouts, the
  `messages.properties` keys and every controller that only rendered a
  page retire together once the shared UI serves every page of this
  contract, in one discussed change, so no page is ever half-served and
  nothing is removed ahead of the page that replaces it.

---

## Group 1: sign-in

### Sign-in routes

| Route                   | Page                                                                                                                                                                                                                      | Gate                       | Server routes behind it                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                | LoginPage in its issuer form: the request form, or the sent state when the URL carries `sent`, the address kept in router state and never in the URL, so history and the access log never hold it                         | `cookie` auth token        | `POST /login`, `POST /login/magic/request`, `GET /oauth2/authorization/{id}`, `POST /webauthn/authenticate/options`, `POST /login/webauthn`, `POST /auth-cancel` |
| `/login/magic`          | MagicLinkPage: reads the mail's `email` and `token` once, replaces the location, posts them and follows `next`; the invalid state with a link to request a new one                                                        | `cookie`                   | `POST /login/magic`                                                                                                                                              |
| `/login/bootstrap`      | BootstrapLoginPage: reads `email`, `token` and `return` from the seeded link once, replaces the location, posts them and follows `next`, the return validated by the server; the invalid state with "Sign in another way" | `cookie`                   | `POST /login/bootstrap`                                                                                                                                          |
| `/authenticator`        | TfaCodePage: the code entry for the chosen method, or the passkey prompt                                                                                                                                                  | `cookie`, `tfa`            | `GET /api/auth/tfa`, `POST /api/auth/tfa/send`, `POST /authenticator`, `POST /resend-tfa`                                                                        |
| `/authenticator-method` | TfaMethodPage: the method picker                                                                                                                                                                                          | `cookie`, `tfa`            | `GET /api/auth/tfa/methods`, `POST /authenticator-method`                                                                                                        |
| `/passwordRecovery`     | PasswordRecoveryPage: the request form, or the sent state when the URL carries `success`                                                                                                                                  | `cookie`, `local-accounts` | `POST /passwordRecovery`                                                                                                                                         |
| `/passwordReset`        | PasswordResetPage: the new-password form, `email` and `token` from the URL                                                                                                                                                | `cookie`, `local-accounts` | `POST /passwordReset`                                                                                                                                            |

`authenticator`, `authenticator-method`, `passwordRecovery` and
`passwordReset` join the reserved first segments of the pages contract.
`/registration`, `/complete-onboarding`, `/oauth2/consent`,
`/connect/logout/*`, `/activate`, `/user/*`, `/notifications`,
`/public/*` and `/admin/*` are later groups and are reserved with them.

### What the UI backend answers for sign-in

`GET /api/auth/methods`, before login, without auth, the same route and
members the `backend` UI backends answer, grown for the issuer:

```json
{
  "methods": [
    { "id": "magic-link", "name": "Email link", "enabled": true },
    { "id": "local", "name": "Password", "enabled": true },
    { "id": "passkey", "name": "Passkey", "enabled": true, "conditional_ui": true },
    {
      "id": "oidc-github",
      "name": "GitHub",
      "enabled": true,
      "icon_url": "/brand/providers/github.svg"
    }
  ],
  "default_provider": null,
  "silent_login": false,
  "local_registration_enabled": true,
  "login_mode": "magic_link",
  "cancel": false,
  "policies": [
    { "name": "privacy", "label": "Privacy Policy", "url": "/public/policies/privacy" },
    { "name": "terms", "label": "Terms of Service", "url": "/public/policies/terms" }
  ],
  "reset_link_ttl_minutes": 10,
  "magic_link_ttl_minutes": 15
}
```

| Member                                             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                               | Source today                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `methods[]`                                        | the sign-in methods this site offers, in display order; `local`, `magic-link` and `passkey` are the issuer's own, `oidc-<id>` the federated providers allowed for the site; `?oidc_provider=a,b` on the page narrows the federated ones the way the server's `oidc_provider` parameter does; `icon_url` is an `https:` URL or a same-origin path matching `^/(?![/\\])`, as decision 62 says of every URL member which the pages draw | `LoginController.login`: `enabledProviders` sorted by `displayOrder`, `passkeysEnabled`, the site's login methods |
| `login_mode`                                       | which of `magic_link` and `password` the page opens in when the visitor has no stored choice; the order is `?login=` for one visit and never stored, then the stored `login_method`, then `login_mode`, then the first enabled method, the order the server resolves today, so a link from a mail that says `?login=password` is honored over a stored choice                                                                         | `resolveInitialLoginMode`: the query, then the cookie, then `sites.<id>.default_login_method`                     |
| `local_registration_enabled`                       | whether the foot shows "Create an account" and whether the magic-link request creates a lead for an unknown address                                                                                                                                                                                                                                                                                                                   | `siteService.isRegistrationEnabled`                                                                               |
| `cancel`                                           | whether a client's authorization request is parked in the session, so the page draws Cancel only when there is something to cancel; a Cancel on a plain visit would loop `/auth-cancel` → `/` → `/login`                                                                                                                                                                                                                              | `requestCache.getRequest` non-null                                                                                |
| `policies[]`                                       | the public policy links under the form                                                                                                                                                                                                                                                                                                                                                                                                | `tosService.getActiveSiteToS` filtered to `isPublic`                                                              |
| `reset_link_ttl_minutes`, `magic_link_ttl_minutes` | the numbers the recovery and magic-link sent states name, so neither says "shortly"                                                                                                                                                                                                                                                                                                                                                   | `security.password_reset_token_ttl`, the magic-link token TTL                                                     |
| `passkey.conditional_ui`                           | whether the page starts the browser's conditional passkey prompt on the email field; the page gates on `PublicKeyCredential.isConditionalMediationAvailable()`, WebAuthn Level 3's own test, not on WebAuthn support alone                                                                                                                                                                                                            | `security.passkeys.conditional_ui`                                                                                |

`GET /api/auth/tfa`, session with `ROLE_2FA_REQUIRED`:

```json
{
  "method": "SMS",
  "target": { "id": 7, "label": "Work phone", "masked": "+1 *** *** 4242" },
  "sent": true,
  "wait_seconds": 0,
  "resend_after_seconds": 30,
  "can_change_method": true
}
```

`method` is the one the server resolved (`?method=` on the page, else the
preferred authenticator, else the user's preferred method); `target` is
present for `SMS` and `APP`; `sent` is whether a code for this method is
outstanding, so the page never asks for another while one is live;
`wait_seconds` is non-zero while the guessing gate is armed for this
method; `resend_after_seconds` is the sending limit, the seconds before
another message may go to the target, and the two are never one number
because a person waiting on a slow SMS is not a person guessing.

`GET /api/auth/tfa/methods`, the same session:

```json
{
  "sms": [{ "id": 7, "label": "Work phone", "masked": "+1 *** *** 4242" }],
  "app": [{ "id": 3, "label": "Phone" }],
  "passkey": true,
  "backup_codes": true,
  "locked": ["SMS"],
  "preferred": { "method": "APP", "authenticator_id": 3 },
  "sms_risk_notice": true
}
```

### What the sign-in pages send and what comes back

Every action below sends `Accept: application/json` and the CSRF header.
A `200` carries `next`; a failure is `application/problem+json` with
`type` under `https://auth.startcloud.com/probs/`, `status`, `code`, and
`wait_seconds` where the step is throttled.

| Action                | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `200`                                                                                                                        | Failure                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| password sign-in      | `POST /login`, form-encoded `username`, `password`, `remember-me`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `{ "next": "/" }`, `{ "next": "/authenticator" }`, `{ "next": "/complete-onboarding" }` or the saved `/oauth2/authorize` URL | `401` `authentication`, `code: bad_credentials` for a wrong password and for a disabled or locked account alike, the account's state told by mail, because a distinct code tells a caller which addresses exist; `429` with `wait_seconds` from the brute-force gate. `tos_session_expired` and `registration_disabled` reach the page as `?error=` from other flows, never as an answer to this POST |
| magic-link request    | `POST /login/magic/request`, JSON `{ "email", "resend" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `202 { "sent": true }` always                                                                                                | `400` `bad-request` with `errors[]` on `/email` when the address is missing or malformed; `429` `code: quota` with `wait_seconds` beyond the per-address and per-caller limit the server keeps, because a `202` that always sends is a mail cannon otherwise                                                                                                                                          |
| magic-link consume    | the page at `/login/magic` reads `email` and `token` from the mail's URL once, replaces the location with `/login/magic`, and posts `POST /login/magic`, JSON `{ "email", "token" }`; the GET of that URL is the SPA and consumes nothing, so a scanner's prefetch cannot burn the link                                                                                                                                                                                                                                                                                     | `{ "next": "/" \| "/authenticator" \| "/complete-onboarding" \| the saved request }`                                         | `403` `code: magic_link_invalid` or `magic_link_account_disabled`, drawn on the page with a link to request another                                                                                                                                                                                                                                                                                   |
| bootstrap sign-in     | the page at `/login/bootstrap` reads `email`, `token` and `return` from the seeded link once, replaces the location with `/login/bootstrap`, and posts `POST /login/bootstrap`, JSON `{ "email", "token", "return" }`, the server validating `return` before answering it as `next`; the GET of that URL is the SPA and consumes nothing                                                                                                                                                                                                                                    | `{ "next": "…" }`                                                                                                            | `403` `code: bootstrap_invalid` or `bootstrap_account_disabled`, drawn on the page with "Sign in another way"; `429` `throttled` with `wait_seconds`                                                                                                                                                                                                                                                  |
| passkey sign-in       | `POST /webauthn/authenticate/options` then `POST /login/webauthn`, JSON, unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `{ "next": "…" }` (today `redirectUrl`; the member is renamed to `next`)                                                     | `401` `authentication`, `code: passkey`                                                                                                                                                                                                                                                                                                                                                               |
| federated sign-in     | `GET /oauth2/authorization/{id}`, a top-level navigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | the provider's flow, back through the callback to `next`                                                                     | the page at `/login?error=<code>`                                                                                                                                                                                                                                                                                                                                                                     |
| second factor, send   | `POST /api/auth/tfa/send`, no body; the page calls it on mount only while `GET /api/auth/tfa` answers `sent: false` and `wait_seconds: 0`, and the server answers a repeat inside the code's window with `200` without sending again, because a reload, a double mount or an attacker holding the password must not pump messages (replaces `GET /authenticator-send`; the five redirects that target it today, in `TFAHandler`, the passkey success handler, the account-linking controller, the magic-link controller and the security matchers, become `/authenticator`) | the `GET /api/auth/tfa` shape                                                                                                | `409` `method-locked`, `code: locked` with the locked method, so the page goes to the picker; `429` `throttled` with `wait_seconds` beyond the per-target limit                                                                                                                                                                                                                                       |
| second factor, verify | `POST /authenticator`, form-encoded `code`, `tfaMethod`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `{ "next": "…" }` from the saved request or `/`                                                                              | `403` `authentication`, `code` one of `invalid`, `expired`, the session being live; `409` `method-locked`, `code: locked` when the method's lockout closed it; `429` `throttled` with `wait_seconds` while the gate is armed                                                                                                                                                                          |
| second factor, resend | `POST /resend-tfa`, no body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `{ "sent": true }`                                                                                                           | `409` `code: not_set_up`, `503` `code: send_failed` with `Retry-After` (a `502` names a gateway fault, RFC 9110 §15.6.3, and the sender is not one), `429` `throttled` with `wait_seconds`                                                                                                                                                                                                            |
| second factor, pick   | `POST /authenticator-method`, form-encoded `tfaMethod`, `authenticatorId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the `GET /api/auth/tfa` shape; the page navigates to `/authenticator?method=<method>`                                        | `409` `code` one of `not_set_up`, `locked`; `503` `send_failed`                                                                                                                                                                                                                                                                                                                                       |
| cancel                | `POST /auth-cancel`, no body, the CSRF header; the Cancel link posts it and follows `next`, because the cancel clears the parked request and a GET must not; from the consent page's "Not you? Sign out" the same one request also ends the session, the server answering `next` as the client's `redirect_uri` with `error=access_denied` (RFC 6749 §4.1.2.1)                                                                                                                                                                                                              | `{ "next": "<the client's cancel URL, its redirect_uri with error=access_denied, or />" }`                                   | none                                                                                                                                                                                                                                                                                                                                                                                                  |
| recovery request      | `POST /passwordRecovery`, JSON `{ "email" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `202 { "sent": true }` always                                                                                                | `422` with `errors[]` on `/email`, a rule failure being never a `400`; `429` `throttled` with `wait_seconds`                                                                                                                                                                                                                                                                                          |
| reset                 | `POST /passwordReset`, JSON `{ "email", "token", "password" }`; the server binds the token to the address it issued it for and ignores a posted `email` that differs, so the token is the only thing that proves the request                                                                                                                                                                                                                                                                                                                                                | `{ "next": "/login?reset=complete" }`                                                                                        | `422` with `errors[]` on `/password` (`minLength`, `maxLength`, `blocklist`); `403` `code: reset_invalid` when the token is unknown or expired                                                                                                                                                                                                                                                        |

`code` is the vocabulary the page translates from (`auth:errors.<code>`);
a `code` the page does not know paints `auth:errors.authenticationFailed`.

### What the sign-in pages draw

**LoginPage** grows from the page every `backend` UI backend draws (the
session contract's sign-in page) by the states the issuer has:

- **Mode.** Two modes, `magic_link` and `password`; `?login=` wins for
  one visit and is never stored, then the stored `login_method`, then
  `login_mode` from the methods answer, then the first enabled method, and
  `?error=magic_link_*` forces the magic-link mode for that visit so an
  expired-link message never sits above a password form. The email field
  is shared by both modes and carries a visible label, as every field
  does, because a placeholder vanishes on the first keystroke and the
  validation contract's messages speak in the label's words; switching to
  password reveals the password field with its own label and "Forgot
  password?"; "Keep me logged in" is drawn in both modes and rides
  `POST /login/magic/request` as `remember` too, because a person who
  signs in by mail expects to stay signed in as much as one who types a
  password; the primary button reads "Continue with email" or "Sign in"
  by mode; the toggle line under the buttons flips modes, stores the
  choice and moves focus to the first empty field. The page draws its
  heading and a skeleton of the field at once and holds only the button
  block on the `AuthShell` spinner until `GET /api/auth/methods` has
  answered, fetched once per mount, so the divider and the provider
  buttons never arrive after the form and push its foot down, and the
  first frame is never blank.
- **Passkey.** While `passkey` is enabled and the browser supports
  WebAuthn, a secondary "Sign in with a passkey" button; while
  `conditional_ui` is on, the email field carries
  `autocomplete="username webauthn"` and the conditional prompt starts on
  mount under one `AbortController` per mount, aborted on unmount, by a
  click on the button and before any modal `get()`, an assertion arriving
  after the abort being discarded, because a pending conditional request
  outlives the route and a second `get()` throws until the first is
  aborted. The passkey calls live in
  `src/lib/passkeys.js`, the current `passkeys.js` as a module, because
  the profile page registers passkeys with the same code.
- **Providers.** One `ProviderButtons` button per `oidc-` method, after
  an "or" divider when a form is shown; a click sets `window.location` to
  `/oauth2/authorization/<id>` through `session.begin`.
- **Sent state.** After a `202` the page navigates to `/login?sent`, the
  address kept in router state and never in the URL, and draws the inbox
  icon, "Check your inbox", the address, "The link is valid for
  {{magic_link_ttl_minutes}} minutes", the hedged wording when
  `local_registration_enabled` is false, a secondary "Resend link" under
  a `Countdown` fed by the server's `429` `wait_seconds` and never by the
  page's own clock, and "Use a different email"; the primary action of a
  sent page is nothing, because a primary Resend invites double sends. A
  reload of `/login?sent` with no address in state draws the form.
- **Messages.** `?error=<code>` draws a danger `AuthAlert` from
  `auth:errors.<code>`; `?logout` a success alert; `?stepup` and
  `?reset=complete` an info alert; `?message=` is not read (the server
  stops sending prose). `?logout` and `?reset=complete` draw only while no
  session exists, and a person with a live session who lands on `/login`,
  `/registration`, `/passwordRecovery` or `/passwordReset` is sent to `/`
  or the consumed `intended_url`, because a crafted `/login?logout` above
  a form is a phishing frame for someone still signed in. The
  session-ended banner is the chrome's, raised on the bus; the page draws
  none of its own.
- **Foot.** "New to {{app}}? Create an account" while
  `local_registration_enabled`; the policy links; "Cancel" only while the
  methods answer says `cancel: true`, posting `/auth-cancel` and following
  its `next`, because on a plain visit there is nothing to cancel and the
  link would loop back to the form.
- **The session-ended banner.** On the sign-in pages, where the cluster's
  Sign in is hidden, the chrome's session-ended banner carries a Sign in
  action of its own, because the banner says "Sign in again" and the
  person must have something to press.
- **Chrome.** The issuer's auth top bar today is the site logo, "Need
  help?" (`sites.<id>.assets.help_url`), "Email support"
  (`sites.<id>.mail.support_email`) and the flag; on the shared chrome the
  same four are the brand mark, `links.docs` carrying `help_url`,
  `links.contact` carrying `mailto:<support_email>`, and the flag, with the
  theme button beside it, which the auth pages never had (the site's pack
  is not a user choice; the variant is).
- **After `next`.** The page navigates in-router when `next` is a path
  whose first segment is a page of this contract or of the pages contract,
  and sets `window.location` otherwise (a saved `/oauth2/authorize`, an
  absolute URL). A path is accepted only when it matches `^/(?![/\\])`,
  because `/\evil.com` passes a "starts with one slash" test and a browser
  resolves it as `//evil.com`; an absolute `next` is followed only when its
  origin is the serving origin, the four exceptions being the front-channel
  page's `continuation`, the logout-cancel `next`, the provider
  authorization URL the integrations link route answers, and the `next` of
  a cancel or deny answer (`POST /auth-cancel`, the consent deny), each of
  which the server validated before answering: the first two and the
  fourth against the parked request's client, its registered redirect
  URIs and its login-cancel-redirect-uris in the server's configuration,
  the third against the provider's configured authorization endpoint.

**TfaCodePage** at `/authenticator`: the subhead names the method and
target ("We sent a code to {{target}}", "Enter the code from the
authenticator app you named {{label}}", "Enter one of your single-use
backup codes", "Use your passkey to finish signing in"); one `CodeInput`
for SMS and APP, a `role="group"` of six boxes labeled "Digit n of 6",
numeric, the first box carrying `autocomplete="one-time-code"` so a
phone's autofill lands, Backspace moving back, a six-digit paste filling
every box and submitting, typed entry submitting only through Sign in and
never while `wait_seconds` is non-zero, because a slip on the sixth box
must not count as a miss and arm the gate; a text field for a backup
code, the passkey button for PASSKEY; "Resend" under SMS, throttled by
the answer's `resend_after_seconds`, which is the sending limit, and not
by `wait_seconds`, which is the guessing gate; the danger alert from
`code`; while `wait_seconds` is non-zero the submit is disabled and a
`role="timer"` span beside the alert counts down "Try again in {{n}}s",
the alert itself announced once and the count never re-announced, and at
zero the alert becomes an info "You can try again now."; the foot links
"Choose a different method" and "Cancel", the latter posting
`/auth-cancel` like the sign-in page's. Every code entry on the issuer,
the SMS, app and backup codes here, the email and phone codes of
onboarding and the profile, counts under the one second-factor gate: a
free budget of misses, then an exponential wait answered as `429` with
`wait_seconds`, never a fixed lock after a handful of misses, because a
delayed SMS, a lagging authenticator clock or a stack of old codes are
ordinary and a person must always be able to get back in.

**TfaMethodPage** at `/authenticator-method`: an `OptionList` of radio
cards, each a native radio inside its label so arrow keys move and Space
selects, the enabled ones first, one per SMS authenticator (label, masked
number, the risk notice while `sms_risk_notice`), one per APP
authenticator, Passkey while `passkey`, Backup code while `backup_codes`
("You have no backup codes; use another method." otherwise, since the
profile is out of reach until this step is done), a locked method last
and disabled with "This method is disabled after too many failed
attempts; use another and re-enroll it from your profile."; the preferred
method checked, or the first enabled one when the preferred is locked, so
Continue always has a choice; "Continue"; the foot "Cancel" posting
`/auth-cancel`, the one meaning Cancel has on every sign-in page.

**PasswordRecoveryPage**: the email field with its label and "Continue";
the sent state at `?success`, the address in router state, draws the
inbox icon, "Check your inbox", "The link is valid for
{{reset_link_ttl_minutes}} minutes", a secondary "Resend" under a
`Countdown` from the server's `429`, and "Back to sign in"; the form
draws "Remembered it? Sign in".

**PasswordResetPage**: "Choose a new password", `PasswordField` with the
reveal (an eye and an eye-off glyph, not one glyph with a changing
label) and the passphrase generator, the hint from the `password` form
of `/api/rules` (the minimum the issuer publishes, 15 by default),
validated on blur and submit through `useFormRules`, the `422` painted
inline. `reset_invalid` replaces the form with the danger alert and one
button, "Request a new link", to `/passwordRecovery`, because a form
that can be resubmitted under an expired token misleads. The page reads
`email` and `token` from the URL once and replaces the location with
`/passwordReset` before drawing, so the token is not left in history,
screenshots or any script that reads `location.href`.

Every page draws inside `AuthShell` (title, subtitle, icon, children) with
`AuthAlert`, `AuthSpinner`, `InboxIcon`, `Field`, `FieldError`,
`FormErrorSummary` and `ProviderButtons`; the pages set `document.title`;
validation follows the validation contract on every field.

### Shared components sign-in adds

| Component              | Where                                  | Why shared                                                                                                                            |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `CodeInput`            | `src/components/common/CodeInput.jsx`  | a one-time code entry any UI backend with a second factor or an email verification code draws; the `[data-otp]` behavior of `auth.js` |
| `OptionList`, `Option` | `src/components/common/OptionList.jsx` | radio cards; the 2FA picker and the logout-confirm chooser of a later group                                                           |
| `Countdown`            | `src/components/common/Countdown.jsx`  | a seconds countdown that re-enables a control; the throttled code entry, the resend timer                                             |
| `src/lib/passkeys.js`  | the shared layer                       | the WebAuthn calls, used by sign-in and by the profile page's passkey registration                                                    |

### Sign-in keys

`auth.json`: `login.*` gains `continueWithEmail`, `useEmailLink`,
`usePasskey`, `passkeyFailed`, `forgotPassword`, `cancel`, `sent.title`,
`sent.body`, `sent.bodyHedged`, `sent.expires`, `sent.resend`,
`sent.resendIn`, `sent.differentEmail`, `sent.resent`, `sent.validFor`,
`loggedOut`,
`stepUp`, `resetComplete`, `email`, `password`, `keepSignedIn`,
`magic.title`, `magic.invalid`, `magic.requestAnother`; `tfa.*`
(`title`, `subhead.sms`, `subhead.app`,
`subhead.backup`, `subhead.passkey`, `code`, `backupCode`, `resend`,
`resendIn`, `resent`, `locked`, `waitCountdown`, `waitReady`,
`changeMethod`,
`choose.title`, `choose.subhead`, `method.sms`, `method.smsHelp`,
`method.smsRisk`, `method.app`, `method.passkey`, `method.passkeyHelp`,
`method.backup`, `method.backupHelp`, `method.backupNone`,
`method.locked`, `continue`); `recovery.*` (`title`, `subhead`,
`sent.title`, `sent.body`, `sent.ttl`, `sent.resend`, `sent.resendIn`,
`remembered`, `signIn`, `returnToSite`); `reset.*` (`title`, `subhead`,
`newPassword`, `continue`, `invalid`); `errors.*` gains one key per `code`
above.
`shared.json` gains the shared pieces' own words: `codeInput.digit`,
`copyButton.*` (`copy`, `copied`), `passwordField.*` (`show`, `hide`,
`generate`, `generated`), `stepDots.label`, `pager.*` (`previous`,
`next`, `page`, `showing`) and `sortable.*` (`handle`, `position`). Every
key mirrored in `es` and `cimode`.

### What this design changed for sign-in

| Where                  | Before                                                                                                                                                                | After                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the page               | Thymeleaf `login.html`, `authenticator.html`, `tfaMethods.html`, `passwordRecovery.html`, `passwordReset.html` under `auth/layout.html` with `auth.css` and `auth.js` | pages of `src/features/auth/` and `src/features/tfa/` in the shared build, `AuthShell` inside the chrome                                                                                                               |
| the answer to a POST   | a redirect with the reason in the query or a session attribute                                                                                                        | `{ next }` or a problem body with `code` when the request names `application/json` in `Accept`; a form post without it gets a `303` to the page with `?error=<code>`, and every dual-answer route sends `Vary: Accept` |
| the sign-in mode       | the `login_method_pref` cookie read by the server                                                                                                                     | `login_method` in local storage read by the page; `login_mode` in the methods answer seeds it                                                                                                                          |
| the second-factor send | a side effect of `GET /authenticator-send`                                                                                                                            | `POST /api/auth/tfa/send`, called once by the page                                                                                                                                                                     |
| the rate-limit wait    | `?wait=` in the query                                                                                                                                                 | `wait_seconds` in the problem body, `429`                                                                                                                                                                              |
| prose from the server  | `?message=` and `SPRING_SECURITY_LAST_EXCEPTION.message` shown as is                                                                                                  | `code` translated by the page; the server's text is for logs                                                                                                                                                           |
| the theme              | `data-theme` composing site and variant in `auth.css`                                                                                                                 | `data-bs-theme` and `data-brand` per the branding contract; the auth column's tokens map onto the pack variables                                                                                                       |
| the passkey answer     | `redirectUrl`                                                                                                                                                         | `next`, one word for every step                                                                                                                                                                                        |
| the password hint      | "Minimum 8 characters" in the template                                                                                                                                | the minimum from `/api/rules`, 15 (NIST SP 800-63B rev 4 §3.1.1.2), one number on both sides                                                                                                                           |

---

## Group 2: registration, onboarding and terms

### The flow

A new account passes through one ordered chain, the same for a local
signup, a magic-link lead and a federated first sign-in: `name` → `phone`
→ `password` → `email` → `tfa` → `org`, each step present only when the
site requires it and the account lacks it (`OnboardingSessionGuard`,
`SiteService.is*Required`). The chain is entered from the verification
link (`GET /registration/verify`), the magic-link consume, the federated
callback (`/provider-registration/continue`), a password sign-in of an
account still owing a password (`TFAHandler`), or an `/oauth2/authorize`
from a client that requires an organization. It ends by resuming the
saved `/oauth2/authorize`, the pending authorize URL through third-party
initiated login, an `/org/invite/` link, or `/`.

Today two gates redirect a pending user: the MVC interceptor on every page
GET and the authorize filter on `/oauth2/authorize`. With the SPA owning
every page GET the interceptor has nothing to intercept; the gate moves to
the principal and the JSON: the pending account is signed in as a
placeholder principal that carries `ROLE_ONBOARDING` and nothing else,
never `ROLE_USER` or `ROLE_2FA_REQUIRED`, so no route that needs a
finished account admits it, and every authenticated route it reaches,
browser path or JSON alike, answers `403` `application/problem+json` with
`code: onboarding_required` and `next`, the shell navigating there. The
routes that admit it are exactly `GET /api/auth/onboarding`, the
`POST /complete-onboarding/*` steps, `POST /qrcode/verify`,
`POST /api/auth/tfa/backup-codes`,
`POST /complete-onboarding/backup-codes/confirm` and `POST /user/logout`;
the routes open to everyone stay open to it: `/api/status`,
`/api/rules`, `/api/health`, `/api/auth/methods`, `/api/policies/*`,
`/api/public/*`. The list is written here because a gate scoped to a
prefix left the passkey and second-factor posts outside it, and a
verification link alone must never mint an account that can act. The
authorize filter stays as it is; the protocol path is not a page.

### Registration and onboarding routes

| Route                                                | Page                                                                                                                                                                            | Gate                       | Server routes behind it                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/registration`                                      | RegisterPage in its issuer form: the email-only form, or the sent state when the URL carries `success`, the address in router state                                             | `cookie`, `local-accounts` | `POST /registration`, `POST /registration/resend`                                                                                   |
| `/registration/verify`                               | VerifyLinkPage: reads the mail's `email` and `token` once, replaces the location, posts them and follows `next`; the invalid state with "Send a new link"                       | `cookie`, `local-accounts` | `POST /registration/verify`                                                                                                         |
| `/complete-onboarding`                               | OnboardingHub: reads the state and draws the step it names, the password step being its own                                                                                     | `cookie`, `onboarding`     | `GET /api/auth/onboarding`, `POST /complete-onboarding/password`                                                                    |
| `/complete-onboarding/name`                          | NameStep                                                                                                                                                                        | the same                   | `POST /complete-onboarding/name`                                                                                                    |
| `/complete-onboarding/phone-setup`                   | PhoneStep: the number, then the code                                                                                                                                            | the same                   | `POST /complete-onboarding/send-phone-code`, `POST /complete-onboarding/phone-setup`                                                |
| `/complete-onboarding/email-verification`            | EmailCodeStep                                                                                                                                                                   | the same                   | `POST /complete-onboarding/email-verification`, `POST /complete-onboarding/email-verification/resend`                               |
| `/complete-onboarding/choose-2fa-method`             | TfaEnrollChoiceStep                                                                                                                                                             | the same, `tfa`            | `POST /complete-onboarding/choose-2fa-method`                                                                                       |
| `/qrcode`                                            | TotpEnrollPage: the QR, the setup key, the code, the onboarding chain's only; the profile enrolls an app inline on its Security tab so a signed-in person never leaves the tabs | `cookie`, `tfa`            | `GET /api/auth/tfa/enroll`, `POST /qrcode/verify`                                                                                   |
| `/complete-onboarding/backup-codes`                  | BackupCodesPage: the list, copy, download, the confirm                                                                                                                          | the same                   | `POST /api/auth/tfa/backup-codes`, `POST /complete-onboarding/backup-codes/confirm`                                                 |
| `/complete-onboarding/account-type`                  | AccountTypeStep: the two tiles                                                                                                                                                  | the same, `org-console`    | `POST /complete-onboarding/account-type`                                                                                            |
| `/complete-onboarding/team-name`                     | TeamNameStep                                                                                                                                                                    | the same                   | `POST /complete-onboarding/team-name`                                                                                               |
| `/oauth2/accept-terms`, `/provider-registration/tos` | TermsPage: one document, classic or collecting                                                                                                                                  | `cookie`, `policies`       | `GET /api/auth/terms`, `POST /oauth2/accept-terms`, `POST /provider-registration/tos/accept`, `GET /provider-registration/continue` |
| `/public/policies/:name`                             | PolicyPage: the article                                                                                                                                                         | `policies`                 | `GET /api/policies/{name}`                                                                                                          |

`registration`, `complete-onboarding`, `qrcode`, `provider-registration`,
`public` and `oauth2` join the reserved first segments. `/oauth/terms` and
`/oauth/privacy`, two static Bootstrap pages with 2025 legal text and a
support address, are retired in favour of the site's `terms` and
`privacy` templates at `/public/policies/<name>` (decision 8). The legacy
`completeRegistration.html` (password plus phone on one page, rendered
today only as the error re-render of `POST /registration/verify`),
`/complete-registration` (`CompleteRegistrationController`, the
logged-in "set a password" form with a token path never finished) and
`/registration/sendmobilecode` are retired with the templates: the first
is the chain, the second is the profile page's password section, the
third the phone step's own send route (decision 9).

### What the UI backend answers for onboarding

`GET /api/auth/onboarding`, the session that holds a pending onboarding
(the placeholder principal before the password step, the real one after):

```json
{
  "next": "/complete-onboarding/phone-setup",
  "steps": ["name", "phone", "password", "tfa", "org"],
  "done": ["name"],
  "account": { "email": "mark@m4kr.net", "first_name": "Mark", "mobile_number": "" },
  "phone": {
    "purpose": "verify",
    "resend_after_seconds": 30,
    "policies": [
      { "name": "privacy", "label": "Privacy Policy", "url": "/public/policies/privacy" }
    ]
  },
  "tfa": { "sms_risk_notice": true, "verified_phone": null },
  "org": { "required_by_client": null }
}
```

| Member                   | Meaning                                                                                                                                                                             | Source today                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `next`                   | the step page to draw, or the resume URL once every step is done                                                                                                                    | `OnboardingSessionGuard.nextRequiredStep`, `finishOnboarding` |
| `steps`, `done`          | every step this account owes, in chain order, and the ones cleared; the page draws the step dots from them                                                                          | the `PENDING_ONBOARDING_REQUIRE_*` flags                      |
| `phone.purpose`          | `verify` on a local signup (a real-person check, no 2FA enrollment, no "choose another method" link) or `tfa` on a federated one (SMS 2FA enrolled on success, backup codes follow) | `isLocalSignup`                                               |
| `tfa.verified_phone`     | the masked number when SMS 2FA can enroll without retyping                                                                                                                          | `verifiedContactPhone`                                        |
| `org.required_by_client` | the client's name when an `/oauth2/authorize` parked the user here; the personal tile is then hidden                                                                                | `ORG_REQUIRED_BY_CLIENT_NAME`                                 |

`GET /api/auth/tfa/enroll`: `{ "qr": "data:image/png;base64,…", "secret": "JBSW…", "issuer": "STARTcloud" }`,
the secret held in the session until verified.

`POST /api/auth/tfa/backup-codes`, the CSRF header and no body:
`{ "codes": ["A1B2C3D4", …] }`, held in the session and answered again
on every call until `POST /complete-onboarding/backup-codes/confirm`
clears it, so a reload of the page shows the same codes rather than an
empty page with a disabled Continue; a POST because a one-time secret on
a GET is consumed by a prefetch, a link preview or the back-forward
cache before the person has saved it.

`GET /api/auth/terms`, the session that holds a pending acceptance:

```json
{
  "name": "conductor-msa",
  "label": "Master Services Agreement",
  "version": "2.1",
  "step": 1,
  "total": 2,
  "client_name": "Conductor",
  "collecting": true,
  "content_html": "<p>…</p>",
  "content_middle_html": "<p>I, <span class=\"tos-blank\" data-tos-field=\"full_name\">________</span>, …</p>",
  "content_bottom_html": "<p>By clicking …</p>",
  "fields": [
    {
      "param": "first_name",
      "label": "First name",
      "autocomplete": "given-name",
      "group": "identity",
      "control": "text",
      "span": "half",
      "required": true
    },
    {
      "param": "country",
      "label": "Country",
      "autocomplete": "country-name",
      "group": "address",
      "control": "country",
      "span": "half",
      "required": true
    }
  ],
  "identity_group_title": "Phone verification"
}
```

`collecting` is true while the document references a profile field the
account lacks; `fields` lists those, in render order, each carrying
`value`, the stored value the page prefills or absent for an empty
field; a `tos-blank` span is filled from the field of the same `param`
as the person types, and `full_name` from `first_name` and `last_name`
joined, since no field carries it; the three HTML
members are the document split on its horizontal rules exactly as
`ToSAcceptanceController` splits it today, with the live-fill blanks as
`tos-blank` spans. In classic mode `fields` is empty and `content_html`
is the whole document.

`GET /api/policies/{name}`, public: `{ "name", "label", "version", "created_at", "updated_at", "content_html" }`;
`404` `not-found` when the template is not public.

### What the onboarding pages send and what comes back

Every action sends `Accept: application/json` and the CSRF header; a
`200` carries `next` (the next step, `/complete-onboarding` for the hub
to decide, or the resume URL); a failure is the problem body with `code`.

| Action                 | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Failure `code`                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| register               | `POST /registration`, JSON `{ "email" }`, answering `202 { "sent": true }` whether or not the address has an account, the taken case getting a "you already have an account" mail instead, because a `409` here would undo the hedge the magic link and recovery keep and let one POST per address list every customer of a site; `email` is the member's one name on every route of the issuer, so the `register` and `recovery` forms of `/api/rules` describe it | `429` `throttled` with `wait_seconds`; `503` `send_failed` with `Retry-After`; `403` `registration_disabled`                                                                    |
| resend the link        | `POST /registration/resend`, JSON `{ "email" }`                                                                                                                                                                                                                                                                                                                                                                                                                     | `429` `throttled` with `wait_seconds`                                                                                                                                           |
| verify the link        | the page at `/registration/verify` posts `POST /registration/verify`, JSON `{ "email", "token" }`; the GET is the SPA and consumes nothing                                                                                                                                                                                                                                                                                                                          | `403` `link_invalid`, drawn on the page with "Send a new link"                                                                                                                  |
| name                   | `POST /complete-onboarding/name`, JSON `{ "given_name", "family_name" }`                                                                                                                                                                                                                                                                                                                                                                                            | `422` `required` on `/given_name`                                                                                                                                               |
| send the phone code    | `POST /complete-onboarding/send-phone-code`, JSON `{ "mobile_number" }` (E.164)                                                                                                                                                                                                                                                                                                                                                                                     | `422` on `/mobile_number`; `503` `send_failed`; `429` `throttled` with `wait_seconds`                                                                                           |
| resend the email code  | `POST /complete-onboarding/email-verification/resend`, no body, answering `200 { "resend_after_seconds" }` for the Resend countdown, so a person whose code never arrived has a way forward                                                                                                                                                                                                                                                                         | `429` `throttled` with `wait_seconds`                                                                                                                                           |
| verify the phone       | `POST /complete-onboarding/phone-setup`, JSON `{ "mobile_number", "code" }`                                                                                                                                                                                                                                                                                                                                                                                         | `403` `invalid_code`, `expired`; a miss counts under the second-factor gate and `429` with `wait_seconds` follows its ladder                                                    |
| password               | `POST /complete-onboarding/password`, JSON `{ "password" }`; the confirmation is the page's `equals` rule and never travels                                                                                                                                                                                                                                                                                                                                         | `422` on `/password` with `minLength`, `maxLength`, `blocklist`                                                                                                                 |
| email code             | `POST /complete-onboarding/email-verification`, JSON `{ "code" }`                                                                                                                                                                                                                                                                                                                                                                                                   | `403` `invalid_code`, `expired`; a miss counts under the second-factor gate and `429` with `wait_seconds` follows its ladder, the same ladder as every other code on the issuer |
| choose a factor        | `POST /complete-onboarding/choose-2fa-method`, JSON `{ "method": "APP" \| "SMS" }`                                                                                                                                                                                                                                                                                                                                                                                  | none; `next` is `/qrcode`, `/complete-onboarding/phone-setup` or `/complete-onboarding/backup-codes`                                                                            |
| verify the app         | `POST /qrcode/verify`, JSON `{ "code" }`                                                                                                                                                                                                                                                                                                                                                                                                                            | `403` `invalid_code`; a miss counts under the second-factor gate                                                                                                                |
| confirm the codes      | `POST /complete-onboarding/backup-codes/confirm`, no body                                                                                                                                                                                                                                                                                                                                                                                                           | none                                                                                                                                                                            |
| account type           | `POST /complete-onboarding/account-type`, JSON `{ "account_type": "personal" \| "team" }`                                                                                                                                                                                                                                                                                                                                                                           | `409` `organization_required`                                                                                                                                                   |
| team name              | `POST /complete-onboarding/team-name`, JSON `{ "team_name" }`                                                                                                                                                                                                                                                                                                                                                                                                       | `422` `required` on `/team_name`                                                                                                                                                |
| accept terms           | `POST /oauth2/accept-terms` or `POST /provider-registration/tos/accept`, JSON `{ "tos_name", "fields": { "first_name": "…" } }`                                                                                                                                                                                                                                                                                                                                     | `422` `required` on `/fields/<param>` for a still-blank required field; `403` `tos_session_expired`                                                                             |
| any step, session gone | any of the above                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `401` `session_expired`; the page sends the visitor to `/login?error=session_expired`                                                                                           |

`session_expired` today is a redirect to `/login?error=session_expired`
from every step; it becomes the one `401` code.

### What the onboarding pages draw

- **RegisterPage** on the issuer draws the email field alone with its
  label (no username, name or password: those come in the chain), the
  providers under the divider, "Already have an account? Sign in", and
  after the `202` the sent state at `/registration?success`, the address
  in router state, with a secondary "Resend email" under a `Countdown`
  from the server's `429` and "Back to sign in", never "Return to site",
  which would land an anonymous person on `/` and bounce them to
  `/login`; `?resend` draws the re-sent notice.
- **OnboardingHub** at `/complete-onboarding` reads the state and
  navigates to `next` unless `next` is itself: then it draws the password
  step: "Welcome, {{first_name}}." or "Welcome." when the account has no
  first name yet, `PasswordField` with its reveal, the hint from
  `/api/rules`, "Generate a passphrase for me" (four EFF words joined by
  dashes from `crypto.getRandomValues`, revealed and filled into both
  fields), the confirmation field with the `equals` rule, a hidden
  `autocomplete="username"` field carrying the address so a password
  manager pairs the new password with the account, and one button,
  "Continue", because the dots say how far the chain goes and a button
  that says "Complete setup" before the email or organization step lies.
  Every step page draws the step dots from `steps` and `done`, each dot
  labeled "Step n of m" with a hidden step name so a screen reader hears
  the progress, moves focus to its heading when it appears, and a
  `session_expired` answer sends the visitor to sign in.
- **NameStep**: First name and Last name, the last-name hint,
  Unicode letters, periods, hyphens, apostrophes and spaces
  (`$defs.personName`, the `name` form of `/api/rules`, `given_name`
  required and `family_name` optional), the autofill tokens
  `given-name` and `family-name`.
- **PhoneStep**: `PhoneInput` (country picker plus national number to
  E.164, `autocomplete="tel"`), the consent line above the button and
  worded by `phone.purpose` (a `verify` step agrees to a verification
  code alone, a `tfa` step to sign-in codes too), "Send verification
  code"; after the `202` the `CodeInput` on its own row with the resend
  button full width beneath it under a `Countdown` of
  `resend_after_seconds`, so nothing clips on a narrow screen; editing
  the number keeps the code section and draws "Number changed. Send a
  new code." with Verify disabled until one is sent; the policy links;
  "Choose a different method" only while `phone.purpose` is `tfa`. On a
  site that requires a mobile number to sign up the step says so in one
  line, "{{site}} requires a mobile number that can receive text
  messages.", with the site's support contact from `links.contact`,
  because a person who cannot receive a text has no other step and must
  be told rather than left; a site that wants the least data never shows
  the step, since the requirement is the site's own flag.
- **EmailCodeStep**: "A verification code has been sent to
  {{email}}", `CodeInput`, "Resend" under a `Countdown` from the resend
  route's answer, the gate's countdown in the danger alert.
- **TfaEnrollChoiceStep**: `OptionList` with Authenticator app
  (recommended) and SMS (the verified number line when
  `tfa.verified_phone`, the risk notice when `sms_risk_notice`).
- **TotpEnrollPage** at `/qrcode`: the QR image, "Unable to scan?" with
  the setup key and a copy button, `CodeInput`, "Verify code" (the
  backup codes follow, so the button never claims completion), "Choose
  a different method"; the onboarding chain's page alone, the profile
  enrolling inline.
- **BackupCodesPage**: the warning, the codes in a two-column monospace
  grid, "Copy all codes", "Download as text file", the "I have saved my
  backup codes" check and an enabled "Continue" that, unchecked, refuses
  with the inline error "Tick the box to confirm you saved the codes",
  because a disabled button hides why, the validation contract's rule.
- **AccountTypeStep**: two `ChoiceTile`s rendered as buttons so they
  take focus, Enter and Space, personal and team, the subhead naming the
  client when it required one, "You can turn a personal account into a
  team later."; while `org.required_by_client` hides the personal tile
  the step is skipped and the team name drawn at once, since a choice
  page with one choice is no choice.
- **TeamNameStep**: the team name, "Create team", "Back" to the tiles.
- **TermsPage**: classic mode is the title, "Review and accept these
  terms to continue to {{client}}.", the version and the "Step n of m"
  badge at the top in both modes, the A-/A+ controls as real buttons
  with labels, the document in a pane at least 60vh tall that grows with
  the viewport, "I accept and continue" and "Decline", which posts
  `/auth-cancel` and follows its `next`, because a person who will not
  accept must have a way out other than the browser's Back button;
  collecting mode is the wide column, the document flowing as page copy,
  the identity and address field groups under "Your details" and
  "Address" (`country` a select from the shared country list, `state` a
  datalist of suggestions for the picked country, the address drawn
  without the Places autocomplete because this page sits inside an
  authorization flow, every field the document references drawn prefilled
  and editable so a wrong stored name is corrected here rather than baked
  into the attestation, optional fields marked "(optional)" and no
  asterisks), the fine-print zone with the blanks filling as the user
  types, the acknowledgment row and "I Agree & Continue". When `next` is
  the same route for a second document the page moves focus to the new
  heading and announces the step, so the swap is never silent, and every
  link inside the document opens a new tab with `rel="noopener"` so the
  acceptance is never left mid-way.
- **PolicyPage**: the wide article column, the title, the version badge
  and dates, the prose, "Back" to the referring page when there is one
  and "Back to sign in" otherwise.

### Shared components onboarding adds

| Component              | Where                                       | Why shared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PasswordField`        | `src/components/common/PasswordField.jsx`   | the reveal button and the optional passphrase generator; sign-in, reset, onboarding, the profile's password section, the setup page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PhoneInput`           | `src/components/common/PhoneInput.jsx`      | country picker plus national number to E.164, a wrapper over intl-tel-input's official React component (decision 7), replacing the jQuery wiring of `mobileutils.js`; the country preselect comes from `GET /api/public/geo/country`; the profile's phone section draws it too                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `StepDots`             | `src/components/common/StepDots.jsx`        | the progress dots of any multi-step flow (`.steps` in `auth.css`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ChoiceTile`           | `src/components/common/ChoiceTile.jsx`      | the large icon tiles; account type today, any two-way choice later                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `CopyButton`           | `src/components/common/CopyButton.jsx`      | copy-to-clipboard with the "Copied!" flip; the setup key, the backup codes, checksums on the catalog pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `MarkdownArticle`      | `src/components/common/MarkdownArticle.jsx` | the `prose` typography over server HTML or markdown; policies, terms, the README the item page already draws through `react-markdown`. The server renders a template with raw HTML kept and passes the result through an allowlist sanitizer that keeps every formatting element, link, table and image an author would use and strips script, event handlers and `javascript:` URLs; placeholder values are substituted as escaped text; the component sanitizes every `*_html` member the same way before injecting it and fills a `tos-blank` span with `textContent`, because the document runs on the issuer's origin for every visitor and a stolen admin session or a person's own name inside a placeholder would otherwise be stored script on a public page. Nothing an author can write short of a script survives the pass, so the editor is not dumbed down |
| `src/lib/wordlist.js`  | the shared layer                            | the EFF large wordlist for the passphrase generator; 7,776 words, loaded on demand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/countries.js` | the shared layer                            | the country list with dial codes and the state suggestions of `countryselect.js` and `regionsuggest.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Onboarding keys

`auth.json`: `register.*` gains `emailOnly`, `sent.title`, `sent.body`,
`sent.hint`, `sent.resend`, `sent.resendIn`, `sent.resent`, `sent.return`,
`linkInvalid`,
`sendNewLink`; `onboarding.*` (`welcome`, `welcomePlain`, `subhead`,
`password`, `confirm`,
`generatePassphrase`, `passphraseHint`, `continueTo2fa`, `complete`,
`securityNote`, `name.title`, `name.subhead`, `name.given`,
`name.family`, `name.familyHint`, `phone.title`, `phone.subheadVerify`,
`phone.subheadTfa`, `phone.number`, `phone.found`, `phone.send`,
`phone.code`, `phone.codeHelp`, `phone.verify`, `phone.resend`,
`phone.resendIn`, `phone.consent`, `phone.consentTfa`, `phone.changed`,
`phone.required`, `phone.support`, `phone.chooseOther`, `email.title`,
`email.sent`, `email.resent`, `email.code`, `email.verify`,
`email.notReceived`, `tfa.title`,
`tfa.subhead`, `tfa.app`, `tfa.appHelp`, `tfa.sms`, `tfa.smsHelp`,
`tfa.smsVerified`, `qr.title`, `qr.scan`, `qr.unableToScan`,
`qr.setupKey`, `qr.code`, `qr.verify`, `codes.title`, `codes.important`,
`codes.body`, `codes.copy`, `codes.download`, `codes.noViewAgain`,
`codes.confirm`, `codes.mustConfirm`, `codes.continue`, `account.title`,
`account.subhead`,
`account.requiredBy`, `account.personal`, `account.personalHelp`,
`account.team`, `account.teamHelp`, `team.title`, `team.subhead`,
`team.name`, `team.create`, `team.back`); `terms.*` (`pageTitle`,
`before`, `version`, `step`, `fontSize.smaller`, `fontSize.larger`,
`accept`, `agree`, `decline`, `optional`, `yourDetails`,
`phoneVerification`, `address`, `acknowledge`); `policy.*` (`pageTitle`,
`version`, `updated`, `created`, `return`, `back`); `errors.*` gains
`session_expired`,
`link_invalid`, `invalid_code`, `expired`, `quota`, `send_failed`,
`organization_required`, `tos_session_expired`, `onboarding_required`.

### What this design changed for onboarding

| Where            | Before                                                                                                                                                                                                                  | After                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| the pages        | twelve templates in two looks: eight under `auth/layout` with `auth.css`, four (`completeRegistration`, `emailVerification`, `qrcode`, `backupCodes`) plus the two legal pages under the Bootstrap `layout/public` card | one look, every step in `AuthShell` inside the chrome                                                    |
| the gate         | the MVC interceptor redirecting every page GET, and the authorize filter                                                                                                                                                | `403` `onboarding_required` with `next` on the API, the shell navigating; the authorize filter unchanged |
| the state        | seven session attributes read by each template's controller                                                                                                                                                             | one `GET /api/auth/onboarding` every step reads                                                          |
| the answers      | a redirect with `?error=` per step, prose in `message`                                                                                                                                                                  | `{ next }` or a problem `code`                                                                           |
| phone entry      | jQuery, `intl-tel-input` and `mobileutils.js` on one page                                                                                                                                                               | `PhoneInput` in `components/common`                                                                      |
| the passphrase   | inline script over `eff-large-wordlist.js`                                                                                                                                                                              | `PasswordField` over `src/lib/wordlist.js`                                                               |
| the legal pages  | `/oauth/terms` and `/oauth/privacy`, static 2025 text                                                                                                                                                                   | the site's templates at `/public/policies/<name>`                                                        |
| the confirmation | `confirmPassword` posted and compared on the server                                                                                                                                                                     | the page's `equals` rule; the body carries `password` alone                                              |
| `weak_password`  | a redirect code from the policy service                                                                                                                                                                                 | `422` with `minLength` from `/api/rules`, one number on both sides                                       |

---

## Group 3: OAuth and OIDC interstitials

The pages a protocol flow puts in front of a signed-in person: consent,
device activation, a CIBA approval, the logout confirmation, the
front-channel logout frame, the authorization-code display, the desktop
hand-off and account linking. Two of them end in a redirect to the relying
party that Spring Authorization Server issues from its own endpoint
(`/oauth2/authorize`, `/oauth2/device_verification`): those stay real form
posts, a top-level navigation, because a fetch cannot follow a redirect
to another origin with the browser's cookies. The rest answer JSON.

### Interstitial routes

| Route                          | Page                                                                                                                                    | Gate                      | Server routes behind it                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `/oauth2/consent`              | ConsentPage: the client, the scopes as checked rows, the RAR details, approve and deny                                                  | `cookie`, `interstitials` | `GET /api/auth/consent`, form `POST /oauth2/authorize` or `POST /oauth2/device_verification` |
| `/activate`                    | DeviceActivatePage: the user code                                                                                                       | `interstitials`           | form `POST /oauth2/device_verification`                                                      |
| `/activated`                   | DeviceActivatedPage: "Device connected"                                                                                                 | `interstitials`           | none                                                                                         |
| `/ciba/approve`                | CibaApprovePage: the client, the binding message, the scopes, approve and deny; then the approved, denied or unavailable state in place | `cookie`, `interstitials` | `GET /api/auth/ciba`, `POST /ciba/approve`, `POST /ciba/deny`                                |
| `/connect/logout/confirm`      | LogoutConfirmPage                                                                                                                       | `cookie`, `interstitials` | `GET /api/auth/logout/confirm`, `POST /connect/logout/confirm`                               |
| `/connect/logout/frontchannel` | FrontChannelLogoutPage: the hidden frames, the countdown, "Continue"                                                                    | `interstitials`           | `GET /api/auth/logout/frontchannel`                                                          |
| `/oauth2/code`                 | CodeDisplayPage: the code with a copy button, or the error                                                                              | `interstitials`           | none; `code`, `error`, `error_description` from the URL                                      |
| `/continue`                    | DesktopContinuePage: the `swb://` button and the token to copy                                                                          | `interstitials`           | none; `token`, `email` from the URL                                                          |
| `/link-account-consent`        | LinkAccountPage: the existing account, the provider, the password step-up, link and cancel                                              | `cookie`, `interstitials` | `GET /api/auth/link`, `POST /link-account/confirm`                                           |

`activate`, `activated`, `ciba`, `connect`, `continue`,
`link-account-consent` and `link-account` join the reserved first
segments.

### What the UI backend answers for the interstitials

`GET /api/auth/consent?client_id&scope&state&user_code`, the signed-in
session, the same resolution `OAuthConsentController` makes today:

```json
{
  "client_id": "conductor",
  "client_name": "Conductor",
  "state": "…",
  "user_code": null,
  "action": "/oauth2/authorize",
  "principal": "mark@m4kr.net",
  "consent_text": null,
  "scopes": [
    { "id": "openid", "label": "openid", "description": "Authenticate your identity" },
    {
      "id": "organizations",
      "label": "organizations",
      "description": "See your organization memberships and roles"
    }
  ],
  "authorization_details": [
    {
      "type": "domino_vault",
      "description": "Access an ID Vault",
      "locations": ["https://vault.example"],
      "actions": ["read"],
      "datatypes": null,
      "identifier": null,
      "privileges": null
    }
  ]
}
```

`scopes` lists only the scopes not yet granted, labeled from the
client's `scope.configs` then the OIDC defaults, the standard scopes'
descriptions drawn from `consent.scope.<id>` keys on the page and only a
client's own `scope.configs` text riding as data; `action` is
`/oauth2/device_verification` when `user_code` is present. A pending ToS
for the client is normally diverted by the authorize filter before the
page; when the consent controller still finds one pending (today's
`TOS_PENDING_*` attributes), the call answers
`{ "next": "/oauth2/accept-terms" }` and the page navigates there, so the
template's `tosRequired` branch has one JSON shape and goes with the
template.

`GET /api/auth/ciba` with the token in an `X-Ciba-Token` header, never in
the query, because a query string lands in the access log and in a failed
call's reported URL; the page reads `?token=` from the approval link's
URL once and replaces the location with `/ciba/approve` before the call,
the way the magic-link and reset pages consume theirs, so the token is
never left in history: `{ "client_name", "binding_message", "scopes": […], "authorization_details": […] }`,
or a problem body with `code` one of `not_found`, `expired`,
`wrong_user`, the page drawing the unavailable state from it.

`GET /api/auth/logout/confirm`: `{ "client_name", "logout_text" }` from
the parameters the logout success handler parked in the session; `404`
`not-found` when nothing is parked, and the page goes home.

`GET /api/auth/logout/frontchannel`: `{ "frame_urls": ["https://app.example/logout?iss=…&sid=…"], "continuation": "https://app.example/", "timeout_seconds": 5 }`,
answered from the parked payload as often as the page asks and cleared
by `POST /api/auth/logout/frontchannel/done`, which the page sends once
its frames have loaded or the person pressed Continue; the `index.html`
answer for the route reads the same payload for its `frame-src` without
clearing it, so a reload never loses the frames.

`GET /api/auth/link`: `{ "email", "provider_id", "provider_name", "provider_username", "has_local_auth", "proof": "password" | "code", "account": { "name", "email" } }`;
`401` `code: invalid_linking_session` when nothing is pending. `proof` is
`password` while the account has one and `code` otherwise, the code
mailed to the existing address when the page opens, because linking with
no proof at all lets whoever registers the victim's address at a
provider take the account over; a provider whose `email_verified` is
false never reaches this page at all.

### What the interstitials send and what comes back

| Action                         | Request                                                                                                                                      | Answer                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| approve consent                | a real form `POST` to `action` with `client_id`, `state`, `user_code`, one `scope` per checked row, `authorization_details_decision=approve` | the server's redirect to the relying party, or to `/activated`                                                                                                                                                                                                                                                                                                 |
| deny consent                   | the same form with no `scope` and `authorization_details_decision=deny`                                                                      | the server's redirect with `error=access_denied`                                                                                                                                                                                                                                                                                                               |
| activate a device              | a real form `POST /oauth2/device_verification` with `user_code`                                                                              | the server's redirect to `/oauth2/consent` or `/activated`; a wrong code answers a `303` back to `/activate?error=invalid_user_code`, which the page paints on the field as "That code did not match; enter the code shown on your device.", and a guessing run meets `429` with `Retry-After`, the rate limit RFC 8628 §5.1 asks of the verification endpoint |
| approve or deny a CIBA request | `POST /ciba/approve` or `POST /ciba/deny`, JSON `{ "token" }`                                                                                | `200 { "status": "approved" \| "denied" }`; a problem with `not_found`, `expired`, `wrong_user`                                                                                                                                                                                                                                                                |
| confirm logout                 | `POST /connect/logout/confirm`, JSON `{ "confirm": true }`                                                                                   | `200 { "next": "/connect/logout" }`, the page setting `window.location` to it (the session marker lets the protocol endpoint proceed)                                                                                                                                                                                                                          |
| cancel logout                  | the same with `false`                                                                                                                        | `200 { "next": "<cancel uri or />" }`                                                                                                                                                                                                                                                                                                                          |
| front-channel done             | `POST /api/auth/logout/frontchannel/done`, no body                                                                                           | `204`; the parked payload is cleared                                                                                                                                                                                                                                                                                                                           |
| link                           | `POST /link-account/confirm`, JSON `{ "action": "link", "current_password" }` or `{ "action": "link", "code" }` by `proof`                   | `200 { "next": "/" \| "/authenticator" }`; `403` `bad_password` or `invalid_code`, `429` `too_many_attempts` with `wait_seconds`, `500` `linking_failed`                                                                                                                                                                                                       |
| decline linking                | the same with `"action": "cancel"`                                                                                                           | `200 { "next": "/login?info=account_linking_declined" }`, an info alert, because the person chose to decline and a red error would say they did something wrong                                                                                                                                                                                                |

### What the interstitials draw

- **ConsentPage**: "Authorization Request", "{{client}} is requesting
  access to your account.", the optional `consent_text`, "This
  application will be able to:" with one checked `ScopeRow` per scope
  (label, description), the `openid` row locked checked because an OIDC
  request without it fails at the server, Approve refusing with an inline
  line while no scope is checked; "This application also requests
  specific access:" with one row per authorization detail, its
  `description` as the label and the machine `type` in a tooltip,
  locations, actions, data types, identifier and privileges each only
  when present; Approve, Deny, and "You are logged in as {{principal}}.
  Not you? Sign out", the link making one request, `POST /auth-cancel`,
  and following its `next`; the server ends the session as part of that
  cancel and answers `next` as the client's `redirect_uri` with
  `error=access_denied` (RFC 6749 §4.1.2.1), so the page never calls
  `session.signOut()` first.
- **DeviceActivatePage**: the code field with its label, uppercase,
  `XXXX-XXXX`, prefilled from `?user_code`, the `?error=invalid_user_code`
  alert painted on the field, "Continue"; **DeviceActivatedPage**:
  "Device connected", "You can close this window and return to your
  device."
- **CibaApprovePage**: "Sign-in request", "{{client}} is asking to sign
  you in on another device.", the binding message as "Make sure this
  matches the code on your other device: {{message}}", since it is
  compared and never typed, the scope and detail rows, Approve and Deny;
  after the answer the page draws "Sign-in approved" or "Sign-in denied"
  in place, and the problem `code` draws "Sign-in request unavailable"
  with the reason.
- **LogoutConfirmPage**: "Sign out?", "You are about to sign out of
  {{client}} and of every app that uses this sign-in.", because
  confirming ends the SSO session and not one app's, the client's
  `logout_text` or the default line, "Yes, sign me out" and "Cancel".
- **FrontChannelLogoutPage**, drawn in the signed-out chrome from its
  first frame so nothing flips mid-way: "Signing out", "We are letting
  your connected applications know you signed out.", one hidden `iframe`
  per `frame_urls` entry, each `sandbox="allow-scripts allow-same-origin"`
  with `referrerpolicy="no-referrer"` so a relying party's frame can run
  its own logout script but never navigate the top window; the page
  posts the done route and navigates to `continuation` once every frame
  has fired `load` or `error` or the person pressed "Continue", with a
  "Stay on this page" control and a fallback of at least twenty seconds
  that pauses while the pointer or focus rests on the page, because WCAG
  2.2 SC 2.2.1 forbids a timed redirect the person cannot stop; `timeout_seconds`
  is that fallback, clamped to 20 to 60 (the `noscript` refresh goes; the
  SPA needs script); the frames are the mechanism OpenID Connect
  Front-Channel Logout 1.0 §3 prescribes, one per relying party's
  `frontchannel_logout_uri`, so each app's own cookie is cleared in the
  browser.
- **CodeDisplayPage**: "Authorization Code" with the code in a
  monospace block and `CopyButton`, "You can close this window when you
  are done."; the error state as a danger alert with `error` and
  `error_description`; the missing state.
- **DesktopContinuePage**: "Continue in the Setup Guide", the "Open Setup
  Guide" button to `swb://auth/login?email&token`, the token in a masked
  field with the same `CopyButton` the code page has, the help line; the
  invalid-link warning when either parameter is missing. `swb://` is the
  scheme the SwitchBoard Setup Guide desktop app registers, and `hwa://`
  its hyperweaver counterpart; the issuer emits such links so a token is
  handed straight to the app and never through a browser's address bar,
  and the reverse-domain scheme RFC 8252 §7.1 recommends is a recorded
  deviation, not a change.
- **LinkAccountPage**: "Link Your Account", "An account with email
  {{email}} already exists.", the two sign-in methods after linking, the
  existing account card (name, email, the method badge), the current
  password field while `proof` is `password` and the `CodeInput` for the
  mailed code while it is `code`, "Link {{provider}} Account", "Cancel",
  and the fine print.

### Shared components the interstitials add

| Component               | Where                                  | Why shared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScopeRow`, `ScopeList` | `src/components/common/ScopeList.jsx`  | the consent and CIBA pages; a later profile group's "connected applications" list draws the same rows read-only                                                                                                                                                                                                                                                                                                                                                                           |
| `NativeForm`            | `src/components/common/NativeForm.jsx` | a real form post built from a JSON state; it always emits the `_csrf` field from the `XSRF-TOKEN` cookie and posts only to a same-origin `action` that is `/oauth2/authorize` or `/oauth2/device_verification`, because no cookie-authenticated POST on the issuer is CSRF-exempt and a consent post without the token could be auto-submitted for a victim holding a pending request; consent, device activation, and every later page that must hand the browser to a protocol endpoint |

### Interstitial keys

`auth.json`: `consent.*` (`title`, `subhead`, `willBeAbleTo`,
`specificAccess`, `approve`, `deny`, `signedInAs`, `notYou`, `signOut`,
`noScope`,
`scope.openid`, `scope.profile`, `scope.email`, `scope.organizations`,
`scope.offline_access`, `scope.unknown` and one key per standard scope
the issuer offers, `detail.locations`, `detail.actions`,
`detail.datatypes`, `detail.identifier`, `detail.privileges`); `device.*` (`title`, `subhead`, `code`, `continue`,
`connected`, `close`, `mismatch`); `ciba.*` (`title`, `subhead`,
`match`, `approved`, `denied`, `unavailable`, `reason.not_found`,
`reason.expired`, `reason.wrong_user`); `logout.*` (`title`, `subhead`,
`default`, `confirm`, `cancel`, `signingOut`, `notifying`, `continue`,
`stay`); `code.*` (`title`, `subhead`, `copy`, `close`, `failed`,
`missing`); `desktop.*` (`title`, `subhead`, `open`, `token`, `help`,
`invalid`); `link.*` (`title`, `exists`, `either`, `localMethod`,
`password`, `passwordHint`, `code`, `confirm`, `cancel`, `finePrint`);
`errors.*` gains `bad_password`,
`too_many_attempts`, `linking_failed`, `invalid_linking_session`,
`invalid_user_code`; `info.*` gains `account_linking_declined`. Every key
mirrored in `es` and `cimode`.

### Content Security Policy

The front-channel page today sets `frame-src` per response from the
frame origins. The SPA's `index.html` is served before the page knows
its frames, so the issuer sets `frame-src` on the `index.html` answer
for `/connect/logout/frontchannel` from the parked payload, and on no
other page (decision 11).

The whole policy is written here, because a policy that names one hash
and one `frame-src` and leaves the rest unsaid ships either a broken
page or a policy loosened to `unsafe-inline` on its first deploy. Every
`index.html` answer carries, per site:

```text
default-src 'none';
base-uri 'none';
frame-ancestors 'none';
object-src 'none';
script-src 'self' 'sha256-<pre-paint script>' <analytics origin> https://maps.googleapis.com;
style-src 'self' 'unsafe-inline' <pack origin>;
font-src 'self' <pack origin>;
img-src 'self' data: <tile origin> <analytics origin>;
connect-src 'self' https://maps.googleapis.com <analytics origin>;
worker-src 'self';
frame-src <the parked frame origins on the front-channel route, none elsewhere>
```

`<pack origin>` is the serving origin unless the site's pack is hosted
elsewhere; `<analytics origin>` and `<tile origin>` are the hosts
`integrations.analytics.script_url` and the heatmap's `tiles.url` name,
present only while those are configured; `data:` is for the QR image;
the map and Places entries stay because those features are kept, and
Gravatar needs none because the issuer proxies the avatar. The build publishes the pre-paint script's hash beside the
tarball so the issuer never guesses it. `form-action` is omitted on the
interstitial routes because the consent post ends in a redirect to the
relying party, which some browsers check against it. Inline styles are
banned in the shared UI: every element is styled by class alone, so a
user can theme the app. The issuer's policy carries `'unsafe-inline'`
for styles until the build is clean of them, at which point it leaves.
The served `index.html` carries exactly one inline script, the pre-paint
script whose hash the policy names, and no other.

### What this design changed for the interstitials

| Where                      | Before                                                                                                          | After                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| the pages                  | eight templates, six in the `auth.css` column, `desktopContinue` and `linkAccountConsent` as Bootstrap cards    | one look in `AuthShell`                                                                    |
| consent with a pending ToS | a `tosRequired` branch fetching the consent post and hopping to `/oauth2/accept-terms`; the model never sets it | gone; the authorize filter diverts before the page                                         |
| CIBA outcome               | three templates (`cibaApproved`, `cibaDenied`, `cibaError`)                                                     | one page, the outcome drawn in place from the answer                                       |
| logout confirm and linking | a redirect per outcome with `?error=`                                                                           | `{ next }` or a problem `code`                                                             |
| the front-channel frames   | server HTML with a per-response `frame-src`                                                                     | the page's frames from JSON; `frame-src` set on the `index.html` answer for that one route |

---

## Group 4: the signed-in pages

Profile, organizations, integrations and the notification inbox: the pages
the chrome's user menu links to on every UI backend (`{issuer}/user/profile`,
`{issuer}/user/profile#preferences`, `{issuer}/notifications`). On the
issuer those links become in-router routes and the identity card's glyph
marks a local profile. The pages today are Thymeleaf under the Bootstrap
`layout/layout` with jQuery, driving fifty-odd XHR routes under
`/accountconfig/*`, `/user/*` and `/user/integrations/*` that answer plain
text; every one of those is a program call, so they move under `/api` and
answer JSON or a problem body, the browser paths (`/user/profile`,
`/user/organizations`, `/user/integrations`, `/notifications`,
`/org/invite/{token}`) staying where the estate links them.

### Signed-in routes

| Route                            | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Gate                                                           | Today                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                              | the issuer's home: ProfilePage for a signed-in person, since the issuer lists no collections and a person's pages are the whole site; an anonymous visitor is sent by the SPA to `/login` with `/` under `intended_url`                                                                                                                                                                                                                                                                         | `cookie`                                                       | `UserController.profile`, mapped to `''`, `/`, `index` and `/user/profile`; an anonymous request is sent to `/login` by `SecurityConfig` today, by the page after the cutover                |
| `/user/profile` (and `/profile`) | ProfilePage in its issuer form: the sidebar's Profile row is this page (`/user/profile`) and its four child rows, Security (`/user/profile/security`), Preferences (`/user/profile/preferences`), Favorites (`/user/profile/favorites`) and Sessions (`/user/profile/sessions`), are each a deep link into the one page, no tab strip on the issuer (decision 109); the shared Organizations section is not drawn on the issuer because the sidebar's Organizations row is the same destination | `cookie`                                                       | `user/profile.html`, `UserController`; `/.well-known/change-password` redirects to `/user/profile/security`, the page the W3C well-known URL must lead to, in place of the template's anchor |
| `/user/organizations`            | OrganizationsPage: the memberships under the one view toggle, list or cards, create a team, join by code; a row or card opens the console for that organization                                                                                                                                                                                                                                                                                                                                 | `cookie`, `org-console`                                        | `user/organizations.html`, `OrganizationController`                                                                                                                                          |
| `/org-console`                   | the shared OrgConsolePage over the active organization, grown by the issuer's fields                                                                                                                                                                                                                                                                                                                                                                                                            | `cookie`, `org-console`; `invitations` for its Invitations tab | the per-org sections of `user/organizations.html`                                                                                                                                            |
| `/org/invite/:token`             | InvitePage: reads the mail's token from the path once, replaces the location with `/org/invite`, posts `POST /org/invite`, JSON `{ "token" }`, and follows `next`, `/user/organizations` with the membership made, or `/login` with the page kept under `intended_url` for an anonymous visitor; a `403` `forbidden` with `code` `invite_invalid` draws the invalid state, whose link to ask for a new invitation leads to `/user/organizations`                                                | `cookie`, `invitations`                                        | `OrganizationController.consumeInvite`, the GET that consumed and redirected; it becomes `POST /org/invite`                                                                                  |
| `/user/integrations`             | IntegrationsPage: linked accounts, accepted terms, connected applications                                                                                                                                                                                                                                                                                                                                                                                                                       | `cookie`, `integrations`                                       | `integrations.html`, `IntegrationController`                                                                                                                                                 |
| `/notifications`                 | InboxPage: the full paged inbox with the modal's row controls, mark all, delete all                                                                                                                                                                                                                                                                                                                                                                                                             | `cookie`, `inbox`                                              | `notifications.html`, `NotificationPageController`                                                                                                                                           |

`user`, `org`, `org-console` and `notifications` join the reserved first
segments (`org-console`, `profile` and `organizations` already are).

### What the UI backend answers for the signed-in pages

`GET /api/user`, the session, the profile the cookie provider caches:

```json
{
  "id": 42,
  "uuid": "8f2c…",
  "email": "mark@m4kr.net",
  "email_verified": true,
  "name": "Mark Gilbert",
  "given_name": "Mark",
  "family_name": "Gilbert",
  "middle_name": null,
  "salutation": null,
  "gender": null,
  "website": null,
  "birthdate": null,
  "picture": "/api/user/avatar/8f2c…",
  "mobile_number": { "masked": "+1 *** *** 4242", "verified": true },
  "address": {
    "line1": "",
    "line2": "",
    "city": "",
    "state": "",
    "postal_code": "",
    "country": "",
    "country_code": "",
    "formatted": "",
    "latitude": null,
    "longitude": null
  },
  "has_local_auth": true,
  "requires_password_setup": false,
  "tfa": {
    "enabled": true,
    "preferred_method": "APP",
    "preferred_authenticator_id": 3,
    "locked": []
  },
  "roles": ["ROLE_USER"],
  "organizations": [
    { "uuid": "…", "name": "Acme", "roles": ["OWNER"], "primary": true, "personal": false }
  ],
  "preferences": {
    "language": "en",
    "theme": "dark",
    "timezone": "America/Chicago",
    "ciba_channel": "PUSH",
    "ciba_user_code_set": false
  },
  "favorite_apps": [
    {
      "client_id": "conductor",
      "client_name": "Conductor",
      "icon_url": "…",
      "home_url": "…",
      "custom_label": null,
      "order": 0
    }
  ]
}
```

`picture` is the issuer's own `GET /api/user/avatar/{hash}`, which
fetches the Gravatar image once and caches it for the day the existing
profile cache already uses, because an avatar fetched by every browser
from gravatar.com sends each person's address and referrer to a third
party from the identity provider and offers a membership oracle by
hash; avatars change rarely enough for a day's cache.

The rest of the group's reads, all session, all under `/api/user`:

| Route                                              | Answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Today                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `GET /api/user/tfa/methods`                        | `[{ id, type, label, display, enabled, preferred }]`, passkeys included as `PASSKEY` rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `GET /accountconfig/tfaMethods`                        |
| `GET /api/user/tfa/enroll`                         | `{ qr, secret, issuer }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `GET /accountconfig/edittfaapp` (a Thymeleaf fragment) |
| `GET /api/user/backup-codes/count`                 | `{ remaining }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `GET /accountconfig/backupcodes/count`                 |
| `GET /api/user/passkeys`                           | `[{ id, label, rp_id, created_at, last_used_at }]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `GET /accountconfig/passkeys`                          |
| `GET /api/user/sessions`                           | `[{ id, client_id, client_name, user_agent, ip_address, location, authorized_at, last_accessed_at }]`; `id` is an opaque surrogate, never the session cookie's value, because a value that unlocks the session must not be readable from a page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `GET /accountconfig/sessions`                          |
| `GET /api/user/favorites`                          | `[{ client_id, client_name, icon_url, home_url, custom_label, order }]`, the same list the profile's `favorite_apps` carries in the same `snake_case`, the one source the page and the menu on every UI backend read, Bearer or session; a `backend` UI backend proxies the path on its own origin to the issuer with the user's token, the way it proxies the hub; the claims are not a third copy                                                                                                                                                                                                                                                                                                                                                                            | `GET /user/favorites` plus `GET /api/userinfo/claims`  |
| `GET /api/user/organizations`                      | `{ organizations: [ … ], organizations_enabled, personal_to_team_enabled }`, one entry per membership with the console's fields: `uuid, name, personal, primary, my_role, can_manage, can_rename, is_owner, invite_code, email, website_url, logo_url, description, locale, timezone, telephone, access_mode, default_role, address{…}, members[{ user_id, email, name, role, managed_by }], pending_invites[{ id, email, role }]`; `invite_code` is present only while `can_manage`, because a plain member holding the code could grow the organization at its default role; every `logo_url` and `icon_url` the pages draw, here and in the integrations answer, is rendered only when it parses with the `https:` scheme, with `referrerpolicy="no-referrer"` on the image | the model of `user/organizations.html`                 |
| `GET /api/user/integrations`                       | `{ linked: [{ provider_id, provider_name, provider_username, provider_email, linked_at, last_used_at, icon_url, sites, compat }], available: [{ provider_id, provider_name, icon_url }], accepted_terms: [{ name, label, icon, version, accepted_at, type }], apps: [{ client_id, client_name, icon_url, registered, first_used_at, last_used_at, active_sessions, consent_required, consent_scopes }] }`                                                                                                                                                                                                                                                                                                                                                                      | the four `GET /user/integrations/api/*` routes         |
| `GET /api/user/integrations/providers/{id}/status` | `{ status: "valid" \| "revoked" \| "unknown" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `GET /user/integrations/api/provider-status`           |
| `GET /api/notifications?page&size&unread_only`     | `{ items, page, size, total, total_pages }` of the hub contract's rows in the hub's own camelCase, `readAt` `null` while unread in place of today's `isRead` and `readAt` pair, `createdAt`, the one row shape the shared `NotificationRow` draws on BoxVault, the catalog and the issuer alike and, with the status payload, the second named exception to `snake_case`; and a `navigate` the page follows when it is an `https://` URL or a same-origin path, because the issuer's own producers write `/user/profile` and `/user/integrations` and a path cannot carry a scheme; the fields the shared `NotificationRow` reads on every UI backend                                                                                                                          | unchanged                                              |

### What the signed-in pages send and what comes back

JSON bodies in `snake_case`; `200` with the updated record or `204`;
failures the problem body with `code`. Step-up is a window, not a body
member: `POST /api/user/step-up` with `{ "password": "…" }` or
`{ "code": "…" }` arms the session for five minutes and answers `204`
or `403 code: step_up_failed`; a sensitive call made outside the window
answers `403 code: step_up_required` and the `StepUpDialog` arms it and
retries the same call unchanged. Never `401`, because the API client
ends the session on a `401` and a typo must not sign the person out;
never a body on a DELETE, because RFC 9110 §9.3.5 says a client should
not send one and some intermediaries drop it. Step-up is required on
every call that changes how the account is entered or ended: every
second-factor, passkey and backup-code change, the password, the email,
unlinking a provider, revoking an application, revoking all sessions,
deleting the account, and the admin's restart, signing-key rotation,
user delete and bulk delete, because a hijacked cookie on a shared
machine must not be enough to add a factor the attacker controls. The
step-up code is verified and consumed through the same path as a sign-in
code and counts under the second-factor gate, so a captured code never
replays inside its window and a guessing run meets `429` with
`wait_seconds`; the step-up password counts under the sign-in gate.

| Action                     | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Today                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| step up                    | `POST /api/user/step-up` `{ password }` or `{ code }` (`403` `step_up_failed`, `429` `throttled` with `wait_seconds`); `204` arms the window                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `stepupPassword` and `stepupCode` form fields per route                                                          |
| save the details           | `PATCH /api/user`, any of `given_name, family_name, middle_name, salutation, gender, website, birthdate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `POST /accountconfig/profileDetails`                                                                             |
| save the address           | `PUT /api/user/address`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `POST /accountconfig/updateaddress`                                                                              |
| change the contact phone   | `POST /api/user/phone/send` `{ mobile_number }` (`429` `throttled` with `wait_seconds`), then `POST /api/user/phone/verify` `{ mobile_number, code }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `/accountconfig/sendmobilecode`, `/accountconfig/verifycontactcode`                                              |
| change the email           | `POST /api/user/email/request` `{ new_email }`, stepped up (`409` `unique` when taken), then `POST /api/user/email/verify` `{ code }` (`403` `invalid_code`, `expired`, the miss counted under the second-factor gate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `/user/change-email/request`, `/user/change-email/verify`                                                        |
| change or set the password | `PUT /api/user/password` `{ current_password?, password }`, stepped up (`422` on `/password`, `403` `bad_password`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `POST /user/change-password` with `confirmPassword`                                                              |
| enroll SMS                 | `POST /api/user/tfa/sms/send` `{ mobile_number }` (`429` `throttled` with `wait_seconds`), `POST /api/user/tfa/sms/verify` `{ mobile_number, code, label }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `/accountconfig/sendmobilecode`, `/accountconfig/verifymobilecode`                                               |
| enroll an app              | `GET /api/user/tfa/enroll`, then `POST /api/user/tfa/app/verify` `{ code, label }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `/accountconfig/edittfaapp`, `/accountconfig/verifytfaapp`                                                       |
| prefer a method            | `PUT /api/user/tfa/preferred` `{ authenticator_id }` or `{ method }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `/accountconfig/preferredtfamethod`                                                                              |
| remove a method            | `DELETE /api/user/tfa/methods/{id}`, stepped up (`409` `last_method`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `/accountconfig/removeauthenticator`                                                                             |
| enable or disable 2FA      | `PUT /api/user/tfa` `{ enabled, preferred_method? }`, stepped up (`409` `no_methods`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `/accountconfig/enabletfa`, `/accountconfig/disabletfa`                                                          |
| passkeys                   | `POST /webauthn/register/options`, `POST /webauthn/register` unchanged in shape, stepped up; `PATCH /api/user/passkeys/{id}` `{ label }`; `DELETE /api/user/passkeys/{id}`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `/accountconfig/passkeys/rename`, `/remove`                                                                      |
| backup codes               | `POST /api/user/backup-codes`, stepped up, answers `{ codes }`, once                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `/accountconfig/backupcodes/generate`                                                                            |
| sessions                   | `DELETE /api/user/sessions/{id}`, `DELETE /api/user/sessions`, stepped up; the second answers `{ "next": "/login" }` when it ended the caller's own session too, and the page says so before asking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `/accountconfig/sessions/revoke`, `/revoke-all`                                                                  |
| favorites                  | `PUT /api/user/favorites` with the whole ordered list as `[{ client_id, custom_label, order }]`; the server answers the enriched entries from the client's own registration, so a `home_url` or `icon_url` the page sends is ignored and the favorites keep working as they do today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `POST /user/favorites/save`                                                                                      |
| preferences                | `PATCH /api/user/preferences` with `language`, `theme`, `timezone`, `ciba_channel` and `ciba_user_code`, the last a string that sets the approval PIN and `null` that clears it, never read back, `ciba_user_code_set` being the read's word for it; its `400 { error }` becoming `422` with pointers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | unchanged                                                                                                        |
| delete the account         | `POST /api/user/deletion` `{ email_confirmation }`, stepped up (`422` on `/email_confirmation`, `409` `sole_owner` with `teams: [{ uuid, name }]`, the teams only this account owns); the server invalidates every session of the account before answering `{ next: "/login" }`, and the page drops its cache and navigates there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `POST /user/delete-account`                                                                                      |
| organizations              | `POST /api/user/organizations` `{ name }`; `POST /api/user/organizations/join` `{ invite_code }` (`404` `unknown_code`; `429` with `wait_seconds` after a handful of misses per session and address, because an eight-character code is guessable otherwise); per organization `PATCH …/{uuid}` (name, the profile fields, `access_mode`, `default_role`), `POST …/{uuid}/convert` `{ name }`, `POST …/{uuid}/invite-code` (regenerate), `POST …/{uuid}/invites` `{ email, role }`, `DELETE …/{uuid}/invites/{id}`, `PUT …/{uuid}/members/{user_id}/role` `{ role }` (`409` `last_owner` when it would leave the team without one), `DELETE …/{uuid}/members/{user_id}`, `POST …/{uuid}/leave`, `DELETE …/{uuid}`, `PUT /api/user/primary-organization` `{ uuid }`; a refusal from the service (`Not a member`, `Insufficient organization role`, `Only the owner can invite admins`, managed rows) is `403` with `code` | the fourteen form posts of `OrganizationController`, each a redirect with a flash                                |
| integrations               | `POST /api/user/integrations/providers/{id}/link` with the CSRF header, stepped up, answering `{ next }` to the provider's authorization URL with a `state` bound to the session, which the callback refuses when the session did not issue it, because a link that starts on a GET can be started for a victim by any page; `DELETE /api/user/integrations/providers/{id}`, stepped up (`409` `last_login_method`); `DELETE /api/user/integrations/apps/{client_id}`, stepped up (revoke); `DELETE /api/user/integrations/apps/{client_id}/scopes/{scope}`, refused for `openid` because the application breaks without it                                                                                                                                                                                                                                                                                              | `/user/integrations/link-provider`, `/unlink-provider`, `/revoke-consent`, `/revoke-scope`                       |
| inbox                      | the hub's `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` and `DELETE /api/notifications/{id}` unchanged; `DELETE /api/notifications` deletes every notification of the caller and answers `204`, behind the page's Delete all confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `DELETE /api/notifications/{id}` and `DELETE /api/notifications` both answered by `NotificationController`; done |

### What the signed-in pages draw

- **ProfilePage** keeps its avatar card and its `account` adapter; on the
  issuer it draws no tab strip, the sidebar's Profile row
  (`/user/profile`) and its four child rows (`/user/profile/security`,
  `/user/profile/preferences`, `/user/profile/favorites`,
  `/user/profile/sessions`) being the one navigation, each route drawing
  its section under the page heading (decision 109); the issuer's
  adapter carries more members and the page draws a section only when
  the adapter has its calls, the way the admin page draws System only
  when the adapter carries `storage`:
  - **Profile** at `/user/profile`: First name, Last name, middle name, salutation (the six
    choices plus custom), gender (male, female, custom, unspecified),
    website, birthdate as a `type="date"` input, the email read-only with a
    "Change" link to the Security tab's email section, the masked mobile
    with "Change" opening `PhoneInput` plus `CodeInput`, then the address
    block (`AddressFields`: line 1 with the optional Google Places
    autocomplete while the issuer answers a key, its placeholder drawn
    only then, line 2, country select, state suggestions, city, postal
    code) with Save and "Clear address", never a bare Clear that reads as
    wiping the name. The key is
    answered by a session-gated `GET /api/config/places` and is
    referrer-restricted to the site's hostnames, and the Places script is
    imported lazily by the profile and the organization console alone,
    never by a page of the sign-in, onboarding or interstitial groups,
    because a third-party script has no place on an authentication page
    and the key is public by nature.
  - **Security** at `/user/profile/security`: the password section (current password
    while `has_local_auth`, the "No password set" notice and "Set
    password" wording otherwise, `PasswordField` with the reveal and the
    passphrase generator, the confirmation as `equals`); the email
    section (new address, send code, verify); **Two-factor**: the
    enrolled methods list (`MethodRow`: SMS with the masked number, app
    with its label, the Preferred badge, Set preferred, Remove, the last
    method's Remove disabled with a tooltip rather than failing after the
    click), the locked-method notices with "Re-enroll now", the SMS risk
    notice, Add phone number (number, send, code, label), Add
    authenticator app inline (the QR, the setup key, the code, label),
    and "Enable two-factor" while it is off with the `no_methods` hint or
    "Disable two-factor" while it is on (the disable dialog steps up);
    **Passkeys**, its own section as today and never a row of the
    two-factor list, since a passkey is a first factor too: the list with
    rp id and dates, rename, remove, add with a name; **Recovery**: the
    backup-codes count badge, warning at zero, Generate, the codes once
    with Download shown only while the codes are on screen, and
    Regenerate; **Delete account** with the email confirmation labeled
    "Type {{email}} to confirm" over an empty field, the understanding
    checkbox, the sole-owner refusal naming the teams, and a line naming
    exactly what is destroyed. Every action the server steps up opens the
    `StepUpDialog` (password, or an authenticator or backup code), which
    arms the window and retries the same call.
  - **Preferences** at `/user/profile/preferences`: language and theme as selects that
    write through on change, the same values the chrome's buttons write,
    through the same shared `useTheme` and `i18n` the chrome reads, since
    one build has one theme hook and a page reaches it as the header
    does, never through a router prop, so a change here is a change
    there and nothing is lost by leaving;
    the theme select offers Light, Dark and "Auto (follow device)" and no
    second "not chosen" value; time zone (the `Intl` zone list, the
    detected zone preselected when unset), sign-in approval channel (PUSH,
    EMAIL, SMS while a verified number exists), the approval PIN with a
    status line, "A PIN is set · Clear" or "No PIN · Set", and one Save
    for those three.
  - **Favorites** at `/user/profile/favorites`: the ordered list with drag handles and Remove, then
    "Available applications" from the connected apps not yet favorited with
    Add; icon chain `icon_url` → favicon of `home_url` → the app glyph.
  - **Sessions** at `/user/profile/sessions`: "Active sessions" (client, device from the user agent,
    location and address, authorized time, each row's absolute time in
    its tooltip) with Sign out per row and "Revoke all sessions, this
    browser included" behind a confirm that says the person will be
    signed out here too.
- **OrganizationsPage** at `/user/organizations`: Create an organization
  (name, labeled, while `organizations_enabled`), Join an organization
  (the invite code, labeled), then the memberships under the pages
  contract's one view toggle, list or cards, one row or one card per
  membership (name, Personal, Primary, your role, Make primary, and only
  while `can_manage` the invite code with Regenerate) whose View button,
  Manage for a manager, sets the active organization and opens
  `/org-console`, so a plain member reaches the read-only console too; a `#<uuid>` in the URL
  does the same on load, so BoxVault's "manage at the provider" link
  still lands. On the issuer the switcher's active organization is the
  console's context and nothing else, and the card's Make primary is the
  one place the primary organization changes, so the switcher modal's
  subline on the issuer reads "Console context; the primary organization
  is set on the Organizations page", because a person who expects the
  switcher to change their primary organization would otherwise look for
  the change and not find it.
- **OrgConsolePage** on the issuer draws, beyond the shared record
  (name, email, description, access mode, default role), the profile the
  issuer stores (website, logo URL, locale, time zone, telephone, the
  `AddressFields`, every field labeled), Convert to a team on a personal
  organization, Leave and Delete, the members table with the role select
  for an owner, disabled on the last owner's own row so a team is never
  left without one, and Remove while `can_manage`, a managed row's source
  in place of the controls, Invite (email, role, ADMIN for an owner only)
  and the pending invitations with Revoke, one tab's content on screen at
  a time; Join requests and Discovery stay hidden because the issuer's
  adapter has no `requests` or `discover`. A member without `can_manage`
  sees the record and the members list read-only and nothing else: the
  rename and profile fields need `can_rename`, the invite code, Remove,
  Invite and the pending list need `can_manage`, the role select, the
  default role and Delete need `is_owner`, the same flags the
  organizations template gates on today.
- **IntegrationsPage**: Linked external accounts (provider icon, name,
  "Linked as", last used, the live status badge for GitHub, Unlink behind
  a confirm; the available providers with Link Account, which posts the
  link route and follows its `next`), the 2FA and set-a-password notices,
  Accepted terms and policies (icon, label, type badge, version, accepted,
  View to `/public/policies/<name>`), Connected applications (icon, name,
  active-session and unregistered badges, first and last used, the
  permission chips each with a 24px remove control labeled "Remove
  {{scope}} permission", none on `openid`, a "Sessions" button to the
  profile's Sessions tab, Revoke access behind a confirm that lists the
  sessions it ends).
- **InboxPage**: the same `NotificationRow` as the modal in a full-width
  list, twenty-five per page with the pager, Mark all as read and Delete
  all (behind a confirm) at the top, the per-row controls labeled "Mark
  as read" and "Delete", every relative time carrying the absolute time
  in its tooltip, "View details" following `navigate`, the unread badge
  on the chrome updated through the notifications feature's one context,
  which the modal, the page and the badge share, the `unread-count`
  event correcting it where the UI backend streams; no router prop
  carries a callback to a page.

### Shared components the signed-in pages add

| Component                 | Where                                     | Why shared                                                                                                                                                           |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AddressFields`           | `src/components/common/AddressFields.jsx` | the postal address block with country select and state suggestions, optional Places autocomplete; the profile, the organization profile, the terms collection fields |
| `StepUpDialog`            | `src/components/common/StepUpDialog.jsx`  | "Confirm it's you" with a password or a code; any UI backend that step-ups a sensitive change                                                                        |
| `MethodRow`, `MethodList` | `src/components/common/MethodList.jsx`    | a list row with an icon, a label, a subline, badges and trailing actions; 2FA methods, passkeys, linked accounts, connected apps, sessions                           |
| `SortableList`            | `src/components/common/SortableList.jsx`  | drag-to-reorder over a keyed list; favorites now, any ordered preference later                                                                                       |
| `Pager`                   | `src/components/common/Pager.jsx`         | the page strip of the inbox and of the admin tables                                                                                                                  |
| `InboxList`               | `src/components/common/InboxList.jsx`     | the row list the modal and the page both draw                                                                                                                        |

### Signed-in keys

`shared.json`: `profile.*` gains `tabs.security`, `tabs.preferences`,
`tabs.favorites`, `tabs.sessions`, `details.*` (`givenName`,
`familyName`, `middleName`, `salutation.*`, `gender.*`, `website`,
`birthdate`, `email`, `changeEmail`, `mobile`, `change`, `verified`),
`address.*` (`line1`, `line2`, `country`, `state`, `city`, `postalCode`,
`save`, `clear`, `searchPlaceholder`), `security.*` (`password.*`,
`email.*`, `tfa.*` with `enable`, `disable`, `noMethods`, `preferred`,
`setPreferred`, `remove`, `lastMethod`, `locked`, `reenroll`, `addPhone`,
`addApp`, `smsRisk`; `passkeys.*` with `title`, `add`, `rename`,
`remove`, `rpId`, `added`, `lastUsed`; `recovery.*` with `remaining`,
`none`, `generate`, `download`, `regenerate`; `delete.*` with `title`,
`confirmEmail`, `understand`, `destroys`, `soleOwner`, `button`),
`stepUp.*` (`title`, `body`, `password`, `code`, `usePassword`,
`useCode`, `confirm`), `preferences.*` (`language`, `theme`, `theme.light`,
`theme.dark`, `theme.auto`, `timezone`, `timezoneHint`, `channel`,
`channel.*`, `pin`, `pinSet`, `pinNone`, `set`, `clear`, `save`),
`favorites.*` (`title`, `available`, `add`, `remove`), `sessions.*`
(`title`, `signOut`, `revokeAll`, `revokeAllBody`, `authorized`,
`lastActive`); `organizations.*` gains `create`, `name`, `join`,
`inviteCode`, `regenerate`, `view`, `manage`, `makePrimary`, `leave`,
`personal`, `primary`, `yourRole`; `orgConsole.*` gains the issuer's
fields (`website`, `logoUrl`, `locale`, `timezone`, `telephone`,
`convert`, `convertName`, `delete`, `leave`, `managedBy`, `lastOwner`);
`integrations.*` (`title`, `linked.*`, `available.*`, `terms.*`,
`apps.*` with `sessions`, `revoke`, `revokeBody`, `removeScope`,
`unregistered`, `activeSessions`); `inbox.*` gains `title`, `markAll`,
`deleteAll`, `deleteAllBody`, `markRead`, `delete`, `viewDetails`;
`errors.*` gains `step_up_required`, `step_up_failed`, `last_method`,
`no_methods`, `sole_owner`, `unknown_code`, `last_login_method`,
`last_owner`. Every key mirrored in `es` and `cimode`.

### What this design changed for the signed-in pages

| Where          | Before                                                                                                                                   | After                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the pages      | four Thymeleaf pages under `layout/layout`, jQuery, `profileutils.js`, `mobileutils.js`, `intl-tel-input`, Google Places loaded per page | the shared ProfilePage grown by tabs, OrgConsolePage grown by fields, two new pages, one look                                                                             |
| the routes     | fifty-odd XHR routes under `/accountconfig`, `/user`, `/user/integrations/api`, form-encoded, answering plain text                       | `/api/user/*` JSON with problem bodies; the browser paths unchanged                                                                                                       |
| organizations  | fourteen form posts each redirecting with a flash message; every organization's full console on one long page                            | one JSON per membership; the memberships under the one view toggle, list or cards, plus the shared console for the active organization                                    |
| the step-up    | `stepupPassword` and `stepupCode` form fields per route, a modal wired by id                                                             | `POST /api/user/step-up` arming a five-minute window, `403 step_up_required` from a sensitive call outside it, `StepUpDialog` arming and retrying the same call unchanged |
| the password   | `confirmPassword` posted; "At least 8 characters"                                                                                        | the page's `equals` rule; the minimum from `/api/rules`                                                                                                                   |
| the inbox page | server-rendered rows, every action a reload                                                                                              | the modal's rows and adapter on a page                                                                                                                                    |
| preferences    | `{ "error": "<text>" }` on a bad value                                                                                                   | `422` with a pointer per the validation contract                                                                                                                          |

---

## Group 5: admin, health and errors

The operator's pages: ten Thymeleaf pages under the Bootstrap
`layout/layout` with its own sidebar (Dashboard, User profile,
Organizations, Integrations, Org Admin, Service Usage, Insights, Blocked
IPs, Configuration), the client-health page the footer links, and the three
error templates. Every action is jQuery or `fetch` against `/admin/*`
answering plain text or an ad-hoc map, and `/api/admin/**` is the
Bearer-only chain. In this group the identity feature's operator export
fills the sidebar of the [Universal Navbar Contract](universal-navbar/#sidebar):
Overview (Dashboard), Accounts (Users, All organizations), Activity
(Logins, Registrations, Sessions), Health (Service usage, Insights,
Client health), Security (Blocked IPs), Content (Terms) and System
(Configuration), one page per entry, every entry a deep link (decision
17), and no page draws a tab strip of the same names beside the rows,
because one navigation on screen twice is one too many; the chrome's
user menu carries no Admin row on the issuer, since the column holds
every operator page, every `/admin/*` path the Thymeleaf sidebar linked
stays as the route of its entry, and the JSON routes land under
`/api/admin/*`, where the session-plus-CSRF principal joins the Bearer
principal (decided with the cookie provider).

### Admin routes

| Route                                                             | Entry                                                                                                                                                           | Gate                 | Today                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`, `/admin/dashboard`                                      | Overview › Dashboard: the five stat cards linking to their entries, the login map, recent logins and registrations, the restart card while a restart is pending | `cookie`, `admin`    | `admin/dashboard.html`, `AdminController.dashboard`, `/admin/api/login-heatmap`                                                                                                                                                            |
| `/admin/users`                                                    | Accounts › Users: the filter row on the page, the sortable table, the bulk bar, roles, customer id, primary organization, suspend, delete, rate limits          | the same             | `admin/users.html`                                                                                                                                                                                                                         |
| `/admin/organizations`                                            | Accounts › All organizations: the table, customer id, delete                                                                                                    | the same             | `admin/organizations.html`                                                                                                                                                                                                                 |
| `/admin/logins`, `/admin/registrations`, `/admin/sessions`        | Activity › Logins, Registrations, Sessions: one page per row, with filters, presets, JSON export, and revoke on sessions                                        | the same             | `admin/logins.html`, `registrations.html`, `sessions.html`                                                                                                                                                                                 |
| `/admin/service-usage`, `/admin/insights`, `/admin/client-health` | Health › Service usage, Insights, Client health: one page per row; the usage report, the fleet insights, the client and provider probes                         | the same             | `admin/serviceUsage.html`, `insights.html`, `clientHealth.html`, `ClientHealthController` at `/client-health`, which moves under `/admin` because every admin page is a route there (decision 17) and the footer link that reached it goes |
| `/admin/brute-force`                                              | Security › Blocked IPs: the status line, the table, Unblock                                                                                                     | the same             | `admin/blockedIps.html`                                                                                                                                                                                                                    |
| `/admin/terms`                                                    | Content › Terms: the templates as ordered cards, create, edit, copy, preview, delete                                                                            | the same, `policies` | the Terms of Service tab of `admin/config.html`, `TermsOfServiceAdminController`                                                                                                                                                           |
| `/admin/config`                                                   | System › Configuration: the shared config editor (decision 16)                                                                                                  | the same             | `admin/config.html`, `ConfigController`                                                                                                                                                                                                    |
| `/error`                                                          | ErrorPage: status, reference, path from the URL                                                                                                                 | none                 | `CustomErrorController`, `error/error.html`, `404.html`, `fatal.html`                                                                                                                                                                      |

`error` joins the reserved first segments (`admin` already is, and the
client-health page now lives under it). `AdminController.userActivity` at `/admin/user/{id}/activity`
is reached by no link on any page and is retired with the templates
(decision 20 covers the rate-limit routes in the same position).

### The sidebar export

Two features export the issuer's column, and the router hands their
concatenation to `AppShell` as the navbar contract's Sidebar section
fixes it. `src/features/profile/sidebar.js` answers, for every signed-in
person, one group `{ key: 'account', labelKey: 'account.sidebar.title',
sections }` with one section, Account: Profile (`/user/profile`),
Organizations (`/user/organizations`, while the UI backend advertises
`org-console`), Integrations (`/user/integrations`, while
`integrations`) and Inbox (`/notifications`, while `inbox`, the unread
count as its `badge`, resolved by the shell from the `notifications`
topic's `unread-count`); the row is named Inbox rather than
Notifications because the user menu's Notifications row opens the
modal, and two rows with one word and two destinations confuse. The
Profile row is itself the profile page (`/user/profile`, `end: true`)
and carries `children`, the word decision 68's node shape uses, here a
list of rows in the row shape rather than a function because a row is
named by a key: exactly Security (`/user/profile/security`), Preferences
(`/user/profile/preferences`), Favorites (`/user/profile/favorites`) and
Sessions (`/user/profile/sessions`), never a second Profile, each a deep
link into the same page, the parent active on its exact path alone and a
child row active by route, so the word Profile is drawn once in the
column, and the tab strip gone on the issuer, since
the column is the one navigation; a `backend` UI backend's profile keeps
its own shape unless its export lists `children` the same way. On the
issuer a person's pages are the whole site and today's sidebar already
lists them beside the operator's, so the column draws on every page for
every signed-in person and those pages are never behind the user menu
alone. The operator's sections are the identity feature's own export,
`src/features/identity/sidebar.js`, mounted like every identity page
when the first `auth` token is `cookie`, answering `[]` unless the UI
backend advertises `admin` and the account's `roles` holds `ROLE_ADMIN`,
else one group `{ key: 'admin', labelKey: 'admin.sidebar.title',
sections }` with the seven sections above in that order, each row
`{ key, icon, labelKey, to, end?, badge?, external? }`, the Dashboard row with
`end: true`, the Accounts section's second row labeled "All
organizations" with a glyph other than the Account section's
Organizations row, the Terms section present only while the UI backend
also advertises `policies`, the Blocked IPs row carrying `badge:
'blockedCount'`, which the shell resolves from the `admin` topic's
`blocked-count` event after one read of `GET /api/admin/brute-force/count`
on connect and never from a timer, and the System section with its
Configuration row present exactly while `status.config` names a file
(config contract decision 72), an in-router link to `/admin/config`, the
shared configuration page (decision 16). The shared admin feature keeps its
three entries, Organizations and users, Configuration and System at
`/admin`, `/admin/config` and `/admin/system`, each drawn only while the
adapter carries `organizationsWithUsers`, `config` or `storage`; on the
issuer the router mounts the identity feature's column in place of the
shared feature's entries, and the shared feature's Configuration page
answers `/admin/config` behind the column's Configuration row over an
adapter carrying `config` alone, its tabs the names of `status.config`;
the shared feature never branches on the UI backend's role, because a UI
backend that needs a different column adds a feature and opts into it,
never a role branch inside a shared one. The column shows the brand at
its top, one link to `/`, and the header row opens with the root crumb,
the product name linking to `/`, then the crumbs
(`STARTcloud › Account › Profile`, `STARTcloud › Admin › Users`), the
group a plain word and the row the last crumb, plain text; on a child
route the breadcrumb reads the group, the parent row, then the child's
label (`STARTcloud › Account › Profile › Favorites`), the parent a link
to its own page and the child the last crumb; the user
menu keeps its universal rows, its app section headed by `brand.name`
holding the `links.docs` and `links.contact` rows alone, no Admin row
and no Preferences row, since Dashboard and Profile are rows of the
column and a destination lives in the column or the menu, never both.
The column and the app section are hidden on every route of the
sign-in, onboarding and interstitial groups and on `/error`, where the
page is the whole screen. On a `backend` UI backend the profile feature
exports nothing, because there a person's pages are a side matter beside
the collections.

### What the UI backend answers for admin

Every read is session or Bearer with `ROLE_ADMIN`; a paged list answers
`{ "items": [], "page", "size", "total", "total_pages" }` (decision 19).

| Route                                                                                                 | Answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Today                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/stats`                                                                                | `{ total_users, logins_today, registrations_this_week, failed_logins_today, active_sessions, recent_logins: [{ username, city, country, success, timestamp }], recent_registrations: [{ username, email_verified, timestamp }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the dashboard model                                                                                             |
| `GET /api/admin/login-heatmap?days`                                                                   | `{ tiles: { url, attribution, max_zoom, referrer_policy }, points: [{ city, country, lat, lng, count }] }`; the tile settings ride along so the page reads no configuration of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `/admin/api/login-heatmap` plus four `@environment` reads in the template                                       |
| `GET /api/admin/logins?username&success&start_date&end_date&page&size`                                | items `{ timestamp, username, success, failure_reason, ip_address, city, country, user_agent }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | the logins model                                                                                                |
| `GET /api/admin/registrations?username&start_date&end_date&page&size`                                 | items `{ timestamp, username, email_verified, phone_verified, ip_address, city, country }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | the registrations model                                                                                         |
| `GET /api/admin/sessions?page&size`                                                                   | items `{ id, full_name, client_name, ip_address, location, user_agent, authorized_at, last_accessed_at }`, `id` an opaque surrogate as on the profile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | the sessions model                                                                                              |
| `GET /api/admin/users?search&enabled&using_2fa&has_customer_id&active_after&sort&direction&page&size` | items `{ id, username, full_name, customer_id, enabled, using_2fa, roles: [], organizations: [{ uuid, name, role, primary, personal }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | the users model with `userOrgs`                                                                                 |
| `GET /api/admin/roles`                                                                                | `["ROLE_USER", "ROLE_ADMIN", …]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `GET /admin/users/{id}/roles`, which the bulk dialog calls on the first selected user only to learn the catalog |
| `GET /api/admin/organizations`                                                                        | `[{ id, uuid, name, personal, invite_code, customer_id, created_at, member_count }]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | the organizations model                                                                                         |
| `GET /api/admin/service-usage`                                                                        | `{ total_sessions, total_authorizations, items: [{ client_id, client_name, active_sessions, total_authorizations, unique_users, first_used_at, last_used_at }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the service-usage model                                                                                         |
| `GET /api/admin/insights`                                                                             | `{ active_users: { daily, weekly, monthly, quarterly }, posture: { total_users, enabled_users, disabled_users, using_2fa, email_verified, phone_verified, admins, never_logged_in, with_local_auth, with_external_auth, with_linked_provider }, app_activity: [{ client_id, client_name, active_30d, adopted_30d, total_users }], penetration: [{ app_count, users }], app_pairs: [{ app_a, app_b, users }], growth: [{ week, count }], churn: { quiet_30, quiet_60, quiet_90, enabled_total }, quiet_users: [{ username, last_login_at }], org_rollup: [{ name, customer_id, personal, members, active_30d }] }`, every member the `buildInsights` map already carries in `snake_case`, `week` an ISO date, `last_login_at` an instant or `null`, `app_a` and `app_b` client names | `InsightsService.buildInsights`                                                                                 |
| `GET /api/admin/client-health`                                                                        | `{ summary: { status, healthy, total }, clients: [{ client_id, client_name, description, base_url, check, endpoint, healthy, status, response_time_ms, last_checked, error_message }], providers: [ the same ] }`; `healthy` is `null` for a client that cannot be probed; `check` names the probe the server performed, `actuator_health` (a GET of `<base_url>/actuator/health`, answering `online` or `unhealthy`) or `http_reachability` (a GET of `base_url` itself, tried when the health endpoint answers `404` or fails, answering `reachable`, `unreachable` or `offline`), and `endpoint` is the exact URL that probe requested; both are `null` on a row that was not probed, so the card draws what the server did and never a fixed line                               | the client-health model and `/client-health/status`                                                             |
| `GET /api/admin/brute-force`                                                                          | `{ enabled, blocked: [{ ip, attempts }] }`; `GET /api/admin/brute-force/count` answers `{ count }` once when the stream connects, and every change after rides the `admin` topic's `blocked-count` event, so the column drawn on every page never fetches the table and never runs a timer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `/admin/brute-force/blocked`                                                                                    |
| `GET /api/admin/rate-limit/{user_id}`                                                                 | `{ sign_in: { armed, wait_seconds }, tfa: { "SMS": "locked" \| "armed" \| "clear", "APP": …, "BACKUP_CODE": … }, banned }`, the three gates the Rate limits dialog draws; `GET /api/admin/rate-limit/banned` the banned ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `/admin/rate-limit/status` answers the SMS limiter alone, `/banned`                                             |
| `GET /api/admin/terms`, `GET /api/admin/terms/placeholders`                                           | the templates `[{ name, friendly_name, icon, version, type, is_public, display_order, content, created_by, updated_at }]`; the placeholder list `[{ name, scope, description }]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `/admin/terms/templates`, `/placeholders`                                                                       |
| `GET /api/admin/dcr/clients`                                                                          | unchanged shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `/admin/dcr/clients`                                                                                            |
| `GET /api/config/<name>`, `GET /api/config/<name>/schema`, `GET /api/config/restart-status`           | the config contract's section 3 answers, `<name>` a member of `status.config` (decision 16); `restart-status` is `{ restart_required, requires_restart, last_modified_by, last_modified_time }`, read once when the stream connects, every change after riding the `admin` topic's `restart-required` event                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `/admin/config/*`; `restart-status` polled by the footer every thirty seconds                                   |

### What the admin pages send and what comes back

JSON bodies in `snake_case`; `204` or the updated record; failures the
problem body with `code`.

| Action                   | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Today                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| suspend or enable a user | `PATCH /api/admin/users/{id}` `{ enabled }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `POST /admin/users/{id}/toggle`                                                                                                   |
| customer id              | `PATCH /api/admin/users/{id}` `{ customer_id }` (`422` `pattern` on `/customer_id`, six hex characters)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `POST …/customer-id`                                                                                                              |
| primary organization     | `PATCH /api/admin/users/{id}` `{ primary_organization }` (uuid; `422` `not_a_member`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `POST …/primary-org`                                                                                                              |
| roles                    | `PUT /api/admin/users/{id}/roles` `{ roles: [] }`, one call (`403` `own_privileged_role`, `422` `unknown_role`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `POST …/roles/toggle` once per changed role, the page reloading after the last                                                    |
| delete a user            | `DELETE /api/admin/users/{id}`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `POST …/delete`                                                                                                                   |
| bulk                     | `POST /api/admin/users/bulk` `{ action, user_ids: [], role }`, `action` one of `enable`, `suspend`, `add_role`, `remove_role`, `delete`, `role` present for the two role actions, answering `{ processed, skipped, errors: [] }`, the delete action stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                        | form-encoded with a comma list and the kebab values `add-role`, `remove-role`                                                     |
| revoke a session         | `DELETE /api/admin/sessions/{id}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `POST /admin/sessions/revoke`                                                                                                     |
| delete an organization   | `DELETE /api/admin/organizations/{id}` (`409` with `code` for the service's refusal)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `POST …/delete`, a `400` with the message                                                                                         |
| organization customer id | `PATCH /api/admin/organizations/{id}` `{ customer_id }`, empty clears                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `POST …/customer-id`                                                                                                              |
| unblock an address       | `DELETE /api/admin/brute-force/{ip}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `POST /admin/brute-force/reset`                                                                                                   |
| rate limit               | `POST /api/admin/rate-limit/{user_id}/unlock`, `/tfa-unlock` with `{ "method": "SMS" \| "APP" \| "BACKUP_CODE" }` (`422` `enum` on `/method`), `/ban`, `/unban`, the last three with no body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `/admin/rate-limit/*` with `userId`; no page calls them                                                                           |
| terms                    | `POST /api/admin/terms` `{ name, friendly_name, icon, version, type, is_public, display_order, content }` (`409` `unique` on `/name`), `PATCH /api/admin/terms/{name}` any of those, `DELETE /api/admin/terms/{name}`; each saved at once. The issuer's `/api/rules` carries a `terms` form, its members bounded as the validation contract's Forms table lists them: `name` is `$defs.slug` and `unique` globally, because it becomes the `/public/policies/<name>` and `/api/admin/terms/{name}` segment; `icon` is `$defs.iconName` and is drawn only as a class attribute; the placeholders are a fixed list replaced by string substitution and never evaluated, so the editor can never reach a template engine | `/admin/terms/template/create`, `/update/{name}`, `/template/delete/{name}` form-encoded, batched behind the config editor's Save |
| reorder terms            | `PUT /api/admin/terms/order` `{ names: [] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `displayOrder` per template in the same batch                                                                                     |
| revoke a dynamic client  | `DELETE /api/admin/dcr/clients/{id}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `/admin/dcr/clients/{id}`                                                                                                         |
| export                   | `GET /api/admin/export/logins`, `/registrations`, `/users` with the tab's filters, a top-level navigation answering `application/json` as an attachment, the same rows the table draws, because a CSV opened in a spreadsheet executes a cell that an attacker typed as a username or a user agent                                                                                                                                                                                                                                                                                                                                                                                                                    | `/admin/export/*`                                                                                                                 |
| configuration            | `PUT /api/config/<name>`, the config contract's merge patch (`422` with a pointer per failing path in place of the `400` text list), `POST /api/config/restart` and `POST /api/admin/config/rotate-signing-key` → `{ kid }`, each stepped up and behind a `ConfirmModal` because one click must not restart the issuer or retire its signing key, the SMTP test the mail section's `test` action of the config contract                                                                                                                                                                                                                                                                                               | `/admin/config/*`                                                                                                                 |

### What the admin pages draw

- **The admin pages** are one page per sidebar entry in
  `src/features/identity/`, each reading its own calls and drawing in the
  scroll region beside the column; the shared Organizations and users
  and System pages are not among the issuer's entries because its adapter
  carries neither `organizationsWithUsers` nor `storage`.
  - **Dashboard**: five `StatCard`s (total users, logins today,
    registrations this week, failed logins today, active sessions), each a
    link into its entry with the filter preset
    (`/admin/logins?success=true`); the login map (`LoginMap`, Leaflet
    with marker clusters, the 7, 30 and 90 day buttons, the popup linking
    to the Logins page; the attribution drawn as text and the popups built
    from DOM nodes, never HTML strings, the tile host listed in `img-src`
    and `referrer_policy` defaulting to `no-referrer`, because Leaflet
    injects both as HTML and the tile fetch carries the admin's address);
    Recent login activity and Recent registrations with View all.
  - **Users**: the search field, the Status select (one value of Active
    or Disabled, since a status is exclusive and independent pills would
    say otherwise), the 2FA and Customer ID pills and the Active after
    `DateRange` with its presets and All time, all drawn on the page
    above the table, because an operator scanning a table looks for its
    controls beside it and not behind a gear in the header; the
    `SubTable` with sortable Email, Name, Customer ID and Status headers,
    the Roles badges, the Organizations badges (gold for the primary),
    the 2FA badge; the row actions as labeled buttons or one row menu,
    never bare glyphs: Suspend or Enable, Roles (a dialog of checkboxes
    saved in one call), Set primary organization (a select in the row
    menu behind a confirm, never a click on a badge, because a label that
    secretly acts is a trap), Rate limits (the dialog of decision 20 over
    the rate-limit read, with Unlock sign-in, Unlock a method, Ban and
    Unban) and Delete (`ConfirmModal` with the organization warning); the
    select-all box and the bulk bar (Enable, Suspend, Add role, Remove
    role, Delete, Clear selection) with its confirm, the result line
    naming processed, skipped and errors.
  - **Organizations**: the table (name, Personal or Team, uuid, invite
    code, customer id behind an Edit action in the row, members,
    created), Delete behind `ConfirmModal` for a team or an empty
    personal organization.
  - **Activity**: three pages, one per sidebar row, no tab strip:
    Logins (the presets, the `DateRange`, the username field, Show only,
    Filter, Clear and Export, every control drawn on the page, the table
    with a Reason column for a failed row rather than a tooltip on the
    badge, since a reason an operator came to read must not hide under a
    hover), Registrations (the same controls without Show only, the
    columns headed "Email verified" and "Phone verified" over their Yes
    and No), Sessions (the table with Authorized and Last active as two
    columns and Revoke behind a confirm); `Pager` under each; every table
    draws one date format, the absolute time in the cell and the relative
    time in its tooltip, because two formats on one screen read as two
    clocks. Every admin table page, Users, Organizations, Logins,
    Registrations and Sessions, binds the navbar search with a query over
    the rows it holds, no filter groups, and the Columns group of the
    navbar contract for its table, so the column toggle lives where it
    does on every other UI backend while the page's own filters stay on
    the page; Sessions, having no other filter, has the query as its one
    narrowing; the chosen columns and the sort persist under that page's
    `table_prefs_admin_*` key; every table sits in a wrapper with
    `overflow-x: auto` and hides columns through that group, so the page
    body never scrolls sideways.
  - **Health**: three pages, one per sidebar row, no tab strip: the two
    usage `StatCard`s and the usage table with the percentage bar; the
    insights sections (active users, security posture, app activity,
    apps per user, top combinations, registrations per week, churn,
    organizations) as cards and small tables, their definitions in an
    info fold on the page and not in header tooltips a touch screen
    never opens; the client and provider cards in three states (healthy,
    unhealthy, not probeable) with the error collapse, one status per
    card, and the summary line at the top drawn as a warning while any
    client or provider is unhealthy, because a green line over a red
    card lies; Refresh re-fetches, nothing reloads.
  - **Blocked IPs**: the enabled line with the count, the table, Unblock
    behind a confirm.
  - **Terms**: the templates as cards in a `SortableList` (drag writes
    the order at once and raises a success card carrying Undo, which
    writes the previous order back), Public and type badges, Preview to
    `/public/policies/<name>`, Copy (a small dialog asking the new name,
    never the browser's prompt), Edit and Create in a dialog (name,
    display name, the icon picked from the estate's glyph set and stored
    as its name, version, type, public, order, the markdown content in a
    textarea with a preview beside it and the placeholder help from the
    placeholders call), Delete behind a confirm; every change saved as
    it is made.
  - **Configuration**: the shared `AdminConfig` of the config contract
    over the issuer's schema, one tab per name in `status.config`, reached
    from the sidebar row as an in-router link (decision 16).
  - **Dashboard's restart card**: while the `admin` topic's
    `restart-required` says a restart is pending the Dashboard draws a
    warning card naming who changed what and when, with Restart behind
    the same step-up and confirm as the Configuration page's, so an
    operator anywhere in the column learns of the pending restart on the
    page they open first, without a poll.
- **The footer** draws only while the site's payload lists `footer`, and
  its heart only while `health` is listed too, colored from `GET
/api/health` on connect and from the core `health` topic's event
  after, never from a timer; the client-health icon and the restart
  indicator with its thirty-second poll and modal go: the health summary
  is the Client health page's summary line, and the restart state is
  the Dashboard card and the Configuration page's card from the same
  event. The footer's left slot is muted text on the issuer while no
  changelog is configured, since a link that goes nowhere invites a
  click; a site that omits `footer` shows the version as a muted
  `v<version>` beside `brand.name` in the user menu's app-section header,
  because a person reporting a fault must be able to read the version
  somewhere.
- **ErrorPage** at `/error`, and for a request that failed on the
  server, draws inside `AuthShell` the brand mark, the title from
  `errors.title.<status>` (`403` "You don't have access to this page",
  `404` "Page not found", `500` "Something went wrong", any other
  "{{status}} error"), the body from `errors.body.<status>` in plain
  words with no "sorry" and no "please" ("Something went wrong on our
  end. The details are recorded." and "Refresh the page or go home."),
  the reference line (reference, path, status, time), Go home, Go back
  only while the history holds a page to go back to, and while signed in
  Report this issue (the ticket URL the chrome's user menu already
  builds, with `type=Backend` and the reference alone in `context`, the
  status, path and time being read back from the reference on the
  server) and Copy error details (status, path, time, reference,
  browser, screen). The page reads `status`, `reference` and `path` from
  the `data-error-status`, `data-error-reference` and `data-error-path`
  attributes the server stamped on `<html>`, and from the URL only after
  a `303`; either way it accepts them only when `status` matches
  `^\d{3}$`, `reference` `^[0-9a-f]{16}$` and `path` `^/(?![/\\])`, else
  it draws the generic 500, because `reference` is interpolated into an
  admin fetch and `path` into a ticket URL, and a crafted link would
  otherwise carry an admin's cookie to another route or inject a ticket;
  the fetch is built with `encodePath`, the ticket URL carries the
  reference alone and the trace is copied, never sent in a URL. For an
  admin the page adds a Technical details fold under the reference line,
  closed by default so the trace never fills the page on load: the trace
  from `GET /api/admin/errors/{reference}`, answering
  `{ code, message, path, time, reference, user, trace }`, the error
  code, message, path, time, reference and user the server logged and
  the trace, each row labeled from `errors.detail.<member>`; Copy error details
  copies the trace for the ticket's description, since a trace in a URL
  would ride a query string to the ticket system (decision 18). A render
  crash inside the chrome is not this page: it is the `ErrorBoundary`
  fallback card of the navbar contract (refresh, home, the component
  stack behind a fold in development), drawn in the one card style and
  sentence case the ErrorPage uses so one failure family looks like one
  app, which ships the error and its component stack to
  `POST /api/client-errors`. That route admits anonymous reports,
  because public visitors and broken sessions must still be able to
  report, and is gated by a per-address limit and an 8 KB body cap
  instead; it strips control characters, stores each report as
  structured JSON never interpolated into a log line, and never feeds
  the `/api/admin/errors` store.
- **The server's `/error` dispatch** answers, for a GET that accepts
  `text/html`, `index.html` in place with the fault's own status code
  and `data-error-status`, `data-error-reference` and `data-error-path`
  stamped on `<html>` the way `data-brand-theme` is, because a `303` to
  `/error` would answer every fault with a `200`, hide the `5xx` from
  every monitor and put the reference and path in the history; a POST
  that failed answers a `303` to `/error?status=<n>&reference=<16 hex>&path=<path>`,
  the one case where the redirect is the POST-to-GET hand-off RFC 9110
  §15.4.4 names, `path` being the path component alone, percent-encoded;
  a request that accepts `application/json` answers the problem body
  carrying `reference`. The reference is sixteen hex characters of a
  random identifier, logged with the full detail as today, and the trace
  is kept under it for an hour in a bounded store of the most recent
  faults, `5xx` alone, so a flood of exception-raising requests cannot
  fill memory and a reference cannot be guessed. `CookieTheftException`
  redirects to `/login?error=session_reset`, a code the page translates,
  in place of the prose `?message=`. `fatal.html` goes: the guard against
  the error handler failing is a static `index.html` that cannot. A path
  the router does not know draws the same ErrorPage with `404`
  client-side under the `200` the shell was served with, a soft 404 this
  contract accepts by design because the issuer's pages are never meant
  to be indexed and a round trip to learn what the router already knows
  buys nothing.

### Shared components admin adds

| Component                                           | Where                                           | Why shared                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `StatCard`                                          | `src/components/common/StatCard.jsx`            | the icon, count, label tile that links somewhere; the dashboard, the usage report, the insights                       |
| `DateRange`                                         | `src/components/common/DateRange.jsx`           | start and end dates with preset buttons (30, 60, 90, 120 days, All time); every activity table, any report page later |
| `LoginMap`                                          | `src/features/identity/components/LoginMap.jsx` | Leaflet and markercluster, the one map in the estate; feature-local until a second UI backend draws one               |
| `SubTable`, `Pager`, `ConfirmModal`, `SortableList` | already shared                                  | the tables, the paging, the confirms, the terms order                                                                 |

### Admin keys

`shared.json`: `account.sidebar.*` (`title`, `profile`, `organizations`,
`integrations`, `inbox`); `admin.*` gains `sidebar.*` (`title`,
`overview`, `accounts`, `activity`, `health`, `security`, `content`,
`system`), `dashboard.*` (`title`, `stats.totalUsers`,
`stats.loginsToday`, `stats.registrationsWeek`, `stats.failedLogins`,
`stats.activeSessions`, `map.title`, `map.days`, `recentLogins`,
`recentRegistrations`, `viewAll`, `restart.*`), `users.*` (`title`,
`filter.*`, `table.*`, `roles.*`, `customerId.*`, `primaryOrg.*`,
`suspend`, `enable`, `rateLimits.*`, `delete.*`, `bulk.*`),
`organizations.*` (`all` for the sidebar row and the page title),
`activity.*` (`logins.*` with `reason`, `registrations.*` with
`emailVerified` and `phoneVerified`, `sessions.*` with `authorized` and
`lastActive`, `export`), `health.*` (`usage.*`, `insights.*` with
`definitions`, `clients.*`, `providers.*`, `status.*`), `blocked.*`,
`terms.*` (`title`, `create`, `edit`, `copy`, `copyName`, `preview`,
`delete`, `undo`, `field.*`, `placeholders`, `type.*`); `navbar.*` gains
`versionShort` for the app-section header of a site without a footer;
`errors.*` gains `title.403`, `title.404`, `title.500`, `title.other`,
`body.403`, `body.404`, `body.500`, `report`, `copy`, `copied`,
`reference`, `details`, `detail.code`, `detail.message`, `detail.path`,
`detail.time`, `detail.reference`, `detail.user`, `goHome`, `goBack`;
`session_reset` is a code and lives with the others under
`auth:errors.*`, where LoginPage reads it, and nowhere else. Every key
mirrored in `es` and `cimode`.

### What this design changed for admin

| Where              | Before                                                                                                                                       | After                                                                                                                                                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the pages          | ten Thymeleaf pages under `layout/layout` with its own sidebar, jQuery, `bootstrap-notify`, Leaflet loaded per page                          | one page per entry in `src/features/identity/`, the entries exported to the chrome's Sidebar with the brand at its top; the Thymeleaf sidebar and its jQuery gone                                                                                                                                                   |
| the routes         | `/admin/*` form posts and ad-hoc JSON, CSRF from the cookie, `/api/admin/**` Bearer-only                                                     | `/api/admin/*` JSON with problem bodies, session or Bearer; the browser paths kept as the entries' routes                                                                                                                                                                                                           |
| roles              | one toggle call per changed role, then a reload                                                                                              | one `PUT` with the whole set                                                                                                                                                                                                                                                                                        |
| the bulk catalog   | the first selected user's roles call                                                                                                         | `GET /api/admin/roles`                                                                                                                                                                                                                                                                                              |
| terms              | batched behind the config editor's Save with `pendingToSChanges`, the order in the same batch                                                | a page of their own, every change saved at once, the order one call                                                                                                                                                                                                                                                 |
| the map tiles      | four `@environment` reads in the template                                                                                                    | carried by the heatmap answer                                                                                                                                                                                                                                                                                       |
| the footer         | the client-health icon and a thirty-second restart poll on every page                                                                        | the Client health page's summary line, the Dashboard and Configuration restart cards from the `admin` topic, the heart from the core `health` topic while `footer` and `health` are both listed                                                                                                                     |
| the admin tables   | filters in the page, the same three names as tabs under the header of the Activity and Health pages                                          | filters in the page, the sidebar rows as the one navigation, no tab strip                                                                                                                                                                                                                                           |
| errors             | three templates styled by `auth.css` tokens, the stack trace inline for admins, `fatal.html` as the loop guard, an eight-character reference | the SPA's ErrorPage from the attributes the server stamps, the fault's own status kept, a sixteen-character reference; the trace behind a closed fold for admins from `GET /api/admin/errors/{reference}`, a bounded store of `5xx` alone; render crashes the ErrorBoundary's card, shipped to `/api/client-errors` |
| after every action | `location.reload()`                                                                                                                          | the page re-fetches its list                                                                                                                                                                                                                                                                                        |

---

## Decisions

Settled before code, in the order they were raised:

1. The issuer's `/login` is the existing `LoginPage` grown by mode and
   state; no second page.
2. The problem `code` vocabulary is the one above; `429` carries the
   throttled case.
3. `403 reset_invalid` for an unknown or expired reset token.
4. The chrome's Sign in button is hidden on the issuer's sign-in pages.
5. The auth column's tokens map onto the pack variables; a pack may name
   its display face.
6. Terms and policies are server-rendered HTML the page injects; the
   placeholder vocabulary stays on the server.
7. The phone field is `intl-tel-input` through its official React
   component; nothing invented.
8. `/oauth/terms` and `/oauth/privacy` are retired for the site's own
   templates at `/public/policies/{name}`; the URLs registered for
   Google's verification are updated once, whenever that comes up.
9. `completeRegistration.html`, `CompleteRegistrationController` and its
   `permitAll` entry are retired: no live flow reaches either.
10. The EFF wordlist is bundled and loaded on demand.
11. `frame-src` is set on the `index.html` answer for
    `/connect/logout/frontchannel` from the parked payload.
12. The feature token is `interstitials`.
13. `/user/organizations` is the memberships under the one view toggle,
    list or cards, opening the shared console.
14. The XHR routes move under `/api/user/*` in one release, no aliases.
15. Google Places stays behind the issuer's key in `AddressFields`.
16. The configuration editor is the shared editor of the config contract
    over JSON Schema, mounted at `/admin/config` on the issuer as on every
    UI backend whose `status.config` names a file, its tabs those names;
    no stopgap was built.
17. Admin pages are routes under `/admin/*`, every sidebar entry and tab a
    deep link.
18. The error page keeps the stack trace for admins: the trace is stored
    under the reference for an hour, `GET /api/admin/errors/{reference}`
    serves it, the ticket description carries it, and the error boundary
    ships render crashes with their component stack to
    `/api/client-errors`.
19. Paged admin lists answer `{ items, page, size, total, total_pages }`.
20. The rate-limit routes get a Rate limits dialog on each row of the
    admin Users table.
21. `features` is exactly the set of tokens the contracts gate on, `footer`
    per site by `sites.<id>.ui.footer`; `brand.repo` is omitted; `version`
    is the build-info version; `ticket.fallbackCustomerId` is the site's
    customer id; `events` is `/api/events` with `notifications` and
    `session`.
22. The UI is pinned in `packaging/config/ui-version.yaml`, fetched and
    unpacked by CI into `ui/`, carried by the deb as
    `/opt/prominic/authorization-server/ui/` beside the jar, served from
    that folder at `/`; the jar never contains it and never downloads.
23. No hand-written smoke scripts; a surviving check is a proper tool in a
    reusable workflow, a browser test tool is a normal step of the
    standard `ci.yml`, and the Universal Testing Contract comes after the
    conversion.
24. The password floor is 15 (NIST SP 800-63B rev 4 §3.1.1.2), published
    by `/api/rules`, and is not reopened.
25. The templates and their assets retire in one change after the cutover.
26. `/` on the issuer is the profile for a signed-in person, as
    `UserController.profile` already maps it, and `/login` for anyone
    else; the sidebar draws for every signed-in person with the profile
    feature's Account section, and the admin feature's operator sections
    below it for an admin.
27. Every POST on the issuer is CSRF-checked whatever its `Accept`; the
    cookies carry `Secure`, `HttpOnly` where they can and `SameSite=Lax`;
    session-bound `/api/*` answers are `no-store`.
28. `401` means no valid session and ends it; a wrong password, a wrong
    code or a missing step-up on a live session is `403` with its `code`.
29. Step-up is required on every change to how an account is entered or
    ended, and on the admin's restart, key rotation and deletions.
30. Every code on the issuer counts under the one second-factor gate, a
    free budget then an exponential wait, never a fixed lock.
31. Registration answers `202` for a taken address too; the sign-in
    answers `bad_credentials` for a disabled or locked account, the state
    told by mail.
32. Admin exports are JSON attachments, never CSV.
33. The pending account is a `ROLE_ONBOARDING` principal admitted by the
    enumerated onboarding routes and nothing else.
34. A pack on the issuer is same-origin unless the site lists the origin
    that hosts it in `sites.<id>.ui.pack_origins`, each listed origin
    becoming that site's `style-src` and `font-src` entry, because a
    stylesheet from a host the issuer does not control runs on the
    sign-in page and CSS alone can leak typed input (RFC 9700 §4.2.4).
35. `POST /login` keeps `401 bad_credentials` with a `WWW-Authenticate`
    challenge; every refusal on a live session is `403` with its `code`.
36. A fault on a page GET is answered in place with its own status and
    the values stamped on `<html>`; a `303` to `/error` follows a failed
    POST alone; the reference is sixteen hex characters and the trace
    store is a bounded ring of `5xx` faults.
37. The emailed tokens of the magic link, the verification link and the
    invitation are consumed by a POST from an SPA route, never by the
    GET a scanner prefetches.
38. Step-up is a window armed by `POST /api/user/step-up`; a DELETE
    carries no body; account deletion is `POST /api/user/deletion`.
39. CORS lists the sibling origins with `allow-credentials: false`:
    tokens cross origins, cookies never do; `XSRF-TOKEN` carries the
    `__Host-` prefix where the deployment allows it.
40. `swb://` and `hwa://` stay as the desktop hand-off schemes, the
    reverse-domain form of RFC 8252 §7.1 a recorded deviation.
41. The jar serves no `/assets`; the site marks and provider icons live
    under `/brand/` in the build.
42. The operator's sections are the identity feature's own export,
    mounted by the `cookie` token; the shared admin feature never
    branches on a role, because a UI backend that needs a different
    surface adds a feature and opts into it.
43. The client-health page is `/admin/client-health`.
44. A notification's `navigate` is followed when it is `https://` or a
    same-origin path, since the issuer's own producers write paths.
45. The footer draws only while `footer` is listed, its heart only while
    `health` is listed too, and the heart's state rides the core `health`
    topic's event on every streaming UI backend.
46. The sidebar rows read "Inbox" and "All organizations"; the user menu
    on the issuer carries no Admin and no Preferences row; the app
    section is headed by `brand.name`; the profile draws no
    Organizations tab; a row lives in the column or the menu, never
    both.
47. A site that requires a mobile number says so on the phone step with
    its support contact; a site that does not never shows the step,
    because the requirement is the site's own flag and the least data
    that does the job is collected.
48. "Keep me logged in" is offered in both sign-in modes.
49. A completed password reset sends the person to sign in
    (`/login?reset=complete`) and never signs them in, the OWASP Forgot
    Password guidance, because an automatic sign-in after a reset adds a
    session-handling path that breeds faults.
50. The admin tables carry their filters on the page; every admin table
    page binds the navbar search with a query over its rows and its
    Columns group, no filter groups, and Sessions has the query as its
    one narrowing.
51. The sidebar rows are the one navigation of the Activity and Health
    sections; no page draws a tab strip of the same names; a failed
    login's reason is a column.
52. The status payload's camelCase members are the one named exception
    to the estate's `snake_case`, converged in a later round across
    every UI backend.
53. A pending restart is a Dashboard card and a Configuration card, both
    from the stream.
54. Restart-required, the blocked count and the health state travel on
    the `admin` events topic; no page of the issuer runs a timer.
55. The language control is a globe with the current language's code,
    and the modal lists each language by its code and its own name with
    a decorative flag beside it, because a flag names a country and not
    a language while the glyph and the code give the control a face the
    words alone lack.
56. The second-factor gate is a free budget of misses and then an
    exponential wait, never a fixed lock after a handful, because a
    delayed message, a lagging clock and a stack of old codes are
    ordinary.
57. Admin exports are JSON attachments; a CSV opened in a spreadsheet
    executes a cell an attacker typed.
58. Terms and policies pass an allowlist sanitizer that keeps every
    formatting element, link, table and image and strips script,
    handlers and `javascript:` URLs, so the editor is not dumbed down.
59. The analytics collector is one the estate runs, its tag configured
    never to send the query string, so the tag stays on every page and
    the insight into sign-in failures is kept.
60. The avatar is proxied through `GET /api/user/avatar/{hash}` and
    cached for a day, so gravatar.com never learns who is signed in.
61. `POST /api/client-errors` admits anonymous reports under a
    per-address limit and an 8 KB cap.
62. Every URL member a page draws (`home_url`, `icon_url`,
    `logo_url`, `base_url`, `locations[]`) is rendered only with the
    `https:` scheme or as a same-origin path matching `^/(?![/\\])`,
    images with `referrerpolicy="no-referrer"`, new-tab
    links with `rel="noopener noreferrer"`, and the favorites keep
    working because the server answers the registered URLs itself.
63. The front-channel logout frames are sandboxed and the page never
    redirects on a timer the person cannot stop (WCAG 2.2 SC 2.2.1).
64. A `card` of the notice surface draws the translation of `messageKey`
    alone; the server's sentence goes to the console and the client
    error report for the developer.
65. The cookie provider's cache holds the display fields alone, `name`,
    `email`, `picture`, `roles`, `organizations` and `has_local_auth`;
    `savePreferences` reapplies `theme` and `language` to local storage
    and updates nothing in the cache.
66. The issuer answers `analytics` only while `script_url` names a
    configured hostname of one of its sites; the shell appends whatever
    the payload carries and decides nothing about hosts.
67. `login_method` is LoginPage's own local-storage key; the session
    hook and the cookie provider never read or write it.
68. A sidebar `tree` is a hook answering `{ nodes, menu? }`, the node
    shape of the navbar contract's Export bullet; a `views` entry's
    `useTree` answers the same shape.
69. A sidebar row may carry `external: true`, followed as a top-level
    navigation; no row of the issuer carries it, the Configuration row
    being an in-router link to the shared editor.
70. The accent is the site's; the generator computes `--brand-on-primary`
    as `#ffffff` or `#000000`, whichever contrasts more, when the YAML
    omits it, refusing only when the better is under 4.5:1:
    `moonshinedev` and `switchboard` `#000000`, `nomadservices`
    `#ffffff`.
71. A pack reaches the shell as `brand.pack: { name, css }` in
    `/api/status`; the shell calls no branding route on any UI backend.
72. The generator writes `public/themes/<pack>/<pack>.hash`, the SHA-256
    hex of the stylesheet, and every `?v=` is read from it.
73. The site marks, provider icons, pack marks and the switchboard
    Poppins files are supplied, never drawn; the branding contract lists
    their paths and sizes and the shell ships fallbacks until they land.
74. Every admin table page binds the navbar search for its query and its
    Columns group, never for filter groups, which stay on the page.
75. `POST /api/admin/rate-limit/{user_id}/tfa-unlock` carries
    `{ method }`, one of `SMS`, `APP`, `BACKUP_CODE`.
76. The insights members are the `buildInsights` map's, in `snake_case`,
    as the admin read table names them.
77. `has_local_auth` is a cached display field, so the step-up dialog
    knows its mode on every page.
78. Notification rows keep the hub's camelCase, `readAt` and `createdAt`,
    on every UI backend, the second named exception to `snake_case`; the
    inbox read answers decision 19's paged shape.
79. `DELETE /api/notifications` deletes every notification of the caller.
80. `ciba_user_code` on the preferences PATCH sets the approval PIN, `null`
    clears it; `ciba_user_code_set` is the read's word.
81. `409 sole_owner` carries `teams: [{ uuid, name }]`.
82. A page reaches the chrome's theme and language through the shared
    hooks and the inbox through the notifications feature's context;
    the router hands no callback prop to a page.
83. The shared pieces' words live under `codeInput.*`, `copyButton.*`,
    `passwordField.*`, `stepDots.*`, `pager.*` and `sortable.*` in
    `shared.json`; every key a draw names is in its group's keys section.
84. The email-code resend answers `{ resend_after_seconds }`.
85. A terms field carries `value`; `full_name` is joined on the page.
86. The CIBA approval page reads `?token=` once, replaces the location,
    and sends the token in the header.
87. Poppins for the switchboard pack and every listed mark are supplied
    files; the site marks and provider icons landed on 2026-09-07.
88. Every admin table page has a `table_prefs_admin_<page>` key, the All
    organizations page's being `table_prefs_admin_organizations`.
89. The error page's ticket URL carries `type=Backend` beside `context`.
90. `GET /api/admin/errors/{reference}` answers
    `{ code, message, path, time, reference, user, trace }`, the rows
    labeled from `errors.detail.*`.
91. `session_reset` lives under `auth:errors.*` alone.
92. `reportUrl` is `/api/client-errors` on the issuer from the first
    release.
93. Every feature has the pages contract's one shape: `index.js`, `api/`,
    `components/`, then `hooks/`, `utils/`, `sidebar.js`,
    `definition.jsx` and `assets/` where the feature has them.
94. Favorites are read from `GET /api/user/favorites` on every UI
    backend, never from a claim; the navbar contract's principle, row
    and checklist line say so.
95. A `backend` UI backend proxies `GET` and `PUT /api/user/favorites` at
    the same path on its own origin to the issuer with the user's token,
    as it proxies the hub; the members are `snake_case` on both sides.
96. The config contract's boot rule reads: the service user owns
    `CONFIG_DIR` and the UI backend writes it, `postinst` seeding a
    missing file and first boot generating the UI backend's own secrets.
97. `favorite_apps` in `GET /api/user` and the userinfo claim carry the
    same `snake_case` members as `GET /api/user/favorites`.
98. The About page's Add to Favorites toggle reads and writes
    `/api/user/favorites`, the whole list in `snake_case`; no
    `/api/favorites` route exists on any UI backend.
99. Every favorites read and write goes through the hub client: the
    app's own origin on a `backend` UI backend, the identity provider
    with the token on an `idp` or `cookie` one.
100. `payload-too-large` (413) joins the problem type registry.
101. A reserved first segment offered as a name is refused as `unique`
     with `params.scope: "reserved"`.
102. `health` is a core events topic on every UI backend advertising
     `health` and `events`; the issuer's `admin` topic keeps
     `restart-required` and `blocked-count` alone.
103. A failure inside a `$defs` pattern's `allOf` reports `rule: pattern`
     with the `$defs` name; the inbox list query is `unread_only`.
104. The push worker is `/notification-sw.js` at the origin root, scope
     `/push/`, the two headers sent on that one path.
105. A page whose tabs number one draws no tab strip; that tab's content
     stands under the page heading.
106. Inline styles are banned in the shared UI; every element is styled
     by class alone so a user can theme the app; the issuer's policy
     carries `'unsafe-inline'` for styles until the build is clean of
     them, at which point it leaves; the served `index.html` carries
     exactly one inline script, the pre-paint script whose hash the
     policy names, and no other.
107. The authorization server is FAPI 2.0 Security Profile conformant
     (RFC 9126 PAR, RFC 9449 DPoP, RFC 9101 JAR, RFC 8705 mTLS, RFC 9700
     security BCP) and remains so; the OAuth2 protocol chain, its
     filters, and the authorize, token, PAR, device, introspection,
     revocation, userinfo, registration and JWKS endpoints are outside
     every page-route change, no fix from the UI backend work touches
     them, and the OpenID conformance suite against the deployed server
     is the gate before any release.
108. The invitation and the bootstrap link are consumed by the SPA:
     `/org/invite/:token` posts `POST /org/invite` `{ token }` and
     `/login/bootstrap` posts `POST /login/bootstrap`
     `{ email, token, return }`, each page reading its link once and
     replacing the location; no GET consumes either.
109. A sidebar row may carry `children`, a list of rows in the row shape;
     the Account section's Profile row is itself the profile page at
     `/user/profile` and its children are exactly Security, Preferences,
     Favorites and Sessions at `/user/profile/security`,
     `/user/profile/preferences`, `/user/profile/favorites` and
     `/user/profile/sessions`, each a deep link into the same page, so
     the word Profile is drawn once in the column; the breadcrumb on a
     child route reads Account, Profile, then the child's label; the
     issuer's profile draws no tab strip; a `backend` UI backend's
     profile keeps its own shape unless its export lists `children` the
     same way.

The sidebar is the issuer's navigation for every signed-in person: the
Account section, and the operator's sections for an admin, as group 5
describes; there is no tab strip.

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Session Contract](universal-session/) |
[Universal Pages Contract](universal-pages/) |
[Universal Validation Contract](universal-validation/) |
[Preferences, Language & Branding Contract](preferences-and-branding/)
