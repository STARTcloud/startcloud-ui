---
title: Universal Setup Contract
layout: default
nav_order: 18
parent: Guides
permalink: /docs/guides/universal-setup/
---

## Universal Setup Contract

| Moment        | Rule                                                                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install       | The package installs the service, its seed configuration and a setup token; the token is in a file on the machine that the admin can read.                                                                                 |
| Start         | The admin starts the service; a backend that is not set up serves the setup page and nothing else.                                                                                                                         |
| Token         | The setup page asks for the setup token; no setup route answers without the matching token.                                                                                                                                |
| Wizard        | Every setting has a default that passes validation, so the admin can finish without a change to any value.                                                                                                                 |
| Finish        | The wizard's write completes setup: the token is deleted, the backend serves the full application in the same process with no restart, and the page goes to the register page.                                             |
| First account | The first account that registers is the platform admin; it is verified at creation and signs in with no mail server.                                                                                                       |
| After setup   | The setup routes answer not-found from then on.                                                                                                                                                                            |
| Upgrade       | An upgrade keeps the configuration and never opens setup again; a running service is restarted gracefully onto the new version, its requests in flight finished first, and stays enabled; a stopped service stays stopped. |
