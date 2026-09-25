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

**A person may override the pack, the way they override the variant.**
The `pack` preference, a bare pack name or `null`, is carried by the same
write path and claim as `theme`, resolved in the same order
(the account value, else `localStorage.pack`, else the host's own pack)
and never composed with the variant; a host that lets a person choose
answers the packs it offers as `brand.packs` in its status payload
(`[{ name, css, label }]`, the navbar contract's status row), the shared
UI draws its Look picker from that list alone and constructs no
stylesheet URL, and a host that answers no list offers no choice, so a
white-label site never shows a sibling's look. The choice is cached in
local storage beside `theme` so the pre-paint script can stamp
`data-brand` and append the chosen pack's `<link>` before first paint,
after the host's own, and a guest-only account keeps it browser-local as
it keeps `theme`.

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
`moonshinedev-dark` matches none of them, so body colors, borders, form
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

Without it, the page paints in the wrong color scheme and repaints once the
app resolves the variant — the whole page, not an accent. That is a
materially worse artifact than a late-arriving brand, and the two should
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
Bootstrap to the site's own grays or purple-black, the same defect this
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
  "theme_css": "https://auth.example.com/themes/moonshinedev/moonshinedev.css",
  "company_name": "Moonshine.dev",
  "logos": {
    "mark": { "src": "https://…/mark.svg", "width": 512, "height": 512, "monochrome": true },
    "small": {
      "light": "https://…/wordmark-light.svg",
      "dark": "https://…/wordmark-dark.svg",
      "width": 320,
      "height": 100
    },
    "icon": { "src": "https://…/mark-64.png", "width": 64, "height": 64 }
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
- **`theme_pack: null`** means stock Bootstrap and is answered only for a
  client on no site; every site of the identity provider names a pack, so
  a site never publishes `null`.
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
and `css` the stylesheet URL, resolved by the UI backend's server from
its local configuration, one pack name per host, the same way the
identity provider names `theme_id` per site, never fetched from the
identity provider at runtime, since every app serves the same build and
so already holds every pack; the shell stamps `data-brand` and appends
the `<link>` from that member alone, and a payload without it stamps
nothing. A UI backend that rewrites
`index.html` per site stamps the same two values into the file and
answers the same `brand.pack`, so the shell finds them present and
appends nothing, the identity provider and BoxVault being such backends,
the hostnames and what may differ per host fixed by the navbar contract's
status payload section. One
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
  clears it. Every key is optional.
- Two more members are writable beside the three above, the identity
  provider's sign-in approval settings the shared Preferences tab saves
  through the same call: `ciba_channel`, one of `PUSH`, `EMAIL` or `SMS`
  (`SMS` only while a verified mobile number exists), and `ciba_user_code`,
  the approval PIN, `null` clearing it; the PIN is never read back.
- `pack` is writable beside `theme`: a bare pack name (`^[a-z0-9-]+$`)
  the host offers in `brand.packs` sets the person's look, `null` clears
  it so they follow the host's own pack, and a name the host does not
  offer answers `422` `enum` at `/pack`; read back as `preferences.pack`
  wherever `preferences.theme` is read back.
- `region` is writable beside `language`, `theme` and `timezone`: the
  person's chosen legal region, a two-letter ISO 3166-1 country code or
  one of `EU`, `EEA`, `UK`, `null` clears it, used by the identity
  provider to pick the terms and policy variant; never inferred from
  `language`, because a language names no country and the law a person
  is owed depends on where they are.
- Validation: well-formed BCP 47 with no length cap, since RFC 5646 §2.1
  sets none and `ca-ES-valencia` is a registered fourteen-character tag;
  `light|dark|auto`; a known IANA zone id; a country code or named set
  for `region`; `PUSH|EMAIL|SMS`. A violation
  answers the validation contract's `422` problem body with a pointer per
  failing member, never a `400 { "error" }`, so the shared form paints it
  inline.
- `GET` on the same path returns the seven members the identity provider
  stores: `language`, `theme`, `pack`, `timezone`, `region`,
  `ciba_channel` and `ciba_user_code_set`, the last two the sign-in
  approval channel and whether an approval PIN is set.
- The shared Preferences tab sends `timezone` only when the person chose
  one that differs from the stored value; the zone it detects and
  preselects while none is stored is never written on its own.
- A successful write triggers the SCIM push, so subscribing apps converge
  without polling.

New local signups seed `language` from the request locale.

---

## Packs

**No file of the estate is ever versioned by a hash, in its name or in its
query**, because a second identity for one file is a thing every backend
must copy and keep in step and a stale one fails silently, while a fixed
name behind an ETag fails never; a pack's files are files of the build
like every other and are named once.

A pack is **variables only — never rules.** Rules are app-shaped: precompiled
Bootstrap bakes color into components, so `.btn-primary`, `.btn-outline-*`,
`.form-check-input:checked`, `.nav-pills`, `.pagination` and friends must be
re-declared by each app. That boilerplate is identical everywhere and is
documented app-side; it is not pack content.

A pack ships **both** the `--brand-*` values **and** the `--bs-*` bridge,
including the button component variables. That is what makes a pack
self-sufficient and a re-brand a file swap; if each app owned its bridge,
every new override would mean touching every app.

**Scope: colors, artwork and one face — never geometry.** A pack may set
the whole `--bs-*` color set, surfaces included: `--bs-body-bg`,
`--bs-tertiary-bg`, `--bs-secondary-bg`, `--bs-border-color`,
`--bs-body-color`, `--bs-emphasis-color`, `--bs-link-color` and the button
variables, each under `[data-brand="x"]` for the light variant and under
`[data-brand="x"][data-bs-theme="dark"]` for the dark one, so a site whose
surfaces are its own keeps them (Moonshine's neutral grays, Nomad's
purple-black) and the stock variant is the fallback wherever a pack names
nothing; every pack names a `link-color` per variant so hyperlinks follow
the brand, and the generator emits its hover beside it,
`--bs-link-hover-color` with its `-rgb` triplet, the link color mixed a
fifth toward black on light and white on dark, a complement of the link
and never Bootstrap's blue, computed at generation time because
Bootstrap paints a hovered link from the triplet. A pack does not set geometry, radius or spacing — the moment it
can, it can break layouts it has never been tested against; layout is the
feature's. The one typographic value it may carry is `--brand-auth-display`,
the brand's display face (decision 5 of the Universal Identity Contract):
the headline of the shared auth column, and, while a pack is stamped, the
brand name in the header's `.navbar-brand` and the sidebar's top, every
page's `h1`, `h2` and `h3` and every card title, so the face of the wordmark
is the face of the site's headings; the body face, the table face and every
control's face stay the chrome's, because a display face is drawn for size
and a monospace or a geometric face at 13px in a table is not readable, and
a pack that names no face leaves Montserrat on the chrome and Source Serif 4
on the auth column.

### Variable contract

Neutral prefix so a pack is authored once for the whole estate:

| Variable               | Purpose                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--brand-primary`      | brand color                                                                                                                                                                                                                                                                                                                                                 |
| `--brand-on-primary`   | text/icon color ON primary                                                                                                                                                                                                                                                                                                                                  |
| `--brand-icon-filter`  | the CSS filter that paints an image icon on the filled accent button in the on-primary color, `brightness(0) invert(1)` for a light `on_primary` and `brightness(0)` for a dark one, generated beside it because an SVG loaded through `img` cannot be recolored by the page any other way; the provider mark on the filled sign-in button is drawn with it |
| `--brand-warning`      | brand warning color                                                                                                                                                                                                                                                                                                                                         |
| `--brand-on-warning`   | text/icon color ON warning                                                                                                                                                                                                                                                                                                                                  |
| `--brand-logo`         | stencil URL for the mask pattern (optional)                                                                                                                                                                                                                                                                                                                 |
| `--brand-logo-color`   | paint color for the stencil (optional)                                                                                                                                                                                                                                                                                                                      |
| `--brand-auth-display` | the brand's display face: the auth column's headline, the brand name in the header and the sidebar top, `h1` to `h3` and card titles (optional; Source Serif 4 on the auth column and Montserrat on the chrome when absent), its files served with the pack                                                                                                 |

`--brand-on-*` exists because a single color cannot express its own
contrast pairing: a light brand needs dark text on it, a dark brand needs
light. Without it, a dark-primary pack renders unreadable buttons in every
app.

Surfaces carry no `--brand-*` alias: a pack that sets them writes the
`--bs-*` names directly, per variant, and the generator checks every text
color it sets against the surface it sits on at the same 4.5:1.

App-specific namespaces (`--hw-*`, `--bv-*`) remain for genuinely app-only
surfaces. Packs may technically reach them; doing so is undocumented and at
the pack's own risk.

### Source format and generation

**Pack source is YAML; the CSS is generated.** The generator derives the
`--bs-*-rgb` comma triples from the hex values, exactly as the Sass
`rgb-list()` it replaces did — plain CSS cannot emit that format, so
hand-maintained pairs would drift. The generator writes one file per pack,
`public/themes/<pack>/<pack>.css`, and nothing beside it: no digest file,
no second name, no version for a server to read.

A **raw-CSS escape hatch** exists for anything exotic. Hand-written packs
must invert the derivation to keep one source of truth:

```css
--brand-primary-rgb: 145, 197, 78;
--brand-primary: rgb(var(--brand-primary-rgb));
```

**A pack is a package of files a developer writes, and it belongs to the
shared UI.** A pack is one directory under the STARTcloud UI's
`public/themes/<pack>/`, beside `public/brand/`: its stylesheet and the font
files `--brand-auth-display` names, the artwork `--brand-logo` names living
under `public/brand/<name>/mark.svg` and named by root path in the YAML's
`logo`, since a mark is the brand's and not the pack's, so a
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
  --brand-icon-filter: brightness(0) invert(1);
  --brand-logo: url('https://…/mark.svg');
  --brand-logo-color: #8b5cf6;

  --bs-primary: var(--brand-primary);
  --bs-primary-rgb: 139, 92, 246;
  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, white);
}
[data-brand='moonshinedev'][data-bs-theme='dark'] {
  --bs-primary-bg-subtle: color-mix(in srgb, var(--brand-primary) 20%, black);
  --brand-logo-color: #ffffff;
}
```

Only genuine inversions repeat under the variant selector. The mark's
paint is per variant in the YAML, `logo_color: { light, dark }`, the same
shape as `surfaces`: the `light` value (the primary when absent) is
emitted in the brand block, and the `dark` value repeats under the dark
selector only when the YAML names one, each checked at 3:1 against the
`--bs-body-bg` of its own variant.

### Pack names

`data-brand` values are bare names in a shared namespace. **The shared UI's
`public/themes/` is the canonical source of what a pack name means**, one
directory per name; the authorization server's site configuration names one
of them per site. Standalone hosts carry vendored snapshots that may lag it —
that is expected behavior, not a fault.

Every site of the identity provider names a pack; a site with no pack is
not a valid site, because the auth column and the chrome then paint stock
Bootstrap where the site's own accent belongs, and `theme_id: light` is
retired as a site value (the variant is the person's, decision 70's list
is amended). The `startcloud` pack is the shared UI's own base look under
its name: Bootstrap's `#0d6efd` accent with white on it, stock light
surfaces, and the dark surfaces `#1a1d20` with the `#4d565e` border, the
same values the base sheet paints with no pack at all, so a site or a
host names `startcloud` for that look instead of naming nothing.

Email is branded through the identity provider's email-template
documents, a copy per site and per locale edited on its Email templates
page (Universal Identity Contract decision 164), never through a key in
the server's jar.

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
JavaScript. Defaulting the color to `currentColor` makes the mark inherit
the themed text color with no rule at all.

**Riders, all required:**

- **Explicit dimensions.** A masked element has no intrinsic size and
  renders 0×0 without them. The endpoint supplies `width`/`height`.
- **`role="img"` plus `aria-label`.** It is a styled `div`, not an image.
- **`forced-colors` fallback.** Windows High Contrast overrides
  `background-color`, so a masked mark **disappears** there. Provide an
  `@media (forced-colors: active)` branch with a real `<img>` or
  `forced-color-adjust`.
- **Print drops background colors** — accept it or add print CSS.

**Multi-color marks cannot be masked** — masking discards color. Choose
artwork that reads on both light and dark and needs no switching, or ship
`light`/`dark` variants. `--brand-logo` and `--brand-logo-color` are
therefore **optional per pack**.

**Bundled brand assets remain the fallback everywhere.** Endpoint down, 404,
CSP-blocked, or no pack configured must render the app's own mark — never a
broken image, never a half-branded page.

**One folder per brand, `public/brand/<name>/`, the same set in every
one, Prominic the model every other folder is measured against.** The
vectors are the sources and the rasters are rendered from them, never
drawn by hand: `logo.svg` is the brand's own wordmark, mark and name in
the brand's own type with every glyph as a path so no font is needed;
`mark.svg` is the square mark alone on a 512 canvas with a 41-unit margin;
`glyph.svg`, where the brand has one, is the mark's smallest element
alone on the same canvas; `header.svg` is `logo.svg` centred on 4608×512.
Every file paints itself: a `<style>` block with one `.brand-mark-root`
rule setting `color-scheme: light dark`, one class per colour prefixed by
the brand (`.pr-fg`, `.sc-cloud`) whose `fill` is a plain hex first and a
`light-dark(light, dark)` pair second, so an `<img>` follows the machine
and an inline copy follows `data-bs-theme`; a counter is a hole cut with
`fill-rule="evenodd"`, never a shape painted in the page colour; no
editor metadata, no ids, no `<title>`, `role="img"` and `aria-label` on
the root. Every raster is named after the vector it is rendered from and
the pixel size it holds, never by a size word: `mark-64.png`,
`mark-192.png`, `mark-512.png` and `favicon.ico` (16, 32 and 48 in one
file) are renders of `mark.svg`, `logo.png` a render of `logo.svg` fitted
into 640×104, each on a transparent ground; the branding endpoint's slot
names (`mark`, `small`, `icon`) are the identity provider's API and are
not file names.

The files the identity provider's sites need in the shared build, every
one supplied by the estate's owner and none drawn by the UI work; the
shell ships the fallbacks until each lands:

| File                                                                                                                                                                      | Size                                                                                                                                                                                                                                                                                                                | Used by                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/brand/<name>/mark.svg`, one per brand or product the estate owns                                                                                                  | 512×512, its light and dark paint through `light-dark()` under `color-scheme: light dark`, so an `<img>` follows the machine and an inline copy follows `data-bs-theme`                                                                                                                                             | `brand.logo_url` (the chrome's mark, the org mark, the favicon), a pack's `logo` as a root path (`--brand-logo`), and the `icon_url` of a sign-in provider of our own; one file, no dark twin                         |
| `public/brand/<name>/logo.svg`, one per brand or product                                                                                                                  | the brand's own wordmark, mark plus name in the brand's own type as paths, its own aspect, the same `light-dark()` paint                                                                                                                                                                                            | the source of `logo.png` and `header.svg`; the README header, the sign-in and error cards' heading (`brandWordmarkUrl`, `logo.svg` in the folder of `brand.logo_url`) and any place the name is drawn beside the mark |
| `public/brand/<name>/glyph.svg`, where the brand has one                                                                                                                  | 512×512, the smallest element of the mark alone (Prominic's asterisk)                                                                                                                                                                                                                                               | the tiniest sizes, a favicon or a rail, where the whole mark would not read                                                                                                                                           |
| `public/brand/<name>/header.svg`, one per brand or product                                                                                                                | 4608×512, `logo.svg` centred                                                                                                                                                                                                                                                                                        | the README header of that brand's repositories                                                                                                                                                                        |
| `public/brand/<name>/mark-192.png` and `mark-512.png`, one pair per brand or product                                                                                      | 192×192 and 512×512, rendered from `mark.svg` on a transparent ground, never drawn by hand                                                                                                                                                                                                                          | the web app manifest's raster icons and the `apple-touch-icon`, since an installed app's icon is a raster on every platform                                                                                           |
| `public/brand/<name>/mark-64.png`, one per brand or product                                                                                                               | 64×64, rendered from `mark.svg`                                                                                                                                                                                                                                                                                     | the branding endpoint's `icon` slot; the SVG is preferred everywhere the UI itself draws                                                                                                                              |
| `public/brand/<name>/favicon.ico`, one per brand or product                                                                                                               | 16, 32 and 48 in one file, rendered from `mark.svg`                                                                                                                                                                                                                                                                 | the `<link rel="icon">` beside the SVG link in `index.html`, for a browser, a bookmark or a shortcut that takes no SVG favicon                                                                                        |
| `public/brand/<name>/logo.png`, one per brand or product                                                                                                                  | 640×104, `logo.svg` rendered at height 104 and centred, fitted by width only where the wordmark is wider than 640 at that height                                                                                                                                                                                    | the branding endpoint's `small` slot for relying apps                                                                                                                                                                 |
| `public/brand/vendors/<vendor>/<product>.svg` and `public/brand/vendors/<vendor>/mark.svg`, `logo.svg`, one folder per vendor whose products a downloads host distributes | the product marks as the vendor ships them (`hcl/notes.svg`), and where the vendor publishes a brand kit its mark on the 512 canvas and its wordmark, the paint `light-dark()` per the vendor's own guide (panagenda: `#008acc` blue and `#bbbdbe` gray on light, the guide's one-color white logo on dark, every part flat `#ffffff`) | the `icon_url` of a downloads product, family or vendor row on BoxVault, by URL                                                                                                                                       |
| `public/brand/providers/<id>.svg`, one per federated provider that is not ours                                                                                            | square                                                                                                                                                                                                                                                                                                              | `icon_url` of `GET /api/auth/methods` (google, github, microsoft); our own providers name `/brand/<name>/mark.svg`                                                                                                    |
| `public/themes/switchboard/poppins-<weight>.woff2`                                                                                                                        | weights 500, 600, 700                                                                                                                                                                                                                                                                                               | `--brand-auth-display` of the `switchboard` pack, named under `fonts` in its YAML; Helvetica paints until they land                                                                                                   |
| `public/themes/prominic/ocr-a-tribute-400.woff2`                                                                                                                          | weight 400, the face of the Prominic wordmark                                                                                                                                                                                                                                                                       | `--brand-auth-display` of the `prominic` pack, named under `fonts` in its YAML; the system monospace paints until it loads                                                                                            |
| `public/themes/startcloud/startcloud.css` and its YAML source                                                                                                             | the fourth pack, the shared UI's own base look under its name                                                                                                                                                                                                                                                       | the `startcloud` site and every BoxVault host that names it as `brand.pack`                                                                                                                                           |
| `public/themes/prominic/prominic.css` and its YAML source, `logo: /brand/prominic/mark.svg`                                                                               | the fifth pack, the Prominic accent `#67142c`, the p and asterisk as the mark                                                                                                                                                                                                                                       | BoxVault's downloads face at `downloads.prominic.net`, named per host in its sites map as `brand.pack` and `logo_url`                                                                                                 |

The sites are `startcloud`, `moonshinedev`, `switchboard`,
`nomadservices` and, on BoxVault's downloads face alone, `prominic`.

---

## Accessibility

The pack generator **refuses** a pack failing any of these, so accessibility
is a build gate rather than a review note:

- **WCAG 2.2 §1.4.3** — 4.5:1 for `--brand-primary` against
  `--brand-on-primary` (3:1 for large text).
- **WCAG 2.2 §1.4.11** — 3:1 for non-text contrast: the brand mark and,
  critically, **focus indicators**. A pack changing `--bs-primary` changes
  Bootstrap's focus ring, so a pack can pass text contrast and still fail
  keyboard accessibility. The focus ring is therefore the chrome's and
  never the pack's: the generator emits one `--brand-focus-ring` per
  variant, computed from the accent, nudged toward black on the light
  variant or white on the dark one in 5% steps only until the opaque
  color reaches 3:1 against that variant's body background, at the
  lowest alpha whose color composited over that background reaches 3:1,
  measured composited as WCAG technique G195 measures a partially
  transparent indicator; a pack never sets a ring.
- **WCAG 2.2 §2.4.11** — focus appearance requires contrast against both the
  component and its background.

The accent is the site's and is never shifted to pass: when a pack's
YAML omits `on_primary` the generator computes `--brand-on-primary` as
`#ffffff` or `#000000`, whichever contrasts with `--brand-primary` more,
and refuses the pack only when the better of the two is under 4.5:1,
because a brand color is chosen by the site, the text on it is
arithmetic, and the two extremes are the only pair no accent can defeat
that white can pass. A pack that names `on_primary` is checked as named.
The identity provider's four sites resolve to: `moonshinedev` (`#1f9d57`)
`#000000` at 6.02:1, `switchboard` (`#24ade3`) `#000000` at 7.5:1,
`nomadservices` (`#6c5ce7`) `#ffffff` at 4.86:1, and `startcloud`
(`#0d6efd`, Bootstrap's own blue) `#ffffff` at 4.50:1 as named;
`--brand-on-primary` is also the auth column's button text, so those
buttons read black on the two light accents, and the provider mark on
the filled button follows it through `--brand-icon-filter`, white on
Prominic's maroon and black on the two light accents.

`lang` on `<html>` must carry the user's language: screen readers take
pronunciation from it, and the value is already stored, published and
write-through.

---

## Content Security Policy

For a consuming app:

- **`style-src`** — the theme host, for the pack stylesheet, plus
  `'unsafe-inline'` on the identity provider until the shared build is free
  of inline styles, identity contract decision 106.
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
- **Pack CSS and assets**: served like every other file of the build.
  **No file of the estate is ever versioned by a hash, in its name or in
  its query**, because a second identity for one file is a thing every
  backend must copy and keep in step and a stale one fails silently, while
  a fixed name behind an ETag fails never. Every entry, chunk, stylesheet
  and asset Vite creates keeps its fixed name (`assets/<name>.js`,
  `assets/<name>.css`), a pack's stylesheet, artwork and font files keep
  theirs, and no build step, plugin, server or contract may add a content
  hash to a file name or to a query string, ever; caching is the server's
  job through `Cache-Control: no-cache` with an ETag per file, a
  conditional request and the bytes only when they changed, never
  `immutable`, `index.html` and `/` `no-store` (identity contract decision
  132).
- **A re-brand reaches reloads, not live sessions** — absent app-shell
  caching of the served HTML, which a service worker with a `fetch` handler
  would introduce; the estate's worker caches only the manifest and the
  marks and never the served HTML or assets.

A conditional request per load is the price and it is paid everywhere: the
pack revalidates the way `/assets/` and every other served file does, on
the origin that serves the build, which is the app's own by the
standalone-first and bundled-fallback rules, so nothing new is put on the
render path (RFC 9111).

---

## Staging

Server-side injection is the recorded end state. For a first pass it is
**deferred**, because the two flashes it addresses are not the same size:

| Item                                | Status                                                                                                 | Reason                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-paint variant script            | **Ship**                                                                                               | Wrong-variant paint is the whole page; it is also a live defect independent of packs                                                                                             |
| Server-side injection               | Defer on a UI backend that serves one static file; **ship** on one that rewrites `index.html` per site | Late-brand was an accent-and-mark shift while packs set colors only; a pack that sets surfaces makes it a whole-page repaint, and a per-site server already has the site in hand |
| `Vary: Sec-CH-Prefers-Color-Scheme` | Defer                                                                                                  | Attaches only to the client-hint leg                                                                                                                                             |
| CSP nonce                           | Defer                                                                                                  | Obligation stands the day any CSP is enforced                                                                                                                                    |

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

- **Typography.** v1 is colors and marks, with the one exception above:
  `--brand-auth-display` and its files on the theme host, `font-src`
  joining the CSP list for it, the one face reaching the auth headline,
  the brand name in the chrome and the headings. No other face is a
  pack's. Every face,
  bundled or a pack's, is declared with `font-display: swap`, and the
  shared build preloads the auth column's two faces from `index.html`,
  so text paints in the fallback at once and settles without a blank
  gap; a face that blocks paint or swaps late on the sign-in page is the
  most visible flash a visitor can meet.
- **`prefers-reduced-motion`.** The same user-preference shape as the
  variant axis, and a WCAG 2.3.3 concern, but not modeled here.

---

## Specification anchors

BCP 47 / RFC 5646 (language tags) · RFC 4647 (lookup) · RFC 7643/7644
(SCIM) · RFC 8942 (client hints) · RFC 9110/9111 (caching, `Vary`) ·
WCAG 2.2 §1.4.3, §1.4.11, §2.4.11 · CSS Cascade 5 (specificity, `@layer`) ·
CSS Color 5 (`color-mix()`) · CSS Masking 1 · CSS Media Queries 5
(`prefers-color-scheme`, `forced-colors`) · CSS Logical Properties 1 (for
RTL, since the notification contract already carries `dir`) · CSP Level 3.
