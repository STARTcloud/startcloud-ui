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
