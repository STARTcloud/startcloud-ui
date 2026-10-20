Feature: api-keys

  Scenario: API keys: the page reads the keys as it opens into the one table under the one heading, Generate and Bootstrap each one request with the key shown once, Delete behind the confirmation, the keys read again after every write
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/api-keys"
    Then the agent page draws the "api-keys" panel
    And the section page draws one heading
    And the heading of the networking page counts 2
    And the host was sent GET to "/api/agents/1/api-keys" 1 times
    And the api keys table lists 2 rows
    And the api key row "Initial-Setup" reads "Yes"
    And the api key row "old-laptop" reads "No"
    And the page draws no key under "accounts"
    When I press the agent page's "api-key-generate" action
    Then the "api-key-generate" dialog is open
    When I type "deploy" into the field "api-key-name"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/api-keys/generate" carrying "name" as "deploy"
    And the "generated-key" dialog is open
    And I see "hwk_generated_deploy_key"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/api-keys" 2 times
    When I press "Escape"
    And I press the agent page's "api-key-generate-menu" action
    And I press the agent page's "api-key-bootstrap" action
    Then the host was sent POST to "/api/agents/1/api-keys/bootstrap" carrying "name" as "Initial-Setup"
    And the "generated-key" dialog is open
    And I see "hwk_bootstrap_initial_key"
    And the host was sent GET to "/api/agents/1/api-keys" 3 times
    When I press "Escape"
    And I press "delete" on the api key row "old-laptop"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/api-keys/2" 1 times
    And I see "deleted successfully"
    And the host was sent GET to "/api/agents/1/api-keys" 4 times

  Scenario: API keys: two picked keys are deleted together behind the typed confirmation, one DELETE a key, one notice naming the count and the keys read again once
    Given the host answers the hosts fixture
    And the host answers the hosts-agent-settings fixture
    And the host answers the hosts-api-keys fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/agent/api-keys"
    Then the api keys table lists 2 rows
    And the host was sent GET to "/api/agents/1/api-keys" 1 times
    When I tick the api key row "Initial-Setup"
    And I tick the api key row "old-laptop"
    Then I see "2 selected"
    When I press the agent page's "bulk-delete" action
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/api-keys/1" 1 times
    And the host was sent DELETE to "/api/agents/1/api-keys/2" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/1/api-keys" 2 times
    And I do not see "2 selected"
