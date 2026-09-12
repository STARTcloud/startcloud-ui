---
title: Universal Validation Contract
layout: default
nav_order: 13
parent: Guides
permalink: /docs/guides/universal-validation/
---

## Universal Validation Contract

{: .no_toc }

One validation pattern on both sides of every estate app: the rules written
once, as JSON Schema keywords, and read by the form and the write route alike,
so a value cannot pass in the browser and fail on the server or the reverse.
This contract fixes the rule vocabulary, where a UI backend's rules live and how the
UI reads them, the one error body every UI backend answers when a write is refused,
the status code per case, the one place a field error is drawn, the one place
a form's errors are listed, when validation runs, and the accessibility every
form carries. It extends the
[Universal Navbar Contract](universal-navbar/), whose Notices section owns the
cards and banners this contract keeps validation out of, and the
[Universal Session Contract](universal-session/), whose API client turns every
refused write into the one `ApiError`. The
[Universal Config Contract](universal-config/) is this contract applied to
configuration files. The visual reference is
[universal-validation.html](../universal-validation.html): the first frame is
live and every callout after it is a rule of this text. Every clause cites the
specification or practice it follows, so a deviation is an argument with the
citation, never with the author.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **Rules are data, written once.** A UI backend publishes its rules as a JSON Schema
  document; the form evaluates that document before it sends, the route
  evaluates the same document before it writes. Neither side carries a rule of
  its own. A rule the vocabulary cannot express stays code on the route and
  answers in the same body.
- **The UI backend owns its rules.** The UI is one build serving every UI backend, so it
  reads the rules from the UI backend it is talking to, the way it reads
  `/api/status`; it never ships a rule set of its own.
- **A field error is drawn at the field.** Beside its control, in the label's
  words, saying what to enter. Never a card, a banner, an OS toast or a hub
  notification (WCAG 2.2 SC 3.3.1, GOV.UK error message).
- **A form's errors are listed once, at the top.** On submit, a summary with
  one link per failing field, focused, in the same words as the inline errors
  (GOV.UK error summary).
- **Validation runs on blur and on submit, never mid-keystroke.** A field
  already marked wrong is re-checked on every change so the error clears the
  moment the value is right (Nielsen Norman Group guidelines 1 and 7).
- **A refused write is one body, one status per case.** RFC 9457 Problem
  Details with an `errors` array of JSON Pointers; 422 for a rule failure, 409
  for a taken value, 400 for a request that could not be read (RFC 9110
  §15.5.21, §15.5.10, §15.5.1).
- **The server's text is never the user's text.** The UI translates every
  error from its `rule` and `params`; `detail` is for logs and other clients
  (RFC 9457 §3.1.4).
- **Nothing the user typed is ever cleared by an error** (GOV.UK, Nielsen
  Norman Group guideline 10).

---

## The rule set

A UI backend that accepts writes answers `GET /api/rules`, before login, without
auth, with one JSON Schema 2020-12 document:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "slug": {
      "type": "string",
      "allOf": [{ "pattern": "^[A-Za-z0-9.-]+$" }, { "not": { "pattern": "\\.\\." } }],
      "minLength": 1,
      "maxLength": 255
    },
    "identifier": {
      "type": "string",
      "allOf": [{ "pattern": "^[0-9a-zA-Z][0-9a-zA-Z._-]*$" }, { "not": { "pattern": "\\.\\." } }],
      "maxLength": 255
    },
    "email": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
      "maxLength": 255
    },
    "orgCode": { "type": "string", "pattern": "^[0-9A-F]{6}$" },
    "providerName": { "type": "string", "pattern": "^[a-z0-9_]+$" },
    "hex": { "type": "string", "pattern": "^[a-fA-F0-9]+$" },
    "watchId": { "type": "string", "pattern": "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$" },
    "personName": {
      "type": "string",
      "pattern": "^[^\\x00-\\x40\\x5B-\\x60\\x7B-\\x7F][^\\x00-\\x1F\\x21-\\x26\\x28-\\x2C\\x2F-\\x40\\x5B-\\x60\\x7B-\\x7F]*$",
      "maxLength": 255
    },
    "iconName": { "type": "string", "pattern": "^[a-z0-9 -]{1,64}$" },
    "languageTag": {
      "type": "string",
      "pattern": "^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$",
      "maxLength": 10
    },
    "timezone": { "type": "string", "pattern": "^(?:UTC|[A-Za-z_]+(?:/[A-Za-z0-9_+-]+)+)$" }
  },
  "forms": {
    "box": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "$ref": "#/$defs/slug", "unique": "organization" },
        "description": { "type": "string" },
        "is_public": { "type": "boolean" },
        "published": { "type": "boolean" },
        "github_repo": { "type": "string" },
        "workflow_file": { "type": "string" },
        "cicd_url": { "type": "string", "format": "uri" }
      }
    },
    "version": {
      "type": "object",
      "required": ["version_number"],
      "properties": {
        "version_number": { "$ref": "#/$defs/identifier", "unique": "box" },
        "description": { "type": "string" },
        "release_notes": { "type": "string" },
        "deprecated": { "type": "boolean" },
        "deprecation_reason": { "type": "string", "maxLength": 512 }
      },
      "if": { "properties": { "deprecated": { "const": true } }, "required": ["deprecated"] },
      "then": { "required": ["deprecation_reason"] }
    },
    "password": {
      "type": "object",
      "required": ["password"],
      "properties": { "password": { "type": "string", "minLength": 15, "maxLength": 128 } }
    }
  }
}
```

- `$defs` carries the named patterns every UI backend shares, and every `pattern`
  a UI backend uses is one of them, reached through `$ref`; the UI resolves `$ref`
  within the document only, and a refused write names the pattern by its
  `$defs` name in `params.pattern`.
- Every entry of `forms` is an object schema whose `properties` are the
  members of the request body the form sends, named as the route reads them.
  A UI backend lists the forms it has routes for; a form the UI backend does not list
  validates `required` alone in the UI, from the page's own declaration.
- Two cases, one per layer. The keywords, the `$defs` names and the form
  keys are JSON Schema's own layer and keep its camelCase (`minLength`,
  `dependentRequired`, `orgCode`, `serviceAccount`). Every request body
  member and every configuration key is the estate's API layer and is
  `snake_case`, the case three of the five backends (the VDI Health
  Monitor, zoneweaver-agent, hyperweaver-agent) and every configuration
  file already use; BoxVault and hyperweaver-server, camelCase with
  snake_case exceptions today, converge on it in their rounds, the shared
  UI's adapters with them.
- The password rule carries the UI backend's own minimum, so the form enforces the
  policy the route enforces; the default is 15 (NIST SP 800-63B rev 4
  §3.1.1.2).
- The document is cached for the session: the UI fetches it once after
  `/api/status`, before the first render, through `loadRules` in
  `src/lib/runtime.js`, and every form reads it through `useFormRules`. A
  UI backend that answers 404 has no rules. Any other failure is logged and the
  app starts without rules, since the route still evaluates every write;
  the document is never a reason not to draw the page.

### Forms

The forms the shared UI draws, the request each sends and the members the
UI backend's entry describes. A pointer in a refused write is `/<member>` into that
body (RFC 6901).

| Form                                                             | Request                                                                                                     | Members                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`                                                          | the session's sign-in                                                                                       | `username`, `password`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `register`                                                       | `POST /api/auth/signup`                                                                                     | `username`, `email`, `password`, `name`, `invitation_token`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `displayName`                                                    | `PUT /api/users/{id}/change-name`                                                                           | `name`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `password`                                                       | `PUT /api/users/{id}/change-password` on BoxVault, `PUT /api/user/password` on the identity provider        | `password`, one name on every UI backend because one shared form key cannot carry two shapes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `register`, `recovery`, `name`, `terms` on the identity provider | `POST /registration`, `POST /passwordRecovery`, `POST /complete-onboarding/name`, `POST /api/admin/terms`   | `email` (`$defs.email`, required) for the two address forms, the address carrying one name everywhere on the issuer; `given_name` (`$defs.personName`, required) and `family_name` (`$defs.personName`) for the onboarding name step; the terms record: `name` (`$defs.slug`, `unique` global, required), `friendly_name` (`maxLength 255`), `icon` (`$defs.iconName`), `content` (`type: string`, required), `version` (`maxLength 50`, required), `type` (`enum` `SITE`, `CLIENT`, `BOTH`, required), `is_public` (`boolean`), `display_order` (`integer`, `minimum 0`); the `preferences` form on `PATCH /api/user/preferences`: `language` (`$defs.languageTag`), `theme` (`enum` `light`, `dark`, `auto`), `timezone` (`$defs.timezone`), `ciba_channel` (`enum` `PUSH`, `EMAIL`, `SMS`), `ciba_user_code` (`minLength 4`, `maxLength 64`); the issuer lists its own forms because its registration takes an address alone, and its `password` form carries `maxLength` from its own policy, 64 by default |
| `email`                                                          | `PUT /api/users/{id}/change-email`                                                                          | `new_email`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `serviceAccount`                                                 | `POST /api/service-accounts/`                                                                               | `description`, `expiration_days`, `organization_id`, `role`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `organization`                                                   | `PUT /api/organization/{name}`                                                                              | `organization`, `org_code`, `email`, `description`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `accessMode`                                                     | `PUT /api/organization/{name}/access-mode`                                                                  | `access_mode`, `default_role`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `invitation`                                                     | `POST /api/auth/invite` on BoxVault, `POST /api/user/organizations/{uuid}/invites` on the identity provider | `email`, `organization_name`, `invite_role` on BoxVault; `email`, `role` on the identity provider, one form key because the console draws one dialog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `joinRequest`                                                    | `POST /api/organization/{name}/requests`                                                                    | `message`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `box`                                                            | `POST …/box`, `PUT …/box/{name}`                                                                            | `name`, `description`, `is_public`, `published`, `github_repo`, `workflow_file`, `cicd_url`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `iso`                                                            | `POST …/iso`, `PUT …/iso/{name}`                                                                            | `name`, `description`, `is_public`, `published`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `version`                                                        | `POST …/version`, `PUT …/version/{number}`                                                                  | `version_number`, `description`, `release_notes`, `deprecated`, `deprecation_reason`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `provider`                                                       | `POST …/provider`, `PUT …/provider/{name}`                                                                  | `name`, `description`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `architecture`                                                   | `POST …/architecture`                                                                                       | `name`, `default_box`, `checksum_type`, `checksum`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

The members are the target; BoxVault reads most of them in camelCase today
(`versionNumber`, `isPublic`, `newPassword`) and the shared UI sends what
BoxVault reads, so the rename lands in the BoxVault round on both sides at
once, route and adapter, one release.

The OIDC provider dialog is not a form of this document: its item is the
`additionalProperties` schema of `/auth/oidc/providers` in the auth
configuration schema, and its key follows `$defs.providerName`, unique within
the map, checked in the browser because the whole map is written as one
configuration value (Universal Config Contract).

### The page and the UI backend

A page declares the properties it draws, as a page schema handed to
`useFormRules` beside the form key. When the UI backend lists the form, the rules of
the UI backend's entry apply to the properties the page declares and to no other:
a page that draws one member of a form (a rename drawing `organization`
alone) is never blocked by a member it does not draw, and the UI backend's
`required` reaches only the members present on the page. When the UI backend does
not list the form, the page's `required` is the whole rule. The page may add
the client-only keywords `equals` (a confirmation must match its sibling),
`custom` (a rule the vocabulary cannot express, the checksum length per
type), and `dependsOn`/`showWhen` (a member drawn and evaluated only while a
sibling holds one of the values); they never travel to the UI backend.

### Vocabulary

The keywords a rule may use are JSON Schema 2020-12 validation keywords,
verbatim, plus one estate extension:

| Keyword                  | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Spec                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `type`                   | `string`, `integer`, `number`, `boolean`, `array`, `object`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Validation §6.1.1    |
| `required`               | on an object, the properties that must be present, presence alone as the spec says; a string that must not be blank carries `minLength: 1` and `pattern: "\\S"` instead, so both sides evaluate the same rule and neither carries a trimming rule of its own                                                                                                                                                                                                                                                                                                                                       | §6.5.3               |
| `dependentRequired`      | properties required when another is present, which is all the keyword can say (§6.5.4); a rule that hangs on a value, "a reason while `deprecated` is true", is written `if { properties: { deprecated: { const: true } }, required: ["deprecated"] } then { required: ["deprecation_reason"] }` (Core §10.2.2), because `dependentRequired` would demand the reason of an undeprecated version too                                                                                                                                                                                                | §6.5.4, Core §10.2.2 |
| `minLength`, `maxLength` | string length bounds, inclusive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | §6.3.2, §6.3.1       |
| `pattern`                | an ECMA-262 regular expression; the spec leaves it unanchored (§6.3.3), so every pattern in this estate is written anchored with `^` and `$`; a lookahead is outside the subset Core §6.4 asks authors to stay in, so "not containing `..`" is written as `allOf: [{ pattern: "^[A-Za-z0-9.-]+$" }, { not: { pattern: "\\.\\." } }]`; a failure anywhere inside a `$defs` pattern's `allOf`, the `not` branch included, is reported as `rule: "pattern"` with `params.pattern` the `$defs` name, so one message covers the whole named shape and no `not` or `allOf` ever reaches the wording list | §6.3.3, Core §6.4    |
| `minimum`, `maximum`     | numeric bounds, inclusive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | §6.2.4, §6.2.2       |
| `enum`                   | the allowed values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | §6.1.2               |
| `format`                 | `uri`, `hostname`, `ipv4`; the spec makes `format` an annotation by default and permits assertion (§7.2), and this estate's evaluator asserts it; the address grammar is the named `$defs.email` pattern rather than `format: email`, because the spec's `email` is RFC 5321 §4.1.2 and a stock validator would disagree with the HTML grammar this estate uses                                                                                                                                                                                                                                    | §7                   |
| `minItems`, `maxItems`   | array size bounds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | §6.4.2, §6.4.1       |
| `propertyNames`          | on an `additionalProperties` map, the schema every key of the map meets; the Universal Config Contract's map key rule: the browser evaluates a new key against it and against the map's existing keys with `unique`, `params.scope` the map's `title`, because the whole map is one value on the wire; a failure reports `rule: "propertyNames"` at the map's pointer with `params.key` the key that failed                                                                                                                                                                                        | Core §10.3.2.4       |
| `unique`                 | the estate's extension: the value must not already exist within the named scope (`organization`, `box`, `version`, `provider`, `global`); only the route can decide it, the UI only paints its answer; a failure is always 409, and its `params.scope` carries the name of the scope the value collided in (the organization's name, the box's name); a name that is a reserved first segment of the pages contract is refused the same way with `params.scope: "reserved"`, because to the person it reads as taken and to the route it is one check on one member                                | this contract        |

### Rules outside the vocabulary

A rule the keywords cannot express is code on the route and answers in the
same body with one of the named rules below, so the UI has one message per
rule the way it has one per keyword. A UI backend that needs another name adds it
here first; a `rule` the UI does not know paints from `validation.unknown`
with the field's label, and the `detail` is never shown.

| Rule          | Meaning                                                                                              | `params`         |
| ------------- | ---------------------------------------------------------------------------------------------------- | ---------------- |
| `checksum`    | the checksum is not the length its type requires                                                     | `type`, `length` |
| `blocklist`   | the password is on the route's blocklist                                                             | none             |
| `writable`    | a configured directory cannot be written by the service user                                         | `user`           |
| `reachable`   | a configured host and port did not answer                                                            | `host`, `port`   |
| `placeholder` | a `${NAME}` placeholder in a configuration file has neither a value in the environment nor a default | `name`           |

The client-only `equals` and `custom` keywords of a page schema answer in the
UI with `validation.equals` and the `rule` the `custom` function names.

### Named patterns

| Name           | Pattern                                                                                                                                           | Why                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`         | `^[A-Za-z0-9.-]+$`, not containing `..`, 1 to 255                                                                                                 | boxes, ISOs, organizations and usernames are URL path segments and folder names: inside RFC 3986 §2.3 unreserved characters, never a dot-segment (§3.3, §5.2.4); `_` and `~` are legal to the RFC and excluded by this estate's rule                             |
| `identifier`   | `^[0-9a-zA-Z][0-9a-zA-Z._-]*$`, not containing `..`, up to 255                                                                                    | versions, providers and architectures: the same reasons, underscore admitted, never starting with `-` or `.`                                                                                                                                                     |
| `email`        | the WHATWG "valid e-mail address" regular expression                                                                                              | the HTML Standard's grammar, a willful violation of RFC 5322 that browsers already apply to `type=email`                                                                                                                                                         |
| `orgCode`      | `^[0-9A-F]{6}$`                                                                                                                                   | the organization code as the backend stores it                                                                                                                                                                                                                   |
| `providerName` | `^[a-z0-9_]+$`                                                                                                                                    | the OIDC provider key, a YAML map key and a URL segment of the callback                                                                                                                                                                                          |
| `hex`          | `^[a-fA-F0-9]+$`                                                                                                                                  | checksums; the length per type is the `checksum` rule                                                                                                                                                                                                            |
| `watchId`      | `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`                                                                                                               | the id of a watch: an organization slug and an item slug joined by one slash, the key the catalog Worker stores a watch under                                                                                                                                    |
| `personName`   | a first character outside ASCII controls, digits, punctuation and symbols, then any of those plus space, period, apostrophe and hyphen, up to 255 | a person's given or family name on the issuer's onboarding step: every non-ASCII letter admitted by exclusion because the evaluator compiles patterns without the `u` flag and `\p{L}` is not available on both sides; the four joiners are the ones names carry |
| `iconName`     | `^[a-z0-9 -]{1,64}$`                                                                                                                              | a terms template's icon, stored and drawn as a class attribute alone                                                                                                                                                                                             |
| `languageTag`  | `^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$`, up to 10                                                                                                    | the preferences `language` member, a BCP 47 primary subtag with optional subtags, bounded by the column that stores it                                                                                                                                           |
| `timezone`     | `^(?:UTC\|[A-Za-z_]+(?:/[A-Za-z0-9_+-]+)+)$`                                                                                                      | the preferences `timezone` member, an IANA zone id or `UTC`                                                                                                                                                                                                      |

The email regular expression, verbatim from the HTML Standard:

```text
/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

---

## The law

The rule per field, chosen as the least breaking value across every UI backend's
routes and forms as they were before this contract (nothing stored anywhere
violates a row):

| Field                                                 | Rule                                                                                                                                                    | Source of the choice                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| box, ISO, organization, username                      | `slug`, `unique` in the organization (organization and username: global)                                                                                | every backend route; the UI's underscore was the defect                                                                                  |
| version, provider, architecture                       | `identifier`, `unique` in the parent                                                                                                                    | the backend rule, with the leading-character check the UI lacked                                                                         |
| username length                                       | `minLength 3`, `maxLength 64`                                                                                                                           | the UI's 3 to 20 was arbitrary, the backend had none                                                                                     |
| password                                              | `minLength` from the UI backend, default 15; `maxLength` at least 64, 128 here; no `pattern`; Unicode and spaces accepted; the route checks a blocklist | NIST SP 800-63B rev 4 §3.1.1.2: minimum 15 for a single-factor password, at least 64 permitted, no composition rules, no periodic change |
| email                                                 | `$defs.email`, `maxLength 255`                                                                                                                          | the HTML Standard grammar; the backends gain the check they lacked                                                                       |
| display name                                          | `maxLength 255`, optional                                                                                                                               | the backend rule                                                                                                                         |
| description, release notes, join message              | `type: string`                                                                                                                                          | nothing bounds them today                                                                                                                |
| deprecation reason                                    | required while `deprecated` is true, `maxLength 512`                                                                                                    | the backend rule                                                                                                                         |
| organization code                                     | `orgCode`, `unique` global                                                                                                                              | the backend rule                                                                                                                         |
| OIDC provider name                                    | `providerName`, `unique` within the providers map, checked in the browser                                                                               | the UI rule; the config route gains it                                                                                                   |
| checksum                                              | `hex`, and the `checksum` rule: 32, 40, 64, 96 or 128 characters by type, the type from the sibling select                                              | the UI rule                                                                                                                              |
| access mode, default role, invite role, checksum type | `enum`                                                                                                                                                  | the backend rules                                                                                                                        |
| CI/CD URL                                             | `format: uri`                                                                                                                                           | the field is a link                                                                                                                      |
| a configuration value                                 | by its schema: `type`, then `required`, `minimum`, `maximum`, `enum`, `pattern`, `format`                                                               | the [Universal Config Contract](universal-config/)                                                                                       |

The four password composition knobs a UI backend may still carry
(`local_password_require_uppercase` and its siblings) default to off and are
named in that UI backend's configuration as against the specification.

---

## Surfaces

| Case                                   | Surface                                                                                                                                                                                                                                                                                                                                                                                                   | Never                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| a field fails a rule, on blur          | inline `FieldError` under the control, the control marked invalid, the value kept                                                                                                                                                                                                                                                                                                                         | a card, a banner, a toast           |
| submit with any failing field          | `FormErrorSummary` at the top of the form, `role="alert"`, focused, one link per field, the same wording as inline; the request is not sent                                                                                                                                                                                                                                                               | a card                              |
| the UI backend answers 422             | every `errors[]` entry painted into the inline spot its `pointer` names and listed in the summary; an entry whose pointer matches no field goes to the summary alone                                                                                                                                                                                                                                      | `responseMessage` into a card       |
| the UI backend answers 409             | the same, the `unique` line reading that the value is already taken in its scope                                                                                                                                                                                                                                                                                                                          | a card                              |
| 400, 403, 404, 5xx, no response        | one danger card through `notify` drawing the translation of `messageKey` alone, the form and its values kept; a 400 is a defect in the client, not the user's data. `serverMessage`, `title` and `detail` go to the console and the client-error report for the developer and are never rendered, because a rendered server sentence is server-controlled prose on the page and can carry reflected input | inline; a card from `serverMessage` |
| success                                | one success card, as today                                                                                                                                                                                                                                                                                                                                                                                |                                     |
| state the user must know before acting | a banner, as the navbar contract's Notices section says                                                                                                                                                                                                                                                                                                                                                   | validation                          |

The line between the two kinds: a card answers whether the request went
through; a field error answers what is wrong with this value. A response
carrying `errors[]` is the second kind, every other failure the first.

### Timing

| When            | What runs                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| while typing    | nothing; a field already marked invalid is re-evaluated on every change so the error clears the moment the value is right |
| on blur         | that field's rules                                                                                                        |
| on submit       | every field's rules; the summary when any fail; the request only when none do                                             |
| on the response | the body's `errors[]`, or a card                                                                                          |

Submit stays enabled: a disabled Save hides why; the button submits, the rules
run, the summary explains (GOV.UK).

### Wording

Every message says what to enter, in the label's own words, and never says
"invalid", "valid", "please", "oops" or "sorry" (GOV.UK, WCAG 2.2 SC 3.3.3
technique G177): "Enter a box name.", "Use only letters, digits, dashes and
periods in the box name.", "Enter a password of at least 15 characters.",
"alma9-server is already taken in STARTcloud; enter a different box name."
The keys are `validation.<rule>` in `shared.json`, interpolating the field's
label and the rule's `params`; one key per rule, the same message for the
same failure in every app: `required`, `type.<type>`, `minLength`,
`maxLength`, `pattern.<name>` per `$defs` name, `minimum`, `maximum`,
`range` (both bounds set), `enum`, `format.<format>`, `minItems`,
`maxItems`, `unique`, `equals`, `checksum`, `blocklist`, `writable`,
`reachable`, `unknown`, with `errorPrefix` and `summaryTitle` beside them.
The label is the page's own key for the field or, on a configuration form,
the property's `title`.

### Accessibility

| Rule                                                                                                                             | Spec                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the control carries `aria-invalid="true"` only after a blur or a submit found it wrong, never on first render                    | WAI-ARIA 1.2 `aria-invalid`: set only after the user has attempted to submit or the value is confirmed invalid                                                                   |
| the control's `aria-describedby` and `aria-errormessage` name the error's id; the error element exists only while the error does | WAI-ARIA 1.2 `aria-errormessage`, used with `aria-invalid="true"`                                                                                                                |
| the error text is prefixed by a visually hidden "Error:"                                                                         | GOV.UK error message                                                                                                                                                             |
| the summary is `role="alert"`, `tabindex="-1"`, focused when it appears, and links to each field                                 | WCAG 2.2 SC 4.1.3 technique ARIA19; GOV.UK error summary; WAI-ARIA APG alert pattern, which forbids an alert from moving focus by itself, so the focus move is the summary's own |
| the item in error is identified and described in text                                                                            | WCAG 2.2 SC 3.3.1 (A), techniques G83, G85, ARIA21                                                                                                                               |
| a correction is suggested                                                                                                        | WCAG 2.2 SC 3.3.3 (AA), technique G177                                                                                                                                           |
| the hint under a field states the rule before the user fails it                                                                  | GOV.UK hint text                                                                                                                                                                 |

---

## The error body

Every refused write, on every UI backend, answers `application/problem+json`
(RFC 9457):

```json
{
  "type": "https://auth.startcloud.com/probs/validation",
  "title": "The request did not pass validation.",
  "status": 422,
  "errors": [
    {
      "pointer": "/name",
      "rule": "pattern",
      "params": { "pattern": "slug" },
      "detail": "name must match slug"
    },
    {
      "pointer": "/version_number",
      "rule": "minLength",
      "params": { "minLength": 1 },
      "detail": "version_number must be at least 1 character"
    }
  ]
}
```

| Member             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Spec                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `type`             | a URI under `https://auth.startcloud.com/probs/`, one registry for the estate, each type bound to one status as RFC 9457 §4 asks: `validation` (422), `conflict` (409), `bad-request` (400), `forbidden` (403), `not-found` (404), `internal` (500, the identity provider's `server` folded into it), `authentication` (401, a refused sign-in), `throttled` (429, every rate-limited answer), `method-locked` (409, a second-factor method disabled by its lockout), `payload-too-large` (413, a body or upload over the route's limit), `send-failed` (503, a mail or SMS the route could not send, `Retry-After` carrying when to try again), `bad-gateway` (502, a store, pages, dispatch, status, discovery or hub fetch behind the route that failed), `not-configured` (503, a feature the host has not configured, push, dispatch or the hub), `method-not-allowed` (405, a method the route does not accept), and the notification hub's own `notifications/<slug>` family, whose `validation` entry answers 422 like the rest | RFC 9457 §3.1.1, §4                                   |
| `title`            | the human summary of the type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | §3.1.3                                                |
| `status`           | the HTTP status of this occurrence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | §3.1.2                                                |
| `detail`           | a human explanation for logs and other clients; consumers SHOULD NOT parse it, and the UI never shows it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | §3.1.4                                                |
| `errors[]`         | the §3 extension, one entry per failing value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | §3, §3.2                                              |
| `errors[].pointer` | a JSON Pointer into the request body as sent, `/name`, `/boxvault/origin`, `/configs/app/boxvault/origin` on the setup write, `/users/0/email`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | RFC 6901; JSON Schema Core §12.3.3 `instanceLocation` |
| `errors[].rule`    | the keyword that failed, the last segment of the schema's `keywordLocation`, or one of the named rules outside the vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | JSON Schema Core §12.3.1                              |
| `errors[].params`  | the keyword's value in the rule, what the message needs to say: `{ "minLength": 15 }`, `{ "pattern": "slug" }` (the `$defs` name), `{ "scope": "STARTcloud" }` on `unique`, `{ "type": "SHA256", "length": 64 }` on `checksum`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | this contract                                         |
| `errors[].detail`  | the UI backend's own sentence, never shown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | RFC 9457 §3                                           |

A client MUST ignore members it does not recognize (§3.2), so a UI backend may add
`instance` or its own members without breaking the UI.

### Status codes

| Status                    | When                                                                                                                                                                                                     | Spec              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 400 Bad Request           | the request could not be read: unparseable JSON, a missing body, a wrong content type, a malformed header; never a rule failure                                                                          | RFC 9110 §15.5.1  |
| 422 Unprocessable Content | the body was read and a value breaks a rule: "the syntax of the request content is correct (thus a 400 (Bad Request) status code is inappropriate) but was unable to process the contained instructions" | RFC 9110 §15.5.21 |
| 409 Conflict              | the one failing rule is `unique`: "the request conflicts with the current state of the target resource"                                                                                                  | RFC 9110 §15.5.10 |
| 403 Forbidden             | the caller may not do this                                                                                                                                                                               | RFC 9110 §15.5.4  |
| 404 Not Found             | the parent does not exist                                                                                                                                                                                | RFC 9110 §15.5.5  |
| 413 Content Too Large     | the body or the upload is over the route's limit; the `payload-too-large` type, one problem body like the rest, never a bare message                                                                     | RFC 9110 §15.5.14 |
| 503 Service Unavailable   | the route's own sender, mail or SMS, could not send; the `send-failed` type with `Retry-After`, because a 502 names a gateway fault and the sender is not one                                            | RFC 9110 §15.6.4  |
| 502 Bad Gateway           | a store, pages, dispatch, status, discovery or hub fetch behind the route failed; the `bad-gateway` type                                                                                                 | RFC 9110 §15.6.3  |
| 503 Service Unavailable   | the feature the route needs, push, dispatch or the hub, is not configured on the host; the `not-configured` type, no `Retry-After` because waiting does not help                                         | RFC 9110 §15.6.4  |
| 405 Method Not Allowed    | the route exists and the method is not one it accepts; the `method-not-allowed` type                                                                                                                     | RFC 9110 §15.5.6  |

The industry is split on 400 versus 422 for a rule failure, by generation more
than by argument: GitHub's REST API, FastAPI, Laravel and Rails answer 422
with a per-field array and keep 400 for an unreadable body; Spring's
`ResponseEntityExceptionHandler`, ASP.NET Core's `ValidationProblemDetails`,
Stripe and Google's API design guide answer 400 for everything and let the
body tell the cases apart. This estate follows the RFC's wording, the native
answer of its Python UI backend, and the fact that its Node, Worker and Go UI backends are
its own to set, while Spring changes its answer with one `ProblemDetail`
override; a UI backend that slips to 400 degrades to a card instead of breaking,
because the UI keys on `errors[]` being present, but it is still a defect.

---

## Client

One implementation in the STARTcloud UI, every form drawn through it:

| Piece                                        | Role                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/validation.js`                    | `DEFS`, the named patterns as the fallback document; `validateValue(schema, value, document)` and `validateObject(schema, values, document)` over the vocabulary, answering `[{ pointer, rule, params }]`, nested objects and `additionalProperties` maps walked, a property hidden by `dependsOn`/`showWhen` skipped, `equals` and `custom` honored; `isVisible`, `scopesFor`; `messageFor(error, label, t)` mapping to `validation.<rule>` |
| `src/lib/runtime.js`                         | `rules`, the UI backend's `/api/rules` fetched once by `loadRules()` before the first render; `null` on 404 or any failure                                                                                                                                                                                                                                                                                                                   |
| `src/hooks/useFormRules.js`                  | `useFormRules({ formKey, schema, values, labels, idPrefix })` → `{ errors, touched, summary, onBlur, validateAll, applyServerErrors, clear, reset, idFor, labelFor }`: the UI backend's entry merged onto the page's declaration, the blur and submit timing, the server's `errors[]` merged by pointer with entries matching no field kept for the summary, a server error cleared when its value changes                                   |
| `src/components/common/Field.jsx`            | the label, the control as a render prop receiving `{ id, aria-invalid, aria-describedby, aria-errormessage }`, the hint while there is no error, `FieldError` while there is                                                                                                                                                                                                                                                                 |
| `src/components/common/FieldError.jsx`       | the inline error with its id, the hidden prefix and the danger rule                                                                                                                                                                                                                                                                                                                                                                          |
| `src/components/common/FormErrorSummary.jsx` | the summary: `role="alert"`, `tabindex="-1"`, focused when it appears, one link per error, an entry with no field as text                                                                                                                                                                                                                                                                                                                    |
| `src/lib/apiClient.js`                       | `ApiError.problem` (the parsed body when it is `application/problem+json` or carries `type` and `status`) and `ApiError.fieldErrors` (its `errors[]`); 422 to `errors.validation`, 409 to `errors.conflict`, neither drawn as a card by a form                                                                                                                                                                                               |
| `src/utils/forms.js`                         | the page schemas and label keys of the box, ISO, version, provider and architecture forms, the checksum `custom` rule among them                                                                                                                                                                                                                                                                                                             |
| `public/locales/<lang>/shared.json`          | `validation.*`, one key per rule, replacing `setup.validation.*`, `boxes.validation.*` and `auth:errors.fieldRequired`, `usernameLength`, `invalidEmail`, `passwordLength`                                                                                                                                                                                                                                                                   |

The forms drawn through it: sign in, register, profile (password, email,
display name, service account), organization console (organization record,
invitation), admin organizations (rename, edit), OIDC provider, discovery
(join message), the box, ISO, version, provider and architecture slots, the
SMTP test recipient, the setup page and the admin configuration tab.

---

## Server reference

| Host                 | Where                                                                                                                                                                                                                                                                                                                    | Status                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| BoxVault             | `backend/app/rules/*.json` served by `GET /api/rules`; `validateBody(form)` in `backend/app/middleware/validate.js` on every write route; `backend/app/utils/validation.js` the evaluator; `backend/app/utils/problem.js` the body                                                                                       | ✓                                              |
| VDI Health Monitor   | `vdi_health/rules.json` served by `GET /api/rules`; `vdi_health/validation.py` the evaluator; `problem()` in `vdi_health/i18n.py` the body                                                                                                                                                                               | ✓                                              |
| Provisioner catalog  | `problemResponse` in `worker/src/index.js` on the Worker's writes; no forms, so no `/api/rules`                                                                                                                                                                                                                          | ✓                                              |
| Authorization server | `ApiProblemAdvice` answering `MethodArgumentNotValidException` and `ConstraintViolationException` as 422 with `errors[]` through `Problems`; `RulesApiController` serving `GET /api/rules` for `register`, `recovery`, `name`, `password` and `terms`; its own pages draw the same surfaces when they join the shared UI | ✓ the document and the body; the pages to come |

---

## Conformance checklist

| Line                                                                                                                                     | Catalog             | BoxVault                                                                  | VDI Health              | Auth server                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `GET /api/rules` answers the UI backend's forms as JSON Schema 2020-12 with the estate's `$defs` and `unique`                            | n/a, no forms       | ✓                                                                         | ✓ the `$defs`, no forms | ✓ `RulesApiController`, `register`, `recovery`, `name`, `password`, `terms` |
| the write route evaluates the same document before the write; a rule outside the vocabulary answers in the same body                     | ✓                   | ✓ `validateBody(form)`                                                    | ✓                       | ✓ the JSON routes; the templates' form posts leave with them                |
| every refused write is `application/problem+json` with `type`, `title`, `status` and `errors[]` of `pointer`, `rule`, `params`, `detail` | ✓ `problemResponse` | ✓ `problem()`                                                             | ✓ `problem()`           | ✓ `Problems`, `ApiProblemAdvice`                                            |
| 422 for a rule failure, 409 for `unique`, 400 only for an unreadable request                                                             | ✓ no `unique`       | ✓                                                                         | ✓ no `unique`           | ✓                                                                           |
| password minimum 15 by default, at least 64 accepted, no composition rules, a blocklist on the route                                     | n/a                 | ✓ `auth.local.local_password_min_length`, `rules/password-blocklist.json` | n/a, no passwords       | ✓ `PasswordPolicyService`, floor 15, blocklist                              |
| the email grammar is the HTML Standard's on both sides                                                                                   | n/a                 | ✓                                                                         | n/a                     | ✓ `$defs.email` on `/api/rules` and the JSON routes                         |
| every form draws `FieldError` and `FormErrorSummary`, validates on blur and on submit, never on keystroke, never in a card               | ✓ shared UI         | ✓ shared UI                                                               | ✓ shared UI             | to come, the pages join at the cutover                                      |
| `aria-invalid` only after blur or submit, `aria-describedby` and `aria-errormessage` wired, the summary `role="alert"` and focused       | ✓ shared UI         | ✓ shared UI                                                               | ✓ shared UI             | to come, the pages join at the cutover                                      |
| the wording says what to enter, in the label's words, one `validation.<rule>` key per rule                                               | ✓ shared UI         | ✓ shared UI                                                               | ✓ shared UI             | to come, the pages join at the cutover                                      |

---

## Specification anchors

RFC 9457 Problem Details for HTTP APIs (§3, §3.1.4, §3.2, §4) · RFC 6901
JSON Pointer · RFC 9110 HTTP Semantics (§15.5.1, §15.5.4, §15.5.5, §15.5.10,
§15.5.21) · JSON Schema 2020-12 Validation (§6.1 to §6.5, §7, §9) and Core
(§10.3.2.4 `propertyNames`, §12.3 output units) · OpenAPI 3.1 Schema Object, a superset of JSON Schema
2020-12 · RFC 3986 URI Generic Syntax (§2.3 unreserved, §3.3 path segments,
§5.2.4 dot-segments) · NIST SP 800-63B rev 4 (August 2025) §3.1.1.2 · HTML
Standard, valid e-mail address · WCAG 2.2 SC 3.3.1 Error Identification (A),
SC 3.3.3 Error Suggestion (AA), SC 4.1.3 Status Messages (AA), techniques
G83, G85, G177, ARIA19, ARIA21, ARIA22 · WAI-ARIA 1.2 `aria-invalid`,
`aria-errormessage`, `aria-describedby` · WAI-ARIA Authoring Practices, alert
pattern · GOV.UK Design System, error message and error summary components ·
Nielsen Norman Group, ten design guidelines for reporting errors in forms.

---

**Related:** [Universal Config Contract](universal-config/) |
[Universal Navbar Contract](universal-navbar/) |
[Universal Session Contract](universal-session/) |
[Universal Pages Contract](universal-pages/) |
[Universal Events Contract](universal-events/)
