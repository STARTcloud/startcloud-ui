Feature: deploy target

  Scenario: Deploy: a signed-in viewer on a deploy host whose claims carry no hyperweaver entry sees the glyph with the agent's hwa://open link in this window
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

  Scenario: Deploy: a viewer without the Hyperweaver entitlement sees the glyph all the same
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-viewer fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "debian12-server"
    And the Deploy glyph opens in this window

  Scenario: Deploy: a visitor signed out sees the glyph with the agent's link and no claims are asked for
    Given the host answers the deploy-target fixture
    When I open "/"
    Then I see "debian12-server"
    And the Deploy glyph links to "hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the host was not sent GET to "/api/userinfo/claims"

  Scenario: Deploy: a press asks the local agent its status and follows the link while it answers
    Given the host answers the deploy-target fixture
    And the local agent answers its status
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I press the Deploy glyph
    Then the local agent was asked its status
    And no no-agent dialog is open

  Scenario: Deploy: a press with no local agent answering opens the dialog that offers the agent's release
    Given the host answers the deploy-target fixture
    And the local agent does not answer
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I press the Deploy glyph
    Then the no-agent dialog offers "install-agent" linking to "https://github.com/Makr91/hyperweaver-agent/releases/latest"
    And the no-agent dialog offers no "join-server"

  Scenario: Deploy: a press on a server target that does not answer raises the warning notice that offers this machine's agent
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-server fixture
    And the server "https://hw.example.com" does not answer
    And the local agent answers its status
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I press the Deploy glyph
    Then the server "https://hw.example.com" was asked its status
    And the page raised 1 warning notice
    And the warning notice's action links to "hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"

  Scenario: Deploy: the provisioners collection sends the provisioner seed with the catalog the family came from
    Given the host answers the deploy-target-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "hcl-domino"
    And the Deploy glyph links to "https://hw.example.com/?create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz&provisioner_catalog=http%3A%2F%2F127.0.0.1%3A4173%2Fcatalog.json"
    And the Deploy glyph opens in a new tab
