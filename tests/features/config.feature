Feature: config contract

  Background:
    Given the host answers the config fixture
    And the browser holds the config fixture's account

  Scenario: 3. the routes and answers of section 3, the PUT a merge patch, every refusal a problem body, status.config the names list
    When I open "/admin/config"
    Then the path is "/admin/config/app"
    And I see "Application"
    And I see "Schema version 1"
    And the control "Origin" has the value "https://boxvault.startcloud.com"
    And the host was sent GET to "/api/config/app"
    And the host was sent GET to "/api/config/app/schema"
    When I fill "Origin" with "https://boxvault.example.com"
    And I fill "Gravatar API key" with ""
    And I click "Remove"
    And I click "Update Configuration"
    Then I see "Configuration updated successfully."
    And the host was sent PUT to "/api/config/app" carrying "https://boxvault.example.com" at "/boxvault/origin"
    And the host was sent PUT to "/api/config/app" carrying "" at "/gravatar/api_key"
    And the host was sent PUT to "/api/config/app" carrying null at "/logging/categories/app"
    And the host was sent PUT to "/api/config/app" carrying nothing at "/boxvault/api_listen_port_encrypted"
    And the host was sent PUT to "/api/config/app" carrying nothing at "/logging/level"

  Scenario: 5. requiresRestart with restartReason; the 200's list the diff of changed flagged leaves; the pending list on restart-status until the restart
    When I open "/admin/config/app"
    Then I see "Restart required."
    And I see "HTTPS port: the listener is bound at boot"
    And I see "Last changed by mark@m4kr.net"
    And the label "HTTPS port" carries the badge "restart"
    And the label "Origin" carries the badge "restart"
    And the host was sent GET to "/api/config/restart-status"
    When I fill "Origin" with "https://boxvault.example.com"
    And I click "Update Configuration"
    Then I see "Configuration updated successfully."
    And the host was sent GET to "/api/config/restart-status" 2 times
    And I see "Restart required."
    When I click "Restart"
    And I fill the field placeholdered "Type 'restart' to confirm" with "restart"
    And I confirm the dialog with "Restart"
    Then I see "Restarting."
    And the host was sent POST to "/api/config/restart"
    And I do not see "Restart required."

  Scenario: 6. action: { kind, route, method, body, step_up }; one upload route per name; one component per kind; no page code per backend
    When I open "/admin/config/app"
    Then I see "Application"
    When I click "Test"
    Then I see "The test passed."
    And the host was sent POST to "/api/config/app/test" carrying "https://boxvault.startcloud.com" at "/boxvault/origin"
    And the host was sent POST to "/api/config/app/test" carrying "info" at "/logging/level"

  Scenario: 7. every collection an additionalProperties map with propertyNames, drawn by the generic map component
    When I open "/admin/config/app"
    Then I see "Log categories"
    And the map keys are "app,api"
    When I fill the row's "Key" with "app"
    And I press "Tab"
    Then I see "app is already taken in Log categories; enter a different Key."
    When I fill the row's "Key" with "Bad Key"
    Then I see "Check Key."
    When I fill the row's "Key" with "web"
    Then I do not see "Check Key."
    When I choose "debug" as the row's "Value"
    And I click "Add"
    Then the map keys are "app,api,web"
    When I click "Update Configuration"
    Then I see "Configuration updated successfully."
    And the host was sent PUT to "/api/config/app" carrying "debug" at "/logging/categories/web"
