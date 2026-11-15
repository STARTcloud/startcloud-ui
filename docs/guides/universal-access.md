---
title: Universal Access Contract
layout: default
parent: Guides
permalink: /docs/guides/universal-access/
---

## Universal Access Contract

{: .no_toc }

The access contract: the roles, the permissions, their one written form, what travels between the authorization server, a UI backend and the shared UI, and the check a UI backend makes on every request.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **Three layers, one thing each.** The authorization server owns who a person is, which organizations exist and each person's role in each organization. A UI backend owns its permissions, which role carries which permission, its one platform role and the check on every request. A record names the organizations that own it and the person who created it.
- **Code checks a permission, never a role name.** Why: a role changes without touching a gate.
- **The UI backend decides.** A UI backend enforces every permission on every request, and the shared UI only hides a control whose permission is not held. Why: a check in the browser is one the caller can change (OWASP ASVS 8.3.1).
- **Deny by default.** A request that matches no rule is refused.
- **One written form.** A role or a permission is the same string in the database, the token, the API and the shared UI. Why: a second spelling is a translation someone must keep.
- **A role belongs to exactly one scope.** Why: no word means two things.
- **Having an account is not a role.** A signed-in person with no role holds no permission beyond their own account.

---

## 1. The roles

| Scope        | Role             | Meaning                                        |
| ------------ | ---------------- | ---------------------------------------------- |
| platform     | `platform:admin` | runs this install of the app                   |
| organization | `org:owner`      | holds the organization, sets roles, can end it |
| organization | `org:admin`      | manages its people and all its content         |
| organization | `org:member`     | does the work                                  |
| organization | `org:guest`      | reads what the organization shares with guests |

- Each organization role holds every permission of the role below it, in the order owner, admin, member, guest.
- A person holds one role per organization, and may hold a different role in each.
- `platform:admin` holds every permission of the app in every organization.
- No other role word exists on any wire.

---

## 2. The written form

| Thing      | Form              | Example                          |
| ---------- | ----------------- | -------------------------------- |
| Role       | `scope:role`      | `platform:admin`, `org:owner`    |
| Permission | `resource:action` | `machine:power`, `member:invite` |

- Lower case; a word of more than one part is `snake_case`, as in `service_account:create`.
- The colon separates the two halves and appears once.

---

## 3. The permissions

Each row names the lowest role that holds the permission. A row marked platform is held by `platform:admin` alone.

### Every UI backend with organizations

| Permission                      | Lowest role |
| ------------------------------- | ----------- |
| `organization:read`             | guest       |
| `member:read`                   | guest       |
| `service_account:create`        | member      |
| `organization:update`           | admin       |
| `member:invite`                 | admin       |
| `member:remove`                 | admin       |
| `invitation:read`               | admin       |
| `invitation:revoke`             | admin       |
| `join_request:decide`           | admin       |
| `member:invite_admin`           | owner       |
| `member:remove_admin`           | owner       |
| `member:set_role`               | owner       |
| `organization:set_default_role` | owner       |
| `organization:delete`           | owner       |
| `organization:read_all`         | platform    |
| `organization:suspend`          | platform    |
| `user:read`                     | platform    |
| `user:suspend`                  | platform    |
| `user:delete`                   | platform    |
| `platform_role:set`             | platform    |
| `config:read`                   | platform    |
| `config:update`                 | platform    |
| `update:apply`                  | platform    |

- `member:invite` and `member:remove` cover a member or a guest; an admin needs the `_admin` permission.
- An owner is never invited, and the last owner of an organization is never removed or lowered.

### A UI backend that lists `hosts`

| Permission              | Lowest role | Covers                                                                                                   |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `host:read`             | guest       | the host, its networking, storage and devices pages                                                      |
| `machine:read`          | guest       | the machine, its tasks and its state                                                                     |
| `machine:power`         | member      | start, stop, restart, reset, suspend, resume                                                             |
| `machine:console`       | member      | open and close a console session                                                                         |
| `file:download`         | member      | download a file                                                                                          |
| `machine:create`        | admin       | create, clone                                                                                            |
| `machine:update`        | admin       | reshape, edit, snapshot, provision                                                                       |
| `machine:destroy`       | admin       | kill, destroy                                                                                            |
| `machine:read_document` | admin       | the machine's provisioning document                                                                      |
| `machine:assign`        | admin       | the organizations a machine belongs to                                                                   |
| `host:control`          | admin       | every write of the networking, storage and devices pages                                                 |
| `host:power`            | admin       | restart, shut down, power off                                                                            |
| `host:system`           | admin       | boot environments, services, processes, users, time, runlevel, logs, faults, packages, updates, database |
| `host:provisioning`     | admin       | repositories, recipes, templates, provisioners, provisioning network, installers, orchestration          |
| `file:manage`           | admin       | create, upload, move, copy, rename, edit, archive, delete                                                |
| `host:assign`           | admin       | the organizations a host belongs to                                                                      |
| `host:add`              | platform    | register, update and remove a host                                                                       |
| `agent:configure`       | platform    | an agent's configuration, secrets, API keys and update                                                   |

---

## 4. What travels

The authorization server to a UI backend, in the `organizations` claim and on the SCIM push:

```json
{
  "organizations": [
    {
      "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "acme",
      "roles": ["org:owner"],
      "primary": true,
      "personal": false
    }
  ]
}
```

A UI backend to the shared UI, on `GET /api/user`:

```json
{
  "roles": ["platform:admin"],
  "permissions": ["config:read", "config:update", "user:read"],
  "organizations": [
    {
      "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "acme",
      "roles": ["org:admin"],
      "permissions": ["organization:read", "member:read", "member:invite", "machine:power"]
    }
  ]
}
```

- `roles` at the top is empty for a person who is not a platform admin.
- `permissions` at the top holds the platform permissions; each organization entry holds the permissions the person has there.
- A record whose access differs from its organization's, a host shared with several organizations among them, carries its own `permissions` for the caller on its row.
- The shared UI draws a control while its permission is in the list it reads, and reads no role to decide.

---

## 5. The check

| Step | Question                                      | Result      |
| ---- | --------------------------------------------- | ----------- |
| 1    | Is the caller signed in?                      | no: `401`   |
| 2    | Does the caller hold `platform:admin`?        | yes: allow  |
| 3    | Which organizations own the record?           | none: `403` |
| 4    | What is the caller's highest role among them? | none: `403` |
| 5    | Does that role carry the permission?          | no: `403`   |

- A refusal is the validation contract's problem body.
- One file per UI backend holds the role strings, the permission strings and which role carries which; every gate reads it.

---

## 6. Records

- A record names the organizations that own it and the person who created it.
- A record no organization owns is reached by a platform admin alone.
- Where a member may create a record, its creator holds that record's write permissions.
- A list answers only the records the caller may read.

---

## 7. Without an authorization server

- A UI backend holds its own organization and membership tables, filled by sign-up and invitation, in the same role strings.
- The first account of an install holds `platform:admin`.
- With an authorization server, the claim and the SCIM push fill the same tables, and `platform:admin` stays a local grant.

---

## 8. Keys

- A service account acts with a role no higher than its creator holds in its organization.
- An agent's key classes are the agent's own; the agent answers the permissions a key holds in the form above, and no key class travels.
