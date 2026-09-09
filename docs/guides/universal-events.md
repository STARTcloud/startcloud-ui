---
title: Universal Events Contract
layout: default
nav_order: 12
parent: Guides
permalink: /docs/guides/universal-events/
---

## Universal Events Contract

{: .no_toc }

One server-sent event stream for every estate UI backend that has live data: one
path, one connection per browser tab, every topic the UI backend streams
multiplexed on it, one frame grammar, one resume rule, and one shared
client in the STARTcloud UI that every page subscribes to by event name.
This contract fixes what a UI backend advertises, what the client sends, what
the stream answers, how a lost connection catches up, and how auth is
checked on it; the data inside each event is the UI backend's own and is named
per topic below. It extends the
[Universal Navbar Contract](universal-navbar/), whose status payload
advertises the stream, and the
[Universal Session Contract](universal-session/), whose provider signs the
request and whose bus a `401` ends the session on. It replaces the
per-app streams the estate had before it: BoxVault's session terminate
stream under `/api/notifications/events` and the VDI Health Monitor's
ad-hoc dashboard stream both become topics on the one path.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Principles

- **One stream per UI backend, one connection per tab.** A UI backend has exactly one
  event path; a tab opens it once and every page, hook and chrome piece
  subscribes to that one connection. No page opens a stream of its own.
- **Topics multiplex the stream.** The client names the topics it wants in
  the request; the server sends only those. A topic is a named bundle of
  events with a snapshot so a client can rebuild from nothing.
- **Every event is identified and resumable.** Every frame carries a
  monotonic id, the server keeps a ring of recent events, and a client
  that reconnects with `Last-Event-ID` gets exactly what it missed or a
  reset with fresh snapshots. Nothing is lost silently.
- **The wire is the spec.** Frames are plain
  [WHATWG server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html):
  `id:`, `event:`, `data:`, `retry:` and comment lines, nothing else. Any
  spec parser reads the stream; the shared client is one.
- **Auth is the session's.** The request carries the same headers the
  session provider builds for any API call, a `401` ends the session on
  the bus like any other `401`, and a `403` on a topic is final.
- **Names are kebab-case; payloads are the UI backend's.** Event names are fixed
  by this contract per topic; the JSON object inside each event keeps the
  field names the UI backend's REST routes already use, so a page that reads
  `GET /api/vdi/fleet` reads a `vm-updated` event with the same code.
- **The server implements the contract; it does not shape it.** A UI backend
  written in Python, Node or Java answers the same status object, the
  same frames and the same resume rule; the grammar is not derived from
  any one UI backend's convenience.

---

## Status advertisement

A UI backend that streams anything advertises the feature token `events` and
answers a top-level `events` object in `GET /api/status`:

```json
{
  "features": ["health", "events", "fleet"],
  "events": { "path": "/api/events", "topics": ["session", "notifications", "fleet"] }
}
```

| Field                        | Meaning                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features` contains `events` | the UI opens the stream at all; without the token nothing is opened and no page subscribes                                                                        |
| `events.path`                | the stream path on the serving origin, `/api/events` on every UI backend that follows the [Where the UI is served](universal-navbar/#where-the-ui-is-served) rule |
| `events.topics`              | every topic the UI backend can stream, core and app topics alike; the client asks for the ones its pages need from this list and never for one outside it         |

A UI backend without live data omits both the token and the object. The token
is the gate and the object is data, the same split the navbar contract
makes between `features` and `collections`.

---

## Request

```text
GET /api/events?topics=session,notifications,fleet
Accept: text/event-stream
Authorization: DPoP <token>          (or Bearer, or x-access-token)
DPoP: <proof>                        (a key-bound token only)
Last-Event-ID: 1757068800000-3       (a reconnect only)
```

- `topics` is a comma-separated list of topic names. Unknown topics are
  ignored, never refused; an empty `topics` opens the stream with only the
  core topics the caller may read.
- The headers are the session's, `session.headers('GET', url)` of the
  [Universal Session Contract](universal-session/#provider-contract): a
  `Bearer` or `DPoP` scheme on an `idp` UI backend with the proof's `htu` equal
  to the stream URL without its query, `x-access-token` on a `backend`
  UI backend, and on a `cookie` UI backend the session cookie alone, since
  the cookie provider's `headers()` answers `{}` for a GET. A UI backend
  whose `auth.mode` is `none` accepts the request with no headers.
- `Last-Event-ID` is sent on every reconnect with the id of the last frame
  the client processed; it is never sent on a first connection.
- The request is a `fetch` with a `ReadableStream`, never `EventSource`,
  because `EventSource` cannot carry a header and so cannot carry a
  session.

---

## Response and frames

Headers, on every UI backend:

```text
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
X-Accel-Buffering: no
```

The stream is never compressed and the headers are flushed before the
first frame, so a proxy between the UI backend and the browser cannot buffer it.
No `Connection` header is sent: it is hop-by-hop (RFC 9110 §7.6.1) and an
HTTP/2 endpoint must not generate it (RFC 9113 §8.2.2), while HTTP/1.1
connections persist by default (RFC 9112 §9.3).

The first frame is the retry hint followed by `ready`, which carries the
current id and the topics actually subscribed (the requested ones the
caller may read, plus the core topics):

```text
retry: 3000
id: 1757068800000-0
event: ready
data: {"id":"1757068800000-0","topics":["session","notifications","fleet"]}

```

Every event after it is three lines and a blank line:

```text
id: 1757068800412-0
event: vm-updated
data: {"instance_id":"i-0a1b","hostname":"VDI-0042", ...}

```

| Line          | Rule                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id:`         | monotonic per UI backend, `<epoch-ms>-<seq>`, `seq` resetting to `0` each millisecond; the same id space across every topic so a single `Last-Event-ID` resumes the whole stream |
| `event:`      | the kebab-case event name fixed per topic below; never the default unnamed `message`                                                                                             |
| `data:`       | one JSON object on one line; never a bare string, never split over several `data:` lines                                                                                         |
| `retry: 3000` | sent once at the start; the client's base reconnect delay                                                                                                                        |
| `:hb`         | a comment line every 25 seconds while the stream is idle, so an idle connection is told apart from a dead one                                                                    |

Any frame the contract does not name is a defect: no unnamed events, no
`data:` without `id:`, no non-JSON data.

---

## Topics

A topic is a name, the events it sends, and the snapshot a client rebuilds
from. The core topics exist on every UI backend that has the surface behind
them; app topics are the UI backend's own and are listed here per app so every
page in the estate reads the same names.

### Core topics

| Topic           | Event                | Data                                                             | Snapshot                                                                |
| --------------- | -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `session`       | `session-terminated` | `{}`                                                             | none; the client ends the session on the bus                            |
| `notifications` | `unread-count`       | `{ "count": N }`                                                 | none; the client reads `GET /api/notifications/unread-count` on connect |
| `health`        | `health`             | the `/api/health` shape, `{ "status", "timestamp", "services" }` | none; the client reads `GET /api/health` on connect                     |

A UI backend streams `session` when it holds a session it can end from outside
the tab (a back-channel logout, a revoke sweep), `notifications` when
it proxies or holds the hub's unread count for the user, and `health`
whenever it advertises both `health` and `events`, sending the event when
any service changes state, so the footer's heart on every streaming UI
backend follows the stream and never a timer; a UI backend that
answers `auth: []` has neither of the first two.

### VDI Health Monitor: topic `fleet`

The UI backend whose `role` is `vdi-health` streams one app topic. Every object
inside these events keeps every field and every `snake_case` name the
Python server's REST routes use; nothing inside `vm`, `pool`, `uds` or
`state_event` is renamed.

| Event            | Data                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `fleet-snapshot` | `{ "vms": [vm], "pools": { name: pool } }`                                             |
| `vm-updated`     | one `vm` object                                                                        |
| `vm-removed`     | `{ "instance_id", "hostname" }`                                                        |
| `vm-events`      | `{ "instance_id", "hostname", "events": [state_event] }`                               |
| `pools-updated`  | `{ "vms": { hostname: uds }, "synthetic": { hostname: vm }, "pools": { name: pool } }` |

`fleet-snapshot` is the topic's snapshot event; it is what a reset sends
and what `useFleet` seeds its keyed map from after `GET /api/vdi/fleet`.

### Authorization server: topic `admin`

The UI backend whose `role` is `auth-server` streams one app topic,
admitted to `ROLE_ADMIN` alone and answered `403` to everyone else, so
that nothing an operator must know is learned by a timer; `admin` is
listed in `events.topics` only for a session holding `ROLE_ADMIN`, so the
stream never refuses a topic the same session's status listed; the `403`
remains for a caller who asks for `admin` unlisted:

| Event              | Data                                                                                                                                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `restart-required` | `{ "required": true, "last_modified_by": "mark@m4kr.net", "last_modified_time": "2026-09-07T02:14:00Z" }`, sent when a configuration write leaves a restart pending and `{ "required": false }` after the restart; the Dashboard's restart card and the Configuration page's card both read it |
| `blocked-count`    | `{ "count": 3 }`, sent when the brute-force block list changes; the Blocked IPs sidebar badge                                                                                                                                                                                                  |

The footer's heart reads the core `health` topic, which the issuer streams
like every UI backend with `health` and `events`. The `admin` topic has no
snapshot event: a connecting client reads
`GET /api/admin/config/restart-status` and
`GET /api/admin/brute-force/count` once, and the stream carries every
change after.

### Adding a topic

A new topic lands in this table before any UI backend streams it: its name, its
events and their data, and its snapshot event or the statement that it
has none. Two UI backends that stream the same kind of data use the same topic
name and the same events, the way every UI backend's `session` topic sends
`session-terminated`.

---

## Resume and the ring

The server keeps a ring of the events it sent, the last 500 events or the
last 5 minutes, whichever is larger, in id order across every topic.

| Reconnect                        | Server answer                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no `Last-Event-ID`               | `retry`, `ready`, then live events; the client seeds each topic from its REST snapshot route                                                                                                                                                                                                                |
| `Last-Event-ID` inside the ring  | `retry`, `ready`, every event after that id in order, filtered to the subscribed topics, then live events                                                                                                                                                                                                   |
| `Last-Event-ID` outside the ring | `retry`, `ready`, `id: <the newest id>` `event: reset` `data: { "topics": [...] }`, then each subscribed topic's snapshot event (a topic without a snapshot sends nothing), then live events; `reset` carries an `id:` like every other frame, so the grammar's "no `data:` without `id:`" holds for it too |

`reset` tells the client its state is stale beyond repair; the snapshot
events that follow rebuild it, so a page that subscribed to
`fleet-snapshot` needs no code of its own for the reset case. Every frame
in the ring is stored with its recipient, and a replay is filtered by the
connection's principal as well as by its topics, because a per-person
event such as `unread-count` would otherwise replay to whoever reconnects
next with an older id. The `ready`
frame's `id` is the newest id the server has, and is what the client sends
back on its next reconnect if nothing else arrives in between.

---

## Auth

| Status                                                                  | Meaning                                                                   | Client                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `200`                                                                   | the stream is open                                                        | reads frames                                                                                                |
| `401`                                                                   | the UI backend requires a session and none was presented or it is invalid | `session.endSession()`; the session-ended banner shows and the stream is not retried until the next sign-in |
| `403`                                                                   | the caller may not read a requested topic                                 | fatal, no retry; the page that asked for the topic sees `stopped`                                           |
| `204`                                                                   | the UI backend has nothing to stream for this caller and will not         | stop for good                                                                                               |
| any other non-`200`, or a `Content-Type` other than `text/event-stream` | a proxy, a wrong path, a UI backend without the stream                    | fatal, no retry                                                                                             |

A dropped connection with no status (the socket closed, the network went
away) is the only condition that retries. The server verifies the token
exactly as it does on any API route, the [Backends](universal-session/#backends)
section of the session contract: the signature against the issuer's JWKS,
`iss` and `aud`, and for a key-bound token the DPoP proof with `htu` the
stream URL without its query, `iat` within 60 s, `ath` over the token and
a `jti` unseen for 300 s. Topic permission is the UI backend's own rule (the VDI
Health Monitor admits every signed-in user to `fleet`; a UI backend with an
admin-only topic answers `403` on it to everyone else).

---

## Client

The shared client lives once in the STARTcloud UI and every UI backend's page
uses it through the runtime; no feature opens a stream of its own.

### `src/lib/sse.js`

`openEventStream({ url, topics, headers, onEvent, onReady, onReset, onStatus, onUnauthorized, signal })`
returns a stop function.

- The spec parser over `fetch` and a `ReadableStream`: frames split on the
  blank line, `id:`, `event:`, `data:` and `retry:` read, comment lines
  dropped, `data` parsed as JSON before `onEvent(name, data, id)` is
  called.
- `retry:` is honored as the base delay; reconnects use jittered
  exponential backoff from it, capped at 30 seconds, and every reconnect
  carries `Last-Event-ID` with the last id seen.
- `headers` is an object or a function answering one, resolved on every
  connection so a refreshed token or a fresh DPoP proof is used.
- The stream is closed while `document.hidden` and reopened with the last
  id when the tab is visible again, so a background tab holds no
  connection and misses nothing.
- `401` calls `onUnauthorized`, which the runtime binds to
  `session.endSession()`; `403`, `204` and a wrong content type stop for
  good; `onReady({ id, topics })` and `onReset({ topics })` mirror the two
  control frames.
- `onStatus` reports `connecting`, `live`, `reconnecting`, `paused` and
  `stopped`, the words a page's live indicator reads.

### `src/lib/eventHub.js` and `src/lib/runtime.js`

`createEventHub()` is the tab's one subscription surface: `subscribe(name,
handler)` for named events (`ready` and `reset` included), `connect` and
`disconnect` over `openEventStream`, and `status()` with `onStatus` for
the connection state. The runtime exports the hub as `eventHub`, and
`connectEventStream(status)` opens the stream at `status.events.path`
subscribed to every topic in `status.events.topics`, the session's
headers on the request and a `401` ending the session on the bus;
`disconnectEventStream()` closes it. The `useSessionKeepalive` hook
connects while the UI backend advertises `events` and either answers
`auth: []` or has a signed-in user confirmed by `load()`, never from the
restored cache alone, because a stale cache would open the stream, meet a
`401` and raise the session-ended banner for a visitor who was never
signed in; it reconnects when the session's token changes, and answers
`session-terminated` with `events.endSession()`, so a back-channel logout
at the identity provider reaches every open tab through the one
connection. `events.path` is a same-origin path; a value carrying a
scheme is ignored, so a status payload can never point the session's
headers at another host.

### `src/hooks/useEventStream.js`

`useEventStream(name, handler)` subscribes a component to one named event
on the hub for as long as it is mounted, the newest handler always called,
and is the only way a page reads the stream; `useEventStreamStatus()`
answers the connection state for a live indicator. The VDI fleet page's
`useFleet` subscribes to `fleet-snapshot`, `vm-updated`, `vm-removed`,
`vm-events` and `pools-updated`; a five-second tick re-derives relative
times and stale flags between events.

---

## Server reference

| Host                 | Where                                                                                                                                                                                                                                   | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VDI Health Monitor   | `vdi_health/sse.py`: the topic registry, the ring, the id generator, the heartbeat, `subscribe` and `broadcast(topic, event, data)`; `vdi_health/routes/events.py` answers `GET /api/events`                                            | the first implementation of this contract; every fleet broadcast in the server is `broadcast("fleet", "<event>", data)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BoxVault             | `backend/app/utils/events.js` (the ring, ids, ready, heartbeat, replay, reset, per-user delivery) behind `routes/events.routes.js` at `/api/events`, the `events` token and object in `status.controller.js`, `tests/events.test.js`    | `session` and `notifications` topics; `unread-count` is pushed after a read, read-all or delete BoxVault proxied, since it holds the user's hub token only inside a request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Provisioner catalog  | the Worker                                                                                                                                                                                                                              | none; the catalog has no live data and advertises no `events`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Authorization server | `GET /api/events` on the issuer, the `session`, `notifications`, `health` and `admin` topics; `/api/notifications/stream` with its `connected` and `notification` events retires with `notifications.js`, so a tab holds one connection | to come — the cookie session of the [Universal Identity Contract](universal-identity/); the hub is local, so `unread-count` is pushed on every write to the person's inbox; `session-terminated` fires when the HTTP session that opened the stream is invalidated (a logout in another tab, an RP-initiated logout, expiry, a back-channel logout), never when an OAuth client session of the same person is revoked, because that session is not the one holding the stream; emitters are keyed by session id, closed by the logout handler and the session-destroyed event, capped per person, and refused to a `ROLE_2FA_REQUIRED` or `ROLE_ONBOARDING` principal, so a tab signed out on a shared machine stops receiving within the second |

What a server keeps per connection is the subscribed topic set and the
response; what it keeps per UI backend is the ring and the id counter. The
Python server's `sse.py` is the reference shape: a registry of topics
with their snapshot function, a ring of `(id, topic, event, data)`, a
monotonic id from the clock and a per-millisecond sequence, an asyncio
queue per subscriber, the 25-second heartbeat, and a `broadcast` that
appends to the ring and fans out to every subscriber of the topic.

---

## Conformance checklist

Tick each line in the PR that claims conformance.

| Line                                                                                                                                                   | Catalog                     | BoxVault                                                                                   | VDI Health                                                                              | Auth server                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events` token and `events: { path, topics }` in `/api/status`, omitted when the UI backend has no live data                                           | n/a — omitted, no live data | ✓ `status.controller.js`, `["session", "notifications"]`; `health` to come                 | ✓ `/api/events`, `["fleet"]` plus `session` under `auth.mode: idp`; `health` to come    | to come — `/api/events`, `["notifications", "session", "health", "admin"]`                                                                            |
| One path, one connection per tab, topics from `?topics=`, unknown topics ignored, empty means core                                                     | n/a                         | ✓ `events.routes.js`                                                                       | ✓ `routes/events.py`                                                                    | to come                                                                                                                                               |
| The session's headers on the request; `401` ends the session on the bus, `403` and `204` stop for good                                                 | n/a                         | ✓ `x-access-token` through `verifyToken`; no credential → `401`, a service account → `403` | ✓ `auth.py` verifies as on every `/api/vdi/*` route; no headers under `auth.mode: none` | to come — the session cookie; no session → `401`; a `ROLE_2FA_REQUIRED` or pending onboarding principal refused; `admin` answers `403` to a non-admin |
| `text/event-stream; charset=utf-8`, `no-cache, no-transform`, `X-Accel-Buffering: no`, no `Connection` header, never compressed, headers flushed first | n/a                         | ✓                                                                                          | ✓                                                                                       | to come                                                                                                                                               |
| `retry: 3000` then `event: ready` with the id and the subscribed topics                                                                                | n/a                         | ✓                                                                                          | ✓                                                                                       | to come                                                                                                                                               |
| Every event `id: <epoch-ms>-<seq>`, kebab-case `event:`, one-line JSON `data:`; `:hb` every 25 s                                                       | n/a                         | ✓ `events.js`                                                                              | ✓ `sse.py`                                                                              | to come                                                                                                                                               |
| Ring of 500 events or 5 minutes; `Last-Event-ID` inside it replays in order, outside it answers `reset` then every snapshot event                      | n/a                         | ✓ no snapshot topics, `reset` alone                                                        | ✓ `fleet-snapshot` after `reset`                                                        | to come — no snapshot topics, `reset` alone                                                                                                           |
| Core topics by their fixed names: `session` → `session-terminated`, `notifications` → `unread-count`, `health` → `health`                              | n/a                         | ✓ the first two; `health` to come                                                          | ✓ `session` while `auth.mode` is `idp`; `health` to come                                | to come — all three                                                                                                                                   |
| App topics registered in this guide with every event and its snapshot                                                                                  | n/a                         | n/a — none yet                                                                             | ✓ `fleet`: `fleet-snapshot`, `vm-updated`, `vm-removed`, `vm-events`, `pools-updated`   | to come — `admin`: `restart-required`, `blocked-count`, no snapshot                                                                                   |
| Every broadcast through one server module; no ad-hoc queue list                                                                                        | n/a                         | ✓ `broadcast` in `events.js`; `sessionEvents.js` removed                                   | ✓ `broadcast("fleet", …)` everywhere                                                    | to come — one module; `/api/notifications/stream` and `notifications.js` retired                                                                      |
| The UI opens the stream through `connectEventStream` and pages read it through `useEventStream`; no page opens a stream of its own                     | n/a                         | ✓ the runtime stream                                                                       | ✓ `useFleet`, `useVmHistory`                                                            | to come — the runtime stream                                                                                                                          |
| `useSessionKeepalive` answers `session-terminated` on the one stream with `events.endSession()`                                                        | n/a                         | ✓                                                                                          | ✓                                                                                       | to come                                                                                                                                               |

---

**Related:** [Universal Navbar Contract](universal-navbar/) |
[Universal Pages Contract](universal-pages/) |
[Universal Session Contract](universal-session/) |
[Notification Hub](../../features/notification-hub/) |
[Integrating Your App](integrating-your-app/)
