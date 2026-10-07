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
  so the server's security configuration neither gates nor redirects a
  page GET, because a
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
  the profile (`name`, `email`, `picture`, `roles`, `organizations`,
  `has_local_auth`, a boolean the step-up dialog reads on any page to ask
  for a password or a code, and the four `preferred_*` members,
  `preferred_mode`, `preferred_theme`, `preferred_motion` and
  `preferred_language`; never the address, the birthdate or any other
  member) and the chosen sign-in mode. Every POST on the issuer, `POST /login` included and whatever
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
  so a compromised sibling page cannot act as the signed-in person. Every session-bound answer under `/api/*`
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
  with the page; the server sends codes and data, never prose. The
  shared UI has one i18n system with CI parity across its locales,
  and a second vocabulary on the server would drift from it on the first
  release.
- **One organization role vocabulary.** A membership carries one of four
  roles, `owner`, `admin`, `member` and `guest`, uppercase on the wire
  (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`), and the membership, the
  `organizations` claim of the id and access tokens and the SCIM
  `/Groups` membership carry the fourth exactly as they carry the first
  three. A `guest` is a read-only membership below `member`: a person
  who signs in to see the things their organization marked for guests,
  which anyone with higher access sees too and the public never does,
  never a download count, and writes nothing. The org console's role picker offers it, its member
  rows draw its badge, an invitation and a join request's assigned role
  may name it, and `default_role` may too, `MEMBER`, `ADMIN` or `GUEST`,
  so an organization that opens a door to the public may open a
  read-only one. A guest sees the published private items its
  organization marked for guests and its own uploads, never a download
  count, may not create an API key while a member or admin may create one
  that acts as a guest, and no write control of any page draws for one,
  the Download button staying; `isMember` counts a guest, `isManager` and
  a collection's `canManage` never do. A guest-only account, one with at
  least one membership and every one of them a guest (`guestOnly`), the
  shared download login an organization prints for its customers, is
  read-only on itself: the issuer's profile draws its record `readOnly`
  with no credential, passkey, second-factor, session or deletion section
  and no preferences write, mode, theme and language staying the
  browser's, the Account column is the Profile row alone, Create a team
  is absent, and the issuer refuses every self-write route for it, the
  preferences `PATCH` included, with `403` `guest_only`, reads, the
  step-up and sign-out staying open, so the page mirrors the API rather
  than standing in for it; a person who is a guest in one organization
  and more in another is a normal account. The admins edit such an
  account through the admin routes.
  Because a customer who downloads licensed files is a member of the
  organization for what they may see and a stranger for what they may
  change, and a second membership kind is the only way to say both.
- **Every dialog takes one of two metrics.** A dialog that carries a
  form, one field or many (the config editor's map item dialogs, the
  terms create, edit and copy dialogs, the users' roles, primary
  organization, customer id and rate-limits dialogs, the profile's
  security dialogs, the step-up dialog, the organization edit, convert
  and join-request dialogs), is a form dialog, `form-modal`, Bootstrap's
  `modal-xl` width, 1140px capped to the viewport, its body scrolling
  inside the dialog, its fields grouped under the schema's sections and
  subsections with a heading each as the page's `ConfigSections` groups
  them, foldable subsections included, two columns where the page draws
  two, the `description` under each control, the first field focused on
  open and the primary action in the footer; a dialog that carries a
  list or a choice (the notifications, language and organization
  switcher modals, every confirm, the disable two-factor dialog) is a
  list dialog, `list-modal`, 720px; because a form the page draws wide
  and grouped must not collapse into a narrow flat column when it opens
  in a dialog, and a list reads in one column.
- **The contract drives the code.** Where a file in a repository and a
  clause here disagree, the clause wins and the file changes; a rule that
  matters is written here, with its reason, and nowhere else, because a
  rule kept in a repository note is invisible to the other repositories
  that must honor it.
- **The spec supersedes this contract.** Where a clause here and a
  specification it cites disagree, the specification wins and the clause
  changes, and every clause that restates one of them names the section,
  because a contract that
  only restates a specification has nothing of its own to defend against
  it.

---

## The cookie session provider

`createCookieSession({ baseUrl, events, storageKey })` is the fourth
provider of the session contract, chosen when the UI backend's first
`auth` token is `cookie`.

| Member                                    | Cookie session provider (`createCookieSession`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `issuerUrl`                         | `'cookie'`, the serving origin (the issuer is itself)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `restore()`                               | the cached profile from `localStorage` under `storageKey` (`account`), synchronously; `null` when none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `load()`                                  | `GET /api/user` through the API client's `auth: 'optional'` mode, which neither replays nor ends the session on a `401`, conditional on the last `ETag` the issuer answered, a `304` answering the session the last `200` produced: on `200` caches the display fields with the account's `preferences` beside them as the four `preferred_*` members, `preferred_mode`, `preferred_theme`, `preferred_motion` and `preferred_language`, writes nothing to the browser's own keys, and answers the cached record, so the chrome adopts the account's choices the moment the profile answers and the pre-paint script paints them before the first frame, a guest-only account's neither cached nor answered, the browser's own standing; on `401` clears the cache and answers `null` (nobody was signed in); the `403` gates are unchanged: `code: onboarding_required` or `terms_required` caches the pending profile the body carries beside `code` and `next`, its display fields `name`, `email`, `picture`, `roles`, `organizations` and `has_local_auth`, answers it as signed-in-pending and navigates in-router to the answer's `next` |
| `reload()`                                | `load()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `begin(opts)`                             | `{}` navigates in-router to `/login`, the cluster's Sign in on a page that is not an auth page; `{ method }`: `local` and `magic-link` navigate in-router to `/login`; `oidc-<id>` sets `window.location` to `/oauth2/authorization/<id>`; `silent` is unsupported on the issuer and ignored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `login(username, password, stayLoggedIn)` | `POST /login`, `application/x-www-form-urlencoded`, `username`, `password`, `remember-me` when `stayLoggedIn`, `Accept: application/json`, the CSRF header; answers the `next` of a `200`; throws `ApiError` on a problem body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `complete()`                              | a no-op; no callback page on the issuer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `headers(method, url)`                    | `{ 'X-XSRF-TOKEN': <XSRF-TOKEN cookie> }` on every method but `GET`, `HEAD` and `OPTIONS`; `{}` otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `retryAuth()`                             | `false`; a `401` on an authenticated call ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `adoptResponse(headers)`                  | a no-op, since the API client calls it on every response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `endSession()`                            | drops every storage key but `mode`, `theme`, `themes`, `motion` and `language`, the visitor's own, and ends the session on the bus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `refresh()`                               | `load()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `claims()`                                | memoized `GET /api/userinfo/claims`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `savePreferences(patch)`                  | `PATCH /api/user/preferences`, then the four `preferred_*` members of the cache updated from the answer's `preferences`; nothing is written to the browser's own keys, which are the visitor's alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `signOut()`                               | `POST /user/logout` with the CSRF header, answering `200 { "next": "/connect/logout/frontchannel" }` while relying parties registered front-channel URIs and `{ "next": "/login?logout" }` otherwise; the provider drops every storage key but `mode`, `theme`, `themes`, `motion` and `language`, the visitor's own, and sets `window.location` to `next`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `signOutEverywhere()`                     | `signOut()`; on the issuer the local session is the SSO session, so the logout row draws the plain red row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `oidc`                                    | always `false`: a federated sign-in on the issuer still ends in the issuer's own session, so the logout row never offers the two-scope toggle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Storage on the issuer, per the session contract's storage table:
`account` (the cached display fields and the four `preferred_*` members),
`intended_url`, `activeOrganization` (uuid), `push_enabled`,
`login_method` (`password` or `magic_link`), `mode`, `theme`, `themes`,
`motion` and `language` (the chrome's own keys, `mode` the person's
mode, `theme` the chosen theme's name, `themes` the host's offered list
cached for the pre-paint script and `motion` the person's reduced-motion
switch; `signOut()` and `endSession()` drop every storage key but
`mode`, `theme`, `themes`, `motion` and `language`, the visitor's own,
written by the person's own controls alone and never from the account,
the account's values riding the cached record and leaving with it),
`table_prefs_admin_users`,
`table_prefs_admin_organizations`, `table_prefs_admin_logins`,
`table_prefs_admin_registrations`, `table_prefs_admin_sessions`,
`table_prefs_admin_dashboard`, `table_prefs_inbox`,
`table_prefs_organizations`, and the sidebar keys
`sidebar_width`, `sidebar_minimized`, `sidebar_open_<group>` and
`sidebar_view_<group>`. The `silent_sso_attempted` key is not used: the
issuer has no upstream to try silently.

The API client sends every request with credentials on the same origin;
`hubClient` is the same client; `reportUrl` for client errors is
`/api/client-errors` on the issuer as on every `backend` UI backend,
since that route opens to anonymous reports from the first
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
    "logo_url": "/brand/startcloud/mark.svg",
    "changelog": "https://github.com/STARTcloud/authorization-server-private/releases",
    "theme": { "name": "startcloud", "css": "/themes/startcloud/startcloud.css" }
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
    "discover",
    "invitations",
    "integrations",
    "search",
    "inbox",
    "admin",
    "notifications",
    "health",
    "events",
    "footer"
  ],
  "links": { "docs": "", "contact": "" },
  "ticket": {
    "base_url": "https://xd.prominic.net/app/apprequest.nsf/router?openagent",
    "req_type": "sso",
    "fallback_customer_id": "A55DF1"
  },
  "events": { "path": "/api/events", "topics": ["notifications", "session", "health", "admin"] }
}
```

The payload's own members are `snake_case`
(`logo_url`, `base_url`, `req_type`, `fallback_customer_id`), like every
other body of the estate.

| Field                           | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                          | `auth-server`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | the navbar contract's name for the UI backend whose session is the `cookie` provider                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `version`                       | the Spring Boot build-info version, the number release-please writes into `build.gradle`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | one number, read at runtime from the artifact that is running, the way every other UI backend answers its own released version; never a value in the UI build, never a second file to bump                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `brand.name`, `brand.logo_url`  | `sites.sites.<id>.name` and the site's mark under `/brand/<site>/` in the served `ui/` tree, the pack directory's artwork for a site with a pack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | the mark, the org mark and the favicon of the chrome are the site's, so a person on `moonshinedev` never sees another site's mark; the jar serves no `/assets`, so the issuer's images, site marks and provider icons alike, live in the build's `public/brand/` and the pack directories, and `/assets` is Vite's alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `brand.theme`                   | `{ name, css }` while the site's `theme_id` names a theme, `name` the theme and `css` the stylesheet URL on the serving origin, no query string and no version in it, the same values the site's `index.html` is stamped with; present on every site, because every site names a theme; never a bare string and never a mode, the payload carrying no mode member of any kind                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | the shell reads one member for a theme on every UI backend and calls no branding route; the issuer stamps the same two values into `index.html` so the theme paints with the first frame and the shell appends nothing; a site names no mode, because the mode is the person's, the operating system's until they choose, per the branding contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `brand.themes`                  | `[{ name, css, label }]` from `sites.<id>.ui.themes`, a list of bare theme names of the shared build in the site's order, each `css` built as `brand.theme.css` is and `label` the site's display name for it; absent while the list is absent or empty                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | the shell draws its Theme picker from this list alone and constructs no stylesheet URL; a site that offers none shows no picker, so a white-label site never shows a sibling's theme; the person's choice is the `theme` preference, applied by the pre-paint script from the cache, so the stamp stays the site's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `brand.repo`, `brand.changelog` | `repo` omitted; `changelog` from `sites.<id>.assets.changelog_url` when set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the source is private, so the footer's left slot links to the changelog, the navbar contract's second tier, and is plain text when neither exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `auth`                          | `["cookie"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the issuer is its own session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `collections`                   | `[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | the issuer lists nothing; the navbar contract's search page draws the issuer's own rows, since the issuer advertises `search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `features`                      | exactly the tokens a contract gates a surface on, no more, no fewer: `local-accounts` (per site, while `self_registration_enabled`), `tfa`, `onboarding`, `interstitials`, `policies`, `org-console`, `discover` while the directory is on, the way BoxVault advertises it, `invitations`, `integrations`, `search`, `inbox`, `admin`, `notifications`, `health`, `events`, and `footer` per site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | a token gates a surface a contract names; a token no contract names would gate nothing and mislead the reader of the payload, and a surface the contracts name but the payload omits would never draw. A new token lands in the navbar contract's token table before any payload answers it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `footer`                        | present only while `sites.<id>.ui.footer` is true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | a white-label site may carry no footer and no "Powered by" line; the switch is per site so one issuer serves branded and white-label sites from the same build, and the chrome draws no footer for a payload that omits the token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `health`                        | present while the issuer answers `GET /api/health` in the navbar contract's shape, `{ status, timestamp, services: { database, mail, sms, signing_keys } }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the footer's heart draws only while both `footer` and `health` are listed: no `footer`, no footer at all; `footer` without `health`, a footer without the heart; both, the heart from `/api/health`, refreshed from the events stream rather than a timer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `links`                         | `docs` from `sites.<id>.assets.help_url`, `contact` as `mailto:` of `sites.<id>.mail.support_email`; an unset value answers `""`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | the chrome hides an empty link; the issuer never invents a destination                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `ticket`                        | `base_url` from `integrations.improvement_request.base_url`, `req_type` its `req`, `fallback_customer_id` the site's `customer_id` and, while the site has none, the global `improvement_request.customer_id`, never null, `context` the `improvement_request.context` repository URL; `null` while `improvement_request.enabled` is false                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | when neither the active organization nor the person carries a customer id, the ticket belongs to the site the person was on, then to the estate, because the ticket system answers "agent done" instead of the prefilled form for a customer it does not know, and the UI leaves a null member out of the link rather than sending the word null; the context names the repository the way BoxVault's does, so a ticket says where it came from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `events`                        | `{ "path": "/api/events", "topics": ["notifications", "session", "health", "admin"] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | the one stream of the events contract; `health` is the core topic every streaming UI backend sends for the footer's heart, and `admin` is the operator's topic (`restart-required`, `blocked-count`), answered `403` to anyone without `ROLE_ADMIN`; `admin` is listed in `events.topics` only for a session holding `ROLE_ADMIN`, so the stream never refuses a topic the same session's status listed; the `403` remains for a caller who asks for `admin` unlisted; a tab holds one connection and no page runs a timer; the same stream is opened by a public SPA on this issuer with the person's `Bearer` or `DPoP` token, admitted by the `notifications:read` scope of the inbox routes and keyed by the token's subject, for `notifications` and `session`, and the `notifications` topic carries `unread-count`, `notification-created`, `notification-read`, `notification-unread`, `notification-dismissed`, `inbox-read-all` and `inbox-cleared` to the person alone |
| `analytics`                     | `{ script_url, attribute, value }` from `integrations.analytics.script_url`, `data_attribute_name` and `data_attribute_value` while `enabled` is true and `script_url` is set; absent otherwise. The collector is one the estate runs (a self-hosted Plausible or Umami), `script_url` names that host, and the tag is configured never to send the query string (`data-exclude-search` on Umami; Plausible drops it by default), so the tag stays on every page, the sign-in pages included, and the failures it records are ours; the issuer answers `analytics` only while the host of `script_url` is a configured hostname of one of its sites and leaves the member absent otherwise, so the shell appends whatever the payload carries on every page and decides nothing, because the sign-in, onboarding, interstitial and error pages carry reset tokens, codes and the desktop token in their URL and the UI has no list of the estate's hosts to judge a script by | the served `index.html` is the shared build's, so the tag a site wants rides the payload instead of the template; insight into sign-in failures is kept by owning the collector rather than by dropping the tag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

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
  controller that reads `ui/index.html` and stamps `data-brand`, the
  theme's `<link>` and, for the front-channel logout route, `frame-src`,
  from the site the `Host` header names, because the
  static handler sends a file byte for byte and the branding contract
  requires those values on the first frame, before any fetch. That answer
  and `/` carry `Cache-Control: no-store`, a direct `/index.html` answers
  404, and every other file in the folder, `/assets/` included, is
  served `Cache-Control: no-cache` with an ETag, a conditional request
  per file and the bytes only when they changed, never `immutable`. The
  files Vite creates are never hashed: every entry, chunk, stylesheet
  and asset keeps its fixed name (`assets/<name>.js`,
  `assets/<name>.css`), and no build step, plugin, server or contract
  may add a content hash to a file name, ever, and no query string ever
  carries a version or a hash either, the site's pack `<link>`
  included; caching is the server's
  job through `no-cache` and an ETag per file, because a fixed name
  cached for a year pins one deploy's chunk against another's, and a
  lazy chunk fetched fresh then binds to the wrong export table. The
  folder is served through a resolver rooted at the folder that refuses
  dotfiles and `*.map`, and the site's absolute URLs, the branding
  answer's included, are built from the site's configured hostname and
  never from the request's `Host`, an unrecognized host answering the
  default site. The push worker in the folder carries no `fetch`
  handler, is registered at scope `/` by the shell and is served
  `no-cache`, per the navbar contract's toast rules.
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
  The Universal Testing Contract fixes the tool, where tests live and what
  every UI backend proves.
- **Until the cutover the server keeps serving its own pages.** The
  shared UI grows first and runs from its own dev server against a local
  authorization server through the Vite proxy; the JSON routes of this
  contract land beside the templates, each answering the shared UI while
  the template still answers a browser GET, so no path on the server has
  two owners and no flag chooses between them. The cutover is the one
  change where the SPA fallback takes every page GET and the templates
  retire, `admin/config.html` among them, because the shared configuration
  editor of the config contract answers `/admin/config` over the
  `/api/config/*` routes the server serves. A developer's `ui/` is the same
  tarball CI fetches, unpacked by hand with the documented
  `curl -fsSL … | tar -xz -C ui` line, and `ui/` is ignored by git, so
  no build of the UI ever enters this repository.
- **A feature's heavy libraries load only when its route renders.** The
  admin Dashboard's map library, the profile's address autocomplete and
  anything of that size are imported lazily by the route that draws
  them, never bundled into the shared build's first load, because the one
  build serves every UI backend and a BoxVault visitor must not download
  the issuer's login map.

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

| Member                                             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `methods[]`                                        | the sign-in methods this site offers, in display order; `local`, `magic-link` and `passkey` are the issuer's own, `oidc-<id>` the federated providers allowed for the site; `?oidc_provider=a,b` on the page narrows the federated ones the way the server's `oidc_provider` parameter does; `icon_url` is an `https:` URL or a same-origin path matching `^/(?![/\\])`, as of every URL member which the pages draw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `login_mode`                                       | which of `magic_link` and `password` the page opens in when the visitor has no stored choice; the order is `?login=` for one visit and never stored, then the stored `login_method`, then `login_mode`, then the first enabled method, so a link from a mail that says `?login=password` is honored over a stored choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `local_registration_enabled`                       | whether the foot shows "Create an account" and whether the magic-link request creates a lead for an unknown address                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `password_reset_enabled`, `sign_in_link_enabled`   | whether the page draws the Forgot password link and whether the emailed sign-in link is offered as a mode; both open unless the answer says false, registration alone closed until its member opens it (`signInAffordances`); the site decides what exists on the page, and the client whose authorize request is parked in the session may only hide or reorder inside that, never add, through its `clients.<id>.client.hide-password-reset` and `hide-sign-in-link`, the site's answer as it is while none is parked; `remember_me_enabled` and `local_registration_enabled` are narrowed the same way by `hide-remember-me` and `hide-registration`, `mark_enabled` is the parked client's `show-mark` when set, else the site's `ui.show_mark` when set, else the issuer's `application.ui.show_mark`, each tier overriding the one above in either direction, the page then drawing the site's own wordmark, `logo.svg` beside `brand.logo_url`, above its heading and nothing else changing, `hide-password` and `hide-passkey` drop those methods from `methods[]`, and `login-mode` names the mode shown first, moved to the other mode when it points at a method the client hides; because a client such as BoxVault's downloads face wants a plain sign-in for its own flow while every other client on the same site keeps the full page |
| `remember_me_enabled`                              | false while the parked client's `hide-remember-me` is true, which hides the Keep me logged in box at all times, false shows it; the page draws the box only while true and sends no `remember-me` otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `mark_enabled`                                     | the parked client's `show-mark` when that key is set, true or false; else the site's own `sites.<id>.ui.show_mark` when set, true or false; else the issuer's `application.ui.show_mark`, false by default; each tier overrides the one above in either direction when set and inherits it when unset, so an issuer may want the mark on every site but one and a site on every flow but one; the page then draws the site's own wordmark, `logo.svg` in the folder of `brand.logo_url` of `/api/status`, above its sign-in heading and nothing else changes, the logo with text there because the header already draws the mark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `cancel`                                           | whether a client's authorization request is parked in the session, so the page draws Cancel only when there is something to cancel; a Cancel on a plain visit would loop `/auth-cancel` → `/` → `/login`; a client whose `clients.<id>.client.hide-cancel` is true hides the link for its own flow, the route behind it staying open, like every other per-client switch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `policies[]`                                       | the public policy links under the form; empty while the site's `tos-names` is empty, so such a site draws none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `reset_link_ttl_minutes`, `magic_link_ttl_minutes` | the numbers the recovery and magic-link sent states name, so neither says "shortly"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `passkey.conditional_ui`                           | whether the page starts the browser's conditional passkey prompt on the email field; the page gates on `PublicKeyCredential.isConditionalMediationAvailable()`, WebAuthn Level 3's own test, not on WebAuthn support alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The client's switches and the answer's words for them, one row per key,
the page reading the answer alone and never a config file: a `hide-*`
key set true on the client whose authorize request is parked turns its
answer member false, and the page hides that control at all times for
that client's flow; `show-mark` is the one switch a client may set either
way, its member following it when set; with no request parked every
member is the site's own answer.

| Key under `clients.<id>.client` | Member on the methods answer                    | The page                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hide-registration: true`       | `local_registration_enabled: false`             | hides Create an account                                                                                                                                                                                                                                                                                         |
| `hide-password-reset: true`     | `password_reset_enabled: false`                 | hides Forgot password                                                                                                                                                                                                                                                                                           |
| `hide-sign-in-link: true`       | `sign_in_link_enabled: false`                   | hides the emailed sign-in link mode                                                                                                                                                                                                                                                                             |
| `hide-remember-me: true`        | `remember_me_enabled: false`                    | hides Keep me logged in                                                                                                                                                                                                                                                                                         |
| `hide-cancel: true`             | `cancel: false`                                 | hides Cancel                                                                                                                                                                                                                                                                                                    |
| `hide-password: true`           | the `local` row of `methods[]` `enabled: false` | hides the password form                                                                                                                                                                                                                                                                                         |
| `hide-passkey: true`            | no `passkey` row in `methods[]`                 | hides the passkey button                                                                                                                                                                                                                                                                                        |
| `show-mark`                     | `mark_enabled`                                  | set true or false, draws or hides the site's wordmark above the sign-in heading for that client's flow, overriding the site's `ui.show_mark`, which when set overrides the issuer's `application.ui.show_mark` the same way; unset, the member inherits the site's answer, and the site's inherits the issuer's |
| `login-mode`                    | `login_mode`                                    | the mode shown first                                                                                                                                                                                                                                                                                            |

`GET /api/auth/tfa`, session with `ROLE_2FA_REQUIRED`:

```json
{
  "method": "SMS",
  "target": { "id": 7, "label": "Work phone", "masked": "+1 *** *** 4242" },
  "sent": true,
  "wait_seconds": 0,
  "resend_after_seconds": 30,
  "code_period_seconds": 30,
  "drift_steps": 1,
  "can_change_method": true
}
```

`method` is the one the server resolved (`?tfa_method=` on the page, else the
preferred authenticator, else the user's preferred method); `target` is
present for `SMS` and `APP`; `sent` is whether a code for this method is
outstanding, so the page never asks for another while one is live;
`wait_seconds` is non-zero while the guessing gate is armed for this
method; `resend_after_seconds` is the sending limit, the seconds before
another message may go to the target, and the two are never one number
because a person waiting on a slow SMS is not a person guessing;
`code_period_seconds` is the period a time-based code is minted on, 30,
and `drift_steps` the steps either side of now the issuer accepts,
`security.tfa_gate.totp_drift_steps`, default 1, so the page's clock
glyph draws from the issuer's own period and no number of its own.

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

| Action                | Request                                                                                                                                                                                                                                                                                                                                                        | `200`                                                                                                                        | Failure                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| password sign-in      | `POST /login`, form-encoded `username`, `password`, `remember-me`                                                                                                                                                                                                                                                                                              | `{ "next": "/" }`, `{ "next": "/authenticator" }`, `{ "next": "/complete-onboarding" }` or the saved `/oauth2/authorize` URL | `401` `authentication`, `code: bad_credentials` for a wrong password and for a disabled or locked account alike, the account's state told by mail, because a distinct code tells a caller which addresses exist; `429` with `wait_seconds` from the brute-force gate. `tos_session_expired` and `registration_disabled` reach the page as `?error=` from other flows, never as an answer to this POST |
| magic-link request    | `POST /login/magic/request`, JSON `{ "email", "resend" }`                                                                                                                                                                                                                                                                                                      | `202 { "sent": true }` always                                                                                                | `400` `bad-request` with `errors[]` on `/email` when the address is missing or malformed; `429` `code: quota` with `wait_seconds` beyond the per-address and per-caller limit the server keeps, because a `202` that always sends is a mail cannon otherwise                                                                                                                                          |
| magic-link consume    | the page at `/login/magic` reads `email` and `token` from the mail's URL once, replaces the location with `/login/magic`, and posts `POST /login/magic`, JSON `{ "email", "token" }`; the GET of that URL is the SPA and consumes nothing, so a scanner's prefetch cannot burn the link                                                                        | `{ "next": "/" \| "/authenticator" \| "/complete-onboarding" \| the saved request }`                                         | `403` `code: magic_link_invalid` or `magic_link_account_disabled`, drawn on the page with a link to request another                                                                                                                                                                                                                                                                                   |
| bootstrap sign-in     | the page at `/login/bootstrap` reads `email`, `token` and `return` from the seeded link once, replaces the location with `/login/bootstrap`, and posts `POST /login/bootstrap`, JSON `{ "email", "token", "return" }`, the server validating `return` before answering it as `next`; the GET of that URL is the SPA and consumes nothing                       | `{ "next": "…" }`                                                                                                            | `403` `code: bootstrap_invalid` or `bootstrap_account_disabled`, drawn on the page with "Sign in another way"; `429` `throttled` with `wait_seconds`                                                                                                                                                                                                                                                  |
| passkey sign-in       | `POST /webauthn/authenticate/options` then `POST /login/webauthn`, JSON                                                                                                                                                                                                                                                                                        | `{ "next": "…" }`                                                                                                            | `401` `authentication`, `code: passkey`                                                                                                                                                                                                                                                                                                                                                               |
| federated sign-in     | `GET /oauth2/authorization/{id}`, a top-level navigation                                                                                                                                                                                                                                                                                                       | the provider's flow, back through the callback to `next`                                                                     | the page at `/login?error=<code>`                                                                                                                                                                                                                                                                                                                                                                     |
| second factor, send   | `POST /api/auth/tfa/send`, no body; the page calls it on mount only while `GET /api/auth/tfa` answers `sent: false` and `wait_seconds: 0`, and the server answers a repeat inside the code's window with `200` without sending again, because a reload, a double mount or an attacker holding the password must not pump messages                              | the `GET /api/auth/tfa` shape                                                                                                | `409` `method-locked`, `code: locked` with the locked method, so the page goes to the picker; `429` `throttled` with `wait_seconds` beyond the per-target limit                                                                                                                                                                                                                                       |
| second factor, verify | `POST /authenticator`, form-encoded `code`, `tfa_method`                                                                                                                                                                                                                                                                                                       | `{ "next": "…" }` from the saved request or `/`                                                                              | `403` `authentication`, `code` one of `invalid`, `expired`, the session being live; `409` `method-locked`, `code: locked` when the method's lockout closed it; `429` `throttled` with `wait_seconds` while the gate is armed                                                                                                                                                                          |
| second factor, resend | `POST /resend-tfa`, no body                                                                                                                                                                                                                                                                                                                                    | `{ "sent": true }`                                                                                                           | `409` `code: not_set_up`, `503` `code: send_failed` with `Retry-After` (a `502` names a gateway fault, RFC 9110 §15.6.3, and the sender is not one), `429` `throttled` with `wait_seconds`                                                                                                                                                                                                            |
| second factor, pick   | `POST /authenticator-method`, form-encoded `tfa_method`, `authenticator_id`                                                                                                                                                                                                                                                                                    | the `GET /api/auth/tfa` shape; the page navigates to `/authenticator?method=<method>`                                        | `409` `code` one of `not_set_up`, `locked`; `503` `send_failed`                                                                                                                                                                                                                                                                                                                                       |
| cancel                | `POST /auth-cancel`, no body, the CSRF header; the Cancel link posts it and follows `next`, because the cancel clears the parked request and a GET must not; from the consent page's "Not you? Sign out" the same one request also ends the session, the server answering `next` as the client's `redirect_uri` with `error=access_denied` (RFC 6749 §4.1.2.1) | `{ "next": "<the client's cancel URL, its redirect_uri with error=access_denied, or />" }`                                   | none                                                                                                                                                                                                                                                                                                                                                                                                  |
| recovery request      | `POST /passwordRecovery`, JSON `{ "email" }`                                                                                                                                                                                                                                                                                                                   | `202 { "sent": true }` always                                                                                                | `422` with `errors[]` on `/email`, a rule failure being never a `400`; `429` `throttled` with `wait_seconds`                                                                                                                                                                                                                                                                                          |
| reset                 | `POST /passwordReset`, JSON `{ "email", "token", "password" }`; the server binds the token to the address it issued it for and ignores a posted `email` that differs, so the token is the only thing that proves the request                                                                                                                                   | `{ "next": "/login?reset=complete" }`                                                                                        | `422` with `errors[]` on `/password` (`minLength`, `maxLength`, `blocklist`); `403` `code: reset_invalid` when the token is unknown or expired                                                                                                                                                                                                                                                        |

`code` is the vocabulary the page translates from (`auth:errors.<code>`);
a `code` the page does not know paints `auth:errors.authenticationFailed`.

`next` on every completed sign-in, the password, magic-link, bootstrap
and passkey posts, the federated callback and the verification link
alike, is `/oauth2/accept-terms` while the site's terms chain of group 2
holds a document the person has not accepted in its current copy and
version for the region resolved at that moment, before any other
destination; the acceptance's own `next` then resumes the destination the
sign-in would have answered, the saved `/oauth2/authorize`,
`/authenticator`, `/complete-onboarding` or `/`, because the site's terms
are owed at every sign-in and a person must never reach a page of the
site past a document they have not signed.

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
  choice and moves focus to the first empty field. The mode toggle line
  draws in the site's accent, because a
  link that changes the form must read as a link. The page draws its
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
  aborted. The passkey calls live in the current `passkeys.js` as a
  module, because the profile page registers passkeys with the same code.
- **Providers.** One `ProviderButtons` button per `oidc-` method, after
  an "or" divider when a form is shown; a click sets `window.location` to
  `/oauth2/authorization/<id>` through `session.begin`. The default
  provider is the one filled full-width button; the others are full-width
  secondary buttons while fewer than three and a three-column grid of
  tiles, the mark above the name, from three on, so the policy links stay
  above the fold at 1080p however many providers a site lists.
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
  `?reset=complete` an info alert; `?message=` is not read. `?logout` and `?reset=complete` draw only while no
  session exists, and a person with a live session who lands on `/login`,
  `/registration`, `/passwordRecovery` or `/passwordReset` is sent to `/`
  or the consumed `intended_url`, because a crafted `/login?logout` above
  a form is a phishing frame for someone still signed in; `?stepup` is the
  one exception, where the session is live by design and the page exists to
  re-authenticate, so the form draws and the answer's `next` wins, because
  `prompt=login` and a `max_age` past its bound oblige the issuer to
  reauthenticate an already authenticated person or refuse with
  `login_required` (OpenID Connect Core §3.1.2.1), and a page that sends
  them home instead does neither and strands the parked request. The
  session-ended banner is the chrome's, raised on the bus; the page draws
  none of its own.
- **Foot.** "New to {{app}}? Create an account" while
  `local_registration_enabled`; the policy links; "Cancel" only while the
  methods answer says `cancel: true`, posting `/auth-cancel` and following
  its `next`, because on a plain visit there is nothing to cancel and the
  link would loop back to the form. The policy links draw in the site's
  accent too; helper text stays muted.
- **Chrome.** The auth pages draw the navbar contract's signed-out
  cluster: the brand mark alone on the left, and on the right, in order,
  Discover (an in-router link to `/organizations/discover` while the
  site advertises `discover`), one ticket icon (`FaTicket`, titled Help,
  the improvement-request ticket link in a new tab, built from
  `ticket.base_url`, `ticket.req_type` and `ticket.fallback_customer_id`
  alone, drawn only while `ticket` is non-null; `links.docs` and
  `links.contact` draw nowhere in the cluster, being the menu's Docs and
  Contact rows signed in), the language control, and the mode control
  beside it (the site's theme is the host's, chosen on the profile's
  Preferences page; the mode is the person's). No
  search icon, because app-wide search needs a session and no auth page
  binds the navbar search; no Sign in button on any auth path of any
  host, because the page itself is the sign-in.
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
zero the alert becomes an info "You can try again now."; beside the code
label a small clock glyph, drawn only while the `Date` header of the
`GET /api/auth/tfa` answer and the browser's own clock differ by one code
period or more, the answer's `code_period_seconds`, RFC 6238's thirty
while the answer names none, below which a mismatch never moves the code,
its tooltip exactly "Time Mismatch: ~00:00:00", the gap
as hours, minutes and seconds, from the first frame and never from a
refusal, because a code minted on a clock a minute out is refused as
`invalid` until the windows meet, while the header it is read from is
public already; the foot links
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
screenshots or any script that reads `location.href`. A completed
password reset sends the person to sign in (`/login?reset=complete`) and
never signs them in, the OWASP Forgot Password guidance, because an
automatic sign-in after a reset adds a session-handling path that breeds
faults.

Every page draws inside `AuthShell` (title, subtitle, icon, children) with
`AuthAlert`, `AuthSpinner`, `InboxIcon`, `Field`, `FieldError`,
`FormErrorSummary` and `ProviderButtons`; the pages set `document.title`;
validation follows the validation contract on every field.

### Shared components sign-in adds

| Component              | Why shared                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `CodeInput`            | a one-time code entry any UI backend with a second factor or an email verification code draws |
| `OptionList`, `Option` | radio cards; the 2FA picker and the logout-confirm chooser of a later group                   |
| `Countdown`            | a seconds countdown that re-enables a control; the throttled code entry, the resend timer     |
| `src/lib/passkeys.js`  | the WebAuthn calls, used by sign-in and by the profile page's passkey registration            |

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
`resendIn`, `resent`, `locked`, `waitCountdown`, `waitReady`, `clockSkew`,
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

---

## Group 2: registration, onboarding and terms

### The flow

A new account passes through one ordered chain, the same for a local
signup, a magic-link lead and a federated first sign-in: `name` → `phone`
→ `password` → `email` → `tfa` → `org`, each step present only when the
site requires it and the account lacks it. The chain is entered from the verification
link (`GET /registration/verify`), the magic-link consume, the federated
callback (`/provider-registration/continue`), a password sign-in of an
account still owing a password, or an `/oauth2/authorize`
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

The site's terms are a gate of their own, and never a federated first
sign-in's alone: after every completed sign-in on the issuer, by
password, magic link, passkey, a federated provider or the verification
link alike, and on every sign-in after, the server resolves the person's
region at that moment (`person_region` below) and walks the site's chain,
`sites.sites.<id>.tos-names` in the order the file lists them, its `SITE`
and `BOTH` documents, kept where a copy of the document covers that
region, one step per document; a document whose covering copy the account
has not accepted in its current version parks a site acceptance in the
session and the sign-in answers `/oauth2/accept-terms` as its `next`
before any other destination, the acceptance's own `next` resuming
`GET /provider-registration/continue` while the session holds
`PROVIDER_REG_USER_ID`, else the saved `/oauth2/authorize`, else the
pending authorize URL, else `/`; while the session owes a site document
it is refused on every authenticated route, browser path or JSON alike,
with `403` `application/problem+json`, `code: terms_required` and
`next: "/oauth2/accept-terms"`, exactly the `onboarding_required` shape,
the shell navigating there; the routes that admit it are exactly
`GET /api/auth/terms`, `GET /api/auth/terms/versions/{version}`,
`POST /oauth2/accept-terms`, `POST /auth-cancel`, `POST /user/logout`,
`PATCH /api/user/preferences` (the region write) and `GET /api/user`,
which answers the `403` with the profile's display fields beside `code`
and `next` as it does for `onboarding_required`, and the routes open to
everyone stay open to it; a region change is a new moment, so a person
who picks another region on the terms page or whose stored region changes
is walked again against the chain that region owes.
A site whose `tos-names` is empty gates nothing and draws no policy
links, because the issuer serves white-label sites and a site may want no
terms at all. The client's chain, `clients.<id>.client.tos-names`, its
`CLIENT` and `BOTH` documents, stays the authorize filter's on every
authenticated `/oauth2/authorize` of a client that lists any.
An acceptance is checked by copy and version, so a new version of a copy,
a document added to a site or a client, or a region whose copy the person
never accepted steps the person up at the next sign-in or authorize, and
a document already accepted in its current copy and version is never
asked again; the step-up on the first reuse of a site or a client that
grew a document is what closes the loophole a one-time gate would leave.
One region may owe ten documents and another five, because the chains
are per region and not variants of one text, and a document is one
agreement whose copies live inside it: one name, one card, one position
in the chain, a copy being that document's text for one governing body,
the default copy the text for everywhere no copy claims, and a document
with no default copy region-only, owed only where a copy covers.

The UI follows `next` on the first `terms_required` or
`onboarding_required` refusal from any route, not the session probe
alone, calls nothing gated while on the terms or onboarding pages, draws
the name and avatar from the display fields the refusal of
`GET /api/user` carries, and never ships such a refusal to
`/api/client-errors`, because a gate the shell obeys forty seconds late
is a gate the person walks around, and a refusal the server designed is
not an error of the client.

### Registration and onboarding routes

| Route                                     | Page                                                                                                                                                                            | Gate                       | Server routes behind it                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/registration`                           | RegisterPage in its issuer form: the email-only form, or the sent state when the URL carries `success`, the address in router state                                             | `cookie`, `local-accounts` | `POST /registration`, `POST /registration/resend`                                                                                   |
| `/registration/verify`                    | VerifyLinkPage: reads the mail's `email` and `token` once, replaces the location, posts them and follows `next`; the invalid state with "Send a new link"                       | `cookie`, `local-accounts` | `POST /registration/verify`                                                                                                         |
| `/complete-onboarding`                    | OnboardingHub: reads the state and draws the step it names, the password step being its own                                                                                     | `cookie`, `onboarding`     | `GET /api/auth/onboarding`, `POST /complete-onboarding/password`                                                                    |
| `/complete-onboarding/name`               | NameStep                                                                                                                                                                        | the same                   | `POST /complete-onboarding/name`                                                                                                    |
| `/complete-onboarding/phone-setup`        | PhoneStep: the number, then the code                                                                                                                                            | the same                   | `POST /complete-onboarding/send-phone-code`, `POST /complete-onboarding/phone-setup`                                                |
| `/complete-onboarding/email-verification` | EmailCodeStep                                                                                                                                                                   | the same                   | `POST /complete-onboarding/email-verification`, `POST /complete-onboarding/email-verification/resend`                               |
| `/complete-onboarding/choose-2fa-method`  | TfaEnrollChoiceStep                                                                                                                                                             | the same, `tfa`            | `POST /complete-onboarding/choose-2fa-method`                                                                                       |
| `/qrcode`                                 | TotpEnrollPage: the QR, the setup key, the code, the onboarding chain's only; the profile enrolls an app inline on its Security tab so a signed-in person never leaves the tabs | `cookie`, `tfa`            | `GET /api/auth/tfa/enroll`, `POST /qrcode/verify`                                                                                   |
| `/complete-onboarding/backup-codes`       | BackupCodesPage: the list, copy, download, the confirm                                                                                                                          | the same                   | `POST /api/auth/tfa/backup-codes`, `POST /complete-onboarding/backup-codes/confirm`                                                 |
| `/complete-onboarding/account-type`       | AccountTypeStep: the two tiles                                                                                                                                                  | the same, `org-console`    | `POST /complete-onboarding/account-type`                                                                                            |
| `/complete-onboarding/team-name`          | TeamNameStep                                                                                                                                                                    | the same                   | `POST /complete-onboarding/team-name`                                                                                               |
| `/oauth2/accept-terms`                    | TermsPage: one document, classic or collecting, a site or a client acceptance                                                                                                   | `cookie`, `policies`       | `GET /api/auth/terms`, `GET /api/auth/terms/versions/{version}`, `POST /oauth2/accept-terms`, `GET /provider-registration/continue` |
| `/public/policies/:name`                  | PolicyPage: the article                                                                                                                                                         | `policies`                 | `GET /api/policies/{name}`                                                                                                          |

`registration`, `complete-onboarding`, `qrcode`, `provider-registration`,
`public` and `oauth2` join the reserved first segments. Every acceptance is
`POST /oauth2/accept-terms`, and `GET /api/auth/terms` serves a site or
a client pending acceptance alike, because two routes for one act
diverge and the site's chain is owed at every sign-in, not at a
federated first one alone; `GET /provider-registration/continue` stays
the federated callback's continuation, the `next` a site acceptance
resumes while the session holds `PROVIDER_REG_USER_ID`, the saved
authorize, the pending authorize URL or `/` otherwise.

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

| Member                   | Meaning                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`                   | the step page to draw, or the resume URL once every step is done                                                                                                                    |
| `steps`, `done`          | every step this account owes, in chain order, and the ones cleared; the page draws the step dots from them                                                                          |
| `phone.purpose`          | `verify` on a local signup (a real-person check, no 2FA enrollment, no "choose another method" link) or `tfa` on a federated one (SMS 2FA enrolled on success, backup codes follow) |
| `tfa.verified_phone`     | the masked number when SMS 2FA can enroll without retyping                                                                                                                          |
| `org.required_by_client` | the client's name when an `/oauth2/authorize` parked the user here; the personal tile is then hidden                                                                                |

`GET /api/auth/tfa/enroll`: `{ "qr": "data:image/png;base64,…", "secret": "JBSW…", "issuer": "STARTcloud" }`,
the secret held in the session until verified.

`POST /api/auth/tfa/backup-codes`, the CSRF header and no body:
`{ "codes": ["A1B2C3D4", …] }`, held in the session and answered again
on every call until `POST /complete-onboarding/backup-codes/confirm`
clears it, so a reload of the page shows the same codes rather than an
empty page with a disabled Continue; a POST because a one-time secret on
a GET is consumed by a prefetch, a link preview or the back-forward
cache before the person has saved it.

`GET /api/auth/terms`, the session that holds a pending acceptance, a
site's or a client's alike:

```json
{
  "scope": "client",
  "name": "conductor-msa",
  "label": "Master Services Agreement",
  "version": "2.1",
  "region": "EU",
  "person_region": "DE",
  "regions_offered": ["EU", "UK", null],
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
  "identity_group_title": "Phone verification",
  "versions": [
    { "version": "2.1", "published_at": "2026-08-30T14:02:11Z" },
    { "version": "2.0", "published_at": "2025-11-04T09:15:00Z" }
  ],
  "previous": { "version": "2.0", "accepted_at": "2025-12-02T18:40:09Z" },
  "changes_html": "<p>… <del>thirty days</del><ins>fourteen days</ins> …</p>"
}
```

A document is one agreement, one name, one card, one position in the
chain, and its copies live inside it: a copy is the document's text for
one governing body, the default copy the text for everywhere no copy
claims, and a document with no default copy is region-only, owed only
where a copy covers. `scope` is `site` or `client`, the chain the pending
acceptance belongs to; `client_name` is the client's name on a client
acceptance and `null` on a site one, whose subhead names the site
instead. `region` is the region of the copy shown, `null` on the default
copy; `person_region` is the region the issuer resolved for the person, a
country code or one of the sets `EU`, `EEA` and `UK`, `null` when none
resolved, and the issuer resolves it in one order: the account's stored
region first, a preference the person set through the region button;
else the request's GeoIP country, decided before any typed data so the
first terms page a person meets is already their region's; else the
stored address country once the account holds one; else nothing, the
default copy then being the one shown, because a person who signs up in
the EU is owed the EU text and never the US one. `regions_offered` is the
region button's rows, the distinct `regions` of the document's copies
plus `null` for the default copy when the document has one. The region
button is drawn on every terms page and never hidden: while
`regions_offered` holds more than one entry a pick re-reads
`GET /api/auth/terms?region=<code>` and is written to the account as
`PATCH /api/user/preferences { region }`, so every later terms page and
the public policy view resolve to it; while it holds one entry the
document has no other copy, the one copy is the one shown, and the
button is disabled with a title saying so; `GET /api/auth/terms` accepts
`?region=` the way the policies read does and answers `422` `enum` at
`/region` for a region no copy of the document covers; a stored region
is the person's word and beats every guess, because a person who travels
or whose address is elsewhere must not be shown the wrong law. `step` and
`total` are the person's place in the chain the acceptance belongs to,
the site's `tos-names` or the client's in the file's order, kept where a
copy of the document covers `person_region`, one step per document, and
both are recomputed on every read of this route and on every region
switch, because one region owes ten documents and another five and the
count must follow the person and never a stored number. A copy's
`version` is the public version people accept, free text up to 50
characters, a date or a semver alike, only equality mattering; under
every version the server keeps internal revisions it numbers itself from
1, `revision`, each a row `{ version, revision, content, published_by, published_at }`,
written as revision 1 when the copy is created, as revision r+1 under
the current version on every save of `content`, and as revision 1 of the
new version on every publish, so the words a person
agreed to are never lost; `versions` lists the copy's versions, never
its revisions, newest first for every reader, and `previous` and
`changes_html` are present only while the account holds an acceptance of
an earlier version of this copy: `previous` names that version and when
it was accepted, and `changes_html` is the current text with every
change since the latest revision of the accepted version marked at word
level with `ins` and `del`, the two elements the sanitizer admits for it
beside the set, so a punctuation fix saved to the
accepted version after the acceptance never shows as a change, a person
asked to accept a new version reads what changed and a new person, who
never signed the earlier text, is shown the current text plain and is
never asked to sign an old version; an older version is read through
`GET /api/auth/terms/versions/{version}`,
`{ version, published_at, content_html }`, the latest revision of that
version, read-only for the pending copy, and is never a thing to accept.
An acceptance the server records names the copy, its version, the
revision live when the person accepted, `revision`, and the source the
person's region came from, `region_source`, one of `stored`, `geoip` and
`address`, the last two recorded on the acceptance row alone and
appearing in no read, because the audit must say which text was signed
and why that text was the one shown.
`collecting` is true while the document references a profile
field the account lacks; `fields` lists those, in render order, each
carrying `value`, the stored value the page prefills or absent for an
empty field; a `tos-blank` span is filled from the field of the same
`param` as the person types, and `full_name` from `first_name` and
`last_name` joined, since no field carries it; the three HTML members
are the document split on its horizontal rules, with the live-fill
blanks as `tos-blank` spans. In classic mode `fields` is empty and `content_html`
is the whole document.

`GET /api/policies/{name}`, public: `{ "name", "label", "version", "created_at", "updated_at", "region", "person_region", "content_html" }`,
the copy resolved the same way, `region` the copy's and `person_region`
the reader's, `?region=` forcing a copy; `404` `not_found` when the
document is not public and when no copy of the document covers the
reader's region, a region-only document being public in its own regions
while `is_public` is on and nowhere else.

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
| accept terms           | `POST /oauth2/accept-terms`, JSON `{ "tos_name", "fields": { "first_name": "…" } }`; the record the server writes names the copy accepted, its `version`, the `revision` live at that moment and a `region_source`, `stored`, `geoip` or `address`, the step of group 2's order the person's region came from                                                                                                                                                       | `422` `required` on `/fields/<param>` for a still-blank required field; `403` `tos_session_expired`                                                                             |
| read an older version  | `GET /api/auth/terms/versions/{version}`, read-only, the latest revision of the pending copy's version named by `version`, answering `{ "version", "published_at", "content_html" }` for the version list's dialog; the page never posts it as an acceptance                                                                                                                                                                                                        | `404` `not_found` for a version the pending copy never had                                                                                                                      |
| any step, session gone | any of the above                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `401` `session_expired`; the page sends the visitor to `/login?error=session_expired`                                                                                           |

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
  The "choose a password" subhead is drawn only once the state names the
  hub as `next`; until the state answers, the heading stands over the
  spinner alone. The state read follows a `403` gate that carries `next`
  (`terms_required`, `onboarding_required`) the way the session follows
  one elsewhere, and a `403` `not_pending` means the onboarding is over
  and goes to `/`, so the hub never spins on a problem answer.
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
  terms to continue to {{client}}.", the subhead naming the site's
  `brand.name` in place of the client on a site acceptance
  (`scope: site`, `client_name` null), the version and the "Step n of m"
  badge at the top in both modes, the A-/A+ controls as real buttons
  with labels and, beside them in the same head row on every terms page
  whatever the case, a small region button carrying the flag of
  `person_region`: a country code draws that country's flag, `EU` the EU
  flag, `EEA` the EU flag with the letters EEA beside it, `UK` the Union
  Jack, and a `null` `person_region` a globe glyph with the label "Choose
  your region", never blank, because something must show and it must be a
  visual indicator; the button opens a list dialog the way the
  language switcher's does, one row per entry of
  `regions_offered` with its flag and name, the default copy's row
  reading "Everywhere else", the current one checked, a pick re-reading
  `GET /api/auth/terms?region=<code>` and writing
  `PATCH /api/user/preferences { region }`, then moving focus to the new
  heading and announcing the step, since the chain may have changed
  length; while `regions_offered` holds one entry the button is drawn
  disabled with a title saying this document has one text, because a
  person must always see which region the issuer took them for and a
  choice over one text is no choice; the
  document in a pane at least 60vh tall that grows with
  the viewport, and for a person who accepted an earlier version of this
  copy the pane draws `changes_html`, the passages that changed since
  the version they accepted marked as inserted and removed, under a
  "What changed" toggle that flips the pane between the marked text and
  the plain current text, with a line naming the version they accepted
  and when, while a new person sees the current text plain and is never
  asked to sign an old version; a "Versions" control beside the version
  badge opens a list dialog over `versions`, newest first, the current
  one marked, each older row opening that version read-only in the same
  dialog from `GET /api/auth/terms/versions/{version}`, never selecting
  it and never changing what is accepted, so the person who wants to
  compare can, on the same step, without leaving it; "I accept and
  continue" and "Decline", which posts
  `/auth-cancel` and follows its `next`, because a person who will not
  accept must have a way out other than the browser's Back button;
  every terms page, both modes and PolicyPage, is the one wide column,
  1120px at most and the viewport minus the page padding below that,
  because six address parts and the document beside them read at a
  desk's width and not a phone's; collecting mode draws the
  document flowing as page copy, the identity field group under "Your
  details" and, under "Address", the shared `AddressFields` block exactly
  as the profile draws it, in the same order, line 1 with the Google
  Places autocomplete while the issuer answers a key from the same
  session-gated `GET /api/config/places`, line 2, the country select from
  the shared country list, the state with the suggestions for the picked
  country, the city and the postal code, each part prefilled from the
  listed field's `value` and posted under that field's `param`, because
  the person types the same address here as on the profile and gets the
  same help, the key is public by nature and the script origin is already
  in the policy; every field the document references drawn
  prefilled and editable so a wrong stored name is corrected here rather
  than baked into the attestation, optional identity fields marked
  "(optional)" by the page and never by the server's label, and no
  asterisks; the fine-print zone with the blanks filling as the user
  types, an `address` blank joined on the page from line 1, line 2, city,
  state, postal code and country, comma-separated, the parts present, the
  way `full_name` is joined from the names, the acknowledgment row and
  "I Agree & Continue". When `next` is
  the same route for a second document the page moves focus to the new
  heading and announces the step, so the swap is never silent, and every
  link inside the document opens a new tab with `rel="noopener"` so the
  acceptance is never left mid-way. A document's callout blocks, an
  element carrying `callout` with `callout-lock` or `callout-doc`, and a
  `blockquote` in the flowing document, draw as cards on the auth tokens
  with the lock or the document glyph before their first line, in both
  variants, because the sanitizer keeps exactly those
  classes and the card rules live in the one stylesheet, so an intro, a
  privacy note or the fine print an author marks as a callout is a card
  on every site and never plain prose.
- **PolicyPage**: the wide article column, the title, the version badge
  and dates, the prose, "Back" to the referring page when there is one
  and "Back to sign in" otherwise.

### Shared components onboarding adds

| Component              | Why shared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PasswordField`        | the reveal button and the optional passphrase generator; sign-in, reset, onboarding, the profile's password section, the setup page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `PhoneInput`           | country picker plus national number to E.164, a wrapper over intl-tel-input's official React component; the country preselect comes from `GET /api/public/geo/country`; the profile's phone section draws it too                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `StepDots`             | the progress dots of any multi-step flow                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ChoiceTile`           | the large icon tiles; account type, any two-way choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CopyButton`           | copy-to-clipboard with the "Copied!" flip; the setup key, the backup codes, checksums on the catalog pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `MarkdownArticle`      | the `prose` typography over server HTML or markdown; policies, terms, the README the item page draws through `react-markdown`. The server renders a template with raw HTML kept and passes the result through an allowlist sanitizer that keeps every formatting element, link, table and image an author would use and strips script, event handlers and `javascript:` URLs; placeholder values are substituted as escaped text; the component sanitizes every `*_html` member the same way before injecting it and fills a `tos-blank` span with `textContent`, because the document runs on the issuer's origin for every visitor and a stolen admin session or a person's own name inside a placeholder would otherwise be stored script on a public page. Nothing an author can write short of a script survives the pass, so the editor is not dumbed down. The pass keeps `class` only from a named set, `callout`, `callout-lock` and `callout-doc` on a block element and `tos-blank` on the live-fill span, every other class token dropped, because a class is a hook into the app's own stylesheet and a document must reach the callout cards and the blanks the contract names and nothing else |
| `src/lib/wordlist.js`  | the EFF large wordlist for the passphrase generator; 7,776 words, loaded on demand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/countries.js` | the country list with dial codes and the state suggestions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

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
`before`, `beforeSite`, `version`, `step`, `fontSize.smaller`,
`fontSize.larger`, `region.change`, `region.title`, `region.onlyOne`,
`region.everywhereElse`, `versions.open`, `versions.title`,
`versions.current`, `versions.published`, `whatChanged`,
`changedSince`, `accept`, `agree`, `decline`, `optional`, `yourDetails`,
`phoneVerification`, `address`, `acknowledge`); `policy.*` (`pageTitle`,
`version`, `updated`, `created`, `return`, `back`); `errors.*` gains
`session_expired`,
`link_invalid`, `invalid_code`, `expired`, `quota`, `send_failed`,
`organization_required`, `tos_session_expired`, `onboarding_required`,
`terms_required`. The `terms.*` key names above are placeholders the UI
may rename; the strings they carry are the contract.

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
| `/activate`                    | DeviceActivatePage: the user code                                                                                                       | `cookie`, `interstitials` | form `POST /oauth2/device_verification`                                                      |
| `/activated`                   | DeviceActivatedPage: "Device connected"                                                                                                 | `interstitials`           | none                                                                                         |
| `/ciba/approve`                | CibaApprovePage: the client, the binding message, the scopes, approve and deny; then the approved, denied or unavailable state in place | `cookie`, `interstitials` | `GET /api/auth/ciba`, `POST /ciba/approve`, `POST /ciba/deny`                                |
| `/connect/logout/confirm`      | LogoutConfirmPage                                                                                                                       | `cookie`, `interstitials` | `GET /api/auth/logout/confirm`, `POST /connect/logout/confirm`                               |
| `/connect/logout/frontchannel` | FrontChannelLogoutPage: the hidden frames, the countdown, "Continue"                                                                    | `interstitials`           | `GET /api/auth/logout/frontchannel`                                                          |
| `/oauth2/code`                 | CodeDisplayPage: the code with a copy button, or the error                                                                              | `interstitials`           | none; `code`, `state`, `error`, `error_description` from the URL                             |
| `/continue`                    | DesktopContinuePage: the `swb://` button and the token to copy                                                                          | `interstitials`           | none; `token`, `email` from the URL                                                          |
| `/link-account-consent`        | LinkAccountPage: the existing account, the provider, the password step-up, link and cancel                                              | `cookie`, `interstitials` | `GET /api/auth/link`, `POST /link-account/confirm`                                           |

`activate`, `activated`, `ciba`, `connect`, `continue`,
`link-account-consent` and `link-account` join the reserved first
segments.

### What the UI backend answers for the interstitials

`GET /api/auth/consent?client_id&scope&state&user_code`, the signed-in
session:

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
  "granted_scopes": [
    { "id": "email", "label": "email", "description": "Access your email address" }
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

`scopes` lists the requested scopes not yet granted and `granted_scopes`
the requested scopes already on file for this person and client, the
two together being every scope the request named, each labeled from the
client's `scope.configs` then the OIDC defaults, the standard scopes'
descriptions drawn from `consent.scope.<id>` keys on the page and only a
client's own `scope.configs` text riding as data; the server merges an
approval into the stored consent and never narrows it from this screen,
so a granted scope is read-only here and is removed on the Applications
page; `action` is
`/oauth2/device_verification` when `user_code` is present. A pending ToS
for the client is normally diverted by the authorize filter before the
page; when the consent controller still finds one pending, the call answers
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
  request without it fails at the server, then one locked, checked,
  read-only `ScopeRow` per entry of `granted_scopes` under "Already
  allowed" with a "Manage permissions" link to `/user/applications`, so
  the person sees every scope the request named and where a granted one
  is taken back, Approve refusing with an inline line only while `scopes`
  is non-empty and none of its rows is checked, and approving at once
  when `scopes` is empty and an authorization detail is up for approval; "This application also requests
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
  alert painted on the field, "Continue"; a visitor without a session is
  sent to `/login` with this page, query and all, kept under
  `intended_url`, so the code is still prefilled when the sign-in returns
  here; **DeviceActivatedPage**: the
  tab closes itself once drawn, and "Device connected", "You can close
  this window and return to your device." stand for a browser that
  refuses the close.
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
  is that fallback, clamped to 20 to 60; the frames are the mechanism OpenID Connect
  Front-Channel Logout 1.0 §3 prescribes, one per relying party's
  `frontchannel_logout_uri`, so each app's own cookie is cleared in the
  browser.
- **CodeDisplayPage**: "Authorization Code" with the code in a
  monospace block and `CopyButton`, the code joined to the `state` by a
  hash while the URL carries one, so a client that reads the paste can
  check the state it sent, "You can close this window when you are
  done."; the error state as a danger alert with `error` and
  `error_description`; the missing state. A client reaches the page by
  registering it as a redirect URI on its own site domain, the server
  redirecting there with `code`, `state` and `iss` as to any other.
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

| Component               | Why shared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScopeRow`, `ScopeList` | the consent and CIBA pages; a later profile group's "connected applications" list draws the same rows read-only                                                                                                                                                                                                                                                                                                                                                                           |
| `NativeForm`            | a real form post built from a JSON state; it always emits the `_csrf` field from the `XSRF-TOKEN` cookie and posts only to a same-origin `action` that is `/oauth2/authorize` or `/oauth2/device_verification`, because no cookie-authenticated POST on the issuer is CSRF-exempt and a consent post without the token could be auto-submitted for a victim holding a pending request; consent, device activation, and every later page that must hand the browser to a protocol endpoint |

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

The SPA's `index.html` is served before the page knows its frames, so
the issuer sets `frame-src` on the `index.html` answer for
`/connect/logout/frontchannel` from the parked payload, and on no other
page.

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
img-src 'self' data: https://maps.gstatic.com <tile origin> <analytics origin> <the configured origins>;
connect-src 'self' https://maps.googleapis.com <analytics origin>;
worker-src 'self';
frame-src <the parked frame origins on the front-channel route, none elsewhere>
```

A pack on the issuer is same-origin unless the site lists the origin
that hosts it in `sites.<id>.ui.theme_origins`, each listed origin
becoming that site's `style-src` and `font-src` entry, because a
stylesheet from a host the issuer does not control runs on the sign-in
page and CSS alone can leak typed input (RFC 9700 §4.2.4).

`<pack origin>` is the serving origin unless the site's pack is hosted
elsewhere; `<analytics origin>` and `<tile origin>` are the hosts
`integrations.analytics.script_url` and the heatmap's `tiles.url` name,
present only while those are configured; `data:` is for the QR image;
`https://maps.gstatic.com` is where the Places autocomplete widget loads
its icons and its attribution image from, so the address field never
draws a broken glyph; Gravatar needs none because the issuer proxies the avatar. The build publishes the pre-paint script's hash beside the
tarball so the issuer never guesses it. `form-action` is omitted on the
interstitial routes because the consent post ends in a redirect to the
relying party, which some browsers check against it. Inline styles are
banned in the shared UI: every element is styled by class alone, so a
user can theme the app. The issuer's policy carries `'unsafe-inline'`
for styles.
The served `index.html` carries exactly one inline script, the pre-paint
script whose hash the policy names, and no other.

`<the configured origins>` is the issuer's global list of allowed origins:
every URL a configuration field holds, a client's `home_url` and
`icon_url`, a provider's `icon_url`, a site's logo and asset URLs, joins
that list by its origin at boot and on every configuration save, so a
favorite's icon, a provider button's mark or a site's logo is never
blocked by the issuer's own policy, and the star is never the answer for
a configured icon; a URL a configuration field holds is by definition an
allowed one, and a URL held nowhere in configuration is refused.
`connect-src` gains the same list only for the origins a page fetches
from.

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

| Route                            | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Gate                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/`                              | the issuer's home: ProfilePage for a signed-in person, since the issuer lists no collections and a person's pages are the whole site; an anonymous visitor is sent by the SPA to `/login` with `/` under `intended_url`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `cookie`                                                       |
| `/user/profile` (and `/profile`) | the one shared ProfilePage over the issuer's `account` adapter: the sidebar's Profile row is this page (`/user/profile`) and its child rows, built from the sections the adapter carries, Security (`/user/profile/security`), Preferences (`/user/profile/preferences`), Favorites (`/user/profile/favorites`) and Sessions (`/user/profile/sessions`), are each a deep link into the one page, no tab strip on the issuer; the page's Organizations and Service accounts sections are not drawn on the issuer because its adapter carries neither `organizations` nor `serviceAccounts`, the sidebar's Organizations row being the memberships' destination; `/.well-known/change-password` redirects to `/user/profile/security`, the page the W3C well-known URL must lead to | `cookie`                                                       |
| `/user/organizations`            | OrganizationsPage: the memberships under the one view toggle, list or cards, Create a team (a name is required) and a "Find an organization" link to the directory, no code form; a row or card opens the console for that organization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `cookie`, `org-console`                                        |
| `/organizations/discover`        | the shared DiscoveryPage of the pages contract over the issuer's `organizations` adapter: every organization open to discovery with its `access_mode`, `invite`, `request` or `private`, Request to join on a `request` one, no action on the others, because joining is the organization's choice of door and never a code a person types; the page and the Discover row draw on the `discover` token alone, as the pages and navbar contracts gate them, so the issuer advertises it while its directory is on                                                                                                                                                                                                                                                                  | `cookie`, `discover`                                           |
| `/org-console`                   | the shared OrgConsolePage over the active organization, grown by the issuer's fields; its crumbs are the Organizations row's child, Account, Organizations, then the active organization's name as the last crumb, plain text, the route's `crumbParent` being `/user/organizations`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `cookie`, `org-console`; `invitations` for its Invitations tab |
| `/org/invite/:token`             | InvitePage: reads the mail's token from the path once, replaces the location with `/org/invite`, posts `POST /org/invite`, JSON `{ "token" }`, and follows `next`, `/user/organizations` with the membership made, or `/login` with the page kept under `intended_url` for an anonymous visitor; a `403` `forbidden` with `code` `invite_invalid` draws the invalid state, whose link to ask for a new invitation leads to `/user/organizations`                                                                                                                                                                                                                                                                                                                                  | `cookie`, `invitations`                                        |
| `/user/applications`             | ApplicationsPage: the estate's own applications the person authorized, each with its sessions, its granted scopes and Revoke; always on the issuer, because every issuer holds registered clients and a person must be able to see and end what they granted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `cookie`                                                       |
| `/user/terms`                    | UserTermsPage: the terms and policies the person accepted across the estate's applications, each with View                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `cookie`, `policies`                                           |
| `/user/integrations`             | IntegrationsPage: third-party services alone, the external tools connected through the issuer, never an application the estate controls; drawn only while `GET /api/user/integrations` answers a `services` member, so an estate that connects none draws no page and no row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `cookie`, `integrations`                                       |
| `/notifications`                 | InboxPage: the full paged inbox as the one shared table, its row actions labeled buttons, mark all, delete all; on any UI backend that lists `inbox` beside `notifications` and answers the inbox routes, the issuer's own or relayed to it under the person's token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `inbox`, with `notifications`                                  |

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
    {
      "uuid": "…",
      "name": "Acme",
      "roles": ["OWNER"],
      "primary": true,
      "personal": false,
      "logo_url": "https://…",
      "email_hash": "…"
    }
  ],
  "preferences": {
    "language": "en",
    "mode": "dark",
    "theme": null,
    "motion": null,
    "timezone": "America/Chicago",
    "region": null,
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

The answer carries a strong `ETag`, the quoted SHA-256 hex of the body
as answered, under `Cache-Control: no-store`; a read carrying
`If-None-Match` with that tag is answered `304` with no body and the same
`ETag`, so a tab re-reading its profile on `profile-updated` or on a
stream `reset` pays nothing while its copy is current.

`picture` is the issuer's own `GET /api/user/avatar/{hash}`, which
fetches the Gravatar image once and caches it for a day, because an avatar fetched by every browser
from gravatar.com sends each person's address and referrer to a third
party from the identity provider and offers a membership oracle by
hash; avatars change rarely enough for a day's cache.

Each `organizations` member carries `logo_url`, the organization's stored
logo or `null`, and `email_hash`, the SHA-256 hex of its email or `null`,
the two values `GET /api/user/organizations` answers for the same
membership, because the chrome's organization switcher and the active
organization row draw the logo, then the Gravatar behind the hash, then
the app's mark (the navbar contract's switcher chain), and a membership
carrying neither can only ever draw the mark; the cached display fields
keep them, a logo being drawn only when it parses with the `https:`
scheme.

The rest of the group's reads, all session, all under `/api/user`:

| Route                                              | Answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/user/tfa/methods`                        | `[{ id, type, label, display, enabled, preferred }]`, passkeys included as `PASSKEY` rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/user/tfa/enroll`                         | `{ qr, secret, issuer }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/user/backup-codes/count`                 | `{ remaining }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/user/passkeys`                           | `[{ id, label, rp_id, created_at, last_used_at }]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/user/sessions`                           | `[{ id, current, client_id, client_name, user_agent, ip_address, location, authorized_at, last_accessed_at }]`; `id` is an opaque surrogate, never the session cookie's value, because a value that unlocks the session must not be readable from a page; the caller's own session carried with `current: true`, because a person who cannot see the session they are on cannot tell it from a stranger's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/user/favorites`                          | `[{ client_id, client_name, icon_url, home_url, custom_label, order }]`, the same list the profile's `favorite_apps` carries in the same `snake_case`, the one source the page and the menu on every UI backend read, Bearer or session; a `backend` UI backend proxies the path on its own origin to the issuer with the user's token, the way it proxies the hub; the claims are not a third copy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/user/organizations`                      | `{ organizations: [ … ], organizations_enabled, personal_to_team_enabled }`, one entry per membership with the console's fields: `uuid, name, personal, primary, my_role, can_manage, can_rename, is_owner, invite_code, email, website_url, logo_url, description, locale, timezone, telephone, access_mode, default_role, address{…}, members[{ user_id, email, name, role, managed_by }], pending_invites[{ id, email, role }]`, `access_mode` one of `invite`, `request` and `private`, `default_role` one of `MEMBER`, `ADMIN` and `GUEST` and a member's `role` one of `OWNER`, `ADMIN`, `MEMBER` and `GUEST`, the words the console's selects offer and the words BoxVault's record carries, one vocabulary on every UI backend because the shared console draws one select for one door; `invite_code` is present only while `can_manage`, because a plain member holding the code could grow the organization at its default role; every `logo_url` and `icon_url` the pages draw, here and in the integrations answer, is rendered only when it parses with the `https:` scheme, with `referrerpolicy="no-referrer"` on the image                                                                                                                                                                                                                                                         |
| `GET /api/user/linked-accounts`                    | `{ linked: [{ provider_id, provider_name, provider_username, provider_email, linked_at, last_used_at, icon_url, sites, compat }], available: [{ provider_id, provider_name, icon_url }] }`, the federated providers the person signed in with and the ones the site still offers; read by the profile's Security page, because a way into the account is an account security matter and never an integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /api/user/terms`                              | `[{ name, label, icon, type, version, first_accepted_at, accepted_at, versions: [{ version, accepted_at }] }]`, one row per document the person accepted across the estate's applications, `version` and `accepted_at` the latest acceptance, `first_accepted_at` the earliest, `versions` every version accepted newest first                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET /api/user/applications`                       | `[{ client_id, client_name, icon_url, registered, first_used_at, last_used_at, active_sessions, consent_required, consent_scopes }]`, the estate's own applications the person authorized                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/user/integrations`                       | `{ services: [{ id, name, icon_url, status, connected_at, settings_url, settings, subscription?, error_message? }] }`, the services connected through the issuer on the person's behalf, estate-run or third-party, `status` one of `connected`, `expired`, `error`, `settings_url` an `https:` URL the row's Manage follows in a new tab or a same-origin path it follows in-router, the issuer's own settings page of that service, `settings` the service's own object, `subscription` `{ type, started_at, expires_at }` on a paid service, `error_message` on `error`; the same rows ride `GET /api/user` as `integrations`; the first service is `hyperweaver`, its `settings` `{ servers: [{ origin, label, default }], deploy_target: "local" \| "<origin>" }`. A client that requests the `integrations` scope, listed in `scopes_supported`, carries an `integrations` claim on the access token, the id token and `/userinfo`, `[{ id, status, connected_at, settings }]`, absent when the person connected nothing, so a deploy sender reads the target with no second call, as the [Universal Deploy Contract](universal-deploy/) fixes; `services` is absent, never empty, while the issuer connects none, and the page and the sidebar row draw only while it is answered, because an application the estate controls is never an integration and a page that lists nothing misleads |
| `GET /api/organizations/discover`                  | `[{ uuid, name, description, logo_url, access_mode, member_count }]`, every organization whose `access_mode` is `invite` or `request` and, for `ROLE_ADMIN`, the `private` ones too, the shape BoxVault answers on the same path, so the shared DiscoveryPage draws the issuer's directory through the adapter's `discover` as it draws BoxVault's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/organization/{org}/requests`             | `[{ id, user: { id, name, email }, message, created_at }]`, the pending join requests of an organization, `can_manage` alone, the shape BoxVault answers on the same path, read by the console's Join requests tab through the adapter's `requests`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/user/integrations/providers/{id}/status` | `{ status: "valid" \| "revoked" \| "unknown" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/notifications?page&size&unread_only`     | `{ items, page, size, total, total_pages }` of the hub contract's rows in `snake_case`, `read_at` `null` while unread, `created_at`, the one row shape the shared `NotificationRow` draws on BoxVault, the catalog and the issuer alike; and a `navigate` the page follows when it is an `https://` URL or a same-origin path, because the issuer's own producers write `/user/profile` and `/user/integrations` and a path cannot carry a scheme; the fields the shared `NotificationRow` reads on every UI backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### What the signed-in pages send and what comes back

JSON bodies in `snake_case`; `200` with the updated record or `204`;
failures the problem body with `code`. Step-up is a window, not a body
member: `POST /api/user/step-up` with `{ "password": "…" }` or
`{ "code": "…" }` arms the session for five minutes and answers `204`
or `403 code: step_up_failed`; a sensitive call made outside the window
answers `403 code: step_up_required` and the `StepUpDialog` arms it and
retries the same call unchanged, a GET as much as a POST, because the read
that mints a secret is a change to how the account is entered. Never
`401`, because the API client
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

| Action                     | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| step up                    | `POST /api/user/step-up` `{ password }` or `{ code }` (`403` `step_up_failed`, `429` `throttled` with `wait_seconds`); `204` arms the window                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| save the details           | `PATCH /api/user`, any of `given_name, family_name, middle_name, salutation, gender, website, birthdate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| save the address           | `PUT /api/user/address`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| change the contact phone   | `POST /api/user/phone/send` `{ mobile_number }` (`429` `throttled` with `wait_seconds`), then `POST /api/user/phone/verify` `{ mobile_number, code }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| change the email           | `POST /api/user/email/request` `{ new_email }`, stepped up (`409` `unique` when taken), then `POST /api/user/email/verify` `{ code }` (`403` `invalid_code`, `expired`, the miss counted under the second-factor gate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| change or set the password | `PUT /api/user/password` `{ current_password?, password }`, stepped up (`422` on `/password`, `403` `bad_password`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| enroll SMS                 | `POST /api/user/tfa/sms/send` `{ mobile_number }` (`429` `throttled` with `wait_seconds`), `POST /api/user/tfa/sms/verify` `{ mobile_number, code, label }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| enroll an app              | `GET /api/user/tfa/enroll`, stepped up because it mints the secret the app will hold, then `POST /api/user/tfa/app/verify` `{ code, label }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| prefer a method            | `PUT /api/user/tfa/preferred` `{ authenticator_id }` or `{ method }`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| remove a method            | `DELETE /api/user/tfa/methods/{id}`, stepped up (`409` `last_method`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| enable or disable 2FA      | `PUT /api/user/tfa` `{ enabled, preferred_method? }`, stepped up (`409` `no_methods`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| passkeys                   | `POST /webauthn/register/options`, `POST /webauthn/register`, stepped up; `PATCH /api/user/passkeys/{id}` `{ label }`; `DELETE /api/user/passkeys/{id}`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| backup codes               | `POST /api/user/backup-codes`, stepped up, answers `{ codes }`, once                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| sessions                   | `DELETE /api/user/sessions/{id}`, `DELETE /api/user/sessions`, stepped up; the second answers `{ "next": "/login" }` when it ended the caller's own session too, and the page says so before asking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| favorites                  | `PUT /api/user/favorites` with the whole ordered list as `[{ client_id, custom_label, order }]`; the server answers the enriched entries from the client's own registration, so a `home_url` or `icon_url` the page sends is ignored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| preferences                | `PATCH /api/user/preferences` with `language`, `mode`, `theme`, `motion`, `timezone`, `region`, `ciba_channel` and `ciba_user_code`; `mode` `light`, `dark` or `auto`, `null` clearing it so the person follows the operating system's; `theme` a bare theme name the site offers in `brand.themes` or `null` to follow the site's own, `422` `enum` at `/theme` for any other; `region` the person's legal region, a two-letter ISO 3166-1 code or one of `EU`, `EEA`, `UK`, `null` clearing it, the value the terms page's region button writes and the terms and policy copies resolve to first (`422` `enum` on `/region` otherwise); `ciba_user_code` a string that sets the approval PIN and `null` that clears it, never read back, `ciba_user_code_set` being the read's word for it; its `400 { error }` becoming `422` with pointers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| delete the account         | `POST /api/user/deletion` `{ email_confirmation }`, stepped up (`422` on `/email_confirmation`, `409` `sole_owner` with `teams: [{ uuid, name }]`, the teams only this account owns); the server invalidates every session of the account before answering `{ next: "/login" }`, and the page drops its cache and navigates there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| organizations              | `POST /api/user/organizations` `{ name }` (`422` `required` on `/name`); per organization `PATCH …/{uuid}` (name, the profile fields, `access_mode` as `invite`, `request` or `private`, `default_role` as `MEMBER`, `ADMIN` or `GUEST`, `422` `enum` on either), `POST …/{uuid}/convert` `{ name }`, `POST …/{uuid}/invite-code` (regenerate), `POST …/{uuid}/invites` `{ email, role }` (`role` one of `ADMIN`, `MEMBER` and `GUEST`, the `invitation` form of `/api/rules`, an owner or an admin inviting a guest, an owner alone an admin), `DELETE …/{uuid}/invites/{id}`, `POST …/{uuid}/invites/{id}/resend` (no body, `can_manage` alone, answering `204` after the invitation mail is sent again, `429` `throttled` with `wait_seconds` on a repeat inside the mail's own sixty-second resend window, `404` `not_found` for an invitation that is accepted or not the organization's), `PUT …/{uuid}/members/{user_id}/role` `{ role }` (`409` `last_owner` when it would leave the team without one), `DELETE …/{uuid}/members/{user_id}`, `POST …/{uuid}/leave`, `DELETE …/{uuid}`, `PUT /api/user/primary-organization` `{ uuid }`; a refusal from the service (`Not a member`, `Insufficient organization role`, `Only the owner can invite admins`, managed rows) is `403` with `code`; no join-by-code route, because a code a person types is a secret that leaks and a door the organization never chose |
| join requests              | `POST /api/organization/{org}/requests` `{ message }` on a `request` organization, answering `201` with the request and notifying the organization's admins through the inbox (`409` `already_member`, `409` `already_requested`, `403` `not_open` on an `invite` or `private` one); `POST …/requests/{id}/approve` `{ assigned_role }` and `POST …/requests/{id}/deny`, `can_manage` alone, each answering `204`, the approve making the membership at the assigned role and the deny recording nothing but the answer; BoxVault's routes on the same paths, sent through the adapter's `join`, `approveRequest` and `denyRequest`, so the shared DiscoveryPage and the console's Join requests tab need no issuer branch; an `invite` organization is joined from the invitation mail's link alone, `/org/invite/:token` above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| linked accounts            | `POST /api/user/integrations/providers/{id}/link` with the CSRF header, stepped up, answering `{ next }` to the provider's authorization URL with a `state` bound to the session, which the callback refuses when the session did not issue it, because a link that starts on a GET can be started for a victim by any page; `DELETE /api/user/integrations/providers/{id}`, stepped up (`409` `last_login_method`); sent from the profile's Security page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| applications               | `DELETE /api/user/integrations/apps/{client_id}`, stepped up (revoke); `DELETE /api/user/integrations/apps/{client_id}/scopes/{scope}`, refused for `openid` because the application breaks without it; sent from the Applications page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| integrations               | `PATCH /api/user/integrations/{id}` with the whole `settings`, validated by the `integration-<id>` form of `/api/rules`, `422` with `errors[]` pointers and `404` for an unknown service; `POST /api/user/integrations/{id}/connect`, the `register` kind, a hyperweaver-server attaching itself with the person's token or the profile page a typed server, the first server the default and the target; `DELETE /api/user/integrations/{id}`, `204`, `404` when not connected; every write emits SCIM `userChanged` and `profile-updated` on the person's stream. A service descriptor is one of three kinds, `register`, `paste` and `redirect`, by how it is connected. The profile's Preferences section draws the `hyperweaver` service's servers and deploy target as one card, the same card at its `settings_url`, `/user/integrations/hyperweaver`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| inbox                      | the hub's `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` and `DELETE /api/notifications/{id}`; `POST /api/notifications/{id}/unread` puts one row back to unread, clearing `read_at`, answering `204` and pushing the hub's `unread-count` event the way `/read` does, `404` for a row that is not the caller's; `DELETE /api/notifications` deletes every notification of the caller and answers `204`, behind the page's Delete all confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### What the signed-in pages draw

- **ProfilePage** is the pages contract's one profile page, the same
  component on the issuer and on a `backend` UI backend, drawing its
  avatar card on `/user/profile` alone, going on the section's other
  routes since the header's avatar and name already carry that identity
  there; it keeps its `account` adapter. The profile page's `account`
  adapter carries `mutability`, the SCIM word for the record (RFC 7643
  §2.2): `readWrite` on the issuer and on a UI backend's own local
  account, `readOnly` on a UI backend whose session is an identity
  provider's, which also names `manageUrl`, the provider's
  `/user/profile`; a `readOnly` adapter draws the same sections with the
  same fields, every input `readonly` and never `disabled`, no Save, and
  one "Manage at identity provider" link in each section's heading, the
  Profile fields the standard claims of OpenID Connect Core 1.0 §5.1 the
  UI backend's `/api/userinfo/claims` answers and the Preferences the
  record's language, mode, theme, motion, time zone and region; a section
  or card whose read the UI backend lacks is absent, as every section the
  adapter does not carry is; because a client never writes an attribute
  whose mutability is `readOnly` (RFC 7644 §3.5.2), a person on any app
  of the estate must still see what the provider holds about them and
  where to change it, and the one page drawn on every UI backend is what
  convergence means. On the
  issuer it draws no tab strip, the sidebar's Profile row
  (`/user/profile`) and its child rows (`/user/profile/security`,
  `/user/profile/preferences`, `/user/profile/favorites`,
  `/user/profile/sessions`) being the one navigation, each route drawing
  its section under the page heading; the page draws a
  section only when the adapter has its calls, the one list
  `sectionsFor(account)` answers and the sidebar's children are built
  from, the way the admin page draws System only when the adapter
  carries `storage`, so the issuer's adapter draws the five sections
  below and a `backend` host's adapter, carrying `organizations` and
  `serviceAccounts`, draws the memberships and the service accounts in
  their place:
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
    imported lazily by the profile, the organization console and the
    terms page's address group alone, never by a sign-in or interstitial
    page, because the person types the same address on the terms page as
    here and gets the same help, the key is public by nature and the
    script origin is already in the policy.
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
    **Passkeys**, its own section and never a row of the
    two-factor list, since a passkey is a first factor too: the list with
    rp id and dates, rename, remove, add with a name; **Linked
    accounts**, from `GET /api/user/linked-accounts`: the federated
    providers the person signed in with (provider icon, name, "Linked
    as", last used, the live status badge for GitHub, Unlink behind a
    confirm) and the providers the site still offers with Link account,
    which posts the link route and follows its `next`, the 2FA and
    set-a-password notices beside them, because a provider that signs
    the person in is a way into the account and belongs beside the
    password and the passkeys, never on an integrations page;
    **Recovery**: the
    backup-codes count badge, warning at zero, Generate, the codes once
    with Download shown only while the codes are on screen, and
    Regenerate; **Delete account** with the email confirmation labeled
    "Type {{email}} to confirm" over an empty field, the understanding
    checkbox, the sole-owner refusal naming the teams, and a line naming
    exactly what is destroyed. Every action the server steps up opens the
    `StepUpDialog` (password, or an authenticator or backup code), which
    arms the window and retries the same call.
  - **Preferences** at `/user/profile/preferences`: language and mode as selects that
    write through on change, the same values the chrome's buttons write,
    through the same shared `useTheme` and `i18n` the chrome reads, since
    one build has one theme hook and a page reaches it as the header
    does, never through a router prop, so a change here is a change
    there and nothing is lost by leaving;
    the mode select offers Light, Dark and OS and no second "not chosen"
    value, and a Theme select while the site offers themes, "Follow this
    site" or one of them; time zone (the `Intl` zone list, the
    detected zone preselected when unset), sign-in approval channel (PUSH,
    EMAIL, SMS while a verified number exists), the approval PIN with a
    status line, "A PIN is set · Clear" or "No PIN · Set", and one Save
    for those three.
  - **Favorites** at `/user/profile/favorites`: the ordered list with drag handles and Remove, a
    select column whose header cell is a real checkbox, the select-all for
    the list, and while rows are picked the section's action pane reads
    "N selected", Clear selection and Remove, which writes the whole list
    without the picked rows through the same `PUT /api/user/favorites`;
    then
    "Available applications" from the connected apps not yet favorited with
    Add; icon chain `icon_url` → favicon of `home_url` → the app glyph;
    the page binds the navbar search with a query over the favorites and
    the available applications by label and client id.
  - **Sessions** at `/user/profile/sessions`: "Active sessions" (client, device from the user agent,
    location and address, authorized time, each row's absolute time in
    its tooltip) with Sign out per row, the current row labeled "This
    session", its Sign out the plain sign-out that answers
    `{ next: "/login" }`, and "Revoke all sessions, this browser
    included" behind a confirm that says the person will be signed out
    here too.
- **OrganizationsPage** at `/user/organizations`: Create a team (name,
  labeled and required, while `organizations_enabled`) beside a "Find an
  organization" link to `/organizations/discover`, and no Join-by-code
  form, because joining is directory-driven, a `request` organization
  asked from its card and an `invite` one entered from its mail, so a
  code field would be a second door nobody hands out; then the
  memberships under the pages
  contract's one view toggle, list or cards, the choice kept as `view`
  inside `table_prefs_organizations`, one row or one card per
  membership (name, Personal, Primary, your role, Make primary, and only
  while `can_manage` the invite code with Regenerate) whose View button,
  Manage for a manager, sets the active organization and opens
  `/org-console`, so a plain member reaches the read-only console too; a `#<uuid>` in the URL
  does the same on load, so BoxVault's "manage at the provider" link
  lands. On the issuer the switcher's active organization is the
  console's context and nothing else, and the card's Make primary is the
  one place the primary organization changes, so the switcher modal's
  subline on the issuer reads "Console context; the primary organization
  is set on the Organizations page", because a person who expects the
  switcher to change their primary organization would otherwise look for
  the change and not find it; the page binds the navbar search with a
  query over the memberships by name and its Columns group in list view.
- **OrgConsolePage** on the issuer draws, beyond the shared record
  (name, email, description, access mode, default role), the profile the
  issuer stores (website, logo URL, locale, time zone, telephone, the
  `AddressFields`, every field labeled), Convert to a team on a personal
  organization, Leave and Delete, the members table with the role select
  for an owner over the four roles, Owner, Administrator, Member and
  Guest, disabled on the last owner's own row so a team is never
  left without one, and Remove while `can_manage`, a managed row's source
  in place of the controls, Invite (email, role, `MEMBER` or `GUEST`,
  `ADMIN` for an owner only)
  and the pending invitations with Revoke and Resend, one tab's content on
  screen at a time; the Members and Invitations tabs each carry a select
  column whose header cell is a real checkbox, the select-all for the
  list, and while rows are picked the tab's action pane reads "N
  selected", Clear selection, then on Members Change role (a role select)
  and Remove and on Invitations Revoke and Resend, each sent as the
  existing per-row route once per picked row, the last-owner and
  managed-row guards refusing per row, the result line
  naming processed, skipped and errors; the Join requests
  tab draws while `access_mode` is `request`
  and the person holds `can_manage`, its rows from
  `GET /api/organization/{org}/requests` with Approve (the role select,
  the default role preselected) and Deny, because the issuer's adapter
  carries `requests` and `discover` as BoxVault's does, and the shared
  console needs no issuer branch to draw them; a `private` organization
  is reached by no directory card and no request, its members invited
  by mail alone. A member without `can_manage`
  sees the record and the members list read-only and nothing else: the
  rename and profile fields need `can_rename`, the invite code, Remove,
  Invite and the pending list need `can_manage`, the role select, the
  default role and Delete need `is_owner`; a `guest` is read-only below
  member: sees what a member sees, every write control absent, may
  leave. The console lives at
  `/org-console` and is reached from the Organizations row's Manage, so
  it crumbs as that row's child, Account, Organizations, then the active
  organization's name as the last crumb, plain text, the route table
  naming `/user/organizations` as the route's `crumbParent` and the
  shell drawing the name from the active membership, because the crumb
  is where the person came from and the console is named by the
  organization it shows, never by a title.
- **ApplicationsPage** at `/user/applications`, from
  `GET /api/user/applications`: one `MethodRow` per application the
  person authorized (icon, name, active-session and unregistered badges,
  first and last used, the permission chips each with a 24px remove
  control labeled "Remove {{scope}} permission", none on `openid`, a
  "Sessions" button to the profile's Sessions page, Revoke access behind
  a confirm that lists the sessions it ends); the page draws on every
  issuer, because the estate's applications are the issuer's own clients
  and never integrations; the page binds the navbar search with a query
  over the applications by name.
- **UserTermsPage** at `/user/terms`, from `GET /api/user/terms`: one
  row per accepted document (icon, label, type badge, the version
  accepted last with its accepted time, first accepted, a fold listing
  every earlier version accepted with its time from `versions`, View to
  `/public/policies/<name>`), drawn while the issuer advertises
  `policies`; the page binds the navbar search with a query over the
  documents by label.
- **IntegrationsPage** at `/user/integrations`, from
  `GET /api/user/integrations`: one `MethodRow` per third-party service
  (icon, name, the status badge, connected time, Manage following
  `settings_url` in a new tab with `rel="noopener noreferrer"`), drawn
  only while the answer carries `services`, the route and the sidebar row
  absent otherwise; no linked account, no accepted document and no
  application of the estate ever draws here, because an integration is
  a service the estate does not control and the other three are the
  person's own account, records and grants; the page binds the navbar
  search with a query over the services by name.
- **InboxPage**: a `SectionHeading`, its title Inbox, the total as muted
  text after the title, and the section's one action pane at its right:
  picked rows read "N selected", Clear selection, Mark as read, Mark as
  unread (one `POST /api/notifications/{id}/unread` per picked row)
  and Delete (behind a confirm), then Mark all as read and
  Delete all (behind a confirm), each bulk action one existing per-row
  call per picked row counted into a result line under the heading
  naming processed, skipped and each error's code; the rows in the one
  shared `SubTable`, its select column a real checkbox header, the
  select-all for the page, never a button or link of its own, the row
  checkboxes its cells, the columns Title (the type icon colored by
  severity, the title bold while unread and a link with the open-in
  glyph while the row's `navigate` is followable, the unread dot), Body,
  Time (the relative time with the absolute time in its tooltip) and
  Type (a badge, hidden by default); the row actions as labeled outline
  buttons, Mark as read while unread, View details while the row carries
  a followable link, following `navigate`, and Delete; the page size
  from the panel's Per page group and the pager as the section's foot;
  an empty page drawing the shared empty placard, `inbox.empty`, or
  `pages.noMatches` while narrowed; the Status (unread, read) and Type
  groups narrowing the loaded rows client-side, the Per page and Columns
  groups, the sort, the hidden columns, the widths and the size under
  `table_prefs_inbox` through the shared `useListSearch`,
  the navbar's count the rows on screen; the unread badge on the chrome
  updated through the notifications feature's one context, which the
  modal, the page and the badge share, the `unread-count` event
  correcting it where the stream carries the `notifications` topic; the
  topic's row events applied in place with no read, a created row on the
  first page alone, the total following; no router prop carries a
  callback to a page; the page binds the navbar search with a query over
  the loaded rows by title and body.

### Shared components the signed-in pages add

| Component                 | Why shared                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AddressFields`           | the postal address block with country select and state suggestions, optional Places autocomplete; the profile, the organization profile, the terms collection fields                                                                           |
| `StepUpDialog`            | "Confirm it's you" with a password or a code; any UI backend that step-ups a sensitive change                                                                                                                                                  |
| `MethodRow`, `MethodList` | a list row with an icon, a label, a subline, badges and trailing actions; 2FA methods, passkeys, linked accounts, connected apps, sessions                                                                                                     |
| `SortableList`            | drag-to-reorder over a keyed list; favorites and the config editor's `orderable` arrays                                                                                                                                                        |
| `Pager`                   | the section foot of the inbox and of the admin tables                                                                                                                                                                                          |
| `InboxList`               | the row list the notifications modal draws; the page draws its rows through `SubTable` and shares `NotificationGlyph`, `absoluteTime`, `extractEntries` and `linkOf` from the same module                                                      |
| `useListSearch`           | the navbar binding of a paged list: its filter groups, the client-side groups, the Per page and Columns groups, the sort, the hidden columns, the widths and the page size under one `table_prefs_*` key; the inbox and every admin table page |
| `RecordRows`              | the read-only rows of one record, a label column and a value column; the organization console's profile of an IdP-managed organization on a `backend` host and the user record page                                                            |

`Pager` becomes a section's foot: centered under the table or list, the
page buttons one row and the "Showing a to b of n" line its own centered
row under them, never in the heading, whose action pane keeps the
section's actions. A paged list's page size joins the navbar panel as a
"Per page" pill group (25, 50, 100, 250) after the page's own groups and
before Columns, columns-like so Clear filters leaves it alone, kept in
`table_prefs_*` as `size` beside sort, hidden columns and folds. A row's
More menu is the shared `RowMenu`, escaping the table wrap and the
page's one scroll region rather than being clipped by either.

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
`useCode`, `confirm`), `preferences.*` (`language`, `mode`, `mode.light`,
`mode.dark`, `mode.auto`, `theme`, `theme.follow`, `timezone`, `timezoneHint`, `channel`,
`channel.*`, `pin`, `pinSet`, `pinNone`, `set`, `clear`, `save`),
`favorites.*` (`title`, `available`, `add`, `remove`), `sessions.*`
(`title`, `signOut`, `revokeAll`, `revokeAllBody`, `authorized`,
`lastActive`); `organizations.*` gains `create`, `name`, `find`,
`inviteCode`, `regenerate`, `view`, `manage`, `makePrimary`, `leave`,
`personal`, `primary`, `yourRole`; the directory and the join-request
dialog draw the shared `discovery.*` and `orgConsole.requests.*` keys
the pages contract already lists; `orgConsole.*` gains the issuer's
fields (`website`, `logoUrl`, `locale`, `timezone`, `telephone`,
`convert`, `convertName`, `delete`, `leave`, `managedBy`, `lastOwner`);
`security.linked.*` (`title`, `linkedAs`, `lastUsed`, `status.*`,
`unlink`, `unlinkBody`, `available`, `link`); `applications.*` (`title`,
`sessions`, `revoke`, `revokeBody`, `removeScope`, `unregistered`,
`activeSessions`, `none`); `userTerms.*` (`title`, `version`,
`accepted`, `view`, `none`); `integrations.*` (`title`, `connected`,
`manage`, `status.*`); `inbox.*` gains `title`, `markAll`,
`deleteAll`, `deleteAllBody`, `markRead`, `delete`, `viewDetails`,
`bulk.*` for its picked-state Mark as read and Delete actions, the same
`pages.selectColumn` naming its select column's checkbox;
`errors.*` gains `step_up_required`, `step_up_failed`, `last_method`,
`no_methods`, `sole_owner`, `already_member`, `already_requested`,
`not_open`, `last_login_method`, `last_owner`. Every key mirrored in
`es` and `cimode`.

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
Client health, Provider health), Security (Blocked IPs), Legal (Terms),
Messaging (Email templates) and System
(Configuration), one page per entry, every entry a deep link, and no page draws a tab strip of the same names beside the rows,
because one navigation on screen twice is one too many; the chrome's
user menu carries no Admin row on the issuer, since the column holds
every operator page, every `/admin/*` path the Thymeleaf sidebar linked
stays as the route of its entry, and the JSON routes land under
`/api/admin/*`, where the session-plus-CSRF principal joins the Bearer
principal.

### Admin routes

| Route                                                                                       | Entry                                                                                                                                                                                                                                                                                                                              | Gate                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `/admin`, `/admin/dashboard`                                                                | Overview › Dashboard: the five stat cards linking to their entries, the login map, recent logins and registrations, the restart card while a restart is pending                                                                                                                                                                    | `cookie`, `admin`                   |
| `/admin/users`                                                                              | Accounts › Users: the query and filters in the navbar module, the sortable table, the action pane's bulk actions, roles, customer id, primary organization, suspend, delete, rate limits; the page takes a `users` adapter, and a `backend` UI backend draws the same page at the same route over its own accounts                 | the same, or `backend` with `admin` |
| `/admin/users/:id`                                                                          | Accounts › Users › the account: one user's record page over the same `users` adapter, the route's page `user`, on `cookie` and `backend` alike                                                                                                                                                                                     | the same, or `backend` with `admin` |
| `/admin/organizations`                                                                      | Accounts › All organizations: the table, a select column, Edit over the whole record, delete, the action pane's bulk actions (Suspend, Resume, Delete); the page takes an `organizations` adapter, and a `backend` UI backend draws the same page at the same route over its own organizations, its bare `/admin` redirecting here | the same, or `backend` with `admin` |
| `/admin/logins`, `/admin/registrations`, `/admin/sessions`                                  | Activity › Logins, Registrations, Sessions: one page per row, with filters, presets, JSON export, and revoke on sessions                                                                                                                                                                                                           | the same                            |
| `/admin/service-usage`, `/admin/insights`, `/admin/client-health`, `/admin/provider-health` | Health › Service usage, Insights, Client health, Provider health: one page per row; the usage report, the fleet insights, the client probes, the provider probes                                                                                                                                                                   | the same                            |
| `/admin/brute-force`                                                                        | Security › Blocked IPs: the status line, the table, Unblock, Unblock all                                                                                                                                                                                                                                                           | the same                            |
| `/admin/terms`                                                                              | Legal › Terms: the documents as cards, each with its copies, create, edit, copy, preview, delete                                                                                                                                                                                                                                   | the same, `policies`                |
| `/admin/email-templates`                                                                    | Messaging › Email templates: the nine kinds as cards, each with its copies per site and locale, create, edit, preview, history, publish, delete                                                                                                                                                                                    | the same                            |
| `/admin/config`                                                                             | System › Configuration: the shared config editor                                                                                                                                                                                                                                                                                   | the same                            |
| `/error`                                                                                    | ErrorPage: status, reference, path from the URL                                                                                                                                                                                                                                                                                    | none                                |

`error` joins the reserved first segments (`admin` already is).

### The sidebar export

Two features export the issuer's column, and the router hands their
concatenation to `AppShell` as the navbar contract's Sidebar section
fixes it, the catalog feature's Browse group drawing before them on a
host mounting a collection, for every visitor while it lists `browse`
and for a `ROLE_ADMIN` account alone while it lists `admin` instead,
which the issuer, listing none, never does.
The profile feature's `sidebar(status, account, integrations, profile)`
over the host's profile adapter answers, for
every signed-in person, one group
`{ key: 'account', labelKey: 'account.sidebar.title', sections, tree? }`
with one section, Account: Profile (`/user/profile`),
Organizations (`/user/organizations`, while the UI backend advertises
`org-console`), Applications (`/user/applications`, always on the
issuer), Terms and policies (`/user/terms`, while `policies`), Inbox
(`/notifications`, while `inbox`, the unread count as its `badge`,
resolved by the shell from the `notifications` topic's `unread-count`),
and last, as the group's `tree` while `integrations` is
advertised, Integrations (`/user/integrations`, one node while
`GET /api/user/integrations`, read once when the tree mounts, answers
`services`, and none otherwise), because a row that exists only once a
read has answered is a tree node, a tree draws after the sections, and
a row that opens an empty page misleads; the row is named Inbox rather than
Notifications because the user menu's Notifications row opens the
modal, and two rows with one word and two destinations confuse. The
Profile row is itself the profile page (`/user/profile`, `end: true`)
and carries `children`, the word the tree's node shape uses, here a
list of rows in the row shape rather than a function because a row is
named by a key: one row per section of the pages contract's
`sectionsFor(profile, account.organizations, isGlobalAdmin(account.user))`
after Profile itself, on the issuer exactly
Security (`/user/profile/security`), Preferences
(`/user/profile/preferences`), Favorites (`/user/profile/favorites`) and
Sessions (`/user/profile/sessions`), never a second Profile, each a deep
link into the same page, the parent active on its exact path alone and a
child row active by route, so the word Profile is drawn once in the
column, and the tab strip gone on the issuer, since
the column is the one navigation; a `backend` UI backend's export answers
the same group with the same Profile row at `/profile` and its children
from the same list over that host's adapter, Security, Organizations
and, while one of the account's memberships holds a role beyond guest or
the account is a global admin, Service accounts, so the column never
lists a section the page cannot draw. On the
issuer a person's pages are the whole site, so the column draws on every page for
every signed-in person and those pages are never behind the user menu
alone. The operator's sections are the identity feature's own export, mounted like every identity page
when the first `auth` token is `cookie`, answering `[]` unless the UI
backend advertises `admin` and the account holds `ROLE_ADMIN`, under
`roles` or `authorities`, the one predicate `isGlobalAdmin` that every
sidebar export and the shared admin
feature's read, else one group `{ key: 'admin', labelKey: 'admin.sidebar.title',
sections }` with the eight sections above in that order, each row
`{ key, icon, labelKey, to, end?, badge?, external? }`, the Dashboard row with
`end: true`, the Accounts section's second row labeled "All
organizations" with a glyph other than the Account section's
Organizations row, the Terms section present only while the UI backend
also advertises `policies`, the Blocked IPs row carrying `badge:
'blockedCount'`, which the shell resolves from the `admin` topic's
`blocked-count` event after one read of `GET /api/admin/brute-force/count`
on connect and never from a timer, and the System section with its
Configuration row present exactly while `status.config` names a file,
an in-router link to `/admin/config`, the
shared configuration page; the row alone while the list
names one file, and while it names more than one the group's `tree` in
the row's place, the shared `useConfigTree`, fed the admin
adapter's `config` because the shared layer imports no feature's api and
the identity feature imports no other feature, and the System heading's
key, answered beside the nodes as the tree's `labelKey` so the heading
is drawn above it in the section's place, since a tree draws after
every section and without the heading the Configuration node reads as a
row of Messaging, answering one
Configuration node with no route of its own, folding on click and never
navigating, whose children are one node per
name in list order, labelled by the schema's root `title` once
`GET /api/config/<name>/schema` has answered and by the name when it
does not, each a deep link to `/admin/config/<name>`, the bare
`/admin/config` redirecting to the first file's route so a deep link
still lands, so the word
Configuration is drawn once in the column, a file is a place the
column names, never a strip the page draws, and no two rows open one
page. The shared
admin feature keeps its entries, Users and Organizations at
`/admin/users` and `/admin/organizations` (the identity feature's Users
and All organizations pages over the adapter's `users` and
`organizations`, the bare `/admin` redirecting to the organizations),
Configuration and System at `/admin/config` and `/admin/system`, each
drawn only while the adapter carries `users`, `organizations`, `config`
or `storage`, its Configuration entry the same tree over `status.config`
while the list names more than one file; on the issuer the router mounts
the identity feature's column in
place of the shared feature's entries, and the shared feature's
Configuration page answers `/admin/config` and `/admin/config/<name>`
behind the column's Configuration entry over an adapter carrying
`config` alone, one file per route and no tab strip; the shared feature
never branches on the UI backend's role, because a UI
backend that needs a different column adds a feature and opts into it,
never a role branch inside a shared one. The column shows the brand at
its top, one link to `/`, and the header row carries no brand and no
root crumb, the crumbs alone (`Account › Profile`, `Admin › Users`), the
group a plain word and the row the last crumb, plain text; on a child
route the breadcrumb reads the group, the parent row, then the child's
label (`Account › Profile › Favorites`), the parent a link
to its own page and the child the last crumb; the user
menu keeps its universal rows, its Preferences row an in-router link to
`/user/profile/preferences`, its app section headed by `brand.name`
holding the About row, an in-router link to `/about` that always exists
on the role, and the Docs and Contact rows exactly as every other UI
backend draws them, Docs from `links.docs` and Contact from
`links.contact`, each absent while empty, the section drawn while any
row exists and so always on the role, because the column carries no
About row and the About page is where a person reads the role's
version chips and reports a fault, so it must be reachable from the one
control on every page; the menu's Help row stays the ticket, the
signed-out navbar carrying the ticket icon alone and neither link; and
no Admin row, since Dashboard is a
row of the column and a destination lives in the column or the menu,
never both, Preferences being the one named exception because the
avatar is the one control on every page.
The column and the app section are hidden on every route of the
sign-in, onboarding and interstitial groups and on `/error`, where the
page is the whole screen. On a `backend` UI backend the profile feature
exports the Account group with the Profile row at `/profile` and its
children alone, drawn after the catalog's group, because there a
person's pages are one row beside the collections.

### What the UI backend answers for admin

Every read is session or Bearer with `ROLE_ADMIN`; a paged list answers
`{ "items": [], "page", "size", "total", "total_pages" }`.

| Route                                                                                                                                             | Answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/stats`                                                                                                                            | `{ total_users, logins_today, registrations_this_week, failed_logins_today, active_sessions, recent_logins: [{ username, city, country, success, timestamp }], recent_registrations: [{ username, email_verified, timestamp }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /api/admin/login-heatmap?days`                                                                                                               | `{ tiles: { url, attribution, max_zoom, referrer_policy }, points: [{ city, country, lat, lng, count }] }`; the tile settings ride along so the page reads no configuration of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/admin/logins?username&success&start_date&end_date&page&size`                                                                            | items `{ timestamp, username, success, failure_reason, ip_address, city, country, user_agent }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/admin/registrations?username&start_date&end_date&page&size`                                                                             | items `{ timestamp, username, email_verified, phone_verified, ip_address, city, country }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/admin/sessions?page&size`                                                                                                               | items `{ id, full_name, client_name, ip_address, location, user_agent, authorized_at, last_accessed_at }`, `id` an opaque surrogate as on the profile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET /api/admin/users?search&enabled&using_2fa&has_customer_id&active_after&sort&direction&page&size`                                             | items `{ id, username, full_name, customer_id, enabled, using_2fa, roles: [], organizations: [{ uuid, name, role, primary, personal }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/admin/users/{id}`                                                                                                                       | one user item in the list's shape, `404` `not-found` for an id no user carries, so a link that carries the id alone (`/admin/users/42`) reads its row in one request and never walks the list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/admin/roles`                                                                                                                            | `["ROLE_USER", "ROLE_ADMIN", …]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/admin/organizations`                                                                                                                    | `[{ id, uuid, name, personal, invite_code, customer_id, created_at, member_count, email, website_url, logo_url, description, locale, timezone, telephone, address{…}, access_mode, default_role }]`, the record's editable fields riding the list so the Edit dialog prefills from the row in hand and reads nothing more                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/admin/service-usage`                                                                                                                    | `{ total_sessions, total_authorizations, items: [{ client_id, client_name, active_sessions, total_authorizations, unique_users, first_used_at, last_used_at }] }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /api/admin/insights`                                                                                                                         | `{ active_users: { daily, weekly, monthly, quarterly }, posture: { total_users, enabled_users, disabled_users, using_2fa, email_verified, phone_verified, admins, never_logged_in, with_local_auth, with_external_auth, with_linked_provider }, app_activity: [{ client_id, client_name, active_30d, adopted_30d, total_users }], penetration: [{ app_count, users }], app_pairs: [{ app_a, app_b, users }], growth: [{ week, count }], churn: { quiet_30, quiet_60, quiet_90, enabled_total }, quiet_users: [{ username, last_login_at }], org_rollup: [{ name, customer_id, personal, members, active_30d }] }`, every member in `snake_case`, `week` an ISO date, `last_login_at` an instant or `null`, `app_a` and `app_b` client names                                |
| `GET /api/admin/client-health`                                                                                                                    | `{ summary: { status, healthy, total }, clients: [{ client_id, client_name, description, base_url, check, endpoint, healthy, status, response_time_ms, last_checked, error_message }], providers: [ the same ] }`; `healthy` is `null` for a client that cannot be probed; `check` names the probe the server performed, `actuator_health` (a GET of `<base_url>/actuator/health`, answering `online` or `unhealthy`) or `http_reachability` (a GET of `base_url` itself, tried when the health endpoint answers `404` or fails, answering `reachable`, `unreachable` or `offline`), and `endpoint` is the exact URL that probe requested; both are `null` on a row that was not probed, so the card draws what the server did and never a fixed line                      |
| `GET /api/admin/brute-force`                                                                                                                      | `{ enabled, blocked: [{ ip, attempts }] }`; `GET /api/admin/brute-force/count` answers `{ count }` once when the stream connects, and every change after rides the `admin` topic's `blocked-count` event, so the column drawn on every page never fetches the table and never runs a timer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/admin/rate-limit/{user_id}`                                                                                                             | `{ sign_in: { armed, wait_seconds }, tfa: { "SMS": "locked" \| "armed" \| "clear", "APP": …, "BACKUP_CODE": … }, banned }`, the three gates the Rate limits dialog draws; `GET /api/admin/rate-limit/banned` the banned ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/admin/terms`, `GET /api/admin/terms/placeholders`                                                                                       | one row per document `[{ name, friendly_name, icon, type, is_public, copies: [{ id, regions, version, revision, content, created_by, updated_at }] }]`, `type` and `is_public` the document's, `copies` its copies with `id` the copy's own id, the one handle a copy has since every copy shares the name, `version` the copy's live version and `revision` the live revision under it, `regions` a list of ISO 3166-1 alpha-2 codes or the sets `EU`, `EEA`, `UK`, empty for the default copy, the one for everywhere no copy claims, a document without one being region-only; two copies of one document never overlap, refused `409 unique` at `/regions`; the placeholder list `[{ name, scope, description }]`                                                      |
| `GET /api/admin/terms/{name}/history?region=`, `GET /api/admin/terms/{name}/history/{version}/{revision}?region=`                                 | the copy's history, the default copy unless `?region=` names one the copy's `regions` carries: the first answers `{ name, region, versions: [{ version, revisions: [{ revision, published_by, published_at, current }] }] }`, versions and revisions newest first, `current` true on the live revision alone; the second answers one revision, `{ version, revision, published_by, published_at, content }`, `content` the raw markdown, `404` `not_found` for a version or revision the copy never had                                                                                                                                                                                                                                                                    |
| `GET /api/admin/email-templates`, `GET /api/admin/email-templates/arguments`                                                                      | one row per kind, every kind always, `[{ kind, copies: [{ id, site, locale, version, revision, subject, body, created_by, updated_at }] }]`, `kind` one of the nine the server sends, `copies` its copies with `id` the copy's own id, `site` a site id or empty for the default copy, `locale` a BCP 47 tag or empty for the site's default, `version` the copy's live version and `revision` the live revision under it, `copies` never empty, every kind carrying its seeded default copy with `site` and `locale` both empty; two copies of one kind never share a site and a locale, refused `409 unique` at `/site`; the arguments `[{ kind, arguments: [{ index, name, description }] }]`, the fixed list per kind the server formats the subject and the body with |
| `GET /api/admin/email-templates/{kind}/history?site=&locale=`, `GET /api/admin/email-templates/{kind}/history/{version}/{revision}?site=&locale=` | the copy's history, the default copy unless `site` and `locale` name one: the first answers `{ kind, site, locale, versions: [{ version, revisions: [{ revision, published_by, published_at, current }] }] }`, versions and revisions newest first, `current` true on the live revision alone; the second answers one revision, `{ version, revision, published_by, published_at, subject, body }`, `body` the raw HTML, `404` `not_found` for a version or revision the copy never had                                                                                                                                                                                                                                                                                    |
| `GET /api/admin/dcr/clients`                                                                                                                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/config/<name>`, `GET /api/config/<name>/schema`, `GET /api/config/restart-status`                                                       | the config contract's section 3 answers, `<name>` a member of `status.config`; `restart-status` is `{ restart_required, requires_restart, last_modified_by, last_modified_time }`, read once when the stream connects, every change after riding the `admin` topic's `restart-required` event                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### What the admin pages send and what comes back

JSON bodies in `snake_case`; `204` or the updated record; failures the
problem body with `code`.

| Action                    | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| suspend or enable a user  | `PATCH /api/admin/users/{id}` `{ enabled }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| customer id               | `PATCH /api/admin/users/{id}` `{ customer_id }` (`422` `pattern` on `/customer_id`, six hex characters)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| primary organization      | `PATCH /api/admin/users/{id}` `{ primary_organization }` (uuid; `422` `not_a_member`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| roles                     | `PUT /api/admin/users/{id}/roles` `{ roles: [] }`, one call (`403` `own_privileged_role`, `422` `unknown_role`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| delete a user             | `DELETE /api/admin/users/{id}`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| bulk                      | `POST /api/admin/users/bulk` `{ action, user_ids: [], role, customer_id, primary_organization }`, `action` one of `enable`, `suspend`, `add_role`, `remove_role`, `delete`, `set_customer_id`, `set_primary_organization`, `revoke_sessions`, `unlock`; `role` present for the two role actions, `customer_id` for `set_customer_id` (six hex characters, or empty to clear, `422` `pattern` at `/customer_id`), `primary_organization` for `set_primary_organization` (a uuid, `404` when no organization carries it); answering `{ processed, skipped, errors: [{ id, code }] }`, every skipped row named in `errors` with its code (`self`, `not_found`, `not_a_member`), `422` `enum` at `/action`, `422` `required` at `/user_ids`; the delete and revoke_sessions actions stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| revoke a session          | `DELETE /api/admin/sessions/{id}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| sessions bulk             | `POST /api/admin/sessions/bulk` `{ action: "revoke", session_ids: [] }`, `id` the opaque surrogate the sessions list carries, answering `{ processed, skipped, errors: [{ id, code }] }`, an unknown id skipped with `not_found`, `422` `enum` at `/action`, `422` `required` at `/session_ids`, stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| delete an organization    | `DELETE /api/admin/organizations/{id}` (`409` with `code` for the service's refusal)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| edit an organization      | `PATCH /api/admin/organizations/{id}`, any of `name`, `email`, `website_url`, `logo_url`, `description`, `locale`, `timezone`, `telephone`, `address`, `access_mode`, `default_role`, `customer_id` (an empty `customer_id` clears it), answering `200` with the record, `422` with a pointer per failing field (`pattern` on `/customer_id`, six hex characters; `enum` on `/access_mode` and `/default_role`), `409` `unique` on `/name`; the same fields the organization's own owner edits through `PATCH /api/user/organizations/{uuid}`, so the admin's form and the console's form describe one record and the `organization` form of `/api/rules` bounds both                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| organizations bulk        | `POST /api/admin/organizations/bulk` `{ action, organization_ids: [], customer_id, access_mode, default_role }`, `action` one of `suspend`, `resume`, `delete`, `set_customer_id`, `set_access_mode`, `set_default_role`, `regenerate_invite_code`; `customer_id` for `set_customer_id` (six hex characters or empty to clear, `422` `pattern` at `/customer_id`), `access_mode` for `set_access_mode` (`invite`, `request` or `private`, `422` `enum` at `/access_mode`), `default_role` for `set_default_role` (`MEMBER`, `ADMIN` or `GUEST`, `422` `enum` at `/default_role`); answering `{ processed, skipped, errors: [{ id, code }] }`, a personal organization skipped with `personal` for the access mode, default role and invite code actions, an unknown id with `not_found`, `422` `enum` at `/action`, `422` `required` at `/organization_ids`; the delete action stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| unblock an address        | `DELETE /api/admin/brute-force/{ip}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| unblock every address     | `DELETE /api/admin/brute-force`, answering `204`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| unblock a selection       | `POST /api/admin/brute-force/bulk` `{ action: "unblock", addresses: [] }`, answering `{ processed, skipped, errors: [{ id, code }] }`, `id` the address, an address not on the blocked table skipped with `not_blocked`, one `blocked-count` event after the whole selection, `422` `enum` at `/action`, `422` `required` at `/addresses`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| rate limit                | `POST /api/admin/rate-limit/{user_id}/unlock`, `/tfa-unlock` with `{ "method": "SMS" \| "APP" \| "BACKUP_CODE" }` (`422` `enum` on `/method`), `/ban`, `/unban`, the last three with no body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| terms                     | `POST /api/admin/terms` `{ name, regions, friendly_name, icon, version, type, is_public, content }` (`409` `unique` on `/name` when a default copy of the name exists, on `/regions` with `params.scope` the name when another copy claims a country of the set), creating the copy at revision 1 of its `version`; `PATCH /api/admin/terms/{name}` any of `friendly_name`, `icon`, `type`, `is_public`, `regions` and `content`, the Save act: a `content` member writes revision r+1 under the copy's current version, changes the live text and re-prompts nobody, and a `version` member is refused `422` `readOnly` at `/version`, because the version changes only by publishing; `DELETE /api/admin/terms/{name}`; the three addressing the default copy unless `?region=` names one the copy's `regions` carries; each saved at once. `regions` is a list of ISO 3166-1 alpha-2 codes or the sets `EU`, `EEA`, `UK`; empty is the default; `type` and `is_public` belong to the document, so a `POST` or a `PATCH` carrying either writes it to every copy. The issuer's `/api/rules` carries a `terms` form, its members bounded as the validation contract's Forms table lists them: `name` is `$defs.slug` and `unique` among the default copies, because it becomes the `/public/policies/<name>` and `/api/admin/terms/{name}` segment; `icon` is `$defs.iconName` and is drawn only as a class attribute; the placeholders are a fixed list replaced by string substitution and never evaluated, so the editor can never reach a template engine |
| publish terms             | `POST /api/admin/terms/{name}/publish` `{ version, content }`, the default copy unless `?region=` names one the copy's `regions` carries, the Publish act: `version` required and different from the copy's current one (`409` `unique` at `/version` with `params.scope` the copy when it equals an existing version of that copy, the validation contract's rule for every taken value), `content` optional and the current text when absent; it writes revision 1 of the new version, makes it the live text and notifies every prior acceptor of that copy, so they are stepped up at their next sign-in or authorize                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| terms bulk                | `POST /api/admin/terms/bulk` `{ action, ids: [] }`, `action` one of `delete`, `set_public`, `set_private`, `ids` the copies' ids since every copy of a document shares its name, answering `{ processed, skipped, errors: [{ id, code }] }`, an unknown id skipped with `not_found`, `422` `enum` at `/action`, `422` `required` at `/ids`; the delete action stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| email templates           | `POST /api/admin/email-templates` `{ kind, site, locale, version, subject, body }` (`422` `enum` at `/kind`, `409` `unique` at `/site` when a copy of the kind already carries the same site and locale), creating the copy at revision 1 of its `version`; `PATCH /api/admin/email-templates/{kind}` any of `subject` and `body`, the Save act: revision r+1 under the copy's current version, the live text changed, and a `version` member refused `422` `readOnly` at `/version`; `DELETE /api/admin/email-templates/{kind}`, refused `409` `conflict` with `code` `default_copy` for the default copy of a kind, which is seeded at first boot and never deleted; the two addressing the default copy unless `?site=&locale=` names one, the site's default copy on `site` alone; a `{n}` beyond the kind's argument list refused `422` rule `format` at `/subject` or `/body` with `params: { argument: n }`, because a `MessageFormat` given fewer arguments than the text names leaves the brace in the mail; the arguments are substituted by the server, the body's HTML-escaped and the subject's plain, and the template is never sanitized, being the administrator's                                                                                                                                                                                                                                                                                                                                                                             |
| publish an email template | `POST /api/admin/email-templates/{kind}/publish` `{ version, subject?, body? }`, the default copy unless `?site=&locale=` names one, the Publish act: `version` required and different from the copy's current one (`409` `unique` at `/version` with `params.scope` the copy), `subject` and `body` optional and the current text when absent; it writes revision 1 of the new version and makes it the live text; nobody is notified, a template having no acceptors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| email templates bulk      | `POST /api/admin/email-templates/bulk` `{ action: "delete", ids: [] }`, `ids` the copies' ids, answering `{ processed, skipped, errors: [{ id, code }] }`, an unknown id skipped with `not_found`, a default copy with `default_copy`, `422` `enum` at `/action`, `422` `required` at `/ids`; stepped up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| revoke a dynamic client   | `DELETE /api/admin/dcr/clients/{id}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| export                    | `GET /api/admin/export/logins`, `/registrations`, `/users` with the navbar panel's query and filters as its parameters, the panel's one registered action on Users, Logins and Registrations and never a button on the page, a top-level navigation answering `application/json` as an attachment, the same rows the table draws, because a CSV opened in a spreadsheet executes a cell that an attacker typed as a username or a user agent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| configuration             | `PUT /api/config/<name>`, the config contract's merge patch (`422` with a pointer per failing path), `POST /api/config/restart` and `POST /api/admin/config/rotate-signing-key` → `{ kid }`, each stepped up and behind a `ConfirmModal` because one click must not restart the issuer or retire its signing key, the SMTP test the mail section's `test` action of the config contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

The generic text of each email-template kind is its default copy,
seeded: shipped in the jar as one seed file per kind,
`email-templates/<kind>.json` carrying `{ kind, subject, body }`, and
written to the database once, at the first boot that finds no default
copy of the kind, at version `1.0` revision 1 with `created_by` and
`published_by` `seed`, never overwritten by a later boot, editable like
any copy and never deletable; no site key names kinds, and a send
resolves the site's copy in the person's locale, then the site's default
copy, then the default copy in the locale, then the default copy, and
nothing else, so a fresh install sends mail with no configuration and
`messages.properties` carries no email text, neither a brand's
`<siteId>.email.*` key nor a bare `email.*` key.

### What the admin pages draw

- **The admin pages** are one page per sidebar entry of the identity
  feature, each reading its own calls and drawing in the
  scroll region beside the column; the shared System page is not among
  the issuer's entries because its adapter carries no `storage`. The
  Users and All organizations pages take their reads and actions through
  an adapter the router hands in, the issuer's built from the identity
  feature's own api (`issuerUsers`, `issuerOrganizations`) and a
  `backend` UI backend's from its own accounts, so BoxVault draws the two
  pages at `/admin/users` and `/admin/organizations`: `users` is
  `{ list(params), get(id), roles?, update?, setRoles?, suspend?, resume?, remove?, bulk?, rateLimit?: { read, unlockSignIn, unlockMethod, ban, unban }, exportUrl? }`,
  `get(id)` the issuer's `GET /api/admin/users/{id}` and, on a `backend`
  host, the row found in the organizations-with-users answer the adapter
  already holds, a missing id failing as a `404`, `roles` and `setRoles`
  the issuer's `GET /api/admin/roles` and `PUT /api/admin/users/{id}/roles`
  and on BoxVault `GET /api/roles` (`{ roles: ["user", "admin"] }`) and
  `PUT /api/users/{id}/roles { roles: [] }` (`422` `lastAdmin` on `/roles`
  when the write would take `admin` off the last administrator),
  and `organizations` is
  `{ list, update(id, patch), remove(id), suspend?, resume?, bulk? }`;
  an action, a filter group or a column the host cannot answer is drawn
  only while the adapter carries its call or the rows carry its field
  (Roles while `roles` and `setRoles`, Set primary organization and Edit
  customer ID and the Customer ID group and column while `update`, Rate
  limits and the 2FA and Active after groups while `rateLimit`, Delete
  while `remove`, Suspend or Enable while `suspend` and `resume`, the
  select column and the bulk pane while `bulk`, Export while
  `exportUrl`), the way the profile page gates its sections.
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
  - **Users**: the query and every filter in the navbar module and its
    panel and none on the page: the query drives the list's `search`
    parameter, debounced, page 1 re-read, the query and every filter
    value mirrored in the URL and read on load; the Status group is
    `kind: select` (Active or Disabled, since a status is exclusive) sent
    as `enabled`; the 2FA and Customer ID groups are `kind: toggle` sent
    as `using_2fa` and `has_customer_id`; the Active after group is
    `kind: date-range` with its presets and All time sent as
    `active_after`; the server alone answers those, because every search
    goes through the navbar and a count over a page of a paged list would
    lie; the Roles group is `kind: toggle` over the role catalog and
    narrows the loaded page client-side, since the list names no
    parameter for it and the navbar contract's one-group-per-enumerable-
    column rule still wants it; Export is the panel's
    registered action, `/api/admin/export/users` from the same query and
    groups, the page keeping its `SectionHeading` and the table alone; the
    `SubTable` with sortable Email, Name, Customer ID and Status headers,
    the Roles badges, the Organizations badges (gold for the primary),
    the 2FA badge; the row actions as labeled buttons or one row menu,
    never bare glyphs: Suspend or Enable, Roles (a dialog of checkboxes
    saved in one call), Set primary organization (a select in the row
    menu behind a confirm, never a click on a badge, because a label that
    secretly acts is a trap), Rate limits (a dialog over
    the rate-limit read, with Unlock sign-in, Unlock a method, Ban and
    Unban) and Delete (`ConfirmModal` with the organization warning); a
    `SectionHeading` over the table, its title Users, the count as muted
    text after the title, and the select column's header cell a real
    checkbox, the select-all for the page, never an icon glyph and never
    a button or link of its own; the section's
    action pane, while rows are picked, reads "N selected", Clear
    selection, Enable, Suspend, Add role, Remove role, Set customer id (a
    small form dialog for the hex, empty to clear), Set primary
    organization (a select over the organizations, a row whose user is
    not a member skipped with `not_a_member`), Revoke sessions and
    Unlock, then Delete, then
    Create and Refresh, then the view toggle, with a confirm on Delete
    and on Revoke sessions and the step-up dialog on both,
    the result line naming processed, skipped and errors;
    the Email cell is an in-router link to the row's record page at
    `/admin/users/<id>`, and the columns, the row actions, the dialogs
    and the actions hook of the Users page live in one shared
    `UserActions` module both pages import.
  - **User**: the record page at `/admin/users/:id`, reading
    `GET /api/admin/users/{id}` through the adapter's `get(id)` alone,
    never scanning a list for one row: a `SectionHeading` titled by the
    username with the status badge and, in its action pane, Suspend or
    Enable and the same row menu the Users page draws, over
    `RecordRows`, the one read-only record row shape, built from the
    table's own columns gated by the same `when`, every action
    re-reading the record and Delete returning to the list, an id the
    adapter answers not found with drawing the shared empty state
    (`admin.users.notFound`); its crumb reads Admin, Users, then the
    username through `usePageName`, "User" (`admin.users.placeholder`)
    standing in until the record loads. Under the rows,
    on the issuer, the record's `profile` is edited the way the person
    edits their own: a Profile card drawing the shared profile section
    over an adapter bound to the id (the detail members through
    `PATCH /api/admin/users/{id}`, the address through its `PUT`, the
    mobile as one plain field through the phone `PUT`, the email through
    a dialog over the email `PUT`), a Preferences card drawing the shared
    preferences section with the record's language, mode, theme and motion
    as fields saved with the rest over the preferences `PATCH`, never the viewer's
    own, a Two-factor card listing the record's methods as the Security
    section lists them, Remove on the SMS and APP rows alone, and a
    Sign-in card with the "Require a password change at next sign-in"
    switch writing `password_change_required` through the record
    `PATCH`; every write
    passes the step-up dialog, and the cards are absent on the admin's
    own record, which the issuer refuses `403 own_account` and the
    profile page serves. The issuer's item carries `profile`, the
    `GET /api/user` shape with the mobile's number, `preferences` and
    `password_change_required`; an admin edits another account's details
    through `PATCH /api/admin/users/{id}`, its address, email and phone
    through `PUT …/address`, `PUT …/email` and `PUT …/phone`, its
    preferences (language, mode, theme, motion, timezone, region,
    ciba_channel) through `PATCH …/preferences` under the preferences
    form's rules, reads its second-factor methods through
    `GET …/tfa/methods` (the rows `GET /api/user/tfa/methods` answers,
    passkeys included, a read with no step-up) and removes an SMS or APP
    method through `DELETE …/tfa/methods/{id}` (`409 last_method` on the
    last while two-factor is on; a passkey is drawn and never removed by
    an admin), every write behind the step-up window and refused
    `403 own_account` on the admin's own id; there is no route that sets
    another account's password and none is planned: the admin sets
    `password_change_required` instead, and the account is sent to the
    forced password step at its next sign-in, after its second factor,
    its client sessions and remembered logins ended and an inbox notice
    and an email sent, `409 no_local_password` while the account has no
    local password.
  - **Organizations**: a `SectionHeading` over the table, its title All
    organizations, the count as muted text after the title; the table (a
    select column whose header cell is a real checkbox, the select-all
    for the page, never an icon glyph and never a button or link of its
    own, name, Personal or Team, uuid, invite code, customer id,
    members, created),
    the Type group, `kind: select` over Personal and Team narrowing the
    rows client-side, the row actions Edit and Delete as labeled
    controls: Edit opens the form dialog over the
    record's fields (name, email, website, logo URL, description,
    locale, time zone, telephone, the `AddressFields`, access mode,
    default role, customer id), prefilled from the row, validated
    through `useFormRules` against the `organization` form of
    `/api/rules`, the `422` painted inline and the `409 unique` on the
    name field, saved by one `PATCH /api/admin/organizations/{id}` and
    the list re-read, because an operator who can delete an organization
    but not correct its name or its door is sent to the owner for every
    typo; Delete behind `ConfirmModal` for a team or an empty personal
    organization; the section's action pane also carries, while rows are
    picked, "N selected", Clear selection, Suspend, Resume, Set customer
    id (the hex, empty to clear), Set access mode (a select over invite,
    request and private), Set default role (a select over MEMBER, ADMIN
    and GUEST), Regenerate invite code and Delete
    over `POST /api/admin/organizations/bulk`, the delete action stepped
    up behind a confirm, a personal organization skipped with `personal`
    for the door, the role and the code, the result line naming
    processed, skipped and errors.
  - **Activity**: three pages, one per sidebar row, no tab strip:
    Logins (the username query and the date range in the navbar module,
    the query as the list's `username` parameter and the range as
    `kind: date-range` sent as `start_date` and `end_date`, Show only as
    a `kind: select` group sent as `success`, no Filter or Clear button
    because the module's × and Clear filters are those, Export the
    panel's registered action from the same query and groups so the page
    keeps the table alone, the table
    with a Reason column for a failed row rather than a tooltip on the
    badge, since a reason an operator came to read must not hide under a
    hover), Registrations (the same groups without Show only, plus Email
    verified and Phone verified as two `kind: toggle` groups of one pill
    each narrowing the loaded page client-side, since the list names no
    parameter for them, the columns headed "Email verified" and "Phone
    verified" over their Yes and No), Sessions (the table with a select
    column whose header cell is a real checkbox, the select-all for the
    page, Authorized
    and Last active as two columns, the Client group, `kind: toggle` over
    the application names of the loaded page narrowing it client-side,
    Revoke per row behind a confirm, and while rows are picked the
    heading's action pane reading "N selected", Clear selection and
    Revoke over `POST /api/admin/sessions/bulk`, behind a confirm and the
    step-up dialog, the result line naming processed, skipped and
    errors); `Pager` under each; every table
    draws one date format, the absolute time in the cell and the relative
    time in its tooltip, because two formats on one screen read as two
    clocks. Every admin table page, Users, Organizations, Logins,
    Registrations and Sessions, binds the navbar search with its query
    and its filter groups and the Columns group of the navbar contract
    for its table, so every narrowing lives where it does on every other
    UI backend and no page draws a search field or a filter row of its
    own, and every one of them keeps its query and its filter values in
    the page's URL (`search` or `username`, `enabled`, `using_2fa`,
    `has_customer_id`, `active_after`, `success`, `start_date`,
    `end_date`, and the client-side groups under one key each, `roles`,
    `email_verified`, `phone_verified`, `client` and `type`, a
    multi-select's values comma-joined and never sent to the list) and
    reads them on load, so a search hit and a shared link land narrowed
    and the back button restores the narrowing; the URL carries the
    narrowing alone, never a token or a session value, and a narrowing
    only reveals what the page would list anyway; Organizations and
    Sessions carry no list parameter but the query, their groups
    narrowing the rows in hand; Client health and Terms keep their query
    and groups in the URL the same way (`search`, `status`, `kind`;
    `search`, `type`, `public`); the chosen columns and the sort persist under that page's
    `table_prefs_admin_*` key; every table sits in a wrapper with
    `overflow-x: auto` and hides columns through that group, so the page
    body never scrolls sideways.
  - **Health**: four pages, one per sidebar row, no tab strip: the two
    usage `StatCard`s and the usage table with the percentage bar; the
    insights sections (active users, security posture, app activity,
    apps per user, top combinations, registrations per week, churn,
    organizations) as cards and small tables, the organizations rollup
    carrying a Personal group, `kind: toggle` over Personal and Team,
    narrowing its rows client-side, their definitions in an
    info fold on the page and not in header tooltips a touch screen
    never opens; Client health drawing the `clients` of
    `GET /api/admin/client-health` and Provider health its `providers`,
    one kind per page, each page's rows as cards in three states
    (healthy, unhealthy, not probeable) with the error collapse, one
    status per card, no separate summary bar: the page's `SectionHeading`
    carries the page's own name as its title, the healthy-over-total
    count as the heading's muted text after the title, success while
    every row is healthy and warning while any row is unhealthy, because
    a green line over a red card lies, and its action pane holds Refresh
    then the pages contract's one view toggle, list or cards; the list a
    `SubTable` with
    the columns Name, Check, Endpoint, Status, Response time, Last checked
    and Reason, header sort, the Status group (`kind: toggle` over
    healthy, unhealthy and not probeable) narrowing the rows client-side
    since the read is not paged, no Kind group because each page holds
    one kind, and the Columns group, the choice kept as `view` inside
    `table_prefs_admin_client_health` and
    `table_prefs_admin_provider_health` with the sort and the hidden
    columns, the session contract's one object per key; both views draw
    from the same rows the navbar query narrows; the row's and the card's
    name links to the item's config deep link,
    `/admin/config/clients#<client_id>` or
    `/admin/config/providers#<provider_id>` (config contract section 7),
    since the page draws for an admin alone and the entry a failing
    probe names is the entry to fix; Refresh re-fetches, nothing reloads;
    each page binds the navbar search with a query over its rows by name
    and base URL.
  - **Blocked IPs**: a `SectionHeading` carrying the enabled line and the
    blocked count as its muted text after the title, Unblock all
    (`DELETE /api/admin/brute-force`, answering `204`) in the heading's
    action pane; the table with a select column whose header cell is a
    real checkbox, the select-all for the page, the per-row Unblock
    behind a confirm beside it, and while rows are picked the action pane
    reading "N selected", Clear selection and Unblock over
    `POST /api/admin/brute-force/bulk`, beside Unblock all, the result
    line naming processed, skipped and errors. Banning an
    address stays the rate-limit route on the Users
    page's Rate limits dialog, a decision about one account; Blocked IPs
    never gains a Ban control.
  - **Terms**: a `SectionHeading` over the cards, its title Terms, Create
    in the heading's action pane, opening the create dialog below; one
    card per document, never one per copy, and no
    drag: the order a person meets the documents in is the site's or the
    client's `tos-names`, edited in the configuration editor, so the page draws nothing that orders; the card carries the
    document's name, display name, Public and type badges, and inside it
    one row per copy with its flag, its `regions`, its `version` and
    `r{{revision}}` beside it, the
    default copy's row reading "Everywhere else", and a "region-only"
    badge on a document with no default copy; Preview opening a list
    dialog that draws a copy as the person would see it,
    from the `content` markdown the admin's own `GET /api/admin/terms`
    already carries, through the shared `MarkdownArticle` under the
    document's title, the copy's version and the type badge, for every
    document public or not, and on a public card a second action "Open
    public page" linking to `/public/policies/<name>` in a new tab,
    because the public route refuses a non-public document by design and
    an admin must see a client's terms before assigning them, Copy (a
    small dialog asking the new name, never the browser's prompt), Edit
    on a copy and Create in a dialog (name, display name, the icon picked
    from the estate's glyph set and stored as its name, version, type,
    public, the markdown content in a textarea with a preview beside it
    and the placeholder help from the placeholders call, and a `regions`
    multi-select over the country codes and the three sets, empty for the
    default copy), the edit dialog showing the copy's `version` read-only,
    since a version changes only by publishing, and carrying two actions,
    Save, the default, reading "Save as a revision of {{version}}" and
    sending the `PATCH`, which writes the next revision under the current
    version and re-prompts nobody, and Publish, which asks for the new
    version string in a small form dialog before it sends
    `POST /api/admin/terms/{name}/publish`, which writes revision 1 of
    the new version, the one the terms page's version list and highlight
    read, and notifies every prior acceptor of that copy; a
    History action on the copy opening a list dialog from
    `GET /api/admin/terms/{name}/history` of the versions with their
    revisions beneath, each with who published it and when, each revision
    openable read-only from
    `GET /api/admin/terms/{name}/history/{version}/{revision}` and drawn
    through the same `MarkdownArticle` the Preview uses, so a real
    change saved as a revision by mistake is caught there and published as
    a new version then; Add a copy on a card opening the
    same dialog with the document's name fixed and `regions` required,
    its `POST /api/admin/terms` under the document's name adding the copy
    at revision 1 of its version, Delete on a copy behind a confirm; each card
    carries a checkbox, the cards' select column, and the heading's
    select-all checkbox picks every card on the page, the action pane
    while cards are picked reading "N selected", Clear selection, Make
    public, Make private and Delete over `POST /api/admin/terms/bulk` with
    the ids of the picked documents' copies, Delete behind a confirm and
    the step-up dialog, the result line naming processed, skipped and
    errors; every change saved as it is made; the page
    binds the navbar search with a query over the cards by name and
    display name, the Type group (`kind: toggle` over the document types)
    and the Public group, one pill, both narrowing the cards client-side.
  - **Configuration**: the shared `ConfigPage` of the config contract
    over the issuer's schema, one file per route, `/admin/config/<name>`,
    `/admin/config` the first name of `status.config`, the file's sections
    under the page heading with no tab strip, reached from the column's
    Configuration entry, the plain row on one file and the tree's child
    nodes on more, as in-router links.
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
  would ride a query string to the ticket system. A render
  crash inside the chrome is not this page: it is the `ErrorBoundary`
  fallback card of the navbar contract (refresh, home, the component
  stack behind a fold in development), drawn in the one card style and
  sentence case the ErrorPage uses so one failure family looks like one
  app, which ships the error and its component stack to
  `POST /api/client-errors`. That route admits anonymous reports,
  because public visitors and broken sessions must still be able to
  report, and is gated by a per-address limit and an 8 KB body cap
  instead; the body is
  `{ "entries": [ { "level", "category", "message", "stack", "component_stack", "url", "user_agent", "time" } ] }`,
  `snake_case`, `time` an RFC 3339 instant, one request carrying the
  batch the logger held, so a render crash and a batch of error-level
  log entries ride one shape; it strips control characters, stores each report as
  structured JSON never interpolated into a log line, and never feeds
  the `/api/admin/errors` store.
- **The server's `/error` dispatch** answers, for a GET that accepts
  `text/html`, `index.html` in place with the fault's own status code
  and `data-error-status`, `data-error-reference` and `data-error-path`
  stamped on `<html>` the way `data-brand` is, because a `303` to
  `/error` would answer every fault with a `200`, hide the `5xx` from
  every monitor and put the reference and path in the history; a POST
  that failed answers a `303` to `/error?status=<n>&reference=<16 hex>&path=<path>`,
  the one case where the redirect is the POST-to-GET hand-off RFC 9110
  §15.4.4 names, `path` being the path component alone, percent-encoded;
  a request that accepts `application/json` answers the problem body
  carrying `reference`. The reference is sixteen hex characters of a
  random identifier, logged with the full detail, and the trace
  is kept under it for an hour in a bounded store of the most recent
  faults, `5xx` alone, so a flood of exception-raising requests cannot
  fill memory and a reference cannot be guessed. `CookieTheftException`
  redirects to `/login?error=session_reset`, a code the page translates.
  The guard against the error handler failing is a static `index.html`
  that cannot. A path
  the router does not know draws the same ErrorPage with `404`
  client-side under the `200` the shell was served with, a soft 404 this
  contract accepts by design because the issuer's pages are never meant
  to be indexed and a round trip to learn what the router already knows
  buys nothing.

### What the UI backend answers for search

`GET /api/search?q=&limit=`, the navbar contract's per-app route, session
or Bearer, answers `{ query, results, truncated }` in the navbar contract's
row shape: `kind` one of the kinds below, `collection` `null`, `org` the
organization's name, `name` the row's own name, and `title`, `subtitle`
and `matched` filled. The issuer searches everything it holds that a page
lists, because a search that skips a kind sends the person back to the
page to find it; one row per kind, the fields matched, who sees it, and
the page a hit links to on the `auth-server` role:

| kind                | matched on                             | who sees it                                                                                                                      | the hit links to                                                                                                                                                                        |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization`      | name, description                      | a member sees their own; `ROLE_ADMIN` every one                                                                                  | `/user/organizations` for a member; `/admin/organizations?search=<name>` for an admin                                                                                                   |
| `user`              | username, email, given and family name | `ROLE_ADMIN` everywhere; an organization's owners and admins their members                                                       | `/admin/users?search=<username>`                                                                                                                                                        |
| `application`       | client id, client name, description    | every signed-in person the applications they have connected (the Applications page's rows); `ROLE_ADMIN` every registered client | `/user/applications` for a member; `/admin/config/clients#<client_id>` for an admin, the row's `name` being the client id, the config item deep link of the config contract's section 7 |
| `identity-provider` | provider name                          | every signed-in person the providers the site offers                                                                             | `/user/profile/security` for a member; `/admin/config/providers#<provider_id>` for an admin, the row's `name` being the provider id                                                     |
| `terms`             | name, display name, content            | every signed-in person the public templates; `ROLE_ADMIN` every template                                                         | `/public/policies/<name>`; `/admin/terms` for an admin                                                                                                                                  |
| `notification`      | title, body                            | the caller's own inbox                                                                                                           | `/notifications`                                                                                                                                                                        |
| `session`           | client name, user agent, location      | the caller's own sessions; `ROLE_ADMIN` every session                                                                            | `/user/profile/sessions`; `/admin/sessions` for an admin                                                                                                                                |
| `login`             | username, city, country, user agent    | `ROLE_ADMIN`                                                                                                                     | `/admin/logins?username=<username>`                                                                                                                                                     |
| `registration`      | username, city, country                | `ROLE_ADMIN`                                                                                                                     | `/admin/registrations?username=<username>`                                                                                                                                              |
| `blocked-address`   | the address                            | `ROLE_ADMIN`                                                                                                                     | `/admin/brute-force`                                                                                                                                                                    |

The `search` and `username` parameters those links carry are the ones
the pages read on load, the rule of the Activity bullet.

The visibility clause is the list routes' own, so a caller is never shown
a row it could not already list; `limit` bounds each kind and `truncated`
counts the rest. The issuer lists no collections, so the universal route
shape has no level to build a deep link from; the shared UI's search list
and page, on the `auth-server` role, link each kind to the page the table
names, because those are the pages that hold the row.

### Shared components admin adds

| Component                           | Why shared                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `StatCard`                          | the icon, count, label tile that links somewhere; the dashboard, the usage report, the insights                 |
| `DateRange`                         | start and end dates with preset buttons (30, 60, 90, 120 days, All time); every activity table, any report page |
| `LoginMap`                          | Leaflet and markercluster, the one map in the estate; feature-local                                             |
| `SubTable`, `Pager`, `ConfirmModal` | the tables, the paging, the confirms                                                                            |

### Admin keys

`shared.json`: `account.sidebar.*` (`title`, `profile`, `organizations`,
`applications`, `terms`, `integrations`, `inbox`); `admin.*` gains `sidebar.*` (`title`,
`overview`, `accounts`, `activity`, `health`, `security`, `legal`,
`messaging`, `system`), `dashboard.*` (`title`, `stats.totalUsers`,
`stats.loginsToday`, `stats.registrationsWeek`, `stats.failedLogins`,
`stats.activeSessions`, `map.title`, `map.days`, `recentLogins`,
`recentRegistrations`, `viewAll`, `restart.*`), `users.*` (`title`,
`filter.*`, `table.*`, `roles.*`, `customerId.*`, `primaryOrg.*`,
`suspend`, `enable`, `rateLimits.*`, `delete.*`, `bulk.*`),
`organizations.*` (`all` for the sidebar row and the page title, `edit`,
`edit.title`, `field.*` for the dialog's fields, `saved`, `bulk.*` for
its Suspend, Resume, Delete and Clear selection),
`activity.*` (`logins.*` with `reason`, `registrations.*` with
`emailVerified` and `phoneVerified`, `sessions.*` with `authorized` and
`lastActive`, `export`), `health.*` (`usage.*`, `insights.*` with
`definitions`, `clients.*`, `providers.*`, `status.*`), `blocked.*`
(`unblockAll`),
`terms.*` (`title`, `create`, `edit`, `copy`, `copyName`, `preview`,
`delete`, `copies`, `addCopy`, `everywhereElse`, `regionOnly`,
`field.*`, `placeholders`, `type.*`, `save`, `saveAsRevision`, `publish`,
`publishTitle`, `publishVersion`, `history`, `historyTitle`, `revision`,
`current`, the `terms.*` names placeholders the
UI may rename), `emailTemplates.*` (`title`, `kind.*` one per kind,
`create`, `edit`, `preview`, `delete`, `copies`, `addCopy`, `everySite`,
`everyLanguage`, `field.*`, `arguments`, `insertArgument`, `save`,
`saveAsRevision`, `publish`, `publishTitle`, `publishVersion`, `history`,
`historyTitle`, `revision`, `current`, placeholders the UI may rename
too); `pages.*` gains
`selectColumn` as the select-all checkbox's `aria-label` ("Select all on
this page"), the one shared key every select column of the estate draws;
`navbar.*` gains
`versionShort` for the app-section header of a site without a footer;
`errors.*` gains `title.403`, `title.404`, `title.500`, `title.other`,
`body.403`, `body.404`, `body.500`, `report`, `copy`, `copied`,
`reference`, `details`, `detail.code`, `detail.message`, `detail.path`,
`detail.time`, `detail.reference`, `detail.user`, `goHome`, `goBack`;
`session_reset` is a code and lives with the others under
`auth:errors.*`, where LoginPage reads it, and nowhere else. Every key
mirrored in `es` and `cimode`.

---

The sidebar is the issuer's navigation for every signed-in person: the
Account section, and the operator's sections for an admin, as group 5
describes; there is no tab strip.

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Session Contract](universal-session/) |
[Universal Pages Contract](universal-pages/) |
[Universal Validation Contract](universal-validation/) |
[Preferences, Language & Branding Contract](preferences-and-branding/)
