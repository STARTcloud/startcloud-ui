---
title: Universal Config Contract
layout: default
nav_order: 14
parent: Guides
permalink: /docs/guides/universal-config/
---

## Universal Config Contract

{: .no_toc }

One configuration model on every backend: plain YAML files an administrator
can read and edit, and beside them, shipped with the code, one schema per file
that says what every value is, what it may be, how it is drawn and what
happens when it changes. The schema is the [Universal Validation
Contract](universal-validation/)'s rule set applied to configuration, so the
setup page, the admin page and the write route evaluate one document and
refuse a bad value the same way with the same body. No environment variables
but the one that says where the files are; the authorization server stands
outside this rule. This contract fixes the files, the schema document, the routes, secrets, boot,
upgrades and migrations, and what the shared UI draws. It extends the
[Universal Navbar Contract](universal-navbar/), whose status payload names
the files. The visual reference is
[universal-config.html](../universal-config.html).

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **The file is plain.** A leaf holds its value and nothing else:
  `api_listen_port_encrypted: 443`. What every Unix service does; readable in
  a pager, diffable across releases, editable by hand with the UI backend's own
  comments kept.
- **The schema is the UI backend's, versioned with its code.** Rules and drawing
  metadata live in a schema file shipped in the package, never in `/etc`, so
  an administrator cannot edit or break a rule and an upgrade brings the new
  rules with it.
- **One evaluator.** The schema is JSON Schema 2020-12 keywords plus drawing
  words; the shared UI's validator and every UI backend's route evaluate it the same
  way the validation contract's forms are evaluated.
- **Validate, then write.** A `PUT` is refused with 422 and pointers before
  anything touches the file; a file that fails its schema at boot stops the
  UI backend with every failing pointer logged.
- **Secrets never leave the UI backend in the clear.** A `writeOnly` value reads
  back masked and is kept when a write carries the mask or nothing.
- **An upgrade is the schema's job.** Defaults fill new keys, unknown keys are
  reported, renames are one line in the UI backend's migration list; the file is
  never rewritten wholesale.
- **One environment variable, no more.** `CONFIG_DIR`. Everything else, the
  production-versus-development switch included, is a value in a file; which
  config directory exists chooses the environment. The authorization server
  is exempt from this rule entirely.

---

## Files and environment

| Rule        | Value                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| location    | `/etc/<app>/<name>.config.yaml` in production; `config/<name>.dev.config.yaml` in the tree otherwise; the setup token, the SSL pair and the config backups beside them                                                                                                                    |
| names       | `status.config` lists them (`["app"]` on the VDI Health Monitor, `["app", "auth", "db", "mail"]` on BoxVault); each is a tab of the admin page and of the setup page; a name outside the list is 404                                                                                      |
| environment | `CONFIG_DIR`, default `/etc/<app>`, the only environment variable a backend reads; there is no environment switch, production versus development is chosen by which config directory exists; any other setting in an environment variable is a defect; the authorization server is exempt |
| the schema  | `<name>.schema.yaml` beside the code (BoxVault `backend/app/config/schema/`, VDI `vdi_health/schema/`), one per file, YAML on disk because YAML is a JSON superset; served as JSON                                                                                                        |
| format      | YAML 1.2 as `js-yaml` and PyYAML read it; keys `snake_case`; a value is a scalar, a list of scalars, or a map for a free subtree the schema names as such                                                                                                                                 |

### A file and its schema

`/etc/boxvault/app.config.yaml`:

```yaml
boxvault:
  origin: https://boxvault.startcloud.com
  api_listen_port_unencrypted: 80
  api_listen_port_encrypted: 443
  box_storage_directory: /var/lib/boxvault/storage
  trust_proxy: true
gravatar:
  api_key: 3f9c…
logging:
  level: info
  categories:
    app: info
    api: info
```

`backend/app/config/schema/app.schema.yaml`:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
title: App Config
sections:
  application:
    title: Application
    order: 1
properties:
  boxvault:
    type: object
    section: application
    subsection: boxvaultSettings
    title: BoxVault Settings
    properties:
      origin:
        type: string
        format: uri
        title: Origin
        description: The origin URL for BoxVault
        order: 1
      api_listen_port_encrypted:
        type: integer
        minimum: 1
        maximum: 65535
        default: 443
        title: HTTPS port
        description: The port BoxVault listens on for HTTPS (may not be the proxied port)
        order: 4
        requiresRestart: true
    required: [origin, api_listen_port_unencrypted, api_listen_port_encrypted]
  gravatar:
    type: object
    section: application
    subsection: gravatarSettings
    properties:
      api_key:
        type: string
        writeOnly: true
        title: Gravatar API key
        order: 2
  logging:
    type: object
    section: application
    subsection: loggingSettings
    properties:
      level:
        type: string
        enum: [error, warn, info, debug]
        default: info
        title: Log level
        order: 1
      categories:
        type: object
        subsection: loggingCategories
        additionalProperties:
          type: string
          enum: [error, warn, info, debug]
```

---

## The schema document

One JSON Schema 2020-12 document per file. The rules are the validation
contract's vocabulary; the drawing words are this contract's additions, which
the spec permits as annotations (Core §7.7.1).

| Keyword                                                                                                                                         | Meaning                                                                                                                                                                                                                                                               | Spec                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `type`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`, `format`, `required`, `minItems`, `maxItems`, `additionalProperties` | the rules, as the validation contract fixes them; `additionalProperties` describes every entry of a free map (`logging.categories`)                                                                                                                                   | Validation §6, §7; Core §10.3.2.3 |
| `default`                                                                                                                                       | the value a missing key takes at boot and in `postinst`; RECOMMENDED valid against the schema                                                                                                                                                                         | Validation §9.2                   |
| `title`, `description`                                                                                                                          | the field's label and the hint under it                                                                                                                                                                                                                               | Validation §9.1                   |
| `readOnly`                                                                                                                                      | drawn, never editable (the database dialect the type sets)                                                                                                                                                                                                            | Validation §9.4                   |
| `writeOnly`                                                                                                                                     | a secret: masked as `********` on read, kept when a write carries the mask or blank                                                                                                                                                                                   | Validation §9.4                   |
| `deprecated`                                                                                                                                    | drawn with a deprecation note; removed by a later migration                                                                                                                                                                                                           | Validation §9.3                   |
| `section`, `subsection`, `order`                                                                                                                | where and in what order the field is drawn; `sections` at the root names and orders the tabs' groups; an object property that names a `subsection` gives it its `title`, and a property naming none inherits its parent's; a property in no section goes to `general` | this contract                     |
| `upload`                                                                                                                                        | a text field with an upload button (the SSL paths)                                                                                                                                                                                                                    | this contract                     |
| `dependsOn`, `showWhen`                                                                                                                         | drawn only while a sibling has one of the values; the one conditional form                                                                                                                                                                                            | this contract                     |
| `requiresRestart`                                                                                                                               | the admin page says a restart is needed after this value changes; the route reports it in its 200                                                                                                                                                                     | this contract                     |
| `x-pool` and any other `x-` key                                                                                                                 | a UI backend's own annotation, ignored by the shared UI; a `type: object` with neither `properties` nor `additionalProperties` is a free subtree the page does not draw                                                                                               | OpenAPI convention                |

The one collection the shared UI draws as a dialog rather than a list of
fields is the OIDC providers map, `type: object` with `additionalProperties`
describing one provider: the dialog's fields are the item schema's
properties, its key follows the validation contract's `$defs.providerName`
and must not already be a key of the map, both checked in the browser, and
the whole map is written back through `PUT /api/config/auth` as one value,
so a refused write points into the map, `/auth/oidc/providers/<key>/issuer`,
and the dialog paints it on the field the last segment names.

`options`, `min`, `max`, `validation{}`, `conditional{}`, `subsection_key`,
`_sections`, `collection` and `item_schema` are not keywords of this contract;
the table at the end says where each came from and what replaces it.

---

## Routes

| Route                                                | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/config/<name>`                             | the file as JSON, `writeOnly` values masked; admin only                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/config/<name>/schema`                      | the schema document itself as JSON; admin only, since it names the file's shape                                                                                                                                                                                                                                                                                                                                                                                      |
| `PUT /api/config/<name>`                             | the body is the whole file or a subtree of it; the route restores masked secrets, evaluates the merged result against the schema, answers 422 with one `errors[]` entry per failing value (pointer `/boxvault/api_listen_port_encrypted`, into the body as sent), and only then writes the file atomically with a backup beside it; 200 carries `{ "message": "…", "requires_restart": true }` when a changed key says so, `snake_case` like every other body member |
| `POST /api/config/restart`                           | exits for the process manager, as today                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/setup`                                     | `{ "configs": { "<name>": <file> } }`, every file in `status.config`, secrets masked, under the setup token                                                                                                                                                                                                                                                                                                                                                          |
| `GET /api/setup/schema`                              | `{ "schemas": { "<name>": <schema> } }`, under the setup token                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/setup`                                     | the body is `{ "configs": { "<name>": <file> } }`; every file evaluated against its schema, the 422 carrying every failing value of every file with pointers into the body as sent, `/configs/app/boxvault/origin`; nothing written while any fails                                                                                                                                                                                                                  |
| `GET /api/config/ticket`, `/grafana`, `/hyperweaver` | the public subsets a page needs before login, unchanged                                                                                                                                                                                                                                                                                                                                                                                                              |

The refused write is the validation contract's body:

```json
{
  "type": "https://auth.startcloud.com/probs/validation",
  "title": "The configuration did not pass validation.",
  "status": 422,
  "errors": [
    {
      "pointer": "/boxvault/api_listen_port_encrypted",
      "rule": "maximum",
      "params": { "maximum": 65535 },
      "detail": "api_listen_port_encrypted must be at most 65535"
    },
    {
      "pointer": "/logging/log_directory",
      "rule": "writable",
      "params": {},
      "detail": "/var/log/boxvault is not writable by boxvault"
    }
  ]
}
```

A rule the schema cannot express (a directory the UI backend cannot write, a host it
cannot reach) is code on the route and answers in the same entry with one of
the validation contract's named rules, `writable` or `reachable`; the UI
paints it from `validation.<rule>` with the field's `title`.

---

## Secrets

- A `writeOnly` value reads back as `********` from `GET /api/config/<name>`
  and from the setup read.
- A write carrying `********` or an empty string for a `writeOnly` key keeps
  the stored value; the schema, never the client, decides which keys are
  secret.
- The file on disk keeps the real value; it is `0600`, owned by the service
  user.
- The schema route never carries a value, so it may be answered to any admin.

---

## Boot

- The UI backend loads every file in `status.config`, fills missing keys from
  `default`, evaluates the result against the schema, and refuses to start on
  a failure, logging one line per failing pointer through its `app` category.
- A key the schema does not know is logged as a warning with its pointer and
  ignored; it is never deleted from the file except by a migration.
- A file that is missing is created from the schema's defaults in
  `postinst`, never at boot, so a boot never writes `/etc`.

---

## Upgrades and migrations

| Case                   | What happens                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a new key              | its `default` is filled at boot for the running process and written into the file by `postinst` on the next package upgrade, so the file the admin reads matches what runs                         |
| a removed key          | logged as unknown at boot; the release's migration drops it from the file in `postinst`                                                                                                            |
| a renamed or moved key | one entry in the UI backend's migration list, a function per release, run by `postinst` in order against the file's `schemaVersion`; the old key is read, the new key written, the old key dropped |
| a changed rule         | the tightened rule applies at boot; a value that no longer passes stops the UI backend with its pointer, so an upgrade never runs on a value the new release cannot honour                         |
| a changed default      | only a missing key takes it; a value the admin set is never overwritten                                                                                                                            |

The file carries `schemaVersion: <n>` at its root; the schema carries the
same; `postinst` runs the migrations from the file's version to the schema's
and writes the new version. The dev files in the tree are migrated by hand and
committed.

---

## What the shared UI draws

| Page             | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminConfig`    | one tab per name in `status.config`; fetches the file and its schema together; draws the sections and foldable subsections through `ConfigSections`; validates on blur and on Update through `useFormRules` with the schema as the rule set; paints the 422 by pointer, the field name being the pointer without its leading slash; marks the tab that carries an error; a warning card `configManager.restartNeeded` when the 200 carries `requiresRestart`, and a `restart` badge on every field whose property says so; the navbar search over `title` and key |
| `SetupPage`      | the same over every file at once under the setup token, the files and schemas fetched together; Submit all stays enabled and the summary lists every file's errors; a server pointer `/configs/<name>/…` lands on the field `<name>/…`; the SQLite path in place of the SQL block follows `dependsOn`/`showWhen` in the schema, not code                                                                                                                                                                                                                          |
| `ConfigSections` | `src/components/common/ConfigSections.jsx`: the sections and foldable subsections of one file, every field through `ConfigField`, a hidden field folded away, a map field drawn as one field per entry unless the page hands a `renderMap` for it (the OIDC providers block)                                                                                                                                                                                                                                                                                      |
| `ConfigField`    | `src/components/common/ConfigField.jsx`: one schema property by its `type` and `format` through `Field` (switch for a boolean, select from `enum`, password with reveal for `writeOnly`, comma list for an array of scalars, text with the upload button on `upload`, text with `inputmode="numeric"` for a number), the label from `title`, the hint from `description`                                                                                                                                                                                          |
| `schemaSections` | `src/features/admin/utils/schemaSections.js`: `schemaSections(schema)` walking the schema into sections, `fieldOf` for one property, `valueAt(config, pointer)` and `setValueAt(config, pointer, value)` over the plain file; the labels come from `title`, the key only when there is none                                                                                                                                                                                                                                                                       |

---

## What this design changed

| Where                | Before                                                                                                                                                                        | After                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the file             | BoxVault, VDI and hyperweaver-server: every leaf a node of ten keys of UI metadata around `value`; the agents: plain values                                                   | plain values everywhere                                                                                                                                       |
| the rules            | in the file, enforced nowhere (BoxVault, VDI, hyperweaver-server); in a JS schema (zoneweaver-agent); in Go code (hyperweaver-agent)                                          | in one schema file per config file, shipped with the code, served at `/schema`, enforced on both sides                                                        |
| bounds and options   | `min`/`max`/`options` in the file; `validation{min,max}` too on hyperweaver-server; `min`/`max`/`enum` in the agents' schemas                                                 | `minimum`, `maximum`, `enum`                                                                                                                                  |
| conditional fields   | `depends_on`/`show_when` and `conditional{field,value}` side by side                                                                                                          | `dependsOn`/`showWhen`                                                                                                                                        |
| subsection keys      | `subsection` (a label) and `subsection_key` (a locale key) both in every node                                                                                                 | `subsection` names the key; `sections` at the root carries the titles                                                                                         |
| collections of items | hyperweaver-server's `type: collection` with `item_schema`, `secret_fields`, `item_label_field`, managed by its own routes                                                    | a `type: object` with `additionalProperties` describing an item, drawn as a list of items; the OIDC providers block of BoxVault's auth file is the first user |
| `PUT`                | deep merge and write, any value accepted; 500 on error (all three); one key checked (zoneweaver); the whole document validated in Go, 500 with the reason (hyperweaver-agent) | validate, 422 with pointers, then merge and write, on every UI backend                                                                                        |
| boot                 | the file is read as is                                                                                                                                                        | the file is validated; defaults fill; a bad file stops the UI backend                                                                                         |
| upgrades             | a new template per release, the diff left to the admin                                                                                                                        | `default`, `schemaVersion` and the migration list                                                                                                             |
| the Worker           | `wrangler.toml` vars and secrets                                                                                                                                              | unchanged and named the one UI backend with no configuration files: a static UI backend has nothing to write                                                  |

---

## Server reference

| Host                                | Where                                                                                                                                                                                                                                                                                                                                                                                                | Status  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BoxVault                            | `backend/app/config/schema/{app,auth,db,mail}.schema.yaml`; `backend/app/utils/config-loader.js` at boot; `controllers/config/{get,update,schema}.js` and `setup/{update,schema}.js` the routes; `backend/app/config/migrations.js` run by `backend/scripts/migrate-config.js` from `postinst`                                                                                                       | ✓       |
| VDI Health Monitor                  | `vdi_health/schema/app.schema.yaml`; `vdi_health/config.py` at boot; `routes/config.py` the routes; `vdi_health/migrations.py` run from `postinst`                                                                                                                                                                                                                                                   | ✓       |
| hyperweaver-server                  | a plain `config.yaml` plus a schema; `_sections` becomes `sections`, `collection` the item object above                                                                                                                                                                                                                                                                                              | to come |
| zoneweaver-agent, hyperweaver-agent | plain files with a served schema; the schema's `min`/`max` become `minimum`/`maximum`, the `values` vocabulary becomes `additionalProperties`, the save answers 422 with pointers                                                                                                                                                                                                                    | to come |
| Provisioner catalog                 | no configuration files                                                                                                                                                                                                                                                                                                                                                                               | n/a     |
| Authorization server                | to come: the shared editor over `GET /api/config/<name>`, `/schema` and `PUT /api/config/<name>` named by `status.config`, the Java side answering nested plain values per section and one schema per file; until it lands the Thymeleaf `/admin/config` page is the named exception of the identity contract's decision 16, and the `CONFIG_DIR` rule still does not bind Spring's own YAML loading | to come |

---

## Conformance checklist

| Line                                                                                                                 | BoxVault | VDI Health | hyperweaver-server | zoneweaver-agent | hyperweaver-agent |
| -------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------------------ | ---------------- | ----------------- |
| plain YAML files under `CONFIG_DIR`, named by `status.config`, no other environment variable                         | ✓        | ✓          | to come            | to come          | to come           |
| one JSON Schema 2020-12 document per file, shipped with the code, served at `GET /api/config/<name>/schema`          | ✓        | ✓          | to come            | to come          | to come           |
| `GET /api/config/<name>` masks `writeOnly` values; a write carrying the mask keeps the value                         | ✓        | ✓          | to come            | to come          | to come           |
| `PUT` validates against the schema and answers the validation contract's 422 with pointers before writing            | ✓        | ✓          | to come            | to come          | to come           |
| boot fills `default`, validates, stops on failure with every pointer logged, warns on unknown keys                   | ✓        | ✓          | to come            | to come          | to come           |
| `schemaVersion` in the file and the schema; `postinst` runs the migration list                                       | ✓        | ✓          | to come            | to come          | to come           |
| the admin and setup pages draw the form from the schema and validate on blur and submit through the shared evaluator | ✓        | ✓          | to come            | to come          | to come           |

---

## Specification anchors

JSON Schema 2020-12 Validation (§6 validation keywords, §7 `format`, §9
`title`, `description`, `default`, `deprecated`, `readOnly`, `writeOnly`)
and Core (§7.7.1 unknown keywords as annotations, §10.3.2.3
`additionalProperties`) · RFC 9457 Problem Details and RFC 6901 JSON Pointer
for the refused write · RFC 9110 §15.5.21 · YAML 1.2 · the Universal
Validation Contract for the evaluator, the body, the surfaces and the
accessibility of the admin and setup forms.

---

**Related:** [Universal Validation Contract](universal-validation/) |
[Universal Navbar Contract](universal-navbar/) |
[Universal Pages Contract](universal-pages/) |
[Universal Session Contract](universal-session/)
