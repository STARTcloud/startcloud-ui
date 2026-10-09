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
of to the one place that makes machines: a BoxVault box or a catalog
provisioner on the sending side, a Hyperweaver create wizard on the
receiving side, one open query vocabulary between them, and one rule that
picks the receiver, the person's own desktop agent or a Hyperweaver server
they attached. This contract fixes the vocabulary, the target rule, what a
sender draws and what a receiver does with what it is handed. It extends
the [Universal Navbar Contract](universal-navbar/), whose `deploy` token
gates the sender and whose `machine-create` token gates the receiver, and
the [Universal Identity Contract](universal-identity/), whose connected
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
- **The receiver asks before it writes.** A hand-off opens a wizard seeded
  with what it carried and stops there. Nothing is created until the
  person presses Create on the receiving page.
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

| Key                   | Meaning                                               | Sender       |
| --------------------- | ----------------------------------------------------- | ------------ |
| `create`              | the intent; `machine` is the one word today           | every sender |
| `box`                 | the box as `organization/name`                        | BoxVault     |
| `box_version`         | the box version                                       | BoxVault     |
| `box_arch`            | the architecture                                      | BoxVault     |
| `box_url`             | the origin the box is fetched from                    | BoxVault     |
| `provisioner`         | the provisioner family as `organization/name`         | the catalog  |
| `provisioner_version` | the family's version                                  | the catalog  |
| `provisioner_url`     | the URL of the version's package                      | the catalog  |
| `provisioner_catalog` | the URL of the catalog document that lists the family | the catalog  |

`provisioner_catalog` is the document a host takes as a catalog source,
fetched as given: `<catalog origin>/catalog.json` for the public catalog,
`<catalog origin>/api/private/<organization uuid>/catalog` for an
organization's private one.

A sender sends the members it has and no other; a member it does not have
is left out, never sent empty. A receiver reads `create` first and treats
every other key as a seed of the wizard that intent opens. A key outside
this table is refused by the desktop agent and ignored by a server, so a
new member joins this table before any sender writes it.

Another intent grows this table with its own word under `create` and its
own seed keys; it never reuses a key of this table with another meaning.

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

A sender draws the Deploy control of the Universal Navbar Contract, the
bare Hyperweaver glyph and nothing else, on every row and card of a
collection whose items a machine can be made of, signed in or not,
while:

- the host advertises the `deploy` token;
- the item has a deployable version, the newest that is not deprecated.

The control is one link whose `href` is the target rule's link over the
seed of that item and version. Nothing is read to draw it beyond the
status, the session and the item.

| Collection           | Seed                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| BoxVault boxes       | `box`, `box_version`, `box_arch`, `box_url`                                    |
| catalog provisioners | `provisioner`, `provisioner_version`, `provisioner_url`, `provisioner_catalog` |

A press asks `GET /api/status` of the target from the browser before it
follows the link, and waits on no clock:

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
against the table above, mints its tray token and opens the signed-in UI
at `/?<query>#tray=…`; the UI claims the fragment, strips it, and the
hosts feature moves `/?<query>` to the create wizard of the one serving
agent, `/hosts/self?<query>`.

**A server** receives `<origin>/?<query>` on its hosts page, which moves
the query to the page of the first host whose row lists `machines` and
`machine-create` for a person who may create, `/hosts/<id>?<query>`, and
stays on the list while no host does.

On either, the host page opens the create wizard over itself while the
host offers a create, the query's members seeding the wizard: the box
members land on the Box step as a custom pick; `provisioner` names the
host's family by the part after its slash, picked on the Provisioning
step once the host's provisioners have answered, and
`provisioner_version` its version, or the family's first, once the family
is picked, so the version's manifest is read as a person's own pick reads
it. Closing the wizard takes the query out of the route, so a reload opens
it again only when asked.

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
install writes only on the person's press.

---

## Checklist

A sender:

- draws the Deploy glyph behind `deploy` and a deployable version, signed
  in or not;
- writes the members of its seed and no other, each at most once;
- builds the link from the `integrations` claim by the target rule;
- asks the target's status before it follows the link.

A receiver:

- reads `create` and refuses or ignores any key outside the table;
- moves `/?<query>` to the first host that creates, or `self`;
- opens the wizard seeded, asks, and writes nothing on its own;
- installs a family it does not hold only on the person's press, through
  its catalog install.

The identity provider:

- keeps the `hyperweaver` connected service with `servers` and
  `deploy_target`, answers the `integrations` claim under its scope, and
  validates the settings through the `integration-hyperweaver` form.
