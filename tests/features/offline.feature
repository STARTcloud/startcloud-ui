Feature: offline banner

  Scenario: Offline banner: a status served from the worker's copy on the hyperweaver-agent role raises the sticky warning banner carrying Launch Hyperweaver Agent, the agent's hwa://open link
    Given the host answers the agent fixture
    And the host's status is the worker's saved copy
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the page raised 1 warning banner
    And the warning banner offers "launch-agent" linking to "hwa://open"

  Scenario: Offline banner: a status served from the worker's copy on the hyperweaver-server role raises the sticky warning banner with no Launch Hyperweaver Agent
    Given the host answers the hosts fixture
    And the host's status is the worker's saved copy
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then the page raised 1 warning banner
    And the warning banner offers no "launch-agent"
