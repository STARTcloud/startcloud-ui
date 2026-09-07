---
title: Integrating Your App
layout: default
nav_order: 9
parent: Guides
permalink: /docs/guides/integrating-your-app/
---

## Integrating Your App

{: .no_toc }

How to connect an OAuth client application to this authorization server:
which client shape to pick, what you configure on your side, what we
configure on ours.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

## Start here

Everything your OAuth library needs is in the discovery document:

```text
https://auth.startcloud.com/.well-known/openid-configuration
```

Point your library at the issuer and let it discover the endpoints — never
hardcode individual endpoint URLs. If you must bake anything, bake the
ISSUER only, in exactly one place (see the
[issuer cutover checklist](#issuer-cutover-checklist) for why).

Every integration needs a `clients.<id>` block on our side. Send us: your
app's name, its exact redirect URI(s), which shape below you are, and the
scopes you need. You get back a `client_id` (and a secret, if confidential).

## Pick your client shape

| Your app                                      | Grant                                     | Client auth                                | Secret?        |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------ | -------------- |
| Browser SPA (static hosting, no backend)      | `authorization_code` + PKCE               | `none` (public)                            | No             |
| Web app / BFF with a backend                  | `authorization_code`                      | `client_secret_basic` or `private_key_jwt` | Yes (or a key) |
| Backend service calling our APIs (no user)    | `client_credentials`                      | `client_secret_basic` or `private_key_jwt` | Yes            |
| Desktop / mobile app                          | `authorization_code` + PKCE               | `none` (public)                            | No             |
| TV / CLI / input-constrained device           | `device_code`                             | per client type                            | Optional       |
| Decoupled auth (user approves on their phone) | `ciba`                                    | confidential only                          | Yes            |
| High-assurance / financial-grade              | `authorization_code` + PKCE, `fapi: true` | `private_key_jwt` or `tls_client_auth`     | Key or cert    |

End-user login methods — password, magic link, passkeys, GitHub / Google /
Microsoft federated login, TOTP / SMS / backup-code 2FA — are all handled on
our pages. Your app never implements any of them; you redirect to
`/oauth2/authorize` and receive a code, whatever way the user signed in.

## Rules that apply to every shape

- **Redirect URIs match exactly.** No wildcards, no prefix matching.
  Plain-`http` is tolerated on loopback hosts only.
- **PKCE S256 always.** Mandatory for public clients, recommended for all.
- **Validate tokens properly**: signature against `/oauth2/jwks` (keys
  rotate — re-fetch by `kid`), `iss` equals the issuer you configured,
  `aud` contains your identifier, JOSE `typ` is `at+jwt` on access tokens.
- **Check `iss` on the authorization response** (RFC 9207) — we send it on
  every redirect, success and error.
- **Refresh tokens rotate.** Using a rotated-out refresh token revokes the
  whole authorization (RFC 9700 reuse detection) — never retry an old one.
  Public PKCE clients do receive refresh tokens.
- **Store the ID token's `sid`** if you register a logout URI — the
  back-channel logout token carries the same opaque value, and that claim
  is how you find which session to kill.
- **`email_verified` means OUR mailbox proof** — this server verified the
  address itself; it is never inherited from an upstream identity provider.
- **Wrong client credentials are rate-limited by IP** — repeated
  `invalid_client` answers become `429` + `Retry-After`. Back off; don't
  hammer.

## Shape by shape

### Public SPA (authorization_code + PKCE)

Your side: any standard OIDC browser library (`oidc-client-ts` or similar),
configured with the issuer, your `client_id`, your exact redirect URI, and
PKCE (the default in modern libraries). Tokens live in the browser; keep
them out of localStorage if your threat model allows (in-memory + refresh
on load works because public PKCE clients get refresh tokens).

Our side:

```yaml
clients:
  myspa:
    client:
      name: My SPA
      grant-types: authorization_code, refresh_token
      require-pkce: true
      redirect-uris: |
        https://myspa.example.com/callback
      access-token-ttl: 30m
      refresh-token-ttl: 1d
      scopes:
        openid: null
        profile: null
        email: null
```

No `secret` + no key source = public client. The browser calls
`/oauth2/token` cross-origin, so your origin must also be in the CORS
allowlist:

```yaml
security:
  cors:
    allowed_origin_patterns:
      - https://myspa.example.com
```

(`/oauth2/authorize` never supports CORS by design — it is a redirect
target, not a fetch target. Everything else honors the allowlist.)

### Confidential web app / BFF

Your side: your backend holds the credential and does the code exchange;
the browser only ever sees your session cookie. Use `client_secret_basic`
with the issued secret, or bring a JWK Set and use `private_key_jwt`
(RFC 7523) — no shared secret on the wire at all.

Our side — secret variant adds `secret:`; key variant instead:

```yaml
clients:
  mywebapp:
    client:
      name: My Web App
      grant-types: authorization_code, refresh_token
      jwk-set-uri: https://mywebapp.example.com/.well-known/jwks.json
      require-pkce: true
      redirect-uris: |
        https://mywebapp.example.com/auth/callback
```

`jwk-set-uri` (remote), `jwk-set: file:/path` (file), or an inline JWK Set
all work; the signing algorithm is inferred from your key material.

### Machine-to-machine (client_credentials)

Your side: a dedicated service client — never reuse a user-facing client
(we refuse `client_credentials` on clients that carry user scopes). The
token request **MUST name its scopes explicitly**:

```text
POST /oauth2/token
grant_type=client_credentials&scope=notifications:write
```

Omitting `scope` mints a token with ZERO scopes (not all-registered), and
every scope-gated API answers `403 insufficient_scope`. This is the single
most common S2S integration mistake.

Our side:

```yaml
clients:
  myservice_s2s:
    client:
      name: My Service (S2S)
      secret: issued-secret
      grant-types: client_credentials
      scopes:
        notify_label:
          description: Write notifications
          scope: notifications:write
```

### Native / desktop app

Public + PKCE, exactly like the SPA, but the redirect URI is a custom
scheme (`myapp://auth/callback`) or a loopback `http://127.0.0.1:{port}`
URI. Custom schemes pass our exact-match validation; register the precise
string. Health probing skips you automatically (nothing web-facing).

### Device grant (RFC 8628)

`POST /oauth2/device_authorization` returns the user code; the user
activates at `https://<issuer>/activate` and your app polls
`/oauth2/token` with `urn:ietf:params:oauth:grant-type:device_code`.
Honor `slow_down`.

### CIBA (decoupled)

`POST /oauth2/bc-authorize` (confidential clients, when
`security.oauth2.ciba.enabled`) with `login_hint` (email or UUID) or
`id_token_hint`; the user approves at `/ciba/approve` via push
notification, email, or SMS. Delivery modes `poll`, `ping`, `push` per
client (`ciba-delivery-mode`, `ciba-notification-endpoint`).

### High-assurance: DPoP, mTLS, FAPI

- **DPoP** (RFC 9449): send a proof on the token request and you get
  `"token_type": "DPoP"` and a key-bound token — which then MUST be
  presented with the `DPoP` scheme everywhere (plain `Bearer` is refused).
  `require-dpop: true` on your client makes proofs mandatory.
- **mTLS** (RFC 8705): `tls-client-auth-subject-dn` authenticates you by
  client certificate on the dedicated mTLS listener (advertised via
  `mtls_endpoint_aliases`); `certificate-bound-access-tokens` binds tokens
  to your cert (`cnf.x5t#S256`).
- **FAPI 2.0**: `fapi: true` on your client enforces the whole profile —
  PAR required, PKCE S256, `private_key_jwt`/mTLS only, sender-constrained
  tokens, PS/ES/EdDSA signatures. If you're building a FAPI client, start
  from PAR (`/oauth2/par`) and expect the server to reject anything
  outside the profile.

## The same SPA, three hosting shapes

One app, three deployments — the client type follows the hosting.

### 1. GitHub Pages (or any static host)

Pure public-SPA pattern: no secret anywhere (a static host cannot keep
one), PKCE, exact redirect URI
(`https://you.github.io/yourapp/callback`), and your Pages origin added to
`security.cors.allowed_origin_patterns` so the browser can call the token
endpoint.

The live example in this estate is **provisioner-catalog**: a public SPA
on Pages whose only server-side piece is a Cloudflare Worker. It bakes the
issuer in exactly one place — the Worker's `ISSUER` in `wrangler.toml` —
and the Worker hands it to the browser as `idp.issuer` in its
`GET /api/status`, so the SPA (the shared STARTcloud UI) bakes nothing;
that is the pattern to copy: one constant per deployable, nothing else
hardcoded. Its browser-side OIDC client is the shared `createBrowserOidc`
of the [Universal Session Contract](universal-session/), built from that
`idp` object.

The estate's own resource servers accept that client's tokens directly:
the catalog Worker and BoxVault's backend both verify the signature
against our JWKS, `iss`, `aud`, and the DPoP proof of a key-bound token,
so one browser session serves every backend. In the browser every one of
those requests goes through the session contract's
[API client](universal-session/#api-client), which signs each request with
the provider's headers for the absolute URL it sends and ends the session
on a `401` the provider cannot recover. The rules a backend applies are
the session contract's [Backends](universal-session/#backends) section; a
backend that admits a browser origin other than its own must also list it
in its CORS.

### 2. Self-hosted (nginx)

Same public client, same PKCE flow — hosting it yourself changes nothing
about the OAuth shape. What nginx adds is the security-header block your
static host was doing for you:

```nginx
server {
    listen 443 ssl;
    server_name myspa.example.com;
    root /var/www/myspa;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy no-referrer always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://auth.startcloud.com; frame-ancestors 'none'" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`connect-src` must include the issuer origin or your own CSP blocks the
token call.

### 3. Cloudflare Worker

Two valid shapes — pick one deliberately:

- **Public SPA + Worker as API only** — the Worker never touches auth; the
  SPA is shape 1 verbatim. This is what provisioner-catalog does.
- **Confidential BFF** — the Worker holds a client secret (Worker secret,
  not in `wrangler.toml`), does the code exchange server-side, and issues
  its own httponly session cookie. **No tokens ever reach the browser.**
  Register the Worker's callback URL as the redirect URI and drop the
  CORS entry — the browser never calls our token endpoint. This is the
  stronger shape; use it when the app handles anything sensitive.

## Scopes and the claims you get back

| Scope                  | Yields                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `openid profile email` | standard OIDC claims; `email_verified` = our mailbox proof                                   |
| `phone`                | `phone_number`, `phone_number_verified`                                                      |
| `organizations`        | the org membership claim ([Organizations](../../features/organizations/))                    |
| `entitlements`         | which estate apps the user has used ([SCIM Provisioning](../../features/scim-provisioning/)) |
| `idp`                  | `idp` / `idp_family` — how the user authenticated upstream                                   |

Custom ID-token claims (`UUID`, `roles`, `preferences`, `customer_id`,
`lsid`, ...) are released per client via `id-token-custom-claims` — ask for
what you need. Full claim inventory: [API Reference](../../api/).

## Logout integration

Register `logout-redirect-uris` (exact match) and send the user to
`/connect/logout` with `id_token_hint` — POST it, don't put the token in a
URL. Register a `back-channel-logout-uri` to be told when the user's
session dies elsewhere (signed `logout+jwt`, correlate by the stored
`sid`), or a `frontchannel-logout-uri` for the iframe variant.

## Issuer cutover checklist

Moving an app estate between issuers (e.g. `dev-auth.startcloud.com` →
`auth.startcloud.com`) is a **hard cutover**: every outstanding token and
session carries the old `iss` and dies at the boundary. Walk this list:

1. **Every client's baked ISSUER.** provisioner-catalog has ONE: the
   Worker `ISSUER` in `wrangler.toml` (redeploy the Worker; the UI reads
   it from `/api/status` at runtime). BoxVault's is its OIDC provider
   config. Audit every other consumer for its own bakes — anything with a
   hardcoded discovery URL.
2. **Federated provider consoles.** Google, Microsoft, and GitHub OAuth
   apps hold OUR callback URLs
   (`https://<issuer-host>/login/oauth2/code/<provider>`) — each console
   needs the new host added before cutover and the old one removed after.
3. **`application.scim.issuer`** — the `iss` on SCIM push JWTs; subscribers
   verifying it must agree.
4. **SSF streams and S2S consumers** — anything validating `iss` on our
   SETs, notification-hub tokens, or SCIM bearers against the old value.
5. **CORS + redirect URIs** stay valid (they name YOUR origins, not ours) —
   but re-test every app's login end-to-end; users re-authenticate once.

---

**Related:** [Configuration Reference](configuration/) | [API Reference](../../api/) | [Authentication](authentication/)
