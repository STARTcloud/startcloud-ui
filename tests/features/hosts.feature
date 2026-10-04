Feature: hosts

  Scenario: The Hosts group draws one node per agent of GET /api/servers on the hyperweaver-server role
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And the host was sent GET to "/api/servers"

  Scenario: Every surface shares one read of GET /api/servers and Refresh on the hosts page reads it again
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And the host was sent GET to "/api/servers" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/servers" 2 times

  Scenario: Expanding a host reads its stats through /api/agents/{id}/stats and lists its machines
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then I see "dev-1"
    And I see "dev-2"
    And the host was sent GET to "/api/agents/1/stats"

  Scenario: An agent role draws the one serving agent and reads /api/stats at its own origin
    Given the host answers the agent fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then I see "lab-1"
    And the host was sent GET to "/api/stats"
    And the host was not sent GET to "/api/agents/self/stats"

  Scenario: The Controls menu takes the account slot on a machine route and Power on posts to the agent
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    And I click "Machine controls"
    And I click "Power on"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/start"
    And I see "dev-2 is starting."

  Scenario: One read of a host's stats serves the page, the Controls menu and the tree, and an action reads it once more
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    Then I see "Machine controls"
    And the host was sent GET to "/api/agents/1/stats" 1 times
    When I click "Machine controls"
    And I click "Power on"
    Then I see "dev-2 is starting."
    And the host was sent GET to "/api/agents/1/stats" 2 times

  Scenario: Controls menu: Suspend draws while the host's row lists machine-suspend, one request and one notice
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I click "Suspend"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/suspend"
    And I see "dev-1 is suspending."

  Scenario: Controls menu: Pause draws on a host that names virtualbox and the machine's own row is read from GET machines
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I click "Pause"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/pause"
    And the host was sent GET to "/api/agents/1/machines"
    And I see "dev-1 is pausing."

  Scenario: Controls menu: Inject NMI sends POST machines/{name}/nmi
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I click "Inject NMI"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/nmi"
    And I see "The interrupt was sent to dev-1."

  Scenario: Controls menu: Guest shutdown sends the guest agent's powerdown
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    And I click "Guest shutdown"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/guest/shutdown" carrying "mode" as "powerdown"
    And I see "The guest of dev-1 was asked to shut down."

  Scenario: Controls menu: a host that lists host-launchers draws one Open in application row per application
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then I see "Open in application"
    And the host was sent GET to "/api/agents/1/applications"
    When I click "putty"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/applications/putty/launch"
    And I see "putty was opened for dev-1."

  Scenario: Controls menu: a VirtualBox host draws no zone lifecycle rows
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I click "Machine controls"
    Then I see "Inject NMI"
    And I do not see "Zone lifecycle"

  Scenario: Controls menu: the zone lifecycle draws on a bhyve host and Verify draws its verdict and output
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2"
    And I click "Zone controls"
    Then I see "Zone lifecycle"
    And I do not see "Pause"
    When I click "Verify config"
    Then the host was sent POST to "/api/machines/web-2/verify"
    And I see "Configuration INVALID"
    And I see "could not verify zonepath /zones/web-2"

  Scenario: Controls menu: Attach collects update and force, then sends one request
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2"
    And I click "Zone controls"
    And I click "Attach"
    And I click "Attach"
    Then the host was sent POST to "/api/machines/web-2/attach" carrying "force" as "false"
    And I see "web-2 is attaching."

  Scenario: Controls menu: Move collects the absolute path and sends it as target_path
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2"
    And I click "Zone controls"
    And I click "Move zonepath"
    And I fill "New zonepath (absolute)" with "/rpool/zones/new-home"
    And I click "Move"
    Then the host was sent POST to "/api/machines/web-2/move" carrying "target_path" as "/rpool/zones/new-home"
    And I see "web-2 is moving."

  Scenario: Controls menu: a suspended machine draws no Resume on a host that lists no machine-resume-suspended, Power on its way back
    Given the host answers the zones fixture
    And the host answers the zones-suspended fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2"
    And I click "Zone controls"
    Then I see "Power on"
    And I do not see "Resume"

  Scenario: Controls menu: a suspended machine draws Resume on a host that lists machine-resume-suspended, one request
    Given the host answers the zones fixture
    And the host answers the zones-suspended fixture
    And the host answers the zones-tokens fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-2"
    And I click "Zone controls"
    And I click "Resume"
    Then the host was sent POST to "/api/machines/web-2/resume"

  Scenario: Controls menu: Restart host offers no fast reboot on a host that lists no host-fast-reboot
    Given the host answers the zones fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    And I click "Host actions"
    And I click "Restart host"
    Then the restart dialog offers no fast reboot

  Scenario: Controls menu: Restart host offers the fast reboot on a host that lists host-fast-reboot
    Given the host answers the zones fixture
    And the host answers the zones-tokens fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    And I click "Host actions"
    And I click "Restart host"
    Then the restart dialog offers the fast reboot

  Scenario: Controls menu: the bulk rows on a host's route pick the stopped machines for a start and send one request per target
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I click "Host actions"
    Then I see "Bulk machine actions"
    When I click "Start machines"
    And I click "Start machines"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/start"
    And the host was not sent POST to "/api/agents/1/machines/dev-1/start"
    And I see "Start machines: 1 sent, 0 failed."

  Scenario: Controls menu: the bulk rows on the home route act across all hosts
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    And I click "Bulk actions"
    Then I see "Across all hosts"
    When I click "Shutdown machines"
    And I click "Shutdown machines"
    Then the host was sent POST to "/api/agents/1/machines/dev-1/stop"
    And I see "Shutdown machines: 1 sent, 0 failed."

  Scenario: Sidebar tree: a machine node's right-click menu powers a stopped machine on with one request
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    And I click "Power on"
    Then the host was sent POST to "/api/agents/1/machines/dev-2/start"
    And I see "dev-2 is starting."

  Scenario: Sidebar tree: Destroy from a machine node's menu collects its options behind the typed confirmation
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    And I click "Destroy"
    And I click "Continue"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/machines/dev-2"
    And I see "dev-2 was destroyed."

  Scenario: Sidebar tree: a host node's menu draws no power rows while the host lists no host-power
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "Desk"
    Then I see "Open"
    And I do not see "Restart host"

  Scenario: Sidebar tree: a person without a role that may destroy reads no Destroy row
    Given the host answers the hosts fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    And I right-click the tree node "dev-2"
    Then I see "Power on"
    And I do not see "Destroy"

  Scenario: Sidebar: the Hosts group draws above the Account group
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And the sidebar draws "Datacenter" above "Profile"

  Scenario: Sidebar tree: the server role draws the Datacenter root at / above the hosts, each host indented under it
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the sidebar draws "Datacenter" above "Desk"
    And the tree node "Desk" begins where the label of "Datacenter" begins
    And the chrome draws no sidebar row "Hosts"
    When I open the tree node "Datacenter"
    Then the path is "/"
    And I see "Desk"

  Scenario: Sidebar tree: a host node draws no status dot while a machine row draws one
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then I see "dev-1"
    And the tree node "Desk" draws no status dot
    And the tree node "dev-1" draws a status dot

  Scenario: Sidebar tree: the pages of a host are no rows of the tree and stay one right-click away
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the tree lists no row "Overview" under the tree node "Desk"
    And the tree lists the row "dev-2" under the tree node "Desk"
    When I right-click the tree node "Desk"
    Then the tree menu offers "overview"
    And the tree menu offers "machines"
    And the tree menu offers "api-keys"
    And the tree menu offers "update"

  Scenario: Sidebar tree: the Configuration node under a host lists its files by title and opens the file on the shared engine over the host's proxy
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then the tree lists the row "Configuration" under the tree node "Desk"
    When I open the tree node "Configuration"
    Then the tree lists the row "Machines" under the tree node "Configuration"
    And the tree lists the row "Application" under the tree node "Configuration"
    And the tree lists the row "Storage" under the tree node "Configuration"
    And the host was sent GET to "/api/agents/1/config/machines/schema" 1 times
    When I follow the tree row "Machines" under the tree node "Configuration"
    Then the path is "/hosts/1/agent/config/machines"
    And the host row "config:machines" is the active one
    And the host column draws the "config:app" row to "/hosts/1/agent/config/app"
    And the host group "agent" is open
    And I see "Schema version 1"
    And the control "Base directory" has the value "/var/lib/machines"
    And the host was sent GET to "/api/agents/1/config/machines" 1 times
    And the host was sent GET to "/api/agents/1/config/machines/schema" 1 times
    And the host was sent GET to "/api/agents/1/config/restart-status" 1 times
    And the host was not sent GET to "/api/config/machines"
    When I fill "Base directory" with "/srv/machines"
    And I click "Update Configuration"
    Then I see "Configuration updated successfully."
    And the host was sent PUT to "/api/agents/1/config/machines" carrying "/srv/machines" at "/machines/base_directory"
    And the host was sent PUT to "/api/agents/1/config/machines" carrying nothing at "/machines/default_memory_mb"
    And the host was sent GET to "/api/agents/1/config/machines" 2 times

  Scenario: Registry: the hosts page draws the registry's columns and Add host for a super-admin, Test connection and Add send the registry's writes
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And the hosts table draws the "apiKey" column
    And the hosts page draws no registry form
    When I click "Add a host"
    Then the hosts page draws the registry form
    When I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the host was sent POST to "/api/servers/test" carrying "hostname" as "agent-7.example.com"
    When I click "Bootstrap Server"
    Then the host was sent POST to "/api/servers" carrying "hostname" as "agent-7.example.com"
    And the host was sent POST to "/api/servers" carrying "port" as "5001"
    And the host was sent POST to "/api/servers" carrying "protocol" as "https"
    And the host was sent POST to "/api/servers" carrying "entityName" as "Hyperweaver-Production"
    And the hosts page draws no registry form

  Scenario: Registry: /?add=host arrives with the form open and the query dropped
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    Then the hosts page draws the registry form
    And the path is "/"

  Scenario: Registry: a person without a role that may manage settings reads no Add host and no registry column
    Given the host answers the hosts fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And I do not see "Add a host"
    And the hosts table draws no "apiKey" column
    And the hosts page draws no registry form

  Scenario: Registry: the Datacenter root's right-click Add host lands on / with the form open
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I right-click the tree node "Datacenter"
    And I click "Add a host"
    Then the hosts page draws the registry form
    And the path is "/"

  Scenario: Sidebar tree: a machine's row begins where its host's label begins
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-1"
    Then I see "dev-1"
    And the tree node "dev-1" begins where the label of "Desk" begins

  Scenario: The user menu draws at the sidebar's foot while the Controls menu holds the account slot
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then I see "Host actions"
    And the sidebar foot holds the account menu
    And the sidebar foot draws the avatar before the name

  Scenario: App section: the utility rows by `links`, on the server role `links.api` draws Server API and on a host's route Agent API after it, each in a new tab
    Given the host answers the hosts fixture
    And the host answers the hosts-links fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I open the account menu
    Then the link "Server API" opens "/api-docs"
    And the link "Server API" opens in a new tab
    And the link "Agent API" opens "/agent/api-docs?server=1"
    And the link "Agent API" opens in a new tab

  Scenario: App section: the utility rows by `links`, on the server role with no host in the route Server API draws alone
    Given the host answers the hosts fixture
    And the host answers the hosts-links fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the account menu
    Then the link "Server API" opens "/api-docs"
    And I do not see "Agent API"

  Scenario: App section: the utility rows by `links`, on an agent role `links.api` draws the one API reference row in a new tab
    Given the host answers the agent fixture
    And the host answers the agent-links fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    And I open the account menu
    Then the link "API reference" opens "/api-docs"
    And the link "API reference" opens in a new tab
    And I do not see "Agent API"

  Scenario: App section: the utility rows by `links`, an empty `links.api` draws no API reference row
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I open the account menu
    Then I do not see "API reference"
    And I do not see "Server API"
    And I do not see "Agent API"

  Scenario: The footer's name and year are one link to /about
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the footer's name links to "/about"

  Scenario: On a host's route the Tasks toggle opens the pane over /api/agents/{id}/tasks and the Shell toggle draws behind host-terminal
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the footer holds the "shell" toggle
    When I press the footer's "tasks" toggle
    Then the host was sent GET to "/api/agents/1/tasks"
    And the tasks pane lists 3 tasks

  Scenario: With no saved view the chevron opens the pane on Tasks
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the footer holds the "shell" toggle
    When I press the footer's "chevron" toggle
    Then the tasks pane lists 3 tasks

  Scenario: Refresh beside the tasks tools reads the tasks again
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the host was sent GET to "/api/agents/1/tasks" 1 times
    When I press the footer's "refresh" tool
    Then the host was sent GET to "/api/agents/1/tasks" 2 times

  Scenario: The footer's top edge, dragged up, opens the pane from closed at the dragged height
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "footer_view" as "tasks"
    When I open "/hosts/1"
    Then the footer holds the "tasks" toggle
    When I drag the footer's top edge 200 up
    Then the pane is 200 high
    And the tasks pane lists 3 tasks

  Scenario: The footer's corner sets the sidebar's width and the pane's height in one drag
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "footer_view" as "tasks"
    When I open "/hosts/1"
    Then the footer holds the "tasks" toggle
    When I drag the footer's corner 40 right and 200 up
    Then the sidebar is 300 wide
    And the pane is 200 high

  Scenario: A task-updated event of the tasks topic moves the row in the tasks pane by push
    Given the host answers the hosts fixture
    And the host answers the hosts-events fixture
    And the stream answers the task-updated frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And I see "cancelled"
    And the stream was requested with "topics" as "tasks,hosts"

  Scenario: The priority filter reads the tasks again with the floor as min_priority
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the host was asked "/api/agents/1/tasks" with "min_priority" as "40"
    When I pick the priority floor 60
    Then the host was asked "/api/agents/1/tasks" with "min_priority" as "60"

  Scenario: A task row opens the task dialog over GET /api/tasks/{id} and its output
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    And I open the task of "dev-2"
    Then the host was sent GET to "/api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f"
    And the host was sent GET to "/api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f/output"
    And I see "Booting dev-2"

  Scenario: Cancel task sends DELETE /api/tasks/{id} behind a confirmation
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    And I open the task of "dev-2"
    And I click "Cancel task"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f"

  Scenario: With no host in the route the server role draws every host's tasks under a Host column and no Shell toggle
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the footer holds no "shell" toggle
    When I press the footer's "tasks" toggle
    Then the host was sent GET to "/api/agents/1/tasks"
    And the tasks pane draws the "host" column
    And the tasks pane lists 3 tasks

  Scenario: Organization filter: with nothing stored the choice is All organizations, every host and machine draws and no machine row is asked for
    Given the host answers the hosts fixture
    And the host answers the hosts-orgs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/2"
    Then I see "Desk"
    And I see "Store"
    And I see "web-2"
    And I see "web-4"
    And the host was sent GET to "/api/agents/2/stats"
    And the host was not sent GET to "/api/agents/2/machines"

  Scenario: Organization filter: the org row draws at one membership and reads All organizations while that is the choice
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the account menu
    And I click "All organizations"
    Then I see "Switch Organization"
    And I see "Acme"

  Scenario: Organization filter: picking an organization narrows the hosts to the ones it owns and the unassigned ones, the path and the list of servers as they were
    Given the host answers the hosts fixture
    And the host answers the hosts-orgs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    When I open the account menu
    And I click "All organizations"
    And I click "Prominic"
    Then I see "Lab"
    And I see "Store"
    And I do not see "Desk"
    And the path is "/"
    And the host was sent GET to "/api/servers" 1 times

  Scenario: Organization filter: a host's machines narrow to the stored choice, a name without a row and a row with an empty list still drawn
    Given the host answers the hosts fixture
    And the host answers the hosts-orgs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622"
    When I open "/hosts/2/machines/web-1"
    Then I see "web-3"
    And I see "web-4"
    And I do not see "web-2"
    And I do not see "Desk"
    And the host was sent GET to "/api/agents/2/machines"

  Scenario: Organization filter: a host outside the stored choice draws whole on its own route, its label and its Controls menu as under All organizations
    Given the host answers the hosts fixture
    And the host answers the hosts-orgs fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/hosts/2"
    Then I see "Lab"
    And I see "Desk"
    When I click "Host actions"
    Then I see "Bulk machine actions"

  Scenario: Host overview: the panels by the host's tokens, a host that lists monitoring, tasks, swap and provisioning draws each panel from one read
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host page draws the "system-info" panel
    And the host page draws the "resources" panel
    And the host page draws the "interfaces" panel
    And the host page draws the "performance" panel
    And I see "Windows_NT 10.0.19045"
    And I see "Ethernet"
    And I see "healthy"
    And I see "vagrant"
    And the host was sent GET to "/api/agents/1/monitoring/status" 1 times
    And the host was sent GET to "/api/agents/1/monitoring/health" 1 times
    And the host was sent GET to "/api/agents/1/tasks/stats" 1 times
    And the host was sent GET to "/api/agents/1/system/swap/summary" 1 times
    And the host was sent GET to "/api/agents/1/provisioning/status" 1 times

  Scenario: Host overview: the monitoring ones behind `monitoring`, a host without it draws the overview card alone and asks no monitoring route
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host page draws the "system-info" panel
    And the host page draws the "resources" panel
    And the host page draws no "interfaces" panel
    And the host page draws no "performance" panel
    And the host was sent GET to "/api/agents/1/tasks/stats"
    And the host was not sent GET to "/api/agents/1/monitoring/status"
    And the host was not sent GET to "/api/agents/1/monitoring/system/cpu"
    And the host was not sent GET to "/api/agents/1/system/swap/summary"

  Scenario: Host overview: the ZFS ones behind `zfs` too, a host without it draws no storage summary and no pool or ARC chart and asks for neither
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host page draws the "cpu" chart
    And the host page draws the "network" chart
    And the host page draws the "memory" chart
    And the host page draws no "storage" panel
    And the host page draws no "pool-io" chart
    And the host page draws no "arc" chart
    And the host was not sent GET to "/api/agents/1/monitoring/storage/pools"
    And the host was not sent GET to "/api/agents/1/monitoring/storage/arc"

  Scenario: Host overview: the ZFS ones behind `zfs` too, a host that lists it draws the storage summary and the pool and ARC charts
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "storage" panel
    And the host page draws the "database" panel
    And the host page draws the "pool-io" chart
    And the host page draws the "arc" chart
    And the host was sent GET to "/api/agents/3/monitoring/storage/pools" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/datasets" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/pool-io" 1 times

  Scenario: Host overview: every interface is listed once, the newest row of each where the agent answers the rows of several scans
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then I see "vnic0"
    And the interfaces table lists 3 interfaces

  Scenario: Host overview: every answer and series one copy per host, the bar and the chart share one read and Refresh reads each again
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "cpu" chart
    And the host page draws the "arc" chart
    And the host was sent GET to "/api/agents/3/monitoring/system/cpu" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/system/memory" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/arc" 1 times
    And the host was sent GET to "/api/agents/3/monitoring/status" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/monitoring/system/cpu" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/storage/arc" 2 times
    And the host was sent GET to "/api/agents/3/monitoring/status" 2 times

  Scenario: Host overview: the charts read their history over the window and at the resolution, a change of either reading it again once
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3"
    Then the host page draws the "cpu" chart
    And the host was asked "/api/agents/3/monitoring/system/cpu" with "limit" as "38"
    And the host was asked "/api/agents/3/monitoring/system/cpu" with "include_cores" as "true"
    And the host was asked "/api/agents/3/monitoring/network/usage" with "per_interface" as "true"
    When I pick the chart resolution "low"
    Then the host was asked "/api/agents/3/monitoring/system/cpu" with "limit" as "5"
    And the host was sent GET to "/api/agents/3/monitoring/system/cpu" 2 times
    When I pick the chart window "1hour"
    Then the host was sent GET to "/api/agents/3/monitoring/system/cpu" 3 times

  Scenario: Host overview: an agent that keeps no history draws the one sample it read and says so, an agent that keeps one draws its history
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host page draws the "cpu" chart
    And the "cpu" chart says it draws one sample
    When I open "/hosts/3"
    Then the host page draws the "cpu" chart
    And the "cpu" chart says nothing of one sample

  Scenario: Host overview: the charts on the one `Chart` growing by the `monitoring` topic, a cpu-sample event adds to the series and nothing is read again
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the host answers the hosts-overview-events fixture
    And the stream answers the monitoring frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then the host page draws the "cpu" chart
    And the "cpu" chart says nothing of one sample
    And the stream was requested with "topics" as "tasks,hosts,monitoring"

  Scenario: Host overview: a card's buttons show and hide the groups of its series, the load averages hidden until asked for
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "cpu" chart
    And the "overall" series of the "cpu" chart is shown
    And the "load" series of the "cpu" chart is hidden
    When I toggle the "load" series of the "cpu" chart
    Then the "load" series of the "cpu" chart is shown

  Scenario: Host overview: the expand button opens the chart in the expanded dialog, the groups hidden in one hidden in the other
    Given the host answers the hosts fixture
    And the host answers the hosts-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3"
    Then the host page draws the "cpu" chart
    When I toggle the "cores" series of the "cpu" chart
    And I expand the "cpu" chart
    Then the expanded chart draws
    And the "cores" series of the expanded chart is hidden
    And the "overall" series of the expanded chart is shown

  Scenario: Error page: a failed browser navigation the backend answered with index.html and the stamped fault draws the error page on a backend host
    Given the host answers the hosts fixture
    And the served page carries "data-error-status" as "404"
    And the served page carries "data-error-reference" as "0123456789abcdef"
    And the served page carries "data-error-path" as "/api/organization/acme/box/web/version/1.0.0/provider/virtualbox/architecture/amd64/file/download"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/organization/acme/box/web/version/1.0.0/provider/virtualbox/architecture/amd64/file/download"
    Then I see "Page not found"
    And I see "0123456789abcdef"
    And I see "Go home"
    And I see "Copy error details"
    And the host was not sent GET to "/api/admin/errors/0123456789abcdef"

  Scenario: Error page: /error after a 303 reads the fault from the URL on a backend host
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/error?status=403&reference=fedcba9876543210&path=%2Fapi%2Fdownload"
    Then I see "You don't have access to this page"
    And I see "fedcba9876543210"

  Scenario: Error page: an unknown route with no stamped fault still goes home on a backend host
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/no-such-page"
    Then the path is "/"

  Scenario: Host overview: on an agent role every read is sent at the agent's own /api path
    Given the host answers the agent fixture
    And the host answers the agent-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self"
    Then the host page draws the "interfaces" panel
    And the host page draws the "database" panel
    And the host page draws the "cpu" chart
    And I see "eth0"
    And the host was sent GET to "/api/monitoring/status"
    And the host was sent GET to "/api/monitoring/system/cpu"
    And the host was not sent GET to "/api/agents/self/monitoring/status"
