Feature: host-manage

  Scenario: Manage: the page behind any token of its sections, a host whose row lists none draws the not-available stub and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/manage"
    Then the manage page draws the not-available stub
    And the host was not sent GET to "/api/agents/4/system/host/runlevel"
    And the host was not sent GET to "/api/agents/4/services"

  Scenario: Manage: a host the list of servers does not hold draws what the host page draws for it
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/manage"
    Then the manage route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/services"

  Scenario: Manage: the page is for an admin alone, hyperweaver-ui's gate, and asks nothing for another role
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"sam\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page says an admin is required
    And the host was not sent GET to "/api/agents/3/services"
    And the host was not sent GET to "/api/agents/3/system/users"

  Scenario: Manage: one folding section a tab of hyperweaver-ui in its order, each behind its token, the ones of other sub-stages drawing their heading alone
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws its frame
    And the host tab "manage" is the active one
    And the manage page draws 11 sections
    And the manage page draws the "services" section
    And the manage page draws the "packages" section
    And the manage page draws the "system-updates" section
    And the manage page draws the "time-ntp" section
    And the manage page draws the "processes" section
    And the manage page draws the "user-group" section
    And the manage page draws the "provisioning-network" section
    And the manage page draws the "recipes" section
    And the manage page draws the "orchestration" section
    And the manage page draws the "runlevel" section
    And the manage page draws the "database" section
    And the manage page draws no "network" section
    And the manage page draws no "storage" section
    And the manage page draws no "file-manager" section
    And the manage page draws no "installer-files" section
    And I see "Host actions"
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Manage: a virtualbox host that lists processes and machines alone draws those sections and no recipes, no runlevel
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws 3 sections
    And the manage page draws the "processes" section
    And the manage page draws the "orchestration" section
    And the manage page draws the "database" section
    And the manage page draws no "services" section
    And the manage page draws no "recipes" section
    And the manage page draws no "runlevel" section
    And the "processes" table of the manage page lists 2 rows
    And the "processes" table of the manage page draws no "zone" column
    And the host was not sent GET to "/api/agents/1/services"
    And the host was not sent GET to "/api/agents/1/system/host/runlevel"

  Scenario: Manage: the services over the one table, an action one request and one notice with the services read again, the details and the properties in list dialogs
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "services" table of the manage page lists 5 rows
    And the "services" table of the manage page draws the "state" column
    And the row "apache24" of the "services" table of the manage page offers "enable"
    And the row "apache24" of the "services" table of the manage page offers no "disable"
    And the row "ssh" of the "services" table of the manage page offers "disable"
    And the row "ssh" of the "services" table of the manage page offers "restart"
    And the row "S20sysetup" of the "services" table of the manage page offers no "properties"
    And the row "S20sysetup" of the "services" table of the manage page offers no "refresh"
    And the host was sent GET to "/api/agents/3/services" 1 times
    When I press "enable" on the row "apache24" of the "services" table of the manage page
    Then the host was sent POST to "/api/agents/3/services/action" carrying "action" as "enable"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/services" 2 times
    When I press "details" on the row "ssh" of the "services" table of the manage page
    Then the "service-details" dialog is open
    And the host was sent GET to "/api/agents/3/services/svc%3A%2Fnetwork%2Fssh%3Adefault" 1 times
    And I see "svc:/system/svc/restarter:default"
    When I press "Escape"
    And I press "properties" on the row "ssh" of the "services" table of the manage page
    Then the "service-properties" dialog is open
    And the open dialog lists 5 rows
    And the host was sent GET to "/api/agents/3/services/svc%3A%2Fnetwork%2Fssh%3Adefault/properties" 1 times

  Scenario: Manage: the one search narrows every table at once and a table it leaves no row of says so
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "services" table of the manage page lists 5 rows
    And the "processes" table of the manage page lists 4 rows
    When I press "Control+f"
    And I search the manage page for "cron"
    Then the "services" table of the manage page lists 1 rows
    And the "processes" table of the manage page says "filtered"
    And the "users" table of the manage page says "filtered"

  Scenario: Manage: the processes on zoneweaver-agent with their zone, the details with the files read as their tab opens, the kill and the batch kill each one request
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "processes" table of the manage page lists 4 rows
    And the "processes" table of the manage page draws the "zone" column
    And the "processes" table of the manage page draws the "cpu_percent" column
    And the "processes" table of the manage page draws the "rss" column
    When I press "details" on the row "bhyve" of the "processes" table of the manage page
    Then the "process-details" dialog is open
    And the host was sent GET to "/api/agents/3/system/processes/128" 1 times
    And the host was not sent GET to "/api/agents/3/system/processes/128/files"
    When I pick the dialog tab "files"
    Then the host was sent GET to "/api/agents/3/system/processes/128/files" 1 times
    And the open dialog lists 3 rows
    When I press "Escape"
    And I press "kill" on the row "bhyve" of the "processes" table of the manage page
    Then the "process-kill" dialog is open
    When I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/128/kill" carrying "force" as "false"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/processes" 2 times
    And no dialog is open
    When I press the manage page's "batch-kill" action
    Then the "process-batch-kill" dialog is open
    When I type "bhyve" into the field "batch-kill-pattern"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/batch-kill" carrying "pattern" as "bhyve"
    And the page raised 2 success notices

  Scenario: Manage: the signal dialog on a host whose platform is not Windows offers every signal
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "signal" on the row "bhyve" of the "processes" table of the manage page
    Then the "process-signal" dialog is open
    When I choose "HUP" in the field "signal-select"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/128/signal" carrying "signal" as "HUP"
    And no dialog is open

  Scenario: Manage: the users over the one table, the create, the edit, the password and the delete each one request, the low uids offered no lock and no delete
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "users" table of the manage page lists 3 rows
    And the row "root" of the "users" table of the manage page offers no "delete"
    And the row "root" of the "users" table of the manage page offers no "lock"
    And the row "deploy" of the "users" table of the manage page offers "delete"
    When I press the manage page's "user-create" action
    Then the "user-create" dialog is open
    When I type "ada" into the field "user-create-username"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/users" carrying "username" as "ada"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/users" 2 times
    And no dialog is open
    When I press "edit" on the row "mark" of the "users" table of the manage page
    Then the "user-edit" dialog is open
    And the host was sent GET to "/api/agents/3/system/users/mark/attributes" 1 times
    When I type "Ada L" into the field "user-edit-comment"
    And I send the open dialog
    Then the host was sent PUT to "/api/agents/3/system/users/mark" carrying "new_comment" as "Ada L"
    And no dialog is open
    When I press "password" on the row "mark" of the "users" table of the manage page
    Then the "user-password" dialog is open
    When I type "longenough" into the field "new-password-input"
    And I type "different" into the field "confirm-password-input"
    And I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/3/system/users/mark/password"
    When I type "longenough" into the field "confirm-password-input"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/users/mark/password" carrying "unlock_account" as "true"
    And no dialog is open
    When I press "delete" on the row "deploy" of the "users" table of the manage page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/users/deploy" 1 times

  Scenario: Manage: the user details in a list dialog over the attributes read once
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "details" on the row "mark" of the "users" table of the manage page
    Then the "user-details" dialog is open
    And the host was sent GET to "/api/agents/3/system/users/mark/attributes" 1 times
    And I see "solaris.zone.manage"

  Scenario: Manage: the groups and the roles each a tab of the one strip, the create and the delete one request each, a system group offered no delete
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I pick the tab "groups" of the manage page
    Then the "groups" table of the manage page lists 3 rows
    And the row "staff" of the "groups" table of the manage page offers no "delete"
    And the row "operators" of the "groups" table of the manage page offers "delete"
    When I press the manage page's "group-create" action
    Then the "group-create" dialog is open
    When I type "ops" into the field "group-name-input"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/groups" carrying "groupname" as "ops"
    And the host was sent GET to "/api/agents/3/system/groups" 2 times
    When I press "delete" on the row "operators" of the "groups" table of the manage page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/groups/operators" 1 times
    When I pick the tab "roles" of the manage page
    Then the "roles" table of the manage page lists 2 rows
    When I press the manage page's "role-create" action
    Then the "role-create" dialog is open
    When I type "dbadm" into the field "rolename"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/roles" carrying "comment" as "RBAC Role"
    When I press "delete" on the row "netadm" of the "roles" table of the manage page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/roles/netadm" 1 times

  Scenario: Manage: the RBAC discovery, its three lists each over the one table with Copy on every row
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I pick the tab "rbac" of the manage page
    Then the "rbac-authorizations" table of the manage page lists 3 rows
    And I see "solaris.zone.login"
    When I pick the tab "rbac-profiles" of the manage page
    Then the "rbac-profiles" table of the manage page lists 2 rows
    When I pick the tab "rbac-roles" of the manage page
    Then the "rbac-roles" table of the manage page lists 3 rows
    And the host was sent GET to "/api/agents/3/system/rbac/authorizations" 1 times
    And the host was sent GET to "/api/agents/3/system/rbac/profiles" 1 times
    And the host was sent GET to "/api/agents/3/system/rbac/roles" 1 times

  Scenario: Manage: the time synchronization status, the peers over the one table, a sync and a switch each behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "peers" table of the manage page lists 3 rows
    And the "peers" table of the manage page draws the "offset" column
    And I see "svc:/network/ntp:default"
    And the manage page draws the "time-systems" panel
    And the manage page offers "time-switch-chrony"
    And the manage page's "time-switch-ntp" action is held
    And the manage page's "time-switch-ntpsec" action is held
    When I press the manage page's "time-sync" action
    And I confirm the open dialog with "sync"
    Then the host was sent POST to "/api/agents/3/system/time-sync/sync" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/time-sync/status" 2 times
    When I press the manage page's "time-switch-chrony" action
    And I confirm the open dialog with "switch"
    Then the host was sent POST to "/api/agents/3/system/time-sync/switch" carrying "target_system" as "chrony"

  Scenario: Manage: the time synchronization configuration, a server added to the text and the save behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I pick the tab "config" of the manage page
    Then the host was sent GET to "/api/agents/3/system/time-sync/config" 1 times
    And I see "/etc/inet/ntp.conf"
    And the manage page notes no "unsaved"
    And the manage page's "time-save" action is held
    When I type "2.pool.ntp.org" into the manage field "time-config-server"
    And I press the manage page's "time-add-server" action
    Then the manage page notes "unsaved"
    When I press the manage page's "time-save" action
    And I confirm the open dialog with "save"
    Then the host was sent PUT to "/api/agents/3/system/time-sync/config" carrying "backup_existing" as "false"
    And the host was sent GET to "/api/agents/3/system/time-sync/config" 2 times

  Scenario: Manage: the time zone chosen among the ones the host answered and changed behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I pick the tab "timezone" of the manage page
    Then the host was sent GET to "/api/agents/3/system/timezones" 1 times
    And the manage page's "timezone-change" action is held
    When I choose "Europe/Berlin" in the manage field "timezone-select"
    Then the manage page notes "timezone-selected"
    When I press the manage page's "timezone-change" action
    And I confirm the open dialog with "timezone"
    Then the host was sent PUT to "/api/agents/3/system/timezone" carrying "timezone" as "Europe/Berlin"
    And the host was sent GET to "/api/agents/3/system/timezone" 2 times

  Scenario: Manage: the system updates, the check drawn with Install behind the typed confirmation and the history over the one table
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page notes "updates-available"
    And the manage page draws the "updates-plan" panel
    And the manage page notes no "disk-space"
    And the host was sent GET to "/api/agents/3/system/updates/check" 1 times
    When I press the manage page's "updates-install" action
    And I confirm the open dialog with "install"
    Then the host was sent POST to "/api/agents/3/system/updates/install" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/updates/check" 2 times
    When I pick the tab "history" of the manage page
    Then the "history" table of the manage page lists 2 rows
    And the "history" table of the manage page draws the "status" column

  Scenario: Manage: the orchestration, its status, the enable behind the typed confirmation, the dry run and a priority written to the machine
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page notes "orchestration"
    And the manage page draws the "boot-order" panel
    And the host was sent GET to "/api/agents/3/machines/priorities" 1 times
    When I press the manage page's "orchestration-plan" action
    Then the host was sent POST to "/api/agents/3/machines/orchestration/test" 1 times
    And the manage page draws the "orchestration-plan" panel
    When I press the manage page's "orchestration-toggle" action
    And I confirm the open dialog with "enable"
    Then the host was sent POST to "/api/agents/3/machines/orchestration/enable" 1 times
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 2 times
    When I type "90" into the manage field "boot-priority-db-1"
    And I press the manage page's "priority-save" action
    Then the host was sent PUT to "/api/agents/3/machines/db-1" carrying "boot_priority" as "90"
    And the host was sent GET to "/api/agents/3/machines/priorities" 2 times

  Scenario: Manage: the strategy is one merge patch of the machines configuration file at its leaf and the status read again
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page notes "orchestration"
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 1 times
    When I choose "sequential" in the manage field "orchestration-strategy"
    Then the host was sent PUT to "/api/agents/3/config/machines" carrying "sequential" at "/machines/orchestration/strategy"
    And the host was sent PUT to "/api/agents/3/config/machines" carrying nothing at "/machines/orchestration/enabled"
    And the host was not sent GET to "/api/agents/3/config/machines"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 2 times

  Scenario: Manage: the runlevel behind host-power, a change a queued task behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page notes "runlevel"
    And I see "3"
    And the manage page's "runlevel-change" action is held
    When I choose "s" in the manage field "runlevel-select"
    And I press the manage page's "runlevel-change" action
    And I confirm the open dialog with "runlevel"
    Then the host was sent POST to "/api/agents/3/system/host/runlevel" carrying "runlevel" as "s"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/host/runlevel" 2 times
    When I press the manage page's "runlevel-single" action
    And I confirm the open dialog with "runlevel"
    Then the host was sent POST to "/api/agents/3/system/host/single-user" carrying "confirm" as "true"

  Scenario: Manage: Refresh reads again every read of the page and its sections
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "services" table of the manage page lists 5 rows
    And the host was sent GET to "/api/agents/3/services" 1 times
    And the host was sent GET to "/api/agents/3/system/processes" 1 times
    And the host was sent GET to "/api/agents/3/system/users" 1 times
    And the host was sent GET to "/api/agents/3/system/time-sync/status" 1 times
    And the host was sent GET to "/api/agents/3/system/host/runlevel" 1 times
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/services" 2 times
    And the host was sent GET to "/api/agents/3/system/processes" 2 times
    And the host was sent GET to "/api/agents/3/system/users" 2 times
    And the host was sent GET to "/api/agents/3/system/time-sync/status" 2 times
    And the host was sent GET to "/api/agents/3/system/host/runlevel" 2 times
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 2 times

  Scenario: Manage: every section folds and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "services" table of the manage page lists 5 rows
    And the "services" section of the manage page is open
    When I fold the "services" section of the manage page
    And I fold the "processes" section of the manage page
    Then the "services" section of the manage page is folded
    And the "processes" section of the manage page is folded
    When I load the page again
    Then the "services" section of the manage page is folded
    And the "user-group" section of the manage page is open
    When I fold the "services" section of the manage page
    Then the "services" table of the manage page lists 5 rows

  Scenario: Manage: on the zoneweaver-agent role every read is sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/manage"
    Then the manage page draws its frame
    And the "services" table of the manage page lists 3 rows
    And the "processes" table of the manage page lists 2 rows
    And the "users" table of the manage page lists 2 rows
    And the "peers" table of the manage page lists 1 rows
    And the manage page notes "runlevel"
    And the host was sent GET to "/api/services"
    And the host was sent GET to "/api/system/processes"
    And the host was sent GET to "/api/system/users"
    And the host was sent GET to "/api/system/time-sync/status"
    And the host was sent GET to "/api/system/host/runlevel"
    And the host was not sent GET to "/api/agents/self/services"
