---
title: Universal Testing Contract
layout: default
nav_order: 16
parent: Guides
permalink: /docs/guides/universal-testing/
---

## Universal Testing Contract

{: .no_toc }

Draft for the estate's review round; nothing in it is settled until the owner settles it. The
testing contract: the one browser test tool for the estate and the reusable workflow every UI
backend calls, where tests live per repository class, what every UI backend must prove per
contract checklist, the fixtures and the conformance table. It is the source of
`uniformity.ci_cd.testing`: tests are uniform and convergent across the family because one tool
and one workflow run them, and no repository carries a hand-written smoke script of its own. The
owner's rule that binds every clause: "no workflow carries a hand-written smoke script; a check
that must survive becomes a proper tool in a reusable workflow, never an ad-hoc script; a browser
test tool, Playwright if chosen, is a normal step of each repository's standard ci.yml, the same
shape in every repository of its class"; and its aim: "nice to have; when done, 100 percent is the
aim, Cucumber or Gherkin style on frontends, live-instance tests rather than mocks on backends".
It was blocked by the shared UI changes of `merge_projects.auth_server` landing first, and is
written after them. Every clause is a rule with one reading, carries its reason, and cites the
specification or practice it follows where one exists, so a deviation is an argument with the
citation, never with the author. Where the text depends on a choice the owner has not made, it
says "decision n" and the Decisions section lists that choice with the candidates and the reason
each would be chosen; the draft settles none of them. It extends the
[Universal Config Contract](universal-config/), whose decision 39 places the shared UI's config
fixture and tests under this contract's runner, and the
[Universal Identity Contract](universal-identity/), whose decision 23 says the testing contract
comes after the conversion.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **One tool, one workflow.** Tests are uniform and convergent across the family because one
  tool and one workflow run them. Why: the owner's `universal_testing` entry; a second tool or a
  second workflow shape is a second thing to keep identical across the family.
- **Tests are tools, never scripts.** No workflow carries a hand-written smoke script; a check
  that must survive becomes a proper tool in a reusable workflow, never an ad-hoc script. Why: a
  curl script encodes assumptions nobody maintains and diverges per repository; one tool in one
  workflow shape keeps the family convergent (identity contract, "Build, packaging and tests").
- **The browser test tool is a normal step of the standard `ci.yml`.** The same shape in every
  repository of its class; Playwright if chosen (decision 1). Why: `uniformity.ci_cd.workflow_set`,
  "the same workflow file names and shapes, copied not written".
- **Gherkin on frontends, live instances on backends.** Cucumber or Gherkin style on frontends;
  live-instance tests rather than mocks on backends. Why: the owner's `uniformity.ci_cd.testing`
  description.
- **100 percent is the aim.** Coverage is measured on every run and the aim is 100 percent; a
  branch coverage cannot reach is listed under `uniformity.potential_dead_code` with the reason it
  is unreachable, so it can be removed or the guard above it moved, never tested around. Why: the
  owner's words in `potential_dead_code`: "a branch stays only while a caller can reach it".
- **A checklist line reads ✓ only when the backend's own tests assert it.** Owed while its change
  list names the row; n/a where the rule has nothing to bind. Why: the config contract's
  conformance rule; a tick without an asserting test is a claim, not a proof.
- **The shared UI proves its contracts over a fixture, never a dev proxy target.** The shared UI
  carries a test fixture of the config and setup routes under this contract's runner, and its
  tests for `schemaSections`, `validation`, `useFormRules`, `AdminConfig` and `SetupPage` land with
  this contract. Why: config contract decision 39; a test that needs a running backend is a test
  that runs only on one developer's machine.
- **Tests follow the contracts, they do not lead them.** A proof asserts a line of an existing
  contract's checklist; a rule that matters is written in its contract first. Why: the identity
  contract's principle that the contract drives the code.

---

## 1. The one tool

| Rule                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Why                                                                                                                            | Spec                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| the browser tool    | one browser test tool for the estate, decision 1, Playwright if chosen; it is a normal step of each repository's standard `ci.yml`, the same shape in every repository of its class; no repository runs a second browser tool                                                                                                                                                                                                                                                     | the owner's rule; one tool is what makes the tests uniform and convergent                                                      | the tool's own documentation (Playwright Test, if chosen)                |
| the Gherkin layer   | Cucumber or Gherkin style on frontends: every browser test of the shared UI is a `.feature` file of scenarios in Gherkin, run through the tool's BDD layer or a step file convention, decision 2; a step is written once in a step file and reused by every scenario that says the same thing                                                                                                                                                                                     | the owner's `uniformity.ci_cd.testing` description; a scenario reads as the contract line it proves                            | Gherkin reference (Cucumber); the BDD layer's documentation, decision 2  |
| the unit runner     | one unit runner per language, decision 3: the shared UI's runner for `schemaSections`, `validation`, `useFormRules`, `AdminConfig` and `SetupPage`; the Node backend's runner; the Python backend's runner; the Java backend's Gradle test task; the Worker's runner; each named once in section 2 and never a second one in the same class                                                                                                                                       | config contract decision 39 names the shared UI's tests; one runner per class is the same-shape rule applied to the unit layer | the runner's own documentation, decision 3                               |
| live instance       | on a backend a test runs against the backend's own process booted from the module's own configuration resolution, the config contract's development directory or a `CONFIG_DIR` the test job sets, over a real database of the class's test dialect; nothing the route reads is mocked; how the instance is stood up per class is section 5, and whether an in-process app under a request library counts as the live instance or the process must listen on a port is decision 4 | "live-instance tests rather than mocks on backends"; a mock proves the mock                                                    | the config contract, section 1 directory row; section 2 development file |
| coverage            | every unit and live-instance run reports coverage through the runner's own coverage reporter; 100 percent is the aim; a branch no request can reach is listed under `uniformity.potential_dead_code` with the reason and is never tested around; whether coverage gates the workflow, and at what threshold on the way to 100, is decision 5                                                                                                                                      | the owner's aim and the `potential_dead_code` rule                                                                             | the runner's coverage documentation                                      |
| no smoke script     | no workflow of any repository carries a hand-written smoke script: no inline `curl`, no inline `node --input-type=module`, no `python -c` that asserts a route; a check that must survive becomes a test under the runner of section 2 or a step of the reusable workflow of section 3; the inline locale-parity script the shared UI's `ci.yml` carries today is decision 6                                                                                                      | the owner's rule; a curl script encodes assumptions nobody maintains and diverges per repository                               | this contract                                                            |
| the screenshot      | the navbar contract asks that every conformance-checklist line be ticked with a side-by-side screenshot in the PR; whether the browser tool produces that screenshot as an artifact of the run, and whether a produced screenshot replaces the PR screenshot, is decision 7                                                                                                                                                                                                       | the navbar contract's opening rule; a tool that already drives the page can capture it                                         | the navbar contract; the tool's screenshot documentation                 |
| what a test asserts | a test asserts one line of one contract's conformance checklist, named in the test's title in the checklist's own words, so the conformance table of section 6 is derived from the tests and never written by hand; a test that asserts no checklist line is a unit test of one function and is titled by that function                                                                                                                                                           | ✓ only by an asserting test; a table nobody can derive drifts                                                                  | this contract                                                            |

---

## 2. Where tests live per repository class

The classes are the ones the estate's contracts already record: the shared UI, a Node backend
(BoxVault, hyperweaver-server, zoneweaver-agent), a Python backend (the VDI Health Monitor), a Java
backend (the authorization server), a Worker (the provisioner catalog). hyperweaver-agent, in Go,
is recorded as to come, as the config contract records it.

| Class          | Directory                                                                                                                                                              | Naming                                                                                                                                                                             | Fixtures                                                                                                                                                                                                                                                            | Runner                                                                                                                                                                         | Why                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shared UI      | `tests/` at the repository root: `tests/features/` for the `.feature` files and their step files, `tests/unit/` for the unit tests, `tests/fixtures/` for the fixtures | a feature file per contract, `<contract>.feature` (`config.feature`, `validation.feature`); a step file beside it; a unit test per module it tests, `<module>.test.js`, decision 3 | `tests/fixtures/<contract>/index.js` keyed `"METHOD path"` as `tests/fixtures/config/index.js` is today, one JSON file per answer beside it (section 5)                                                                                                             | the browser tool for the features; the unit runner of decision 3 for the unit tests; both as `npm` scripts beside `lint`, `format:check` and `quality`, the CONTRIBUTING chain | the feature-first tree of CONTRIBUTING and the pages contract keeps tests out of `src/`; `tests/fixtures/config/` already exists in this shape                                                                         |
| Node backend   | `backend/tests/` (BoxVault, as today); a backend whose code is at the root uses `tests/`                                                                               | `<subject>.test.js`, as BoxVault's `events.test.js`, `config.test.js`, `rules.test.js` are today                                                                                   | `backend/tests/__test_config__/` holding one `<name>.config.yaml` per name in `status.config`, written by the runner's global setup and handed to the process as `CONFIG_DIR`, as BoxVault's `globalSetup.js` does today; the test dialect `sqlite` with `:memory:` | the Node backend's runner, decision 3; BoxVault runs Jest 30 with supertest today                                                                                              | the first backend of the class holds the shape and every later backend copies it, the config contract's one-module rule applied to tests; the test files are the ones the events and validation contracts already cite |
| Python backend | `tests/` at the repository root                                                                                                                                        | `test_<subject>.py`                                                                                                                                                                | a test configuration directory of one `app.config.yaml`, handed as `CONFIG_DIR`, the Python twin of the Node backend's `__test_config__`                                                                                                                            | the Python backend's runner, decision 3, installed from `requirements-dev.txt` beside `ruff` and `pip-audit`                                                                   | the same shape as the Node class in the language's own convention; `requirements-dev.txt` is where the class already keeps its tools                                                                                   |
| Java backend   | `src/test/groovy/<package>/`, as today                                                                                                                                 | `<Subject>Test.groovy`, as today                                                                                                                                                   | the test resources beside the tests; the boot test reads `application.config.yaml` from a test `CONFIG_DIR`                                                                                                                                                         | `./gradlew test`, the step the repository's `ci.yml` runs today                                                                                                                | the class already has 164 files in this shape; the contract records it rather than moving it                                                                                                                           |
| Worker         | `worker/tests/`                                                                                                                                                        | `<subject>.test.js`                                                                                                                                                                | the Worker's `[vars]` for the test run; no configuration files, the config contract's decision 31                                                                                                                                                                   | the Worker's runner, decision 3; how the Worker is stood up live is decision 8                                                                                                 | a backend with no files has no `CONFIG_DIR` to hand over; its test shape is its platform's                                                                                                                             |
| Go agent       | to be recorded                                                                                                                                                         | to be recorded                                                                                                                                                                     | to be recorded                                                                                                                                                                                                                                                      | to be recorded                                                                                                                                                                 | joins when the hyperweaver family converges on the shared UI                                                                                                                                                           |

The browser tests of a backend, the shared UI driven against the backend's live instance, live in
the backend's own test directory under `features/`, the same `.feature` and step convention as the
shared UI's, because the backend is what those scenarios prove.

---

## 3. The reusable workflow

| Rule              | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                             | Spec                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| one workflow      | one reusable workflow in this repository, `.github/workflows/<name>.yml` with `on: workflow_call`, its name decision 9; every UI backend calls it from its standard `ci.yml` as a job with `uses: STARTcloud/startcloud-ui/.github/workflows/<name>.yml@<ref>`, the way `ci.yml` and `release-please.yml` already call `codeql.yml` and `prod-build.yml` within a repository; the `<ref>` is decision 10                                                     | one workflow is what makes the tests convergent; a workflow copied into each repository is five workflows       | GitHub Actions, reusing workflows (`workflow_call`, `uses` on a job)   |
| what it does      | checks out the caller, fetches the pinned UI release into `ui/` the way every backend's CI already does (`curl -fsSL … \| tar -xz -C ui`, the navbar contract's Distribution section), stands the caller's live instance up per its class (section 5), installs the browser tool and its browsers, runs the caller's `features/`, reports coverage, and uploads the run's report and, under decision 7, its screenshots as workflow artifacts                | the steps every class shares are the workflow's; what differs per class is an input                             | GitHub Actions, `actions/upload-artifact`; the tool's CI documentation |
| inputs            | the inputs are decision 11; the candidates the existing `ci.yml` files already carry are the repository class (Node, Python, Java, Worker, shared UI), the language version (`node-version: '22'`, `python-version: '3.11'`, `java-version: '25'` with `distribution: 'temurin'` as the four `ci.yml` files carry today), the command that boots the live instance, the origin it listens on, and the test directory of section 2; no input carries a secret | the caller says what it is and the workflow does the rest; a secret in an input is a secret in a log            | GitHub Actions, `workflow_call` inputs                                 |
| the standard step | in every repository of a class the calling job has the same name, the same `needs` and the same inputs, copied not written, so `ci.yml` differs between two Node backends only in the values of its inputs; the job runs on every pull request and on the push to `main` through `release-please.yml`'s `ci-checks` job, as every `ci.yml` already runs                                                                                                      | `uniformity.ci_cd.workflow_set`; the same shape in every repository of its class                                | the four `ci.yml` files and `release-please.yml` as they stand         |
| no smoke script   | the workflow carries no `run:` step that asserts an answer; every assertion is in a test file under the runner; the test job that BoxVault's `ci.yml` carries commented out is replaced by the call, not uncommented                                                                                                                                                                                                                                         | the owner's rule                                                                                                | this contract                                                          |
| private callers   | the authorization server, the VDI Health Monitor and the private catalog are private repositories and call the public workflow; the workflow runs on the caller's runner, so the authorization server's `runs-on: self-hosted` job keeps its runner, and installing the browser tool's browsers on a self-hosted runner is decision 12                                                                                                                       | a private repository may call a reusable workflow of a public one; the caller's runner is where its checkout is | GitHub Actions, access to reusable workflows                           |
| CodeQL            | unchanged: the shared UI, BoxVault and the catalog chain `codeql.yml` after their checks; private repositories do not get CodeQL                                                                                                                                                                                                                                                                                                                             | `uniformity.ci_cd.security`                                                                                     | the `ci.yml` files as they stand                                       |

---

## 4. What every UI backend proves

One proof per line of every contract's conformance checklist. A proof is a test that asserts the
line and is titled by it; a backend proves its lines against its live instance, the shared UI
proves its lines over the fixture of section 5, and a line that needs the browser is a Gherkin
scenario run by the browser tool. A line reads ✓ in section 6 only when that test exists and
passes. The lines are the checklists' own; a checklist that grows a line grows a proof.

### Navbar

| Line of the navbar checklist                                                     | Proof                                                                                                                                                          | Proved by                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| one build, every difference a field of `/api/status`                             | `GET /api/status` answers the members the navbar contract names; the shared UI renders from the fixture's `status.json` alone                                  | backend live; shared UI fixture |
| serves the pinned UI release and answers `GET /api/status`                       | `GET /` answers `index.html` of the pinned tarball; `GET /api/status` carries `role`, `version`, `brand`, `auth`, `collections`, `features`, `links`, `ticket` | backend live                    |
| cluster: search, theme, globe, name and avatar, both states                      | the cluster's four slots in both states, the Sign in button hidden on an auth route                                                                            | browser tool, shared UI fixture |
| search: icon first, expands, live count, gear, ×, Escape                         | each control of the Search section in turn on a page with a binding                                                                                            | browser tool, shared UI fixture |
| filter panel groups in order, `value (count)` pills, active count, Clear filters | the group order and the pill labels on a listing page; Clear filters keeps the query                                                                           | browser tool, shared UI fixture |
| app-wide search list, Show all into `/search?q=`                                 | `GET /api/search?q=&limit=` answers `{ query, results, truncated }` in the row shape; the list under the panel                                                 | backend live; browser tool      |
| no bell in the cluster                                                           | no bell element in the cluster                                                                                                                                 | browser tool, shared UI fixture |
| cluster icon buttons borderless                                                  | the computed style of the theme and language buttons                                                                                                           | browser tool, shared UI fixture |
| utility links: top bar signed out, app section signed in                         | `links.docs` in the top bar signed out and in the app section signed in                                                                                        | browser tool, shared UI fixture |
| breadcrumb after the brand from the route, no pickers                            | the crumbs of `/{org}/{collection}/{item}` are plain links                                                                                                     | browser tool, shared UI fixture |
| switcher sets the active organization only, never navigates                      | picking a row leaves the path unchanged and writes `activeOrganization`                                                                                        | browser tool, shared UI fixture |
| chrome metrics                                                                   | the header 62px, the gutter 20px, the footer row 13px, the tertiary band                                                                                       | browser tool, shared UI fixture |
| sidebar only from feature exports, brand at its top, rail persisted, foot bare   | a feature that exports entries draws the column; `sidebar_minimized` persists                                                                                  | browser tool, shared UI fixture |
| `footer` token listed                                                            | `features` carries `footer`                                                                                                                                    | backend live                    |
| footer slots                                                                     | name, year and version as the repo link, powered-by, the heart while `health` is listed                                                                        | browser tool, shared UI fixture |
| chrome from the reference implementation, native theme                           | the bundled faces load from the build, never a font CDN; `react-icons/fa6` glyphs                                                                              | browser tool, shared UI fixture |
| universal rows drawn with the app's own components                               | the user menu rows in order                                                                                                                                    | browser tool, shared UI fixture |
| identity card to the IdP profile, the local toggle where a local profile exists  | the card's link and glyph per auth token                                                                                                                       | browser tool, shared UI fixture |
| org row at two or more memberships opens the switcher                            | the row absent at one membership, present at two, opening the modal                                                                                            | browser tool, shared UI fixture |
| switcher rows: logo, name, description, role badge, crown, check                 | each row's parts from the memberships                                                                                                                          | browser tool, shared UI fixture |
| active org persisted, validated, primary then first                              | a stored uuid outside the claim falls back to primary, then first                                                                                              | shared UI unit                  |
| app section rows gated by `features`, utility rows by `links`                    | a token absent hides its row                                                                                                                                   | browser tool, shared UI fixture |
| Preferences row to the IdP profile preferences                                   | the row's link, hidden while a sidebar row points at the profile                                                                                               | browser tool, shared UI fixture |
| favorites read from `GET /api/user/favorites`                                    | the route answers the `snake_case` list; the menu draws it by `order`; `http:` and `javascript:` URLs are not drawn                                            | backend live; browser tool      |
| app section named after the app, rows gated                                      | the header is `brand.name`                                                                                                                                     | browser tool, shared UI fixture |
| notifications row and badge, gated, opens the modal                              | the row under the scope or the `cookie` token; the badge from `unread-count`                                                                                   | browser tool, shared UI fixture |
| modal: mark all, per-row read and dismiss, link glyph, view all, toast switch    | each control against the read API routes                                                                                                                       | backend live; browser tool      |
| toasts: own VAPID and SW, re-POST on load, `pushsubscriptionchange`              | the VAPID key route; `/notification-sw.js` served with `Service-Worker-Allowed: /push/` and `Cache-Control: no-cache`, no `fetch` handler                      | backend live                    |
| help row gated by config, customer id chain, context                             | the ticket URL's `req`, `customerId`, `user`, `email`, `context` from the fixture's values                                                                     | browser tool, shared UI fixture |
| logout row red, scope toggle, text logs out                                      | the row and its toggle per session kind                                                                                                                        | browser tool, shared UI fixture |
| everywhere is end-session with `id_token_hint`; this app is local                | the form POST's members                                                                                                                                        | browser tool, shared UI fixture |
| ID token kept for the session                                                    | the storage key holds it after sign-in                                                                                                                         | shared UI unit                  |
| notices: banners under the header, cards top right, session ended a keyed banner | `notify` of each kind and tier draws in its place; `sessionEnded` raises the one banner with no action                                                         | browser tool, shared UI fixture |
| theme and language write through; pre-paint script                               | the toggle sends `PATCH /api/user/preferences`; `index.html` carries the script and its published hash matches                                                 | backend live; shared UI unit    |
| silent SSO once per session                                                      | `silent_sso_attempted` set after one `prompt=none` attempt                                                                                                     | browser tool, shared UI fixture |
| `events` token and `events: { path, topics }`                                    | the payload carries both or neither                                                                                                                            | backend live                    |

### Pages

| Line of the pages checklist                                                   | Proof                                                                                                                          | Proved by                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| one build, differences in `collections` and `features`                        | `collections` and `features` of the payload; the router mounts the named collections in order                                  | backend live; shared UI unit    |
| breadcrumb from the route only                                                | `routes.js` parses each level; a reserved first segment yields no crumbs                                                       | shared UI unit                  |
| switcher never navigates                                                      | `pickOrg` leaves the path                                                                                                      | shared UI unit                  |
| existing URLs unchanged                                                       | every BoxVault path of the mapping table answers its page; the ISO paths beside them                                           | backend live; browser tool      |
| item shape from one adapter                                                   | the adapter answers the item shape for each level; no page reads a wire field                                                  | shared UI unit                  |
| one visibility rule per app                                                   | an unpublished item is answered to its uploader alone by every read route and listing                                          | backend live                    |
| registry names every collection                                               | `collectionsFor(status)` answers definition, adapter, filter groups, columns and slots per key                                 | shared UI unit                  |
| Listing: groups, every collection drawn, heading actions, one toggle, columns | the listing page's parts on the fixture's collections                                                                          | browser tool, shared UI fixture |
| Home, Org, Collection, Item, Version, Provider pages                          | each route draws its page and sets `document.title`                                                                            | browser tool, shared UI fixture |
| fleet pages while `fleet`, live through the `fleet` topic                     | `FleetPage` at `/` and `VmPage` at `/vm/:instance`; `useFleet` applies each event                                              | browser tool; shared UI unit    |
| ISOs versioned like boxes                                                     | the ISO routes draw the shared pages with the ISO slots                                                                        | backend live; browser tool      |
| write actions only in slots, while `uploads`                                  | no management control without the token                                                                                        | browser tool, shared UI fixture |
| the panel's groups first, own groups prefixed, Columns per collection         | the group order on a two-collection page                                                                                       | browser tool, shared UI fixture |
| sign-in returns to the page the session ended on                              | `intended_url` remembered and consumed; never an auth path                                                                     | shared UI unit                  |
| login, register and invite routed by the auth token                           | the routes present under `backend` or `cookie`, `NotAvailableStub` under `idp`                                                 | browser tool, shared UI fixture |
| profile routed by the auth token                                              | the same for `/profile`                                                                                                        | browser tool, shared UI fixture |
| org console and discovery by `org-console` and `discover`                     | the same for the two routes                                                                                                    | browser tool, shared UI fixture |
| admin by `admin`                                                              | `/admin` and its sidebar entries per the adapter's members                                                                     | browser tool, shared UI fixture |
| search page at `/search?q=`                                                   | the page draws the rows and says so when there is nothing to search                                                            | browser tool, shared UI fixture |
| setup and its gate by `setup`                                                 | the gate renders before any other route while `setup_complete` is false                                                        | browser tool, shared UI fixture |
| deep links load                                                               | a browser GET of a page path answers `index.html` after every `/api` route; a Vagrant user agent on the same path answers JSON | backend live                    |
| serves the pinned UI release and answers `GET /api/status`                    | the pin in the backend's recorded location equals the version the served `index.html` names                                    | backend live                    |

### Session

| Line of the session checklist                                    | Proof                                                                                                    | Proved by                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| one session layer, the provider from the first `auth` token      | `createSession(status, events)` answers the provider its token names                                     | shared UI unit               |
| first render from the stored session, then `load()`              | `restore()` synchronous, `load()` once on mount                                                          | shared UI unit               |
| every request through the shared client, one replay on `401`     | the client sends `session.headers`, replays once after `retryAuth()`, throws `ApiError`                  | shared UI unit               |
| the backend verifies the browser provider's token and DPoP proof | a bound token as `Bearer` is refused, an unbound token as `DPoP` is refused, a replayed `jti` is refused | backend live                 |
| sign-in returns to the page it started on                        | the callback consumes `intended_url`; a path failing `^/(?![/\\])` is dropped                            | shared UI unit               |
| session ended elsewhere raises the banner                        | `endSession()` adopts `null` and records `returnTo`                                                      | shared UI unit               |
| claims memoized                                                  | one fetch per session                                                                                    | shared UI unit               |
| preferences write through; account value applied on sign-in      | `PATCH /api/user/preferences` answers and the stored theme follows the account                           | backend live; shared UI unit |
| sign out: this app and everywhere                                | the two calls per provider                                                                               | backend live; shared UI unit |
| active organization persisted, validated                         | the stored value re-resolved on every adopt                                                              | shared UI unit               |
| push subscription synced while signed in                         | the re-POST on load                                                                                      | shared UI unit               |

### Events

| Line of the events checklist                                                 | Proof                                                                                                  | Proved by                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `events` token and object, omitted without live data                         | the payload                                                                                            | backend live                 |
| one path, topics from `?topics=`, unknown ignored, empty means core          | `GET /api/events?topics=` with a known, an unknown and no topic                                        | backend live                 |
| the session's headers; `401` ends, `403` and `204` stop                      | no credential answers `401`; a forbidden topic `403`                                                   | backend live; shared UI unit |
| the response headers, never compressed, flushed first                        | `Content-Type`, `Cache-Control`, `X-Accel-Buffering`, no `Connection`                                  | backend live                 |
| `retry: 3000` then `ready`                                                   | the first two frames                                                                                   | backend live                 |
| every event `id: <epoch-ms>-<seq>`, kebab-case, one-line JSON, `:hb`         | the frame grammar over a broadcast and an idle wait                                                    | backend live                 |
| ring of 500 or 5 minutes; replay inside, `reset` outside                     | a reconnect with an id inside the ring replays in order; outside it answers `reset` then the snapshots | backend live                 |
| core topics by name                                                          | `session-terminated`, `unread-count`, `health` on the topics the backend streams                       | backend live                 |
| app topics registered in the guide                                           | every event name a backend sends is in the topics table                                                | backend live                 |
| every broadcast through one module                                           | no second queue list                                                                                   | backend unit                 |
| the UI opens the stream through `connectEventStream`, pages through the hook | `openEventStream` parses the grammar; `useEventStream` subscribes and unsubscribes                     | shared UI unit               |
| `useSessionKeepalive` answers `session-terminated`                           | the hook calls `events.endSession()`                                                                   | shared UI unit               |

### Validation

| Line of the validation checklist                                                    | Proof                                                                                                      | Proved by                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GET /api/rules` answers the forms as JSON Schema 2020-12 with `$defs` and `unique` | the document parses, `$schema` is the 2020-12 URI, every `pattern` is a `$defs` name                       | backend live                    |
| the write route evaluates the same document                                         | a body that fails a rule of the served document is refused                                                 | backend live                    |
| every refused write is the problem body                                             | `application/problem+json`, `type`, `title`, `status`, `errors[]` of `pointer`, `rule`, `params`, `detail` | backend live                    |
| 422, 409 for `unique`, 400 only for an unreadable request                           | one case each                                                                                              | backend live                    |
| password minimum 15, at least 64 accepted, no composition, a blocklist              | a 14-character password refused, a 64-character one accepted, a blocklisted one refused                    | backend live                    |
| the email grammar is the HTML Standard's on both sides                              | the same address list passes and fails on the route and in `validateValue`                                 | backend live; shared UI unit    |
| every form draws `FieldError` and `FormErrorSummary`, blur and submit, never a card | the form's surfaces on the fixture's `put-422.json`                                                        | browser tool, shared UI fixture |
| `aria-invalid` after blur or submit, the summary `role="alert"` and focused         | the attributes before and after a blur                                                                     | browser tool, shared UI fixture |
| the wording says what to enter, one `validation.<rule>` key per rule                | `messageFor` answers the key per rule; every locale carries the key                                        | shared UI unit                  |

### Config

| Line of the config checklist                                          | Proof                                                                                                                               | Proved by                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1. boot reads `CONFIG_DIR` alone, validates, refuses                  | the boot test: a file failing its schema stops the process with the pointer logged; a flagged leaf without `restartReason` stops it | backend live                      |
| 2. the files, one `.bak`, the dev file, the schema beside the code    | the paths exist as the row says; the schema root carries `title` and the `readOnly` `schemaVersion`                                 | backend live                      |
| 3. the routes and answers, the `PUT` a merge patch                    | each route of section 3 in turn; `null` removes, `""` is written, an array replaces whole                                           | backend live; shared UI fixture   |
| 4. no secrets handling                                                | `GET` answers the raw value; `PUT` writes it as sent; no mask anywhere                                                              | backend live; shared UI unit      |
| 5. `requiresRestart` with `restartReason`, the list, the pending list | the `PUT`'s `requires_restart` names the changed leaf; `restart-status` holds it until `POST /api/config/restart`                   | backend live; shared UI fixture   |
| 6. `action`, one upload route, one component per kind                 | `POST /api/config/<name>/upload` with `file` and `pointer`; the page draws the component the `kind` names                           | backend live; shared UI fixture   |
| 7. every collection a map drawn by the generic component              | `propertyNames` and `unique` on a new key in the browser; the merge patch carries the entry                                         | shared UI unit; shared UI fixture |
| 8. the drop-in module, copied verbatim                                | the module file is byte-equal to the source backend's of its language                                                               | backend unit                      |
| 9. the backend's row of section 9 is true of it                       | the default `CONFIG_DIR`, the names list and the public subsets as recorded                                                         | backend live                      |

### Branding

The branding contract carries no conformance checklist. The lines this draft derives from its
rules, for the owner to confirm as decision 13:

| Line                                                                                 | Proof                                                                                             | Proved by                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| the pre-paint script in `index.html`, its published hash matching                    | the script's SHA-256 equals the `.prepaint.sha256` the release carries                            | shared UI unit                  |
| `data-bs-theme` carries the variant alone, `data-brand` the pack, never composed     | the attributes after mount under each `theme` and `pack` of the payload                           | browser tool, shared UI fixture |
| the account value overwrites local storage on sign-in                                | `preferences.theme` applied in `complete()` or on adopt                                           | shared UI unit                  |
| `brand.pack: { name, css }` stamps the attribute and the link, absent stamps nothing | the shell appends the link after the app stylesheet, or nothing                                   | browser tool, shared UI fixture |
| the generator refuses a pack under 4.5:1 and emits the focus ring per variant        | `npm run themes` over a failing YAML exits non-zero; the emitted `--brand-focus-ring` reaches 3:1 | shared UI unit                  |
| `PATCH /api/user/preferences` answers 422 with a pointer on a bad value              | a bad `theme` answers the problem body                                                            | backend live                    |

### Identity

The identity contract carries no conformance checklist; its decisions and page groups are its
rules. Whether it gains a checklist, or this contract lists its proofs per page group as below, is
decision 14:

| Group                              | Proof                                                                                                                                                     | Proved by                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| the cookie session provider        | each member of its table against `GET /api/user`, `POST /login`, `POST /user/logout`                                                                      | backend live; shared UI unit |
| the status payload                 | `role: "auth-server"`, `auth: ["cookie"]`, `features` exactly the gated tokens, `events` with the four topics                                             | backend live                 |
| sign-in                            | every action of the sign-in table answers `{ next }` on success and the problem body with `code` on failure; a POST without the CSRF header answers `403` | backend live                 |
| registration, onboarding and terms | the chain in order; the `ROLE_ONBOARDING` principal admitted by the enumerated routes and no other                                                        | backend live                 |
| the interstitials                  | each JSON read and the `NativeForm` post's `_csrf` field                                                                                                  | backend live; browser tool   |
| the signed-in pages                | step-up arms the window and a call outside it answers `403 step_up_required`; a `DELETE` carries no body                                                  | backend live                 |
| admin, health and errors           | paged lists answer `{ items, page, size, total, total_pages }`; `/error` stamps the three attributes; the reference matches `^[0-9a-f]{16}$`              | backend live; browser tool   |

---

## 5. Fixtures

| Rule                               | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Why                                                                                                                                  | Spec                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| the shape                          | `tests/fixtures/<contract>/index.js` exports one object keyed `"METHOD path"` (`'GET /api/status'`, `'PUT /api/config/app'`), each value `{ status, file }` naming the JSON file beside it, and `refused` naming the file a refused write answers, exactly as `tests/fixtures/config/index.js` is today; a fixture file is the contract's own example body, so `put-422.json` is the config contract's refused write verbatim                             | one key names one answer; a fixture that is the contract's example cannot drift from it                                              | `tests/fixtures/config/index.js`; the config contract                |
| the config fixture                 | `status.json`, `app.config.json`, `app.schema.json`, `put-200.json`, `put-422.json`, `restart-status.json`, `upload-200.json`, `setup-status.json`, `setup.json`, `setup-schema.json`, the ten files that exist today; every later contract's fixture takes the same layout under its own folder                                                                                                                                                          | config contract decision 39; the first fixture is the shape                                                                          | this repository, `tests/fixtures/config/`                            |
| how it is served                   | the browser tool intercepts the request the shared UI makes and answers the fixture's file with its status from the `"METHOD path"` key, decision 15; the shared UI is never pointed at a dev proxy target for a test                                                                                                                                                                                                                                     | config contract decision 39, "never a dev proxy target"                                                                              | the tool's request interception (Playwright `page.route`, if chosen) |
| a refused write                    | a scenario that sends a bad value receives `refused` with its status; the test asserts the surfaces the validation contract fixes, painted by pointer                                                                                                                                                                                                                                                                                                     | the validation contract's Surfaces table                                                                                             | RFC 9457 through the validation contract                             |
| a backend's live instance          | per class, the process booted as its `ci.yml` builds it: the Node backend with `CONFIG_DIR` at its `__test_config__` written by the runner's global setup and `database_type: sqlite` over `:memory:`, as BoxVault does today; the Python backend with `CONFIG_DIR` at its test directory; the Java backend under `./gradlew test` with a test `CONFIG_DIR`; the Worker as decision 8; the pinned UI tarball unpacked into `ui/` before the process boots | "live-instance tests rather than mocks on backends"; the config contract's one-variable rule makes `CONFIG_DIR` the whole test setup | the config contract, section 1; the class's `ci.yml`                 |
| the test dialect                   | a Node backend runs `sqlite`; a branch reachable only on MySQL stays listed under `potential_dead_code` until a MySQL run exists, as `search_scope_escape` is today; whether the workflow adds a MySQL run is decision 16                                                                                                                                                                                                                                 | the owner's `potential_dead_code` record                                                                                             | `priorities.yaml`, `potential_dead_code.boxvault`                    |
| the browser over the live instance | a backend's `features/` drive the shared UI served by the live instance at `/`, the way a person reaches it; no fixture is served on a backend's run, because the backend's answers are the thing under test                                                                                                                                                                                                                                              | a fixture on a backend run would prove the fixture                                                                                   | this contract                                                        |

---

## 6. The conformance table

Which repository proves which contract's lines. A cell reads ✓ only when an asserting test of
section 4 exists and passes in that repository's `ci.yml`; owed while the contract's own checklist
carries `owed` or `to come` for the backend; n/a where the contract's checklist reads n/a for it.
Every cell is owed at this draft, because no test of this contract exists yet; the column is the
work list.

| Contract   | Shared UI | BoxVault | VDI Health | Auth server | Catalog | hyperweaver-server | agents  |
| ---------- | --------- | -------- | ---------- | ----------- | ------- | ------------------ | ------- |
| navbar     | owed      | owed     | owed       | owed        | owed    | to come            | to come |
| pages      | owed      | owed     | owed       | owed        | owed    | to come            | to come |
| session    | owed      | owed     | owed       | owed        | owed    | to come            | to come |
| events     | owed      | owed     | owed       | owed        | n/a     | to come            | to come |
| validation | owed      | owed     | owed       | owed        | owed    | to come            | to come |
| config     | owed      | owed     | owed       | owed        | n/a     | to come            | to come |
| branding   | owed      | owed     | owed       | owed        | owed    | to come            | to come |
| identity   | owed      | n/a      | n/a        | owed        | n/a     | n/a                | n/a     |

A line reads ✓ when the backend's own tests assert it; owed while its change list names the row;
n/a where the rule has nothing to bind.

---

## Decisions

Open, for the owner to settle in the review round; the draft chooses none of them:

1. The browser test tool. Playwright is the tool the owner named "if chosen": it drives Chromium,
   Firefox and WebKit from one API, its test runner carries request interception, screenshots and
   a CI reporter, and it is one step in a workflow. The other candidate is Cypress, whose own
   runner and Cucumber preprocessor exist; the reason to choose it would be an existing
   familiarity, and none is recorded in the estate.
2. The Gherkin layer. Through the tool's own BDD integration (`playwright-bdd`, which generates
   the tool's tests from `.feature` files, if Playwright is chosen), or through Cucumber's own
   runner (`@cucumber/cucumber`) driving the tool from step files; the first keeps one runner and
   one report, the second keeps Cucumber's own report and vocabulary.
3. The unit runner per class. Shared UI: Vitest, because the build is Vite and the runner reads
   the same configuration; or Jest, because BoxVault runs Jest 30 today and one runner across the
   two Node classes is one thing to keep identical. Node backend: Jest 30 with supertest, as
   BoxVault runs today, or `node:test`, which needs no dependency. Python backend: pytest, the
   runner FastAPI's own documentation tests with. Java backend: the Gradle test task as it runs
   today. Worker: Vitest with Cloudflare's own Workers pool, or the Node runner over
   `wrangler dev`.
4. Whether an in-process app under a request library (BoxVault's supertest over the Express app)
   is the live instance, or the process must boot and listen on a port as `npm start` does. The
   first is what BoxVault has; the second is what a person reaches and what the browser tool
   needs.
5. Whether coverage gates the workflow, and at what threshold on the way to 100 percent; a
   threshold below the current figure never lands.
6. Whether the inline locale-parity script the shared UI's `ci.yml` carries today is a
   hand-written smoke script under the owner's rule and becomes a unit test under the runner of
   decision 3, or stays as a lint step because it asserts no route.
7. Whether the browser tool produces the navbar contract's side-by-side screenshot as a workflow
   artifact, and whether that artifact replaces the screenshot in the PR.
8. How the Worker is stood up live: `wrangler dev` on the runner, or the Workers test pool of
   decision 3, or the Worker's deployed preview.
9. The reusable workflow's file name.
10. The `<ref>` a caller pins the reusable workflow at: `main`, a release tag, or a SHA; a tag
    moves with the UI's release train, a SHA with the dependency-bump pull request.
11. The reusable workflow's inputs: the class, the language version, the boot command, the
    origin, the test directory, and whether the pinned UI version is read from the caller's
    recorded pin location or passed.
12. Installing the browser tool's browsers on the authorization server's self-hosted runner: a
    one-time install on the runner, or the tool's install step on every run.
13. The branding lines of section 4, since the branding contract carries no checklist.
14. Whether the identity contract gains a conformance checklist, or this contract carries its
    proofs per page group.
15. How the fixture is served: the tool's request interception, or a fixture server the runner
    starts from `index.js`.
16. Whether the workflow adds a MySQL run for the Node backend, which would retire the
    `search_scope_escape` entry of `potential_dead_code`.
17. Whether a backend's browser scenarios run in the backend's `ci.yml` alone, or the shared UI's
    `ci.yml` also runs every backend's scenarios against a live instance of each backend.
18. The order the repositories take the contract: the shared UI first (decision 39's tests), then
    the Node backend as the source of its class, then the others; or per priority of
    `merge_projects`.

---

## Per-repository records

| Repository           | Class          | Tests today                                                                                                                                                                                 | Workflow today                                                                                                                                                                                                        | Under this contract                                                                                                                                                                    |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| startcloud-ui        | shared UI      | no test script in `package.json`; `tests/fixtures/config/` with `index.js` and ten JSON files                                                                                               | `ci.yml`: Lint & Format, Locale Parity (an inline `node --input-type=module` script), Build, then CodeQL; `release-please.yml` calls `ci.yml`, builds the tarball, publishes `.prepaint.sha256`, dispatches consumers | holds the reusable workflow; `tests/features/`, `tests/unit/`, `tests/fixtures/`; the decision 39 tests; the locale-parity script per decision 6                                       |
| BoxVault             | Node backend   | `backend/tests/*.test.js`, 53 files, Jest 30 with supertest, `globalSetup.js` writing `__test_config__/` and setting `CONFIG_DIR`, `sqlite` `:memory:`, `TEST_DB_DIALECT` read by the setup | `ci.yml`: Backend Security, Lint & Format, a Test job commented out, then CodeQL                                                                                                                                      | the source of the Node class's shape; the commented Test job replaced by the call to the reusable workflow; `backend/tests/features/` for its scenarios; the MySQL run per decision 16 |
| VDI Health Monitor   | Python backend | none                                                                                                                                                                                        | `ci.yml`: Backend Security (`pip-audit`), Lint & Format (`ruff`, `compileall`, Prettier); no CodeQL, private                                                                                                          | `tests/test_*.py` under the runner of decision 3; the call to the reusable workflow                                                                                                    |
| Authorization server | Java backend   | `src/test/groovy/**/*Test.groovy`, 164 files, `./gradlew test`                                                                                                                              | `ci.yml`: Build & Test on `self-hosted`, fetching the pinned UI tarball, `./gradlew build`, `./gradlew test`; Dependabot Updates; Lint & Format, Build Frontend and CodeQL commented out                              | keeps its tests and runner; the browser step per decision 12 on its runner; `src/test/features/` or the Gradle-side equivalent, decision 3                                             |
| Provisioner catalog  | Worker         | none                                                                                                                                                                                        | `ci.yml`: JSON schema and Sorted (Python scripts), Workflow Lint (actionlint), Lint & Format (markdownlint, Prettier), Docs Build & Link Check (Jekyll, html-proofer), then CodeQL                                    | `worker/tests/` under decision 3; the live Worker per decision 8; every config line n/a                                                                                                |
| hyperweaver-server   | Node backend   | to be recorded                                                                                                                                                                              | to be recorded                                                                                                                                                                                                        | copies the Node class's shape when it joins the shared UI                                                                                                                              |
| agents               | Node, Go       | to be recorded                                                                                                                                                                              | to be recorded                                                                                                                                                                                                        | to be recorded                                                                                                                                                                         |

---

## Retired words

| Word                                      | Where it came from                                  | Replaced by                                                             |
| ----------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| a hand-written smoke script in a workflow | the owner's rule names it as the thing to retire    | a test under the runner of section 2, or a step of section 3's workflow |
| a commented-out Test job in `ci.yml`      | BoxVault's `ci.yml`                                 | the call to the reusable workflow                                       |
| a dev proxy target as a test's backend    | config contract decision 39                         | the fixture of section 5                                                |
| a mock of a route on a backend            | the owner's "live-instance tests rather than mocks" | the live instance of section 5                                          |
| a ✓ without an asserting test             | the checklists' rule                                | ✓ only by an asserting test                                             |

---

## Specification anchors

Gherkin reference and the Cucumber documentation for the `.feature` grammar and step definitions ·
Playwright Test documentation, if chosen (the runner, request interception with `page.route`,
screenshots, the CI guide and browser installation) · `playwright-bdd` and `@cucumber/cucumber`
documentation, decision 2 · GitHub Actions: reusing workflows (`on: workflow_call`, `jobs.<id>.uses`
with `owner/repo/.github/workflows/<file>@<ref>`, inputs, access from private repositories to a
public repository's workflow), `actions/upload-artifact`, self-hosted runners · Jest, Vitest,
`node:test`, pytest, the Gradle test task and Cloudflare's Workers test documentation, decision 3
· the Universal Config Contract (section 1 directory row, section 2 development file, decision
39, the conformance rule of section 10) · the Universal Identity Contract ("Build, packaging and
tests", decision 23) · the Universal Navbar Contract (Distribution, the status payload, the
conformance checklist's screenshot rule) · the Universal Validation Contract (Surfaces, the error
body) · the Universal Events Contract (the frame grammar, the conformance checklist) ·
`priorities.yaml`: `design_documents.universal_testing`, `uniformity.ci_cd.testing`,
`uniformity.ci_cd.workflow_set`, `uniformity.ci_cd.security`, `uniformity.potential_dead_code`.

---

**Related:** [Universal Config Contract](universal-config/) |
[Universal Validation Contract](universal-validation/) |
[Universal Navbar Contract](universal-navbar/) |
[Universal Pages Contract](universal-pages/) |
[Universal Session Contract](universal-session/) |
[Universal Events Contract](universal-events/) |
[Universal Identity Contract](universal-identity/) |
[Preferences, Language & Branding Contract](preferences-and-branding/)
