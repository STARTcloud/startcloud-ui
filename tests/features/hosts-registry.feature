Feature: hosts-registry

  Scenario: Registry: the registry read asks include_api_keys, Test connection sends allow_insecure and a host ready for bootstrap puts the Connection Status pane on bootstrap with the ready notice
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the browser records its requests
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    Then the hosts page draws the registry form
    And the host was asked "/api/servers" with "include_api_keys" as "true"
    And the hosts page draws no connection status
    When I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the host was sent POST to "/api/servers/test" carrying "hostname" as "agent-7.example.com"
    And the host was sent POST to "/api/servers/test" carrying "allow_insecure" as "false"
    And the connection status reads "bootstrap"
    And the page raised 1 success notice

  Scenario: Registry: a host whose test answers no bootstrapAvailable puts the Connection Status pane on existing and the notice names the existing-key option
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the host answers the hosts-registry/no-bootstrap fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    And I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the connection status reads "existing"
    And the page raised 1 success notice
    And the page raised 0 danger notices

  Scenario: Registry: a test the server answers success false puts the pane on error with the reason in the notice
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the host answers the hosts-registry/test-failed fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    And I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the connection status reads "error"
    And I see "agent-7.example.com did not answer"
    And the page raised 1 danger notice

  Scenario: Registry: Bootstrap sends entity_name and allow_insecure in snake_case and a success clears the form and the pane
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    And I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the connection status reads "bootstrap"
    When I click "Bootstrap Server"
    Then the host was sent POST to "/api/servers" carrying "entity_name" as "Hyperweaver-Production"
    And the host was sent POST to "/api/servers" carrying "allow_insecure" as "false"
    And the host was sent POST to "/api/servers" carrying "port" as "5001"
    And the hosts page draws no registry form

  Scenario: Registry: an add the agent refuses with a 502 draws the agent's own reason and leaves the passed test's status as it is
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the host answers the hosts-registry/refused-502 fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    And I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the connection status reads "bootstrap"
    When I click "Bootstrap Server"
    Then the host was sent POST to "/api/servers" carrying "entity_name" as "Hyperweaver-Production"
    And I see "The agent refused the bootstrap"
    And the page raised 1 danger notice
    And the connection status reads "bootstrap"
    And the hosts page draws the registry form

  Scenario: Registry: an add of an agent already registered, a 409, draws its notice and leaves the passed test's status as it is
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the host answers the hosts-registry/refused-409 fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/?add=host"
    And I fill "Server Hostname" with "agent-7.example.com"
    And I click "Test Connection"
    Then the connection status reads "bootstrap"
    When I click "Bootstrap Server"
    Then the host was sent POST to "/api/servers" 1 times
    And the page raised 1 danger notice
    And the connection status reads "bootstrap"
    And the hosts page draws the registry form

  Scenario: Registry: the self-signed switch sends allow_insecure on PATCH /api/servers/{id}
    Given the host answers the hosts fixture
    And the host answers the hosts-config fixture
    And the host answers the hosts-registry fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"super-admin\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "Desk"
    When I flip the self-signed switch of the host "Desk"
    Then the host was sent PATCH to "/api/servers/1" carrying "allow_insecure" as "true"
