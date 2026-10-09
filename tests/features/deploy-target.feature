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

  Scenario: Deploy: a visitor signed out with no agent answering sees the one dialog, Install Hyperweaver Agent, Join a Hyperweaver server and Support
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-idp fixture
    And the local agent does not answer
    When I open "/"
    And I press the Deploy glyph
    Then the local agent was asked its status
    And the no-agent dialog offers "install-agent" linking to "https://github.com/Makr91/hyperweaver-agent/releases/latest"
    And the no-agent dialog offers "join-server" linking to "https://auth.example.com/user/integrations/hyperweaver"
    And the no-agent dialog offers "support" linking to "https://support.example.com/tickets/new?source=hyperweaver&req=sso&customerId=A1B2C3&context=boxvault%7C0.77.0"

  Scenario: Deploy: the provisioners collection sends the provisioner seed with the catalog the family came from, and no box for a version the catalog verified with none
    Given the host answers the deploy-target-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "hcl-domino"
    And the Deploy glyph links to "https://hw.example.com/?create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz&provisioner_catalog=http%3A%2F%2F127.0.0.1%3A4173%2Fcatalog.json"
    And the Deploy glyph opens in a new tab

  Scenario: Deploy: the chevron beside a box's glyph opens the box words, Deploy a machine, Pull as a template and Add this registry as a source, each a link of the target rule
    Given the host answers the deploy-target fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the Deploy menu
    Then the Deploy menu offers 3 rows
    And the Deploy menu offers "machine" linking to "hwa://open?create=machine&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy menu offers "template" linking to "hwa://open?create=template&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy menu offers "source" linking to "hwa://open?create=source&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy menu row "template" opens in this window

  Scenario: Deploy: the chevron's rows go to a hyperweaver-server target in a new tab
    Given the host answers the deploy-target fixture
    And the host answers the deploy-target-server fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the Deploy menu
    Then the Deploy menu offers "template" linking to "https://hw.example.com/?create=template&box=STARTcloud%2Fdebian12-server&box_version=1.2.3&box_arch=amd64&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy menu offers "source" linking to "https://hw.example.com/?create=source&box_url=http%3A%2F%2F127.0.0.1%3A4173"
    And the Deploy menu row "template" opens in a new tab

  Scenario: Deploy: a row's press asks the target's status first, the agent's silence opening the one dialog
    Given the host answers the deploy-target fixture
    And the local agent does not answer
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the Deploy menu
    And I press the Deploy menu's "template" row
    Then the local agent was asked its status
    And the no-agent dialog offers "install-agent" linking to "https://github.com/Makr91/hyperweaver-agent/releases/latest"

  Scenario: Deploy: the chevron beside a provisioner's glyph opens the catalog words, Install on my agent and Add this catalog as a source, each carrying that word's keys alone
    Given the host answers the deploy-target-catalog fixture
    And the host answers the deploy-target-catalog-boxes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    And I open the Deploy menu
    Then the Deploy menu offers 3 rows
    And the Deploy menu offers "provisioner" linking to "https://hw.example.com/?create=provisioner&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz&provisioner_catalog=http%3A%2F%2F127.0.0.1%3A4173%2Fcatalog.json"
    And the Deploy menu offers "source" linking to "https://hw.example.com/?create=source&provisioner_catalog=http%3A%2F%2F127.0.0.1%3A4173%2Fcatalog.json"
    And the Deploy menu row "provisioner" opens in a new tab

  Scenario: Deploy: the provisioners collection sends the verified box of each provider after the provisioner seed, one box_<provider> member a provider
    Given the host answers the deploy-target-catalog fixture
    And the host answers the deploy-target-catalog-boxes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/"
    Then I see "hcl-domino"
    And the Deploy glyph links to "https://hw.example.com/?create=machine&provisioner=STARTcloud%2Fhcl-domino&provisioner_version=2.0.0&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fhcl-domino-2.0.0.tar.gz&provisioner_catalog=http%3A%2F%2F127.0.0.1%3A4173%2Fcatalog.json&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox&box_zone=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fzone"
    And the Deploy glyph opens in a new tab
