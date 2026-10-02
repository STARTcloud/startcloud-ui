Feature: integrations hyperweaver

  Background:
    Given the host answers the integrations-hyperweaver fixture

  Scenario: Hyperweaver: the Preferences section draws the card with two servers and the target under the Preferences card
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    And the Hyperweaver servers table lists 2 rows
    And I see "https://hw.example.com"
    And I see "https://lab.example.com:8443"
    And I see "Office"
    And the Hyperweaver deploy target reads "local"
    And the host was sent GET to "/api/user" 2 times

  Scenario: Hyperweaver: Add server sends the connect once for a person not yet connected and reads the record again
    Given the host answers the integrations-hyperweaver-unconnected fixture
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    And the Hyperweaver servers table lists 0 rows
    When I type "https://new.example.com" into the Hyperweaver field "origin"
    And I type "Home" into the Hyperweaver field "label"
    And I press the Hyperweaver card's "server-add" action
    Then the host was sent POST to "/api/user/integrations/hyperweaver/connect" carrying "origin" as "https://new.example.com"
    And the host was sent POST to "/api/user/integrations/hyperweaver/connect" carrying "label" as "Home"
    And the host was sent POST to "/api/user/integrations/hyperweaver/connect" 1 times
    And the host was not sent PATCH to "/api/user/integrations/hyperweaver"
    And the host was sent GET to "/api/user" 4 times

  Scenario: Hyperweaver: Add server sends the whole settings for a connected person, the new server the third element
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    When I type "https://new.example.com" into the Hyperweaver field "origin"
    And I type "Home" into the Hyperweaver field "label"
    And I press the Hyperweaver card's "server-add" action
    Then the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "https://new.example.com" at "/servers/2/origin"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "Home" at "/servers/2/label"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "https://hw.example.com" at "/servers/0/origin"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "local" at "/deploy_target"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" 1 times
    And the host was not sent POST to "/api/user/integrations/hyperweaver/connect"
    And the host was sent GET to "/api/user" 4 times

  Scenario: Hyperweaver: a bad origin is refused at its field by the rules form before any request
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    When I type "ftp://bad host" into the Hyperweaver field "origin"
    And I press the Hyperweaver card's "server-add" action
    Then the Hyperweaver field "origin" is invalid
    And the host was not sent PATCH to "/api/user/integrations/hyperweaver"
    And the host was not sent POST to "/api/user/integrations/hyperweaver/connect"

  Scenario: Hyperweaver: a 422 paints its pointer on the field it names
    Given the host refuses the next PATCH to "/api/user/integrations/hyperweaver"
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    When I type "https://new.example.com" into the Hyperweaver field "origin"
    And I press the Hyperweaver card's "server-add" action
    Then the host was sent PATCH to "/api/user/integrations/hyperweaver" 1 times
    And the Hyperweaver field "origin" is invalid
    And the host was sent GET to "/api/user" 2 times

  Scenario: Hyperweaver: picking the deploy target and Save sends the whole settings once and reads the record again
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    When I pick the Hyperweaver deploy target "https://hw.example.com"
    And I press the Hyperweaver card's "save" action
    Then the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "deploy_target" as "https://hw.example.com"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "https://hw.example.com" at "/servers/0/origin"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "https://lab.example.com:8443" at "/servers/1/origin"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" carrying "true" at "/servers/0/default"
    And the host was sent PATCH to "/api/user/integrations/hyperweaver" 1 times
    And the host was sent GET to "/api/user" 4 times

  Scenario: Hyperweaver: Disconnect waits behind the confirmation and sends the DELETE
    When I open "/user/profile/preferences"
    Then the Hyperweaver card draws
    When I press the Hyperweaver card's "disconnect" action
    Then the host was not sent DELETE to "/api/user/integrations/hyperweaver"
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/user/integrations/hyperweaver" 1 times
    And the host was sent GET to "/api/user" 4 times

  Scenario: Hyperweaver: the Integrations row's Manage lands on /user/integrations/hyperweaver and draws the same card
    When I open "/user/integrations"
    Then I see "Hyperweaver"
    When I follow the link to "/user/integrations/hyperweaver"
    Then the path is "/user/integrations/hyperweaver"
    And the Hyperweaver card draws
    And the Hyperweaver servers table lists 2 rows
    And the host was sent GET to "/api/user/integrations"

  Scenario: Hyperweaver: a person with no services sees no card and no Integrations row
    Given the host answers the integrations-hyperweaver-none fixture
    When I open "/user/profile/preferences"
    Then no Hyperweaver card draws
    And the sidebar draws no row to "/user/integrations"
