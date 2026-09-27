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

  Scenario: The user menu draws at the sidebar's foot while the Controls menu holds the account slot
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then I see "Host actions"
    And the sidebar foot holds the account menu

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

  Scenario: Refresh beside the tasks tools reads the tasks again
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I press the footer's "tasks" toggle
    Then the tasks pane lists 3 tasks
    And the host was sent GET to "/api/agents/1/tasks" 1 times
    When I press the footer's "refresh" tool
    Then the host was sent GET to "/api/agents/1/tasks" 2 times

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
