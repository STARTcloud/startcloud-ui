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
ISO having versions and architectures like any box); BoxVault also serves
downloads that way, a product owning releases, a release owning patches
and a patch owning files, the patch standing where a box's provider
stands and a file where an architecture stands; the provisioner
catalog serves provisioners the same way; provisioners become a further
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
  has a second route for its public rows. On downloads the rule reads in
  three lines: public and published, anyone can access, period; published
  and private, anyone in the same organization can access; unpublished, no
  one but the user who uploaded it can access, not even people in their
  organization. A guest of an organization, the read-only fourth role of
  the [Universal Identity Contract](universal-identity/), sees exactly
  what a member sees, the published private items of their organization
  included, and never a write control: every Add New, upload zone, edit,
  delete, select column and bulk pane, org-console management control and
  the profile's service-account role list is absent for a guest as it is
  for a signed-out visitor, the Download button staying. `isMember`
  counts a guest, because a guest is a membership and the rows a
  membership may read are the same rows; `isManager` and a collection's
  `canManage` never do; and a fourth predicate, `isGuest`, stands beside
  them so a page that must tell a guest from a writing member asks one
  question of the one vocabulary, rather than reading roles itself and
  growing a second.
- **Read-only is a valid app.** The catalog's collection carries no write
  slots and its UI backend advertises no `uploads`, so the pages render without
  a single management control.

---

## Information architecture

| Level                | Route shape                  | Page                                                                                                     | Breadcrumb after the brand            |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| home                 | `/`                          | HomePage: every collection, organization group rows, private and public rows side by side                | nothing; the root crumb with a column |
| collection, all orgs | `/{collection}`              | CollectionPage across organizations                                                                      | `› ISOs`                              |
| organization         | `/{org}`                     | OrgPage: org header, one heading row and table per collection; private items when the viewer is a member | `› STARTcloud`                        |
| collection, one org  | `/{org}/{collection}`        | CollectionPage for that organization                                                                     | `› STARTcloud › ISOs`                 |
| item                 | `/{org}/{collection}/{item}` | ItemPage                                                                                                 | `› STARTcloud › Boxes › alma9-server` |
| version              | `…/{item}/{version}`         | VersionPage                                                                                              | `› … › 1.2.3`                         |
| provider             | `…/{version}/{provider}`     | ProviderPage                                                                                             | `› … › zone`                          |

An app maps its own paths onto those levels; the shape above is the
canonical one and the one a new app adopts. Two existing apps map it as
follows.

| Level                | BoxVault (unchanged paths)                                                                                                | Catalog                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| home                 | `/`                                                                                                                       | `/`                                         |
| collection, all orgs | `/isos`, `/downloads` (boxes have no page of their own; the Collection filter narrows home)                               | `/` is provisioners                         |
| organization         | `/{org}`                                                                                                                  | `/{org}`                                    |
| collection, one org  | `/{org}/isos`, `/{org}/downloads`                                                                                         | `/{org}`                                    |
| item                 | `/{org}/{box}`, `/{org}/isos/{iso}`, `/{org}/downloads/{product}`                                                         | `/{org}/{provisioner}`                      |
| version              | `/{org}/{box}/{version}`, `/{org}/isos/{iso}/{version}`, `/{org}/downloads/{product}/{release}`                           | `/{org}/{provisioner}/{version}`            |
| provider             | `/{org}/{box}/{version}/{provider}`, `/{org}/isos/{iso}/{version}/{arch}`, `/{org}/downloads/{product}/{release}/{patch}` | `/{org}/{provisioner}/{version}/{provider}` |

`/isos`, `/{org}/isos`, `/{org}/isos/{iso}`, `/{org}/isos/{iso}/{version}` and
`/{org}/isos/{iso}/{version}/{arch}` are additive browser routes, the ISO's
versions and architectures reached the way a box's are, the architecture
drawn by the shared leaf page (`ProviderPage`) a box provider draws, one
component both call; the Vagrant handler keys on the `Vagrant/` user agent
before any of them.

`/downloads`, `/{org}/downloads`, `/{org}/downloads/{product}`,
`/{org}/downloads/{product}/{release}` and
`/{org}/downloads/{product}/{release}/{patch}` are additive browser routes
of the same shape, the product's releases and patches reached the way a
box's versions and providers are, the patch drawn by the shared leaf page
(`ProviderPage`) with its files as the architectures table. A file has an
address of its own one level further,
`/{org}/downloads/{product}/{release}/{patch}/{file}`, the file named by
its key (`linux-x64`) or by the file name it was uploaded with
(`Domino_1451FP1_Linux.tar`), both spellings one address: a browser at it
is shown the patch page with that row marked, a program at it receives
the bytes (Hosting notes).

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
every mounted collection (`isos`, `downloads`). `api` is reserved on every UI backend, the `/api/status`
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
  `provider` and `architecture`, each optional in that order, the fifth
  part read only by a collection whose leaf is a file (downloads), where
  it names the last crumb and marks that row on the patch page, and
  ignored by boxes and ISOs, the collection read from its
  segment or implied for the collection whose `segment` is empty; a
  reserved first segment yields no crumbs of its own. On a host with a
  column the crumbs open with a root crumb, the product name linking to
  `/`, then the group and the row a sidebar row matches, the group a
  plain word; a route a child row matches draws the group, the parent
  row, then the child's label, so `/user/profile/favorites` reads
  Account, Profile, Favorites; a page reached from a sidebar row but
  living at its own path crumbs as that row's child, the group, the row
  linking to its own page, then the page's own name last as plain text,
  the route table naming the row's path as the route's `crumbParent` and
  the name the page carries (the organization console at `/org-console`,
  opened by Manage on `/user/organizations`, reads Account,
  Organizations, then the active organization's name), because the crumb
  is where the person came from and a page named by its data is named by
  that data, never by a title that repeats the column (identity contract
  decision 130); a reserved route no row matches draws the
  root crumb and the page's title as the second crumb, so the row is
  never empty.
- One crumb per present level, each a plain link (`to`) to that level's
  route; every crumb but the last is a link, and the last crumb, the page
  itself, is plain text.
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
  for the catalog, and nothing for a guest of the organization, whose
  pages carry no write control at all); Add New opens the create form on boxes and the upload
  zone on ISOs and downloads, and whatever it opens wraps under the row at
  full width. That is the estate's one add and one edit shape: a record's
  create form and its edit form open inline under the heading row of the
  section they belong to, drawn by the collection's slots and never in a
  dialog, on every level page too (Add Version, Add Provider, Add
  Architecture, Edit on a row), because a person adds and corrects a
  thing where they see it; the identity provider's dialogs are its own
  divergence on pages that have no section for the record to sit under,
  and no new form surface is added beside these two. Headings are labels,
  not links; there are no "All …" links.
- **Bulk on every table.** Every listing and detail table of every
  collection carries a select column first, before the watch cell, its
  header a real checkbox, the select-all for the page, checked, unchecked
  or indeterminate, and one checkbox per row, the identity contract's
  shape (decisions 137, 139, 142); the column and the action pane's bulk
  group draw for a viewer who may manage the rows alone, an owner or an
  admin of the organization or a global admin, and never for a member
  without that standing, for a guest or for a signed-out visitor, because
  a checkbox over a row the server will refuse is a promise the page
  cannot keep; while rows are picked the section's
  heading row reads the picked count as its muted text and the action
  pane opens with "N selected", Clear selection and the collection's bulk
  actions for that level (Delete, Make public, Make private, Publish,
  Unpublish on items; Delete and Deprecate on versions; Delete on
  providers, architectures, releases, patches and files), then the
  section's own actions, then the toggle; Remove All is the bulk Delete
  of every row on the page and no longer a button of its own. The
  registry's `bulk` names the actions per level and the adapter's
  `bulk(level, action, names)` sends them as one call, `POST …/bulk
{ action, names }` per level on BoxVault, the result line naming
  processed, skipped and each error's code as the users' bulk does;
  because the estate has one bulk shape and one select column and a
  second would be a fork.
- **One view toggle per page**, list or cards, drawn once at the right of
  the org header row when the page has one, else at the right of the first
  collection's heading row beside the page's actions (home: Discover
  organizations), so no page carries an empty row above its first heading;
  stored per page; as `view` inside the page's one `table_prefs_*` object
  beside its sort, hidden columns, filters and folds, never under a key of
  its own; the collection's `defaultView` seeds it (catalog cards,
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
then adds its own. The select cell is first, a real checkbox in the
header and one per row (Bulk on every table); the watch cell is drawn
after it on every table, star or blank,
so a table keeps its shape whether or not the viewer is signed in and rows
under an organization group line up on it; its header is a star, and while
the viewer can watch it sorts watched rows first. The table is
fixed-layout and every column declares a `kind`, the content its cells
draw, and takes its width and its look from that kind alone
(`columnKinds`): `name` (text with an optional icon or logo and a muted
code beside it, flex, ellipsized), `text` (a plain string, flex,
ellipsized), `badge` (one status badge, narrow), `badges` (a list of
small badges, flex), `date` (a locale date, narrow), `relative` (a
relative time, medium), `count` (a right-aligned integer with a wider
right gutter, narrow), `size` (formatted bytes, narrow), `checksum` (the
`ChecksumCell`, flex, ellipsized), `link` (a link cell, the version and
release names, medium) and `word` (a closed-list word, narrow); the
widths are `col-w-narrow` 6.5rem and `col-w-medium` 10rem, declared once
in the shared stylesheet beside the fixed select, star and quick-actions
cells at 2.5rem and Actions at 11rem, and `col-w-flex`, no width, the
flex columns sharing whatever room the fixed ones leave (CSS 2.1
§17.5.2.1), so a wide table fills its width and a narrow one shrinks the
text that can shrink; every cell also carries `col-k-<kind>` and its
content sits in one `.cell` block, so the stylesheet styles a kind's
cells and never a column's key; no column carries a width of its own; a
column without a `kind` is a defect; a width the viewer dragged overrides
the kind's and takes its room from the flex columns; header cells never
wrap. The columns come in one order on every table: select, watch, Name,
Visibility, Created, Updated, Downloads, Status, then the collection's
own, then the badge lists, then Actions. The widths are declared on a
`colgroup` with one `col` per cell, and a table drawing no unsized flex
column gains a trailing unsized spacer `col` with an empty header and
body cell, because fixed layout hands the leftover width to every column
when none is left unsized; so the fixed leading cells sit at the same x
on every table of both apps and the flex columns take the rest:

| Column      | Boxes                                                                                    | ISOs                                                                             | Provisioners                                 |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| select      | checkbox, the header the select-all                                                      | checkbox, the header the select-all                                              | checkbox, the header the select-all          |
| watch       | star signed in, blank signed out                                                         | star signed in, blank signed out                                                 | star signed in, blank signed out             |
| Name        | org logo + `org/name` link, the `org/` segment folded below 60rem of table width         | org logo + `org/name` link, the `org/` segment folded below 60rem of table width | icon + label link, slug beside it            |
| Visibility  | Public / Private                                                                         | Public / Private                                                                 | Public / Private                             |
| Created     | `createdAt`, hidden until shown                                                          | `createdAt`, hidden until shown                                                  | none                                         |
| Updated     | `updatedAt`, hidden until shown                                                          | `updatedAt`, hidden until shown                                                  | none                                         |
| Downloads   | sum of file `downloadCount`                                                              | sum of file `downloadCount`                                                      | health downloads                             |
| then        | Status · OS · Latest release · Versions · Providers · Architectures (hidden until shown) | Status · OS · Latest release · Versions · Architectures (hidden until shown)     | Tier · Latest release · Versions · Providers |
| row actions | none                                                                                     | none                                                                             | none                                         |

Downloads draw the same shared columns, then Status · Family · Vendor ·
Latest release · Releases · Platforms (hidden until shown), Downloads
being the sum of its files' `downloadCount`.

The Name cell draws the organization logo, then `org/name` as the link;
below 14rem of the cell's own width the `org/` segment folds away and the
item name stays, the logo still naming the organization and the cell's
title carrying the full `org/name`, because the name a person came for
is the last thing a narrow cell may cut, and the cell is what shrinks,
not the table. A table whose rows are files draws the Download as the
first control of the Actions column, the one shared `DownloadAction`
handed to the table as `LeadActions` for every viewer the row is shown
to, before the host's own row actions, which draw by the viewer's
permission; a file's count is its Downloads column and a provider's
Downloads is the sum of its files', and a provider row's Architectures
column is badges alone, because a cell that holds a badge, a number and
a button holds three columns. The files table of a downloads patch
draws one Name column, the file name it was uploaded with and, only when
the key differs from it, the key as a small code beside it, the shape
`labelColumn` gives the catalog's label and slug; no separate Key column,
because the two read the same on almost every row and a header that says
the same thing twice is noise. Rows carry no action buttons; an item's actions live on its page and the
select checkbox and the watch star are the only in-row controls. One label key per column,
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

One table component, `SubTable`, draws every table of the estate: the
collection listings with their watch star, quick actions and organization
group rows, the detail pages, the admin lists, the fleet, the search page
and the organization console's lists, so a table drawn with its own
markup is a defect. Every column resizes: each header cell but the
select, star, quick-actions and Actions cells carries a handle straddling
its right edge, 11px wide so a pointer finds it, its 3px bar shown on
hover; a drag changes that column's width alone and
shows the pixel width while dragging; a double-click resets the column to
its kind's width; the widths persist per page under
`table_prefs_*` as `widths`, a map of column key to pixels beside sort,
hidden columns and per page, a hidden column keeping its width for when
it returns, and the stylesheet's widths stand wherever the map names
none. Why: a fixed width fits the common value and never the long one,
and a person who widens Name once should find it wide tomorrow on the
same page.

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
  family | null, vendor | null,        downloads alone
  metadata | null, readme | null,
  links { repo, homepage, issues, pipeline, badge, docs, notes },
  extras { ... }                       app-only data for slots, never read by a page
  versions [ version ]
}
version {
  version, createdAt, updatedAt, description, releaseNotes,
  deprecated, deprecationReason,
  providers [ provider ], artifacts [ architecture ]
}
provider {
  name, description, architectures [ architecture ],
  kind | null, releasedAt | null, notesUrl | null    downloads alone: the patch
}
architecture {
  name, defaultBox, fileName, fileSize, checksum, checksumType,
  downloadUrl, downloadCount,
  kind | null, platform | null, architecture | null, language | null, variant | null
                                       downloads alone: the file
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
- A download's patch maps to a `provider`: its `name` is `release` for the
  release itself, drawn as the release's own number, and the patch
  identifier otherwise (`FP1`, `IF1`, `FP7HF25`); its `kind` is one of
  `release`, `fixpack`, `interim-fix`, `hotfix`; `releasedAt` is the date
  it shipped and `notesUrl` its notes where the vendor publishes them.
- A download's file maps to an `architecture`: `name` is its key
  (`linux-x64`), `fileName` the name it was uploaded with, `kind` one of
  `installer`, `fixpack`, `hotfix`, `interim-fix`, `container-image`,
  `package`, `template`, `notes`, `tool`, `other`; `platform` one of
  `linux`, `windows`, `macos`, `omnios`, `other`, `any`; `architecture` one
  of `x64`, `x86`, `arm64`, `other`, `any`; `language` a BCP 47 tag or
  `any`; `variant` free text or empty. `any` is the one word for "not
  specific" and for "does not apply"; a value is never empty.
- A download's `downloadUrl` comes from `get-download-link` as a box's
  does and is never the page address, because a browser click sends
  `text/html` and the page address would answer the page.
- `published: null` and `isPublic: null` hide the matching chip and
  column; `downloads: null` on an item and `downloadCount: null` on a
  file hide the Downloads column and the count in the Download button the
  same way, and BoxVault answers both as `null` on a download to anyone
  who is not a member of the organization, because a public file's tally
  is the organization's own fact and nobody outside it has need of it. A
  download's `family` draws where the OS chip draws and its `vendor` is a
  line under the title as a box's description is, never a chip.

| Source         | BoxVault adapter                                                                                                                                                                                                                                                                                                      | Catalog adapter                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| list, all orgs | `BoxService.discoverAll`, `IsoService.discoverAll`, both widened by the caller's token to the token's memberships                                                                                                                                                                                                     | `/api/catalog` plus `/api/private/{uuid}/catalog` for every membership while the UI backend advertises `private-catalogs`                                                                                                        |
| list, one org  | `BoxService.getAll`, `IsoService.getAll`, both widened by the caller's token                                                                                                                                                                                                                                          | `/api/private/{uuid}/catalog` + public items by owner                                                                                                                                                                            |
| item           | `BoxService.get` + `VersionService.getVersions` + `ProviderService.getProviders`; `IsoService.get` + its versions, each with its files                                                                                                                                                                                | the item from the list, providers per version from `/api/catalog/health`                                                                                                                                                         |
| version        | `VersionService.getVersion` + providers + architectures + `FileService.getDownloadLink`; the ISO version's files as artifacts, each with its download link                                                                                                                                                            | the version's artifacts                                                                                                                                                                                                          |
| provider       | `ProviderService.getProvider` + `ArchitectureService.getArchitectures` + `FileService.info`; the ISO architecture's one file from its version, drawn by the same ProviderPage                                                                                                                                         | the version's artifacts                                                                                                                                                                                                          |
| watches        | `BoxService.watch/unwatch/getUserWatches`, `IsoService.watch/unwatch/getUserWatches`, one watch set per collection; dropped by the registry when the UI backend lacks `watches`                                                                                                                                       | the Worker's `/api/watches`: `GET` the caller's ids, `POST { id }`, `DELETE ?id=`, kept in KV under the token's uuid so they follow the user; the data job notifies each watcher of a new version through the hub inbox and push |
| health extras  | none                                                                                                                                                                                                                                                                                                                  | `tier`, `failed_rules`, `presentation`, coverage per version                                                                                                                                                                     |
| downloads      | `DownloadService.discoverAll` and `getAll` widened by the caller's token; `get` with its releases; `ReleaseService.get` with its patches; `PatchService.get` with its files, each with its download link from `get-download-link`; the upload through the chunked route the box slot uses; watches as boxes have them | none                                                                                                                                                                                                                             |

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
  levels         per level (versions, providers, architectures): the label key
                 the tables, the crumbs and the search page's headings use
                 (Releases, Patches, Files on downloads; Versions, Providers,
                 Architectures otherwise) and the column list that level's
                 table draws; the pages read them and never branch on key
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

- **Page frame**: every page draws on the ground of the scroll region and
  never inside a card of its own: the page is one or more sections, a
  section one heading row and one body. A page of one section draws no
  page-title row above it — the section's heading row is the page's own
  heading, and `PageHeader` is for a page with media, a subtitle or
  chips, the catalog's item pages; a page of several sections draws one
  heading row per section and no title row above them beyond what the
  crumb already says. Every heading row: left the title, then the count,
  the picked state or a subhead as muted text right after it on the same
  row, no icon before the title; right the action pane, the one place
  every action of the section lives — bulk actions, the section's own
  actions (Create, Refresh, Mark all as read, Delete all, Unblock all)
  and the view toggle together, the picked-state group first ("N
  selected", Clear selection, then the bulk actions), then the section's
  own actions, then the view toggle; never a second row, no bar under
  the heading, no control at the body's left or above the heading, no
  line under a heading because a second line pushes the body down on
  every page for a word the title already carries, and no summary bar
  above a table since the count is the heading's own muted text, and a
  row's More menu escapes this frame's one scroll region and any wrap's
  `overflow`, drawn by the one shared `RowMenu` component, because a menu a
  person cannot read is not a menu. The
  body is framed by one rule by content on every page of every UI
  backend: a form or a settings group draws in a section card
  (`SectionCard`, its header line the section's heading row, the
  chevron last, its fold under the page's prefs key), a list or a table
  draws glass, the rows or the table straight on the ground under the
  heading with no card body, and stat tiles, maps and notices are cards;
  no page carries a panel colour of its own and no card wraps a whole
  page; because a card frames fields a person fills, a list reads better
  without one, one rule keeps every page of every UI backend alike, and
  a page wrapped in a card puts a second surface under its sections and
  lists, which on the dark variant's surface steps reads one tone on one
  page and another on the next. So the profile's Security and
  Preferences sections, the configuration editor's sections, the
  Create-a-team form, the organization console's record and invitation
  forms and the About page's blocks are cards; the profile's Favorites
  and Sessions, the inbox, the organizations memberships, the
  applications, the accepted terms, the integrations, the organization
  console's members, invitations and join requests, the discovery
  directory and every admin table and card list are glass; and the
  dashboard's stat tiles, its map and its restart notice are cards while
  its two recent tables are glass. No section carries an identity card
  repeating the avatar and name the chrome already shows, except
  `/user/profile` itself. Export stays the navbar panel's action
  (identity contract decision 113), never in the action pane.
- **PageHeader**: media (artwork), title with an optional trailing
  control (the watch star), subtitle, chips (`StatusChips`:
  published/pending, public/private, OS, deprecated), an action pane on
  the right built the same way a section's is, children (description,
  CI bar). No crumbs. Drawn only where a page has media, a subtitle or
  chips — the catalog's item pages — because a page of one plain section
  is already headed by that section's own heading row.
- **SectionCard**: the one section card a form or a settings group draws
  in, `src/components/common/SectionCard.jsx`: the header row with the
  title, then the muted count, state or subhead after it, the trailing
  badge or actions and the chevron last, flush right, then the bordered
  body; the whole header folds the card
  except its action controls, the chevron turning as it folds, open by
  default, its fold kept in the page's prefs object under `folds`
  (identity contract decision 117), the same fold the configuration
  editor's sections have, so the profile's Security cards, the
  Preferences card, the Create-a-team card, the organization console's
  record and invitation forms, the About page's blocks and
  `ConfigSections`' section heads are one card with one fold, because a
  person who learns to fold one section has learned to fold every
  section and a fold that lives in the page's prefs survives the reload
  the way the page's sort and hidden columns do.
- **SectionHeading**: the one heading line a glass section draws over
  its list or table, `src/components/common/SectionHeading.jsx`, beside
  `SectionCard` with the same title, muted count-or-picked-state-or-subhead
  text and action-pane slot, no icon, no body and no fold, the rows or the table
  following it straight on the ground, so the profile's Favorites and
  Sessions, the organization console's members, invitations and join
  requests, the dashboard's recent tables and the insights sections
  carry one heading shape. It is one metric on every page of every UI
  backend; no page draws its own heading row of a different size. Its
  right side is the section's one action pane: the picked-state group
  first ("N selected", Clear selection, then the bulk actions), then the
  section's own actions (Create, Refresh, Mark all as read, Delete all,
  Unblock all), then the view toggle, one row, never a control at the
  list's left or above the heading and never a second bar underneath. A
  table with bulk actions carries a select column whose header cell is a
  real checkbox, the select-all for the page (checked, unchecked or
  indeterminate), never an icon glyph and never a button or link
  labelled "Select all on this page" anywhere, because the checkbox
  itself is that control and a second one beside it would say the same
  thing twice; the row checkboxes are that column's cells (identity
  contract decisions 137, 139, 142).
- **Pager**: a paged list's pager, `Pager` in `src/components/common/Pager.jsx`,
  draws as the section's foot: the page buttons — previous, the pages
  around the current one, next — on one line, and the "Showing a to b of
  n" line as muted small text centered under them, never in the heading
  row, whose action pane already holds the section's actions, and never
  left- or right-aligned. The foot sits at the bottom of the section's
  area, the page a column filling the scroll region and the foot pushed to
  its end, and under the table when the table is taller than the region,
  because below is not bottom. A paged
  list's page size is a "Per page" pill group in the navbar filter panel
  (25, 50, 100, 250; 25 the default), drawn after the page's own groups
  and before Columns, not a filter — Clear filters leaves it alone and it
  never counts as one, the same mechanism the Columns group already uses
  — kept in the page's `table_prefs_*` object as `size` beside sort,
  hidden columns and folds, and sent to the list as `size`, because the
  panel is the one place a page is narrowed and shaped and the page
  carries no control of its own. A row's More menu is `RowMenu` in
  `src/components/common/RowMenu.jsx`, one shared component: the table
  wrap never clips, so the menu draws over the rows under it and flips
  upward near the bottom of the scroll region, because a menu pinned to
  the viewport loses its row when the page scrolls inside its own region.
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
- **Downloads on the same pages**: the ItemPage lists a product's releases
  newest first with a Patches count in place of Providers, the word
  Patches on every screen of the level because a patch is a thing a
  person downloads and an update is something a machine does; the
  VersionPage's providers table is the patches table (the name drawn as the
  release number for `release` and the patch identifier otherwise, kind,
  released, files count, the row actions slot); the ProviderPage is the
  patch page, its architectures table the files table (key, file name,
  kind, platform, architecture, language, size, checksum click-to-copy,
  download with count, the row actions slot), a file address landing on
  that page with the fifth crumb drawn and nothing painted on the row,
  because no table of the estate marks a row; the columns and labels of
  those three tables come from the collection's `levels` in the registry.
  Every page of the hierarchy carries one Add New on its heading row and
  it opens the upload zone under the row at full width, the file and the
  Public / Private switch and nothing else drawn in it, as ISOs do; no
  downloads page carries a second add and no record is created by a form
  before a drop, because everything below a product is born from a file
  and the ISO already makes its tree from one drop. A product's icon is
  drawn before its title as a provisioner's is, from the record's
  `icon_url`, the vendor's mark when it has none. The drop lands the file
  first and the form comes after it: the zone sends the bytes through the
  box slot's chunked upload to the organization's pending store
  (`POST …/download/pending/upload`, Hosting notes), where nothing is
  validated but the bytes, and the answer names the pending upload and the
  words the file name gave (product, release, patch, key, kind, platform,
  architecture, language); when the send completes the zone gives way to
  the placing form inline under the same heading row, the file's fields as
  the file form draws them, prefilled from those words and from the page
  the zone sits on (a patch page fills product, release and patch and
  draws them read-only; a release page product and release; a product
  page the product; the downloads heading nothing), the person corrects
  what the name got wrong and presses Save, and `POST …/pending/{id}/place`
  with the validation contract's `downloadFile` members plus `product`,
  `release` and `patch` creates the absent levels, moves the file in and
  answers its address, so the row appears where it belongs; Cancel discards
  the pending upload. A pending upload nobody places is dropped by the
  server after a day. Product, release, patch and file are edited
  afterwards on their own pages (`PUT …/download/{name}`,
  `…/release/{number}`, `…/patch/{name}`, `…/file/{key}`), inline as a box
  architecture's edit is. Because a file name is a guess and a rule that
  refuses the guess refuses the drop, the bytes go up first and the words
  are asked where the person can see them, never on a form before the
  drop and never in a dialog.
- **AboutPage**: the app's About at `/about`, drawn from props only: a
  page header in the PageHeader shape with the brand, the title, two
  version chips, the app's from `status.version` through `useStatus()`,
  the same value the footer shows, and the UI's own from the build's
  `package.json` version injected at build time, drawn under the keys
  `about.version.app` and `about.version.ui`, the description, the goal as a quote and, when the app
  passes one, the favorite toggle as the header's action; then Start here
  (the documentation links as a list)
  beside What you can do here (features as a check grid), How it fits
  together (components as headed cards) and Help and community (support
  links as a footer strip). Every link on the page appears once. The
  route feeds it from the status payload and the locale alone, nothing
  of any app in code: the title is `status.brand.name`; the description,
  goal, features, components and the two intros are the
  `about.<role>.*` keys of `shared.json`, `features` an object of one
  sentence per key and `components` an object of `{ title, ...details }`
  per part, read as objects so a role adds a line by adding a key; Start
  here is `links.docs`; Help and community is `brand.repo`,
  `brand.changelog` and `links.contact`, each drawn only while set, their
  labels the shared `pages.about.links.*`; the favorite toggle is drawn
  while the UI backend advertises `favorites`, the session is the
  identity provider's and names its `clientId`; a role with no
  `about.<role>.description` key draws the not-available stub and no
  About row. Because a URL or a name written into the page is a fork per
  app, and the one build serves every app.
- **LoginPage**, **RegisterPage** and **InvitePage**: the account pages of
  the [Universal Session Contract](universal-session/), drawn from the
  provider, the return-path helper and the app's `auth` adapter inside
  `AuthShell` (the centered auth column with its alert, spinner and inbox
  icon) with `ProviderButtons` for the identity providers; an app routes to
  them only when it has accounts of its own, and the catalog carries them
  unrouted.
- **ProfilePage**: the account's own page for an app with accounts of its
  own, one page and one shape on every UI backend, the identity provider
  and BoxVault alike,
  `ProfilePage({ session, events, returnTo, account, basePath, activeOrgUuid, admin, user, loaded })`:
  `user` and `loaded` are the session state's adopted user and whether
  `load()` has answered; the page draws nothing until `loaded`, then the
  profile for `user`, and sends a visitor to sign in only once `loaded`
  says there is none, because the cached account is a paint hint and
  never a session. The page is the identity provider's shape: the avatar
  card from the session's display fields on the Profile route alone, gone
  on the page's other sections since the header's own avatar and name
  already carry that identity in the chrome there (decision 143), then the
  one section the route names under it; a section draws only while the
  `account` adapter carries its calls, the one list `sectionsFor(account)`
  answers: Profile always (one details form on every host, its fields the
  identity provider's narrowed to what the host's `/api/rules` `profile`
  and `displayName` forms name, the address block while the adapter
  carries `address`, the mobile through a code while `phone` carries
  `send` and `verify` and as one field saved with the form while it
  carries `set`), Security while the adapter carries any of `password`, `email`, `tfa`,
  `passkeys`, `backupCodes`, `linked` and `deletion`, each of its cards
  drawn only for the member it acts through, then Preferences, Favorites,
  Sessions, Organizations and Service accounts while it carries
  `preferences`, `favorites`, `sessions`, `organizations` and
  `serviceAccounts`. The adapter carries one word beside its calls,
  `mutability`, the SCIM word for the record as a whole (RFC 7643 §2.2):
  `readWrite` where the host owns the account, the issuer and a local
  BoxVault account, and `readOnly` where an identity provider does, an
  identity-provider session on BoxVault; a `readOnly` adapter names
  `manageUrl`, the provider's own profile page, and the page draws the
  same sections with the same fields, every input `readonly` and never
  `disabled` (the field stays focusable, selectable and announced, WCAG
  2.2 SC 4.1.2), a select or the address drawn as its text, no Save, and
  one "Manage at identity provider" link in each section's heading, the
  Profile fields being the standard claims of OpenID Connect Core 1.0
  §5.1 by scope (`profile`, `email`, `phone`, `address`, the §5.1.1
  address members mapped onto the address block's) that the host's
  claims route answers, and Preferences the language, theme, time zone
  and region of the record; a Security card whose read the host lacks is
  absent, as any section the adapter does not carry is, because a client
  never writes an attribute whose mutability is `readOnly` (RFC 7644
  §3.5.2), a person must still see what the provider holds about them,
  and a form the host cannot save is a promise the page cannot keep.
  `organizations` is
  `{ list, leave, setPrimary?, requests, cancelRequest }`, the memberships
  and the pending join requests as glass lists under a `SectionHeading`,
  Make primary drawn while `setPrimary` is carried, and `serviceAccounts`
  is `{ list, organizations, create, remove }`, the create form in a
  `SectionCard`, the one-time token notice, then the keys in the one
  `SubTable`, one organization group row per organization the way the
  listings group theirs, the select column a real checkbox header, the
  username, description, role and expiry columns and Delete in the
  Actions column, the heading's action pane reading "N selected", Clear
  selection and Delete behind the confirm while rows are picked; the
  identity provider's adapter carries neither of the two and BoxVault's
  carries both, so the two sections draw on BoxVault alone the way
  Favorites and Sessions draw on the issuer alone. The sections are
  sidebar rows and routes: the
  profile feature's `sidebar(status, account, integrations, profile)`
  answers the Account group with Profile and its `children` built from the
  same `sectionsFor` over the host's `profile` adapter and the host's
  profile path, the issuer's `/user/profile` with
  `/user/profile/<section>` and a `backend` UI backend's `/profile` with
  `/profile/<section>`, the segments `security`, `preferences`,
  `favorites`, `sessions`, `organizations` and `service-accounts` of
  `PROFILE_ROUTE_SECTIONS`, so the column never lists a section the page
  cannot draw; the router mounts the page at `basePath` and
  `basePath/:section`, the crumbs Account › Profile › Security from the
  row and its child, and no page draws a tab strip, because one profile
  shape means one navigation and the column is it. The step-up guard
  wraps every sensitive call while the adapter carries `stepUp` and runs
  the call plainly otherwise; an edit that the session must reflect
  re-reads the record through `account.profile`, calls `session.reload()`
  and emits `login` on the bus. BoxVault's adapter is built by the router
  in the issuer's member names: for a local account `readWrite`, `profile`
  from the session's reload, `details` routing the display name to the
  change-name call and the name parts to `PATCH /api/user`, `address` and
  `phone.set` over the same patch, `password`, `email` (its `request` the
  change, no `verify`) and `deletion` while the host advertises
  `local-accounts`; for an
  identity-provider session `readOnly`, `profile` the session's reload
  merged with the provider's standard claims through the session's
  memoized `claims()`, `manageUrl` the provider's `/user/profile`, and no
  write; on both the two sections above. Its keys are `profile.*` in
  `shared.json`; the catalog carries it unrouted, its profile being the
  identity provider's.
- **OrgConsolePage** and **DiscoveryPage**: the organization pages of an
  app with organizations of its own, over one `organizations` adapter
  (`get, update, accessMode, users, memberRole, removeMember, invite,
invitations, removeInvitation, requests, approveRequest, denyRequest,
discover, join, gravatarProfile`).
  `OrgConsolePage({ session, activeOrgKey, organizations, org, admin })`
  is the console of the active organization for its owners and admins:
  Organization (the editable record and `access_mode` of a local
  organization, a select over `private`, `invite` and `request` beside
  `default_role`, the read-only profile with the provider link of an
  IdP-managed one, the members as `UserCard` rows with role and removal
  controls, searched from the navbar), Join requests (shown for a local
  organization, and for an IdP-managed one only while its `access_mode`
  is `request`) and Invitations (a local organization only, the
  provider owning invitations otherwise; a hidden tab that was active
  falls back to Organization);
  `admin` is the app's global-admin flag folded into `isOwner`, and a
  rename stores the new name under `activeOrgKey` and refreshes the
  session. `DiscoveryPage({ session, returnTo, organizations, orgMark,
joinIntentKey })` lists the organizations open to discovery with their
  `access_mode` and counts, searched from the navbar, drawn while the UI
  backend advertises `discover`: a `request` organization carries Request
  to join, which opens the join dialog (a react-bootstrap `Modal`), an
  `invite` one a disabled Invite only and a `private` one a disabled
  Private; a visitor is sent to sign in with the organization kept under
  `joinIntentKey`. `access_mode` is one word on every UI backend, `snake_case`
  as the validation contract fixes every body member, with exactly the
  values `invite`, `request` and `private` on the organization record,
  the discover list and the access-mode write, because the shared page
  reads one word per door and a second spelling on one UI backend is a
  branch inside a page that must know no backend. `UserCard`
  (`user, currentUser, orgRole, columnClass, gravatarProfile` and the
  optional `onChangeRole, onSuspend, onResume, onRemoveFromOrg, onDelete`)
  is exported for any app screen that lists members. Their keys are
  `orgConsole.*` and `discovery.*` in `shared.json`; the catalog carries
  both unrouted.
- **AdminPage**: the admin page of an app with accounts and configuration
  of its own, `AdminPage({ session, returnTo, allowed, admin,
updateCommand, page })`: the update notice (`UpdateNotice`, the
  app's own `updateCommand` with a copy button) while the adapter carries
  `updateStatus` and it reports one, then the page the route names, the
  Users and All organizations pages of a host with accounts of its own
  being the identity feature's own `UsersPage` and `OrganizationsPage`,
  drawn by the router at `/admin/users` and `/admin/organizations` over
  the adapter's `users` and `organizations` (the identity contract's
  group 5 fixes their adapter shapes), the bare `/admin` redirecting to
  the organizations, Configuration (`AdminConfig`: one file per
  route, `/admin/config/<name>` the file of that name in `status.config`
  and `/admin/config` the first, drawn under the page heading with no
  tab strip, the configuration page's heading being the file's root
  `title` in the `PageHeader` shape with Update as its action and the
  shared admin page's own heading not drawn above it, because the crumb
  names the place, the file's `schemaVersion` a muted line under that
  heading and never a section (config contract), the sidebar's Configuration entry a tree over the list with
  one child per file while it names more than one (identity contract
  decision 122), the served schema walked by `schemaSections.js` into
  sections and foldable subsections drawn through `ConfigSections` and
  `ConfigField`, validated on blur and on submit through the shared
  evaluator, the `OidcProviders` block inside auth with its add-or-edit
  `Modal`, update, restart, SSL upload on upload fields, the SMTP test on
  mail) and System (`AdminStorage`, one bar per
  storage path); `admin` is `{ users: { list, suspend, resume, remove },
organizations: { list, update, remove, suspend, resume }, config: { get,
schema, update, restartStatus, restart, action }, storage, updateStatus }`,
  each member present only where the host answers it, `allowed` the
  app's global-admin flag; a visitor is sent to sign in and a non-admin
  home. With the sidebar of the navbar contract those are the admin
  feature's sidebar entries, Users at `/admin/users` and Organizations at
  `/admin/organizations` while the adapter carries `users` and
  `organizations`, Configuration at `/admin/config` with
  `/admin/config/<name>` and System at `/admin/system`, one page each, on
  every UI backend that advertises `admin`, the Configuration page on a
  `cookie` UI backend too, behind the identity feature's Configuration
  entry, over an adapter carrying `config` alone while `status.config`
  names a file, and the tab strip goes. Its keys are `admin.*`,
  `configManager.*`, `configField.*` and `oidc.*` in `shared.json`;
  every glyph is `react-icons/fa6`; the catalog carries it unrouted.
- **Arrival on a row**: every page that lists things takes an arrival in
  its URL the way the configuration editor does, a hash naming the row:
  `/profile/service-accounts#<id>`, `/admin/config/<file>#<key>` (the
  editor's, already), `/admin/system#<path>`,
  `/org-console/members#<user id>` and `/org-console/requests#<request
id>`, and a hub notification's `navigate` names that address, never a
  query member of its own. On arrival the page scrolls the row into view
  and moves focus to it once the rows are rendered, and paints nothing —
  no table of the estate marks a row, the file address of a downloads
  patch page included. The notification menu and the inbox follow a
  same-origin `navigate`, a path starting with one slash or an `https://`
  URL on this origin, in-router with the hash kept, an off-origin
  `https://` as a full load as today, and a page already mounted reacts
  to a hash change the way the configuration editor reads its hash on
  mount and on every change. The one hook behind it is
  `src/hooks/useArrival.js`, used by the profile's service accounts, the
  organization console's members and join requests and the admin System
  page's storage paths, because a person told about one row is owed that
  row and not the page it sits on, and a row that is highlighted on
  arrival is a second selection state beside the select column's.
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

## Page states

The states the shell draws before any page can, each a rule with its
reason:

| State                                                                                                  | Draws                                                                                                                                                                                                                                                                                                                                                                                          | Why                                                                                                                                                                                                                                                                       | Spec |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| backend unreachable: `GET /api/status` answered no payload (a proxy `502`, a network error, a timeout) | the shared empty-state card of `NotAvailableStub`, `StatusUnreachable` in `src/components/common`, with the sentence `status.unreachable` and a Retry button (`status.retry`) that probes `/api/status` again and boots the app when it answers; no chrome, because the header, the sidebar and the footer are drawn from the status payload and there is none, and no plain line in its place | a blank page tells the person nothing and a plain line offers nothing to press; the status probe is the one call made before any session exists, so its failure is the one state no page and no shell can draw, and a person in front of a restarting backend needs Retry | none |

---

## Search and filters per page

The search module and its panel are the navbar contract's; a listing page
registers one binding over every collection it shows. Groups appear in
this order:

| Group                | When                                                                      | Values                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection           | the page lists more than one collection                                   | one pill per collection (Boxes, ISOs), counts of rows                                                                                                                                                                                                                                                                                                                                         |
| Visibility           | private rows exist on the page                                            | Public, Private                                                                                                                                                                                                                                                                                                                                                                               |
| Watched              | signed in, and a watched row of any collection is on the page             | Watched, one pill narrowing every collection at once                                                                                                                                                                                                                                                                                                                                          |
| the collection's own | always, prefixed by the collection name when several are listed           | BoxVault boxes: Provider (primary) · Architecture (info) · OS (success); BoxVault ISOs: Organization (primary) across organizations · Architecture (info) · OS (success); catalog provisioners: Tier (badge colors) · Provider (primary); BoxVault downloads: Family (primary) · Vendor (secondary) · Platform (info) · Kind (success), narrowing client-side over the rows the list answered |
| Columns              | list view, one per collection after its own groups, prefixed the same way | one pill per column of that collection's table, active while the column is shown, no counts; not a filter, so it never counts as one and Clear filters leaves it alone                                                                                                                                                                                                                        |

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
route, it points at one. A route a sidebar row matches draws the root
crumb, then `<group> › <row>`, as its crumbs, and a route a child row
matches `<group> › <row> › <child>`, since its first segment is
reserved and would yield none. How the routes, the column, the crumbs and the search
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
- The files Vite creates are never hashed: every entry, chunk, stylesheet
  and asset keeps its fixed name (`assets/<name>.js`, `assets/<name>.css`),
  and no build step, plugin, server or contract may add a content hash to
  a file name, ever, and no query string ever carries a version or a hash
  either; caching is the server's job through `no-cache` and an
  ETag per file, so every UI backend serves every file of the build,
  `/assets/` included, `Cache-Control: no-cache` with an ETag, never
  `immutable`, and `index.html` and `/` `no-store` (identity contract
  decision 132).
- BoxVault's SPA catch-all serves `index.html` from `backend/ui` for every
  browser path, and the Vagrant handler keys on the `Vagrant/` user agent
  before the catch-all, so shared page routes need no server change;
  `/api/status` answers in its setup-only mode too, so the setup gate
  renders.
- BoxVault's downloads share one address between the page and the file: a
  request for `/{org}/downloads/…` whose `Accept` names `text/html` is the
  SPA page; any other request at a product, release or patch address is
  answered the JSON of that level, and at a file address the bytes with
  `Content-Disposition: attachment` and the file name, under the
  credentials every download route takes (none for a public product, a
  service account as Basic, Bearer or a `?token=` link otherwise); a
  handler in front of the SPA catch-all decides, the way the Vagrant
  handler does.
- A download file is uploaded in two steps. `POST
/api/organization/{org}/download/pending/upload` takes the box slot's
  chunked upload (`x-chunk-index`, `x-total-chunks`, `x-file-name`,
  `x-checksum`, `x-checksum-type`) into the organization's pending store,
  validating nothing but the bytes, and its last chunk answers `{ id,
file_name, size, guess: { product, release, patch, key, kind, platform,
architecture, language } }`, the guess read from the file name and never
  a rule; `GET …/download/pending/{id}/info` answers the assembled size
  for the zone's assembly poll; `POST …/download/pending/{id}/place` takes
  `product`, `release`, `patch` and the `downloadFile` form's members,
  creates the product, release and patch when absent, moves the file in,
  and answers the file's address, the caller holding what a create needs
  (any member creates a product, an owner or admin adds to one); `DELETE
…/download/pending/{id}` discards it, and the server drops a pending
  upload nobody placed after a day. The level routes `POST
…/download/{name}/…/file/upload` stay for a program that already knows
  the address and names it in the path, because a script pushing a known
  tree has nothing to be asked and a person dropping a file has.
- A UI backend that serves more than one hostname stamps `index.html` per
  host as it serves it, by the branding contract's rule, a direct
  `/index.html` refused so the stamped page is the only one; BoxVault does
  so from a per-hostname map in its configuration, the identity provider
  from its sites.
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

| Path                                                          | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/catalog/`                                       | The shared pages: `HomePage.jsx`, `OrgPage.jsx`, `CollectionPage.jsx`, `ItemPage.jsx`, `VersionPage.jsx`, `ProviderPage.jsx`, `Listing.jsx`, `ItemsTable.jsx`, `ItemCards.jsx`, `ItemFacts.jsx`, `ChecksumCell.jsx` and the `useCatalogSearch` hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/app/router.jsx`                                          | The route table: the collection routes from the registry in the UI backend's order, every feature route gated by `hasFeature` or the first `auth` token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/utils/routes.js`, `src/components/layout/AppShell.jsx`   | The crumbs drawn from the route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/features/collections/registry.js`                        | `collectionsFor(status)` over the three definitions below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/features/collections/provisioners/`                      | `definition`, `api/adapter.js` (the membership merge over `/api/catalog` and `/api/private/{uuid}/catalog`), `api/provisioners.js`, `components/deploy.jsx`, `components/RebuildItem.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/features/collections/boxes/`, `isos/`                    | `definition`, `api/adapter.js`, `api/boxes.js` and `api/isos.js`, `api/uploadChunked.js`, `components/deploy.jsx`, `utils/versionFields.js`, `assets/distro-icons/`, and the slots for create, edit, publish, add version, add provider, add architecture, ISO upload and ISO actions in `components/BoxList.jsx`, `components/BoxItem.jsx`, `components/BoxVersion.jsx`, `components/BoxProvider.jsx`, `components/Iso.jsx` and `components/IsoVersion.jsx`; BoxVault's ISO read routes share the box routes' token rule and field names (`isPublic`, `published`, `fileName`, `downloadCount`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/features/deploy/`                                        | `DeployControls` and `HyperweaverGlyph.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/features/search/`                                        | `SearchPage.jsx`, `useAppSearch` (the UI backend's `/api/search` behind the `search` token, else the client-side walk of the mounted collections)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/features/about/`                                         | `AboutPage.jsx` and `AboutRoute.jsx`, keyed by `status.role` over `about.boxvault.*` and `about.catalog.*`; the version chips `about.version.app` and `about.version.ui` draw on every role, the `auth-server` role among them, and that role's own `about.auth-server.*` keys are the UI's to add                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/features/auth/`                                          | `LoginPage.jsx`, `RegisterPage.jsx`, `InvitePage.jsx`, `CallbackPage.jsx`, `ProviderButtons.jsx` and the `api/` calls of the session contract's account pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/features/profile/`, `organizations/`, `admin/`, `setup/` | `ProfilePage.jsx` with its section tabs (`IssuerDetailsTab.jsx`, `security/`, `PreferencesTab.jsx`, `FavoritesTab.jsx`, `SessionsTab.jsx`, `OrganizationsTab.jsx`, `ServiceAccountsTab.jsx`); `OrgConsolePage.jsx` and `DiscoveryPage.jsx`; `AdminPage.jsx`, `utils/accounts.js` (the row shaping of a `backend` host's users and organizations for the identity feature's pages), `AdminConfig.jsx` (one file per route, `/admin/config/<name>` a child node of the Configuration tree per name in `status.config`, `["app"]` when absent), `AdminStorage.jsx` (only when the adapter carries `storage`), `OidcProviders.jsx` and `UpdateNotice.jsx` (the update command from `status.role`); `SetupPage.jsx`; each with its `api/` calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/features/vdi/`                                           | The fleet pages: `FleetPage.jsx`, `StatusCards.jsx`, `PoolCards.jsx`, `FleetTable.jsx`, `DriveBadges.jsx`, `CacheBadge.jsx`, `SessionBadge.jsx`, `LastSeen.jsx`, `IconsCell.jsx`, `ExportButtons.jsx`, `VmPage.jsx`, `VmOverview.jsx`, `VmHistory.jsx`, `VmStats.jsx`, `VmMetrics.jsx`; the hooks `useFleet.js`, `useFleetSearch.js`, `useVmHistory.js`; `api/fleet.js`; `utils/vmStatus.js`, `cacheLevel.js`, `eventTypes.js`, `exportRows.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/sse.js`, `src/hooks/useEventStream.js`               | The shared event-stream client and the hook a page subscribes to named events with, per the [Universal Events Contract](universal-events/)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/components/common/`                                      | `PageHeader.jsx`, `SectionCard.jsx` and `SectionHeading.jsx` (the card a form draws in and the heading line a list draws over, each with the section's one action pane at its right, the Pages section's frame rule), `StatusChips.jsx`, `DeprecationBanner.jsx`, `GroupHeading.jsx`, `ConfirmModal.jsx` (the type-to-confirm modal every destructive action opens, its keys under `pages.confirm.*`; every dialog of the estate takes one of two metrics: a dialog that carries a form, one field or many (the config editor's map item dialogs, the terms create, edit and copy dialogs, the users' roles, primary organization, customer id and rate-limits dialogs, the profile's security dialogs, the step-up dialog, the organization edit, convert and join-request dialogs), is a form dialog, `form-modal`, Bootstrap's `modal-xl` width, 1140px capped to the viewport, its body scrolling inside the dialog, its fields grouped under the schema's sections and subsections with a heading each where a schema describes them, foldable subsections included, two columns where the page draws two, the `description` hint under each control, the first field focused on open and the primary action in the footer, because a form the page draws wide and grouped must not collapse into a narrow flat column the moment it opens in a dialog; a dialog that carries a list or a choice (the notifications, language and organization switcher modals, every confirm, the disable two-factor dialog) is a list dialog, `list-modal`, 720px, because a list reads in one column and a wider confirm spreads one question across the screen), `ConfigField.jsx`, `UserCard.jsx`, `columns.jsx` (the shared listing columns), `SubTable.jsx` and `SortHeader.jsx` (the one table behind every detail and admin list), `AuthShell.jsx` and `ProblemAlert.jsx` (the auth column and its problem alert every sign-in, onboarding and interstitial page draws in), `SearchResults.jsx` (the list under the navbar panel) |
| `src/hooks/`, `src/lib/`                                      | `useDetailSearch.js` (a detail table's navbar binding), `useProblemReporter.js` (`problemShape`, `problemOf`, the reporter every auth page answers a failure with); `lib/organizations.js` (`getOrganization`, `userOrganizations`, `joinOrganizationAsAdmin`, `fetchOrganization`, `loadOrganizations`, `logoFor`, `withLogos`), `lib/next.js` (`followNext`, `isPagePath`), `lib/signin.js` (the sign-in, magic-link, recovery and reset calls), `lib/passkeys.js` (WebAuthn plus `passkeyRequestOptions` and `passkeyVerify`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/utils/`                                                  | `membership.js` (`isMember`, `isGuest`, `isManager`, `isOwner`, `managesAny` over the chrome's organization shape), `organizations.js` (`organizationsShape`, `ORG_NAME_PATTERN`, `membershipsOf`), `auth.js` (`authShape`, `returnToShape`, `passwordMinimum` and the sign-in method helpers), `validation.js` (the shared evaluator), `itemShape.js` (the item shape and its helpers), `permissions.js`, `forms.js`, `distroIcons.js`, `prefs.js`, `sort.js`, `schemaSections.js`, `searchRow.js` (the row shape and its path)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Shared by every UI backend, once: `src/css/styles.css` (the auth pages' rules
included), `src/css/fonts.css` (the auth pages' IBM Plex Sans and Source
Serif 4 faces beside Open Sans and Montserrat, the font files under
`public/fonts/`), the pre-paint script, the i18n setup, and the `pages.*`,
`profile.*`, `orgConsole.*`, `discovery.*`, `inviteAccept.*`, `admin.*`,
`configManager.*`, `configField.*`, `oidc.*`,
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
| Downloads: product → releases → patches → files on the shared pages with the downloads slots, the fifth route part marking the file                               | n/a                                                                            | to come                                                                                                                               | n/a                                                                                                              |
| One address for a download, the page or the bytes by `Accept`                                                                                                     | n/a                                                                            | to come                                                                                                                               | n/a                                                                                                              |
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
