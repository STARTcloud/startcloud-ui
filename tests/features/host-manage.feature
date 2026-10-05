Feature: host-manage

  Scenario: System: a page behind its section's token, a host whose row lists it not draws the not-available stub and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/system/services"
    Then the section page draws the not-available stub
    And the host was not sent GET to "/api/agents/4/system/host/runlevel"
    And the host was not sent GET to "/api/agents/4/services"

  Scenario: System: a host the list of servers does not hold draws what the host page draws for it
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/system/services"
    Then the section route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/services"

  Scenario: System: the old Manage bodies are for an admin alone, hyperweaver-ui's gate, and ask nothing for another role
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"sam\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/services"
    Then the section page says an admin is required
    And the host was not sent GET to "/api/agents/3/services"
    When I open "/hosts/3/system/users"
    Then the section page says an admin is required
    And the host was not sent GET to "/api/agents/3/system/users"

  Scenario: System: every tab of hyperweaver-ui's Manage page is one row of the column under its group, each behind its token, in the column's order
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host column draws the groups "system, updates, provisioning, agent"
    And the host column draws the rows "overview, machines, services, processes, users, time, runlevel, packages, system-updates, recipes, provisioning-network, orchestration, api-keys, database, update"
    And the host column draws the "services" row to "/hosts/3/system/services"
    And the host column draws the "users" row to "/hosts/3/system/users"
    And the host column draws the "time" row to "/hosts/3/system/time"
    And the host column draws the "runlevel" row to "/hosts/3/system/runlevel"
    And the host column draws the "packages" row to "/hosts/3/updates/packages"
    And the host column draws the "system-updates" row to "/hosts/3/updates/system"
    And the host column draws the "recipes" row to "/hosts/3/provisioning/recipes"
    And the host column draws the "provisioning-network" row to "/hosts/3/provisioning/network"
    And the host column draws the "orchestration" row to "/hosts/3/provisioning/orchestration"
    And the host column draws the "database" row to "/hosts/3/agent/database"
    And the host column draws no "file-manager" row
    And the host column draws no "installers" row
    And the host column draws no "network" group
    And the host column draws no "storage" group
    And the host controls toggle is "Host actions"
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: System: a virtualbox host that lists processes and machines alone draws those rows and no recipes, no runlevel
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/system/processes"
    Then the host column draws the rows "overview, machines, processes, orchestration, api-keys, database, update"
    And the host column draws no "services" row
    And the host column draws no "recipes" row
    And the host column draws no "runlevel" row
    And the section page "processes" draws
    And the "processes" table of the section page lists 2 rows
    And the "processes" table of the section page draws no "zone" column
    And the host was not sent GET to "/api/agents/1/services"
    And the host was not sent GET to "/api/agents/1/system/host/runlevel"

  Scenario: Services: the one table as the page's body, an action one request and one notice with the services read again, the details and the properties in list dialogs
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/services"
    Then the section page "services" draws
    And the host row "services" is the active one
    And the "services" table of the section page lists 5 rows
    And the "services" table of the section page draws the "state" column
    And the row "apache24" of the "services" table of the section page offers "enable"
    And the row "apache24" of the "services" table of the section page offers no "disable"
    And the row "ssh" of the "services" table of the section page offers "disable"
    And the row "ssh" of the "services" table of the section page offers "restart"
    And the row "S20sysetup" of the "services" table of the section page offers no "properties"
    And the row "S20sysetup" of the "services" table of the section page offers no "refresh"
    And the host was sent GET to "/api/agents/3/services" 1 times
    And the host was not sent GET to "/api/agents/3/system/processes"
    And the host was not sent GET to "/api/agents/3/system/users"
    When I press "enable" on the row "apache24" of the "services" table of the section page
    Then the host was sent POST to "/api/agents/3/services/action" carrying "action" as "enable"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/services" 2 times
    When I press "details" on the row "ssh" of the "services" table of the section page
    Then the "service-details" dialog is open
    And the host was sent GET to "/api/agents/3/services/svc%3A%2Fnetwork%2Fssh%3Adefault" 1 times
    And I see "svc:/system/svc/restarter:default"
    When I press "Escape"
    And I press "properties" on the row "ssh" of the "services" table of the section page
    Then the "service-properties" dialog is open
    And the open dialog lists 5 rows
    And the host was sent GET to "/api/agents/3/services/svc%3A%2Fnetwork%2Fssh%3Adefault/properties" 1 times

  Scenario: System: the one search narrows the page's tables and a table it leaves no row of says so
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/services"
    Then the "services" table of the section page lists 5 rows
    When I press "Control+k"
    And I search the section page for "cron"
    Then the "services" table of the section page lists 1 rows
    When I open "/hosts/3/system/users"
    Then the "users" table of the section page lists 3 rows
    When I press "Control+k"
    And I search the section page for "cron"
    Then the "users" table of the section page says "filtered"
    When I pick the tab "groups" of the section page
    Then the "groups" table of the section page says "filtered"

  Scenario: Processes: on zoneweaver-agent with their zone, the details with the files read as their tab opens, the kill and the batch kill each one request
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/processes"
    Then the "processes" table of the section page lists 4 rows
    And the "processes" table of the section page draws the "zone" column
    And the "processes" table of the section page draws the "cpu_percent" column
    And the "processes" table of the section page draws the "rss" column
    When I press "details" on the row "bhyve" of the "processes" table of the section page
    Then the "process-details" dialog is open
    And the host was sent GET to "/api/agents/3/system/processes/128" 1 times
    And the host was not sent GET to "/api/agents/3/system/processes/128/files"
    When I pick the dialog tab "files"
    Then the host was sent GET to "/api/agents/3/system/processes/128/files" 1 times
    And the open dialog lists 3 rows
    When I press "Escape"
    And I press "kill" on the row "bhyve" of the "processes" table of the section page
    Then the "process-kill" dialog is open
    When I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/128/kill" carrying "force" as "false"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/processes" 2 times
    And no dialog is open
    When I dismiss the success notice
    And I press the section page's "batch-kill" action
    Then the "process-batch-kill" dialog is open
    When I type "bhyve" into the field "batch-kill-pattern"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/batch-kill" carrying "pattern" as "bhyve"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/processes" 3 times

  Scenario: Processes: the signal dialog on a host whose platform is not Windows offers every signal
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/processes"
    And I press "signal" on the row "bhyve" of the "processes" table of the section page
    Then the "process-signal" dialog is open
    When I choose "HUP" in the field "signal-select"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/processes/128/signal" carrying "signal" as "HUP"
    And no dialog is open

  Scenario: Users: the users over the one table, the create, the edit, the password and the delete each one request, the low uids offered no lock and no delete
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/users"
    Then the "users" table of the section page lists 3 rows
    And the row "root" of the "users" table of the section page offers no "delete"
    And the row "root" of the "users" table of the section page offers no "lock"
    And the row "deploy" of the "users" table of the section page offers "delete"
    When I press the section page's "user-create" action
    Then the "user-create" dialog is open
    When I type "ada" into the field "user-create-username"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/users" carrying "username" as "ada"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/users" 2 times
    And no dialog is open
    When I press "edit" on the row "mark" of the "users" table of the section page
    Then the "user-edit" dialog is open
    And the host was sent GET to "/api/agents/3/system/users/mark/attributes" 1 times
    When I type "Ada L" into the field "user-edit-comment"
    And I send the open dialog
    Then the host was sent PUT to "/api/agents/3/system/users/mark" carrying "new_comment" as "Ada L"
    And no dialog is open
    When I press "password" on the row "mark" of the "users" table of the section page
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
    When I press "delete" on the row "deploy" of the "users" table of the section page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/users/deploy" 1 times

  Scenario: Users: the user details in a list dialog over the attributes read once
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/users"
    And I press "details" on the row "mark" of the "users" table of the section page
    Then the "user-details" dialog is open
    And the host was sent GET to "/api/agents/3/system/users/mark/attributes" 1 times
    And I see "solaris.zone.manage"

  Scenario: Users: the groups and the roles each a tab of the one strip, the create and the delete one request each, a system group offered no delete
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the window is 1600 wide
    When I open "/hosts/3/system/users"
    And I pick the tab "groups" of the section page
    Then the "groups" table of the section page lists 3 rows
    And the row "staff" of the "groups" table of the section page offers no "delete"
    And the row "operators" of the "groups" table of the section page offers "delete"
    When I press the section page's "group-create" action
    Then the "group-create" dialog is open
    When I type "ops" into the field "group-name-input"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/groups" carrying "groupname" as "ops"
    And the host was sent GET to "/api/agents/3/system/groups" 2 times
    When I press "delete" on the row "operators" of the "groups" table of the section page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/groups/operators" 1 times
    When I pick the tab "roles" of the section page
    Then the "roles" table of the section page lists 2 rows
    When I press the section page's "role-create" action
    Then the "role-create" dialog is open
    When I type "dbadm" into the field "rolename"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/3/system/roles" carrying "comment" as "RBAC Role"
    When I press "delete" on the row "netadm" of the "roles" table of the section page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/roles/netadm" 1 times

  Scenario: Users: the RBAC discovery, its three lists each over the one table with Copy on every row
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/users"
    And I pick the tab "rbac" of the section page
    Then the "rbac-authorizations" table of the section page lists 3 rows
    And I see "solaris.zone.login"
    When I pick the tab "rbac-profiles" of the section page
    Then the "rbac-profiles" table of the section page lists 2 rows
    When I pick the tab "rbac-roles" of the section page
    Then the "rbac-roles" table of the section page lists 3 rows
    And the host was sent GET to "/api/agents/3/system/rbac/authorizations" 1 times
    And the host was sent GET to "/api/agents/3/system/rbac/profiles" 1 times
    And the host was sent GET to "/api/agents/3/system/rbac/roles" 1 times

  Scenario: Time: the time synchronization status, the peers over the one table, a sync and a switch each behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/time"
    Then the "peers" table of the section page lists 3 rows
    And the "peers" table of the section page draws the "offset" column
    And I see "svc:/network/ntp:default"
    And the section page draws the "time-systems" panel
    And the section page offers "time-switch-chrony"
    And the section page's "time-switch-ntp" action is held
    And the section page's "time-switch-ntpsec" action is held
    When I press the section page's "time-sync" action
    And I confirm the open dialog with "sync"
    Then the host was sent POST to "/api/agents/3/system/time-sync/sync" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/time-sync/status" 2 times
    When I press the section page's "time-switch-chrony" action
    And I confirm the open dialog with "switch"
    Then the host was sent POST to "/api/agents/3/system/time-sync/switch" carrying "target_system" as "chrony"

  Scenario: Time: the time synchronization configuration, a server added to the text and the save behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/time"
    And I pick the tab "config" of the section page
    Then the host was sent GET to "/api/agents/3/system/time-sync/config" 1 times
    And I see "/etc/inet/ntp.conf"
    And the section page notes no "unsaved"
    And the section page's "time-save" action is held
    When I type "2.pool.ntp.org" into the section field "time-config-server"
    And I press the section page's "time-add-server" action
    Then the section page notes "unsaved"
    When I press the section page's "time-save" action
    And I confirm the open dialog with "save"
    Then the host was sent PUT to "/api/agents/3/system/time-sync/config" carrying "backup_existing" as "false"
    And the host was sent GET to "/api/agents/3/system/time-sync/config" 2 times

  Scenario: Time: the time zone chosen among the ones the host answered and changed behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/time"
    And I pick the tab "timezone" of the section page
    Then the host was sent GET to "/api/agents/3/system/timezones" 1 times
    And the section page's "timezone-change" action is held
    When I choose "Europe/Berlin" in the section field "timezone-select"
    Then the section page notes "timezone-selected"
    When I press the section page's "timezone-change" action
    And I confirm the open dialog with "timezone"
    Then the host was sent PUT to "/api/agents/3/system/timezone" carrying "timezone" as "Europe/Berlin"
    And the host was sent GET to "/api/agents/3/system/timezone" 2 times

  Scenario: Updates: the system updates, the check drawn with Install behind the typed confirmation and the history over the one table
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/system"
    Then the section page "system-updates" draws
    And the section page notes "updates-available"
    And the section page draws the "updates-plan" panel
    And the section page notes no "disk-space"
    And the host was sent GET to "/api/agents/3/system/updates/check" 1 times
    When I press the section page's "updates-install" action
    And I confirm the open dialog with "install"
    Then the host was sent POST to "/api/agents/3/system/updates/install" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/updates/check" 2 times
    When I pick the tab "history" of the section page
    Then the "history" table of the section page lists 2 rows
    And the "history" table of the section page draws the "status" column

  Scenario: Provisioning: the orchestration, its status, the enable behind the typed confirmation, the dry run and a priority written to the machine
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/orchestration"
    Then the section page notes "orchestration"
    And the section page draws the "boot-order" panel
    And the host was sent GET to "/api/agents/3/machines/priorities" 1 times
    When I press the section page's "orchestration-plan" action
    Then the host was sent POST to "/api/agents/3/machines/orchestration/test" 1 times
    And the section page draws the "orchestration-plan" panel
    When I press the section page's "orchestration-toggle" action
    And I confirm the open dialog with "enable"
    Then the host was sent POST to "/api/agents/3/machines/orchestration/enable" 1 times
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 2 times
    When I type "90" into the section field "boot-priority-db-1"
    And I press the section page's "priority-save" action
    Then the host was sent PUT to "/api/agents/3/machines/db-1" carrying "boot_priority" as "90"
    And the host was sent GET to "/api/agents/3/machines/priorities" 2 times

  Scenario: Provisioning: the strategy is one merge patch of the machines configuration file at its leaf and the status read again
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/orchestration"
    Then the section page notes "orchestration"
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 1 times
    When I choose "sequential" in the section field "orchestration-strategy"
    Then the host was sent PUT to "/api/agents/3/config/machines" carrying "sequential" at "/machines/orchestration/strategy"
    And the host was sent PUT to "/api/agents/3/config/machines" carrying nothing at "/machines/orchestration/enabled"
    And the host was not sent GET to "/api/agents/3/config/machines"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/machines/orchestration/status" 2 times

  Scenario: System: the runlevel behind runlevel, a change a queued task behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/runlevel"
    Then the section page notes "runlevel"
    And I see "3"
    And the section page's "runlevel-change" action is held
    When I choose "s" in the section field "runlevel-select"
    And I press the section page's "runlevel-change" action
    And I confirm the open dialog with "runlevel"
    Then the host was sent POST to "/api/agents/3/system/host/runlevel" carrying "runlevel" as "s"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/host/runlevel" 2 times
    When I press the section page's "runlevel-single" action
    And I confirm the open dialog with "runlevel"
    Then the host was sent POST to "/api/agents/3/system/host/single-user" carrying "confirm" as "true"

  Scenario: System: Refresh reads again the list of servers, the host's stats and every read of the page, the other pages' reads untouched
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/services"
    Then the "services" table of the section page lists 5 rows
    And the host was sent GET to "/api/servers" 1 times
    And the host was sent GET to "/api/agents/3/stats" 1 times
    And the host was sent GET to "/api/agents/3/services" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/servers" 2 times
    And the host was sent GET to "/api/agents/3/stats" 2 times
    And the host was sent GET to "/api/agents/3/services" 2 times
    And the host was not sent GET to "/api/agents/3/system/processes"
    And the host was not sent GET to "/api/agents/3/system/host/runlevel"
    When I open "/hosts/3/system/time"
    Then the host was sent GET to "/api/agents/3/system/time-sync/status" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/time-sync/status" 2 times

  Scenario: System: the section page draws no fold of its own, the column's group folds and the fold is kept over a reload
    Given the host answers the hosts fixture
    And the host answers the hosts-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/services"
    Then the "services" table of the section page lists 5 rows
    And the section page draws no folding section
    And the host group "system" is open
    And the host group "updates" is open
    When I fold the host group "updates"
    And I fold the host group "provisioning"
    Then the host group "updates" is folded
    And the host group "provisioning" is folded
    And the host group "system" is open
    When I load the page again
    Then the "services" table of the section page lists 5 rows
    And the host group "updates" is folded
    And the host group "provisioning" is folded
    And the host group "system" is open
    When I fold the host group "updates"
    Then the host group "updates" is open
    And the host column draws the "packages" row to "/hosts/3/updates/packages"

  Scenario: System: on the zoneweaver-agent role every read is sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-manage fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/system/services"
    Then the section page "services" draws
    And the "services" table of the section page lists 3 rows
    And the host was sent GET to "/api/services"
    And the host was not sent GET to "/api/agents/self/services"
    When I follow the host row "processes"
    Then the "processes" table of the section page lists 2 rows
    And the host was sent GET to "/api/system/processes"
    When I follow the host row "users"
    Then the "users" table of the section page lists 2 rows
    And the host was sent GET to "/api/system/users"
    When I follow the host row "time"
    Then the "peers" table of the section page lists 1 rows
    And the host was sent GET to "/api/system/time-sync/status"
    When I follow the host row "runlevel"
    Then the section page notes "runlevel"
    And the host was sent GET to "/api/system/host/runlevel"
