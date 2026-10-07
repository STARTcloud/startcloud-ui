Feature: dashboard

  Scenario: Dashboard: the home of an agent role, the summary tiles, the quick actions and the host card over the stats and the health the hosts feature holds, each read once, no topology on an agent
    Given the host answers the agent fixture
    And the host answers the agent-dashboard fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the dashboard draws its frame
    And the dashboard draws the "summary" widget
    And the dashboard draws the "quickActions" widget
    And the dashboard draws the "serverCards" widget
    And the dashboard draws no "topology" widget
    And the dashboard tile "servers" reads "1"
    And the dashboard tile "machines" reads "2"
    And the dashboard tile "memory" reads "50%"
    And the dashboard tile "health" reads "1"
    And the dashboard draws the host card "self" as "healthy"
    And the dashboard offers "manage-machines"
    And the dashboard offers "settings"
    And the dashboard offers no "add-host"
    And the host was sent GET to "/api/stats" 1 times
    And the host was sent GET to "/api/monitoring/health" 1 times
    And the page draws no key under "dashboard"
    When I press the dashboard action "view-host"
    Then the path is "/hosts/self"

  Scenario: Dashboard: Settings opens the agent's API keys page, the first of its Agent group, on an agent role and Manage machines the machines of the host
    Given the host answers the agent fixture
    And the host answers the agent-dashboard fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    And I press the dashboard action "settings"
    Then the path is "/hosts/self/agent/api-keys"
    When I open "/"
    And I press the dashboard action "manage-machines"
    Then the path is "/hosts/self/machines"

  Scenario: Dashboard: a widget hidden from the menu stays hidden over a reload and returns from the menu
    Given the host answers the agent fixture
    And the host answers the agent-dashboard fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the dashboard draws the "quickActions" widget
    When I toggle the dashboard widget "quickActions"
    Then the dashboard draws no "quickActions" widget
    And the dashboard draws the "summary" widget
    When I load the page again
    Then the dashboard draws its frame
    And the dashboard draws no "quickActions" widget
    When I toggle the dashboard widget "quickActions"
    Then the dashboard draws the "quickActions" widget

  Scenario: Dashboard: the Charts widget draws the overall CPU and the network total of every host that offers them from the host's series, each with its newest value
    Given the host answers the agent fixture
    And the host answers the agent-dashboard fixture
    And the host answers the agent-overview fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the dashboard draws the "charts" widget
    And the dashboard draws the "cpu" chart of "self"
    And the dashboard draws the "network" chart of "self"
    And the dashboard's "cpu" chart of "self" reads "18%"
    And the dashboard's "network" chart of "self" reads "4 Mbps"
    And the host was sent GET to "/api/monitoring/system/cpu" 1 times
    And the host was sent GET to "/api/monitoring/network/usage" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/monitoring/system/cpu" 2 times
    And the host was sent GET to "/api/monitoring/network/usage" 2 times

  Scenario: Dashboard: Refresh reads the stats and the health of every host again, and nothing is read on a clock
    Given the host answers the agent fixture
    And the host answers the agent-dashboard fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the dashboard draws its frame
    And the host was sent GET to "/api/stats" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/stats" 2 times
    And the host was sent GET to "/api/monitoring/health" 2 times
