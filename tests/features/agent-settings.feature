Feature: agent-settings

  Scenario: Agent settings: the page is offered to a host whose row names a hypervisor, a row that names none draws the not-available stub and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/4/settings"
    Then the agent settings page draws the not-available stub
    And the host was not sent GET to "/api/agents/4/api-keys"
    And the host was not sent GET to "/api/agents/4/app/updates/check"

  Scenario: Agent settings: a host the list of servers does not hold draws what the host page draws for it
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/99/settings"
    Then the agent settings route draws the host that did not answer
    And the host was sent GET to "/api/agents/99/stats"
    And the host was not sent GET to "/api/agents/99/api-keys"

  Scenario: Agent settings: the page is for a super-admin alone, hyperweaver-ui's gate, and asks nothing for the admin the hosts fixture answers
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/settings"
    Then the agent settings page says a super-admin is required
    And the host was not sent GET to "/api/agents/1/api-keys"

  Scenario: Agent settings: the API management tab first, the secrets behind secrets, no configuration read of the agent, every read once
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/settings"
    Then the agent settings page draws its frame
    And the host tab "settings" is the active one
    And the agent settings tab "api_management" is shown
    And the agent settings page offers the tab "api_management"
    And the agent settings page offers the tab "secrets"
    And the agent settings page draws the "api-keys" panel
    And the agent settings page offers "settings-update"
    And the host was sent GET to "/api/agents/1/api-keys" 1 times
    And the host was sent GET to "/api/agents/1/app/updates/check" 1 times
    And the host was not sent GET to "/api/agents/1/settings"
    And the host was not sent GET to "/api/agents/1/secrets"
    And the page draws no key under "agentSettings"

  Scenario: Agent settings: Update is one request and one notice behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/settings"
    And I press the agent settings page's "settings-update" action
    And I confirm the open dialog with "update"
    Then the host was sent POST to "/api/agents/1/app/updates/apply" 1 times
    And I see "Update to 1.3.0 queued"

  Scenario: Agent settings: the secrets tab reads the document as it opens, saves one category as one PUT and reads again, and Reload reads again
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/settings"
    And I pick the agent settings tab "secrets"
    Then the agent settings page draws the "secrets" panel
    And the host was sent GET to "/api/agents/1/secrets" 1 times
    And the first secret entry is named "github"
    When I press the agent settings page's "secret-save" action
    Then the host was sent PUT to "/api/agents/1/secrets" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/secrets" 2 times
    When I press the agent settings page's "secrets-reload" action
    Then the host was sent GET to "/api/agents/1/secrets" 3 times

  Scenario: Agent settings: Refresh reads the list of servers, the host's stats and every read of the page again
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/settings"
    Then the host was sent GET to "/api/agents/1/api-keys" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/servers" 2 times
    And the host was sent GET to "/api/agents/1/stats" 2 times
    And the host was sent GET to "/api/agents/1/api-keys" 2 times
    And the host was sent GET to "/api/agents/1/app/updates/check" 2 times
