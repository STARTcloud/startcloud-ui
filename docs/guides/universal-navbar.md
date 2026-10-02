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
governs the right-hand cluster (search, mode, language, account), the
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

- The order, labels, conditions, and behavior of universal rows are
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
it is the app's: the brand alone while signed out, the brand and the
route breadcrumb while signed in (see the
[Universal Pages Contract](universal-pages/)). The cluster keeps one
order in both states, left to right: search, Discover, the ticket icon,
the mode control, the language control, then the account control, each
present only by its own condition, so signed out it reads Discover, the
ticket icon, mode, language, Sign in, and signed in search, Discover,
mode, language, account.

| Slot     | Signed out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Signed in                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search   | absent, because app-wide search needs a session and no signed-out page binds the navbar search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | first in the cluster, only while the host lists the `search` feature token: magnifier icon that expands into the search input (see Search and filters)                                                                                                                                                                                                                                                         |
| Discover | a compass glyph (`FaCompass`) titled "Discover", an in-router link to `/organizations/discover` while the UI backend advertises `discover`; absent otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | a compass glyph (`FaCompass`) titled "Discover", the same in-router link, drawn right after the search control while `discover` is advertised                                                                                                                                                                                                                                                                  |
| Help     | a ticket glyph (`FaTicket`) titled "Help": the improvement-request ticket URL opened in a new tab, built from `ticket.base_url` with `req` from `ticket.req_type`, `customerId` from `ticket.fallback_customer_id` and `context`, and no `user` or `email`, because the customer id of the whole app rides the status payload so an anonymous visitor on the sign-in, recovery or error pages can report a fault against the site's customer, a six-character hex code Prominic identifies its customers by; drawn only while the app holds a ticket system, `ticket` in the status payload or the `ticket_system` of `/api/config/ticket`, and `links.docs`, `links.contact` and `links.api` draw nowhere in the cluster | hidden; the Help row of the user menu is the same ticket URL with the person's customer id, name and email added, and `links.docs`, `links.contact` and `links.api` are the Docs, Contact and API reference rows of the app section                                                                                                                                                                            |
| Language | a globe glyph (`FaGlobe`) with the current language's two-letter code, `aria-label` "Change language, English" → language modal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | same; writes through                                                                                                                                                                                                                                                                                                                                                                                           |
| Mode     | icon button, cycles auto → light → dark → auto starting at auto, before the language control, the mode alone and never the theme: the theme, the pack, is chosen on the profile's Preferences page, its select drawing "Follow this site" and one row per theme of `brand.themes`, because the mode control was never asked to carry the theme chooser, that was for the profile menu                                                                                                                                                                                                                                                                                                                                     | same, drawn between search and language; writes through `PATCH /api/user/preferences`                                                                                                                                                                                                                                                                                                                          |
| Account  | primary **Sign in** button after the language control, the last control in the cluster; it always carries the page it was pressed on as the return path, the ended session's page while the session-ended banner shows, never an auth page; hidden while the route is an auth path, on every host, where the page itself is the sign-in                                                                                                                                                                                                                                                                                                                                                                                   | user's name + avatar as one toggle; clicking either opens the menu; the account button carries the unread count on its top right, the same number the menu's Notifications row shows, hidden at zero, from the notifications feature's one context, in the sidebar Inbox badge's look, because the avatar is the one control on every page and a person must see that something waits without opening the menu |

- Mode, theme and language follow the
  [Preferences, Language & Branding Contract](preferences-and-branding/):
  the account value overwrites local storage on login, toggles write
  through optimistically, `auto` resolves via `prefers-color-scheme`, a
  host names no mode, and every app ships the pre-paint script.
- Name = `name` → username → email. Avatar = `picture` (or the app's stored
  avatar URL) → Gravatar by email hash → the app's own mark. Never an empty
  circle.
- No bell in the cluster. Notifications are a menu row.
- Cluster icon buttons (mode, language) are borderless and transparent —
  no outline, no background until hover.
- Nothing sits left of the cluster but the brand while signed out, and
  nothing but the brand and the breadcrumb signed in: `links.docs`,
  `links.contact` and `links.api` are rows of the app-named menu section
  signed in and draw nowhere while signed out, the ticket icon being the
  one help a signed-out page carries and Discover its one destination,
  and About is a menu row alone, because a signed-out page is a sign-in
  page or a public listing and every link on it that is not the brand is
  help or the directory.
- Left of the cluster, signed in, the app draws a breadcrumb after the
  brand: plain text crumbs separated by a muted `›`, never buttons, pills
  or dropdowns. The crumbs come from the route alone —
  `› org › collection › item › version › provider`, each a plain link up
  the route — and are identical in BoxVault and the catalog; the brand is
  the root. An org crumb carries the org's logo (→ Gravatar → the app's
  mark) and name, a collection crumb the definition's `icon` component. On
  a collection's own root, `/<segment>` or `/<key>` for the segment-less
  collection, the crumbs read the collection alone, linking to that root,
  and beside a column no root crumb is drawn; an organization's pages keep
  the organization crumb linking to `/<org>`, and the segment-less
  collection's items still live directly under it. The active
  organization is never a crumb: it is the user menu's organization row
  and the switcher, and switching it never moves the page.

---

## Search and filters

One search module for every page that has something to search. The page
owns what is searched and how; the module owns the shell, and the shell is
identical in every app.

- **Placement**: first control in the account cluster, a 34px borderless
  magnifier button like the mode and language buttons. It exists only
  while the host lists the `search` feature token; without it no page
  shows the icon.
- **Expand**: click, hover-dwell of about 400 ms, or Ctrl+F (Cmd+F on a
  Mac) pressed outside any input, select, textarea or editable element,
  replaces the icon with a 340px input carrying a leading magnifier, the
  page's placeholder, a live `matched / total` count, a gear, and a ×;
  focus lands in the input, and once it holds focus the browser's own
  find is untouched. Typing filters the page live on every keystroke — there is no
  submit and no server round trip from the shell. On a page whose rows
  are a paged list narrowed by the server alone the count is `matched`
  alone, drawn as "N results", because the server answers the narrowed
  total and never the unnarrowed one, and a second request made only to
  draw a denominator is a request per keystroke's worth of nothing.
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
  pills labeled `value (count)`, each toggling that value, active pills
  in the group's color and inactive pills in the muted secondary tint. The
  label column sizes to the longest label on the page, and a group with no
  values on the page is not drawn. A foot row shows the active-filter count,
  the page's action while it registered one (a small button carrying the
  action's glyph and label), and a "Clear filters" link, which empties the
  sets but keeps the query and the panel.
- **Registration**: a page publishes a binding — the query and its
  setter, the placeholder, the matched and total counts, the filter groups
  (key, label, entries with counts, the active set, the active class or a
  per-value class, an optional per-value label, a toggle, and a `columns`
  flag on the one group that picks columns rather than rows), each group
  carrying a `kind`: `toggle` (the on/off pills every group has today,
  the default), `select` (one value of a list, drawn as one row of pills
  of which one is active, for a status that is exclusive), or
  `date-range` (a start and an end with the preset buttons 30, 60, 90 and
  120 days and All time, drawn as one row of the panel); a page whose
  rows are a paged list from its backend sends the query and every
  group's value as the parameters that backend names and re-reads page
  1, the server alone answering and nothing narrowed client-side, and
  publishes the answer's `total` as `matched` and no `total`, because
  a page that filters the page it holds while the server holds the rest
  shows a count that lies; a clear-filters handler; optionally one action
  `{ key, labelKey, icon?, onRun }`, the page's one page action drawn at
  the foot of the panel, which the page builds from the current query and
  groups (an export of the narrowed list), because an action that works
  on what the panel narrows belongs where the narrowing is and a button
  on the page beside an empty table would act on a list the person cannot
  see; and, once the results list exists, an optional
  `searchElsewhere(query)` function answering deep-linked hits from the
  rest of the app — for as long as it is mounted; the module reads the
  newest binding on every event, so a page never adapts to the shell.
  Persistence of picked filters is the page's
  own, per page in local storage, a listing's under
  `table_prefs_<the keys of the collections it lists joined by +>_<org or home>`,
  the same key on every UI backend because storage is per origin.
- **One search per page**: a page never draws a search field or a filter
  row of its own beside the navbar's; the query, every filter and the
  Columns group live in the module and its panel, an action over the
  narrowed list is the panel's registered action, and the page keeps only
  what is not a narrowing, a bulk bar and the table, because every search
  goes through the navbar and a person looking for the box finds it in one
  place on every UI backend.
- **One filter group per enumerable column**: the panel is where a person
  narrows a table, not only where columns are toggled, so every page that
  draws a table or a card list publishes, beside its query and its Columns
  group, one filter group per enumerable column of its rows: a column
  whose values are a small closed set (a status, a kind, a role, a
  boolean, a verified flag) becomes a `toggle` group, multi-select over
  its values, or a single pill for a boolean, or a `select` group where
  the values are exclusive; a date column becomes a `date-range` group.
  On a page whose rows are a paged list the groups the list names a
  parameter for are sent as that parameter, and the rest narrow the rows
  the list answered client-side; on a page whose rows are all loaded
  every group narrows the rows client-side; because a column a person
  can read but not narrow by sends them back to scrolling, and a group
  the list cannot answer is still worth having over the page in hand.
  Groups draw in the panel in the order the page publishes them, the
  Columns group last.
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
  the catalog brings Tier (the tier badge colors) and Provider (primary).
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
  kind had more. The UI backend is asked through
  `GET /api/search?q=&limit=`, the module drawn only while it lists the
  `search` feature token. The app-wide results block under the panel
  folds by its heading, the fold kept in local storage, so the filter band
  stays open while the results are put away, because a person narrowing a
  page does not always want the estate's hits under it.
- **Search page**: `/search?q=`, a reserved segment on every UI backend, is the
  full result: the same query bound to the navbar box so typing refines
  the page, one table per kind (Title, Where, Matched) with header sort
  and Columns pills like every other table, fifty rows per kind, the
  count line, and the deep links, drawn while the UI backend lists
  `search` and the not-available stub otherwise.
- **What a UI backend answers**: `/api/search` returns
  `{ query, results, truncated }`, every result
  `{ kind, collection, org, name, version, provider, architecture, title, subtitle, matched }`
  with `kind` one of organization, item, version, provider, architecture,
  artifact, user, and on the identity provider also application,
  identity-provider, terms, notification, session, login, registration,
  blocked-address (the Universal Identity Contract names each);
  `collection` the collection key or null; the route
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
  exact value or a prefix of six or more characters, file name); downloads
  (product name, description, family, vendor), their releases, patches
  and files under the downloads list's visibility, a file hit carrying
  `kind: architecture` with `collection: downloads` and the route parts
  filled to `architecture`, the screen word coming from the registry's
  level labels; and
  users (username, email) for a global admin everywhere and for an
  organization's owners and admins within it. The catalog matches
  provisioners (name, label, description, repository), their versions and
  artifact names and organizations, through its own `GET /api/search`.
- **Everywhere**: the same list, answered by every client in the estate
  that has registered its search endpoint on the identity provider's
  shared search channel, the way producers register with the notification
  hub: a client advertises `/api/search` to the channel, the channel fans a
  query out to the registered clients with the token the estate already
  shares, and the rows come back in the shape above, merged and grouped
  by app. The mode switch is the expanded box's leading magnifier; no
  scope row, no pills for scopes. Planned and owned by the identity
  provider; the channel is built there first and each client's part is
  handed out from it afterward, nothing is built in a client ahead of it.
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
  background and top border, so chrome reads as chrome in both modes.
- **Pinned**: the app is a viewport-high flex column, header, page,
  footer; the page region between them is the one scroll container and the
  window itself never scrolls, so the header and the footer stay in place
  by layout, the header with a small shadow marking the seam; a route
  change scrolls the page region back to the top. While the footer's pane
  is open (see Footer status) the pane sits under the footer's row at the
  bottom of the column, the row rides above it and the page region gives
  up the height, still the one scroll container, the pane scrolling
  inside itself.
- **Full-bleed**: chrome carries no outer margins and no max-width
  container — header and footer span the viewport, with only the gutter
  inside them.
- **Gutter**: header and footer content align to the same 20px horizontal
  gutter. Bodies may be full-bleed or contained per app; chrome may not.
- **Footer**: one 13px text row, 36px high under its 1px top border,
  with no vertical padding, because "there is this padding on top and
  below the buttons the entire footer could do without". The sidebar's
  foot is the same 36px under the same border, the one value
  `--chrome-foot` giving both their height as `--chrome-row` gives the
  header and the sidebar's top theirs, so the footer in its collapsed
  state is never a pixel or two off the sidebar's foot and the two top
  borders are one line across the column. The pane's tools fill the
  row's height, square, joined with no gap between them, and sit hard
  right, against the window's edge with no gutter, hyperweaver-ui's
  manner; a row without tools keeps the gutter, the heart 20px from the
  edge. The
  "Powered by" mark may load from a remote URL, but the line must degrade
  to the company-name text alone when the image fails — never a broken
  image. The pane under the row opens at 130px, closes when dragged
  under 100px and grows to ninety percent of the window, hyperweaver-ui's
  three numbers.
- **Sidebars** follow the Sidebar section below and share these metrics.

---

## Sidebar

The column draws while the host lists the `sidebar` feature token and a
mounted feature exports entries for it, and never otherwise. The visual
reference is
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
- **Top.** Two controls in one 62px row: the brand mark and the product
  name are one link to `/`, so the brand means home on every host, and
  the chevron alone collapses the column to a 38px rail; in the rail the
  mark alone is drawn, titled Expand, and a click on it expands the
  column. While a sidebar is drawn the header row carries no brand and no
  root crumb, the crumbs alone, the column's top being the home link;
  without one the header keeps the brand. Never two brands at once.
- **Metrics.** The tertiary band with a right border, 260px by default,
  180 to 400px by the drag handle on its right edge, 38px as the rail,
  the same 20px gutter inside.
- **Entries.** Two kinds share the one column. Sections: an uppercase
  label, then rows of an icon, a label and an optional badge, active by
  route with the primary wash and a 3px left tab, the icon alone with the
  label as its title in the rail; a section left without rows by gating
  is not drawn; a parent row's children fold like a tree node's, a caret
  at the row's right end, as the tree node's, open while a child is the
  current route, the state
  kept under `sidebar_open_<group>` beside the tree's open nodes, and the
  parent's own link still navigates, because a column that lists every
  child of every parent at once is a page long before the rows it exists
  to reach, while a fold that hides the row a person stands on would hide
  where they are. Tree: nodes with a caret at the row's right end, a
  child's row beginning where its parent's label begins, its left
  padding the 20px gutter plus, for every node above it, the width of
  what that node draws before its label, 28px for an icon (its 18px and
  the 10px gap), 18px for a status dot (its 8px and the gap) and one
  18px step for a node that draws neither, so a machine's dot sits
  under its host's name, as hyperweaver-ui draws it, and no child
  begins left of its parent's label, because "if aggregated then why
  does it look like the VMs are not indented under the host?", a node
  that draws an icon and a dot having pushed its own name right of the
  children one step under it,
  children loaded on expand and for the node the current route lies
  under, a node open while its key is in the persisted open set, while
  its `matches(pathname)` answers true, while its `to` is a prefix of
  the route or while a loaded child's `to` is, so a deep link to a child
  route opens the tree down to it before the node was ever expanded; the
  catalog's Browse tree gives every mounted collection a root node that
  carries the collection's `icon` component as its glyph, the
  organization, item and version nodes under it carrying none, and
  routes to that collection's own all-organizations listing, `/<segment>`,
  or `/<key>` for the segment-less collection, never to the home page,
  and is open on that route, because one Browse node that opens every
  collection is not that collection's node; a node
  with children and no page of its own carries no `to`, folds on click
  and never navigates, its children loaded on mount because only they
  say whether the current route lies under it, because two rows that
  open one page confuse and a node that only folds is a group, not a
  page; a
  status dot, a right-click menu from one presenter, the selection driven
  by the route and never by checkboxes; a tree may carry views, a select
  at its top switching between the shapes the feature exports (by pool,
  by host, by state), the way Proxmox's resource tree does.
- **Export.** A feature exports a `sidebar` function,
  `sidebar(status, account)` for a feature gated by the host's tokens and
  `sidebar(status, account, collections)` for the catalog feature, which
  answers one Browse group holding the Browse tree while the host mounts
  a collection, for every visitor while the host lists `browse` and for a
  `ROLE_ADMIN` account alone while it lists `admin` instead, else
  nothing, answering
  `[{ key, labelKey, sections | tree | views }]` after its own token and
  role checks, `views` being `[{ key, labelKey, useTree }]` when a tree
  has more than one shape; the router's
  `sidebarEntries({ status, account, collections })` concatenates every
  mounted feature's answer in the order catalog, hosts, profile,
  identity (on a `cookie` host), vdi, then the shared admin feature (on
  every other host), the hosts feature's Hosts group above the profile
  feature's Account group, because "We show Account Profile? That
  should be below I think", what a UI backend is for drawn before the
  person's own account, the mounted collection definitions handed in
  for the catalog's
  Browse tree, answers the empty list without the `sidebar` token, hands
  the list to `AppShell` as `sidebar`, and the sidebar never re-decides
  a gate. Every `to` is a route of a contract. Entries come only from
  features; the status payload gates the column and adds no entry. A
  section is `{ key, labelKey?, items }` and a row
  `{ key, icon, labelKey, to, end?, badge?, external? }`, `end` marking a
  row active on its exact path alone and `external` marking a row the
  shell follows as a top-level navigation rather than a router link,
  never active, because a page still served by another chrome is
  reached and left by a full load. A bare `tree` is a hook, the same
  shape a view's `useTree` answers: `{ nodes, menu?, labelKey?, dialogs? }`,
  `labelKey` drawn as a section heading above the tree in the same
  style as a section's, so a tree that stands in for a section keeps
  the section's name (the issuer's Configuration tree under System),
  because a tree draws after every section and a tree without a heading
  reads as the last section's rows, `dialogs` the node the feature draws
  the dialogs of its menu's rows in, drawn under the tree, because a row
  that asks before it acts needs a dialog that stays after the menu
  closed; every node
  `{ key, icon?, label, to?, children?, status?, revision?, matches? }`, `to` absent
  on a node that only folds, `children` a function
  the sidebar calls on expand answering the child nodes, `revision` a
  number the feature raises when the data behind the node's children
  changed, the sidebar calling `children` again for an open node whose
  revision moved since it last asked and never on a timer, absent on a
  tree that reads once, `status` a word
  the status dot draws (`up`, `idle`, absent for none), `matches` a
  function of the pathname answering whether the route lies under the
  node, for a tree whose routes do not nest under its nodes' paths (the
  catalog's Browse tree over `/{org}/{collection}/{item}`), and `menu(node)`
  answering the right-click rows as
  `[{ key, labelKey, icon?, tone?, onClick }]`, a `{ key, divider: true }`
  between their groups, `tone` the text class the row's glyph draws in,
  the menu titled by the node's label and drawn by `ContextMenu`, the one
  presenter the footer's pane shares, a row closing the menu and then
  running, and no menu opening for a node without rows; a
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
  drop-up, its toggle the avatar on the left, then the name over the
  email line, as hyperweaver-ui's foot draws it, each cut with an
  ellipsis at the column's width, and the avatar alone in the
  rail; the mode control and language stay in the header cluster. The
  hosts feature's Controls menu uses it on host and machine routes. The
  foot is as tall as the footer's row, 36px under a 1px top border, the
  chrome metrics' `--chrome-foot`.
- **Storage.** `sidebar_width`, `sidebar_minimized`,
  `sidebar_open_<group>` and `sidebar_view_<group>` per origin, in the
  session contract's storage table.
- **Keyboard and small screens.** `nav aria-label`, arrow keys between
  rows, Left collapses a node, Right expands, Escape closes a menu; under
  900px the sidebar overlays from the left behind a header toggle and
  closes on a route change.

---

## Controls menu

The hosts feature's `actionMenu`, drawn in the header's account slot
(see Sidebar, Foot) while the UI backend lists `hosts` and a person is
signed in: hyperweaver-ui's Controls dropdown, carried over row for row
wherever the page a row opens exists. The menu follows the route, and a
host's tokens and hypervisors are read from that host's own row, the
registry row's `capabilities` on the `hyperweaver-server` role and the
agent's status on an agent role, checked strictly, because a row the
menu draws fires an agent request that an agent without the surface
answers 404.

| Route                                                                                                                               | Toggle                                                             | Rows                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/hosts/{id}/machines/{name}` and its pages, `/hosts/{id}/machines/{name}/snapshots` and `/hosts/{id}/machines/{name}/provisioning` | Machine controls, Zone controls while the host names `bhyve` alone | the machine rows below                                                                                                                                                                                                                                                                                                                                                                                 |
| `/hosts/{id}`, `/hosts/{id}/machines`                                                                                               | Host actions                                                       | View host details first, which opens the host's Overview; Restart host and Power off host for an admin while the host lists `host-power`, the restart offering the fast reboot and its boot environment while the host lists `host-fast-reboot`; the bulk rows over this host's machines while it lists `machines`; the toggle disabled while the host offers neither the power rows nor the bulk rows |
| `/hosts/{id}/networking`                                                                                                            | Host actions                                                       | the rows of `/hosts/{id}`, the host's menu on the page of the Networking page section                                                                                                                                                                                                                                                                                                                  |
| `/hosts/{id}/manage`                                                                                                                | Host actions                                                       | the rows of `/hosts/{id}`, the host's menu on the page of the Manage page section                                                                                                                                                                                                                                                                                                                      |
| `/`                                                                                                                                 | Bulk actions                                                       | the bulk rows over the machines of every host that lists `machines`, under the heading Across all hosts; disabled while no host lists it                                                                                                                                                                                                                                                               |
| every other route                                                                                                                   | Controls, disabled                                                 | none                                                                                                                                                                                                                                                                                                                                                                                                   |

The machine rows, in the order they draw, each a request at the path the
role fixes (`/api/agents/{id}/…` on the server role, `/api/…` on an
agent role):

| Row                                                                  | Shown when                                                                                                                                                                                                                | Request                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Power on                                                             | the machine is stopped                                                                                                                                                                                                    | `POST machines/{name}/start`                                                                                                                                                                                                                                                              |
| Shutdown                                                             | it runs                                                                                                                                                                                                                   | `POST machines/{name}/stop`                                                                                                                                                                                                                                                               |
| Restart                                                              | it runs                                                                                                                                                                                                                   | `POST machines/{name}/restart`                                                                                                                                                                                                                                                            |
| Reset                                                                | it runs and its hypervisor is not UTM                                                                                                                                                                                     | `POST machines/{name}/reset`                                                                                                                                                                                                                                                              |
| Inject NMI                                                           | it runs                                                                                                                                                                                                                   | `POST machines/{name}/nmi`                                                                                                                                                                                                                                                                |
| Pause                                                                | it runs, the host names `virtualbox` and the machine's hypervisor is not UTM                                                                                                                                              | `POST machines/{name}/pause`                                                                                                                                                                                                                                                              |
| Suspend                                                              | it runs and the host lists `machine-suspend`                                                                                                                                                                              | `POST machines/{name}/suspend`                                                                                                                                                                                                                                                            |
| Resume                                                               | the machine's own row reads `paused` and the host lists `machine-suspend`, or reads `suspended` and the host lists `machine-resume-suspended`                                                                             | `POST machines/{name}/resume`                                                                                                                                                                                                                                                             |
| Guest shutdown                                                       | it runs and its guest can be reached: the host names `virtualbox`, or names `bhyve` and lists `guest-agent`                                                                                                               | `POST machines/{name}/guest/shutdown` with `mode: powerdown`                                                                                                                                                                                                                              |
| Guest reboot                                                         | as Guest shutdown, and the machine's hypervisor is not UTM                                                                                                                                                                | `POST machines/{name}/guest/shutdown` with `mode: reboot`                                                                                                                                                                                                                                 |
| Run in guest                                                         | as Guest shutdown; the command dialog, the guest agent's wire on a host that lists `guest-agent` and the Guest Additions' with the guest's credentials otherwise                                                          | `POST machines/{name}/guest/exec` with `path`, `args` and `timeout_seconds`, or `POST machines/{name}/guestcontrol/run` with `username` and `password` beside them; a command that outlives the wait answers its `pid`, read once on Check through `GET machines/{name}/guest/exec/{pid}` |
| Set display size                                                     | it runs, the host names `virtualbox` and the machine's hypervisor is not UTM; the size dialog with its presets                                                                                                            | `POST machines/{name}/display` with `width`, `height` and, where given, `depth` and `display`                                                                                                                                                                                             |
| Open in application, one row per application                         | the host lists `host-launchers` and `GET applications` answers a row; a row whose `exists` is false is drawn disabled, the missing path its tooltip                                                                       | `POST machines/{name}/applications/{application}/launch`                                                                                                                                                                                                                                  |
| Snapshot                                                             | the host lists `machine-snapshots` and the person is an admin; the take dialog                                                                                                                                            | `POST machines/{name}/snapshots`                                                                                                                                                                                                                                                          |
| Clone                                                                | the host lists `machine-create` and the person is an admin; the clone dialog                                                                                                                                              | `POST machines/{name}/clone`                                                                                                                                                                                                                                                              |
| Convert to template                                                  | the host lists `templates` and the person is an admin; the template dialog                                                                                                                                                | `POST templates/export`                                                                                                                                                                                                                                                                   |
| Move                                                                 | the host names `virtualbox`, the machine's hypervisor is not UTM and the person is an admin; the folder in a form dialog                                                                                                  | `POST machines/{name}/move` with `target_path`                                                                                                                                                                                                                                            |
| Zone lifecycle: Ready, Verify, Mark incomplete, Detach, Attach, Move | the host names `bhyve` and the person is an admin                                                                                                                                                                         | `POST machines/{name}/ready`, `verify`, `mark-incomplete`, `detach`, `attach` with `update` and `force`, `move` with `target_path`                                                                                                                                                        |
| Provision, Sync files, Sync back, Run provisioners                   | the host lists `provisioning`, the machine's detail carries a provisioner document and the person may start and stop machines; each opens the machine's Provisioning page with its action in `run`, and the page sends it | `POST machines/{name}/provision`, `POST machines/{name}/sync`, the same with `syncback`, `POST machines/{name}/run-provisioners`                                                                                                                                                          |
| Force kill                                                           | it runs and the person is an admin; behind the typed confirmation                                                                                                                                                         | `POST machines/{name}/stop?force=true`                                                                                                                                                                                                                                                    |
| Destroy                                                              | the person is an admin; the options dialog, then the typed confirmation                                                                                                                                                   | `DELETE machines/{name}` with `force` and `cleanup_disks`                                                                                                                                                                                                                                 |

- **One request, one notice.** A row sends one request and raises one
  notice, a success card naming the action or a danger card carrying
  the agent's own message, the agent alone deciding whether a machine's
  state allows the row. Verify is the one row whose answer is read: its
  verdict and the tool's output draw in a list dialog. Attach and Move
  collect their options in a list dialog first, Attach its update and
  force, Move the absolute path on the host.
- **The tool rows.** Snapshot, Clone, Convert to template and Move each
  open a form dialog that sends the one request, the move's the
  absolute folder on the host. After a success the host's stats, its
  machine rows, the machine's detail and its snapshots are read again
  once, and while the host's own row lists `tasks` the notice carries
  View task, which opens the task dialog on the task the agent queued;
  a refusal leaves the dialog open and raises one danger card with the
  agent's message. Move here is the move of a VirtualBox machine's
  files; on a bhyve host Move is the zone lifecycle's and no second row
  draws. A clone is sent as the machine's own agent reads it, told by
  the host's own row and the machine's own row: on a host that lists
  `zfs` the snapshot a copy is made from goes as `snapshot_name`, the
  linked clone opens ticked and needs no snapshot picked, and a zone
  that runs is copied with none; on every other host the snapshot goes
  as `snapshot`, the box opens unticked, a linked clone needs the
  snapshot it links to and a machine that runs needs one to copy from;
  a machine on UTM is offered neither. Every body says `linked`. An
  agent short of resources answers `details`, drawn in the clone dialog
  one line a resource with no card beside it, the dialog left open, and
  the warnings of a clone the agent queued ride its one notice. Convert
  to template offers the snapshot the template is made from on a host
  that lists `machine-snapshots` and `zfs`; elsewhere the template is
  of the machine's current state and no snapshot is named.
- **What the menu reads.** The running state from the host's stats, the
  machine's hypervisor and state from the host's machine rows,
  `GET machines`, each one copy per host held for every surface that
  draws it, read again once after a row's success, the machine's detail
  with them while the machine page holds it, and renewed by the `hosts`
  topic between reads. The applications are asked for once as
  the menu first opens on a host that lists `host-launchers`.
- **Bulk actions.** Start, Shut down and Restart over many machines,
  named by the noun the hosts' hypervisors fix. A row opens the bulk
  dialog, a list dialog: the machines of the hosts in scope from each
  host's held stats, the ones the action applies to picked as it opens
  (the stopped for a start, the running for a stop or a restart), a name
  filter, a state select and, over several hosts, one chip per host
  narrowing the one table, grouped by host over several hosts, whose
  select column picks the targets. The action's button carries the
  count and sends one request per target at once; one notice names how
  many were sent and how many failed, every failed target is listed in
  the dialog with the agent's message, and every host acted on has its
  stats read again once.
- **The tree's menu.** A right-click on a node of the hosts tree opens
  the verbs of the node a person points at, without the route moving:
  Open on every node; on a machine's node Settings while the one list of
  the machine's pages offers it, opening the machine's Settings page,
  Power on while it is stopped,
  Shutdown and Restart while it runs, Snapshot while the host lists
  `machine-snapshots`, Clone while it lists `machine-create`, Provision
  while it lists `provisioning`, opening the machine's Provisioning page
  with the provision in `run`, one row a console the host's row offers,
  VNC, zlogin, SSH and RDP, opening the machine's page with the console
  in its `console` query, Force
  kill while it runs and
  Destroy; on a host's node one row a page the host's own row offers,
  from the one list of the host's pages (Host overview, The pages of a
  host), hyperweaver-ui's doors, each opening its page, the one place
  the tree offers them since it lists no page row, then Restart
  host and Power off host while the host lists `host-power`; on the
  Datacenter root Open and, for a role that may manage settings, Add
  host, hyperweaver-ui's plus beside its root, opening the hosts page
  at `/?add=host` with the registry panel's form open, the registry of
  agents being the hosts page's own table for that role, its columns
  and row actions joining the hosts columns and Add host its heading's
  action; on a
  configuration file's node Open alone and no menu on the Configuration
  node, which has no route; every verb gated by the person's role as
  the Controls menu's row of the same name is. A power row sends its one
  request at once and raises its one notice; Snapshot, Clone, Force
  kill, Destroy and the
  host's two rows open the dialogs the Controls menu opens, the tree's
  `dialogs`, and the host's stats, and its machine rows and the
  machine's detail while they are held, are read again once after a
  success. hyperweaver-ui's other
  rows of this menu open a page or a tab a later round ports, Manage,
  Devices and Storage on a
  host; each lands here with the round that ports what it opens, a page
  of a host as one entry of the list of the host's pages, as Agent
  settings did, one entry gated by the host's hypervisors since
  hyperweaver-ui gated it by none. New machine on
  a host's node, while the person may create machines and the host's own
  row lists `machines` and `machine-create`, opens the host's page with
  the `create=machine` query, the one door of the create wizard.
- **No timer.** hyperweaver-ui read a host's stats again two seconds
  after every action and asked `/api/health` on a clock after a host
  restart; both go. The read after an action is the response's own, and
  what changes afterwards arrives on the `hosts` topic.
- **New machine and Install OS.** New machine draws on a host's routes
  while the person may create machines and the host's own row lists
  `machines` and `machine-create`, and opens the host's page with the
  `create=machine` query, the create wizard's one door. Install OS is a
  tool row of a machine on a host that names `virtualbox`, never of a
  machine on UTM, and opens the dialog of an unattended OS install, one
  request, `POST machines/{name}/unattended`, and one notice.
- **Rows that wait for their page.** Share link and
  Manage host open a page or a tab of
  hyperweaver-ui that a
  later round ports; each lands in this menu with the round that ports
  what it opens. The browse button beside the folder of Move,
  hyperweaver-ui's path picker behind `file-browser`, is the
  `PathInput` the Settings page's path fields draw and waits on the
  Move dialog for the slice that ports the file browser; the path is
  typed until then.

---

## Host overview

The host page of the hosts feature, `/hosts/{id}`: hyperweaver-ui's host
overview, carried over panel for panel in hyperweaver-ui's order, on the
frames of the [Universal Pages Contract](universal-pages/). A panel
draws only while the host's own row lists every token it is behind, the
registry row's `capabilities` on the `hyperweaver-server` role and the
agent's status on an agent role, checked strictly, because a panel fires
an agent request that an agent without the surface answers 404. Every
read is sent at the path the role fixes (`/api/agents/{id}/…` on the
server role, `/api/…` on an agent role).

| Panel                                 | Frame                                                         | Behind                           | Reads                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System information                    | the host overview card, the leading column, record rows       | `hosts`                          | the host's stats: the hostname, the platform with its release, the architecture, the OS build and the uptime, the not available word for a member the agent did not answer |
| Monitoring service and Service health | two rows of the same record                                   | `monitoring`                     | `GET monitoring/status`, running or stopped and initialized, and `GET monitoring/health`, the health word in its tone                                                      |
| Task queue                            | a row of the same record                                      | `tasks`                          | `GET tasks/stats`, the pending, done and failed counts read as `pending_tasks`, `completed_tasks` and `failed_tasks`                                                       |
| Provisioning tools                    | a row of the same record                                      | `provisioning`                   | `GET provisioning/status`, a badge a tool, `builtin_sync` read and never drawn                                                                                             |
| Resource utilization                  | the host overview card, the trailing column, three bars       | `hosts`, the swap bar `swap` too | the host's stats, the newest sample of the CPU, memory and ARC series, and `GET system/swap/summary`                                                                       |
| Machines                              | a glass section, the heading counting them over the one table | `hosts`                          | the host's stats, `allmachines` and `runningmachines`                                                                                                                      |
| Network interfaces                    | a glass section, the heading counting them over the one table | `monitoring`                     | `GET monitoring/network/interfaces`                                                                                                                                        |
| Storage summary                       | a glass section beside the interfaces, two stat cards         | `monitoring` and `zfs`           | `GET monitoring/storage/pools` and `GET monitoring/storage/datasets`                                                                                                       |
| Storage I/O and ZFS ARC charts        | a section card each, under the Performance heading            | `monitoring` and `zfs`           | `GET monitoring/storage/pool-io` with `per_pool` and `GET monitoring/storage/arc`                                                                                          |
| Network, CPU and Memory charts        | a section card each, under the Performance heading            | `monitoring`                     | `GET monitoring/network/usage` with `per_interface`, `GET monitoring/system/cpu` with `include_cores` and `GET monitoring/system/memory`                                   |
| Monitoring database                   | a glass section, the heading over the one table               | `monitoring`                     | `GET monitoring/summary`, one row a table that holds records; nothing draws while the store holds none                                                                     |

- **One copy per host.** Every answer and every series is held once per
  host in the hosts feature's contexts, as the list of servers and a
  host's stats are: the first panel that draws one asks for it, a second
  while the request is in flight joins it, and every panel after it
  draws the held copy, because the bars, a chart and its expanded dialog
  draw the same samples and three requests for one answer are two too
  many.
- **No timer.** A panel reads once as it draws, again when the event
  stream opens fresh or answers `reset`, and on the page's Refresh,
  which reads again the list of servers, the host's stats, every answer
  held of the host and the history of every series its charts draw.
  Between reads a series grows by the `monitoring` topic of the
  [Universal Events Contract](universal-events/), the bars follow the
  newest sample, the machines follow the `hosts` topic, and the task
  queue's counts are read again once a `task-updated` event carries a
  status the task was not seen in. hyperweaver-ui's refresh interval,
  one second to five minutes, its Auto and Manual switch and its second
  reading of the stats three seconds after the first are not carried
  over, because state moves on an event, a response or a person's
  action, never on a clock.
- **The window and the resolution.** The Performance heading carries two
  selects, hyperweaver-ui's: the time window, 1, 5, 10, 15 and 30
  minutes and 1, 3, 6, 12 and 24 hours, 15 minutes by default, sent as
  `since`, the instant the window reaches back to; and the resolution,
  Real-time 125, High 38, Medium 13 and Low 5 samples, High by default,
  sent as `limit`. Both belong to the host and every chart of it reads
  over them; a change of either reads each drawn chart's history again
  once. A series keeps the 180 newest samples of each interface, pool
  or host, hyperweaver-ui's number.
- **The charts.** Every chart is the pages contract's one `Chart`, a
  smoothed line per series over a time axis, in hyperweaver-ui's order:
  the storage I/O, megabytes a second read, written and both a pool; the
  ZFS ARC, its size and its dashed target in gigabytes and its hit rate
  on a second axis of percent; the network, megabits a second received,
  sent and both an interface; the CPU, the overall use with the IO delay
  where a sample carries one, a line per core, and the three load
  averages on a second axis, hidden until asked for; the memory, used,
  free and, only where a sample carries it, cached, in gigabytes. A
  card's buttons show and hide the groups of its series, its expand
  button opens the chart in the expanded dialog with its legend and its
  zoom, the groups hidden in one hidden in the other, and the card
  folds, the fold kept under the page's `table_prefs_host`. The colours
  are the theme's tokens, every interface and pool a tone of its own,
  because hyperweaver-ui's written colours were one dark theme's and
  this build wears every theme in both modes.
- **One sample.** An agent that keeps no history answers the one sample
  it took, its `sampling.strategy` reading `realtime`; the chart draws
  that sample as a point, the line under it says the chart draws one
  sample and grows as samples arrive, and a later read or a pushed
  sample adds to what is held.
- **The bars.** The processor's bar is the newest CPU sample's
  `cpu_utilization_pct` where the host lists `monitoring`, and otherwise
  the share of the time between two readings of the host's stats that
  was not idle, the `user`, `nice`, `sys` and `idle` times of its `cpus`
  alone, hyperweaver-ui's rule, because on illumos the `irq` time
  overlaps them; until a second reading came the bar reads not
  available. The memory's bar is used of total, the ZFS ARC a second
  segment of the same bar held to the used amount, because the ARC is
  memory already counted as used. The swap's bar draws for a host that
  has swap.
- **The interfaces.** Every interface the agent answers is listed once,
  the newest row of each where the agent answers the rows of several
  scans, and the heading counts them in all, physical, virtual, up and
  down, the counts of hyperweaver-ui's network summary. hyperweaver-ui
  listed five and linked to its networking page for the rest; here the
  heading carries that link, View all, while the host's own row lists
  `vnics` or `network-spaces`: an in-router link to the networking of
  the host, `/hosts/{id}/networking` of the Networking page section.
- **View all.** The Machines heading carries View all, hyperweaver-ui's
  machine manager's link, while the host's own row lists `machines`: an
  in-router link to the machines of the host, `/hosts/{id}/machines` of
  the Machine page section.
- **The pages of a host.** A host's pages are one list, `HOST_PAGES` in
  `src/features/hosts/pages.js`, each entry its key, its route under
  `/hosts/{id}`, its glyph, the key of its label and its gate on the
  host's own row, checked strictly: Overview at `/hosts/{id}`, always;
  the machines at `/hosts/{id}/machines`, named by the noun the host's
  hypervisors fix, behind `machines`; Manage at `/hosts/{id}/manage`,
  behind any token of its sections, hyperweaver-ui's `MANAGE_FEATURES`
  (Manage page); Networking at `/hosts/{id}/networking`, behind `vnics`
  or `network-spaces`. Every
  door to a page reads that list and none decides a gate of its own, so
  a host that lacks a page's token draws no tab, no row and no
  right-click row for it. The doors are the tab row under the heading of
  a host's page, hyperweaver-ui's context tabs drawn by the pages
  contract's `TabStrip`, each tab a link, the tab of the current route
  active, nothing drawn for a host that offers the Overview alone; the
  rows of the host node's right-click menu in the sidebar's tree
  (Controls menu, The tree's menu), the tree itself listing no page row
  under a host, hyperweaver-ui's shape, a host's node folding to its
  machines and, on the server role, its Configuration files alone; and
  View host details, the first row of Host actions, hyperweaver-ui's
  row. View all on a panel of this page stays a door and is never the
  only one, because a panel is behind `monitoring` and a host that
  lists a page's token and no `monitoring` draws no panel to carry the
  link. hyperweaver-ui drew no tab for the machines, a page of its own
  there; the tab and the right-click row are asked for here, "as the
  row of tabs I guess, and whatever is needed for right click yes", and
  the tree keeps hyperweaver-ui's rows, so a page is one tab and one
  right-click row and never a third row that pushes a host's machines
  down its node. The tab row draws on this page and on the networking
  page; the machines of the host take it with the Machine page's slice.
  Devices and Storage, hyperweaver-ui's other tabs, are one entry of
  the list each and land with the round that ports the page; Agent
  settings, `/hosts/{id}/settings`, is one entry of the list, offered
  while the host's own row names a hypervisor, its fields, backups,
  restart and update read and sent as hyperweaver-ui's Settings tab
  read and sent them, its secrets tab behind `secrets`, its API keys
  tab, and its orchestration section the Manage page's own panel.
- **The create wizard.** hyperweaver-ui's machine manager drew New
  machine beside the machines; here the wizard opens over the host's
  page and over its machines page whenever the route carries the
  `create=machine` query and the person may create on a host whose own
  row lists `machines` and `machine-create`, the query's `box`,
  `box_version`, `box_arch` and `box_url`, BoxVault's deep link, seeding
  the box fields; on the home route the same query moves to the page of
  the first host that creates. The wizard is a form dialog of eight
  steps, General, OS / Box, System, Disks, CPU & Memory, Network,
  Provisioning and Confirm, Next the primary action until Confirm, where
  Create sends the one request, `POST machines`, and closes the dialog
  on a success, the held copies read again once and the task offered
  from the notice; a step that cannot be left says why over its fields;
  an agent short of resources leaves the dialog open with one line a
  resource. The steps a host draws are its platform's own. Its feeds are
  read once as the dialog opens, and the ones a step consumes again as
  the step is entered, never on a clock. On the server role the Box step
  browses BoxVault through the server's per-user proxy, refused for a
  session that is not federated, and the General step chooses the
  owning organization among the ones the person manages, sent as
  `org_uuid`. Closing the wizard takes the query out of the route. The
  machine manager's Start all and Stop all are the Controls menu's bulk
  rows on the host's route.

---

## Machine page

The machines of a host, `/hosts/{id}/machines`, and the page of one
machine, `/hosts/{id}/machines/{name}` with its Snapshots at
`/hosts/{id}/machines/{name}/snapshots` and its Provisioning at
`/hosts/{id}/machines/{name}/provisioning`: hyperweaver-ui's machine list
and the read surfaces of its machine overview, its Snapshots tab and its
Provisioning tab,
carried over in hyperweaver-ui's order, on the frames of the
[Universal Pages Contract](universal-pages/). A surface draws only
while the host's own row lists the token it is behind and the agent
answers what it draws, the registry row's `capabilities` on the
`hyperweaver-server` role and the agent's status on an agent role,
checked strictly. The page of a hyperweaver-agent machine and of a
zoneweaver-agent zone differ by what each agent answers, never by a test
of which agent it is: hyperweaver-agent puts `hypervisor`, `backing`,
`home` and `spec` on a machine's row and its devices in
`knob_current.devices`, zoneweaver-agent puts `brand` on a zone's row
and the zone's devices and specifications in `configuration`, and
nothing is renamed. Every read is sent at the path the role fixes
(`/api/agents/{id}/…` on the server role, `/api/…` on an agent role).

| Surface             | Frame                                                                                                                                                                                                                                                                     | Behind                                                                                                                                                                                                                                                 | Reads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machines of a host  | the page heading with its counts as chips, the tab row of the host's pages with Machines active under it, over the one table                                                                                                                                              | `machines`                                                                                                                                                                                                                                             | `GET machines`, the host's held rows: the name, the status and the sentence that says it, the server id, the provisioner, the roles, the system line, the hypervisor, the backing, the orphaned and auto-discovered flags and the tags, a column drawn only while a row carries its value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Row actions         | the table's Actions column                                                                                                                                                                                                                                                | `machines`, and the Controls menu's gates                                                                                                                                                                                                              | the machine's own row and the host's row: View, Power on, Pause, Suspend, Shutdown and Resume as buttons, Provision as a button while the host lists `provisioning` and the row names its provisioner, opening the Provisioning page with the provision in `run`, Restart, Run in guest, Set display size and Open in the row's menu, each gated as the Controls menu's row of the same name is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Settings            | the Settings page of the machine, the tabs of hyperweaver-ui's Settings tab over its editors, Apply and Reset under them                                                                                                                                                  | `machine-modify`, a person who may create machines                                                                                                                                                                                                     | the detail's `knob_current` over its `configuration` seeds every editor; `GET machines/defaults`, `GET machines/ostypes`, `GET artifacts/iso` and `GET provisioning/bridged-interfaces` once as the page draws, `GET storage/pools` behind `zfs` and `GET network/vnics` behind `vnics` on a host that names `bhyve`; writes `PUT machines/{name}` with the changed members alone, `DELETE` and `POST machines/{name}/pending-changes/apply`; the USB tab `GET system/usb` and `GET machines/{name}/usb/filters`, its writes `POST` and `DELETE machines/{name}/usb/filters`, `POST machines/{name}/usb/attach` and `detach`; Secure Boot `POST machines/{name}/nvram/secureboot`; a VNIC's link properties `GET` and `PUT network/vnics/{vnic}/properties`; the zvol manager `GET storage/dataset`, `PUT storage/dataset/properties` and `POST storage/dataset/snapshots`, each by `name`; a path field's Browse `GET filesystem` behind `file-browser`; Organization access on the server role `GET` and `PUT /api/servers/{id}/machines/{name}/orgs` with `GET /api/organizations` and `GET /api/userinfo/claims` |
| Machine information | a section card, record rows                                                                                                                                                                                                                                               | `hosts`, the detail's rows `machines`                                                                                                                                                                                                                  | `GET machines/{name}`, the machine's row and the host's stats: the name, the host, the state, the hypervisor, the backing and the project folder, when it was last seen, the guest's addresses, the flags, the facts of a zone; the host's health behind `monitoring`; the organizations on the server role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Console             | a section card under the machine information, hyperweaver-ui's console: the inactive display with one start button a console, the active display of the one started, its dialog, and its full-window page at `/hosts/{id}/machines/{name}/console/vnc` and `/console/rdp` | the host's row lists the console, `vnc`, `zlogin` and `rdp` in its `console` list and `ssh` among its features, checked strictly; every door to it, the hardware card's rows, the Controls menu, the list's row menu and the tree's menu, the same way | `GET machines/{name}/vnc/info` and `GET zlogin/sessions` as the card draws, on Refresh and never on a clock; VNC by `GET machines/{name}/vnc`, the display's own websockify, else `POST machines/{name}/vnc/start` and one read of `vnc/info`; zlogin `POST machines/{name}/zlogin/start` after the sessions the agent held are stopped; SSH `POST machines/{name}/ssh/start` with `ip_index`; RDP `GET machines/{name}/vnc` for the console target and nothing for the guest's; every socket with one `GET ws-ticket` bound to the machine; the launchers `POST machines/{name}/open-rdp`, `open-directory` and `open-ftp` on an agent role and `GET machines/{name}/rdp` and `ftp` on the server role; the `?console=` query of the machine route opens the console once and is dropped from the route                                                                                                                                                                                                                                                                                                             |
| Screen              | a section card                                                                                                                                                                                                                                                            | `machine-screenshot`, and the machine runs                                                                                                                                                                                                             | `GET machines/{name}/vnc/screenshot`, one PNG frame read as a blob                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Tags and notes      | a section card, a form                                                                                                                                                                                                                                                    | `machines`                                                                                                                                                                                                                                             | the detail's `machine_info.tags` and `machine_info.notes`; writes `PUT machines/{name}/tags` and `PUT machines/{name}/notes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Hardware            | a section card: record rows, the device tree and the NAT port forwards                                                                                                                                                                                                    | `machines`                                                                                                                                                                                                                                             | the detail: a zone's specifications and devices from `configuration` with the console port from `knob_current.consoleport` and `machine_info.vnc_port`, a hyperweaver-agent machine's devices from `knob_current.devices`, and the NAT port forwards from `configuration.nat_forwards`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Guest agent         | a section card, the network in a list dialog                                                                                                                                                                                                                              | the detail's `guest_info`; its requests `guest-agent`                                                                                                                                                                                                  | the detail's `configuration.guest_info`, `GET machines/{name}/guest/osinfo`, `GET machines/{name}/guest/network` on More; writes `POST machines/{name}/guest-agent/setup`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Guest information   | a section card, two folds                                                                                                                                                                                                                                                 | the host names `virtualbox`, the machine is not UTM                                                                                                                                                                                                    | `GET machines/{name}/guest-properties`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Charts of a zone    | a section card each: the processors, the memory, a volume, a link                                                                                                                                                                                                         | `monitoring`, the host names `bhyve`                                                                                                                                                                                                                   | `GET monitoring/zones/usage` and `GET monitoring/zones/diskio` with `zone`, and `GET monitoring/network/usage` with `link`, one read a link the zone's configuration names, each with `since` and `limit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Charts of a machine | a section card each: the processors, the memory, network, disk                                                                                                                                                                                                            | `monitoring`, `virtualbox`, it runs and is not UTM                                                                                                                                                                                                     | `GET monitoring/machines/usage` with `machine_name` and `limit` 1, the one sample the agent takes at the read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Retention policy    | a section card, a form, on the Snapshots page under its heading                                                                                                                                                                                                           | `machine-snapshots`, `machine-modify`, admin, not UTM                                                                                                                                                                                                  | the detail's `configuration.snapshots`; writes `PUT machines/{name}` with `snapshots`, the policy or null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Snapshots           | the Snapshots page of the machine, a glass section, the heading counting them over the one table                                                                                                                                                                          | `machine-snapshots`; every write an admin                                                                                                                                                                                                              | `GET machines/{name}/snapshots`; writes `POST machines/{name}/snapshots`, `PUT` and `DELETE machines/{name}/snapshots/{snapshot}`, `POST machines/{name}/snapshots/{snapshot}/restore` and, after it, `POST machines/{name}/start`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Holds               | a list dialog, the datasets of the snapshot each with its holds                                                                                                                                                                                                           | `machine-snapshots` and `zfs`; every role that reads the snapshots                                                                                                                                                                                     | `GET storage/snapshot/holds` with `name`, one read a dataset; writes `POST storage/snapshot/holds` with `tag` and `DELETE storage/snapshot/holds` with `tag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Templates           | a form dialog each, from a snapshot and from the Controls menu                                                                                                                                                                                                            | `templates`, an admin; the template of a snapshot on a host that lists `machine-snapshots` and `zfs` too                                                                                                                                               | `POST templates/export`, `POST templates/publish`, and `GET templates/sources` as the publish dialog opens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Clone               | a form dialog, from a row's menu, the Controls menu and the tree                                                                                                                                                                                                          | `machine-create`, an admin                                                                                                                                                                                                                             | `POST machines/{name}/clone`; the snapshots held once per machine, read as the dialog opens, where the host lists `machine-snapshots` and the machine is not UTM                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Import              | a form dialog, from the list's heading                                                                                                                                                                                                                                    | `machines`, the host names `virtualbox`, an admin                                                                                                                                                                                                      | `POST machines/import` with `path` and `name`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Provisioning status | the Provisioning page of the machine, a section card, record rows                                                                                                                                                                                                         | `provisioning`, the detail carries a provisioner document                                                                                                                                                                                              | the detail's `configuration.provisioner`, the provisioner it names, and `GET machines/{name}/provision/status`, `provisioning_status` in its tone with `last_provisioned_at`, the welcome page from the detail's `web_address`; the pipeline handed in `run`, `POST machines/{name}/provision` with `confirm_host_hooks` after the 409 that asks for it, `POST machines/{name}/sync` with `syncback`, `POST machines/{name}/run-provisioners`, one notice each with View task while the host lists `tasks`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Provisioning editor | the Provisioning page of the machine, a section card, the tabs Folders, Variables, Scripts, Playbooks, Roles, Hooks, Transport and Raw JSON                                                                                                                               | `machine-create`, an admin; the roles catalog `provisioner-registry`                                                                                                                                                                                   | the detail's `configuration.provisioner`, `GET provisioning/provisioners` and `GET provisioning/provisioners/{name}/versions/{version}` for the catalog of the attached package; writes `PUT machines/{name}` with `provisioner`, the whole document                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Hosts.yml           | a form dialog, from the Provisioning page's status card, over CodeMirror                                                                                                                                                                                                  | `machine-create`, an admin                                                                                                                                                                                                                             | `GET machines/{name}/hosts-yml`; writes `PUT machines/{name}/hosts-yml` with `yaml`, a 400 landing the cursor on the `line` and `column` it names, `warnings` listed in the dialog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

- **One copy per machine.** `GET machines/{name}` is held once per host
  and machine in the hosts feature's context, as a host's stats and its
  machine rows are: the first surface that draws the machine asks for
  it, a second while the request is in flight joins it, and every card
  of the page draws the held copy. The machines of a host are the rows
  the Controls menu and the tree already hold, `GET machines`, never a
  second copy.
- **Where the list draws.** The list has a route of its own,
  hyperweaver-ui's Machines page with no machine chosen, reached by
  View all on the host page and by its address, because the host page
  draws a host's machines by name from its stats and asks for no
  machine row while the choice is All organizations, and a list of the
  rows asks for them. The Controls menu on it is the host's, Host
  actions.
- **The organization filter.** The list draws the rows under the
  organization a person operates under, failing open, as every list of
  the hosts feature does; the machine a route names is found among every
  row the agent answered, whatever the choice. On the
  `hyperweaver-server` role the machine information names the
  organizations of the row's `org_uuids`, by the name of the person's
  membership and by the uuid otherwise; an agent served directly holds
  no organization layer and draws no such row.
- **One request, one notice.** A row's action is one request through
  the Controls menu's runner and one notice, the host's stats and its
  machine rows read again once after a success, and the machine's
  detail with them while it is held, whether the action came from the
  list's row, the Controls menu or the tree's menu, so the state the
  machine page draws follows the action. Save on the tags and
  notes sends the one request of each field that changed, an emptied
  field as null, and raises one notice; Set up channel is one request
  and one notice; after a success the held detail, and after a save the
  machine rows too, are read again once.
- **No timer.** A surface reads once as it draws, again when the event
  stream opens fresh or answers `reset`, on the page's Refresh, which
  reads again the list of servers, the host's stats, every answer held
  of the host, its health among them, its machine rows and the detail,
  on a card's own Refresh where it has one, the screen and the guest
  information, and after the person's own write. Between reads the
  machine rows and the details of a host are marked stale by the
  `hosts` topic's `stats-updated` event and a machine's detail by a
  `task-updated` event that carries a status a task of that machine
  ended in, and only the surfaces on screen read again. hyperweaver-ui
  read the list again two seconds after every action, the detail every
  thirty seconds and the screen every five minutes; none is carried
  over, because state moves on an event, a response or a person's
  action, never on a clock.
- **The detail that does not answer.** A machine whose detail the agent
  does not answer keeps its machine information, drawn from its row and
  the host's stats, under a line saying the details are not available;
  the cards that draw the detail are not drawn.
- **The machine a host does not have.** A route that names a machine
  neither the host's stats, its machine rows nor a detail names, once
  each has answered, draws the placard saying the host has no machine
  of that name, in place of every surface, hyperweaver-ui's not-found
  line; while the host's stats failed the page keeps its danger alert,
  because a host that cannot be reached says nothing of its machines.
- **The list's filters.** One filter group per enumerable column of the
  list: the status, the hypervisor, the backing, the roles, the flags
  and the tags, each drawn only while a row carries a value, the
  Columns group last.
- **The charts.** Every chart of a machine is the pages contract's one
  `Chart`, a card in the grid of the page's cards with its own Refresh,
  its expand button and its fold, its series held once per machine and
  read over the last fifteen minutes, hyperweaver-ui's window. A zone
  draws its share of the host's processors and its resident memory and
  swap from one read of its usage; the megabytes a second read and
  written of each volume, one card a volume and never summed, because
  the volumes of one machine may sit on different pools; and the
  megabits a second of each link its configuration names, one read a
  link, which grows by the `network-sample` event of the `monitoring`
  topic. A VirtualBox machine that runs draws the guest's and the
  monitor's share of the processors, the memory used and the megabytes
  a second over its adapters and over its disks from the one sample the
  agent takes at the read; while the guest additions do not answer the
  memory card says they are needed in the chart's place. A machine that
  is off and a machine on UTM are asked for no sample. hyperweaver-ui
  read each series every thirty seconds; here a series is read once as
  its card draws, on the page's Refresh, on the card's own and when the
  event stream opens fresh or answers `reset`.
- **The machine's pages.** A machine's pages are one list,
  `MACHINE_PAGES` in `src/features/hosts/machinePages.js`, each entry
  its key, its route under `/hosts/{id}/machines/{name}`, its glyph,
  the key of its label and its gate on the host's own row and the
  person's role, checked strictly: Overview at
  `/hosts/{id}/machines/{name}`, always, named by the noun the host's
  hypervisors fix; Settings behind `machine-modify` for a person who
  may create machines; Snapshots at
  `/hosts/{id}/machines/{name}/snapshots`, behind `machine-snapshots`;
  Provisioning at `/hosts/{id}/machines/{name}/provisioning`, always;
  an entry whose page does not exist is drawn
  nowhere. The door is the tab row under the heading of the machine's
  page, drawn by the pages contract's `TabStrip`, each tab a link, the
  tab of the current route active, nothing drawn for a machine that
  offers the Overview alone. The snapshots are a tab of the machine's
  page, with the retention policy under their heading, and draw on no
  other page; the Controls menu on every page of a machine is the
  machine's.
- **The provisioning.** The Provisioning page is hyperweaver-ui's
  Provisioning tab: the status card, the provisioner the document names,
  the pipeline's state and the welcome page, read once as the page draws
  while the host lists `provisioning` and the detail carries a document,
  and under it, for an admin on a host that lists `machine-create`, Edit
  Hosts.yml and the document editor, the tabs Folders, Variables,
  Scripts, Playbooks, Roles, Hooks, Transport and Raw JSON, keys no tab
  covers riding untouched, Store the one request with the whole document
  under `provisioner`, refused only for unapplied JSON and a name that
  would break the run. The pipeline rows of the Controls menu, the tree
  and the machines list open the page with their action in `run`, which
  the page sends once and consumes; a 200 no-op that skipped every
  playbook is one warning notice, the 409 host-hooks refusal asks the
  typed confirmation before the same request goes again with
  `confirm_host_hooks`, and a queued task's end on the `tasks` topic,
  the task dialog's close, the stream's fresh opening, its `reset` and a
  stored document read the status again; hyperweaver-ui read it two
  seconds after every action, which is not carried over.
- **The snapshots.** The snapshots are held once per machine and drawn
  in the agent's own order until a header sorts them, a column only
  while a row carries its value, because hyperweaver-agent answers the
  tree of VirtualBox, a name set in by its depth, and zoneweaver-agent
  the snapshots of the zone's datasets, and the two rows share the name
  and the description alone. A machine on UTM is asked for its
  snapshots while it is off alone, the agent refusing the list of one
  that runs, and draws no rename and no retention policy. Take, Edit,
  Make template and Publish are form dialogs; Restore, Restore and
  start and Delete wait behind the typed confirmation, the word typed
  restore or delete, the two restores held while the machine runs; on
  a host that lists `zfs` the restore's confirmation says that every
  snapshot taken after the one restored is destroyed, because that
  agent's restore is a rollback; each is one request and one notice,
  the held copies read again once and the task dialog opened on the
  task the agent queued while the host's own row lists `tasks`.
  Restore and start: where the host streams the `tasks` topic, `events`
  among its features and `tasks` among its `events.topics`, the start
  is sent when the `task-updated` event says the restore completed, the
  task read once as the restore is queued and again when the stream
  opens fresh or answers `reset`, and a restore that failed starts
  nothing; where the host streams no tasks, or the agent answers no
  task id, the person is told in a sticky notice that carries Power on;
  hyperweaver-ui read the task every two seconds until it ended. The
  holds are read once as their dialog opens, one read a dataset, a
  snapshot without a hold an empty list, a read that failed named by
  its dataset with the agent's message, again when a `task-updated`
  event says a task the dialog queued ended where the host streams
  tasks, and on the dialog's Refresh where it streams none; the holds
  and their writes are offered to every role that reads the snapshots,
  the agent's own key deciding; hyperweaver-ui waited two seconds and
  read. The retention policy is
  kept by the agent at once, with no task. hyperweaver-ui read the
  snapshots every thirty seconds; here they are read as the detail is.
- **Each agent's own shape.** Nothing of the two agents is merged or
  levelled: a row is read as its backend answers it and a request is
  sent as its backend reads it, told by the host's own row and the
  machine's own row, never by a test of which agent it is, and no
  agent is asked to rename a member. A clone names the snapshot a copy
  is made from as `snapshot_name` on a host that lists `zfs` and as
  `snapshot` on every other, and says `linked` in every body; a
  template of a snapshot, `snapshot_name` in the export and the
  publish, is offered on a host that lists `machine-snapshots` and
  `zfs`; a publish names the `architecture`; a task's machine is read
  as `machine_name` where a row carries it and as `zone_name` where it
  carries that.
- **What asks nothing.** Nothing of a machine is asked of a host whose
  own row does not list `machines`, the machine's row and its detail
  included; nor its charts of a host that lists no `monitoring`, its
  snapshots of one that lists no `machine-snapshots`, or the holds of
  one that lists no `zfs`.
- **New in the list's heading.** The machines list draws New first among
  its actions while the person may create machines and the host's own
  row lists `machines` and `machine-create`; it opens the host's page
  with the `create=machine` query, the create wizard's one door.
- **The settings.** The Settings page is hyperweaver-ui's Settings tab,
  its tabs the ones the host's hypervisors offer, General, Credentials,
  Storage and NICs on every host, the VirtualBox knob sections, Ports,
  USB and Advanced on a host that names `virtualbox`, Filesystems and
  Resources on one that names `bhyve`, and UTM alone beside General,
  Credentials and NICs of a machine on UTM; every editor seeds from
  `knob_current` over the configuration and Apply sends the changed
  members alone as one `PUT machines/{name}`, the modify wire of both
  agents. A body of the members an agent keeps at once applies while
  the machine runs; any other on a running machine asks, stop, apply
  and start, or apply at the next power cycle, which the agent answers
  as `pending_power_cycle` with the accrued set drawn over the form
  with Apply now, on a machine that is off, and Cancel. Stop, apply and
  start moves on what the host says and never on a clock: the stop is
  sent, the apply follows the `hosts` topic's `stats-updated` that no
  longer names the machine running, and the start follows the `tasks`
  topic's word that the modify task completed; a host that streams no
  `hosts` topic is told to apply once the machine is off. Every answer
  is one notice, a queued task carrying View task while the host lists
  `tasks`, a refusal for want of resources the agent's own issues over
  the form and no read again; after a success the machine's row, its
  detail and the host's stats are read again once and the form seeds
  itself again from what they answer. The zvol manager, the USB tab,
  Secure Boot and a VNIC's link properties each send their own request
  and raise their own notice, hyperweaver-ui's panels; the guest
  command dialog reads a command that outlives the wait on Check alone,
  never polling.
- **Rows that wait for their page.** The topology opens a page of
  hyperweaver-ui that a later round ports; it lands
  here with the round that ports what it opens. hyperweaver-ui's
  Machines page drew a card while no server was chosen; here the route
  names the host, and a registry without a server draws the hosts
  page's empty placard. The filesystem I/O chart of hyperweaver-ui's
  MachineNetworkCharts, a file no page of hyperweaver-ui drew, reads
  `vfs_read_bps` and `vfs_write_bps`, members no agent answers, and
  waits for an agent that does; its other charts are the zone's above.
  The browse button beside the path of an import, hyperweaver-ui's path
  picker behind `file-browser`, waits for the slice that ports the file
  browser; the path is typed until then.
- **What a sample carries.** A rate the agent answers as null adds no
  point; a chart of a link the agent answered no sample of draws
  nothing; a read of a series that failed says so under its chart with
  the agent's message. The window of a machine's charts is the fifteen
  minutes before the newest sample held, never the wall clock.

---

## Networking page

The networking of a host, `/hosts/{id}/networking`: hyperweaver-ui's
host networking page, its frame and its read surfaces, carried over in
hyperweaver-ui's order, on the frames of the
[Universal Pages Contract](universal-pages/). The page is behind `vnics`
or `network-spaces`, hyperweaver-ui's gate, read from the host's own
row, the registry row's `capabilities` on the `hyperweaver-server` role
and the agent's status on an agent role, checked strictly: a host whose
row lists neither draws no link to the page, and its route draws the
not-available stub with nothing asked of the host. A surface of the page
draws only while the host's own row lists every token its read is
behind, so a host that lists a token of the page and no `monitoring`
draws the frame and asks for none of the reads. Every read is sent at
the path the role fixes (`/api/agents/{id}/…` on the server role,
`/api/…` on an agent role).

| Surface            | Frame                                                                                                                                                          | Behind                      | Reads                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading            | the page heading, the host under it, the window, the resolution and Refresh in its actions, the tab row under it                                               | `vnics` or `network-spaces` | the host's own row and its stats                                                                                                                                                                                                                                                                                                                                                    |
| Network summary    | a section card, the first section of the page, five counts                                                                                                     | `monitoring`                | the interfaces of the row below: how many in all, physical, virtual, up and down, hyperweaver-ui's card; nothing draws while the host answered no interface                                                                                                                                                                                                                         |
| IP addresses       | a glass section that folds, the heading over the one table                                                                                                     | `monitoring`                | `GET monitoring/network/ipaddresses`: the interface, the address, the prefix, the version from `ip_version` and the state in its tone, the address and the prefix read as the row's backend answers them, `ip_address` and `prefix_length` where a row carries them and the two parts of `addr` otherwise                                                                           |
| Routing table      | a glass section that folds, the heading over the one table                                                                                                     | `monitoring` and `vnics`    | `GET monitoring/network/routes`: the interface, the destination and the gateway, then the members a route carries, the mask from `destination_mask`, the version from `ip_version`, the default from `is_default` and the flags from `flags`, each drawn only while a row carries its value                                                                                         |
| Network interfaces | a glass section that folds, the heading naming their count, a click on it dropping the sort, over the one table                                                | `monitoring`                | `GET monitoring/network/interfaces`, the copy the host page draws: the link, the class and the state in their tones, the speed, the MTU, the MAC address, the VLAN and the zone, every column after the state drawn only while a row carries its value                                                                                                                              |
| Bandwidth          | a glass section that folds, the heading a click on which drops the sort, over the one table                                                                    | `monitoring`                | the newest sample held of each interface of `GET monitoring/network/usage` with `per_interface`, the series the charts draw, the busiest first: the rate both ways in the tone of its size, the rate received and sent, the seconds the sample spans and the packets received and sent in them, the packets drawn only while a sample carries `ipackets_delta` and `opackets_delta` |
| Bandwidth charts   | one heading that folds them all, under it a section card each, under two headings                                                                              | `monitoring`                | the same series: three charts that draw every interface together, megabits a second received, sent and both, a line an interface, then one chart an interface, its three lines received, sent and both                                                                                                                                                                              |
| Network topology   | a glass section that folds, after the summary, hyperweaver-ui's header, chip bar, canvas, drill panel and legend                                               | `vnics` or `network-spaces` | the copies the page holds and, on a host that lists `network-spaces`, each machine's detail and `GET monitoring/machines/usage`; a staged rewire sends `PUT machines/{name}` behind `machine-modify`                                                                                                                                                                                |
| Management         | a glass section that folds each, under the charts, in hyperweaver-ui's order, every list the one table, every dialog the form dialog or the typed confirmation | the tokens of each read     | hyperweaver-ui's reads and writes at the agent's own path, the hostname, the hosts file, the DNS, the VNICs, the VLANs, the aggregates with the CDP service, the bridges, the etherstubs, the addresses and the network spaces                                                                                                                                                      |

- **One copy per host.** The interfaces and the network usage are the
  copies the host page draws, held once per host in the hosts feature's
  contexts, so a person who comes from the host page reads neither
  again; the IP addresses and the routing table are held the same way,
  the first surface that draws one asking for it and every other
  drawing the held copy.
- **No timer.** A surface reads once as it draws, again when the event
  stream opens fresh or answers `reset`, and on the page's Refresh,
  which reads again the list of servers, the host's stats, every answer
  held of the host and the history of every series drawn of it. Between
  reads the usage grows by the `network-sample` event of the
  `monitoring` topic of the
  [Universal Events Contract](universal-events/), and the bandwidth
  table and the charts follow it. hyperweaver-ui's refresh interval
  select, one second to five minutes, its Auto and Manual button and
  the timer behind them, which read every table again every five
  minutes until a person chose otherwise, are not carried over, because
  state moves on an event, a response or a person's action, never on a
  clock.
- **The window and the resolution.** The page's heading carries the two
  selects of the Host overview section, the time window and the
  resolution, before Refresh, where hyperweaver-ui's networking header
  carried them, while the host's own row lists `monitoring`; both
  belong to the host, so a choice made on one page stands on the other,
  and a change of either reads the usage again once.
- **The summary.** The network summary is hyperweaver-ui's card, the
  first section of the page: its glyph and title, its chevron and its
  five counts, each a pair of badges, the interfaces in all, the
  physical ones, the virtual ones, the ones up and the ones down. The
  counts are the card's alone here, so the heading of the interfaces
  names their count in its title, as hyperweaver-ui's did, and repeats
  none of the five.
- **The folds.** Every section of the page folds by the chevron of its
  heading, as hyperweaver-ui's did, the tooltip saying expand or
  collapse in hyperweaver-ui's words: the summary, the topology, each
  of the four tables, the charts as one, each chart's card and each
  section of the management. The folds are kept together as `folds` of
  `table_prefs_networking`, under `summary`, `topology`, `addresses`,
  `routes`, `interfaces`, `bandwidth`, `charts`, `chart-` with the
  chart's key and `manage-` with the section's key, so a fold holds
  over a reload. A
  folded table draws its heading alone, a glass section's heading
  folding as the pages contract's `SectionHeading` says, and its rows
  still count in the search.
- **The sort.** Every header of every table sorts as the headers of the
  one table do. Until a person sorts, the addresses and the routes draw
  by interface, and the interfaces by link and the bandwidth the
  busiest first, hyperweaver-ui's two orders. The headings of the
  interfaces and of
  the bandwidth are hyperweaver-ui's buttons: a click drops the sort a
  person chose, so the table draws in its own order again, the tooltip
  saying so, and the glyph of a sort by several columns draws after the
  title while the sort holds more than one.
- **The bandwidth.** hyperweaver-ui asked for the newest sample of each
  interface with a request of its own beside the history the charts
  read; here the table draws the newest sample held of each interface
  of the one series, because two requests for one answer are one too
  many.
- **The charts.** Every chart is the pages contract's one `Chart`. One
  heading stands over all of them, hyperweaver-ui's: its select orders
  the charts of the interfaces, hyperweaver-ui's four, by bandwidth,
  the busiest first by the newest sample, by name, or by the rate
  received or sent, the order the page's own and kept while the page is
  drawn, and its chevron folds the charts as one. Under it the three
  charts of every interface together stand under their heading and the
  charts of the interfaces under theirs, each titled by the interface's
  own name. A card's expand button opens the chart in the expanded
  dialog with its legend and its zoom, and the card folds. The colours
  are the theme's tokens, every interface a tone of its own.
- **One search.** The page publishes one binding over every table it
  draws, the four read tables and the management's lists: the query
  narrows every table at once, the counts are the rows of them all, and
  each table publishes its own groups, named by the table: the version
  and the state of an address, the version and the flags of a route,
  the class and the state of an interface, the type, the version and
  the state of a managed address, the link, the zone and the state of a
  VNIC, the link and the state of a VLAN, the state and the policy of
  an aggregate, the type of a space, and one Columns group a table, the
  one `columnsGroup` of `useDetailSearch` every detail table publishes.
  Each table keeps its sort, its hidden columns and its widths under
  `table_prefs_networking_` and its own key, `addresses`, `routes`,
  `interfaces`, `bandwidth`, `managedAddresses`, `vnics`, `vlans`,
  `etherstubs`, `bridges`, `aggregates` or `spaces`.
- **What each agent answers.** The page of a hyperweaver-agent host and
  of a zoneweaver-agent host differ by what each agent answers, never
  by a test of which agent it is, and a row is read as its backend
  answers it: where the two name a member differently the page reads
  the member the row carries, and nothing is asked of either to rename
  one. zoneweaver-agent answers the rows of several scans and the
  newest of each is drawn; hyperweaver-agent answers the live rows, two
  addresses of one interface and version under one address object, and
  each is drawn. zoneweaver-agent answers an address as `ip_address`,
  its prefix as `prefix_length` and the two in one as `addr`;
  hyperweaver-agent answers `addr`. The table draws the address and the
  prefix on both, `ip_address` and `prefix_length` where a row carries
  them and otherwise the part of `addr` before its slash and the part
  after it, an `addr` without a slash drawn whole as the address, and
  the search finds an address on both. The routes, the speed and the
  zone draw where zoneweaver-agent answers them, the MAC address where
  hyperweaver-agent does, and the packets where a sample carries the
  deltas.
- **The routing table's columns.** hyperweaver-ui drew five columns,
  the interface, the destination, the gateway, Metric and Type. The
  first three are carried with its not available word for a member a
  route does not carry. Metric and Type are the two columns whose cells
  hyperweaver-ui filled with fixed words, the not available word under
  Metric and Static under Type on every route, with no answer behind
  them; they are not drawn until a backend answers a route's metric and
  its type. After the three draw the members a route really carries,
  the mask of its destination, its version, whether it is the default
  route and its flags.
- **The routing table's token.** No token names the routing table.
  zoneweaver-agent serves `GET monitoring/network/routes` and
  hyperweaver-agent serves no such route, so the read is behind
  `monitoring` and `vnics`, the tokens the agent that serves it lists,
  and a token of its own is asked of the backend that serves the
  route, as decision 7 asks.
- **The zone.** The zone of an interface is hyperweaver-ui's button, an
  in-router link to the machine of that name,
  `/hosts/{id}/machines/{name}` of the Machine page section, while the
  host's own row lists `machines`, and plain text on a host whose row
  does not; an interface of the global zone reads Global.
- **Where the page is reached.** By every door of the Host overview
  section's pages of a host, the tab row and the row of the host node's
  right-click menu in the tree, by View all on the host page's network
  interfaces, and by its address. The
  Controls menu on it is the host's, Host actions.
- **The host the list does not hold.** A route that names an id the
  list of servers does not hold draws what the host page draws for it:
  the heading with the id, or the hostname where the stats answered,
  and the danger alert when the host's stats failed, never the
  not-available stub, because a token is read from a row and that id
  has none.
- **The management.** Each section draws while the host's own row
  lists one of the tokens its read names, every write is one request
  through the one runner and one notice, and a queued write's end on
  the `tasks` topic marks the page's networking answers stale so the
  sections on screen read again, never on a clock.
- **The topology.** The topology's structure is the copies the page
  already holds and its motion the newest sample of the host's network
  series, so hyperweaver-ui's structure timer and usage poll are not
  carried over.

---

## Manage page

The Manage page of a host, `/hosts/{id}/manage`: hyperweaver-ui's host
manage page, its frame and its system group, carried over in
hyperweaver-ui's order, on the frames of the
[Universal Pages Contract](universal-pages/). The page is for an admin
alone, hyperweaver-ui's gate, the danger alert for every other role, and
behind any token of its sections, hyperweaver-ui's `MANAGE_FEATURES`
(`services`, `vnics`, `packages`, `boot-environments`, `zfs`,
`time-sync`, `processes`, `fault-management`, `file-browser`,
`system-users`, `provisioner-registry`, `templates`, `machines` and
`provisioning`), read from the host's own row, checked strictly: a host
whose row lists none draws no door to the page and its route draws the
not-available stub with nothing asked of the host. Every tab of
hyperweaver-ui's page is one folding glass section here, in its order,
gated as hyperweaver-ui gated the tab, its sentence about the host under
its heading; a section whose sub-stage has not landed draws its heading
and its sentence alone. Every read is sent at the path the role fixes.

| Section              | Behind                                 | Body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Services             | `services`                             | `GET services` with `pattern`, `zone` and `all` over the one table: the service, the FMRI, the state and the start time; Enable, Disable, Restart and Refresh by the state through `POST services/action`; View details `GET services/{fmri}` and View properties `GET services/{fmri}/properties` in list dialogs, the properties never of a legacy run                                                                                                                                                                                                                                                                                                                            |
| Network              | `vnics` or `hosts-file`                | the heading and the sentence; the networking writes land with their slice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Packages             | `packages`                             | the heading and the sentence; the packages land with their sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| System updates       | `packages`                             | `GET system/updates/check` in the structured format, the disk space warning its output names, `GET system/updates/history` over the one table, Refresh metadata `POST system/updates/refresh` and Install updates `POST system/updates/install` behind the typed confirmation, each a queued task followed on `task-updated`                                                                                                                                                                                                                                                                                                                                                        |
| Boot environments    | `boot-environments`                    | the heading and the sentence; the boot environments land with their sub-stage, their confirmation dialog already in our shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Storage              | `zfs`                                  | the heading and the sentence; the storage lands with its own page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Time and NTP         | `time-sync`                            | three tabs on the one tab strip: the status of `GET system/time-sync/status`, the peers over the one table, Force sync now `POST system/time-sync/sync`, Restart service `POST services/action` on the FMRI the status names and the systems of `GET system/time-sync/available-systems` with their switch `POST system/time-sync/switch`; the configuration of `GET system/time-sync/config`, its template, its servers, its editor and Save `PUT system/time-sync/config`; the time zone of `GET system/timezone` and `GET system/timezones` with Change `PUT system/timezone`; every write behind the typed confirmation                                                         |
| Processes            | `processes`                            | `GET system/processes` with `limit` 5000, `command`, `zone`, `user` and `detailed` over the one table; View details `GET system/processes/{pid}` with its files, limits and stack read as their tab opens; Send signal `POST system/processes/{pid}/signal`, the signals TERM and KILL alone on a Windows host; Kill `POST system/processes/{pid}/kill` with `force`; Batch kill in the heading, `POST system/processes/batch-kill`                                                                                                                                                                                                                                                 |
| Fault management     | `fault-management`                     | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| File manager         | `file-browser`                         | the heading and the sentence; the file manager mounts here with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Users and groups     | `system-users`                         | four tabs on the one tab strip: the users of `GET system/users`, Create `POST system/users`, Edit `PUT system/users/{name}` with the changed members alone after `GET system/users/{name}/attributes`, Set password `POST system/users/{name}/password`, Lock `POST system/users/{name}/lock` and Delete `DELETE system/users/{name}` behind the typed confirmation; the groups of `GET system/groups`, Create `POST system/groups` and Delete `DELETE system/groups/{name}`; the roles of `GET system/roles`, Create `POST system/roles` and Delete `DELETE system/roles/{name}`; the RBAC discovery, `GET system/rbac/authorizations`, `profiles` and `roles`, each row with Copy |
| Provisioners         | `provisioner-registry`                 | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Provisioning network | `provisioning`                         | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Recipes              | `provisioning`, the host names `bhyve` | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Templates            | `templates`                            | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Orchestration        | `machines`                             | `GET machines/orchestration/status`, Enable `POST machines/orchestration/enable` behind the typed confirmation and Disable `POST machines/orchestration/disable`, the strategy written into `PUT settings` as the whole `machines` object read from `GET settings`, Preview shutdown plan `POST machines/orchestration/test`, and the boot order of `GET machines/priorities`, rows dragged into order and applied, and each row's own priority saved, through `PUT machines/{name}` with `boot_priority`                                                                                                                                                                           |
| Runlevel             | `host-power`                           | the calls hyperweaver-ui carried with no view: `GET system/host/runlevel`, Change runlevel `POST system/host/runlevel`, Single-user `POST system/host/single-user` and Multi-user `POST system/host/multi-user` with `network_services`, each a queued task behind the typed confirmation                                                                                                                                                                                                                                                                                                                                                                                           |
| Installer files      | `artifacts` and `provisioner-registry` | the heading and the sentence; the artifact storage mounts here with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Database             | none                                   | the heading and the sentence; lands with its sub-stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

- **One search.** The page publishes one binding over the ten tables of
  the system group, the services, the processes, the users, the groups,
  the roles, the three RBAC lists, the time peers and the update
  history: the query narrows every table at once, in place of the
  pattern box hyperweaver-ui debounced into each request, and each
  table publishes hyperweaver-ui's request filters as groups of the
  panel, the zone and the disabled services of the services, the zone,
  the user and the detail of the processes, the system accounts and the
  limit of the users and the groups, the limit of the roles, the
  authorizations and the profiles, a change sending that table's request
  again, then one filter group per enumerable column and its Columns
  group, each named by its table. Each table keeps its sort, its hidden
  columns and its widths under `table_prefs_manage_` and its key.
- **One request, one notice.** Every write is one request through the
  page's one sender and one notice, the success card naming what was
  done or the danger card carrying the agent's message; an answer that
  names a task carries View task while the host's own row lists `tasks`,
  and where the host streams the `tasks` topic the section reads again
  when `task-updated` says that task ended, hyperweaver-ui's polling of
  `GET tasks/{id}` after a user, group or role write not carried over.
  Every dialog is the pages contract's form dialog or its typed
  confirmation, hyperweaver-ui's `FormModal` and `ConfirmModal` and its
  NTP and boot environment confirmations each over one of the two.
- **No timer.** A read is sent once as its section draws, again when the
  event stream opens fresh or answers `reset`, and on the page's
  Refresh, which reads again the list of servers, the host's stats and
  every read of the page and its sections through one count the page
  provides; hyperweaver-ui's reads two seconds after every write, its
  polling of a task and its debounced pattern boxes are not carried
  over.
- **The folds.** Every section folds by the chevron of its heading, the
  folds kept as `folds` of `table_prefs_manage` under the section's
  key, so a fold holds over a reload.
- **Each agent's own shape.** A row is read as its backend answers it:
  zoneweaver-agent's processes carry `zone`, hyperweaver-agent's do not
  and the column draws only while a row carries one; the zone filters
  of the services and the processes draw over the host's held machine
  rows on a host that lists `machines`, the processes' on a host that
  names `bhyve` alone.
- **Where the page is reached.** By every door of the Host overview
  section's pages of a host and by its address; the Controls menu on it
  is the host's, Host actions; the Manage host row of the Controls menu
  waits on the round that adds it.
- **The host the list does not hold.** A route that names an id the
  list of servers does not hold draws what the host page draws for it.

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

| Path                                                                           | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/index.jsx`                                                            | The one entry: `probeStatus` against the serving origin, `initRuntime(status)`, `configureLogger`, `createI18n`, then `AppProvider` and `App`; a failed probe draws the pages contract's backend-unreachable state, whose Retry probes again and boots the app when the status answers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/app/App.jsx`                                                              | `useSession` over the session `status.auth` picked, the mode, the theme and the favicon, the setup gate while the UI backend advertises `setup`, the avatar, the ticket link, the notification adapters, and the menu rows the UI backend's `features` unlock, all handed to `AppShell`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/app/router.jsx`                                                           | Every route: the collection routes from the registry in `status.collections` order and each feature route gated by `hasFeature` or the first `auth` token, `NotAvailableStub` for a route the UI backend lacks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/app/provider.jsx`, `src/app/callback.jsx`                                 | The providers the app renders through; the `/callback/` entry of an `idp` UI backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/components/layout/`                                                       | The chrome: `AppShell.jsx`, `Sidebar.jsx`, `Header.jsx`, `Breadcrumbs.jsx`, `Search.jsx`, `SearchPanel.jsx`, `UserMenu.jsx` with `IdentityCard.jsx`, `LogoutItem.jsx`, `FavoriteApps.jsx` and `NotificationsItem.jsx`, the three modals `LanguageModal.jsx`, `OrgSwitcherModal.jsx` and `NotificationsModal.jsx`, `Notices.jsx` and `Footer.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/components/common/`                                                       | `Avatar.jsx`, `BrandLogo.jsx` (the `status.brand.logo_url` mark, the file painting its own light and dark mode), `ErrorBoundary.jsx`, `NotAvailableStub.jsx`, `ConfirmModal.jsx`, `PageHeader.jsx` and the other pieces every feature draws                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/contexts/StatusContext.jsx`                                               | `probeStatus`, `StatusProvider`, `useStatus` and `statusShape`: the payload every shell reads its brand, links and version from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/utils/capabilities.js`                                                    | `hasFeature` (a UI backend whose `features` is not an array renders everything), `hasFeatureStrict`, `hasCollection`, `authMethod`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/lib/`                                                                     | `createSession.js` (the provider and return-path helper for the first `auth` token), `runtime.js` (`initRuntime`: the bus, the session, the API client at the serving origin and the hub client), `apiClient.js`, `backendSession.js`, `browserOidc.js`, `cookieSession.js`, `i18n.js`, `logger.js`, `events.js`, `returnTo.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/features/collections/registry.js`                                         | `collectionsFor(status)`: the `boxes`, `isos` and `provisioners` definitions in the UI backend's order, the watch calls dropped when the UI backend lacks `watches`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/features/notifications/`                                                  | The hub inbox client and the browser push subscription behind the Notifications modal, based where the hub answers for the UI backend (the identity provider itself for an `idp` UI backend, the app's own proxying backend otherwise)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/css/styles.css`, `src/css/fonts.css`, `index.html`, `callback/index.html` | The one stylesheet, the faces, the entry with the pre-paint script, and the callback entry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `public/locales/<lang>/shared.json`, `auth.json`                               | The two namespaces, every key of every UI backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `public/brand/`                                                                | The one home of every mark the estate owns, one folder per brand or product (`startcloud`, `prominic`, `moonshinedev`, `nomadservices`, `switchboard`, `boxvault`, `vdi-health`, `hyperweaver`), each holding `mark.svg` (512 square), `logo.svg` (the wordmark) and `header.svg` (4608 by 512, the wordmark centred, for a README) painted through `light-dark()`, beside the rasters rendered from them and named after them, `mark-64.png`, `mark-192.png`, `mark-512.png`, `favicon.ico` and `logo.png`, as the branding contract's file table fixes; a UI backend names one in `brand.logo_url`, a pack in its `logo`, and a sign-in provider of our own in its `icon_url`; `public/brand/providers/` holds only marks that are not ours (google, github, microsoft) and `public/brand/vendors/` the product vendors' |

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
built artifact never fetch it and never contain it, because an artifact
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
routes first, the SPA fallback last. The files Vite creates are never
hashed: every entry, chunk, stylesheet and asset keeps its fixed name
(`assets/<name>.js`, `assets/<name>.css`), and no build step, plugin,
server or contract may add a content hash to a file name, ever, and no
query string ever carries a version or a hash either; caching
is the server's job through `no-cache` and an ETag per file. So nothing
under the served folder is immutable: every UI backend serves every file
in it, `/assets/` included, `Cache-Control: no-cache` with an ETag, a
conditional request per file and the bytes only when they changed, never
`immutable`, and `index.html` and `/` `no-store`, because a fixed name
cached for a year pins one deploy's chunk against another's, and a lazy
chunk fetched fresh then binds to the wrong export table. A UI backend
that serves more than one hostname stamps `index.html` per host as it
serves it, the way the identity provider does and the branding contract
fixes, a direct `/index.html` refused so the stamped page is the only
one; BoxVault is the second such backend. The build ships `/manifest.json`,
the web app manifest naming STARTcloud and the marks under
`/brand/startcloud/`, and `index.html` links it beside the
`apple-touch-icon` and the `favicon.ico` link that stands in for the SVG
favicon where a browser takes none; a UI backend that serves more than
one hostname answers `/manifest.json` per host the same way it stamps
`index.html`, `name` and `short_name` from `brand.name`, the icons from
that host's `/brand/<name>/mark.svg`, `mark-192.png` and `mark-512.png`,
and stamps the `apple-touch-icon` and `favicon.ico` links to match, so an
installed downloads.prominic.net is Prominic on the home screen and never
STARTcloud; a UI backend on one hostname serves the file as built.
hyperweaver-ui is served at `/ui/`
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
    "logo_url": "/brand/boxvault/mark.svg",
    "repo": "https://github.com/Makr91/BoxVault"
  },
  "auth": ["backend"],
  "collections": ["boxes", "isos", "downloads"],
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
  "links": {
    "docs": "/docs",
    "contact": "",
    "api": "",
    "community": [{ "label": "Sponsor BoxVault", "url": "https://github.com/sponsors/Makr91" }]
  },
  "ticket": null
}
```

| Field             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`, `version` | The app name and the UI backend's released version; the version is the footer's and the About page's. `role` is the package name the UI backend installs as (`boxvault`, `hyperweaver-server`, `hyperweaver-agent`, `zoneweaver-agent`), the shared admin page building its update command from it, and on the hyperweaver family it is the one member that tells the two serving modes apart: a `hyperweaver-server` role serves the aggregated view, every agent addressed as `/api/agents/{id}/{path}` with `{id}` the server's registry id for that agent, and a `hyperweaver-agent` or `zoneweaver-agent` role serves the direct view, the one agent that served the page addressed at its own `/api/{path}`; the same feature reads the same tokens from the agent's own `features` either way, the mode never a token and never a second probe, because the origin that served the page already says which it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `brand`           | `name` (the app section's header and the footer's name), `logo_url` (a path the UI backend serves, the brand mark, the org mark and the favicon), `repo` (the About page's repository link), optionally `theme`, `{ name, css }`, the host's own theme, the pack the shell stamps as `data-brand` and links as its stylesheet, per the [branding contract](preferences-and-branding/); absent means the default theme, `startcloud`; no mode member of any kind, a host naming no mode, the mode being the person's and the operating system's until they choose; optionally `themes`, `[{ name, css, label }]`, the themes a person may choose on this host in the host's order, each `css` the stylesheet URL on the serving origin as `theme.css` is, the shell completing every row by name from the build's own `public/themes/themes.json` (the manifest the generator writes from every pack's YAML: `label`, `description`, `brand` and `logo`) before it boots, so a host names which themes it offers and the pack supplies its own words and mark, the shell drawing its Theme picker from that completed list alone and the person's choice persisting as the `theme` preference; absent means every theme of the build is offered in the manifest's order, an empty list none, and a list exactly those, so a host exposes everything by default and a site exposes only what its key lists |
| `auth`            | Session methods, the first entry wins: `backend` is the app's own backend session (`createBackendSession`), `idp` the browser as the OIDC public client (`createBrowserOidc`), `cookie` the identity provider's own session on its own origin (`createCookieSession`, the [Universal Identity Contract](universal-identity/))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `analytics`       | Optional: `{ script_url, attribute, value }`; the shell appends the script tag with that data attribute, so a UI backend with a static `index.html` keeps its Plausible or Umami tag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `idp`             | Present only when `auth` contains `idp`: `issuer`, `client_id`, `scopes`, `storage_prefix`, all required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `collections`     | The collection registry entries to mount, in order; each definition carries its own hard-coded route segment; data, never a gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `organization`    | Optional: the name of the one organization a host serves, a face such as BoxVault's downloads site whose brand is that organization; the crumbs leave out that organization's crumb, the brand link before it already naming it, and every other route draws as on a host of many; absent on a host that serves several                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `sorts`           | Optional: a map of collection key to level (`items`, `versions`, `providers`, `architectures`) to a sort stack `[{ column, direction }]` naming a column key of that level's table and `asc` or `desc`, the order that level's table opens on for that host while the viewer has saved none, standing before the UI's own default; answered per site, absent on a host without one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `features`        | The gate: absence hides the surface; a UI backend with no `features` array at all renders everything                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `links`           | `docs` and `contact`: the Docs and Contact rows of the app section signed in, each absent while empty; optionally `api`, a URL or a path on the serving origin where the UI backend answers its API reference, the API reference row of the app section signed in, the last row of the section, after Docs, opened in a new tab, absent while the member is empty or absent, because a destination written into the page is a fork per app and the one build serves every app; on the `hyperweaver-server` role that lists `hosts` the row reads Server API and, on a host's route, `/hosts/{id}` and below, a second row, Agent API, draws after it, the reference of the host the route names, which the server relays at `/agent/api-docs?server={id}`, as hyperweaver-ui's menu drew the two; none of the three draws in the signed-out cluster; optionally `community`, a list of `{ label, url }` the host answers per site, each one community or support link the About page draws after its repo, changelog and contact links in the host's order (a sponsorship page, a maintainer profile, a forum), `label` the host's own text drawn as it is and never translated, like `brand.name`, and `url` an `https:` URL; the UI drops an entry whose `url` is not `https:` or whose `label` or `url` is not a string, draws nothing for a member that is not a list, and nothing throws            |
| `ticket`          | `{ base_url, req_type, fallback_customer_id }` for a UI backend with no config route; `null` when the UI backend serves them at `/api/config/ticket`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `events`          | Present only with the `events` token: `{ path, topics }`, the one stream of the [Universal Events Contract](universal-events/) and every topic the UI backend can stream; the runtime opens it once per tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `config`          | The config file names the admin page draws one file per route for, each file a child node of the Configuration tree in the sidebar, served at `/api/config/<name>` (`["app"]` on the VDI Health Monitor; absent means `["app"]`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

A UI backend that answers on more than one hostname answers `/api/status`
per Host header: `brand`, `collections` and its order, `organization`,
`features` and `sorts` may
differ by hostname, nothing else, so one instance wears two faces from one
build, the first collection of each face owning that face's root; BoxVault
takes the map from its app configuration, one entry per hostname, the
unnamed hostname answering as today, and the identity provider from its
sites. In BoxVault's map a site entry without a `features` list answers
the defaults, and a site entry with one answers exactly the tokens it
lists. This is an option a UI backend takes by serving several hostnames,
never a rule every UI backend meets, and the estate already carries it:
the identity provider answers per site today and BoxVault joins it with
its downloads; a UI backend on one hostname answers one payload and is
conformant as it is, so no checklist line records it.

The feature tokens and the surface each unlocks:

| Token                                                                                                                        | Surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local-accounts`                                                                                                             | the `/register` form and the profile page's password, email and delete-account sections (the routes themselves follow the `backend` or `cookie` auth token); on the identity provider it is per site, present while the site allows self-registration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `setup`                                                                                                                      | `/setup` and the setup gate before any other route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `admin`                                                                                                                      | `/admin` and the Admin menu row (still needs `ROLE_ADMIN`); on a `cookie` UI backend the row is absent because the sidebar carries the operator's pages; on a UI backend that mounts a collection without listing `browse`, the column's Browse group for a `ROLE_ADMIN` account alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `org-console`                                                                                                                | `/org-console` and its menu row (still needs org OWNER/ADMIN on a `backend` UI backend; on the identity provider any member opens the console and the record's own flags gate its controls)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `discover`                                                                                                                   | `/organizations/discover` and the cluster's Discover, the compass icon in both states, after the search control signed in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `invitations`                                                                                                                | the Invitations tab in the org console                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `uploads`                                                                                                                    | ISO upload zone, box file upload, the upload slots                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `private-catalogs`                                                                                                           | fetch `/api/private/<uuid>/...` per membership, the access-denied banner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `watches`                                                                                                                    | watch stars and the Watched filter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `deploy`                                                                                                                     | the Deploy glyph, the table's Deploy column, the card's glyph and the item page's link (still needs the hyperweaver entitlement and a configured URL)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `rebuild`                                                                                                                    | the Rebuild catalog data menu row (still needs `ROLE_ADMIN`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `favorites`                                                                                                                  | the Add to Favorites toggle on About, over `GET` and `PUT /api/user/favorites` through the hub client, the app's own origin on a `backend` UI backend and the identity provider with the user's token on an `idp` or `cookie` one, the same client the user menu reads: the toggle reads the list, adds or removes the session's `clientId` (the ID token's `aud`, the session contract's state row, never a role word) and writes the whole ordered list back as `[{ client_id, custom_label, order }]`, `snake_case` as the identity contract's route fixes it; the toggle is absent while the session names no client; no `/api/favorites` route exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `notifications`                                                                                                              | the Notifications menu row (still needs the `notifications:read` scope, or the `cookie` auth token)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `health`                                                                                                                     | the footer health heart from `/api/health`, drawn only while `footer` is listed too; a UI backend without `footer` draws no footer at all, one with `footer` and no `health` draws the footer without the heart, and the heart's state arrives on the events stream where the UI backend advertises `events`, and where it does not the footer reads `/api/health` once as it draws and again when the person opens the heart, never on a timer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `sidebar`                                                                                                                    | the sidebar column: every sidebar group and tree the mounted features export and the badges; without it no column and the brand stays in the header                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `browse`                                                                                                                     | the catalog feature's Browse group for every visitor of a UI backend that mounts a collection; without it the group draws for a `ROLE_ADMIN` account alone while `admin` is listed, and for nobody otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `search`                                                                                                                     | the backend supports being searched: the navbar search control, its panel and `/search`, every query to the host's `GET /api/search`; without it none of them draw, `/search` is the not-available stub and there is no client-side search                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `events`                                                                                                                     | the one event stream at `events.path` of the [Universal Events Contract](universal-events/), opened once per tab by the runtime with every topic in `events.topics`, pages subscribing to its events by name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `fleet`                                                                                                                      | the home route is the fleet page and `/vm/{instance_id}` the per-VM page of the [Universal Pages Contract](universal-pages/#fleet-pages), over `/api/vdi/*` and the `fleet` topic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `hosts`                                                                                                                      | the Hosts group of the sidebar, hyperweaver-ui's tree in its two modes: on the hyperweaver-server role the Datacenter root at /, hyperweaver-ui's root that is the Dashboard, named by the status's `datacenter_label` or the default word, always open over one node per agent of GET /api/servers, and on an agent role the Dashboard row at / above the one serving agent's node, always open; a host's node without a status dot, its machines under it from its stats with their dots and, on the server role, one Configuration node folding to one node per name of the row's `capabilities.config`, labelled by the file's schema `title`, each opening `/hosts/{id}/settings/<name>`, the host's pages no rows of the tree but the tab row of its page and the rows of its node's right-click menu; and the pages at /, /hosts/{id}, /hosts/{id}/machines, /hosts/{id}/machines/{name}, /hosts/{id}/machines/{name}/snapshots, /hosts/{id}/networking and `/hosts/{id}/settings/<name>`, every agent read addressed as the role row of the status table fixes; the registry is asked for once and held for every surface that draws it, the tree, the pages, the Controls menu and the footer's focus, because "generally we should query a host ONLY when we need to, if we have it, and can cascade that information in some way that is best", a host's stats held the same way, one copy per host for its page, the Controls menu and the tree, so the read after an action renews what a page draws, and each page carries Refresh in its heading's actions, reading the registry and the host's stats again, the "just in case" read a person asks for, never a timer; checked strictly, because the pages fire agent requests |
| `footer`                                                                                                                     | the footer row of the Footer status section; a UI backend that lists it draws the footer, one that omits it draws none, and a UI backend with no `features` array renders everything, the footer included                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tasks`                                                                                                                      | the footer's Tasks toggle, its Refresh, priority filter and Columns picker and the tasks pane of the Footer status section, over the host's `GET /api/tasks`; read from the host in focus, the agent's own list on an agent role and the registry row's on the `hyperweaver-server` role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `host-terminal`                                                                                                              | the footer's Shell toggle and the shell pane, over the host's `POST /api/term/start` and its `/term/{id}` WebSocket; read from the host in focus as `tasks` is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `machines`, `host-power`, `host-fast-reboot`, `machine-suspend`, `machine-resume-suspended`, `guest-agent`, `host-launchers` | a host's own tokens, read from its row and never from the UI backend's status, each gating rows of the Controls menu: `machines` the host's machines in the tree and the bulk rows, `host-power` Restart host and Power off host, `host-fast-reboot` the fast reboot among the restart's options, over `POST /api/system/host/reboot/fast`, `machine-suspend` Suspend and the Resume of a paused machine, `machine-resume-suspended` the Resume of a suspended one, listed by an agent whose `POST /api/machines/{name}/resume` takes a suspended machine, a suspended machine elsewhere brought back by Power on, `guest-agent` Guest shutdown and Guest reboot on a bhyve host, `host-launchers` the Open in application rows over `GET /api/applications`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `monitoring`, `zfs`, `swap`, `provisioning`, `provisioner-registry`                                                          | a host's own tokens, read from its row as the Controls menu's are, each gating panels of the Host overview section: `monitoring` the monitoring service and its health, the network interfaces, the Network, CPU and Memory charts, the monitoring database and the `monitoring` topic of the events stream, `zfs` with `monitoring` the storage summary and the Storage I/O and ZFS ARC charts, `swap` the swap bar, `provisioning` the provisioning tools, and on the Machine page section the provisioning status of a machine, the pipeline rows of the Controls menu, the tree's menu and a row's actions, over `GET /api/machines/{name}/provision/status`, `POST /api/machines/{name}/provision`, `sync` and `run-provisioners`; `provisioner-registry` the roles catalog of the provisioning editor over `GET /api/provisioning/provisioners` and one version's manifest; `tasks`, beside the footer's pane, gates the host page's task queue row over `GET /api/tasks/stats`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `machine-screenshot`                                                                                                         | a host's own token, read from its row as the Controls menu's are: the screen of the Machine page section, one frame of a running machine over `GET /api/machines/{name}/vnc/screenshot`; `machines` and `guest-agent`, beside the Controls menu's rows, gate that section's list and detail and its guest agent's requests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `machine-snapshots`, `machine-create`, `machine-modify`, `templates`                                                         | a host's own tokens, read from its row as the Controls menu's are, each gating surfaces of the Machine page section and the tool rows of the Controls menu and of the tree's menu: `machine-snapshots` the snapshots of a machine, over `GET /api/machines/{name}/snapshots`, and for an admin every write of one and the Snapshot row; `machine-create` Clone, over `POST /api/machines/{name}/clone`; `machine-modify` with `machine-snapshots` the retention policy, over `PUT /api/machines/{name}`; `templates` Convert to template and the template and the publish of a snapshot, over `POST /api/templates/export` and `POST /api/templates/publish`; `monitoring` gates the machine's charts by the host's hypervisor and `zfs` with `machine-snapshots` the holds of a snapshot; no token names the import, the move of a VirtualBox machine's files, the machine's charts or the holds, each gated by what the host's row lists until an agent lists a token of its own for it, as decision 7 asks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `vnics`, `network-spaces`                                                                                                    | a host's own tokens, read from its row as the Controls menu's are: either opens the page of the Networking page section, `/hosts/{id}/networking`, and every door to it, its tab in the tab row of the host's pages, its row in the right-click menu of the host's node in the sidebar's tree and the View all of the host page's network interfaces; `monitoring`, beside the Host overview's panels, gates that page's summary, IP addresses, interfaces, bandwidth and charts, and `monitoring` with `vnics` its routing table, over `GET /api/monitoring/network/routes`, a token of its own asked of the agent that serves that route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `services`, `processes`, `system-users`, `time-sync`, `packages`                                                             | a host's own tokens, read from its row as the Controls menu's are, each gating a section of the Manage page section, `/hosts/{id}/manage`, and any of hyperweaver-ui's `MANAGE_FEATURES` opening the page and every door to it: `services` the services over `GET /api/services` and `POST /api/services/action`, `processes` the processes over `GET /api/system/processes` and their kill, signal and batch kill, `system-users` the users, groups, roles and RBAC lists over `GET /api/system/users`, `groups`, `roles` and `rbac/*` and their writes, `time-sync` the time zone and the time synchronization over `GET /api/system/timezone` and `GET /api/system/time-sync/*`, `packages` the system updates over `GET /api/system/updates/check`; `machines` the orchestration over `GET /api/machines/orchestration/status` and `GET /api/machines/priorities`, and `host-power` the runlevel over `GET /api/system/host/runlevel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ssh`                                                                                                                        | a host's own token, read from its row as the Controls menu's are: the SSH terminal of the Machine page section's console, over `POST /api/machines/{name}/ssh/start` and its `/ssh/{id}` WebSocket; the footer's Shell does not read it; the host's `console` list, `vnc`, `zlogin` and `rdp`, gates the other consoles of that card the same way, checked strictly                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `secrets`, `file-browser`, `artifacts`                                                                                       | a host's own tokens, read from its row as the Controls menu's are: `secrets` the Global secrets tab of the Agent settings page, over `GET` and `PUT /api/secrets`; `file-browser` the Browse button of every path field and the File manager section of the Manage page, over `GET /api/filesystem`; `artifacts` the ISO and artifact storage section, the cached ISOs of the create wizard and the unattended install, and with `provisioner-registry` the Installer files section, over `GET /api/artifacts` and its writes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ip-addresses`, `hostname`, `dns`, `hosts-file`                                                                              | a host's own tokens, read from its row as the Controls menu's are, each a section of the Networking page section: the IP addresses, the hostname, the DNS and the hosts file, each over its own `GET /api/network/*` or `GET /api/system/hosts` route and its writes; `hosts-file` with `vnics` the Network section of the Manage page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `devices`, `repositories`, `boot-environments`, `fault-management`, `syslog`, `log-streaming`                                | a host's own tokens, read from its row as the Controls menu's are: `devices` the Devices page and its tab, `/hosts/{id}/devices`, over `GET /api/devices/*`; `repositories` with `packages` the Repositories section of the Manage page; `boot-environments` its Boot environments section; `fault-management` its Fault management section and, with `syslog` and `log-streaming`, its Syslog and System logs sections, each over its own `GET /api/system/*` route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `inbox`                                                                                                                      | the full inbox page at `/notifications` of the [Universal Identity Contract](universal-identity/), on any UI backend that lists `notifications` too and answers the inbox routes, the identity provider's own or relayed to it under the person's token, the way a `backend` host and an `apikey` agent relay them; without it the bell's modal is the whole inbox                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `tfa`, `onboarding`, `interstitials`, `integrations`, `policies`                                                             | the identity provider's own pages of the [Universal Identity Contract](universal-identity/): the second-factor pages, the onboarding chain, the OAuth and OIDC interstitials, the integrations page and the public policy pages; each only under the `cookie` auth token, and every one of them drawn without the sidebar and the app-section rows while the route is an auth, onboarding or interstitial page, because a consent dialog inside the signed-in chrome is a distraction from a protocol step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

BoxVault answers from `backend/package.json` in both its configured and its
setup-only mode; the catalog's Worker answers from the `version.txt` the
data job publishes beside `catalog.json` and takes `idp.issuer` and
`idp.client_id` from its `ISSUER` and `AUDIENCE` vars; the VDI Health
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
  in one order in both states, search, Discover, the ticket icon, the
  mode control, language, then the account menu or Sign in, search and the menu signed
  in only, the ticket icon and Sign in signed out only, the search
  panel, and the row itself carrying the host's name, version and
  hostname as `data-app`, `data-version` and `data-host`, drawn by
  nothing until a pack's rules give them a place, so a pack can show real,
  relevant data instead of decoration),
  `Sidebar.jsx` (the Sidebar section: the top link and its chevron, the
  sections and tree entries, the rail, the foot), `Breadcrumbs.jsx` (plain crumbs from the
  route alone),
  `UserMenu.jsx` with
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
  throws keeps the chrome, and the footer with `status.version`, its
  name the link to `/about`, and takes the routes as its children). Everything
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
  `brandLogoUrl`, the host's mark as `brand.logo_url` names it).
- `src/lib/` — the whole session layer as one folder: the bus, the
  return-path helper, both providers and `createSession`, as the
  [Universal Session Contract](universal-session/) fixes them; the
  session state hook is `src/hooks/useSession.jsx` and the callback page
  `src/features/auth/components/CallbackPage.jsx`.
- `src/css/styles.css` — the one stylesheet; there is no second one.
- `src/css/fonts.css` — the `@font-face` declarations of the chrome's two
  faces and the account pages' two.
- the pre-paint script in `index.html` — resolves the mode, the account's
  `preferred_mode` → `localStorage.mode` → the operating system's, stamps
  `data-bs-theme` and `lang`, and paints the person's chosen theme from
  `localStorage.theme` and `localStorage.themes`, `data-brand` and the
  theme's `<link>`, over the host's own before first paint.
- the mode and theme state: the mode stored under `localStorage.mode`,
  `auto` resolved through `prefers-color-scheme` via
  `useSyncExternalStore`, write-through on toggle; the theme beside it,
  the chosen theme under `localStorage.theme` and the host's offered list
  under `localStorage.themes`, painted through `applyTheme` of
  `src/lib/runtime.js` and written through as the `theme` preference.
- the i18n setup, `createI18n({ loadSupportedLanguages })` in
  `src/lib/i18n.js`: two namespaces, `shared` as the default and the
  fallback and `auth` beside it; `getSupportedLanguages()` from the list
  the UI backend supplies (`supported_languages` in `/api/health`, else the
  build's locale folders), the init promise gating the first render,
  `languageChanged` stamping `<html lang>`. Every key lives in
  `public/locales/<lang>/shared.json`, one file for every UI backend: `loading`,
  `yes`, `no`, `language.changeLanguage`, `error.*`, the chrome's
  `navbar.*` (including the `boxvault` and `catalog` brand rows and the
  mode control's `mode.*` titles), `sessionEnded.*`, `notAvailable.*`, `notice.*`, `errors.*`
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

One footer for every UI backend, hyperweaver-ui's converged with the
estate's row: the existing footer, plus sub-configs like `health`. The
visual reference is [universal-footer.html](../universal-footer.html),
every frame of it live. The footer draws only while the UI backend lists
the `footer` token; a white-label site that omits it has no footer, no
"Powered by" and no heart. Its three slots are fixed: on the left the
app's name, copyright year and version, `<name> © <year> · v<version>`,
the name and year one in-router link to `/about`, where the repository,
the changelog, the contact and the community links and the version
already are, and the version a button beside it whose third click loads
the game hyperweaver-ui's footer carries, the script at
`hi.kickassapp.com/kickass.js`, on every UI backend; "Powered by" in the
center; and the status cluster on the right, which holds the health
indicator only while the UI backend lists `health` too — an icon colored
by overall state, with the per-service detail on hover or click, its
state arriving on the events stream where the UI backend advertises
`events`, read once as the footer draws and again when the person opens
the heart where it does not, never on a timer. A UI backend whose
content security policy lists its script origins lists the game's.

### The pane

While the host in focus offers a pane the footer carries one under its
row, tasks or a shell, and nothing of it draws on a UI backend whose
hosts offer neither.

- **Focus.** The host in focus is the one serving agent on an agent role
  and the host the route names on the `hyperweaver-server` role,
  `/hosts/{id}` and below. The pane's tokens are read from that host's
  own list, the agent's status on an agent role and the registry row's
  `capabilities` on the server role, never from the server's own status,
  because each agent lists its own surfaces. With no host in the route
  on the server role the tasks of every host that lists `tasks` draw
  together, newest first, under a Host column, a row opening nothing,
  and the shell has no host to open on.
- **The row with a pane.** The center slot is the grip, the bars alone,
  and the STARTcloud mark moves to the far left before the product name,
  its tooltip "Powered by STARTcloud", linking where the center's mark
  does; this happens only when the center is replaced by the grip, so
  every other UI backend keeps "Powered by" in the center and no mark on
  the left. The right cluster reads the heart, the Shell toggle while
  the host lists `host-terminal`, the Tasks toggle while it lists
  `tasks`, Refresh, the priority filter and the Columns picker while
  the tasks pane shows, then the chevron that collapses or expands the pane,
  the last control and hard right. The pane's first view is Tasks: with
  no saved view the pane opens on the view the feature marks `first`,
  the tasks view, as hyperweaver-ui's footer does, the toggles keeping
  their order. A
  saved view whose token the host lacks falls to the one it has.
- **The grip.** Inside the row the grip alone is the drag area, so that
  it does not interfere with the buttons: pressed, held and dragged it
  makes the pane taller or shorter, and nothing else in the row drags.
  The pane opens at 130px, closes when dragged under 100px and grows to
  ninety percent of the window. Up and Down on the focused grip move it
  by 20px. The handle is pointer events on the grip setting the pane's
  height, no resizable library.
- **The top edge and the corner.** The row's top bound is a handle too,
  "the same resize thing" the sidebar has left to right, turned on its
  side: a strip over the row's top border, above the row and never over
  a button, dragged up and down to set the pane's height, and dragged up
  from a closed pane it opens the pane at the height it is dragged to,
  closing again when released at 100px or under. Where the sidebar's
  right edge meets that top edge the corner is one handle for both, "a 2
  axis resize to control both": one drag sets the sidebar's width and the
  pane's height together, the pointer over it drawn as the four-way
  arrows, the width stored when the pointer lifts. While the sidebar is
  the rail the corner moves the pane alone, and under 900px, where the
  sidebar already leaves the row, no corner is drawn. The shell holds
  the sidebar's size and hands it to the column and to the footer, so
  the column's own edge and the corner move one value.
- **Order and scrolling.** The row sits above the pane and the pane
  opens under it at the bottom of the screen, as hyperweaver-ui draws
  it. The page region above the row stays the one scroll container, the
  pane scrolls inside itself, and opening the pane shortens the page
  region, never overlays it.
- **Tasks.** One table of the host's `GET /api/tasks` rows, fifty at
  most, the priority floor sent as `min_priority` (All 20, Low+ 40,
  Medium+ 60, High+ 80, Critical 100, 40 by default), the columns ID,
  Operation, Target, Status, Progress, Priority, Created by, Created,
  Started, Completed and Error, six drawn by default (Operation, Target,
  Status, Progress, Priority, Created); a failed row tinted danger, a
  running row warning; a row's priority word from its number, Service at 50. The table is the one table of the estate: "the column headers in
  the footer should be resizable", every header sorting and carrying
  the resize handle, and they act as the other tables of the system do,
  "the priority based way of hiding them when screen real estate doesn't
  allow it", the columns the pane has no room for folded under a fold
  cell, the first column shown never folding, because "basically there
  should be no horizontal scroll bar"; the sort and the widths are kept
  under `table_prefs_tasks`. A row opens the task dialog: its details, progress, metadata, its
  output in terminal colors with Copy, its subtasks each opening its
  own dialog, and Cancel task behind a confirmation while it is pending
  or running, over `GET /api/tasks/{id}`, `GET /api/tasks/{id}/output`,
  the `/tasks/{id}/stream` WebSocket and `DELETE /api/tasks/{id}`.
- **Shell.** One Shell, offered while the host in focus lists one: "a
  shell via a pty, a shell via ssh, a shell via some other mechanism",
  the mechanism the backend's own. The pane is written against a
  terminal source, the route that starts the session, its WebSocket, its
  ticket from `GET /api/ws-ticket` and the route that stops it, never
  against one kind of shell; today's source is the host shell behind
  `host-terminal`, as hyperweaver-ui's footer opens it, one xterm fitted
  to the pane on every drag and the PTY told its size, Reconnect shell,
  Restart shell and Terminal preferences in the toggle's drop-up.
  Reconnect shell closes the socket and opens a new one to the same
  session with a new ticket, the session left running, and Restart
  shell stops the session and starts a new one; what a new socket finds
  is the backend's own, zoneweaver-agent keeping the shell across
  sockets and replaying its last lines, hyperweaver-agent opening a
  shell per socket. A closed socket is never opened again on a clock. A
  terminal per machine and "a tabbed shell per vm" are later work.
  Terminal preferences are
  the font size (6 to 32), the scrollback (to 200000), the cursor style,
  the cursor blink and the font family, kept in the browser and applied
  to the open shell at once.
- **The pane's menu.** A right-click on the pane opens one menu at the
  pointer, titled by the view, its rows
  `[{ key, labelKey, icon?, tone?, onClick }]` as the sidebar tree's
  are and drawn by the same presenter, `ContextMenu`: Reconnect shell,
  Restart shell and Terminal preferences on the shell, Refresh on the
  tasks; Escape, a click away or a right-click elsewhere closes it.
- **No timer.** hyperweaver-ui asked every agent for its tasks every
  second and the open dialog every two; both go. The pane reads once on
  open, on the stream's `ready` and `reset`, on Refresh and after the
  person's own action, and between reads follows the `tasks` topic's
  `task-updated` event of the [Universal Events Contract](universal-events/),
  as the host list and a host's stats follow the `hosts` topic. A
  task's output and every terminal keep the WebSocket the agent pushes
  them on.
- **Storage.** `footer_height`, `footer_open`, `footer_view`,
  `tasks_min_priority`, `tasks_columns`, `table_prefs_tasks` and
  `terminal_prefs` per origin,
  in the session contract's storage table.

Every health surface speaks one shape, `{ status, timestamp, services }`,
`status` ok / warning / error and every `services` value a coarse status
word, so the one footer renders BoxVault's `/api/health` and the catalog
Worker's `/health` alike; each app adds its own service names to the
shared `footer.health.*` keys.

Degrade a piece, never the slot: while the role has no About text the
left slot is plain text; without a health surface the right slot is
empty. The left slot is
never empty — every app has a name and a version, the version being the
`version` of the UI backend's `/api/status` payload, read through `useStatus()`,
never a value baked into the UI build. A UI backend that omits `footer`
shows that version as a muted `v<version>` beside `brand.name` in the
user menu's app-section header, because a person reporting a fault must
be able to read the version somewhere and a white-label site has taken
the footer away.

---

## User menu, top to bottom

| #   | Row                                                                | Shown when                                                                                                                                                                                                                                                                                                                                                                                   | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Identity card: avatar, name, email, target glyph, trailing chevron | signed in                                                                                                                                                                                                                                                                                                                                                                                    | Whole card is one link → `{issuer}/user/profile`. Email line only when it differs from the name; neither is truncated — the menu grows with them as it does with any row. The glyph and chevron sit in a fixed-width `user-card-actions` slot so the card measures the same in every app: an id-badge glyph marks the IdP profile as the target, a user glyph marks a local profile. Apps with both a local profile page and an IdP session make the glyph a mode toggle that flips the target without navigating (the card body navigates to the shown target); everywhere else it is a static indicator. Apps may additionally list the local profile in their own section. |
| 2   | Active organization: org logo + org name                           | `organizations` claim has ≥ 2 memberships; ≥ 1 on a UI backend that narrows by organization, where All organizations is a choice beside the one membership                                                                                                                                                                                                                                   | Opens the organization switcher modal. No subline, no role badge, no chevron. On a UI backend that narrows by organization the row reads All organizations, under the layers glyph, while that is the choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3   | Preferences                                                        | signed in through the IdP, or the first `auth` token is `cookie`; drawn on the `cookie` UI backend as well, an in-router link to `/user/profile/preferences`, the one destination that lives in both the column and the menu, because a person changes language, mode, theme and time zone from wherever they stand and the avatar is the one control on every page                          | Link → `{issuer}/user/profile#preferences` (language, mode, theme, time zone, sign-in approval); on the `cookie` UI backend the link is `/user/profile/preferences`. Nothing is edited inline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| —   | divider                                                            |                                                                                                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | **Favorites** header + one row per app                             | `GET /api/user/favorites` answers at least one row, read once per session through the hub client, when the session is adopted or, when that happens on an auth path, the first time the page leaves the auth paths: the identity provider on an `idp` or `cookie` UI backend, the app's own origin on a `backend` one, which proxies the path to the identity provider with the user's token | Sorted by `order`; label `custom_label` → `client_name` → `client_id`; icon `icon_url` → `{home_url origin}/favicon.ico` → star; opens `home_url` in a new tab with `rel="noopener noreferrer"`. A `home_url` or `icon_url` is drawn only when it parses with the `https:` scheme, and every image carries `referrerpolicy="no-referrer"`, because these values come from client registrations and a `javascript:` or `http:` value would run or leak on every app that draws the menu. Favorites are managed on the IdP profile page, and an app may offer "Add to Favorites" on its own About page.                                                                         |
| —   | divider                                                            |                                                                                                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 5   | **App section** — header is the app's name                         | the app defines at least one row                                                                                                                                                                                                                                                                                                                                                             | Any number of rows; each row gated by the app (`ROLE_ADMIN`, org OWNER/ADMIN, feature flags). Typical rows: Admin, Organization console, local Profile, About, Docs, API reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| —   | divider                                                            |                                                                                                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6   | Notifications + unread badge                                       | access token carries the `notifications:read` scope, or the first `auth` token is `cookie`                                                                                                                                                                                                                                                                                                   | Opens the Notification Channel Notifications modal. The unread count arrives on the events stream where the UI backend advertises `events`; a UI backend without a stream reads it when the session is adopted, when the menu opens and after the person's own read or dismiss, never on a timer.                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | Help                                                               | the app's ticket system is enabled and has a base URL                                                                                                                                                                                                                                                                                                                                        | Opens the ticket URL in a new tab (see Help ticket).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| —   | divider                                                            |                                                                                                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 8   | Logout                                                             | always                                                                                                                                                                                                                                                                                                                                                                                       | Red row: scope icon + "Logout". See Logout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Icons: universal rows use the app's icon set at the app's size; the row
label text is the contract, not the glyph.

---

## Organization switcher modal

Title "Switch Organization". One row per membership from the
`organizations` claim, personal orgs last:

- org logo → Gravatar (org email hash) → the app's mark
- name and description
- role badge: Owner (danger), Administrator (warning), Member (secondary),
  Guest (secondary, like Member: the read-only membership of the
  [Universal Identity Contract](universal-identity/))
- crown icon on the `primary` membership; active row: primary border +
  green check; a row that is both shows crown then check
- picking a row switches and closes and never navigates: the page stays
  where it is; the × in the title bar is the only other way out — no
  Cancel button in either modal

A UI backend that narrows by organization, the `hyperweaver-server` role
while it lists `hosts`, draws **All organizations** as the switcher's
first row, the layers glyph and the words, the primary border and the
green check while it is the choice; picking it sets the active
organization to the empty uuid, and the user menu's organization row
reads All organizations under the same glyph while it stands. One
switcher for the whole estate: the row and the modal every UI backend
draws set the one thing, the organization a person operates under, and a
UI backend that narrows by it reads that value, never a second picker of
its own.

- **A view, never a boundary.** The server decides access on every
  request by every organization of the person; the choice narrows what
  the server already answered, because a filter the browser holds can be
  changed by whoever holds the browser.
- **What narrows.** The servers every surface of the hosts feature draws,
  the sidebar's tree, the hosts page, the Controls menu's bulk rows on
  the home route and the footer's tasks of every host, and a host's
  machines, the tree's children, the host page's machines and the bulk
  dialog, are the ones under the choice. The narrowing is done once,
  where the feature hands out its held copies, so no surface learns of
  organizations.
- **The rule fails open.** A row shows while the choice is All, while it
  carries no `org_uuids` list, while its list is empty, the unassigned
  host open to everyone, or while its list names the chosen uuid, because
  a row the server answered is a row the person may see, and a filter
  that hides what it cannot judge hides a machine from its owner. A
  host's machine names come from its stats and their `org_uuids` from
  its machine rows, `GET machines`; a name no row carries shows.
- **What is left whole.** The running names of a host's stats and the row
  of the one machine a route names are read whatever the choice, because
  a machine's state is asked by name and a machine outside the choice is
  still running. The host a route names is found among every row the
  server answered, so its page, its label and its Controls menu draw
  whole under any choice, a host reached by its address being a host
  the server let the person reach.
- **No request for All.** While the choice is All the filter asks for
  nothing. While an organization is chosen a host's machine rows are read
  beside its stats, the one copy per host every surface shares, and a
  change of the choice never reads the list of servers again.
- **The rows of the switcher.** There the switcher draws the memberships
  the profile answered, in the identity provider's shape, and reads no
  list as it opens, because the profile carries every member a row
  draws.
- **Agents.** An agent served directly, the `hyperweaver-agent` and
  `zoneweaver-agent` roles, holds no organization layer, and nothing of
  the filter draws there.

Persistence: the active org uuid is stored per app in local storage,
validated against the claim on every load, and falls back to the primary
membership, then the first. Any active-org indicator the app shows and
every org-scoped request read the same value. On a UI backend that
narrows by organization nothing stored means All organizations, never
the primary membership, and the key is absent while All is the choice,
because a person who chose nothing must see every host their
organizations reach.

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
close button; the dialog is a list dialog of the pages contract,
`list-modal`, 720px wide, the metric every dialog that carries a list or a
choice takes. Rows: type icon colored by
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
  the user's Bearer token carrying the `notifications:read` scope, the
  hub's read scope, `notifications:write` being a producer's. Server-side
  apps call it with the OIDC access token they hold; a public SPA calls the
  issuer directly.
- Row click marks read, then follows `navigate` when it is `https://`.
- Toasts are per app: the app's own VAPID keys and service worker on its
  own origin, subscription posted to the app's own endpoint, the current
  subscription re-POSTed on every page load, `DELETE …?endpoint=` on
  switch-off, and the service worker re-subscribes and re-POSTs on
  `pushsubscriptionchange`. The hub never toasts a producer's events. The
  worker is the build's `/notification-sw.js` at the origin root,
  registered once by the shell with the app name and the UI build's
  version in its query (the UI backend sends `Service-Worker-Allowed` and
  `Cache-Control: no-cache` on that one file), the push subscription and
  the update sharing that one registration; its `install` precaches only
  the manifest and the marks and `skipWaiting`s, its `activate` drops the
  previous version's cache and claims the clients, and it carries no
  `fetch` handler for the app's own files, because the build's files are
  unhashed and served `no-cache` and a worker that answered them from a
  cache would pin one deploy's chunk against another's. When a new worker
  is installed while one already controls the page, the shell raises the
  sticky "A new version of {{app}} is available" banner with Reload.
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
While signed out the cluster's ticket icon builds the same URL with
`customerId` as `ticket.fallback_customer_id` alone and no `user` or
`email`; signed in, the Help row builds it with every value the app holds
on the person, `customerId` resolved active org → user → fallback.

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
outside the data itself, drawn by the chrome from `src/components/layout/Notices.jsx`
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
the attempt. Where the methods answer enables exactly one method and it
is the default provider, the login page begins that provider at once
under the same suppressions and draws no chooser, because a page with
one button is a click for nothing.

---

## Decisions

Settled before code, in the order they were raised:

1. `links.community` is an optional list of `{ label, url }` the host
   answers per site, each one community or support link the About page
   draws after its repo, changelog and contact links in the host's order,
   `label` the host's own text drawn as it is and never translated, like
   `brand.name`, `url` an `https:` URL; the UI drops an entry whose `url`
   is not `https:` or whose `label` or `url` is not a string, draws
   nothing for a member that is not a list, and nothing throws. Because a
   URL written into the page is a fork per app, and the one build serves
   every app.
2. The catalog's Browse tree gives every mounted collection a root node
   routing to that collection's own all-organizations listing,
   `/<segment>`, or `/<key>` for the segment-less collection, never to the
   home page, open on that route; the crumbs on a collection root read
   the collection alone, linking to that root, and an
   organization's pages keep the organization crumb linking to `/<org>`
   with the segment-less collection's items directly under it. Because
   one Browse node that opens every collection is not that collection's
   node.
3. hyperweaver-ui merges into this build as features, its server and
   its two agents becoming UI backends of this contract; the direct
   versus aggregated serving mode is not a new mechanism but "more of
   an add these options to the system", `role` deciding it and the
   agent addressing following `role` as the status payload table fixes,
   and it "is the first thing we should grow", before any page is
   ported. Because the two UIs already share the probe, the token gate
   and the chrome, and a second copy of each is paid for on every fix.
4. The two footers "converge into one footer": "the existing footer
   system we have, plus sub configs like we do for health, ie tasks,
   host-shell or footer shell", the shell "a dynamic thing to be more
   than just the host shell or host terminal like it is in hyperweaver
   currently", because "it may not always be a host". "The middle" is
   "a selector that when clicked and held and dragged like it is in
   hyperweaver allows the user to make the shell or tasks section
   bigger", and "the grip is the drag area so that it doesn't interfere
   with the buttons, this is intentional". The left side functions "the
   same way it currently does, except the easter egg game should make it
   in too", and it goes "to the about page, they can get that
   information and the version on that page"; while the grip holds the
   center the mark shows "on the far left before the product name" with
   the Powered by text as its tooltip, which "should only happen when
   its replaced by the resize bars which is only the tasks and the
   shell". Where the two footers differ hyperweaver-ui's leads, because
   it "is the superior one, it had more effort put into it".
5. The footer's row and the sidebar's foot are one height, because the
   footer "in its collapsed state" was "1 or 2 pixels" smaller "than the
   sidebar footer with the user section", and the row carries no
   vertical padding, because "there is this padding on top and below
   the buttons the entire footer could do without"; the chevron sits
   "hard right". At the sidebar's foot the image is on the left, the
   name and the email after it, because that "is what it shows in the
   hyperweaver ui". The row's top bound is a second handle, "the same
   resize thing" as the sidebar's left to right, and the corner where
   the two meet is "a 2 axis resize to control both", the pointer there
   the four-way icon.
6. The API reference is a row of the app section from `links.api`,
   because "the api docs can be the startcloud-ui way", and it opens in a
   new tab: "if we get the API swagger into the react app itself, then as
   a page section with no navigation if possible, but if we don't have
   that, then I guess new tab". The reference drawn inside the app is
   later work; until it lands every API reference row opens a new tab.
7. What one agent can do and another cannot is a feature token the agent
   lists, never a test of which agent it is: "these should be features",
   "the agent doesn't expose them, done, the end". So the Resume of a
   suspended machine draws behind `machine-resume-suspended` and the fast
   reboot behind `host-fast-reboot`, each listed by the agent that serves
   the route and absent on the one that does not.

---

## Conformance checklist

Tick each line in the PR that claims conformance, with a screenshot beside
the live frame of the reference page.

| Line                                                                                                                                                                                                                                              | Catalog                                                                     | BoxVault                                                                                                                                           | VDI Health                                                                                                        | hyperweaver-ui | Auth server                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One build of startcloud-ui with no per-app code; every difference a field of the UI backend's `/api/status`                                                                                                                                       | ✓ the Worker's status payload                                               | ✓ `status.controller.js`                                                                                                                           | ✓ `routes/status.py`                                                                                              |                | to come — the issuer's status payload of the [Universal Identity Contract](universal-identity/)                                                                                                                          |
| Serves the pinned UI release and answers `GET /api/status` with `role`, `version`, `brand`, `auth`, `collections`, `features`, `links` and `ticket`                                                                                               | ✓ Pages payload, the Worker answers from `version.txt` with `idp`           | ✓ `backend/ui`, the backend answers from its `package.json`                                                                                        | ✓ `/opt/vdi-health/ui`, the version from `importlib.metadata`, `collections: []`, `config: ["app"]`, `events`     |                | to come — `packaging/config/ui-version.yaml`, the deb's `/opt/prominic/authorization-server/ui/` served at `/`, `GET /api/status` per site from `BuildProperties`                                                        |
| Cluster: search · Discover · mode · globe · name+avatar signed in; Discover · ticket · globe · mode · Sign in signed out, the brand alone on the left                                                                                             | ✓                                                                           | ✓                                                                                                                                                  | ✓ under `idp`; no Sign in button under `auth: []`                                                                 |                | to come — the shared chrome; the Sign in button hidden on the auth routes, Discover, the ticket icon, language and the mode control present there                                                                        |
| Search: icon first, expands on click/dwell, live count, gear, ×, Escape                                                                                                                                                                           | ✓                                                                           | ✓ every listing page, Discover organizations, the org console's members and the admin's organizations, each with its own placeholder and no groups | ✓ the fleet page's binding                                                                                        |                | to come — every admin table page's binding: the query as the paged list's `search` or `username` parameter, the filter groups as `select`, `toggle` and `date-range` sent as the list's parameters, no field on the page |
| Filter panel: full-bleed under the header, Collection then Visibility then the page's groups, then Columns per collection in list view, `value (count)` pills, active count, Clear filters                                                        | ✓ Visibility · Watched · Tier · Provider · Columns                          | ✓ Collection · Visibility · Watched · Provider · Architecture · OS · Columns; Organization on ISOs across orgs                                     | ✓ Status (tristate) · Pool (tristate) · Session · Cache · Drives · Publication · Columns under `table_prefs_vdi`  |                | to come - Client health Status, Kind; Users Status, 2FA, Customer ID, Roles; Logins Show only; Registrations Email verified, Phone verified; Sessions Client; Organizations Type; then Columns                           |
| Panel action: one registered `{ key, labelKey, icon?, onRun }` drawn at the panel's foot, built by the page from the current query and groups, no button for it on the page                                                                       | n/a — no page action                                                        | n/a — no page action                                                                                                                               | n/a — no page action                                                                                              |                | to come — Export on Users, Logins and Registrations, `/api/admin/export/<name>` with the panel's parameters as a top-level navigation                                                                                    |
| App-wide search: the module on every page, the "Elsewhere in …" list under the panel, Show all into `/search?q=`, rows in the universal shape                                                                                                     | to come — the `search` token and `GET /api/search`                          | ✓ `search` token, `GET /api/search` with the list endpoints' visibility clauses                                                                    | n/a — no collections, no `search`                                                                                 |                | to come — `search` token, `GET /api/search` over organizations and accounts under the list routes' visibility                                                                                                            |
| No bell in the cluster                                                                                                                                                                                                                            | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | ✓                                                                                                                                                                                                                        |
| Cluster icon buttons borderless                                                                                                                                                                                                                   | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                                                                              |
| `links.docs`, `links.contact` and `links.api`: Docs, Contact and API reference rows of the app section signed in, nothing in the cluster signed out; no search icon signed out                                                                    | ✓ Contact/Docs                                                              | ✓ Docs                                                                                                                                             | ✓ Docs                                                                                                            |                | to come — `help_url` and `mailto:<support_email>`                                                                                                                                                                        |
| Breadcrumb after the brand: plain crumbs from the route, muted › separators, no pickers                                                                                                                                                           | ✓ › org › Provisioners › item › version › provider                          | ✓ › org › Boxes or ISOs › item › version › provider                                                                                                | n/a — no collections                                                                                              |                | n/a                                                                                                                                                                                                                      |
| Switcher sets the active organization only, never navigates                                                                                                                                                                                       | ✓ `pickOrg` of `useSession`                                                 | ✓ the same hook                                                                                                                                    | ✓ the same hook under `idp`                                                                                       |                | to come — the same hook; a console context only, never make-primary                                                                                                                                                      |
| Chrome metrics: 62px header, 20px gutter, 13px footer row, full-bleed, tertiary band                                                                                                                                                              | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                                                                              |
| Sidebar only from feature exports, brand at its top, rail persisted, foot bare                                                                                                                                                                    | ✓ the catalog feature's Browse group                                        | ✓ the Browse group, then the Account group and the admin entries                                                                                   | to come — the fleet and pools entries                                                                             |                | to come — the Account section for every signed-in person from the profile feature, the operator sections from the identity feature for an admin, none on the auth routes                                                 |
| `footer` token listed                                                                                                                                                                                                                             | ✓ the Worker's status payload                                               | to come                                                                                                                                            | to come                                                                                                           |                | to come — per site, `sites.<id>.ui.footer`                                                                                                                                                                               |
| Footer slots: name · year · version as the About link, the version's third click the game · powered-by · health where present                                                                                                                     | to come — the About link; ✓ Worker `/health` heart                          | to come — the About link; ✓ `/api/health` heart                                                                                                    | to come — the About link; ✓ `/api/health` heart over `database`, `uds` and `events`                               |                | to come — the About link; the heart over `database`, `mail`, `sms` and `signing_keys` while `health` is listed, fed by the core `health` topic                                                                           |
| Footer pane: the grip in the center and the mark on the far left only while the host in focus offers a pane; Tasks behind `tasks`, the Shell behind `host-terminal`; the grip, the row's top edge and the corner drag; nothing polls              | n/a — no host lists a pane token                                            | n/a — no host lists a pane token                                                                                                                   | n/a — no host lists a pane token                                                                                  | to come        | n/a — no host lists a pane token                                                                                                                                                                                         |
| Controls menu: the machine rows by the host's tokens and hypervisors, the zone lifecycle on a bhyve host, the bulk rows on a host's route and the home route, the hosts tree's right-click verbs, one request and one notice a row; nothing polls | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| Host overview: the panels by the host's tokens, the monitoring ones behind `monitoring`, the ZFS ones behind `zfs` too, every answer and series one copy per host, the charts on the one `Chart` growing by the `monitoring` topic; nothing polls | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| Machine page: the machines list by the host's tokens, the read surfaces by what the agent answers, the screen behind `machine-screenshot`, the detail one copy per machine, a write one request and one notice; nothing polls                     | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| Machine page: the charts behind `monitoring` by the host's hypervisor, the snapshots behind `machine-snapshots`, the import, the clone and the Controls menu's and the tree's tool rows by their tokens, what asks nothing; nothing polls         | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| Networking page: the page behind `vnics` or `network-spaces`, every table behind the tokens of its read, the interfaces and the usage the copies the host page holds, one search over its four tables; nothing polls                              | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| Chrome from the reference implementation; native theme (stock tokens, hosted Open Sans/Montserrat, fa6)                                                                                                                                           | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — the shared chrome                                                                                                                                                                                              |
| Universal rows drawn with the app's own components and theme                                                                                                                                                                                      | ✓ react-bootstrap + react-icons via the shared chrome                       | ✓ react-bootstrap + react-icons via the shared chrome                                                                                              | ✓ the shared chrome                                                                                               |                | to come — the shared chrome                                                                                                                                                                                              |
| Card = avatar, name, email, chevron → IdP profile (local↔IdP mode toggle where a local profile exists)                                                                                                                                            | ✓ static id-badge glyph, no local profile                                   | ✓ toggle icon; local sessions → `/profile`                                                                                                         | ✓ static id-badge glyph, no local profile                                                                         |                | to come — the local-profile glyph, an in-router link to `/user/profile`                                                                                                                                                  |
| Org row = logo + name, ≥ 2 memberships, opens switcher                                                                                                                                                                                            | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come                                                                                                                                                                                                                  |
| Switcher rows: logo, name, description, role badge, crown on primary, check on active                                                                                                                                                             | ✓ from the token's `organizations`                                          | ✓ personal-last via SCIM `personal`, loaded on open                                                                                                | ✓ from the token's `organizations`                                                                                |                | to come — from `GET /api/user` `organizations`                                                                                                                                                                           |
| Active org persisted, validated, falls back primary → first                                                                                                                                                                                       | ✓ `localStorage` `activeOrganization` by uuid                               | ✓ `localStorage` `activeOrganization` keyed by org name (local orgs have no uuid)                                                                  | ✓ by uuid                                                                                                         |                | to come — `localStorage` `activeOrganization` by uuid; a console context, never make-primary                                                                                                                             |
| Organization filter: All organizations the switcher's first row and the choice nothing stored falls to, the org row from one membership on, the hosts and machines on screen the ones under the choice, failing open; All asks for nothing        | n/a — no `hosts` token                                                      | n/a — no `hosts` token                                                                                                                             | n/a — no `hosts` token                                                                                            | to come        | n/a — no `hosts` token                                                                                                                                                                                                   |
| App section rows gated by the UI backend's `features` (`admin`, `org-console`, `rebuild`), the utility rows by `links`                                                                                                                            | ✓ `rebuild`, `links.contact`, `links.docs`                                  | ✓ `admin`, `org-console`, `links.docs`                                                                                                             | ✓ `admin` under `idp`, `links.docs`                                                                               |                | to come — About always, the sidebar carrying every other page; Docs from `links.docs` and Contact from `links.contact` while set (identity contract decision 120)                                                        |
| Preferences row → IdP profile preferences                                                                                                                                                                                                         | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — an in-router link to `/user/profile/preferences`                                                                                                                                                               |
| Favorites: order, label chain, icon chain, new tab, read from `GET /api/user/favorites`                                                                                                                                                           | to come — the identity provider's route with the token                      | to come — proxied at its own `/api/user/favorites`                                                                                                 | to come — the identity provider's route with the token                                                            |                | to come — `GET /api/user/favorites` in `snake_case`                                                                                                                                                                      |
| App section named after the app, rows gated                                                                                                                                                                                                       | ✓ "Provisioner Catalog": Rebuild catalog data (`ROLE_ADMIN`), Contact, Docs | ✓ "BoxVault": Admin (`ROLE_ADMIN`), Organization console (org OWNER/ADMIN), About, Docs                                                            | ✓ "VDI Health Monitor": Admin (`ROLE_ADMIN`), Docs                                                                |                | to come — the header is `brand.name`, the site's own: About (in-router to `/about`), Docs, Contact; the Help row stays the ticket                                                                                        |
| Notifications row + badge, `notifications` feature and scope-gated, opens modal                                                                                                                                                                   | ✓ scope read from the access token                                          | ✓ scope read from `/api/userinfo/claims`                                                                                                           | n/a — no `notifications` token                                                                                    |                | to come — the `cookie` token in place of the scope; the badge from the `notifications` topic                                                                                                                             |
| Modal: mark all, per-row mark read and dismiss, link glyph, view all, toast switch, the two test glyphs                                                                                                                                           | ✓ tests through the Worker's `/push/test-toast` and `/push/test-channel`    | ✓ tests through `/api/notifications/test/toast` and `/test/channel`                                                                                | n/a                                                                                                               |                | to come — View all an in-router link to `/notifications`; the two tests through `POST /api/notifications/test/toast` and `/test/channel` on the issuer                                                                   |
| Toasts: own VAPID + SW, re-POST on load, `pushsubscriptionchange`                                                                                                                                                                                 | ✓ `/push/vapid-key`, `/notification-sw.js`, re-POST on load                 | ✓ SW re-subscribes, then the page re-POSTs and drops the old endpoint                                                                              | n/a                                                                                                               |                | to come — `/api/notifications/vapid-key`; the worker from the build at scope `/`, registered by the shell with the app name and the build's version in its query                                                         |
| Help row gated by config, customerId chain, context                                                                                                                                                                                               | ✓ `ticket` in `/api/status`, active org → userinfo → fallback customer id   | ✓ `ticket_system.*` from `/api/config/ticket` incl. `fallback_customer_id`                                                                         | ✓ `ticket_system.*` from `/api/config/ticket`                                                                     |                | to come — `ticket` in `/api/status` from `integrations.improvement_request.*`, the site's `customer_id` as the fallback                                                                                                  |
| The ticket icon in the signed-out cluster is the ticket link while the app holds a ticket system, the fallback customer id alone, in a new tab; nothing while it holds none                                                                       | ✓ `ticket` in `/api/status`                                                 | ✓ `ticket_system` from `/api/config/ticket`                                                                                                        | ✓ `ticket_system` from `/api/config/ticket`                                                                       |                | to come — the auth pages, `ticket.fallback_customer_id` the site's `customer_id`                                                                                                                                         |
| Logout row: red, scope icon toggle, text logs out                                                                                                                                                                                                 | ✓                                                                           | ✓                                                                                                                                                  | ✓ under `idp`                                                                                                     |                | to come — the plain red row; the IdP session is the SSO session                                                                                                                                                          |
| Everywhere = end-session with `id_token_hint`; this-app = local                                                                                                                                                                                   | ✓ form POST to the end-session endpoint                                     | ✓                                                                                                                                                  | ✓ form POST to the end-session endpoint                                                                           |                | n/a — `POST /user/logout` ends the SSO session and answers `{ next }`                                                                                                                                                    |
| ID token kept for the session                                                                                                                                                                                                                     | ✓ `<storagePrefix>.id_token`                                                | ✓ inside the BoxVault JWT                                                                                                                          | ✓ `<storagePrefix>.id_token`                                                                                      |                | n/a — issuer                                                                                                                                                                                                             |
| Notices: banners under the header row, cards top right, every notice dismissible; session ended is a keyed warning banner with no action, the cluster's Sign in carries the return path                                                           | ✓ refresh failure or 401 → banner, the cluster's one-click sign in          | ✓ SSE + 401 → banner, the cluster's Sign in → `/login?returnTo=`                                                                                   | ✓ refresh failure, 401 or `session-terminated` on the one stream → banner under `idp`; no banner under `auth: []` |                | to come — `401` on an authenticated call or `session-terminated` → banner; `intended_url` carries the return path; on the auth routes the banner carries its own Sign in                                                 |
| Mode, theme and language write through; pre-paint script                                                                                                                                                                                          | ✓                                                                           | ✓                                                                                                                                                  | ✓                                                                                                                 |                | to come — `PATCH /api/user/preferences`; the script resolves the person's mode and theme, `auto` as the operating system's                                                                                               |
| Silent SSO once per session                                                                                                                                                                                                                       | n/a — no login page, sign in is one click                                   | ✓                                                                                                                                                  | n/a — sign in is one click                                                                                        |                | n/a — issuer                                                                                                                                                                                                             |
| `events` token and `events: { path, topics }`, the one stream of the [Universal Events Contract](universal-events/)                                                                                                                               | n/a — no live data                                                          | ✓ `/api/events`, `["session", "notifications"]`                                                                                                    | ✓ `/api/events`, `["fleet"]` plus `session` under `idp`                                                           |                | to come — `/api/events`, `["notifications", "session", "health", "admin"]`                                                                                                                                               |

---

**Related:** [Universal Pages Contract](universal-pages/) |
[Universal Session Contract](universal-session/) |
[Universal Events Contract](universal-events/) |
[Preferences, Language & Branding Contract](preferences-and-branding/) |
[Notification Hub](../../features/notification-hub/) |
[Organizations](../../features/organizations/) |
[Integrating Your App](integrating-your-app/)
