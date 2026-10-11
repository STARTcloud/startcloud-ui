---
title: Universal Deploy Contract
layout: default
nav_order: 17
parent: Guides
permalink: /docs/guides/universal-deploy/
---

## Universal Deploy Contract

{: .no_toc }

One hand-off from any estate page that names a thing a machine can be made
of to the one place that holds machines: a BoxVault box or a catalog
provisioner on the sending side, a Hyperweaver host on the receiving side,
one open query vocabulary between them whose first word says what the
host does with the thing, make a machine, install the provisioner, pull
the box as a template or add the catalog or the registry as a source, and
one rule that picks the receiver, the person's own desktop agent or a
Hyperweaver server they attached. This contract fixes the vocabulary, the
words, the target rule, what a sender draws and what a receiver does with
what it is handed. It extends the
[Universal Navbar Contract](universal-navbar/), whose `deploy` token gates
the sender and whose `machine-create`, `provisioner-registry` and
`templates` tokens gate the receiver, and the
[Universal Identity Contract](universal-identity/), whose connected
service `hyperweaver` holds the person's servers and their deploy target.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **One vocabulary, open at both ends.** The hand-off is a query string.
  A sender writes the members it knows about the thing; a receiver reads
  the members it understands and ignores the rest. Neither end knows the
  other's version.
- **The receiver asks before it writes.** A hand-off opens a wizard or a
  dialog seeded with what it carried and stops there. Nothing is created,
  installed, pulled or added until the person presses the one action on
  the receiving page.
- **One word, one landing.** The word under `create` names what the host
  does with the thing, and each word lands on the one page of the host
  that does it; a sender never names a page and a receiver never guesses
  from the keys.
- **The person picks the receiver once.** The target is a preference kept
  by the identity provider on the person's `hyperweaver` connected
  service, read by every sender from the token's `integrations` claim, so
  a sender makes no second call to decide where a link goes.
- **Local is the default.** A person signed out, who has attached no
  server, or who chose `local`, is handed to the desktop agent on their
  own machine through its protocol scheme; a server is the target only
  when the person named it.
- **The sender asks before it hands off.** A press asks the target's
  status first, so a person with no agent and no server is told what to
  install or join instead of a link that opens nothing.
- **The wire is the seed.** The query keys are the same members the
  create wizard's fields carry, so a receiver seeds its form by name and
  a sender needs no knowledge of the wizard.

---

## The query

Every hand-off is one query string, `application/x-www-form-urlencoded`,
each key at most once, the whole at most 2048 bytes.

| Key                   | Meaning                                                            | Sender       |
| --------------------- | ------------------------------------------------------------------ | ------------ |
| `create`              | the word, one of `machine`, `provisioner`, `template` and `source` | every sender |
| `box`                 | the box as `organization/name`                                     | BoxVault     |
| `box_version`         | the box version                                                    | BoxVault     |
| `box_arch`            | the architecture                                                   | BoxVault     |
| `box_url`             | the origin the box is fetched from                                 | BoxVault     |
| `provisioner`         | the provisioner family as `organization/name`                      | the catalog  |
| `provisioner_version` | the family's version                                               | the catalog  |
| `provisioner_url`     | the URL of the version's package                                   | the catalog  |
| `provisioner_catalog` | the URL of the catalog document that lists the family              | the catalog  |
| `box_<provider>`      | the box the version is verified with on one provider               | the catalog  |

`provisioner_catalog` is the document a host takes as a catalog source,
fetched as given: `<catalog origin>/catalog.json` for the public catalog,
`<catalog origin>/api/private/<organization uuid>/catalog` for an
organization's private one.

`box_<provider>` is one member per provider the catalog verified the
version with, `<provider>` the provider's name in lowercase letters,
digits, underscores and hyphens, `box_virtualbox`, `box_zone`,
`box_bhyve`, `box_utm`; its value is
`organization/name@version@architecture@url`, the box's four members
joined by `@`, the URL everything after the third `@`, the whole value
encoded once as the query encodes it. A version the catalog verified with
no box sends none. The members follow the fixed ones, sorted by key, so
a query reads the same from every sender.

A sender sends the members its word admits and has, and no other; a
member it does not have is left out, never sent empty. A receiver reads
`create` first and treats every other key as the seed of the page that
word opens. A key outside this table, or outside its word's keys, is
refused by the desktop agent and ignored by a server, so a new member
joins this table before any sender writes it.

Another word grows this table with its own entry under `create` and its
own seed keys; it never reuses a key of this table with another meaning.

### The words

| Word          | What the host does                                                     | Keys                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `machine`     | makes a machine of the box, the provisioner, or both                   | `box`, `box_version`, `box_arch`, `box_url`, `provisioner`, `provisioner_version`, `provisioner_url`, `provisioner_catalog`, `box_<provider>` |
| `provisioner` | installs the provisioner family at the version, no machine             | `provisioner`, `provisioner_version`, `provisioner_url`, `provisioner_catalog`                                                                |
| `template`    | pulls the box as a template, no machine                                | `box`, `box_version`, `box_arch`, `box_url`                                                                                                   |
| `source`      | adds the catalog as a catalog source or the registry as a box registry | exactly one of `provisioner_catalog` and `box_url`                                                                                            |

`box_<provider>` rides `machine` alone, because only a machine is built
from the box a version is verified with. A `source` query names one URL
and no other key: `provisioner_catalog` adds a catalog source,
`box_url` adds a box registry, and a query carrying neither or both is
refused. Every word's query is written in this order: `create`, then the
word's keys in the table's order, each present only while the sender has
it.

```text
create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com
create=provisioner&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz&provisioner_catalog=https%3A%2F%2Fcatalog.example.com%2Fcatalog.json
create=template&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com
create=source&provisioner_catalog=https%3A%2F%2Fcatalog.example.com%2Fcatalog.json
create=source&box_url=https%3A%2F%2Fboxvault.example.com
```

---

## The target

The person's target lives on the identity provider as the `hyperweaver`
connected service of the Universal Identity Contract, `settings.servers`
the Hyperweaver servers they attached and `settings.deploy_target` one of
`local` or a listed server's origin. A client that requests the
`integrations` scope carries the service on the token's `integrations`
claim, so a sender reads the target from the claims it already holds.

| The claim says                                                           | The link             |
| ------------------------------------------------------------------------ | -------------------- |
| signed out, no `hyperweaver` entry, or `deploy_target` absent or `local` | `hwa://open?<query>` |
| `deploy_target` an origin                                                | `<origin>/?<query>`  |

A server link opens in a new tab; a protocol link opens in place, because
the operating system hands it to the agent and the page stays.

### The agent's scheme

The desktop agent's protocol scheme is `hwa`. It is the name every
installed agent registers with the operating system, on Windows, Linux
and macOS, and the name the shared UI's own desktop sign-in button opens,
so one link form reaches every agent ever installed.

| Name                               | Registered by the agent | Written by a sender | Accepted by the agent |
| ---------------------------------- | ----------------------- | ------------------- | --------------------- |
| `hwa`                              | yes                     | yes                 | yes                   |
| `hyperweaver-agent`                | yes                     | no                  | yes                   |
| `com.startcloud.hyperweaver-agent` | yes                     | no                  | yes                   |

Every reader of a protocol link, the agent and any page or test that
checks one, accepts all three names and both forms, `<scheme>://open` and
`<scheme>:/open`; every writer of one writes `hwa://open`. The two longer
names exist so the macOS bundle identifier and a plain launch name resolve
to the agent as well; neither is a link a sender builds.

`hwa://open` is the form, not the reverse-domain single-slash form of RFC
8252 section 7.1, because that section describes an OAuth redirect URI of
a native app and not a link that launches one: a protocol link needs only
a scheme name the operating system has registered, RFC 7595 section 3.8's
reversed-domain naming is a SHOULD that the registered short-name schemes
of the industry (`vscode`, `steam`, `slack`, `notes`, `ms-*`) do not
follow, `//` is legal syntax under RFC 3986 section 3, and a link that
names a scheme the installed agent never registered opens nothing. The
Universal Identity Contract records `hwa://` as the estate's desktop
hand-off scheme and the reverse-domain form as a recorded deviation.

A change to the scheme a sender writes changes this section first, then
the one constant each sender holds, and nothing else; the constant's own
note points here.

A person edits the servers and the target on their profile's Preferences
section and on the service's own page at `/user/integrations/hyperweaver`,
through the identity provider's `PATCH /api/user/integrations/hyperweaver`
with the whole `settings`, validated by the `integration-hyperweaver`
rules form; a hyperweaver-server a person signs into attaches itself
through `POST /api/user/integrations/hyperweaver/connect`, and the first
server attached becomes the default and the target.

---

## The sender

A sender draws the Deploy control of the Universal Navbar Contract, one
split control, on every row and card of a collection whose items a
machine can be made of, signed in or not, while:

- the host advertises the `deploy` token;
- the item has a deployable version, the newest that is not deprecated.

The control's first part is the bare Hyperweaver glyph, one link whose
`href` is the target rule's link over the `machine` query of that item
and version, the one press a person makes most. Its second part is a
chevron at the glyph's right, 14px wide, borderless, with no background,
that opens the menu of the other words, aligned to the control's end,
headed "Send {version} to my Hyperweaver" and one row a word, the word's
label and its glyph and nothing else: Deploy a machine first, the rocket,
then the collection's own words. Each row is one link whose `href` is the
target rule's link over that word's query, opened the way the glyph's link
opens. Nothing is read to draw the control beyond the status, the session
and the item.

| Collection           | Rows after Deploy a machine                       | Seed                                                                                             |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| BoxVault boxes       | Pull as a template; Add this registry as a source | `box`, `box_version`, `box_arch`, `box_url`                                                      |
| catalog provisioners | Install on my agent; Add this catalog as a source | `provisioner`, `provisioner_version`, `provisioner_url`, `provisioner_catalog`, `box_<provider>` |

A press of the glyph or of a row asks `GET /api/status` of the target
from the browser before it follows the link, and waits on no clock:

- the local target asks the desktop agent at `https://127.0.0.1:9421`;
  an answer follows the link in this window, and no answer opens one
  dialog: Install Hyperweaver Agent, the agent's latest release; Join a
  Hyperweaver server, the identity provider's
  `/user/integrations/hyperweaver` page, where a person signs in, attaches
  a server and picks it as the target; and Support, the Help ticket link;
- a server target opens its tab on the press and asks the server; an
  answer sends the tab to the link, and no answer closes the tab and
  raises the notice "Your Hyperweaver server isn't answering", carrying
  Open on this machine while the desktop agent answers.

A sender reads the target from the `integrations` claim, so its client
requests the `integrations` scope.

---

## The receiver

Two receivers exist, and a person reaches one or the other by the target
rule alone.

**The desktop agent** receives `hwa://open?<query>`, validates the query
against the table above and the word's keys, mints its tray token and
opens the signed-in UI at `/?<query>#tray=…`; the UI claims the fragment,
strips it, and where a tab of the agent's UI is already open hands
`/?<query>` to that tab over the session layer's `hw-auth` channel and
closes the tab the agent opened, so the hand-off lands in the tab the
person already has; the hosts feature then moves `/?<query>` to the
word's landing on the one serving agent, `/hosts/self…?<query>`, or
stays on the dashboard with one warning notice while the agent cannot
take the word.

**A server** receives `<origin>/?<query>` on its hosts page, which counts
the hosts that can take the word for a person who may create: exactly one
moves the query to that host's landing, none keeps the page under the
hand-off's banner alone, and several draw the banner and make the page
the pick.

### The landing of each word

A host takes a word while its own row lists the word's token, checked
strictly, and the word lands on the page of the host that does it, the
query and its seed kept on the route until the page has used them:

| Word          | Token                                                                           | Landing                                         | What opens                                                                         |
| ------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `machine`     | `machines` and `machine-create`                                                 | `/hosts/<id>?<query>`, the host's page          | the create wizard                                                                  |
| `provisioner` | `provisioner-registry`                                                          | `/hosts/<id>/provisioning/provisioners?<query>` | the handed family's card marked, its version selected, Install one press away      |
| `template`    | `templates`                                                                     | `/hosts/<id>/provisioning/templates?<query>`    | the handed box's card marked, Install one press away                               |
| `source`      | `provisioner-registry` for a `provisioner_catalog`, `templates` for a `box_url` | the Provisioners page or the Templates page     | the Sources modal, or the Registries modal, open with its form filled from the URL |

The banner on the hosts page is one notice of the banner tier, keyed, the
word's glyph, the title naming what was handed, Deploy, Install, Pull or
Add with the thing's `organization/name` and its version, and one line:
while hosts can take it, "Pick the host that makes the machine. The box
and the provisioner come along; a host that lacks them installs them on
the way.", "Pick the host that gets the provisioner. No machine is made.",
"Pick the host that pulls the template. No machine is made." or "Pick the
host that gets the source."; while none can, "No host on this server can
take it." as a warning. Under it the hosts page is the pick, in the table
or in the cards the page's view toggle picks: a host that can take the
word has its whole row or card as one press to its landing, and a host
that cannot is greyed with the one reason beside its name, "cannot create
machines", "no provisioner registry" or "no templates", the name plain
text on its card and its own link to its page kept in the table. The
banner's dismiss drops the hand-off from the route.

**`provisioner`** lands on the host's Provisioners page with the handed
family's card marked, scrolled into view, its Versions fold open and the
handed version selected, drawn whatever the panel's Installed group says;
Install on that version sends `POST provisioning/catalog/install` as a
person's own press sends it and drops the hand-off from the route. A
family no source of the host lists draws the Install card of the create
wizard's Provisioning step over the listing, Add source and install
adding the handed catalog first, the same chain and the same words.

**`template`** lands on the host's Templates page with the handed box's
card marked with the handed version, scrolled into view and drawn
whatever the panel's Installed group says, every registry's catalog read
as the person, the forwarded person's token first, the host's bound
account's token second and the registry's own key last; Install on that
card sends `POST templates/pull` with the handed version and architecture
on the box's registry as a person's own press sends it and drops the
hand-off from the route. A host that holds no such registry draws the
Add registry and continue card over the listing, whose press writes the
registry through the host's `PUT config/storage` as the create wizard
writes it and reads the registries again, so the listing reads the new
registry and marks the card.

**`source`** with a `provisioner_catalog` lands on the host's
Provisioners page with the Sources modal open and its form filled under
the table, the catalog's host as the display name, the URL as given and
the authentication, `oidc` for an organization's private catalog and
`none` otherwise; Save sends `POST provisioning/catalog/sources`, a `409`
reading as already held, and the sources are read again. With a `box_url`
it lands on the host's Templates page with the Registries modal open and
its form filled, the registry's host lowercased as its id, its host as
the display name and its origin as the URL; Save is the one merge patch
of `PUT config/storage` the Templates page writes. Closing either form
drops the hand-off from the route.

### The receiver's control

A host's Provisioners page and its Templates page are the catalog's and
BoxVault's own listings, the same card, the same table, cards by default
and the view toggle last in the heading pane, over every family and
every box the host's catalog sources and enabled box registries list,
each drawn once from the first source that lists it, and each carrying
the source it came from. The words are the same on both pages and never
Pull or Downloaded: Installed, Not installed, Update available, Install,
Update to.

- **The Deploy slot** of every card foot and every table cell is one
  split control: the Hyperweaver glyph at full colour while the host
  holds none of the item, its press Install of the newest version; at
  full colour with a small exclamation dot while the host holds only an
  older version, its press Update to the newest; greyed and disabled
  while the host holds the newest. Beside it a chevron opens the menu
  headed by the newest version, plain entries, the fetch entries over a
  divider and the delete entries under it. A missing provisioner offers
  Install, Install an older version, which picks one of the versions the
  host lacks, and Add this catalog as a source; a held provisioner Update
  to while behind, Update from source while the family came from git or
  a folder, then Delete of each held version and Delete family. A missing
  box offers Install, Install an older version and Add this registry as a
  source; a held box Update to while behind and Move of each held
  version, then Delete of each held version. Every delete waits behind
  the typed confirmation, and a refused provisioner delete names the
  machines that reference it.
- **The Versions fold** of a card lists every version with its date and
  two square outlined buttons: the download glyph installs that version
  onto the host, disabled and titled Installed on a version the host
  holds, and the Hyperweaver mark opens the create wizard with that
  version while the host creates machines. The catalog's and BoxVault's
  own version lines draw the same two outlined buttons, Download and
  Deploy.
- **The listing** sorts installed entries first, the Status column the
  sort, descending, reading Installed, Update available or nothing; the
  navbar panel's Installed group, Installed and Not installed, is on
  Installed when the page opens; with the group narrowing nothing every
  entry draws and the missing ones are greyed; Add in the heading pane
  flips the group to Not installed alone and a second press or Clear
  filters flips it back, the heading's muted text reading Add meanwhile.
- **The heading pane** carries glyphs with titles alone: Provisioners
  Add, Sources, Import, Refresh and the view toggle; Templates Add,
  Registries, Import, Export machine, Publish, Refresh and the view
  toggle. Import on Provisioners is the import of a family from a
  folder, an archive or a git repository; Import on Templates is the
  pull of a box by name.
- **Sources and Registries** open one modal each: the title and the
  close button, a heading pane with the label and Add at its right, the
  one table of the sources, Name, Key, URL, Default and Enabled where a
  row carries it, each row's Make default, Enable or Disable, Edit and
  Remove where the host offers a route for it, and under the table the
  add or edit form while Add or Edit is pressed, so no dialog opens over
  the modal. A catalog source offers Add alone and a box registry all
  four over `PUT config/storage`, because the agent's catalog sources
  answer `GET` and `POST` and no other verb.
- **One read a source.** The page reads each source's catalog once as it
  draws, the host's own families or templates once, and nothing else of
  the catalog, because the listing is the one place the catalog is
  shown.

**`machine`** lands on the host's page, which opens the create wizard over
itself while the host offers a create, the query's members seeding the
wizard, and stays where it is with one notice while no host offers one:
the box members land on the Box step as a custom pick, `box` with its three
members where the query carries it, else the `box_<provider>` member the
host's hypervisor picks, a VirtualBox host `box_virtualbox`, a bhyve host
`box_zone` then `box_bhyve`, a UTM host `box_utm` then `box_virtualbox`,
its four parts the box, the version, the architecture and the registry
URL, so the Box step shows the box the catalog verified the version with;
`provisioner` names the
host's family by the part after its slash, picked on the Provisioning
step once the host's provisioners have answered, and
`provisioner_version` its version, or the family's first, once the family
is picked, so the version's manifest is read as a person's own pick reads
it. Closing the wizard takes the query out of the route, so a reload opens
it again only when asked.

A handed box whose registry the host does not hold, none of the host's
template sources being one the box's URL starts with, puts one card on
the Box step, **Add registry and continue**, whose press writes the
registry through the host's `PUT config/storage`, the registry's host as
its id and display name and its origin as its URL, and reads the
registries again; a refused write says so with Retry. The agent's create resolves `settings.box_url` against its
registries and chains the box's download in front of the build,
answering `requires_download`, which the wizard's notice says, so the
machine is built from a box the host never held.

A family the host does not hold puts one card on the Provisioning step,
while the host's task events reach the page:

- **Install and continue** while one of the host's catalog sources lists
  the family and the version;
- **Add source and install** while none does and `provisioner_catalog`
  names a catalog the host does not hold; the press first adds it through
  `POST provisioning/catalog/sources` with its `display_name`, its `url`
  and `auth`, `oidc` for an organization's private catalog and `none`
  otherwise;
- **Sign in with SSO to continue** while the host answers the private
  catalog `401` with the `authentication` problem, the agent's SSO sign-in
  continuing the same chain;
- **Couldn't find this provisioner at its catalog**, with Retry, for any
  failure.

One press installs through `POST provisioning/catalog/install` with the
source, the family and the version, the agent verifying the package's
checksum; the card shows the task's progress from `task-updated`, then
the wizard reads the host's provisioners again and picks the family and
the version, so the fields fill as a person's own pick fills them. The
receiver never imports from a URL the query carries.

The wizard's Create is the one machine write, `POST machines` with the
spec the person confirmed; the hand-off itself writes nothing, and the
install writes only on the person's press. The same holds of every word:
Install, the pull's submit and a source's submit are each one press of the
person, and a hand-off that is dismissed or closed leaves the host as it
found it.

---

## Checklist

A sender:

- draws the split Deploy control behind `deploy` and a deployable
  version, signed in or not, the glyph the `machine` link and the chevron
  the menu of the collection's other words;
- writes the members its word admits and has and no other, each at most
  once, `box_<provider>` under `machine` alone and one URL under `source`;
- builds every link from the `integrations` claim by the target rule;
- asks the target's status before it follows the link, from the glyph and
  from a row alike.

A receiver:

- reads `create` and refuses or ignores any key outside the table or
  outside the word's keys, the `box_<provider>` family inside `machine`;
- moves `/?<query>` to the word's landing on the one host that takes it,
  or `self`, makes the hosts page the pick under the banner while several
  do, and says so under the banner while none does;
- opens the wizard or the dialog seeded, the box of the host's hypervisor
  on the Box step, the family's card marked, asks, and writes nothing on
  its own;
- installs a family it does not hold, pulls a template, adds a registry
  or a catalog source only on the person's press, through its catalog
  install, its templates pull, its catalog sources and its storage
  configuration;
- drops the hand-off from the route as its dialog closes, its card's
  Install is pressed or its banner is dismissed.

The identity provider:

- keeps the `hyperweaver` connected service with `servers` and
  `deploy_target`, answers the `integrations` claim under its scope, and
  validates the settings through the `integration-hyperweaver` form.
