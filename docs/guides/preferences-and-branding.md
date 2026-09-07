---
title: Preferences, Language & Branding Contract
layout: default
nav_order: 7
parent: Guides
permalink: /docs/guides/preferences-and-branding/
---

## Preferences, Language & Branding Contract

{: .no_toc }

The estate-wide contract for user preferences (language, theme, timezone),
notification localization, and tenant branding. Relying apps build against
this page. Agreed across the authorization server, BoxVault and
hyperweaver-ui; every clause below carries its reasoning, because a rule
without its rationale gets pruned by whoever inherits it. The visual
reference is [preferences-and-branding.html](../preferences-and-branding.html):
the first frame is live on the authorization server's four sites, and a
yellow note there marks what this contract changes against `auth.css` as it
paints them today.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## The model

Two independent axes, never conflated:

| Axis        | Values                                    | Owner              | Distribution            |
| ----------- | ----------------------------------------- | ------------------ | ----------------------- |
| **variant** | `light` \| `dark` \| `auto`               | the user           | claims, SCIM, write API |
| **pack**    | a bare brand name (`moonshinedev`, `shi`) | client/site config | branding endpoint       |

Plus two more user preferences carried the same way: `language` (BCP 47) and
`timezone` (IANA name).

**The pack axis is per-application, not per-tenant.** Resolution is
`clients.<id>.client.theme-pack` → site `theme_id` → none. That ordering is
what lets Super.Human.Installer brand hyperweaver's clients while BoxVault
on the same site keeps its own — sometimes a pack answers "which customer",
sometimes "which product", in the same slot.

Adoption is layered and nothing is forced. **Layer 1** — the variant and
language, applied by each app through whatever theme and i18n system it
already has. No convergence required. **Layer 2** — packs, which require the
app to have adopted the variable contract below. An app that adopts nothing
keeps working unchanged, and its bundled assets remain its fallback forever.

---

## Rendering: two attributes, never composed

```html
<html lang="es" data-bs-theme="dark" data-brand="moonshinedev"></html>
```

- **`data-bs-theme` carries the variant and nothing else** — `light` or
  `dark`, never `auto`, never a pack name.
- **`data-brand` carries the pack.**
- **`lang` carries the user's language.**

**Never compose them into one value.** Bootstrap is consumed as precompiled
CSS, and its entire dark layer sits behind exact-match selectors
(`[data-bs-theme=dark] { … }`). A composed value such as
`moonshinedev-dark` matches none of them, so body colours, borders, form
controls and dropdowns silently revert to light while the brand appears to
apply. This is the single most expensive mistake available here; an earlier
draft of this page recommended it.

**Null pack: omit the attribute and the stylesheet link entirely.** No empty
`data-brand`, no dead `<link>`. Two implementations will otherwise diverge
on day one.

### Injection ordering

The pack stylesheet must load **after** the app's own stylesheet.

`:root` and `[data-brand="x"]` both compute to specificity (0,1,0), so a tie
is broken by source order alone — a pack loaded first loses every
single-attribute battle and the brand half-applies.

`[data-brand="x"][data-bs-theme="dark"]` is (0,2,0) and beats `:root`
regardless of order. **So variant overrides are order-independent while
brand-level overrides are not.** That asymmetry is why an ordering bug
presents as "dark mode brands correctly, light mode doesn't" — which reads
as intermittent and sends people hunting in the wrong place.

Appending the `<link>` to `<head>` at runtime satisfies this by
construction. Server-side injection is the shape where it must be done
deliberately. The rule stays recorded even while trivially satisfied,
because "trivially satisfied today" is how load-bearing rules get deleted
and rediscovered.

> **Open evaluation:** CSS Cascade Level 5 `@layer` would make this rule
> unnecessary — a pack in its own layer wins regardless of source order.
> Worth assessing before the rule calcifies.

---

## Variant resolution and precedence

**The account value is authoritative. Local storage is its cache and the
fallback when no account exists.**

- **On login the account value overwrites** whatever the browser held.
  Seed-when-unset is actively wrong: under seeding, a user who switches
  theme on one device never sees it on another that already holds a local
  value — the exact failure roaming exists to prevent.
- **A toggle writes through** to the account, or the stored value goes stale
  the moment anyone touches the control and every later login fights the
  user.
- **The write is optimistic.** Apply locally, fire the request, never block
  or revert the UI on it. A failed write leaves this browser correct and the
  account stale until the next successful write.
- **"Account" is not "IdP."** Authority is whatever user store the
  deployment has — a local account with preference columns counts. Only the
  genuinely accountless case is local-only.

`auto` is resolved by the app via `prefers-color-scheme`; it is a stored
preference value and is never written to the attribute.

**Claim-only consumers lag by design.** `preferences.theme` rides the ID
token, so an app reading only claims sees a change at its next login or
token refresh. Apps on the SCIM push (RFC 7643/7644) converge immediately.

---

## The pre-paint script — pack-independent

**This section is not part of the pack system and must not be read as
conditional on it.** The script reads only the variant, it fixes a defect
that predates this contract, and it belongs in every app whether or not that
app ever adopts Layer 2. Three apps in this estate shipped this defect
independently: one hardcoded `data-bs-theme="dark"`, one stamped the
attribute from a post-mount effect, one put a pack name in the variant slot.

Without it, the page paints in the wrong colour scheme and repaints once the
app resolves the variant — the whole page, not an accent. That is a
materially worse artefact than a late-arriving brand, and the two should
never be traded off against each other as one problem.

An inline script in `<head>`, before first paint, stamps `data-bs-theme`
(and `lang`) from synchronously readable state, resolving `auto` through
`matchMedia`.

**It must implement the same precedence its app's mount uses — and mount's
precedence _as it exists in that app at that time_, not a fixed sequence.**
An app with one tier reads once; an app with an account cache reads twice;
both sides gain a tier together or neither does.

> **Parity is between the script and mount, not between apps.**

A script that reads only local storage while the app then applies the
authoritative account value does not remove the flash — it relocates it, and
it then reproduces only for users whose two values disagree, which is the
hardest possible version to catch. Copying another app's working script
verbatim is exactly how an app with one tier ships a two-read script whose
first read has nothing to read.

Where a host renders server-side and already knows a concrete `light`/`dark`
for the user, it stamps directly and the script is a no-op for that user.
The script is the resolver for `auto` and for the accountless case.

A UI backend with a site default names it as `brand.theme` (`light` or
`dark`) in its `/api/status`, the navbar contract's status payload, from a
value of its own in the site's configuration (`sites.<id>.ui.default_theme`
on the authorization server), never inferred from a pack name; the
shared UI applies it, in the script and at mount alike, only while neither
an account value nor local storage holds a choice, so the site default never
overrides a person.

A UI backend that serves more than one site serves `index.html` per site and
stamps that default on the `<html>` tag as it serves the file, by hostname,
as `data-brand-theme="light"` or `data-brand-theme="dark"`; the file in the
build never changes. The script then reads the site default synchronously,
with no fetch before the first paint, which is the whole point of the
script: a default that arrived only with `/api/status` would repaint the
page once, the defect this section exists to remove. `data-brand-theme` is
the site's word and never the person's; `data-bs-theme` stays the resolved
variant, and the two are never composed.

A UI backend that rewrites `index.html` per site stamps `data-brand` and
the pack's `<link>` in the same pass, the link after the app stylesheet,
so the pack paints with the first frame. A pack may set surfaces, and a
pack that arrives after the mount repaints the whole page from stock
Bootstrap to the site's own greys or purple-black, the same defect this
section removes for the variant; a server that already knows the site by
hostname has no reason to leave that to a fetch. The shell then finds
`data-brand` and the link already present and appends nothing.

---

## Read paths

### Claims — every OIDC client, login-time snapshot

Emitted on `/userinfo` and the ID token:

- `locale` — the user's language as a BCP 47 tag. **Omitted when unset.**
  Under the `profile` scope, where OpenID Connect Core §5.4 places it.
- `zoneinfo` — IANA timezone name. Omitted when unset. Under `profile`,
  the same section.
- `preferences` — a map carrying `language` and `theme` when set, on
  `/userinfo` for every client and on the ID token only for a client whose
  `id-token-custom-claims` lists it. `preferences.theme` is the variant
  only; a composed value never appears here and consumers reject one if
  seen.

### SCIM push — subscribing clients only

User resources carry, in addition to the long-standing fields (RFC 7643
§4.1.1, all omitted when unset): `displayName`, `name.formatted`,
`preferredLanguage`, `locale`, `timezone`. Absent means null; receivers must
not treat absence as an error.

### Branding endpoint — anonymous-safe

```text
GET {issuer}/api/public/site/branding?client_id=<optional>
```

The path sits under `/api` because the estate's rule is that programs
call `/api` and every other path on a UI backend is a page of the SPA;
`/public/policies/*` is such a page, and a program call beside it would
be told apart only by the order the server matches routes in. The old
`/public/site/branding` path is retired with the move; every consumer
changes in the same release.

```json
{
  "site_id": "moonshinedev",
  "theme_pack": "moonshinedev",
  "theme_css": "https://auth.example.com/themes/moonshinedev/moonshinedev.css?v=a1b2c3",
  "company_name": "Moonshine.dev",
  "logos": {
    "mark": { "src": "https://…/mark.svg", "width": 512, "height": 512, "monochrome": true },
    "small": {
      "light": "https://…/wordmark-light.svg",
      "dark": "https://…/wordmark-dark.svg",
      "width": 320,
      "height": 100
    },
    "icon": { "src": "https://…/icon.png", "width": 64, "height": 64 }
  }
}
```

- **`theme_css` is returned, never constructed** by the app — so the file can
  be moved, renamed or versioned freely.
- **URLs are absolute.** Relative paths force every consumer to resolve
  against the issuer and break silently if assets move.
- **Logo slots are objects**: `src` **or** (`light` + `dark`); `width` and
  `height` always present so consumers can reserve space; `monochrome: true`
  marks a slot safe to mask. A `mark` (stencil) is distinct from `small` (a
  wordmark).
- **`theme_pack: null`** means stock Bootstrap; sites configured
  `theme_id: light` publish `null`.
- **Absolute URLs are built from the site's configured hostname, never
  from the request's `Host` or `X-Forwarded-Host`**, and a request whose
  host matches no site answers the default site; a publicly cacheable
  answer built from the request host would let one poisoned request hand
  every consumer a stylesheet on an attacker's host for five minutes.
- **An unknown `client_id` answers the site's own pack with `200`**,
  indistinguishable from an unset one, so the endpoint never says which
  client ids exist.

### Discovery is mode-split

Federated deployments resolve through the endpoint above. Standalone
deployments with no IdP resolve from their own local configuration — the IdP
is never a dependency of an app's startup or of its branding.

**Apps resolve discovery through whatever authority the deployment has,
directly or via their own backend.** Both current consumers proxy through
their own server; browser-direct is permitted, not assumed.

**The shared UI never calls the branding endpoint.** A UI backend that
wants a pack names it in its own `/api/status` as
`brand.pack: { name, css }`, `name` the bare pack name for `data-brand`
and `css` the stylesheet URL with its `?v=` hash, resolved by the UI
backend's server from its local configuration or from the endpoint above;
the shell stamps `data-brand` and appends the `<link>` from that member
alone, and a payload without it stamps nothing. A UI backend that rewrites
`index.html` per site stamps the same two values into the file and
answers the same `brand.pack`, so the shell finds them present and
appends nothing, the identity provider being the first such backend. One
member, one branch, and the branding endpoint stays a server-to-server
call, because a shell that guessed a route per UI backend would carry a
per-app path the status payload exists to remove.

**Standalone hosts serve pack CSS from their own origin, from embedded or
seeded assets — never a remote URL.** An offline install must not hang a
paint on a dead host. The identity provider follows the same default and
admits a remote pack only through the per-site `pack_origins` list above.

---

## Write path

```text
PATCH {issuer}/api/user/preferences
Content-Type: application/json

{ "language": "es", "theme": "dark", "timezone": "America/Chicago" }
```

- **Auth is dual-principal**: a same-origin session with CSRF token, or the
  acting user's Bearer access token (Mode B, as the org-invite API).
- **An omitted key is left unchanged.** A key present with `null` or `""`
  clears it. All three keys are optional.
- Validation: well-formed BCP 47 with no length cap, since RFC 5646 §2.1
  sets none and `ca-ES-valencia` is a registered fourteen-character tag;
  `light|dark|auto`; a known IANA zone id. A violation answers the
  validation contract's `422` problem body with a pointer per failing
  member, never a `400 { "error" }`, so the shared form paints it inline.
- `GET` on the same path returns the five members the identity provider
  stores: `language`, `theme`, `timezone`, `ciba_channel` and
  `ciba_user_code_set`, the last two the sign-in approval channel and
  whether an approval PIN is set.
- A successful write triggers the SCIM push, so subscribing apps converge
  without polling.

New local signups seed `language` from the request locale.

---

## Packs

A pack is **variables only — never rules.** Rules are app-shaped: precompiled
Bootstrap bakes colour into components, so `.btn-primary`, `.btn-outline-*`,
`.form-check-input:checked`, `.nav-pills`, `.pagination` and friends must be
re-declared by each app. That boilerplate is identical everywhere and is
documented app-side; it is not pack content.

A pack ships **both** the `--brand-*` values **and** the `--bs-*` bridge,
including the button component variables. That is what makes a pack
self-sufficient and a re-brand a file swap; if each app owned its bridge,
every new override would mean touching every app.

**Scope: colours, artwork and one face — never geometry.** A pack may set
the whole `--bs-*` colour set, surfaces included: `--bs-body-bg`,
`--bs-tertiary-bg`, `--bs-secondary-bg`, `--bs-border-color`,
`--bs-body-color`, `--bs-emphasis-color`, `--bs-link-color` and the button
variables, each under `[data-brand="x"]` for the light variant and under
`[data-brand="x"][data-bs-theme="dark"]` for the dark one, so a site whose
surfaces are its own keeps them (Moonshine's neutral greys, Nomad's
purple-black) and the stock variant is the fallback wherever a pack names
nothing. A pack does not set geometry, radius or spacing — the moment it
can, it can break layouts it has never been tested against; layout is the
feature's. The one typographic value it may carry is `--brand-auth-display`,
the headline face of the shared auth column (decision 5 of the Universal
Identity Contract); the chrome's own faces are never a pack's to change.

### Variable contract

Neutral prefix so a pack is authored once for the whole estate:

| Variable               | Purpose                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `--brand-primary`      | brand colour                                                                                           |
| `--brand-on-primary`   | text/icon colour ON primary                                                                            |
| `--brand-warning`      | brand warning colour                                                                                   |
| `--brand-on-warning`   | text/icon colour ON warning                                                                            |
| `--brand-logo`         | stencil URL for the mask pattern (optional)                                                            |
| `--brand-logo-color`   | paint colour for the stencil (optional)                                                                |
| `--brand-auth-display` | the auth column's headline face (optional; Source Serif 4 when absent), its files served with the pack |

`--brand-on-*` exists because a single colour cannot express its own
contrast pairing: a light brand needs dark text on it, a dark brand needs
light. Without it, a dark-primary pack renders unreadable buttons in every
app.

Surfaces carry no `--brand-*` alias: a pack that sets them writes the
`--bs-*` names directly, per variant, and the generator checks every text
colour it sets against the surface it sits on at the same 4.5:1.

App-specific namespaces (`--hw-*`, `--bv-*`) remain for genuinely app-only
surfaces. Packs may technically reach them; doing so is undocumented and at
the pack's own risk.

### Source format and generation

**Pack source is YAML; the CSS is generated.** The generator derives the
`--bs-*-rgb` comma triples from the hex values, exactly as the Sass
`rgb-list()` it replaces did — plain CSS cannot emit that format, so
hand-maintained pairs would drift. Generation also yields the content hash
used for versioning, written beside the stylesheet as
`public/themes/<pack>/<pack>.hash`, the SHA-256 hex of `<pack>.css` and
nothing else in the file; a UI backend reads that file for the `?v=` it
answers in `theme_css` and `brand.pack.css`, so the hash is computed once
where the CSS is made and never recomputed by a server that serves it.

A **raw-CSS escape hatch** exists for anything exotic. Hand-written packs
must invert the derivation to keep one source of truth:

```css
--brand-primary-rgb: 145, 197, 78;
--brand-primary: rgb(var(--brand-primary-rgb));
```

**A pack is a package of files a developer writes, and it belongs to the
shared UI.** A pack is one directory under the STARTcloud UI's
`public/themes/<pack>/`, beside `public/brand/`: its stylesheet, the artwork
`--brand-logo` names and the font files `--brand-auth-display` names, so a
pack is authored once, versioned with the build, and served by whatever
origin serves the build, which is what the standalone rule above requires.
No UI backend holds a pack file or renders one; the authorization server is
an API, so its part is naming a pack per site (`theme_id`) and answering
`theme_css` as the URL of that pack's stylesheet on the serving origin.
A developer brands a site by writing a pack directory and naming it in the
site's configuration, never by touching a server. On the identity provider
a pack is same-origin unless the site's configuration lists the origin
that hosts it (`sites.<id>.ui.pack_origins`), and every listed origin
becomes that site's `style-src` and `font-src` entry while any other
origin is refused, because a stylesheet from a host the issuer does not
control runs on the sign-in page and CSS alone can leak typed input
through attribute selectors (RFC 9700 §4.2.4 keeps third-party resources
off the authorization page); `theme_css` is still returned, never
constructed, so a listed remote pack works by URL. A pack is edited on
disk where it is served and is live on the next reload; no application
manages packs and none offers a UI for them.

### Generated shape

```css
[data-brand='moonshinedev'] {
  --brand-primary: #8b5cf6;
  --brand-on-primary: #ffffff;
  --brand-logo: url('https://…/mark.svg');
  --brand-logo-color: var(--brand-primary);

  --bs-primary: var(--brand-primary);
  --bs-primary-rgb: 139, 92, 246;
  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, white);
}
[data-brand='moonshinedev'][data-bs-theme='dark'] {
  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, black);
  --brand-logo-color: #ffffff;
}
```

Only genuine inversions repeat under the variant selector.

### Pack names

`data-brand` values are bare names in a shared namespace. **The shared UI's
`public/themes/` is the canonical source of what a pack name means**, one
directory per name; the authorization server's site configuration names one
of them per site. Standalone hosts carry vendored snapshots that may lag it —
that is expected behaviour, not a fault.

---

## Artwork

Prefer a **monochrome stencil painted by CSS** over per-variant image files:

```css
.brand-mark {
  mask: var(--brand-logo) center / contain no-repeat;
  -webkit-mask: var(--brand-logo) center / contain no-repeat;
  background-color: var(--brand-logo-color, currentColor);
  width: 2rem;
  height: 2rem;
}
```

One file per brand, works cross-origin, no variants, no inlining, no
JavaScript. Defaulting the colour to `currentColor` makes the mark inherit
the themed text colour with no rule at all.

**Riders, all required:**

- **Explicit dimensions.** A masked element has no intrinsic size and
  renders 0×0 without them. The endpoint supplies `width`/`height`.
- **`role="img"` plus `aria-label`.** It is a styled `div`, not an image.
- **`forced-colors` fallback.** Windows High Contrast overrides
  `background-color`, so a masked mark **disappears** there. Provide an
  `@media (forced-colors: active)` branch with a real `<img>` or
  `forced-color-adjust`.
- **Print drops background colours** — accept it or add print CSS.

**Multi-colour marks cannot be masked** — masking discards colour. Choose
artwork that reads on both light and dark and needs no switching, or ship
`light`/`dark` variants. `--brand-logo` and `--brand-logo-color` are
therefore **optional per pack**.

**Bundled brand assets remain the fallback everywhere.** Endpoint down, 404,
CSP-blocked, or no pack configured must render the app's own mark — never a
broken image, never a half-branded page.

The files the identity provider's sites need in the shared build, every
one supplied by the estate's owner and none drawn by the UI work; the
shell ships the fallbacks until each lands:

| File                                                          | Size                  | Used by                                                                                                             |
| ------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `public/brand/<site>/icon.png`, one per site                  | 64×64                 | `brand.logoUrl`: the chrome's mark, the org mark, the favicon                                                       |
| `public/brand/<site>/logo-small.png`, one per site            | 640×104               | the branding endpoint's `small` slot for relying apps                                                               |
| `public/brand/providers/<id>.svg`, one per federated provider | square, monochrome    | `icon_url` of `GET /api/auth/methods`; the provider button falls back to its name until the file lands              |
| `public/themes/<pack>/mark.svg`, optional                     | 512×512, monochrome   | `--brand-logo` when the pack's YAML names it                                                                        |
| `public/themes/switchboard/poppins-<weight>.woff2`            | weights 500, 600, 700 | `--brand-auth-display` of the `switchboard` pack, named under `fonts` in its YAML; Helvetica paints until they land |

The sites are `startcloud`, `moonshinedev`, `switchboard` and
`nomadservices`.

---

## Accessibility

The pack generator **refuses** a pack failing any of these, so accessibility
is a build gate rather than a review note:

- **WCAG 2.2 §1.4.3** — 4.5:1 for `--brand-primary` against
  `--brand-on-primary` (3:1 for large text).
- **WCAG 2.2 §1.4.11** — 3:1 for non-text contrast: the brand mark and,
  critically, **focus indicators**. A pack changing `--bs-primary` changes
  Bootstrap's focus ring, so a pack can pass text contrast and still fail
  keyboard accessibility.
- **WCAG 2.2 §2.4.11** — focus appearance requires contrast against both the
  component and its background.

The accent is the site's and is never shifted to pass: when a pack's
YAML omits `on_primary` the generator computes `--brand-on-primary` as
`#ffffff` or `#000000`, whichever contrasts with `--brand-primary` more,
and refuses the pack only when the better of the two is under 4.5:1,
because a brand colour is chosen by the site, the text on it is
arithmetic, and the two extremes are the only pair no accent can defeat
that white can pass. A pack that names `on_primary` is checked as named.
The identity provider's four sites resolve to: `moonshinedev` (`#1f9d57`)
`#000000` at 6.02:1, `switchboard` (`#24ade3`) `#000000` at 7.5:1,
`nomadservices` (`#6c5ce7`) `#ffffff` at 4.86:1, and `startcloud` has no
pack; `--brand-on-primary` is also the auth column's button text, so
those buttons read black on the two light accents.

`lang` on `<html>` must carry the user's language: screen readers take
pronunciation from it, and the value is already stored, published and
write-through.

---

## Content Security Policy

For a consuming app:

- **`style-src`** — the theme host, for the pack stylesheet.
- **`img-src`** — the theme host; CSS-loaded mask images are fetched under
  this directive.
- **`script-src`** — a per-response **nonce** (natural, since hosts already
  mutate served HTML) or a hash for a byte-stable script. **Never
  `unsafe-inline`.** The pre-paint script requires this whether or not packs
  are ever adopted. The shared build publishes the script's SHA-256 beside
  each release tarball, so a UI backend copies the hash rather than
  computing it.
- **Reporting** — `report-to` beside `report-uri`, since CSP Level 3
  deprecates the latter and browsers are dropping it.
- **One header** — a UI backend that must vary a directive per route
  (the identity provider's `frame-src` on its front-channel page) merges
  it into the one policy, never sends a second `Content-Security-Policy`
  header, because browsers enforce the intersection of every policy they
  receive and a bare second header silently tightens the first.

The whole policy the identity provider sends, directive by directive, is
written in the Universal Identity Contract's interstitial group, since it
names the map, Places and analytics origins that contract keeps. The
worked cautionary example was this server's own Report-Only policy, which
once shipped `script-src 'self'` — a policy written in good faith that forbade
the very inline script this contract requires; it carries a per-request
nonce today and the published hash after the cutover.

---

## Caching

- **Branding response**: `Cache-Control: public, max-age=300`. Five minutes,
  so a re-brand propagates estate-wide inside that window while server-side
  consumers cache in-process on the same clock.
- **Pack CSS and assets**: versioned via `?v=<hash>` with a long `max-age`.
  The version is in the query string, not the filename. Consumers never
  construct these URLs, so versioning costs them nothing.
- **A re-brand reaches reloads, not live sessions** — absent app-shell
  caching of the served HTML, which a service worker with a `fetch` handler
  would introduce.

Revalidation was considered and rejected: any revalidating pack puts the
theme host on the render path, which is what the standalone-first and
bundled-fallback rules exist to forbid (RFC 9111).

---

## Staging

Server-side injection is the recorded end state. For a first pass it is
**deferred**, because the two flashes it addresses are not the same size:

| Item                                | Status                                                                                                 | Reason                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-paint variant script            | **Ship**                                                                                               | Wrong-variant paint is the whole page; it is also a live defect independent of packs                                                                                              |
| Server-side injection               | Defer on a UI backend that serves one static file; **ship** on one that rewrites `index.html` per site | Late-brand was an accent-and-mark shift while packs set colours only; a pack that sets surfaces makes it a whole-page repaint, and a per-site server already has the site in hand |
| `Vary: Sec-CH-Prefers-Color-Scheme` | Defer                                                                                                  | Attaches only to the client-hint leg                                                                                                                                              |
| CSP nonce                           | Defer                                                                                                  | Obligation stands the day any CSP is enforced                                                                                                                                     |

**Client hints are an enhancement, not a mechanism.** `Sec-CH-Prefers-Color-Scheme`
is opt-in by protocol (RFC 8942) — the first request never carries it, and a
cold anonymous visitor is exactly the case it was proposed for. It is also
Chromium-only. When used, `Accept-CH` and `Vary` are both required, and the
served shell becomes content-negotiated for every intermediary cache
(RFC 9110/9111).

---

## Notification localization

`POST /api/notify` accepts `title` and `body` as either a plain string (the
producer's default language) or a map keyed by BCP 47 tag:

```json
{ "title": { "en": "Build finished", "es": "Compilación terminada" } }
```

The hub stores the full map and resolves per recipient at write time,
including the org-addressed fan-out where the producer never enumerates
recipients. Resolution follows RFC 4647 §3.4 lookup: exact tag → primary
subtag (`es-MX` → `es`) → `en` → first present. The string form stays legal
forever.

---

## Non-SCIM clients

Most OAuth clients will never speak SCIM. For them the contract is
claims-only: their copy of a preference is as fresh as the user's last
login, which is accepted. SCIM is additive, never required.

---

## Deliberately out of scope for v1

Recorded so they surface as decisions rather than discoveries:

- **Typography.** v1 is colours and marks, with the one exception above:
  `--brand-auth-display` and its files on the theme host, `font-src`
  joining the CSP list for it. No other face is a pack's. Every face,
  bundled or a pack's, is declared with `font-display: swap`, and the
  shared build preloads the auth column's two faces from `index.html`,
  so text paints in the fallback at once and settles without a blank
  gap; a face that blocks paint or swaps late on the sign-in page is the
  most visible flash a visitor can meet.
- **`prefers-reduced-motion`.** The same user-preference shape as the
  variant axis, and a WCAG 2.3.3 concern, but not modelled here.

---

## Specification anchors

BCP 47 / RFC 5646 (language tags) · RFC 4647 (lookup) · RFC 7643/7644
(SCIM) · RFC 8942 (client hints) · RFC 9110/9111 (caching, `Vary`) ·
WCAG 2.2 §1.4.3, §1.4.11, §2.4.11 · CSS Cascade 5 (specificity, `@layer`) ·
CSS Color 5 (`color-mix()`) · CSS Masking 1 · CSS Media Queries 5
(`prefers-color-scheme`, `forced-colors`) · CSS Logical Properties 1 (for
RTL, since the notification contract already carries `dir`) · CSP Level 3.
