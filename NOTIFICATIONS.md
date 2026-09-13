# Notifications from the STARTcloud UI estate

Every item lands here from another repository's `notifications.md`, is done or moved to the repository that owns it, and leaves.

## From authorization-server-private

| contract                                                                                       | what is written                                                                                                                                                | required change                                                      | source                                                                                    |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| universal-identity.md, Build, packaging and tests, the serving bullet; decision 132            | every file of `ui/`, `/assets/` included, is served `Cache-Control: no-cache` with an ETag, `index.html` and `/` `no-store`; no file name carries a hash, ever | none; a redeploy is picked up on the next load with no browser clear | authorization-server-private: src/main/groovy/startcloud/ui/UiResourceConfig.groovy       |
| universal-identity.md, group 5, the admin terms read row, the reorder action row, decision 133 | `GET /api/admin/terms` rows carry `id`; `PUT /api/admin/terms/order` takes `{ ids: [] }`; `{ names: [] }` is gone                                              | send the card ids in drawn order from the Terms page                 | authorization-server-private: src/main/groovy/startcloud/api/AdminOpsApiController.groovy |
