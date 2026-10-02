Feature: deploy target

  Scenario: Deploy: a signed-in viewer with the entitlement on a deploy host whose claims carry no hyperweaver entry sees the glyph with the agent's hwa://open link in this window
    Given the host answers the deploy-target fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "debian12-server"
    And the host was sent GET to "/api/userinfo/claims"
    And the Deploy glyph links to "hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy glyph opens in this window

  Scenario: Deploy: a deploy_target naming a hyperweaver-server sends the glyph to that origin's page in a new tab
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-server fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "debian12-server"
    And the Deploy glyph links to "https://hw.example.com/?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy glyph opens in a new tab

  Scenario: Deploy: a deploy_target of local sends the glyph to the agent's hwa://open link
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-local fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "debian12-server"
    And the Deploy glyph links to "hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy glyph opens in this window

  Scenario: Deploy: a viewer without the entitlement sees no glyph
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-viewer fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "debian12-server"
    And no Deploy glyph draws

  Scenario: Deploy: the provisioners collection sends the provisioner seed
    Given the host answers the deploy-target-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "hcl-domino"
    And the Deploy glyph links to "https://hw.example.com/?create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz"
    And the Deploy glyph opens in a new tab
