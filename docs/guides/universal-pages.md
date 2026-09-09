---
title: Universal Pages Contract
layout: default
nav_order: 10
parent: Guides
permalink: /docs/guides/universal-pages/
---

## Universal Pages Contract

{: .no_toc }

One page set for every estate app that serves packaged things: an
organization owns items, an item has versions, a version has providers or
architectures, a provider has architectures, and an architecture has one
file. BoxVault serves boxes and ISOs that way, the ISOs gaining the same
fields as the boxes (item → versions → architectures → file, the Debian
ISO having versions and architectures like any box); the provisioner
catalog serves provisioners the same way; provisioners become a third
BoxVault collection later, so nothing in the pages may know which
collection it is drawing. This contract fixes the information
architecture, the routes each app maps onto it, the breadcrumb, the one
item shape the pages render, the listing model (groups, columns, actions,
the one view toggle), and the page set itself, so that every app runs the
one `features/catalog` of the STARTcloud UI and differs only in the
collections its `/api/status` names and the features it advertises. It extends the
[Universal Navbar Contract](universal-navbar/), which owns the chrome
around these pages and the search that narrows them. The visual reference
is [universal-pages.html](../universal-pages.html) — the first frame on
that page is live (the route drives the crumbs and the page, the filter
panel narrows it, the switcher changes only the active organization), and
the annotated frames after it show each page at rest, then the catalog on
the same pages; a yellow note on that page marks what the design changed
against the apps as they were before it.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **Context is not location.** The active organization (the user menu's
  organization row, the Switch Organization modal it opens,
  `localStorage` `activeOrganization`) is context for org-scoped actions:
  the org console, the ticket customer id, the defaults of a create form.
  Picking an organization in the switcher sets that context and nothing
  else; the page never moves. The breadcrumb is location and comes from
  the route alone. The two never share a control.
- **Primary is not active.** The primary organization is the server's
  pointer on the user (the crown in the switcher); it is only the first
  fallback when no active organization is stored.
- **One breadcrumb.** It lives in the header after the brand and is the
  only breadcrumb in the app: plain links up the route, no dropdown
  anywhere in it. Pages draw none of their own.
- **Narrowing is filtering.** A listing page is narrowed by the navbar
  search and its filter panel: to one collection, one visibility, one
  provider. Collections, visibilities and the rest are pills, never
  separate pages, tabs or pickers; headings on a listing are labels with
  counts.
- **Existing URLs never move.** BoxVault's paths (`/`, `/{org}`,
  `/{org}/{box}`, `/{org}/{box}/{version}`, `/{org}/{box}/{version}/{provider}`)
  are depended on by notification links, hyperweaver deploy links, badges,
  emails and the catalog, and the Vagrant API decides by user agent on the
  same paths. Convergence maps onto them; it does not rename them. New
  paths are added beside old ones, never in place of one, and a deep link
  from any app's search result lands on the same shape in any other app.
  The ISO paths are new and carry no backwards compatibility: they take
  the box shape as it is.
- **One pages folder.** The pages live once, in `src/features/catalog/`
  of the STARTcloud UI; no app carries a copy. Every collection the
  estate serves lives once too, under `src/features/collections/<key>/`
  (its definition, adapter, API calls and write slots), and a UI backend mounts
  the ones its `/api/status` names in `collections`, in that order. There
  is no per-app code: a new UI backend is a new status payload.
- **One Listing.** Home, organization and collection pages are one
  component with one render path: organization group rows when the page
  spans organizations, the same headings, the same actions row, the same
  one view toggle.
- **One visibility rule per app.** What a member sees is decided once:
  BoxVault by its read routes, discover and per-organization lists alike,
  which widen by the caller's token to the organizations the token's user
  belongs to and show an unpublished item, of any kind, only to the user
  who uploaded it, never to other members; the catalog by
  its adapter, which merges each membership's private catalog with the
  public one. No page or second adapter re-decides it, and no collection
  has a second route for its public rows.
- **Read-only is a valid app.** The catalog's collection carries no write
  slots and its UI backend advertises no `uploads`, so the pages render without
  a single management control.

---

## Information architecture

| Level                | Route shape                  | Page                                                                                                     | Breadcrumb after the brand            |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| home                 | `/`                          | HomePage: every collection, organization group rows, private and public rows side by side                | nothing                               |
| collection, all orgs | `/{collection}`              | CollectionPage across organizations                                                                      | `› ISOs`                              |
| organization         | `/{org}`                     | OrgPage: org header, one heading row and table per collection; private items when the viewer is a member | `› STARTcloud`                        |
| collection, one org  | `/{org}/{collection}`        | CollectionPage for that organization                                                                     | `› STARTcloud › ISOs`                 |
| item                 | `/{org}/{collection}/{item}` | ItemPage                                                                                                 | `› STARTcloud › Boxes › alma9-server` |
| version              | `…/{item}/{version}`         | VersionPage                                                                                              | `› … › 1.2.3`                         |
| provider             | `…/{version}/{provider}`     | ProviderPage                                                                                             | `› … › zone`                          |

An app maps its own paths onto those levels; the shape above is the
canonical one and the one a new app adopts. Two existing apps map it as
follows.

| Level                | BoxVault (unchanged paths)                                                    | Catalog                                     |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| home                 | `/`                                                                           | `/`                                         |
| collection, all orgs | `/isos` (boxes have no page of their own; the Collection filter narrows home) | `/` is provisioners                         |
| organization         | `/{org}`                                                                      | `/{org}`                                    |
| collection, one org  | `/{org}/isos`                                                                 | `/{org}`                                    |
| item                 | `/{org}/{box}`, `/{org}/isos/{iso}`                                           | `/{org}/{provisioner}`                      |
| version              | `/{org}/{box}/{version}`, `/{org}/isos/{iso}/{version}`                       | `/{org}/{provisioner}/{version}`            |
| provider             | `/{org}/{box}/{version}/{provider}`, `/{org}/isos/{iso}/{version}/{arch}`     | `/{org}/{provisioner}/{version}/{provider}` |

`/isos`, `/{org}/isos`, `/{org}/isos/{iso}`, `/{org}/isos/{iso}/{version}` and
`/{org}/isos/{iso}/{version}/{arch}` are additive browser routes, the ISO's
versions and architectures reached the way a box's are, the architecture
drawn by the shared leaf page (`ProviderPage`) a box provider draws, one
component both call; the Vagrant handler keys on the `Vagrant/` user agent
before any of them.

The catalog identifies an organization by the membership name from the
token, the same word BoxVault routes by. Public items are grouped under
their GitHub repository owner and matched to a membership by name; that
grouping is interim until the OAuth flow lets people claim their own
repositories, after which the IdP organization (uuid) is the only
identity and nothing may rely on the name equality.

BoxVault organizations carry a `name` (the URL slug, frozen at creation
for IdP-managed orgs) and a `display_name` (the human label, refreshed on
every sync). Routes, crumbs and group rows use the slug; the org page
header shows the display name with the slug beneath, as the org console
does.

Reserved first segments (never read as an organization) are the same on
every UI backend: the universal routes `about, organizations, login, auth,
register, invite, profile, admin, org-console, setup, callback, docs,
schema, private, push, search, vm, watches`, the identity provider's
`authenticator, authenticator-method, passwordRecovery, passwordReset,
registration, complete-onboarding, qrcode, provider-registration, public,
oauth2, activate, activated, ciba, connect, continue,
link-account-consent, link-account, user, org, notifications,
error` of the
[Universal Identity Contract](universal-identity/), plus the segment of
every mounted collection (`isos`). `api` is reserved on every UI backend, the `/api/status`
probe answering before any page renders. The build's own folders are
reserved on every UI backend too: `assets` (Vite's bundle folder),
`brand`, `locales`, `fonts` and `themes` (the folders under `public/`),
because the origin that serves the build answers a file for those first
segments before the router sees the path, so an organization named
`themes` would never reach its page; a UI backend refuses those names at
creation the way it refuses `api`.

---

## Breadcrumb

`src/utils/routes.js` turns the current path into crumbs for the header:

- Parse the path with the mounted collections: `org`, `name`, `version`,
  `provider`, each optional in that order, the collection read from its
  segment or implied for the collection whose `segment` is empty; a
  reserved first segment yields no crumbs of its own, and a route a
  sidebar row matches draws `<group> › <row>` instead, the group a plain
  word and the row a link to itself.
- One crumb per present level, each a plain link (`to`) to that level's
  route; the last crumb is the page itself and still links to itself.
- The org crumb carries the org's logo → Gravatar → the app's mark; the
  collection crumb carries the collection's icon; item, version and
  provider crumbs are text.
- The collection crumb is always drawn, even where the route has no
  segment for it (BoxVault's `/{org}/{box}` reads `› org › Boxes › box`);
  it links to the collection page, which in BoxVault's boxes case is the
  org page itself.
- No crumb is a picker. Switching organization is the user menu's job and
  changes context only; narrowing to a collection is the filter panel's
  job.

---

## Listing

`Listing` is the one component behind HomePage, OrgPage and
CollectionPage. It loads every collection it is given through the
adapter, registers the search binding, and renders:

- **Organization groups.** Home and a collection page across
  organizations draw foldable organization group rows inside each
  collection's table, private and public rows side by side, the rows under
  a group offset by the watch cell so the item icon sits under the
  organization logo, a one-rem gap before every group heading after the
  first, faint row lines and a faint stripe so the gaps and the bands do
  the separating; an organization page and a collection page on one
  organization draw none.
  There is no Private / Public level: the Visibility column and the
  Visibility pill tell the two apart. Folds persist per page with the
  filters, the sort, the view and the hidden columns under
  `table_prefs_<org or home>`.
- **Every collection is always drawn.** Every collection gets its heading
  row, count and table; an empty one shows a "Nothing here yet." row (or
  "Nothing matches." while a filter is on) so the page never changes shape.
- **Heading rows carry the actions.** A collection heading row holds the
  collection's icon, label and count on the left and the collection's
  `ListActions` slot on the right, the same pair for every collection
  that can be written to: a green Add New and a red Remove All (nothing
  for the catalog); Add New opens the create form on boxes and the upload
  zone on ISOs, and whatever it opens wraps under the row at full width.
  Headings are labels, not links; there are no "All …" links.
- **One view toggle per page**, list or cards, drawn once at the right of
  the org header row when the page has one, else at the right of the first
  collection's heading row beside the page's actions (home: Discover
  organizations), so no page carries an empty row above its first heading;
  stored per page; the collection's `defaultView` seeds it (catalog cards,
  BoxVault list).
- **One table per collection**, organization rows as group rows inside it,
  so every column lines up across organizations. Tables and cards render
  the same rows; cards carry `ItemChips`, a row of link glyphs for the
  item's `links` (repository, homepage, issues, pipeline, each drawn only
  when present) with the collection's `ItemQuickActions` slot at the
  row's right, and `CardExtras`. A table draws the same `ItemQuickActions`
  slot in one unlabeled cell after the collection's columns; both apps
  put the Deploy control there, the Hyperweaver glyph of
  `features/deploy`, for every box or provisioner the viewer may deploy
  while the UI backend advertises `deploy`, aimed at the item's newest
  non-deprecated version. The collection's `components/deploy.jsx` supplies only the
  Hyperweaver origin (BoxVault `/api/config/hyperweaver`, the catalog
  `/api/config`), the entitlement check (a Hyperweaver entry in the
  viewer's `entitlements`) and the deep link: boxes
  `?create=machine&box=…&box_version=…&box_arch=amd64&box_url=…`,
  provisioners
  `?create=machine&provisioner=…&provisioner_version=…&provisioner_url=…`,
  the latter the catalog's best-effort contract until Hyperweaver's
  landing reads it beside the box parameters.
- **Home is home.** A box or ISO is created inside an organization, so
  create and delete actions live on the org page; home carries only
  Discover organizations beside the toggle on its first heading row.

### Columns

Every collection's table starts with the same columns in the same order,
then adds its own. The watch cell is drawn on every table, star or blank,
so a table keeps its shape whether or not the viewer is signed in and rows
under an organization group line up on it; its header is a star, and while
the viewer can watch it sorts watched rows first. The table is
fixed-layout and every short column carries a fixed width in the shared
stylesheet (star and quick-actions cells 2.5rem, Name 28% with the text
ellipsized, Visibility 6.3rem, Created and Updated 6.5rem, Status 6.8rem,
Downloads and Versions 7.3rem, right-aligned with a wider right gutter,
Latest release 9.3rem, OS 10rem, Tier 7rem; header cells never wrap), so
the shared columns sit at the same x on every table of both apps however
many columns follow, and only the wide columns — Providers, Architectures
and the catalog's coverage — share the remainder:

| Column      | Boxes                                                                                    | ISOs                                                                         | Provisioners                                 |
| ----------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| watch       | star signed in, blank signed out                                                         | star signed in, blank signed out                                             | star signed in, blank signed out             |
| Name        | org logo + `org/name` link                                                               | org logo + `org/name` link                                                   | icon + label link, slug beside it            |
| Visibility  | Public / Private                                                                         | Public / Private                                                             | Public / Private                             |
| Created     | `createdAt`, hidden until shown                                                          | `createdAt`, hidden until shown                                              | none                                         |
| Updated     | `updatedAt`, hidden until shown                                                          | `updatedAt`, hidden until shown                                              | none                                         |
| Downloads   | sum of file `downloadCount`                                                              | sum of file `downloadCount`                                                  | health downloads                             |
| then        | Status · OS · Latest release · Versions · Providers · Architectures (hidden until shown) | Status · OS · Latest release · Versions · Architectures (hidden until shown) | Tier · Latest release · Versions · Providers |
| row actions | none                                                                                     | none                                                                         | none                                         |

Rows carry no action buttons; an item's actions live on its page and the
watch star is the only in-row control. One label key per column,
`pages.table.*`, shared by every collection. Providers and Architectures
draw one badge per name, alphabetical and case-insensitive, the same
order the filter pills use. Every column carries a sort rule, so every
header sorts, ascending then descending then off: names, OS and checksums
by their lower-cased text, dates and counts by value, Visibility with
Public first and Status with Published first, Providers, Architectures
and the catalog's coverage by their alphabetical names joined so rows
with the same set sit together, and a missing value first on the
ascending pass. A column may carry
`defaultHidden` (Created, Updated and Architectures do), and in list view
the viewer shows or hides any column of a table through that collection's
Columns group in the filter panel; the hidden set persists per page
beside the filters, and a sort on a hidden column is dropped until the
column returns.

---

## Item shape

Every page renders one shape. An app's adapter produces it from its own
data and never leaks its wire format into a page.

```text
organization { name, uuid, logo, displayName, description }
item {
  organization, name, label, description, icon, artwork,
  isPublic, published, createdAt, updatedAt, latestReleaseAt, downloads,
  os { label, iconUrl } | null,
  metadata | null, readme | null,
  links { repo, homepage, issues, pipeline, badge },
  extras { ... }                       app-only data for slots, never read by a page
  versions [ version ]
}
version {
  version, createdAt, updatedAt, description, releaseNotes,
  deprecated, deprecationReason,
  providers [ provider ], artifacts [ architecture ]
}
provider { name, description, architectures [ architecture ] }
architecture {
  name, defaultBox, fileName, fileSize, checksum, checksumType,
  downloadUrl, downloadCount
}
```

- `metadata` is the facts block (`distro`, `distro_version`, `os_name`,
  `vm_type`, `desktop`, `username`, `password`, `communicator`, `cpus`,
  `memory_mb`, `disks`, `cdroms`, `providers`, `built`,
  `core_provisioner_version`); absent facts are skipped.
- An ISO gains the same fields as a box: its `versions` each carry
  `artifacts`, one architecture per file, and no `providers`, because the
  Debian ISO has versions and architectures like any box; the ItemPage
  draws it as it draws a box, hero, actions, facts and the versions table,
  each architecture reaching the shared leaf page at
  `/{org}/isos/{iso}/{version}/{arch}`, and the ISO's `downloads` sums its
  files' `downloadCount`, incremented by the ISO download controller.
  Nothing is half baked here: every ISO page, route and slot is wired as
  far as the box shape carries it.
- A catalog artifact maps to an `architecture` with `downloadUrl`,
  `checksum` and `checksumType` and no size or count.
- `published: null` and `isPublic: null` hide the matching chip and
  column.

| Source         | BoxVault adapter                                                                                                                                                                | Catalog adapter                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| list, all orgs | `BoxService.discoverAll`, `IsoService.discoverAll`, both widened by the caller's token to the token's memberships                                                               | `/api/catalog` plus `/api/private/{uuid}/catalog` for every membership while the UI backend advertises `private-catalogs`                                                                                                        |
| list, one org  | `BoxService.getAll`, `IsoService.getAll`, both widened by the caller's token                                                                                                    | `/api/private/{uuid}/catalog` + public items by owner                                                                                                                                                                            |
| item           | `BoxService.get` + `VersionService.getVersions` + `ProviderService.getProviders`; `IsoService.get` + its versions, each with its files                                          | the item from the list, providers per version from `/api/catalog/health`                                                                                                                                                         |
| version        | `VersionService.getVersion` + providers + architectures + `FileService.getDownloadLink`; the ISO version's files as artifacts, each with its download link                      | the version's artifacts                                                                                                                                                                                                          |
| provider       | `ProviderService.getProvider` + `ArchitectureService.getArchitectures` + `FileService.info`; the ISO architecture's one file from its version, drawn by the same ProviderPage   | the version's artifacts                                                                                                                                                                                                          |
| watches        | `BoxService.watch/unwatch/getUserWatches`, `IsoService.watch/unwatch/getUserWatches`, one watch set per collection; dropped by the registry when the UI backend lacks `watches` | the Worker's `/api/watches`: `GET` the caller's ids, `POST { id }`, `DELETE ?id=`, kept in KV under the token's uuid so they follow the user; the data job notifies each watcher of a new version through the hub inbox and push |
| health extras  | none                                                                                                                                                                            | `tier`, `failed_rules`, `presentation`, coverage per version                                                                                                                                                                     |

---

## Collections registry

`src/features/collections/registry.js` maps every collection token the
estate knows to its definition, and `collectionsFor(status)` mounts the
ones the UI backend's `collections` names, in that order; each definition carries
its own route segment, hard-coded in the definition and never derived from
its position in the list:

```text
collection {
  key            'boxes' | 'isos' | 'provisioners' | ...
  labelKey       t key
  countKey       t key with plural forms for a group's count ("1 box", "2 boxes")
  icon           element
  segment        the route segment, hard-coded per collection; '' where the collection owns the root
  hasVersions    whether the ItemPage draws a versions table
  itemRoute      whether rows link to an item page
  searchKey      the placeholder key
  defaultView    'table' | 'cards'
  adapter        the functions above, or the subset the collection has
  canManage      (item, user) → boolean, for the write slots
  filterGroups   the collection's own groups for the navbar panel
  columns        the collection's columns after the shared ones
  matches        optional query matcher
  slots {
    ListActions, ItemQuickActions, RowActions,
    ItemActions, ItemChips, ItemHeaderExtra, ItemExtras, ItemSections, CardExtras,
    VersionsActions, VersionRowActions, VersionActions, VersionBannerActions, VersionNotesActions,
    ProvidersActions, ProviderRowActions, ProviderActions,
    ArchitecturesActions, ArchitectureRowActions
  }
}
```

Slots receive the current item shape, a `reload` function, `notify` and,
on detail pages, `setEditor` / `setForm`; they own their forms,
confirmations and API calls, and the pages never call a write endpoint.
`ItemSections` renders after the versions table and is how a collection
adds its own foldable section to an item page (the catalog's Quality).

---

## Pages

- **PageHeader**: media (artwork), title with an optional trailing control
  (the watch star), subtitle, chips (`StatusChips`: published/pending,
  public/private, OS, deprecated), an actions row on the right, children
  (description, CI bar). No crumbs.
- **HomePage**: `Listing` over every collection, grouped by organization,
  the Discover organizations button and the toggle on the first
  collection's heading row.
- **OrgPage**: the org header (logo, display name, slug and description)
  with the toggle on its right, then `Listing` flat: one heading row with
  actions and one table per collection.
- **CollectionPage**: `Listing` over one collection, grouped across
  organizations, flat on one; the heading row carries the actions and the
  toggle.
- **ItemPage**: PageHeader (its action row opens with the filled Deploy
  button for the newest non-deprecated version whenever the viewer is
  signed in, entitled to Hyperweaver and Hyperweaver is configured, on
  boxes and provisioners alike), the `ItemExtras` slot (BoxVault's
  use-this strip with the version select and the same Deploy button for
  the selected version, opening Hyperweaver with the box pre-selected),
  the facts panel (from `metadata`)
  and the README side by side when present, the versions table newest
  first (version, released, details, providers, artifacts, each column
  shown only when a version carries it, the row actions slot), then the
  `ItemSections` slot. The ISO page is the same component with
  `hasVersions: true`, the ISO gaining the same fields as a box, its
  versions table carrying the artifacts column instead of providers; its
  actions (Make public / Make private, Publish / Unpublish, Rename,
  Delete) are the `ItemActions` slot, and Add Version, the version row
  actions, the artifact upload zone and the artifact row actions are the
  same slots a box fills.
- **VersionPage**: PageHeader with the deprecated chip, the deprecation
  banner, release notes (markdown), the meta row, the artifacts table
  where a version has artifacts (each architecture of a collection without
  providers a link to the leaf page), the providers table (name,
  description, downloads per architecture, actions slot).
- **ProviderPage**: PageHeader, the architectures table (name, default,
  size, checksum click-to-copy, checksum type, download with count,
  actions slot); the same component is the ISO architecture's leaf at
  `/{org}/isos/{iso}/{version}/{arch}`, one file in its table, a shared
  component both collections call.
- **AboutPage**: the app's About at `/about`, drawn from props only: a
  page header in the PageHeader shape with the brand, the title, the
  version chip (the UI backend's `/api/status` version through `useStatus()`,
  the same value the footer shows), the description, the goal as a quote and, when the app
  passes one, the favorite toggle as the header's action; then Start here
  (the documentation links as a list, the getting-started guide first)
  beside What you can do here (features as a check grid), How it fits
  together (components as headed cards) and Help and community (support
  links as a footer strip). Every link on the page appears once; BoxVault
  feeds it its backend's public content and its favorite toggle, the
  catalog its own locale text.
- **LoginPage**, **RegisterPage** and **InvitePage**: the account pages of
  the [Universal Session Contract](universal-session/), drawn from the
  provider, the return-path helper and the app's `auth` adapter inside
  `AuthShell` (the centered auth column with its alert, spinner and inbox
  icon) with `ProviderButtons` for the identity providers; an app routes to
  them only when it has accounts of its own, and the catalog carries them
  unrouted.
- **ProfilePage**: the account's own page for an app with accounts of its
  own, `ProfilePage({ session, events, returnTo, account, activeOrgUuid })`:
  the avatar card through the chrome's `Avatar` with the verification
  notice, then Profile (display name, the Gravatar facts), Organizations
  (memberships with make-primary for local sessions and leave, pending join
  requests), Security (password, email, delete account through
  `session.signOutEverywhere`) and Service accounts (create in the chosen
  organization, the active one by default, the one-time token, the keys
  grouped per organization, select and delete); `account` is
  `{ gravatarProfile, changePassword, changeEmail, changeName, remove,
verifyMail, resendVerification, organizations, leave, setPrimary,
requests, cancelRequest, serviceAccounts: { list, organizations, create,
remove } }`, and an edit that the session must reflect calls
  `session.reload()` and emits `login` on the bus. Its keys are
  `profile.*` in `shared.json`; the catalog carries it unrouted, its
  profile being the identity provider's.
- **OrgConsolePage** and **DiscoveryPage**: the organization pages of an
  app with organizations of its own, over one `organizations` adapter
  (`get, update, accessMode, users, memberRole, removeMember, invite,
invitations, removeInvitation, requests, approveRequest, denyRequest,
discover, join, gravatarProfile`).
  `OrgConsolePage({ session, activeOrgKey, organizations, org, admin })`
  is the console of the active organization for its owners and admins:
  Organization (the editable record and access mode of a local
  organization, the read-only profile with the provider link of an
  IdP-managed one, the members as `UserCard` rows with role and removal
  controls, searched from the navbar), Join requests (shown for a local
  organization, and for an IdP-managed one only while its access mode is
  request-to-join) and Invitations (a local organization only, the
  provider owning invitations otherwise; a hidden tab that was active
  falls back to Organization);
  `admin` is the app's global-admin flag folded into `isOwner`, and a
  rename stores the new name under `activeOrgKey` and refreshes the
  session. `DiscoveryPage({ session, returnTo, organizations, orgMark,
joinIntentKey })` lists the organizations open to discovery with their
  access mode and counts, searched from the navbar, and opens the
  request-to-join dialog (a react-bootstrap `Modal`); a visitor is sent to
  sign in with the organization kept under `joinIntentKey`. `UserCard`
  (`user, currentUser, orgRole, columnClass, gravatarProfile` and the
  optional `onChangeRole, onSuspend, onResume, onRemoveFromOrg, onDelete`)
  is exported for any app screen that lists members. Their keys are
  `orgConsole.*` and `discovery.*` in `shared.json`; the catalog carries
  both unrouted.
- **AdminPage**: the admin page of an app with accounts and configuration
  of its own, `AdminPage({ session, returnTo, allowed, admin,
activeOrgKey, updateCommand })`: the update notice (`UpdateNotice`, the
  app's own `updateCommand` with a copy button) when the app's
  `updateStatus` reports one, then Organizations and users
  (`AdminOrganizations`: every organization with its `UserCard` members,
  searched from the navbar, edit in a react-bootstrap `Modal`, rename,
  suspend, resume, delete), Configuration (`AdminConfig`: one tab per name
  in `status.config`, the served schema walked by `schemaSections.js` into
  sections and foldable subsections drawn through `ConfigSections` and
  `ConfigField`, validated on blur and on submit through the shared
  evaluator, the `OidcProviders` block inside auth with its add-or-edit
  `Modal`, update, restart, SSL upload on upload fields, the SMTP test on
  mail) and System (`AdminStorage`, one bar per
  storage path); `admin` is `{ organizationsWithUsers, organization,
updateOrganization, accessMode, suspendOrganization, resumeOrganization,
removeOrganization, removeMember, removeUser, suspendUser, resumeUser,
gravatarProfile, config: { get, update, restart, testSmtp, uploadSsl },
storage, updateStatus }`, `allowed` the app's global-admin flag; a
  visitor is sent to sign in and a non-admin home. With the sidebar of
  the navbar contract those three are the admin feature's sidebar entries
  at `/admin`, `/admin/config` and `/admin/system`, one page each, on
  every UI backend that advertises `admin`, and the tab strip goes. Its keys are `admin.*`,
  `orgUserManager.*`, `configManager.*`, `configField.*` and `oidc.*` in
  `shared.json`; every glyph is `react-icons/fa6`; the catalog carries it
  unrouted.
- **SetupPage**: the first-run page of an app that configures itself in
  the browser, `SetupPage({ setup })` with `setup` as `{ status,
verifyToken, configs, update, uploadSsl }`: the setup token gate, one tab
  per name in `status.config` with every field validated against the served
  schema through the shared evaluator, the SQLite path in place of the SQL
  block following `dependsOn`/`showWhen` in the schema, the SSL upload on
  upload fields, and Submit all, which writes every file and sends the
  visitor to register. Its keys are `setup.*` in `shared.json`, the
  validation messages under `validation.*`; the catalog carries it unrouted.
- **SearchPage**: `/search?q=` on every UI backend, the full form of the
  navbar contract's app-wide list: the query read from and written to the
  URL and bound to the navbar box, one `SubTable` per result kind (Title,
  Where, Matched) with header sort and Columns pills under
  `table_prefs_search`, fifty rows per kind, the count line, every title
  a deep link in the universal route shape; a UI backend with nothing to search
  says so on the page. Its keys are `search.*` in `shared.json`.
- **Fleet pages**: the pages of a UI backend that advertises `fleet` (the VDI
  Health Monitor, `collections: []`), in `src/features/vdi/`, fed by
  `GET /api/vdi/fleet`, `/api/vdi/pools`, `/api/vdi/vms/{id}`, its
  `history` and `stats`, and `/api/config/grafana`, then kept live by the
  `fleet` topic of the [Universal Events Contract](universal-events/)
  through `useFleet` (`fleet-snapshot`, `vm-updated`, `vm-removed`,
  `vm-events`, `pools-updated`, a five-second tick re-deriving relative
  times and stale flags). `FleetPage` is the home route `/`: five
  `StatusCards` (ratio color, the no-session breakdown line, a click
  cycling the Status filter), one `PoolCards` card per pool (total, cache
  badges, agents-healthy line, publication, capacity, a click cycling the
  Pool filter, the fold kept in prefs), the toolbar (JSON and CSV export
  of the filtered sorted rows, expand all, collapse all, reset sort), the
  `FleetTable` over the columns hostname, pool, user, session, drives,
  icons, seen and cycle (every one sortable, the sort a stack of
  `{ column, direction }` advanced by Shift-click, rows linking to
  `/vm/{instance_id}`, row classes standby, no-session and decommissioned,
  an inline expand with Overview, Metrics while Grafana is enabled, History
  and Stats) and the count line. Its navbar binding queries hostname,
  username, display name, first and last name, UNC paths, pool, IP, MAC,
  instance id and UDS username, with the groups Status (tristate), Pool
  (tristate), Session, Cache, Drives, Publication, then Columns, under
  `table_prefs_vdi`; a tristate pill cycles neutral → include → exclude.
  `VmPage` is `/vm/:instance`, by instance id and never by hostname:
  `PageHeader` with the hostname and the chips status, pool, cache and
  stale image, then the four sections `VmOverview`, `VmHistory` and
  `VmStats` (`useVmHistory` with the since select, refetched when
  `vm-events` names the VM) and `VmMetrics` (the Grafana panels while
  `/api/config/grafana` answers `enabled`). Both set `document.title`;
  their keys are `vdi.*` in `shared.json` (`vdi.table.*`, `vdi.filter.*`,
  `vdi.status.*`, `vdi.session.*`, `vdi.cache.*`, `vdi.events.*`), and a
  UI backend without `fleet` answers `HomePage` at `/` (a `cookie` UI
  backend the [Universal Identity Contract](universal-identity/)'s
  ProfilePage, since it lists no collections) and the not-available
  stub at `/vm/:instance`.
- Every page sets `document.title` to the item, version or provider name
  and raises the messages a slot hands to the provided
  `notify(kind, text, options)` through the chrome's notice surface of the
  navbar contract; no page draws an alert row of its own.
- The catalog's Quality is an `ItemSections` entry under Versions, a
  section header in the Versions style ("Quality", the tier chip, the
  count of unmet rules) collapsed by default, expanding to the unmet
  rules or "All quality rules pass."; the cards keep their accordion.

---

## Search and filters per page

The search module and its panel are the navbar contract's; a listing page
registers one binding over every collection it shows. Groups appear in
this order:

| Group                | When                                                                      | Values                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection           | the page lists more than one collection                                   | one pill per collection (Boxes, ISOs), counts of rows                                                                                                                                                                                    |
| Visibility           | private rows exist on the page                                            | Public, Private                                                                                                                                                                                                                          |
| Watched              | signed in, and a watched row of any collection is on the page             | Watched, one pill narrowing every collection at once                                                                                                                                                                                     |
| the collection's own | always, prefixed by the collection name when several are listed           | BoxVault boxes: Provider (primary) · Architecture (info) · OS (success); BoxVault ISOs: Organization (primary) across organizations · Architecture (info) · OS (success); catalog provisioners: Tier (badge colors) · Provider (primary) |
| Columns              | list view, one per collection after its own groups, prefixed the same way | one pill per column of that collection's table, active while the column is shown, no counts; not a filter, so it never counts as one and Clear filters leaves it alone                                                                   |

Query matches: BoxVault name, label, description and organization; the
catalog also the repository. Picking a Collection pill hides the other
collections' headings and tables; picking a Visibility pill hides the
other rows; the × in the search box clears both. Filters, sort, view,
hidden columns and folds persist together per page.

---

## Sign-in return

The navbar's Sign in button always carries the page it was pressed on as
`returnTo`, the ended session's page while the session-ended banner shows, and every
in-app redirect to the login page carries its own; every sign-in path on
the login page, the local form, the provider buttons and the silent SSO
redirect, remembers it and returns there after the callback, never to the
profile page.

---

## Sidebar entries

A feature that needs the sidebar of the
[Universal Navbar Contract](universal-navbar/#sidebar) exports
`sidebar(status, account)` beside its pages, adapter and API calls; the
answer is `[{ key, labelKey, sections | tree }]` after the feature's own
token and adapter checks, a section `{ key, labelKey?, items }` and a row
`{ key, icon, labelKey, to, end?, badge? }`, every `to` a route of this or
another contract, `end` marking a row active on its exact path alone, and
`badge` the name of a count the shell resolves from the event hub or a
count route the feature names, never a number the export computes; the
router hands the concatenation of every mounted feature's answer to
`AppShell`. A feature with no sidebar of its own exports nothing. The
reserved first segments are unchanged: a sidebar entry never adds a
route, it points at one. A route a sidebar row matches draws
`<group> › <row>` as its crumbs, since its first segment is reserved and
would yield none. How the routes, the column, the crumbs and the search
binding of one UI backend assemble from its status payload is drawn in
the "How it fits" section of
[universal-sidebar.html](../universal-sidebar.html).

---

## Hosting notes

- Every UI backend serves the same UI build, the `startcloud-ui-<version>.tar.gz`
  release it pins, from `ui/` at `/`, and answers `GET /api/status` with
  the `collections` it mounts and the `features` it unlocks (see the
  navbar contract's status payload and Where the UI is served sections).
  The SPA owns `/`, programs call `/api` and the protocol paths, a machine
  and a browser on one root URL are told apart by the client's own signal,
  and no UI backend redirects or fronts itself with a proxy.
- BoxVault's SPA catch-all serves `index.html` from `backend/ui` for every
  browser path, and the Vagrant handler keys on the `Vagrant/` user agent
  before the catch-all, so shared page routes need no server change;
  `/api/status` answers in its setup-only mode too, so the setup gate
  renders.
- The catalog is on GitHub Pages, which has no rewrite; the Cloudflare
  Worker is routed on the whole hostname, answers `/api/*` itself (the
  one API surface the UI calls on every UI backend, the old `/private/*`,
  `/push/*`, `/admin/*`, `/watches`, `/health` and `/config` paths kept
  as aliases), proxies every other request to Pages, and answers a Pages
  404 for a page request (a `GET` for `text/html` with no file extension)
  with `index.html` so a deep link boots the SPA.
- `/callback/` stays its own HTML entry, built from `src/app/callback.jsx`
  and used by an `idp` UI backend alone.

---

## Reference implementation

One repository, [STARTcloud/startcloud-ui](https://github.com/STARTcloud/startcloud-ui):

| Path                                                          | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/catalog/`                                       | The shared pages: `HomePage.jsx`, `OrgPage.jsx`, `CollectionPage.jsx`, `ItemPage.jsx`, `VersionPage.jsx`, `ProviderPage.jsx`, `Listing.jsx`, `ItemsTable.jsx`, `ItemCards.jsx`, `ItemFacts.jsx`, `ChecksumCell.jsx` and the `useCatalogSearch` hook                                                                                                                                                                                                                                                                                                                                              |
| `src/app/router.jsx`                                          | The route table: the collection routes from the registry in the UI backend's order, every feature route gated by `hasFeature` or the first `auth` token                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/utils/routes.js`, `src/components/layout/AppShell.jsx`   | The crumbs drawn from the route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/features/collections/registry.js`                        | `collectionsFor(status)` over the three definitions below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/features/collections/provisioners/`                      | `definition`, `api/adapter.js` (the membership merge over `/api/catalog` and `/api/private/{uuid}/catalog`), `api/provisioners.js`, `components/deploy.jsx`, `components/RebuildItem.jsx`                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/features/collections/boxes/`, `isos/`                    | `definition`, `api/adapter.js`, `api/boxes.js` and `api/isos.js`, `api/uploadChunked.js`, `components/deploy.jsx`, `utils/versionFields.js`, `assets/distro-icons/`, and the slots for create, edit, publish, add version, add provider, add architecture, ISO upload and ISO actions in `components/BoxList.jsx`, `components/BoxItem.jsx`, `components/BoxVersion.jsx`, `components/BoxProvider.jsx`, `components/Iso.jsx` and `components/IsoVersion.jsx`; BoxVault's ISO read routes share the box routes' token rule and field names (`isPublic`, `published`, `fileName`, `downloadCount`) |
| `src/features/deploy/`                                        | `DeployControls` and `HyperweaverGlyph.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/features/search/`                                        | `SearchPage.jsx`, `SearchResults.jsx` (the list under the navbar panel), `useAppSearch` (the UI backend's `/api/search` behind the `search` token, else the client-side walk of the mounted collections), `searchRow.js` (the row shape and its path)                                                                                                                                                                                                                                                                                                                                            |
| `src/features/about/`                                         | `AboutPage.jsx` and `AboutRoute.jsx`, keyed by `status.role` over `about.boxvault.*` and `about.catalog.*`; a role with no `about.<role>.*` keys, the `auth-server` role today, answers `NotAvailableStub` at `/about`                                                                                                                                                                                                                                                                                                                                                                           |
| `src/features/auth/`                                          | `LoginPage.jsx`, `RegisterPage.jsx`, `InvitePage.jsx`, `CallbackPage.jsx`, `ProviderButtons.jsx` and the `api/` calls of the session contract's account pages                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/features/profile/`, `organizations/`, `admin/`, `setup/` | `ProfilePage.jsx`; `OrgConsolePage.jsx` and `DiscoveryPage.jsx`; `AdminPage.jsx`, `AdminOrganizations.jsx` (drawn only when the adapter carries `organizationsWithUsers`), `AdminConfig.jsx` (one tab per name in `status.config`, `["app"]` when absent), `AdminStorage.jsx` (only when the adapter carries `storage`), `OidcProviders.jsx` and `UpdateNotice.jsx` (the update command from `status.role`); `SetupPage.jsx`; each with its `api/` calls                                                                                                                                         |
| `src/features/vdi/`                                           | The fleet pages: `FleetPage.jsx`, `StatusCards.jsx`, `PoolCards.jsx`, `FleetTable.jsx`, `DriveBadges.jsx`, `CacheBadge.jsx`, `SessionBadge.jsx`, `LastSeen.jsx`, `IconsCell.jsx`, `ExportButtons.jsx`, `VmPage.jsx`, `VmOverview.jsx`, `VmHistory.jsx`, `VmStats.jsx`, `VmMetrics.jsx`; the hooks `useFleet.js`, `useFleetSearch.js`, `useVmHistory.js`; `api/fleet.js`; `utils/vmStatus.js`, `cacheLevel.js`, `eventTypes.js`, `exportRows.js`                                                                                                                                                  |
| `src/lib/sse.js`, `src/hooks/useEventStream.js`               | The shared event-stream client and the hook a page subscribes to named events with, per the [Universal Events Contract](universal-events/)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/components/common/`                                      | `PageHeader.jsx`, `StatusChips.jsx`, `DeprecationBanner.jsx`, `GroupHeading.jsx`, `ConfirmModal.jsx` (the type-to-confirm modal every destructive action opens, its keys under `pages.confirm.*`), `ConfigField.jsx`, `UserCard.jsx`, `columns.jsx` (the shared listing columns), `SubTable.jsx` and `SortHeader.jsx` (the one table behind every detail and admin list), `AuthShell.jsx` and `ProblemAlert.jsx` (the auth column and its problem alert every sign-in, onboarding and interstitial page draws in)                                                                                |
| `src/hooks/`, `src/lib/`                                      | `useDetailSearch.js` (a detail table's navbar binding), `useProblemReporter.js` (`problemShape`, `problemOf`, the reporter every auth page answers a failure with); `lib/organizations.js` (`getOrganization`, `userOrganizations`, `joinOrganizationAsAdmin`, `fetchOrganization`, `loadOrganizations`, `logoFor`, `withLogos`), `lib/next.js` (`followNext`, `isPagePath`), `lib/signin.js` (the sign-in, magic-link, recovery and reset calls), `lib/passkeys.js` (WebAuthn plus `passkeyRequestOptions` and `passkeyVerify`)                                                                 |
| `src/utils/`                                                  | `membership.js` (`isMember`, `isManager`, `isOwner` over the chrome's organization shape), `organizations.js` (`organizationsShape`, `ORG_NAME_PATTERN`, `membershipsOf`), `auth.js` (`authShape`, `returnToShape`, `passwordMinimum` and the sign-in method helpers), `validation.js` (the shared evaluator), `itemShape.js` (the item shape and its helpers), `permissions.js`, `forms.js`, `distroIcons.js`, `prefs.js`, `sort.js`, `schemaSections.js`                                                                                                                                       |

Shared by every UI backend, once: `src/css/styles.css` (the auth pages' rules
included), `src/css/fonts.css` (the auth pages' IBM Plex Sans and Source
Serif 4 faces beside Open Sans and Montserrat, the font files under
`public/fonts/`), the pre-paint script, the i18n setup, and the `pages.*`,
`profile.*`, `orgConsole.*`, `discovery.*`, `inviteAccept.*`, `admin.*`,
`orgUserManager.*`, `configManager.*`, `configField.*`, `oidc.*`,
`setup.*`, `boxes.*`, `isos.*`, `provisioners.*`, `rebuild.*`, `tiers.*`,
`rules.*`, `health.*` and `vdi.*` keys of `shared.json` and the whole
`auth` namespace. Every feature under `src/features/` has one shape:
`index.js` exporting what the router mounts, `api/` holding every call
the feature makes through the shared client and nothing else, and
`components/` holding its pages and slots; `hooks/` and `utils/` where
it has them, `sidebar.js` where it exports entries, `definition.jsx`
for a collection, and `assets/` for a feature's own files, imported
module-relative so their served URLs never change (the boxes
collection's `assets/distro-icons/`); a feature that calls the client
from nowhere has no `api/`, and no folder is added for a role the
feature does not fill, because one shape lets a reader of any feature
find its calls, its pages and its exports without learning it first. A
feature imports from `components/`, `hooks/`, `contexts/`, `lib/`,
`utils/` and its own folder, never from another feature except the
collections registry and `features/deploy`; the pages name no namespace
but `shared` and `auth`. A feature's heavy libraries (a map, an
address autocomplete, a chart) are imported lazily by the route that
draws them and never enter the build's first load, because the one build
serves every UI backend and a visitor pays only for the routes of the UI
backend they are on.

---

## Conformance checklist

| Line                                                                                                                                                              | Catalog                                                                        | BoxVault                                                                                                                              | VDI Health                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| One build of startcloud-ui, the UI backend's differences its `collections` and `features` in `/api/status`                                                        | ✓ `["provisioners"]`                                                           | ✓ `["boxes", "isos"]`                                                                                                                 | ✓ `[]` with `fleet`                                                                                              |
| Breadcrumb from the route only, one breadcrumb, no page crumbs, no pickers                                                                                        | ✓ `routes.js` in the shared `AppShell.jsx`                                     | ✓ the same file                                                                                                                       | n/a — no collections, `vm` reserved                                                                              |
| Switcher sets the active organization only, never navigates                                                                                                       | ✓ `pickOrg` of `useSession`                                                    | ✓ the same hook                                                                                                                       | ✓ the same hook under `idp`                                                                                      |
| Existing URLs unchanged                                                                                                                                           | n/a — first router                                                             | ✓ `/isos`, `/{org}/isos`, `/{org}/isos/{iso}` added beside them                                                                       | n/a — first router; `/vm/{instance_id}` new                                                                      |
| Item shape produced by one adapter, pages never read wire data                                                                                                    | ✓ `provisioners/api/adapter.js`                                                | ✓ `boxes/api/adapter.js`, `isos/api/adapter.js`                                                                                       | n/a — no collections; `api/fleet.js` reads the `snake_case` wire shape the `fleet` topic shares                  |
| One visibility rule per app                                                                                                                                       | ✓ membership merge in the adapter, `private-catalogs` advertised               | ✓ box and ISO discover and per-organization lists widened by the same token rule, unpublished rows for their uploader only            | ✓ everyone under `auth.mode: none`, every signed-in user under `idp`                                             |
| Registry names every collection with adapter, filter groups, columns, slots                                                                                       | ✓ provisioners                                                                 | ✓ boxes, isos                                                                                                                         | n/a                                                                                                              |
| Listing: organization groups, every collection drawn, heading rows with actions, one toggle per page, shared columns first                                        | ✓ `Listing.jsx`                                                                | ✓ the same file                                                                                                                       | n/a                                                                                                              |
| Home, Org, Collection, Item, Version, Provider pages from `features/catalog`                                                                                      | ✓                                                                              | ✓                                                                                                                                     | n/a — `FleetPage` at `/`                                                                                         |
| Fleet pages from `features/vdi` while the UI backend advertises `fleet`, live through the `fleet` topic                                                           | n/a                                                                            | n/a                                                                                                                                   | ✓ `FleetPage`, `VmPage`, `useFleet`                                                                              |
| ISOs versioned like boxes: item → versions → architectures → file                                                                                                 | n/a                                                                            | ✓ `/{org}/isos/{iso}`, `/{org}/isos/{iso}/{version}` and `/{org}/isos/{iso}/{version}/{arch}` on the shared pages with the ISO slots  | n/a                                                                                                              |
| Write actions only in slots, shown while the UI backend advertises `uploads`                                                                                      | n/a — read-only                                                                | ✓ `components/BoxList.jsx`, `components/BoxItem.jsx`, `components/BoxVersion.jsx`, `components/BoxProvider.jsx`, `components/Iso.jsx` | n/a — read-only                                                                                                  |
| Collection, Visibility and Watched groups first in the panel, own groups prefixed, then a Columns group per collection in list view, one watch set per collection | ✓ `useCatalogSearch.jsx`                                                       | ✓ the same file                                                                                                                       | ✓ `useFleetSearch.js`: Status, Pool, Session, Cache, Drives, Publication, Columns                                |
| Sign-in returns to the page the session ended on                                                                                                                  | n/a — one-click sign in                                                        | ✓ `returnTo` remembered on `/login` for every sign-in path                                                                            | n/a — one-click sign in                                                                                          |
| Login, register and invite routed by the `backend` or `cookie` auth token, register by `local-accounts`                                                           | ✓ `NotAvailableStub` on a deep link                                            | ✓ `/login`, `/register`, `/invite/:token`                                                                                             | ✓ `NotAvailableStub`                                                                                             |
| Profile routed by the `backend` or `cookie` auth token                                                                                                            | ✓ `NotAvailableStub`                                                           | ✓ `/profile`                                                                                                                          | ✓ `NotAvailableStub`                                                                                             |
| Organization console and discovery routed by `org-console` and `discover`                                                                                         | ✓ `NotAvailableStub`                                                           | ✓ `/org-console`, `/organizations/discover`                                                                                           | ✓ `NotAvailableStub`                                                                                             |
| Admin routed by `admin`                                                                                                                                           | ✓ `NotAvailableStub`                                                           | ✓ `/admin`                                                                                                                            | ✓ `/admin` under `idp`: Configuration from `status.config` and the update notice, no Organizations or System tab |
| Search page at `/search?q=`, `search` reserved                                                                                                                    | ✓ client-side rows                                                             | ✓ `GET /api/search` rows                                                                                                              | ✓ says nothing to search                                                                                         |
| Setup and its gate by `setup`                                                                                                                                     | ✓ no gate                                                                      | ✓ `/setup`                                                                                                                            | ✓ no gate                                                                                                        |
| Deep links load (SPA fallback)                                                                                                                                    | ✓ Worker answers Pages 404s with `index.html`                                  | ✓ catch-all over `backend/ui`                                                                                                         | ✓ `index.html` after every `/api` route                                                                          |
| Serves the pinned UI release and answers `GET /api/status`                                                                                                        | ✓ `startcloudUiVersion` in the root `package.json`, the Worker's `/api/status` | ✓ `startcloudUiVersion` in `backend/package.json`, `status.routes.js` in both server modes                                            | ✓ `[tool.startcloud] ui_version` in `pyproject.toml`, `routes/status.py`                                         |

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Session Contract](universal-session/) |
[Universal Events Contract](universal-events/) |
[Preferences, Language & Branding Contract](preferences-and-branding/) |
[Integrating Your App](integrating-your-app/)
