# Changelog

## [0.56.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.55.0...v0.56.0) (2026-10-09)


### Features

* the agent's session the one HttpOnly __Host-hwa_session cookie the browser carries with its same-origin credentials on every request and on the event stream, the browser never holding the key and the cached record the profile's display members alone, a pasted key handed to POST /api/auth/session, the tray claim and the code flow's approved answer setting the cookie and the profile then read, both sign-outs sending POST /api/auth/logout, a 401 on the profile read clearing the record and any other failure keeping it, no CSRF cookie or header because the agent guards its writes by the browser's own Sec-Fetch-Site and Origin; the mock agent serving the same cookie, its forged-write refusal and its cleared cookie on a dead key; the mock's reachability test comparing the parsed host and its minted MAC drawn from crypto's randomInt; the session and events contracts, the sign-in fixtures, the feature steps and the unit tests following ([90c6f69](https://github.com/STARTcloud/startcloud-ui/commit/90c6f69073d413d201fdeaa20f2f8e57aa898ba6))
* the Discourse keyboard shortcuts on the shared UI, one listener with the editable-target guard and g chords resolved on the next keydown, / or Ctrl+Alt+F opening search in place of Ctrl+K, ? opening the Keyboard Shortcuts modal with its filter and categories, the keyboard button in the sidebar foot and the row in the user menu, = p c . and the jump, navigation, selection and action rows, each feature exporting its own shortcuts behind the tokens it serves, the binding table in the navbar contract; the validation rules document read only where the host lists rules, the token in the feature table and the mock, a host without it validating on the client's own defaults; the Update page the versions, date and links in a side card with the release's own notes rendered as markdown beside them and an Assets fold listing the check's assets with sizes and checksums, folded by default and kept in the page's prefs, the mock answering notes and assets; the English and Spanish keys, the fixtures, the scenarios and the unit tests following ([f862a9f](https://github.com/STARTcloud/startcloud-ui/commit/f862a9f6992ddbda172b44502fd84fe17b06a680))


### Bug Fixes

* the provisioner card's byline the organization's name alone, the avatar before it gone, and every link in the Update page's release notes opening its own tab ([bad0596](https://github.com/STARTcloud/startcloud-ui/commit/bad059674fea0361f1cf8fcab9c3841653bd5cec))

## [0.55.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.54.0...v0.55.0) (2026-10-07)


### Features

* every chart drawn by one chart card from the registry, a pill per line or per group with an entity legend whose click isolates an entity and whose second click shows all again, area fill and the newest point marked, pan and zoom, one crosshair across a page's charts, gaps left open, LTTB thinning, the window, Refresh and Pause as glyphs in the heading, CSV and PNG export, the one-sample note, ARC charts a pill per line, the CPU axis in percent, a hovered line no longer dimming the rest; the dashboard's Charts widget drawing any registry chart by key with its newest value; a Trend sparkline column on the Bandwidth, Interfaces, Disk I/O, Disks, Pool I/O and Pools tables from the points the page's charts already hold; SeriesToggles, NetworkingChartCard and StorageHeader gone; the navbar and pages contracts, the English and Spanish keys, the fixtures, the storage fold scenario split per page, the feature steps and the unit tests following ([a63ba9c](https://github.com/STARTcloud/startcloud-ui/commit/a63ba9ccff9227dde2af2ab913d549e8c6414a30))
* the network path rail on the machine page, one row a vNIC through its port group or switch to its uplink and an aggregate's member links in a column of their own, each hop a hollow pipe as wide as the link's capacity filled by its live rate in the weathermap ramp, hyperweaver-ui's packets flown along the whole path each sized by its share of the live data and kept inside the pipe, one ringed tracer in fourteen, converging wires staggered or merged into one trunk, the chips at 1.5 scale carrying the vNIC, uplink, switch and aggregate lines with a down member drawn red, the rail measuring its card and stepping to compact, folded and small until it fits with nothing scrolling, a hop's chart and facts in its dialog, and the machine usage read in megabits; the catalog's Deploy probing the local agent and opening it on the provisioner_catalog hand-off, a modal to install the agent or join a server when none answers, the create wizard adding the catalog source and installing the provisioner inline before it goes on; the agent's provisioner catalog drawn as the catalog's own cards with Install; the provisioner card with its quality ring and tier, the passed and unmet rules linked to their guide, quality and versions per version with the boxes each provider points to and a paged version list; template sources keyed by id; the inbox live on every host from the one stream, the identity provider's stream on an idp host, the Rebuild row ending on its inbox notice with no timer; the manifest's launch_handler and the browser search over a host's collections; the deploy, events, identity, navbar and pages contracts, the English and Spanish keys, the mock, the fixtures, the feature steps and the unit tests following ([ed1d5e7](https://github.com/STARTcloud/startcloud-ui/commit/ed1d5e77ca56eb0565345fc5cb9f54a2f13672b2))
* the tray hand-off told to every open tab over the one channel, a ping each tab answers and the tray-opened tab closing itself the moment one does, the notification click focusing an open tab and moving it to the notice; Restart on every configuration page's heading beside Update, behind the typed confirmation, the pending card kept; BoxVault's old update-check reader and its notice gone, the Update entry on the one check alone; every chart of the host, Bandwidth, storage and machine pages described in one registry, no behaviour changed; the browser's chart store one record per sample in IndexedDB with range reads, history spliced under live, a trim from the newest held and a gap between samples two live intervals apart; a history read carrying since and until with no cap the UI made up, a window change reading the store and asking the agent once for the span it lacks, Refresh asking forward alone, one request per series however many cards draw it; the session, navbar, events, config and pages contracts, the fixtures, scenarios and unit tests following, and the asks written to the agents and the server ([fb993f0](https://github.com/STARTcloud/startcloud-ui/commit/fb993f0eb5e178c325dbfab9c02915c49f944597))

## [0.54.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.53.0...v0.54.0) (2026-10-05)


### Features

* BoxVault memberships read in the identity provider's one shape through accountMembership, display_name drawn by the switcher and the user menu, the two-shape chooser, loadOrganizations and renameActiveOrganization gone, the active organization keyed by uuid everywhere and the route name derived from the memberships; the agent's Devices page reading GET system/usb on a virtualbox host with the PCI body kept for every other host, a Media page under Storage behind media with Disks over GET media and ISOs over GET artifacts/iso while artifacts is listed, both reading once as the page draws, on a fresh stream and on Refresh; the mock's usb, media and artifacts/iso routes, its claimed membership answering the slug and the display name, the agent-media fixtures and feature, the host pages unit test, the console scenario and the user fixtures in the identity provider's shape, the navbar and session contracts, and the English and Spanish keys following ([34b3602](https://github.com/STARTcloud/startcloud-ui/commit/34b3602f4ad55f3a2dae708944382b5cd5dd0fa8))
* the agent sign-in as two doors, Login with SSO opening the authorization URL in a new tab and drawing the Continue in browser card with the provider's manual URL and Copy, a field for the pasted code#state handed to the agent with the flow's handle, Continue and Back, the approval read through the one held device-status request, the device grant offered to no person and its component gone, Login Locally as the desktop hand-off on a loopback page, Use an API key instead last, the silent probe behind the SSO, the active theme's glyph mark over the sign-in heading; a landing feature token, a signed-out visitor on a host that needs a session and does not list it sent to the sign-in page with the page as the return path once the session has answered, a one-click host drawing its pages as before; bare paths beside the auth paths, the device activation page drawn without the column and the app section on the identity provider; the setup gate and the redirect folded into one gate before the routes; the session, navbar and pages contracts, the fixtures, the dev mock, the unit and feature tests and the English and Spanish keys following ([57fc22d](https://github.com/STARTcloud/startcloud-ui/commit/57fc22d1ae27d018aca673c09300193f72320233))

## [0.53.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.52.0...v0.53.0) (2026-10-05)


### Features

* a small clock glyph beside the second-factor code, its tooltip Time Mismatch: ~00:00:00, drawn only while the browser's clock and the server's differ by one code period or more ([cda9e1a](https://github.com/STARTcloud/startcloud-ui/commit/cda9e1ac156145710a83eba9c8c0a4c30062d06d))
* importing hyperweaver-ui elements ([1f4d8c2](https://github.com/STARTcloud/startcloud-ui/commit/1f4d8c23704102ae5aad06b43d1b8e5100b05e35))
* the Controls menu in the header's account slot on host and machine routes with the user menu at the sidebar's foot, the machine power rows and the host power rows each one request and one notice with the stats read again on success, and the ported host action options ([2dfd071](https://github.com/STARTcloud/startcloud-ui/commit/2dfd071d23c0c3f5d58f05702ec97a266995a955))
* the Controls menu's pause, suspend, resume, NMI, guest power, application rows, zone lifecycle and bulk rows, the sidebar tree's right-click menu on the one ContextMenu with its danger dialogs, the Hosts group above Account with a child's row beginning where its parent's label begins, the organization filter with All organizations in the one switcher and a host named by its route drawn whole under any choice, the memberships read in the identity provider's shape with the active organization found by its uuid, the API reference row from links.api, the host Overview panels and the five performance charts on Apache ECharts growing by the monitoring topic of the events contract, the registry row read as entity_name, the development mock split into modules under scripts/mock, and the English and Spanish keys of them all ([c1013ab](https://github.com/STARTcloud/startcloud-ui/commit/c1013abfcbba406e6f8e8f0ea901b72acd1dc135))
* the converged footer with its pane under the row, the tasks table with its priority filter, Columns picker, Refresh and task dialog, the one Shell over a terminal source with terminal preferences, the footer's name the link to About and the version's third click the game, the health heart and the unread count read without a timer, the list of servers and each host's stats held once in the hosts feature's context with Refresh on its three pages, a tree node's revision asking its children again, the tasks and hosts topics of the events contract read by the pane, the dialog and the pages, the About text of the three hyperweaver roles, and a development mock of the hyperweaver family under scripts/ until a backend answers ([6426709](https://github.com/STARTcloud/startcloud-ui/commit/64267092d7f102b0c5c85ff1219265b5748d6569))
* the device sign-in flow in three presses, the activation page sending a signed-out visitor to sign in with the page and its code kept as the return path, the router handing it the session, the agent's held device-status request asked again on every pending answer with no focus listener, the activated tab closing itself, the return-path helper refusing a leading slash-backslash, activate off the cookie auth paths; the API key session keeping no user preferences, the browser's own timezone key, a pick of the shi theme writing ui.shi_mode through PUT /api/config/app, the user menu's Preferences row opening the local profile's preferences; the charts on one window select for every chart of a host and its machines with no resolution select, limit the window's samples at the agent's interval, a browser ring of samples in IndexedDB per host and series read since the newest held sample and trimmed past the widest window, the merge a union by entity and instant, the series providers answering a drawing caller from the copy they hold so a render that crosses an answer asks for nothing twice; the ten network pages, interfaces, topology, addresses, routes, bandwidth, links, spaces, hostname, hosts file and DNS, the host column naming configuration entries by their schema titles under one glyph, every sidebar child one 18px step right of its parent with a status dot filling a glyph's slot; VNC and xterm leaving every role's first load, the VNC display and dialog lazy, the xterm addons fetched on the first zlogin, the vnc and rdp chunks named; the hyperweaver mark, logo and header SVGs with a fixed near-black outline; the host controls toggle as the glyph alone with its words heading the menu, a dialog zoomed on a double-click of its header, the boot order rows unbounded, processes read at the agent's ceiling, the task kind out of search, the Update page drawing the release date, release notes and changelog, hyperweaver-agent in the release consumer matrix; the identity, session, navbar, events and pages contracts, the dev mock, the fixtures, the unit and feature tests and the English and Spanish keys following ([aea0ca1](https://github.com/STARTcloud/startcloud-ui/commit/aea0ca151fd10645206c8f17e558deb8397ae4ca))
* the hosts feature, the hosts token, the role deciding the serving mode and the agent addressing, the Hosts group and its tree in the sidebar, the hosts, host and machine pages read once and again on ready and reset, the hyperweaver theme pack, and the merge of hyperweaver-ui recorded in the navbar contract ([34978cd](https://github.com/STARTcloud/startcloud-ui/commit/34978cd6259aa7c1942c816c79a59c441e368b6f))
* the loopback authorization-code sign-in offered beside the device grant on an agent listing oidc-code, Sign in via SSO opening the agent's authorize URL in a new tab with the URL shown and copyable, the code pasted from the provider's code page as code#state handed to the agent with the flow's handle, approval read through the one held device-status request and the key proved and signed in with, the authorization-code page drawing the state joined to the code by a hash; every sidebar child one 18px step right of its parent with a status dot filling a glyph's slot, the tree scenarios asserting each entry's own padding; the identity and session contracts, the dev mock, the fixtures, the feature and unit tests and the English and Spanish keys following ([14022c2](https://github.com/STARTcloud/startcloud-ui/commit/14022c25961f68e3d5bce940a0fc5ba59244bf14))
* the navbar search band restored as built, the magnifier opening the field on click, hover dwell and Control+k, the gear sliding the filter panel with the scope chip and per-kind count pills inside it, Escape and the show-all link as before, under it the one search engine: the status's search member, one wire per host read local-first, the shared scorer, the kind table every feature exports, the /search page with cursor paging and the OpenSearch description per origin; every row-listing page bound to the navbar through useDetailSearch or useClientFilters with one filter group per enumerable column, date-range groups in useClientFilters, Service usage, API keys, the organization console's requests and invitations, the dashboard's hosts, blocked IPs, sessions and organizations among them; the host column drawn into the shell's column slot beside the one scroll region through ColumnContext, no sticky header, the body wrapper's min-height rule so the footer and its drag handles stay in the viewport; the apikey session keeping no user preferences, the record read without its preferred members, the time zone under the browser's own key, a pick of the shi theme writing ui.shi_mode through PUT /api/config/app; the user menu's Preferences row opening the local profile's preferences section wherever a local page exists; hyperweaver-agent in the release consumer matrix; the agent's notifications.md; the dev mock, the fixtures, the unit and feature tests and the navbar, session and preferences contracts following ([87d15d9](https://github.com/STARTcloud/startcloud-ui/commit/87d15d9d452a8f1a79b5d390911e7506e398f104))
* updating and prep work for hyperweaver-ui merge ([71371e7](https://github.com/STARTcloud/startcloud-ui/commit/71371e766d2f784b37e7e8587bb0a9c7dc2514a8))
* updating and prep work for hyperweaver-ui merge ([435bb6f](https://github.com/STARTcloud/startcloud-ui/commit/435bb6ffd54d4d5b8a6c9306825ee5c8a9bcd6f9))


### Bug Fixes

* some linting issues ([404b619](https://github.com/STARTcloud/startcloud-ui/commit/404b6192722185617385b26554b0d6452ba761f1))
* the hyperweaver theme pack, role as the package name and the serving mode it decides in the status payload, and the merge of hyperweaver-ui recorded as a decision ([70e24c1](https://github.com/STARTcloud/startcloud-ui/commit/70e24c1c0e88f4d3be93d6d116237c5004985282))
* updating dependenacies ([1cb7080](https://github.com/STARTcloud/startcloud-ui/commit/1cb708063ca6aa505d82e6b363a3cfb78ed74eb6))

## [0.52.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.51.1...v0.52.0) (2026-09-27)


### Features

* the theme is the pack and the mode is light, dark or the operating system's, one store for both, the browser keys mode and theme, the status brand.theme object and brand.themes list with no mode member, the pre-paint script reading preferred_mode and preferred_theme and stamping no mode on the served page, the Preferences page's Mode and Theme selects writing mode and theme, and every contract, locale and fixture renamed to match ([872055c](https://github.com/STARTcloud/startcloud-ui/commit/872055c66d4d1104c449196a9fc9cede0adbcd2d))

## [0.51.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.51.0...v0.51.1) (2026-09-27)


### Bug Fixes

* the pre-paint script resolves the operating system's scheme when it fails, never light, and the branding contract fixes the no-site-default rule and the SCIM preferences shape ([c8b5d9a](https://github.com/STARTcloud/startcloud-ui/commit/c8b5d9ab518cf6fc4b0e8748f0a91a5b29c96156))

## [0.51.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.50.0...v0.51.0) (2026-09-27)


### Features

* the profile owned by the backend and cached by the UI, read conditionally on its ETag and re-read on profile-updated and reset, the account's look applied in memory and never mirrored into the browser's keys, every sign-in awaiting one load on the bus before it navigates, an OIDC session on BoxVault kept and refreshed a minute before its own exp, the stream's ready saying whether it resumed, the footer's timer gone, sign-out reaching sibling tabs through storage, the pre-paint reading the cached record first, and the LCARS sidebar scrollbar on the left over a tan palette ([3e6f45f](https://github.com/STARTcloud/startcloud-ui/commit/3e6f45ffa7cf433b510d46e5ffdf7be3059c7405))
* the profile owned by the backend and cached by the UI, read conditionally on its ETag and re-read on profile-updated and reset, the account's look applied in memory and never mirrored into the browser's keys, every sign-in awaiting one load on the bus before it navigates, an OIDC session on BoxVault kept and refreshed a minute before its own exp, the stream's ready saying whether it resumed, the footer's timer gone, sign-out reaching sibling tabs through storage, the pre-paint reading the cached record first, the Name cell one link over org/name, and the LCARS sidebar scrollbar on the left over a tan palette ([717cdb5](https://github.com/STARTcloud/startcloud-ui/commit/717cdb5fecf096bda99cc725cf86df1ca9487f55))

## [0.50.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.49.0...v0.50.0) (2026-09-26)


### Features

* the LCARS pack trades its orange for tans, almond, almond-creme and tan spread one hue per zone across the readout, band, groups, cards and tiles, the row hover a plain tint, and every blink and pulse rarer and shorter ([6e4f87b](https://github.com/STARTcloud/startcloud-ui/commit/6e4f87b8e599ad8533db6ab2e7020ac5eda7947d))


### Bug Fixes

* stuff ([c66cb33](https://github.com/STARTcloud/startcloud-ui/commit/c66cb3366db27ae4dafa9162daa92175669dc7a5))

## [0.49.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.48.0...v0.49.0) (2026-09-26)


### Features

* the LCARS pack's fields sit on the panel surface with an accent border so they read on the black ground, and the sidebar's readout, foot, hover and second group with the header's bar segments take butterscotch, sunflower and orange from the palette ([6b3b4f4](https://github.com/STARTcloud/startcloud-ui/commit/6b3b4f4a198710515c8e7ff72f0b2ce24825c9d5))

## [0.48.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.47.1...v0.48.0) (2026-09-26)


### Features

* the LCARS pack's navbar carries the page band under its row so the page scrollbar starts below it, its menus paint over the page, the readout cap leaves the header row, the sidebar readout's corner hides the rows scrolling under it, thin scrollbars in the pack's colours, the canonical LCARS palette across sidebar groups, tiles, tables and controls, a light variant on a space-white ground, every blinking item steady under the pointer, and larger type for the condensed face ([a6443d0](https://github.com/STARTcloud/startcloud-ui/commit/a6443d0eff237041f07e81642191b06d5a779b4e))

## [0.47.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.47.0...v0.47.1) (2026-09-26)


### Bug Fixes

* the LCARS bars sit at the header strip's bottom so a banner or the search panel never breaks the elbow, the panel and the page band start on the same line, the crumb never grows the row, and the page content sits closer under its bar ([16cdf29](https://github.com/STARTcloud/startcloud-ui/commit/16cdf297d15d209d31ca3656421f1cc2edbe443d))
* the navbar's theme button cycles the variant alone, the look chosen on the profile's Preferences page, and the LCARS bars hold under a banner or the search panel with the panel and the page band on one line ([fff1da9](https://github.com/STARTcloud/startcloud-ui/commit/fff1da9619b5c0028d7ecde57be1a5d1645e770b))

## [0.47.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.46.0...v0.47.0) (2026-09-26)


### Features

* a pack may carry its own rules file nested under its data-brand attribute with its keyframes hoisted, the LCARS pack with its elbow, segmented sidebar, blinking lights, cascade readout and Antonio face over the header row's host name, version and hostname, a host naming no packs offering every pack of the build, the auth column preloading its own two faces, and the callback page's pre-paint reading preferred_theme ([d1fcbec](https://github.com/STARTcloud/startcloud-ui/commit/d1fcbec71c20a986d95754b6ecc0ed9062953c7f))

## [0.46.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.45.0...v0.46.0) (2026-09-26)


### Features

* one theme pack shape for every brand and product with its own label, description, brand, mark and link hover, the generator refusing a pack that leaves a key out and writing the packs manifest the UI completes brand.packs from, the theme menu and preferences offering Follow this site beside auto, light and dark, and the Super.Human.Installer and Super.Human.Portal brand folders and packs ([3f47959](https://github.com/STARTcloud/startcloud-ui/commit/3f479594adfb35265a9a6d7387463f671119f65f))
* the Super.Human.Installer and Super.Human.Portal brand folders and their shi and shp theme packs ([74d31df](https://github.com/STARTcloud/startcloud-ui/commit/74d31dfc9b27e070dea948f1ae99ca6c2e1089e3))

## [0.45.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.44.0...v0.45.0) (2026-09-25)


### Features

* a Group by group in the filter panel picks the field a listing groups by, every pack names its link color per variant with its hover a complement of it, the sign-in and error cards draw the brand wordmark, a signed-out visitor with nothing to see gets the sign-in placard, and the panagenda vendor mark and wordmark ship under public/brand/vendors ([5f67be9](https://github.com/STARTcloud/startcloud-ui/commit/5f67be945f5f06863bdaf8c000a3726f90f86606))


### Bug Fixes

* the user record page draws a column without a render from its value instead of throwing on the Name row ([0fe0e4e](https://github.com/STARTcloud/startcloud-ui/commit/0fe0e4e434c0a43a251498f1046924628603118e))

## [0.44.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.43.0...v0.44.0) (2026-09-25)


### Features

* every pack names its link color per variant so hyperlinks follow the brand ([24ec65b](https://github.com/STARTcloud/startcloud-ui/commit/24ec65b1f686dbbbfc2a1fb13459ad9bb7f9cadd))

## [0.43.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.42.0...v0.43.0) (2026-09-25)


### Features

* the provider mark on the filled sign-in button is painted in the pack's on-primary color through a generated icon filter, white on Prominic and black on the light accents ([4965173](https://github.com/STARTcloud/startcloud-ui/commit/4965173a0e91986e121118779e46b150be92c68d))


### Bug Fixes

* ci/cd ([7d4dc9b](https://github.com/STARTcloud/startcloud-ui/commit/7d4dc9bfbf741bc75120ba9c993e02cc08400c9d))
* the session-ended banner carries no Sign in button on any page, the ticket link leaves a null customer out and carries the host's context, and the site's own show_mark switch draws the mark on every visit beside the client's ([810bcc9](https://github.com/STARTcloud/startcloud-ui/commit/810bcc906e33d64d71674f0393431865c74da6e9))

## [0.42.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.41.0...v0.42.0) (2026-09-25)


### Features

* the sign-in page hides Keep me logged in while the client hides it and draws the site's mark above the heading while the client shows it, the file rows carry a download icon and a copy-link icon with tooltips, a downloads file may be a link with a source URL beside its name, the listing groups a level by the field the host's status names beside its sorts with family sub-headers in both views and the lone organization header gone on a one-organization host, one table of the client's sign-in switches in the identity contract, the shared-ui tests job points at its own preview server, and Playwright and playwright-bdd move to 1.63.0 and 9.2.1 ([8007624](https://github.com/STARTcloud/startcloud-ui/commit/8007624d8455400442a87d5b8bfc549681c92c8a))

## [0.41.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.40.0...v0.41.0) (2026-09-25)


### Features

* one test system for the shared UI, Vitest unit tests with coverage and Gherkin scenarios run by Playwright over the built app and a fixture host, the reusable tests workflow every repository calls from its ci.yml, the pack's display face on the brand name and headings and every Bootstrap primary control following the pack, the provider mark on a disc of the button's foreground, and the exact Playwright and playwright-bdd pair pinned ([8616ff2](https://github.com/STARTcloud/startcloud-ui/commit/8616ff2af43c41837bee206b29793c7379a974b5))
* the sign-in page hides Keep me logged in while the client hides it and draws the site's mark above the heading while the client shows it, the file rows carry a download icon and a copy-link icon with tooltips, a downloads file may be a link with a source URL drawn beside its name, one table of the client's sign-in switches in the identity contract, and the shared-ui tests job points at its own preview server ([e0d32df](https://github.com/STARTcloud/startcloud-ui/commit/e0d32dfd74b865dd37532d194fcd796d51124f0d))

## [0.40.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.39.0...v0.40.0) (2026-09-25)


### Features

* every router page loaded as its own chunk behind lazy, the route names and shapes the router reads kept in small modules beside the pages, and the testing contract settled on Playwright, playwright-bdd and one unit runner per class ([47fa8a0](https://github.com/STARTcloud/startcloud-ui/commit/47fa8a01df07f2e74f7334493fc8aeab011edc43))


### Bug Fixes

* updating testing and identity loading for lazy laod split wrok ([8ab70f8](https://github.com/STARTcloud/startcloud-ui/commit/8ab70f8c650c803ae9559cdde5dbbcf1656d2826))

## [0.39.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.38.0...v0.39.0) (2026-09-25)


### Features

* every brand and product mark as one SVG under public/brand/&lt;name&gt;/ with a header beside it, each painting its own light and dark through light-dark(), the theme pack naming its mark by root path, the favicon, the Powered-by mark and every BrandLogo drawn from that one file, a web app manifest, the push worker installing with the build's version in its query and dropping the previous version's cache, and a Reload banner when a new version of the site is ready ([6037202](https://github.com/STARTcloud/startcloud-ui/commit/603720289f2d2c44b49e22fa3bb66f6a3b3c3695))
* every brand folder carrying its 64, 192 and 512 icons and small logo rendered from its own SVG, the web app manifest and the touch icon naming them, and the manifest answered per host so an installed site carries its own name and mark ([78a63c9](https://github.com/STARTcloud/startcloud-ui/commit/78a63c9ea89b78724f079fd7bace748de400354d))


### Bug Fixes

* removing notifications.md ([c0ff23f](https://github.com/STARTcloud/startcloud-ui/commit/c0ff23fa2f954b191bcca9308b1469b88b22df56))

## [0.38.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.37.0...v0.38.0) (2026-09-25)


### Features

* every column carrying a priority its kind seeds, the one table measuring what its columns need and folding the lowest priority first until the rest fit whole, a chevron at the start of every line opening the folded columns as label and value pairs under it, the organization in front of a name folding before any column, the leading columns of the home page's tables sharing one width, the Language column drawn only while a file names a language, a download product's details as a Details card on its page and a textarea on its edit and bulk Edit forms, families as their own pane with add, edit and delete, the family offered as a pick in the product and bulk forms, the family's description under the links on the product page and under each family heading of the organization's downloads grouped by family, and a Sort group of pills in card view ([e258b3e](https://github.com/STARTcloud/startcloud-ui/commit/e258b3e5e9baedef391a7fd8e91f8d4950ef0de9))

## [0.37.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.36.1...v0.37.0) (2026-09-23)


### Features

* every table opening on the host's per-site sorts before its own default, the status payload's sorts member read per collection and level on the listings and on the versions, patches and files tables, and the navbar and pages contracts naming it ([dab3145](https://github.com/STARTcloud/startcloud-ui/commit/dab3145b98153d3ffea7c7dc1a01b38e00dc9664))

## [0.36.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.36.0...v0.36.1) (2026-09-22)


### Bug Fixes

* some things ([9b6f8c2](https://github.com/STARTcloud/startcloud-ui/commit/9b6f8c28cb24302f44725ee95efd4a8eca02bb26))

## [0.36.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.35.0...v0.36.0) (2026-09-22)


### Features

* every table column sorting by the value it shows through one natural compare, the flex room split by the content of each column, the Columns pills listing only the columns drawn, the username first on the Logins and Registrations tables, the release and latest-release dates drawn from the dates the host answers, every card opening its item from anywhere on the card with the star, links and actions as their own targets, the card showing its vendor and family under the name, its description, its count of releases and how long ago the host says it last released, the file line's Visibility and Status as icon menus with Edit, Move to and Delete folded into one More menu, the watch star held from a guest-only account on the item page as it is on the listing, and the issuer's sign-in answers emitting login only where the page stays in-router so the login page never redraws as the profile while the browser leaves for the authorization endpoint ([c5a38e1](https://github.com/STARTcloud/startcloud-ui/commit/c5a38e1604a6ecf4a73aafc00ab970e0d0a1c6c0))

## [0.35.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.34.1...v0.35.0) (2026-09-22)


### Features

* every table column sorting by the value it shows through one natural compare, the flex room split by the content of each column, the Columns pills listing only the columns drawn, the username first on the Logins and Registrations tables, the release and latest-release dates drawn from the dates the host answers, every card opening its item from anywhere on the card with the star, links and actions as their own targets, the card showing its vendor and family under the name, its description, its count of releases and how long ago the host says it last released, the file line's Visibility and Status as icon menus with Edit, Move to and Delete folded into one More menu, and the watch star held from a guest-only account on the item page as it is on the listing ([f71beb3](https://github.com/STARTcloud/startcloud-ui/commit/f71beb3411fbfd68948c9cb9b583b19ec43a14ce))

## [0.34.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.34.0...v0.34.1) (2026-09-22)


### Bug Fixes

* hyperweaver glyph placement ([1368809](https://github.com/STARTcloud/startcloud-ui/commit/13688091046928026a63e28d708f0ba9a6e4060d))

## [0.34.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.33.0...v0.34.0) (2026-09-22)


### Features

* every table column sorting by the value it shows through one natural compare, the flex room split by the content of each column, the Columns pills listing only the columns drawn, the username first on the Logins and Registrations tables, the release and latest-release dates drawn from the dates the host answers, every card opening its item from anywhere on the card with the star, links and actions as their own targets, the card showing its vendor and family under the name, its description, its count of releases and how long ago the host says it last released, and the file line's Visibility and Status as icon menus with Edit, Move to and Delete folded into one More menu ([005feb5](https://github.com/STARTcloud/startcloud-ui/commit/005feb5004da212f03a04e62645515a49a011b77))

## [0.33.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.32.0...v0.33.0) (2026-09-21)


### Features

* every table column sorting by the value it shows through one natural compare, the flex room split by the content of each column, the Columns pills listing only the columns drawn, the username first on the Logins and Registrations tables, the release and latest-release dates drawn from the dates the host answers, every card opening its item from anywhere on the card with the star, links and actions as their own targets, the latest release, its age and the provider, platform and kind chips on every card, and the file line's Visibility and Status as icon menus with Edit, Move to and Delete folded into one More menu ([4505ec5](https://github.com/STARTcloud/startcloud-ui/commit/4505ec56108a094886a0fd446d5e20b9edf8743d))

## [0.32.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.31.1...v0.32.0) (2026-09-21)


### Features

* every opening visibility and publish action a split button whose caret offers the same act with everything beneath, on the action bars, the file lines and the bulk pane alike, the loose cascade checkbox kept for the edit forms alone; the notifications bell and inbox withheld from a guest-only account; the Account column's Inbox row renamed Notifications; and the organization logo drawn on the profile's memberships and before every name on the All organizations table ([d55fe0b](https://github.com/STARTcloud/startcloud-ui/commit/d55fe0bd96720da583bf765dce4272686e9fc267))
* the downloads bulk row growing Set values, Move to and Reconcile visibility beneath through one dialog slot, the same Move and Reconcile on the product, release and patch bars and Move on every file row, the cascade check beside the visibility radios of the three edit forms, a Duplicates view under an organization's downloads listing every file whose checksum another carries, one body extension on every collection's bulk call, the Visibility and Status columns drawn for a viewer who manages the rows alone, link columns sharing the table's width and the file language a closed-list word, the family drawn once on a card and the vendor once on a product page, and the watch star centred on the title ([fe0b5e1](https://github.com/STARTcloud/startcloud-ui/commit/fe0b5e13aee73318e8dff8f70ae0f6e9f7948786))

## [0.31.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.31.0...v0.31.1) (2026-09-21)


### Bug Fixes

* adding some Icons and hiding ui elements on certain auth clients ([1e2e0e1](https://github.com/STARTcloud/startcloud-ui/commit/1e2e0e13074be377dcc2dc440218a8076543983d))

## [0.31.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.30.0...v0.31.0) (2026-09-20)


### Features

* descriptions, readmes and release notes drawn as markdown with every link in its own tab, the vendor standing where the organization did with its own mark in place of the organization's, cards carrying the row's family, count and newest release, the published and guests badges kept for a viewer who may write the row, no watch star for a guest-only account, and the downloads column hidden where no row carries a count ([c021d34](https://github.com/STARTcloud/startcloud-ui/commit/c021d34d6518678ba0b128de599c60b571df0ee0))
* visibility travels down the tree, one cascade check beside every opening action and the bulk bar's opening verbs sending recursive, the item pages' publish buttons converged onto the shared step, a blank member that is not required never validated, the admin preferences form without the PIN, Ctrl+F opening the navbar search, and the record page's Two-factor card over the admin read ([2842073](https://github.com/STARTcloud/startcloud-ui/commit/2842073e66606098f69e13ff52f0fdc8673459a2))

## [0.30.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.29.0...v0.30.0) (2026-09-20)


### Features

* a blank member that is not required is never validated so an optional select on its blank choice saves, the admin preferences form without the PIN the person alone holds, Ctrl+F opening the navbar search outside any field, and the record page's Two-factor card over the admin read with Remove on SMS and APP methods alone ([49086cf](https://github.com/STARTcloud/startcloud-ui/commit/49086cff1c1ce9f5a4a47237b8e12300af1bb688))

## [0.29.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.28.1...v0.29.0) (2026-09-20)


### Features

* a guest-only account read-only on itself, the issuer's profile drawn without write sections, the Account column its Profile row alone and no team to create ([68858ba](https://github.com/STARTcloud/startcloud-ui/commit/68858ba5bfdd95c7af0fca3273cbdbc046d67d30))
* an admin edits another account on its record page over the issuer's live routes, the details, address, phone, email dialog and preferences cards bound to the id and stepped up, the password change required switch, the cards absent on the admin's own record, the guest-only account's preferences kept in the browser as the issuer now refuses its writes, the invite page naming the wrong signed-in address, and the Last used column on the service accounts table ([c290533](https://github.com/STARTcloud/startcloud-ui/commit/c290533b722677b66afcbd067608d11d17b59764))
* every row action bar paints the validation contract's sentence for a refused write through one refusalMessage helper, the withinParent rule codified with the parent's word and read as the disabled title of the visibility step and of Publish under a pending parent, the three access words on box architectures, ISO files and download files with badges, the small step and Publish on their rows bounded by the row above, the box row writing its architecture then its file, the upload zones born with the picker's pair as query members, one ROW_BULK of the six verbs and the delete on every level but the versions, the orphaned locale keys removed, and a Last used column on the service accounts table ([0c69195](https://github.com/STARTcloud/startcloud-ui/commit/0c69195ed0bd30a162b6f5c1b6c0f27a7892e915))

## [0.28.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.28.0...v0.28.1) (2026-09-20)


### Bug Fixes

* the onboarding hub following a gate's next or going home on not_pending instead of spinning, and its password subhead drawn only once the state names that step ([f94ef80](https://github.com/STARTcloud/startcloud-ui/commit/f94ef804c80c74cd1ca659c228d2cff6b5f2ee52))

## [0.28.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.27.0...v0.28.0) (2026-09-20)


### Features

* the sign-in page's identity providers as a three-column grid of tiles from three on, the default provider kept as the one filled button ([fe1fb7d](https://github.com/STARTcloud/startcloud-ui/commit/fe1fb7d929fdaa8b0d35577c232f8ea9f9b11095))

## [0.27.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.26.0...v0.27.0) (2026-09-20)


### Features

* the login page beginning the sole enabled provider at once with no chooser drawn, under the silent attempt's own guards ([db5f3e5](https://github.com/STARTcloud/startcloud-ui/commit/db5f3e585a0eaaaa2767cc8f17ce2c6aad76bdf2))

## [0.26.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.25.0...v0.26.0) (2026-09-20)


### Features

* one visibility step button on the box, ISO and product pages, stepping Private, Guests and Public with its label naming the next state, in place of the two-way Make public button and the box page's missing one ([5b39a55](https://github.com/STARTcloud/startcloud-ui/commit/5b39a55c81e4b87f37967d62f4d0a7e8167f36cc))

## [0.25.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.24.0...v0.25.0) (2026-09-20)


### Features

* the account cluster in one order in both states, search, Discover, the ticket icon, theme, language, then the account menu or Sign in, and the branding contract naming the issuer's branding endpoint as the source of a federated host's pack ([c0d2251](https://github.com/STARTcloud/startcloud-ui/commit/c0d22517542c15a2c37ebadf275933ca7190a4d0))
* the Browse tree behind the browse token or the admin role, collection glyphs as components, crumbs from the route alone with no root crumb beside the column, the Catalog group and Home row gone ([5426781](https://github.com/STARTcloud/startcloud-ui/commit/5426781377bc132a0c4fdf0c6ddef9e25c2aecc1))
* the startcloud pack as the shared UI's base look under its name, a pack named per host in each backend's own config and never fetched from the identity provider ([f8be90a](https://github.com/STARTcloud/startcloud-ui/commit/f8be90adf227a19550325a0bb2dc39b20ae5ce97))


### Bug Fixes

* adding a default named entry for themeing ([3cf2fad](https://github.com/STARTcloud/startcloud-ui/commit/3cf2faddee0c6b04d69849b54911ee8d6536835a))
* more linting ([7542457](https://github.com/STARTcloud/startcloud-ui/commit/7542457f7cd53cb241a8754be204f548e6ea8a71))

## [0.24.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.23.0...v0.24.0) (2026-09-20)


### Features

* every BoxVault answer read in snake_case only, the adapters, the upload chain, the backend session and its stored profile, the profile, org console, discovery, admin and notification readers following, the UI's own item shape unchanged ([bb66046](https://github.com/STARTcloud/startcloud-ui/commit/bb660466bf7967ff5678581139f40c763cb49e53))
* notification rows read in snake_case, read_at and created_at on the inbox page, the list and the modal, and the second-factor posts sending tfa_method and authenticator_id, the identity contract following ([90fe45e](https://github.com/STARTcloud/startcloud-ui/commit/90fe45efaecd6aa2a180e775bc097d9a49b10776))
* notification rows read in snake_case, read_at and created_at on the inbox page, the list and the modal, the identity contract's exception retired ([08a5b6c](https://github.com/STARTcloud/startcloud-ui/commit/08a5b6c49e278352acda549d9f8f301d7386901e))
* the authenticator page's method query as tfa_method, matching the issuer's redirect ([95a4739](https://github.com/STARTcloud/startcloud-ui/commit/95a4739fea3e0df3862b384e728899dc6314d5c1))

## [0.23.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.22.0...v0.23.0) (2026-09-19)


### Features

* the status payload read in snake_case only, logo_url, client_id, storage_prefix and the ticket members, the contracts and README following ([a18bb3a](https://github.com/STARTcloud/startcloud-ui/commit/a18bb3a1fb1dff45db3f126f8d30f82124b57d48))

## [0.22.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.21.0...v0.22.0) (2026-09-19)


### Features

* the sidebar column and the search surface each behind a feature token, the Home row and client-side search gone, the Mail Test on every provider card through a map item action, the About page drawing the host's community links, every collection listing at its own root with separate preferences and a remount on collection change ([20fb121](https://github.com/STARTcloud/startcloud-ui/commit/20fb12165104d52bffbe41d27d9e4e9cb723d3b9))

## [0.21.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.20.0...v0.21.0) (2026-09-19)


### Features

* guest access as one three-value visibility control, chip, filter and bulk verbs with counts kept null for a guest, the service-account role from the host's rules and its section gone for a guest-only account, downloads defaulting to cards, the Name cell the item name alone, a catalog sidebar tree that opens to the route, the inbox on the shared table with the list hook shared, one empty-state placard everywhere, Discover and one ticket icon in the navbar with Sign in hidden on every auth path, a user record page over a single read with the crumb named by the page, the deploy glyph as a column after Name and bare in the strip, org logos on the profile memberships, one global-admin predicate, and the contracts and mocks rewritten to match ([6fe4e53](https://github.com/STARTcloud/startcloud-ui/commit/6fe4e5379a3c218e52cbf6ab8b646a337e0cbe50))

## [0.20.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.19.0...v0.20.0) (2026-09-18)


### Features

* every column styled by its kind, the flex kinds sharing the table's width, the Name cell folding its organization by its own width, Download the first action of every file row, provider rows badges with a summed count, one details form on every host drawn from the host's rules with the mobile as a field or through a code, and the local BoxVault account writing its name parts, address and number ([3a2633a](https://github.com/STARTcloud/startcloud-ui/commit/3a2633a7c2fc2739563cf2ae915dfa7e4819bc90))
* one profile page on every host, the record's mutability on the adapter, the identity provider's fields read-only with a Manage at identity provider link on an issuer session, the service accounts in the one table grouped by organization, and a kind on every identity table column ([0bec172](https://github.com/STARTcloud/startcloud-ui/commit/0bec172552fb9d5176dc81e0b23925847cd96637))


### Bug Fixes

* linting and formatting mistakes missed ([00141cc](https://github.com/STARTcloud/startcloud-ui/commit/00141cc78f8e67dc1f46d0d69ec94244e88c54e6))

## [0.19.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.18.4...v0.19.0) (2026-09-18)


### Features

* one profile page on every host in the issuer's shape with organizations and service accounts as adapter sections, the identity users and organizations pages over an adapter drawn by BoxVault, every table column declaring a kind that fixes its width and place, the session and identity contracts deferring to the specs they cite, a catalog refresh in flight once and ended only by invalid_grant, and the backend provider's own reads through the shared client ([247c97b](https://github.com/STARTcloud/startcloud-ui/commit/247c97ba9b0437b37a50458c3cdc677b04e3db87))


### Bug Fixes

* the manage-at-provider sidebar row gone, Update as a button, favorites read once the page leaves the auth paths, the Name cell folding its organization below 60rem, one Name column on the files table, a config action on a subsection drawn at its head and no empty section card ([488902d](https://github.com/STARTcloud/startcloud-ui/commit/488902dac98d80c9e841966b34b6505d12eab1c5))

## [0.18.4](https://github.com/STARTcloud/startcloud-ui/compare/v0.18.3...v0.18.4) (2026-09-16)


### Bug Fixes

* every table column fixed on a colgroup with a trailing spacer taking the leftover width, so Boxes, ISOs and Downloads line up cell for cell whatever is hidden and a resized column moves the spacer alone ([8c835ef](https://github.com/STARTcloud/startcloud-ui/commit/8c835ef5cfdad3c43ff975e8dfa7af7b972b4d88))

## [0.18.3](https://github.com/STARTcloud/startcloud-ui/compare/v0.18.2...v0.18.3) (2026-09-16)


### Bug Fixes

* the placing form refuses a blank level, key or file name before sending, its selects sit at the text fields' width, and no checksum draws as None instead of NULL on the download and box forms ([3668ed2](https://github.com/STARTcloud/startcloud-ui/commit/3668ed2a0b01db814bf51b8b0ce3cd2c6604b34f))

## [0.18.2](https://github.com/STARTcloud/startcloud-ui/compare/v0.18.1...v0.18.2) (2026-09-16)


### Bug Fixes

* a step-up keeps the person on the sign-in page, the live session no longer sent home, so prompt=login and an expired max_age reauthenticate and the parked authorize request is followed ([e900265](https://github.com/STARTcloud/startcloud-ui/commit/e90026581a27336749646088f92a6f03773ddf54))

## [0.18.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.18.0...v0.18.1) (2026-09-16)


### Bug Fixes

* the email template site picker reads the site map where it lives, under the sites key of the sites file, labelled by the site's name or company name, the offline example nested the same way ([a2282bf](https://github.com/STARTcloud/startcloud-ui/commit/a2282bf0e32b21db5867581b5e71256814093042))

## [0.18.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.17.0...v0.18.0) (2026-09-16)


### Features

* one table component draws every table of the estate with resizable columns kept per page, the consent page drawing the scopes already granted read-only and approving details alone, the default email template copy never deleted, the issuer's memberships carrying the org logo and email hash ([913d495](https://github.com/STARTcloud/startcloud-ui/commit/913d495b9fe79a7d568a17ec14cb1ff2fc8aaa3a))

## [0.17.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.16.0...v0.17.0) (2026-09-15)


### Features

* a download drop lands the bytes in a pending store and the placing form follows it under the heading row, no file versioned by a hash in its name or its query, the pack generator writing one css file, guest and the profile routes in the mocks, the mock issuer and its script gone ([05a6df3](https://github.com/STARTcloud/startcloud-ui/commit/05a6df3d52ccbd392ec0b96a5c1b632144adb069))
* email templates as documents of the issuer, one card per kind with copies per site and language, the copy dialog with argument chips, the HTML body and its sandboxed preview, history and publish, the Messaging group beside Legal, decision 164 and its mock frame ([0d26032](https://github.com/STARTcloud/startcloud-ui/commit/0d26032c7920bada4c5c0f9b57e5fa4e0ace2916))

## [0.16.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.15.0...v0.16.0) (2026-09-15)


### Features

* no file of the estate versioned by a hash in its name or its query, the pack generator writing one css file and nothing beside it, the download upload polling the address the last chunk names, guest and the profile routes in the mocks ([dd22e02](https://github.com/STARTcloud/startcloud-ui/commit/dd22e022f6e06e9a2c1080393c14c8af52986014))
* the prominic brand pack, the asterisk as its mark and the wordmark for the small slot, listed as the fifth pack in the branding contract ([efbd3f6](https://github.com/STARTcloud/startcloud-ui/commit/efbd3f63acdc18d4c9f14ff81d2205e7a9f0be16))

## [0.15.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.14.0...v0.15.0) (2026-09-15)


### Features

* downloads as a fourth collection on the shared pages, product to releases to patches to files with a file address, one add per page opening the upload zone relative to where it sits, inline edit forms, a select column and bulk pane on every table with Remove All gone, registry levels and bulk, the fifth route part, per-host status, format date and the download forms, the mock frames ([33c7dd5](https://github.com/STARTcloud/startcloud-ui/commit/33c7dd59c1d8b6fef763f2b319f24d4ee5bc9eec))
* the terms and onboarding gate followed on the first refusal from any route, no gated call on the gate pages, the refusal never shipped as a client error, the pager as a section foot with a Per page group, row menus never clipped, the Elsewhere results foldable, maps inside dialogs as plain rows ([1f4557b](https://github.com/STARTcloud/startcloud-ui/commit/1f4557b8dfa58ec21ac8bcb79ba460dea03e88dc))

## [0.14.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.13.0...v0.14.0) (2026-09-14)


### Features

* add the bootstrap sign-in and invitation pages, send the first email code on mount and carry the amended contracts ([2f43867](https://github.com/STARTcloud/startcloud-ui/commit/2f4386746b60b466ce3006e4deffbe10c98b9745))
* bulk actions on users, organizations, sessions, blocked addresses and terms, mark as unread, console member and invitation selections with resend, favorites removal, the phone field as a form control ([1987761](https://github.com/STARTcloud/startcloud-ui/commit/1987761235e029ebf9b4be786827ce99535af747))
* console crumbs through the Organizations row, terms callouts as cards, the avatar unread badge, the file's title as the configuration heading, one frame for every account page, fold chevrons on the right ([df9b44b](https://github.com/STARTcloud/startcloud-ui/commit/df9b44b4be9e5f6c71b2ed64267450bf1ea7cfd9))
* form dialogs at the xl metric grouped by the schema's sections, list dialogs at 720px, every search kind of the issuer drawn and routed ([dc09c3c](https://github.com/STARTcloud/startcloud-ui/commit/dc09c3ca226c42c0b4825450c14ec1f02e868c98))
* forms in cards and lists glass on every page, the configuration parent folds only, the System heading over its tree, terms regions, wider terms pages with the profile's address block, one clipboard copy ([93bc352](https://github.com/STARTcloud/startcloud-ui/commit/93bc3528cefd1326d25ca29639a2948f33c3eb57))
* linked accounts on security, applications and terms pages, integrations for third-party services alone, the directory-driven join with the console following the switcher, the admin's organization edit dialog ([a1ccd3b](https://github.com/STARTcloud/startcloud-ui/commit/a1ccd3bc46133fa2139fb57e1de4f3441905e12e))
* one heading row per section with the action pane at its right, the select-all a real checkbox, no icons in headings, terms regions and country codes, login after the second factor, one PIN control, the avatar card on the profile alone ([82fa84c](https://github.com/STARTcloud/startcloud-ui/commit/82fa84c639c9b40505bc2dc0ad126b2eb080cf5e))
* one heading row per section with the action pane at its right, the select-all a real checkbox, no icons in headings, terms regions and country codes, login after the second factor, one PIN control, the avatar card on the profile alone ([afdba08](https://github.com/STARTcloud/startcloud-ui/commit/afdba08bcd4865e65892add23d9efd983f1d8361))
* packs emit their rgb triples so the chrome follows the site, admin narrowing mirrored in the URL through one hook, step-up on the enroll read, client-error entries in one shape, client health under the view toggle ([c5a88fd](https://github.com/STARTcloud/startcloud-ui/commit/c5a88fd44ca3c41c6bdcdbcb61e2ba0dc3a732bd))
* profile tabs as sidebar child rows, version chips on About, client-health probe members, placeholder and readOnly leaves in the config editor, flags from the sprite, Places as a plain script, TOTP entry and insights glyphs on the issuer ([734778b](https://github.com/STARTcloud/startcloud-ui/commit/734778bd2ebb9e404e5b34fe93865d1d414becb8))
* revisions under a copy's version on the legal terms page, save as a revision or publish a version, history with every revision readable ([8db3544](https://github.com/STARTcloud/startcloud-ui/commit/8db3544b63083fc960a024e6586609948e42bb8d))
* startcloud pack, need-help and support labels, accent links and centered auth column, password outline, 720px scrolling dialogs, favorites icon chain, Preferences and ticket rows, insights rework, restart confirm keys and one chrome row height ([16e5c40](https://github.com/STARTcloud/startcloud-ui/commit/16e5c40182da73f70e24141a271736981027bdd6))
* style every element by class, forbid the style prop in lint and answer the issuer's CSP questions ([797f15f](https://github.com/STARTcloud/startcloud-ui/commit/797f15f5acf94c0691020772219fd2a267ee2b2c))
* the pager as a centered section foot, a Per page group in the filter panel kept in prefs, row menus escaping the table wrap, maps inside dialogs as plain rows ([c25553d](https://github.com/STARTcloud/startcloud-ui/commit/c25553d9890a603bb1b7970128c80dcb3baabbff))
* the pager as a foot at the bottom of the section, a Per page group in the filter panel, row menus never clipped, the Elsewhere results foldable, maps inside dialogs as plain rows ([7b68f82](https://github.com/STARTcloud/startcloud-ui/commit/7b68f825fea1f41571b608591018bd84aeb88b59))
* the region as a flagged button opening a picker, site terms in the same chain, terms_required handled like onboarding, version history with what changed, legal documents with their copies inside, orderable term lists in the config editor ([b8a697e](https://github.com/STARTcloud/startcloud-ui/commit/b8a697e5749770875a7ce84faeaf9f2d5fd2867c))
* the signed-out cluster and the issuer's menu as law, flags from the sprite, the panel inside the header row, one filter group per enumerable column mirrored in the URL, one prefs object per table, the current session marked ([84da8b3](https://github.com/STARTcloud/startcloud-ui/commit/84da8b3262e24c94127eab3f3ffd1d1ffd57708f))


### Bug Fixes

* map cards draw ordered leaves at any depth, the item dialog scrolls inside, duration and ttl controls, profile children without a duplicate, child-route crumbs, no empty app section on the issuer and a dark variant with four surface steps ([d2343da](https://github.com/STARTcloud/startcloud-ui/commit/d2343dabd696e723fabb1644a8efcad4b5407fba))
* name the placeholder rule's message and let the cookie session reload without a navigate ([86960fc](https://github.com/STARTcloud/startcloud-ui/commit/86960fc5bb3ba02d604b89eb6b504429a90b4b7f))
* terms order written by id, one stream per tab held across route changes ([b25cb56](https://github.com/STARTcloud/startcloud-ui/commit/b25cb56049ec1086d4fc84103315c8508309682d))
* the auth server's five requests, contract first ([dc3f35a](https://github.com/STARTcloud/startcloud-ui/commit/dc3f35a73b4547f0c9746d5c4654c7496f61a900))

## [0.13.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.12.2...v0.13.0) (2026-09-11)


### Features

* brand links home on every host, root crumb, no lone tab strip ([83a21ba](https://github.com/STARTcloud/startcloud-ui/commit/83a21bab5f285eea00662de498c96b39fc61df61))

## [0.12.2](https://github.com/STARTcloud/startcloud-ui/compare/v0.12.1...v0.12.2) (2026-09-10)


### Bug Fixes

* events and session contracts met line by line, the keepalive follows the adopted session, language stored under one key ([01d531e](https://github.com/STARTcloud/startcloud-ui/commit/01d531e0cc201facfb532828cca290fdea98d829))

## [0.12.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.12.0...v0.12.1) (2026-09-10)


### Bug Fixes

* events and session contracts met line by line, the keepalive follows the adopted session, language stored under one key ([0fdb0f1](https://github.com/STARTcloud/startcloud-ui/commit/0fdb0f1e5f267d1b9074eb44ceb374b77c480198))

## [0.12.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.11.0...v0.12.0) (2026-09-10)


### Features

* the configuration editor built to the settled config contract, the generic map, action components, the shared restart card, the empty state, merge-patch saves, the setup states, and the fixture and visual reference ([7c710d2](https://github.com/STARTcloud/startcloud-ui/commit/7c710d2fa63be4363bc3427b94e73dd0184671c5))

## [0.11.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.10.1...v0.11.0) (2026-09-09)


### Features

* VDI Health sidebar tree with pool and session views, tree crumbs, query-driven fleet filters, and the registry types for gateway, configuration and method faults ([a9d68ed](https://github.com/STARTcloud/startcloud-ui/commit/a9d68ed6d900bcd240d116f3742d20bd83396c25))


### Bug Fixes

* codeqlwarning and docs ([ce71064](https://github.com/STARTcloud/startcloud-ui/commit/ce71064ce3a092652c36d15019a379c80b497b31))
* docs ([641420b](https://github.com/STARTcloud/startcloud-ui/commit/641420b307cd3fc8d63cb2ad125d7b3287951cd1))

## [0.10.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.10.0...v0.10.1) (2026-09-09)


### Bug Fixes

* CI/CD ([14f3079](https://github.com/STARTcloud/startcloud-ui/commit/14f307934e9a86787d629ceaf2ae77cce08bdbf1))
* CI/CD ([7997efc](https://github.com/STARTcloud/startcloud-ui/commit/7997efc5af5fb910874d66089dcda14e6aa93e7d))

## [0.10.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.9.0...v0.10.0) (2026-09-09)


### Features

* apply the contracts across the audit, chrome-owned focus ring, versioned ISO leaf, feature import boundary ([b84c691](https://github.com/STARTcloud/startcloud-ui/commit/b84c691e8beafef272819bfe66d3bc5b6d7aed7c))
* close the identity gap audit, in-router cookie provider, step dot labels, organizations under the shared view toggle, per-host push paths with the issuer entry ([09e35a2](https://github.com/STARTcloud/startcloud-ui/commit/09e35a2a47921f0bac145582504c1fa8e407ce1e))

## [0.9.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.8.1...v0.9.0) (2026-09-08)


### Features

* add the personName and iconName patterns from the identity contract ([a786267](https://github.com/STARTcloud/startcloud-ui/commit/a7862671b150a8496811f60b404faf78c7c4939a))


### Bug Fixes

* Refining and Improving the Contracts ([4765f56](https://github.com/STARTcloud/startcloud-ui/commit/4765f568104f1da6cdd6cc86abafadd8a4567d58))

## [0.8.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.8.0...v0.8.1) (2026-09-07)


### Bug Fixes

* linting ([f024baf](https://github.com/STARTcloud/startcloud-ui/commit/f024baf7bbd69f3bf07a759792d10f8bd3294434))

## [0.8.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.7.0...v0.8.0) (2026-09-07)


### Features

* send the contract's snake_case members, evaluate allOf and not, read requires_restart ([d72398f](https://github.com/STARTcloud/startcloud-ui/commit/d72398fa1f8859a46347ae6fcffc5f10d1eb88ab))

## [0.7.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.6.0...v0.7.0) (2026-09-07)


### Features

* read and write favorites on the contract's snake_case route ([19e10bb](https://github.com/STARTcloud/startcloud-ui/commit/19e10bb2db634b8ac7134595de9581d5f8343816))

## [0.6.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.5.1...v0.6.0) (2026-09-07)


### Features

* add the branding packs, the pack generator and the pre-paint theme chain ([c643df8](https://github.com/STARTcloud/startcloud-ui/commit/c643df8dff6afff9982ecf008708aef9c11b23d6))
* add the cookie session provider, the optional auth mode and the issuer's status shape ([bfd9af5](https://github.com/STARTcloud/startcloud-ui/commit/bfd9af5b66f23df13e81cbf3ac22695c49d64a61))
* add the identity provider's five page groups behind the cookie token ([29413a8](https://github.com/STARTcloud/startcloud-ui/commit/29413a8ac28d5bc7c8b3008f82ddbf2f61fb6c3c))
* add the sidebar, the account and operator exports and the footer token ([da3fc2f](https://github.com/STARTcloud/startcloud-ui/commit/da3fc2fd55a74eb76301d9572a94ce95d9d95d80))
* feed the badges, the restart card and the footer heart from the event stream ([8635bf9](https://github.com/STARTcloud/startcloud-ui/commit/8635bf93c3914b4e7cc2c1601ca536df02eafd16))


### Bug Fixes

* build the ticket context from the role, answer the about stub on a role without keys and name the configuration row ([4d9c9fc](https://github.com/STARTcloud/startcloud-ui/commit/4d9c9fcc69d0a7cfdecbf54c39b8f34d7ddc6729))
* Contracts  and Mockups for Auth Service ([ede99de](https://github.com/STARTcloud/startcloud-ui/commit/ede99de084fcd1ed4c5e39ea93939f79d1d965c8))

## [0.5.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.5.0...v0.5.1) (2026-09-06)


### Bug Fixes

* keep the page's required rules, sync push after the session loads and keep the editor's actions mounted ([90a352b](https://github.com/STARTcloud/startcloud-ui/commit/90a352b0945554e232460743cf3592bd9af95eff))
* keep the page's required rules, sync push after the session loads, keep the editor's actions mounted and read the plain ticket section ([b198fb4](https://github.com/STARTcloud/startcloud-ui/commit/b198fb4aff6262eaf524f0be97499b98a34f5241))

## [0.5.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.4.0...v0.5.0) (2026-09-06)


### Features

* become a role of the STARTcloud UI with the events contract, YAML config and a Debian package ([b95d008](https://github.com/STARTcloud/startcloud-ui/commit/b95d008ed2d2818f692235560236f4fcdda5a09f))
* one validation pattern and schema-driven config forms for every host ([d52cb0f](https://github.com/STARTcloud/startcloud-ui/commit/d52cb0f263e2c7a90f3ba22c74bc0775c294974c))


### Bug Fixes

* send every request body in snake_case as the validation contract names it ([9575055](https://github.com/STARTcloud/startcloud-ui/commit/95750556095ba79a312ff0e8a8da1c31f1302ad5))

## [0.4.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.3.0...v0.4.0) (2026-09-05)


### Features

* give ISOs the versioned box tree minus providers and sort the sub-page tables ([5e8581d](https://github.com/STARTcloud/startcloud-ui/commit/5e8581d83fe46cd7b26004499246770b7c0f2940))


### Bug Fixes

* fold the app locales into shared and settle the storage-key and route grammar ([5b610d8](https://github.com/STARTcloud/startcloud-ui/commit/5b610d8d9ec2c13ca461459f95407f992a6482ce))

## [0.3.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.2.0...v0.3.0) (2026-09-05)


### Features

* add the status capabilities, session factory and stub the one-app tree builds on ([85b1bba](https://github.com/STARTcloud/startcloud-ui/commit/85b1bba99e42008ba3428681c2554125041fc63a))
* one status-driven app in a feature-first tree, no per-backend folders ([8b85769](https://github.com/STARTcloud/startcloud-ui/commit/8b85769f7dbcefe0923361847ef09e1435021d10))

## [0.2.0](https://github.com/STARTcloud/startcloud-ui/compare/v0.1.1...v0.2.0) (2026-09-04)


### Features

* notify BoxVault and the catalog with a dependency-update dispatch on every release ([dcee8da](https://github.com/STARTcloud/startcloud-ui/commit/dcee8da74347861c386b66466a1e355392e7ee5c))

## [0.1.1](https://github.com/STARTcloud/startcloud-ui/compare/v0.1.0...v0.1.1) (2026-09-04)


### Bug Fixes

* open release PRs as the STARTcloud bot ([b1faaeb](https://github.com/STARTcloud/startcloud-ui/commit/b1faaebc80eae346701df2dcfd69bdd2c2112978))

## 0.1.0 (2026-09-04)


### Features

* one UI for BoxVault and the Provisioner Catalog ([a9756af](https://github.com/STARTcloud/startcloud-ui/commit/a9756afc326c41b675f9c4837c76c81fbb9700c4))


### Bug Fixes

* start releases at 0.1.0 ([2501373](https://github.com/STARTcloud/startcloud-ui/commit/2501373d77a0fab3d970243af6149a8c6e782bd5))
* start releases at 0.1.0 and bump setup-node and i18next ([f9eb57a](https://github.com/STARTcloud/startcloud-ui/commit/f9eb57a921944633ade86dc4949f8b386712a65f))
