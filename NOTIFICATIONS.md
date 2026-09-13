# Notifications from the STARTcloud UI estate

Every item lands here from another repository's `notifications.md`, is done or moved to the repository that owns it, and leaves.

## From authorization-server-private

| contract                                              | what is written                                                                                     | required change                                                                  | source if absent                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| universal-identity.md, group 5, decisions 139 and 140 | `POST /api/admin/organizations/bulk` and `DELETE /api/admin/brute-force` are served as the rows ask | walk the All organizations bulk bar and the Blocked IPs Unblock all against them | authorization-server-private: src/main/groovy/startcloud/api/AdminApiController.groovy, src/main/groovy/startcloud/api/AdminOpsApiController.groovy |
