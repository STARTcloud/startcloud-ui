Feature: hosts

  Scenario: The Hosts group draws one node per agent of GET /api/servers on the hyperweaver-server role
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    And the host was sent GET to "/api/servers"

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

  Scenario: The user menu draws at the sidebar's foot while the Controls menu holds the account slot
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    Then I see "Host actions"
    And the sidebar foot holds the account menu
