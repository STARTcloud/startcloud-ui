Feature: machine create

  Scenario: Create wizard: the doors behind `machine-create`, New machine in the Controls menu opens the wizard on the host's page and every feed is read once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1"
    And I click "Host actions"
    Then the Controls menu offers "new-machine"
    When I press the Controls menu's "new-machine" row
    Then the "machine-create" dialog is open
    And the wizard is on the step "general"
    And the path is "/hosts/1?create=machine"
    And the field "machine-setting-server_id" reads "1042"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners" 1 times
    And the host was sent GET to "/api/agents/1/machines/defaults" 1 times
    And the host was sent GET to "/api/agents/1/machines/ostypes" 1 times
    And the host was sent GET to "/api/agents/1/machines/ids/next" 1 times
    And the host was sent GET to "/api/agents/1/templates" 1 times
    And the host was sent GET to "/api/agents/1/templates/sources" 1 times
    And the host was sent GET to "/api/agents/1/templates/remote/boxvault" 1 times
    And the host was sent GET to "/api/agents/1/templates/remote/mirror" 1 times
    And the host was sent GET to "/api/agents/1/artifacts" 1 times
    And the host was sent GET to "/api/agents/1/artifacts/iso" 1 times
    And the host was sent GET to "/api/agents/1/media" 1 times
    And the host was sent GET to "/api/organizations" 1 times
    And the host was not sent GET to "/api/agents/1/storage/pools"
    And the page draws no key of hyperweaver-ui in place of its text

  Scenario: Create wizard: the doors behind `machine-create`, New in the machines list's heading and New machine in the tree's menu open the wizard
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list offers "new-machine"
    When I press the machines list's "new-machine" action
    Then the "machine-create" dialog is open
    And the path is "/hosts/1?create=machine"
    When I press "Escape"
    Then no dialog is open
    And the path is "/hosts/1"
    When I right-click the tree node "Desk"
    Then the tree menu offers "new-machine"
    When I press the tree menu's "new-machine" row
    Then the "machine-create" dialog is open

  Scenario: Create wizard: a typed name makes a backdrop click, Escape and Cancel ask before the wizard closes, Keep editing keeps the name and Discard closes it
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    Then the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I click the backdrop of the open dialog
    Then the "discard-changes" dialog is open
    When I press the open dialog's "keep-editing" action
    Then the "discard-changes" dialog is closed
    And the "machine-create" dialog is open
    And the field "machine-create-name-input" reads "web-3.example.com"
    When I press "Escape"
    Then the "discard-changes" dialog is open
    When I press the open dialog's "keep-editing" action
    Then the "discard-changes" dialog is closed
    When I press the open dialog's "cancel" action
    Then the "discard-changes" dialog is open
    When I press the open dialog's "discard" action
    Then no dialog is open
    And the path is "/hosts/1"

  Scenario: Create wizard: the doors behind `machine-create`, a host whose row lists no machine-create and a person who may not create draw no door
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list offers no "new-machine"
    When I click "Host actions"
    Then the Controls menu offers no "new-machine"
    When I open "/hosts/1?create=machine"
    Then no dialog is open
    And the host was not sent GET to "/api/agents/1/machines/defaults"

  Scenario: Create wizard: the doors behind `machine-create`, a member reads no door on a host that lists the token
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines"
    Then the machines list offers no "new-machine"
    When I open "/hosts/1?create=machine"
    Then no dialog is open

  Scenario: Create wizard: the deep link of BoxVault, `?create=machine` with a box lands on the box fields as a custom pick and the home route moves it to the first host that creates
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com%2Fsigned"
    Then the path is "/hosts/1?create=machine&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com%2Fsigned"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "startcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"
    And the open dialog notes "catalog"
    And I see "Mirror"

  Scenario: Create wizard: the deep link on an agent role, `/?create=machine` with a box moves from the dashboard to the wizard of the one serving agent
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&box=startcloud%2Fdebian13&box_version=13.1.0"
    Then the path is "/hosts/self?create=machine&box=startcloud%2Fdebian13&box_version=13.1.0"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "startcloud/debian13"

  Scenario: Create wizard: the deep link of the catalog on an agent role, `/?create=machine` with a provisioner and the box of its provider moves to the one serving agent, lands the box on the OS & Disks step and picks the family and the version
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the path is "/hosts/self?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the open dialog notes "box-seeded"
    And the open dialog notes no "box-source"
    And the field "machine-setting-box" reads "STARTcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"
    And the field "machine-setting-box_arch" reads "amd64"
    And the field "machine-setting-box_url" reads "https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox"
    When I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    When I follow the wizard step "general"
    Then the field "machine-create-provisioner" reads "startcloud"
    And the field "machine-create-version" reads "0.1.27"
    And the host was sent GET to "/api/provisioning/provisioners/startcloud/versions/0.1.27" 1 times

  Scenario: Create wizard: the deep link of BoxVault wins over the catalog's box_<provider> member when a query carries both
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine&box=startcloud%2Fdebian13&box_version=13.0.0&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "startcloud/debian13"
    And the field "machine-setting-box_version" reads "13.0.0"

  Scenario: Create wizard: the deep link of the catalog on a bhyve host picks box_zone over box_virtualbox
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox&box_zone=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fzone"
    Then the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "STARTcloud/debian13"
    And the field "machine-setting-box_url" reads "https://boxvault.example.com/STARTcloud/debian13/13.1.0/zone"
    And the open dialog notes no "box-source"

  Scenario: Create wizard: the deep link of the catalog on the server role, `/?create=machine` with a provisioner and its box moves to the first host that creates with every member kept
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the path is "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "STARTcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"

  Scenario: Create wizard: the deep link on the server role stays on the hosts list under the hand-off banner alone while no host offers a create
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    Then I see "Desk"
    And the path is "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And the hand-off banner draws for "machine"
    And the hosts page draws no pick
    And no dialog is open

  Scenario: Create wizard: the deep link of the catalog, `?create=machine` with a provisioner picks the family named after its slash and the named version on the Provisioning step and reads the version's manifest once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fstartcloud-0.1.27.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then the "machine-create" dialog is open
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 1 times
    And the host was sent GET to "/api/agents/1/provisioning/catalog/sources" 1 times
    And the field "machine-create-use-provisioner" is checked
    And the field "machine-create-provisioner" reads "startcloud"
    And the field "machine-create-version" reads "0.1.27"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the field "prov-field-guest_user" reads "startcloud"
    When I send the open dialog
    Then the wizard is on the step "confirm"
    And the wizard's confirm rows include "startcloud"

  Scenario: Create wizard: the deep link of the catalog, a family the host does not hold installs from the host's catalog on Install and continue, its progress from the task, then picks the family and the version
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_url=https%3A%2F%2Fgithub.com%2FSTARTcloud%2Fhcl_domino_additional_provisioner%2Freleases%2Fdownload%2Fv0.3.0%2Fhcl_domino_additional_provisioner-0.3.0.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the wizard's provisioner card reads "install"
    And the host was sent GET to "/api/agents/1/provisioning/catalog/sources" 1 times
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/install"
    And the host was not sent GET to "/api/agents/1/provisioning/provisioners/hcl_domino_additional_provisioner/versions/0.3.0"
    When I press the open dialog's "provisioner-install" action
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "hcl_domino_additional_provisioner" at "/name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "0.3.0" at "/version"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "startcloud" at "/source_name"
    And the wizard's provisioner card reads "installing"
    When the host answers the hosts-create-installed fixture
    And the stream releases its frames
    Then the open dialog notes no "provisioner-install"
    And the field "prov-field-domino_server_name" reads "additional"
    When I follow the wizard step "general"
    Then the field "machine-create-provisioner" reads "hcl_domino_additional_provisioner"
    And the field "machine-create-version" reads "0.3.0"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/hcl_domino_additional_provisioner/versions/0.3.0" 1 times
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" 1 times
    And the host was not sent POST to "/api/agents/1/machines"

  Scenario: Create wizard: a family installed from the Provisioners page while the wizard is open lands at its task's end, no Install card, the family and the version picked, nothing installed twice
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/provisioners"
    Then the section page "provisioners" draws
    When I press the section page's "catalog-add" action
    And I open the "versions-fold" fold of the card "hcl_domino_additional_provisioner" of the "provisioner-catalog" listing
    And I press Install on "hcl_domino_additional_provisioner" "0.3.0" in the provisioner catalog
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "hcl_domino_additional_provisioner" at "/name"
    And the page raised 1 success notice
    When I press "version-create" on the version "0.3.0" of the card "hcl_domino_additional_provisioner" of the "provisioner-catalog" listing
    Then the path is "/hosts/1?create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the wizard's provisioner card reads "install"
    When the host answers the hosts-create-installed fixture
    And the stream releases its frames
    Then the open dialog notes no "provisioner-install"
    And the field "prov-field-domino_server_name" reads "additional"
    When I follow the wizard step "general"
    Then the field "machine-create-provisioner" reads "hcl_domino_additional_provisioner"
    And the field "machine-create-version" reads "0.3.0"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/hcl_domino_additional_provisioner/versions/0.3.0" 1 times
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" 1 times
    And the host was not sent POST to "/api/agents/1/machines"

  Scenario: Create wizard: Create a machine in the chevron menu of a held family on the Provisioners page opens the wizard on the host's page with the family and its newest held version picked
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the deploy-intents-hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/provisioners"
    Then the section page "provisioners" draws
    When I open the menu of the card "startcloud" of the provisioner catalog
    Then the open menu offers "held-create"
    When I press the menu entry "held-create"
    Then the path is "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    When I follow the wizard step "general"
    Then the field "machine-create-provisioner" reads "startcloud"
    And the field "machine-create-version" reads "0.1.27"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 1 times

  Scenario: Create wizard: the deep link of the catalog, a family no source of the host lists adds the handed catalog as a source on Add source and install, then installs from it
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-uncatalogued fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fcatalog.json"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard's provisioner card reads "add"
    When the host answers the hosts-create-catalogued fixture
    And I press the open dialog's "provisioner-add-source" action
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying "https://provisioner-catalog.example.com/catalog.json" at "/url"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying nothing at "/auth"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying "provisioner-catalog.example.com" at "/display_name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "provisioner_catalog_example_com_catalog_json" at "/source_name"
    And the wizard's provisioner card reads "installing"

  Scenario: Create wizard: the deep link of the catalog, a source add the host refuses says the provisioner was not found at its catalog with the agent's word and Retry, and nothing installs
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-uncatalogued fixture
    And the host answers the hosts-events fixture
    And the host refuses the next POST to "/api/agents/1/provisioning/catalog/sources"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fcatalog.json"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard's provisioner card reads "add"
    When I press the open dialog's "provisioner-add-source" action
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/sources" 1 times
    And the wizard's provisioner card reads "failed"
    And I see "url must be reachable"
    And the open dialog offers "provisioner-retry"
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/install"

  Scenario: Create wizard: the deep link of the catalog, a private catalog the agent's own sign-in cannot read puts Sign in with SSO to continue on the card and installs nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-signin fixture
    And the host answers the hosts-events fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fprivate_only_provisioner&provisioner_version=1.0.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard's provisioner card reads "signin"
    And the host was sent GET to "/api/agents/1/provisioning/catalog" 1 times
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/install"
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/sources"

  Scenario: Create wizard: the whole hand-off on an agent role, the box's registry added on Add registry and continue, the family installed on Install and continue, and Create queued with the box's download in front of the build
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the host answers the agent-create-deploy fixture
    And the stream holds the catalog-install-agent frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_url=https%3A%2F%2Fgithub.com%2FSTARTcloud%2Fhcl_domino_additional_provisioner%2Freleases%2Fdownload%2Fv0.3.0%2Fhcl_domino_additional_provisioner-0.3.0.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the path is "/hosts/self?create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_url=https%3A%2F%2Fgithub.com%2FSTARTcloud%2Fhcl_domino_additional_provisioner%2Freleases%2Fdownload%2Fv0.3.0%2Fhcl_domino_additional_provisioner-0.3.0.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    And the "machine-create" dialog is open
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-setting-box" reads "STARTcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"
    And the wizard's box registry card reads "add"
    And the host was not sent PUT to "/api/config/storage"
    When the host answers the agent-create-deployed fixture
    And I press the open dialog's "box-source-add" action
    Then the host was sent PUT to "/api/config/storage" carrying "https://boxvault.example.com" at "/template_sources/sources/boxvault_example_com/url"
    And the host was sent PUT to "/api/config/storage" carrying "boxvault.example.com" at "/template_sources/sources/boxvault_example_com/display_name"
    And the host was sent PUT to "/api/config/storage" carrying "false" at "/template_sources/sources/boxvault_example_com/default"
    And the host was sent PUT to "/api/config/storage" 1 times
    And the host was sent GET to "/api/templates/sources" 2 times
    And the open dialog notes no "box-source"
    When I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the wizard's provisioner card reads "install"
    When I press the open dialog's "provisioner-install" action
    Then the host was sent POST to "/api/provisioning/catalog/install" carrying "hcl_domino_additional_provisioner" at "/name"
    And the host was sent POST to "/api/provisioning/catalog/install" carrying "0.3.0" at "/version"
    And the wizard's provisioner card reads "installing"
    When the stream releases its frames
    Then the open dialog notes no "provisioner-install"
    And the field "prov-field-domino_server_name" reads "additional"
    When I follow the wizard step "general"
    Then the field "machine-create-provisioner" reads "hcl_domino_additional_provisioner"
    And the field "machine-create-version" reads "0.3.0"
    When I follow the wizard step "confirm"
    Then the wizard is on the step "confirm"
    And the wizard's confirm rows include "STARTcloud/debian13"
    And the wizard's confirm rows include "hcl_domino_additional_provisioner/0.3.0"
    When I send the open dialog
    Then the host was sent POST to "/api/machines" carrying "STARTcloud/debian13" at "/settings/box"
    And the host was sent POST to "/api/machines" carrying "13.1.0" at "/settings/box_version"
    And the host was sent POST to "/api/machines" carrying "amd64" at "/settings/box_arch"
    And the host was sent POST to "/api/machines" carrying "https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox" at "/settings/box_url"
    And the host was sent POST to "/api/machines" carrying "template" at "/disks/boot/type"
    And the host was sent POST to "/api/machines" carrying "hcl_domino_additional_provisioner" at "/provisioner/name"
    And the host was sent POST to "/api/machines" 1 times
    And the page raised 1 success notice
    And the page raised 1 info notice
    And no dialog is open

  Scenario: Create wizard: a registry add the host refuses says so with the agent's word and Retry, and nothing is created
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the host answers the agent-create-deploy fixture
    And the host refuses the next PUT to "/api/config/storage"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard's box registry card reads "add"
    When I press the open dialog's "box-source-add" action
    Then the host was sent PUT to "/api/config/storage" 1 times
    And the wizard's box registry card reads "failed"
    And I see "url must be reachable"
    And the open dialog offers "box-source-retry"
    And the host was not sent POST to "/api/machines"

  Scenario: Create wizard: the deep link on an agent role stays on the dashboard with one warning notice while the agent offers no create
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    Then the path is "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And the page raised 1 warning notice
    And no dialog is open

  Scenario: Create wizard: the deep link of the catalog, an install that fails says the provisioner was not found at its catalog with the agent's word and Retry reads the catalogs again
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install-failed frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I press the open dialog's "provisioner-install" action
    And the stream releases its frames
    Then the wizard's provisioner card reads "failed"
    And I see "checksum MISMATCH for hcl_domino_additional_provisioner-0.3.0.tar.gz: refusing to import"
    When I press the open dialog's "provisioner-retry" action
    Then the host was sent GET to "/api/agents/1/provisioning/catalog/sources" 2 times
    And the wizard's provisioner card reads "install"

  Scenario: Create wizard: the deep link of the catalog, a family in no catalog of the host and no handed catalog is not found and nothing installs
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-uncatalogued fixture
    And the host answers the hosts-events fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fother&provisioner_version=2.0.0"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard's provisioner card reads "missing"
    And the open dialog offers "provisioner-retry"
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/install"
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/sources"

  Scenario: Create wizard: a step that cannot be left says why, and the pills reach a step visited before
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I send the open dialog
    Then the open dialog notes "problem"
    And the wizard is on the step "general"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the wizard's image list offers "startcloud/debian13"
    And the wizard's image list offers "startcloud/ubuntu2404"
    When I send the open dialog
    Then the wizard is on the step "system"
    And the open dialog draws the field "machine-setting-os_type"
    And the open dialog draws no field "machine-zones-bootnext"
    When I press the open dialog's "back" action
    Then the wizard is on the step "os-disks"
    When I follow the wizard step "general"
    Then the wizard is on the step "general"
    And the wizard draws no step "provisioning"
    And the wizard step "confirm" is open

  Scenario: Create wizard: a write one request and one notice, Create on a VirtualBox host sends the spec, closes the wizard, reads the held copies again once and offers the task
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the open dialog draws the field "machine-disk-boot-size"
    And the open dialog draws no list "filesystems"
    And the field "machine-disk-boot-size" carries the placeholder "e.g. 32G"
    When I choose "startcloud/debian13" in the field "machine-setting-box"
    Then the field "machine-disk-boot-size" carries the placeholder "64G"
    When I type "32G" into the field "machine-disk-boot-size"
    And I send the open dialog
    Then the wizard is on the step "system"
    When I send the open dialog
    Then the wizard is on the step "cpu"
    When I send the open dialog
    Then the wizard is on the step "memory"
    When I send the open dialog
    Then the wizard is on the step "network"
    And the host was sent GET to "/api/agents/1/provisioning/bridged-interfaces" 1 times
    And the host was sent GET to "/api/agents/1/network/ip-suggestions" 1 times
    When I send the open dialog
    Then the wizard is on the step "confirm"
    And the wizard's confirm rows include "startcloud/debian13"
    And the open dialog offers "submit-menu"
    When I press the open dialog's "submit-menu" action
    Then the open dialog offers "submit-start"
    And the open dialog offers "submit-provision"
    When I press the open dialog's "submit-start" action
    Then the host was sent POST to "/api/agents/1/machines" carrying "web-3" at "/settings/hostname"
    And the host was sent POST to "/api/agents/1/machines" carrying "example.com" at "/settings/domain"
    And the host was sent POST to "/api/agents/1/machines" carrying "1042" at "/settings/server_id"
    And the host was sent POST to "/api/agents/1/machines" carrying "startcloud/debian13" at "/settings/box"
    And the host was sent POST to "/api/agents/1/machines" carrying "template" at "/disks/boot/type"
    And the host was sent POST to "/api/agents/1/machines" carrying "32G" at "/disks/boot/size"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/disks/boot/sparse"
    And the host was sent POST to "/api/agents/1/machines" carrying "copy" at "/disks/boot/clone_strategy"
    And the host was sent POST to "/api/agents/1/machines" carrying "external" at "/networks/0/type"
    And the host was sent POST to "/api/agents/1/machines" carrying "eth0" at "/networks/0/bridge"
    And the host was sent POST to "/api/agents/1/machines" carrying "rsync" at "/sync_method"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/start_after_create"
    And the host was sent POST to "/api/agents/1/machines" carrying "false" at "/provision_after_create"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/provisioner"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/zones"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/hypervisor"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/org_uuid"
    And the host was sent POST to "/api/agents/1/machines" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the host was not sent GET to "/api/agents/1/machines"
    And the host was sent GET to "/api/agents/1/stats" 2 times
    When I press the success notice's action
    Then the host was sent GET to "/api/agents/1/tasks/a1000000-0000-4000-8000-000000000007"

  Scenario: Create wizard: a write one request and one notice, an agent short of resources leaves the wizard open with one line a resource and raises no card
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-refused fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I follow the wizard step "general"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "confirm"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" 1 times
    And the "machine-create" dialog is open
    And the open dialog lists 2 resource issues
    And the page raised 0 danger notices
    And the host was not sent GET to "/api/agents/1/machines"

  Scenario: Create wizard: the steps a bhyve host draws, the zone fields, the ZFS placement and the lofs mounts, and Create sent at the agent's own /api path
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines"
    Then the machines list offers "new-machine"
    When I press the machines list's "new-machine" action
    Then the "machine-create" dialog is open
    And the host was sent GET to "/api/machines/defaults" 1 times
    And the host was sent GET to "/api/storage/pools" 1 times
    And the host was sent GET to "/api/storage/datasets" 2 times
    And the host was not sent GET to "/api/media"
    And the host was not sent GET to "/api/agents/self/machines/defaults"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the open dialog draws the list "filesystems"
    And the host was sent GET to "/api/storage/pools" 2 times
    When I send the open dialog
    Then the wizard is on the step "system"
    And the open dialog draws the field "machine-zones-hostbridge"
    And the open dialog draws the field "machine-zones-bootnext"
    And the open dialog draws no field "machine-zones-cpu-config"
    When I choose "e1000" in the field "machine-zones-netif"
    And I send the open dialog
    Then the wizard is on the step "cpu"
    And the open dialog draws the field "machine-zones-cpu-config"
    When I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "confirm"
    When I send the open dialog
    Then the host was sent POST to "/api/machines" carrying "e1000" at "/zones/netif"
    And the host was sent POST to "/api/machines" carrying "template" at "/disks/boot/type"
    And the host was sent POST to "/api/machines" carrying "igb0" at "/networks/0/bridge"
    And the host was sent POST to "/api/machines" carrying nothing at "/vbox"
    And the host was sent POST to "/api/machines" 1 times
    And the host was not sent POST to "/api/agents/self/machines"
    And the page raised 1 success notice
    And no dialog is open

  Scenario: Create wizard: on the hyperweaver-agent role served directly the wizard reads its feeds at the agent's own /api path and offers no BoxVault browse and no organization
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine"
    Then the "machine-create" dialog is open
    And the open dialog draws no field "machine-setting-org"
    And the host was sent GET to "/api/machines/defaults" 1 times
    And the host was not sent GET to "/api/organizations"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    Then the wizard is on the step "os-disks"
    And the open dialog offers no "browse-boxvault"

  Scenario: Create wizard: the organization on the server role, the wizard opens on the organization a person operates under and sends it as org_uuid
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/hosts/1?create=machine"
    Then the field "machine-setting-org" reads "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11" at "/org_uuid"

  Scenario: Create wizard: the BoxVault picker on the server role, a session that is not federated reads the sentence and asks for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"provider\":\"local\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I press the open dialog's "browse-boxvault" action
    Then the "boxvault-picker" dialog is open
    And the open dialog notes "boxvault-blocked"
    And the host was not sent GET to "/api/boxvault/api/discover"

  Scenario: Create wizard: the BoxVault picker on the server role, a federated session reads the catalog once and Use this box mints the link into the box fields
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"provider\":\"oidc-startcloud\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I press the open dialog's "browse-boxvault" action
    Then the "boxvault-picker" dialog is open
    And the host was sent GET to "/api/boxvault/api/discover" 1 times
    When I choose "startcloud/debian13" in the field "boxvault-box"
    And I send the open dialog
    Then the host was sent POST to "/api/boxvault/api/organization/startcloud/box/debian13/version/13.1.0/provider/virtualbox/architecture/amd64/file/get-download-link" 1 times
    And the "machine-create" dialog is open
    And the field "machine-setting-box" reads "startcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"

  Scenario: Create wizard: the Provisioning step draws every manifest role in manifest order with its default and its required chip, the hypervisor seeds the provider select, a group naming a role draws inside its card, a role flipped on draws its fields, a list field grows by Add, a changed switch draws the warning banner and Template defaults clears it, the proxy fields follow their checkbox and the Installer Archives fields are not drawn
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the roles list reads "setup,networking,ssl,domino_install,domino_leap,domino_iq,quick_start,haproxy,lockdown"
    And the roles editor offers no "run-role"
    And the role "setup" is on
    And the role "ssl" is on
    And the role "domino_install" is on
    And the role "domino_leap" is off
    And the role "domino_iq" is off
    And the role "lockdown" is off
    And the role "setup" draws the chip "required"
    And the role "domino_install" draws no chip "required"
    And the role "networking" is titled "networking"
    And the roles editor notes no "roles-changed"
    And the field "prov-field-guest_user" reads "startcloud"
    And the field "prov-field-VAGRANT_PROVIDER" reads "virtualbox"
    And the open dialog draws the field "prov-field-SERVER_ORGANIZATION"
    And the open dialog draws no field "prov-field-DOMINO_INSTALLER"
    And the open dialog draws no field "prov-field-DOMINO_HASH"
    And the open dialog draws no field "prov-field-PROXY_SERVER"
    And the open dialog draws no field "prov-field-CERT_SELFSIGNED"
    And the open dialog draws no field "prov-field-DOMINO_IQ_API_KEY"
    When I open the role "ssl"
    Then the role "ssl" draws the field "prov-field-CERT_SELFSIGNED"
    And the wizard's field form draws no field "prov-field-CERT_SELFSIGNED"
    And the role "domino_iq" draws 0 dependency warnings
    When I flip the role "domino_iq"
    Then the role "domino_iq" is on
    And the role "domino_iq" draws 1 dependency warnings
    And the role "domino_iq" draws the field "prov-field-DOMINO_IQ_MODEL"
    And the role "domino_iq" draws the field "prov-field-DOMINO_IQ_API_KEY"
    And the roles editor notes "roles-changed"
    When I press the roles editor's "roles-defaults" action
    Then the role "domino_iq" is off
    And the roles editor notes no "roles-changed"
    And the open dialog draws no field "prov-field-DOMINO_IQ_API_KEY"
    When I check the field "prov-field-USE_PROXY"
    Then the open dialog draws the field "prov-field-PROXY_SERVER"
    And the open dialog draws the field "prov-field-PROXY_PORT"
    And the open dialog draws the field "prov-field-DOMINO_ADDITIONAL_SERVER_NAMES"
    And the open dialog draws no field "prov-field-DOMINO_SERVER_ID_CREATION_TOOL"
    When I press the "list-add" action of the field "prov-field-DOMINO_ADDITIONAL_SERVER_NAMES"
    And I type "additional-demo.example.com" into the field "prov-field-DOMINO_ADDITIONAL_SERVER_NAMES-0"
    Then the open dialog draws the field "prov-field-DOMINO_SERVER_ID_CREATION_TOOL"
    When I flip the role "networking"
    Then the role "networking" is off
    And the roles editor notes "roles-changed"
    When I press the roles editor's "roles-defaults" action
    Then the role "networking" is on
    And the roles editor notes no "roles-changed"
    When I drag the role "domino_leap" onto the role "ssl"
    Then the roles list reads "setup,networking,domino_leap,ssl,domino_install,domino_iq,quick_start,haproxy,lockdown"
    And the secret field "USER_SAFE_ID" reads "picked"
    And the secret field "USER_SAFE_ID" names "sec-safe"
    And the host was sent GET to "/api/agents/1/certs" 2 times
    When I press the "secret-pick" action of the secret field "USER_SAFE_ID"
    Then the "pick-secret" dialog is open
    And the host was sent GET to "/api/agents/1/certs" 3 times
    And the dialog table "secret-pick" lists 1 rows
    When I press "secret-pick-row" on the row "SAFE.ids" of the dialog table "secret-pick"
    Then the "pick-secret" dialog is closed
    And the secret field "USER_SAFE_ID" reads "picked"
    When I type "proxy.example.com" into the field "prov-field-PROXY_SERVER"
    And I send the open dialog
    Then the wizard is on the step "confirm"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "setup" at "/roles/0/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/roles/0/enabled"
    And the host was sent POST to "/api/agents/1/machines" carrying "startcloud.startcloud_roles" at "/roles/0/collection"
    And the host was sent POST to "/api/agents/1/machines" carrying "networking" at "/roles/1/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "always" at "/roles/1/tags"
    And the host was sent POST to "/api/agents/1/machines" carrying "domino_leap" at "/roles/2/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "false" at "/roles/2/enabled"
    And the host was sent POST to "/api/agents/1/machines" carrying "ssl" at "/roles/3/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "password" at "/roles/3/vars/cert_pass"
    And the host was sent POST to "/api/agents/1/machines" carrying "domino_install" at "/roles/4/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "Domino_14.0_Linux_English.tar" at "/roles/4/files/installer"
    And the host was sent POST to "/api/agents/1/machines" carrying "14.0.0" at "/roles/4/files/installer_version"
    And the host was sent POST to "/api/agents/1/machines" carrying "domino_iq" at "/roles/5/name"
    And the host was sent POST to "/api/agents/1/machines" carrying "false" at "/roles/5/enabled"
    And the host was sent POST to "/api/agents/1/machines" carrying "Domino_14.0_Linux_English.tar" at "/properties/DOMINO_INSTALLER"
    And the host was sent POST to "/api/agents/1/machines" carrying "5fd08b71e946f11308232170553aaca6f4c60c8bb8d91ef6fb89e3f171bad9a5" at "/properties/DOMINO_HASH"
    And the host was sent POST to "/api/agents/1/machines" carrying "14" at "/properties/DOMINO_INSTALLER_MAJOR_VERSION"
    And the host was sent POST to "/api/agents/1/machines" carrying "virtualbox" at "/properties/VAGRANT_PROVIDER"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/properties/CERT_SELFSIGNED"
    And the host was sent POST to "/api/agents/1/machines" carrying "llama3.1:latest" at "/properties/DOMINO_IQ_MODEL"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/properties/DOMINO_IQ_API_KEY"
    And the host was sent POST to "/api/agents/1/machines" carrying "asja" at "/properties/DOMINO_SERVER_ID_CREATION_TOOL"
    And the host was sent POST to "/api/agents/1/machines" carrying "additional-demo.example.com" at "/properties/DOMINO_ADDITIONAL_SERVER_NAMES/0"
    And the host was sent POST to "/api/agents/1/machines" carrying "proxy.example.com" at "/properties/PROXY_SERVER"
    And the host was sent POST to "/api/agents/1/machines" carrying "sec-safe" at "/properties/USER_SAFE_ID"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/wait_for"
    And the host was sent POST to "/api/agents/1/machines" 1 times

  Scenario: Create wizard: a known-but-missing installer picked draws the warning and the download glyph, the glyph queues the download the create waits on, and its end on the stream reads the artifacts again and frees Create
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the artifact-fetch frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the role "domino_install" notes no "role-attention"
    When I open the role "domino_install"
    Then the "installer" file of the role "domino_install" reads "present"
    And the "fixpack" file of the role "domino_install" reads "none"
    When I press the "file-pick" action of the "installer" file of the role "domino_install"
    Then the "artifact-pick" dialog is open
    And the pick dialog lists 2 files
    When I pick the file "Domino_14.5_Linux_English.tar" in the pick dialog
    Then the "artifact-pick" dialog is closed
    And the "installer" file of the role "domino_install" reads "missing"
    And the role "domino_install" notes "role-attention"
    And the host was not sent POST to "/api/agents/1/artifacts/art-0102/fetch"
    When I press the fetch glyph of the "installer" file of the role "domino_install"
    Then the host was sent POST to "/api/agents/1/artifacts/art-0102/fetch" 1 times
    And the "installer" file of the role "domino_install" reads "queued"
    And the role "domino_install" notes no "role-attention"
    And the page raised 1 success notice
    When I send the open dialog
    Then the wizard is on the step "confirm"
    And the Create button waits on 1 downloads
    And the wizard's confirm rows include "domino_install"
    When the stream releases its frames
    Then the host was sent GET to "/api/agents/1/artifacts" 2 times
    And the Create button waits on no download
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "Domino_14.5_Linux_English.tar" at "/properties/DOMINO_INSTALLER"
    And the host was sent POST to "/api/agents/1/machines" carrying "5" at "/properties/DOMINO_INSTALLER_MINOR_VERSION"
    And the host was sent POST to "/api/agents/1/machines" carrying "Domino_14.5_Linux_English.tar" at "/roles/3/files/installer"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/wait_for"
    And the host was sent POST to "/api/agents/1/machines" 1 times

  Scenario: Create wizard: a queued download still running when Create is pressed rides in wait_for
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the artifact-fetch frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I open the role "domino_install"
    And I press the "file-pick" action of the "fixpack" file of the role "domino_install"
    Then the "artifact-pick" dialog is open
    And the pick dialog lists 1 files
    When I pick the file "Domino_1400FP3_Linux.tar" in the pick dialog
    Then the "fixpack" file of the role "domino_install" reads "missing"
    When I press the fetch glyph of the "fixpack" file of the role "domino_install"
    Then the "fixpack" file of the role "domino_install" reads "queued"
    When I send the open dialog
    Then the Create button waits on 1 downloads
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "c2000000-0000-4000-8000-000000000041" at "/wait_for/0"
    And the host was sent POST to "/api/agents/1/machines" carrying "Domino_1400FP3_Linux.tar" at "/properties/DOMINO_INSTALLER_FIXPACK"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/properties/DOMINO_INSTALLER_FIXPACK_INSTALL"
    And the host was sent POST to "/api/agents/1/machines" carrying "14.0fp3" at "/roles/3/files/fixpack_version"

  Scenario: Create wizard: a secret field opens on the one row of the host's store that matches its kind and profile, the pick dialog changes it, the clear button drops it and the row's id rides the create body
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the host was sent GET to "/api/agents/1/certs" 2 times
    And the open dialog draws the field "prov-field-INSTALLER_BEARER"
    And the secret field "INSTALLER_BEARER" reads "picked"
    And the secret field "INSTALLER_BEARER" names "sec-bearer"
    When I press the "secret-pick" action of the secret field "INSTALLER_BEARER"
    Then the "pick-secret" dialog is open
    And the host was sent GET to "/api/agents/1/certs" 3 times
    And the dialog table "secret-pick" lists 1 rows
    When I press "secret-pick-row" on the row "installer-bearer" of the dialog table "secret-pick"
    Then the "pick-secret" dialog is closed
    And the secret field "INSTALLER_BEARER" names "installer-bearer"
    When I press the "secret-clear" action of the secret field "INSTALLER_BEARER"
    Then the secret field "INSTALLER_BEARER" reads "none"
    When I press the "secret-pick" action of the secret field "INSTALLER_BEARER"
    And I press "secret-pick-row" on the row "installer-bearer" of the dialog table "secret-pick"
    Then the secret field "INSTALLER_BEARER" reads "picked"
    When I send the open dialog
    Then the wizard is on the step "confirm"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "sec-bearer" at "/properties/INSTALLER_BEARER"
    And the host was sent POST to "/api/agents/1/machines" carrying "sec-safe" at "/properties/USER_SAFE_ID"
    And the host was sent POST to "/api/agents/1/machines" 1 times

  Scenario: Create wizard: the secret record form opened from the pick dialog over the wizard scrolls its body within the viewport
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    When I press the "secret-pick" action of the secret field "USER_SAFE_ID"
    Then the "pick-secret" dialog is open
    When I press the open dialog's "secret-add" action
    Then the "secret-record" dialog is open
    And the open dialog scrolls its body within the viewport

  Scenario: Create wizard: a secret field of a role switched on opens on the one row of its kind and profile without a click, the store read no second time
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the open dialog draws no field "prov-field-DOMINO_IQ_API_KEY"
    When I flip the role "domino_iq"
    Then the role "domino_iq" draws the field "prov-field-DOMINO_IQ_API_KEY"
    And the secret field "DOMINO_IQ_API_KEY" reads "picked"
    And the secret field "DOMINO_IQ_API_KEY" names "sec-openai"
    And the host was sent GET to "/api/agents/1/certs" 2 times
    When I send the open dialog
    Then the wizard is on the step "confirm"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "sec-openai" at "/properties/DOMINO_IQ_API_KEY"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/roles/5/enabled"

  Scenario: Create wizard: the one Name, a bare name takes the user row's domain over the agent's, the switch off draws no Provisioning pill and Create sends no provisioner
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    Then the "machine-create" dialog is open
    And the field "machine-setting-server_id" reads "1042"
    And the field "machine-create-use-provisioner" is not checked
    And the wizard draws no step "provisioning"
    And the wizard step "os-disks" is held
    When I type "zeus-01" into the field "machine-create-name-input"
    Then the field "machine-setting-hostname" reads "zeus-01"
    And the field "machine-setting-domain" reads "lab.example.com"
    And the wizard fold "name-parts" is closed
    And the wizard step "os-disks" is open
    And the wizard step "confirm" is open
    When I follow the wizard step "confirm"
    Then the wizard is on the step "confirm"
    And the wizard's confirm rows include "zeus-01"
    And the wizard's confirm rows include "lab.example.com"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines" carrying "zeus-01" at "/settings/hostname"
    And the host was sent POST to "/api/agents/1/machines" carrying "lab.example.com" at "/settings/domain"
    And the host was sent POST to "/api/agents/1/machines" carrying nothing at "/provisioner"
    And the host was sent POST to "/api/agents/1/machines" carrying "false" at "/provision_after_create"
    And the host was sent POST to "/api/agents/1/machines" 1 times

  Scenario: Create wizard: the domain input lists the chain's domains in order, a domain typed from the list writes into the Name, a dotted name keeps its own, and a bare name typed again takes the chain's first
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "zeus-01" into the field "machine-create-name-input"
    And I open the wizard fold "name-parts"
    Then the wizard fold "name-parts" is open
    And the field "machine-setting-domain" lists the options "lab.example.com,startcloud.com"
    And the open dialog draws no field "machine-create-domain-source"
    When I type "startcloud.com" into the field "machine-setting-domain"
    Then the field "machine-create-name-input" reads "zeus-01.startcloud.com"
    When I type "web-3.example.com" into the field "machine-create-name-input"
    Then the field "machine-setting-domain" reads "example.com"
    When I type "zeus-02" into the field "machine-create-name-input"
    Then the field "machine-setting-domain" reads "lab.example.com"

  Scenario: Create wizard: the browser's default domain preference wins over every row of the host
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "hosts_prefs" as "{\"defaultDomain\":\"pref.example.com\"}"
    When I open "/hosts/1?create=machine"
    And I type "zeus-01" into the field "machine-create-name-input"
    Then the field "machine-setting-domain" reads "pref.example.com"
    When I open the wizard fold "name-parts"
    Then the field "machine-setting-domain" lists the options "pref.example.com,lab.example.com,startcloud.com"
    And the wizard step "confirm" is open

  Scenario: Create wizard: no domain anywhere, a bare name opens Edit parts with the domain invalid and the link to the host's machines configuration, and Next is refused
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-nodomain fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    Then the "machine-create" dialog is open
    And the wizard fold "name-parts" is closed
    When I type "zeus-01" into the field "machine-create-name-input"
    Then the wizard fold "name-parts" is open
    And the field "machine-setting-hostname" reads "zeus-01"
    And the field "machine-setting-domain" reads ""
    And the field "machine-setting-domain" is marked invalid
    And the open dialog notes "no-domain"
    And the open dialog's "domain-config" action links to "/hosts/1/agent/config/machines"
    And the wizard step "os-disks" is held
    When I send the open dialog
    Then the open dialog notes "problem"
    And the wizard is on the step "general"
    When I type "lab.example.com" into the field "machine-setting-domain"
    Then the field "machine-create-name-input" reads "zeus-01.lab.example.com"
    And the field "machine-setting-domain" is not marked invalid
    And the open dialog notes no "no-domain"
    And the wizard step "os-disks" is open


  Scenario: Create wizard: Use a provisioner on with 0.1.27 picked prefills OS & Disks, System, CPU, Memory and Network from the package, marks each value, opens every pill and keeps a typed memory over a re-pick
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-use-provisioner"
    Then the wizard draws the step "provisioning"
    And the open dialog draws the field "machine-create-provisioner"
    When I choose "startcloud" in the field "machine-create-provisioner"
    And I choose "0.1.27" in the field "machine-create-version"
    Then the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 1 times
    And the field "machine-create-tags" reads "domino"
    And the wizard step "cpu" is open
    And the wizard step "memory" is open
    And the wizard step "network" is open
    And the wizard step "provisioning" is open
    When I send the open dialog
    Then the wizard is on the step "os-disks"
    And the field "machine-box-registry" reads "boxvault"
    And the field "machine-setting-box" reads "STARTcloud/debian12-server"
    And the field "machine-setting-box_version" reads "2025.4.30"
    And the field "machine-setting-box" is marked from package
    And the field "machine-setting-box_version" is marked from package
    And the field "machine-disk-boot-mount" reads "/"
    And the open dialog draws 1 rows of "additional-disk"
    When I send the open dialog
    Then the wizard is on the step "system"
    And the field "machine-system-firmware" reads "UEFI"
    And the field "machine-setting-os_type" reads "Debian_64"
    And the field "machine-setting-os_type" is marked from package
    When I send the open dialog
    Then the wizard is on the step "cpu"
    And the field "machine-setting-vcpus" reads "2"
    And the field "machine-setting-vcpus" is marked from package
    When I send the open dialog
    Then the wizard is on the step "memory"
    And the field "machine-setting-memory" reads "8G"
    And the field "machine-setting-memory" is marked from package
    When I type "4G" into the field "machine-setting-memory"
    Then the field "machine-setting-memory" is not marked from package
    When I send the open dialog
    Then the wizard is on the step "network"
    And the open dialog draws 1 network rows
    And the field "network-0-dhcp" is checked
    When I follow the wizard step "general"
    And I choose "0.1.26" in the field "machine-create-version"
    And I choose "0.1.27" in the field "machine-create-version"
    Then the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 2 times
    When I follow the wizard step "memory"
    Then the field "machine-setting-memory" reads "4G"
    And the field "machine-setting-memory" is not marked from package
    When I follow the wizard step "cpu"
    Then the field "machine-setting-vcpus" reads "2"
    And the field "machine-setting-vcpus" is marked from package

  Scenario: Create wizard: Confirm reads the Hosts.yml preview once as it is entered, draws it read-only with Copy, and Create and provision sends both flags true without a second preview
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-use-provisioner"
    And I choose "startcloud" in the field "machine-create-provisioner"
    And I choose "0.1.27" in the field "machine-create-version"
    Then the host was not sent POST to "/api/agents/1/machines/preview"
    When I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the host was not sent POST to "/api/agents/1/machines/preview"
    When I send the open dialog
    Then the wizard is on the step "confirm"
    And the host was sent POST to "/api/agents/1/machines/preview" carrying "web-3" at "/settings/hostname"
    And the host was sent POST to "/api/agents/1/machines/preview" carrying "startcloud" at "/provisioner/name"
    And the host was sent POST to "/api/agents/1/machines/preview" 1 times
    And the preview fold reads "ready"
    And the preview contains "hostname: web-3"
    And the open dialog offers "preview-copy"
    And the host was sent POST to "/api/agents/1/machines/preview" carrying "false" at "/provision_after_create"
    And the host was sent POST to "/api/agents/1/machines/preview" carrying "true" at "/vbox/guest_agent"
    And the wizard's confirm rows include "startcloud/0.1.27"
    And the host was not sent POST to "/api/agents/1/machines"
    When I press the open dialog's "submit-menu" action
    And I press the open dialog's "submit-provision" action
    Then the host was sent POST to "/api/agents/1/machines" carrying "true" at "/provision_after_create"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/start_after_create"
    And the host was sent POST to "/api/agents/1/machines" carrying "true" at "/vbox/guest_agent"
    And the host was sent POST to "/api/agents/1/machines" carrying "domino" at "/tags/0"
    And the host was sent POST to "/api/agents/1/machines/preview" 1 times
    And the host was sent POST to "/api/agents/1/machines" carrying "0.1.27" at "/provisioner/version"
    And the host was sent POST to "/api/agents/1/machines" carrying "STARTcloud/debian12-server" at "/settings/box"
    And the host was sent POST to "/api/agents/1/machines" carrying "/" at "/disks/boot/mount"
    And the host was sent POST to "/api/agents/1/machines" carrying "50G" at "/disks/additional_disks/0/size"
    And the host was sent POST to "/api/agents/1/machines" carrying "/local" at "/disks/additional_disks/0/mount"
    And the host was sent POST to "/api/agents/1/machines" carrying "xfs" at "/disks/additional_disks/0/filesystem"
    And the host was sent POST to "/api/agents/1/machines" 1 times
    And the page raised 1 success notice
    And no dialog is open

  Scenario: Create wizard: the update glyph on the Version label, the catalog listing startcloud 0.1.28 over the held 0.1.27 draws the glyph and the catalog link, the link opens the family's catalog versions, Install there installs from the host's catalog, and the task's end reads the families again and picks the new version
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    Then the "machine-create" dialog is open
    And the host was sent GET to "/api/agents/1/provisioning/catalog/sources" 1 times
    And the host was sent GET to "/api/agents/1/provisioning/catalog" 1 times
    When I type "web-3.example.com" into the field "machine-create-name-input"
    And I check the field "machine-create-use-provisioner"
    Then the open dialog notes no "update-available"
    When I choose "startcloud" in the field "machine-create-provisioner"
    And I choose "0.1.27" in the field "machine-create-version"
    Then the open dialog notes "update-available"
    And the open dialog offers "version-catalog"
    And the host was not sent POST to "/api/agents/1/provisioning/catalog/install"
    When I press the open dialog's "version-catalog" action
    Then the "version-catalog" dialog is open
    When I press Install on the version "0.1.28" in the version catalog
    Then the "version-catalog" dialog is closed
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "startcloud" at "/name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "0.1.28" at "/version"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "startcloud" at "/source_name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" 1 times
    When the host answers the hosts-create-updated fixture
    And the stream releases its frames
    Then the field "machine-create-version" reads "0.1.28"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.28" 1 times
    And the open dialog notes no "update-available"
    And the host was not sent POST to "/api/agents/1/machines"

  Scenario: Controls menu: the tool rows by their tokens, Install OS draws on a VirtualBox host for a machine that is off and sends the ISO, the user and the password
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/machines/dev-2"
    And I click "Machine controls"
    Then the Controls menu offers "tool-install"
    When I press the Controls menu's "tool-install" row
    Then the "machine-install" dialog is open
    And the open dialog notes no "running"
    And the host was sent GET to "/api/agents/1/artifacts/iso" 1 times
    When I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/machines/dev-2/unattended"
    When I choose "debian-13.1.0-amd64-netinst.iso" in the field "unattended-iso"
    And I type "mark" into the field "unattended-user"
    And I type "secret" into the field "unattended-password"
    And I uncheck the field "unattended-start"
    And I send the open dialog
    Then the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying "debian-13.1.0-amd64-netinst.iso" at "/iso"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying "mark" at "/user"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying "secret" at "/password"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying "true" at "/install_additions"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying "false" at "/start"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" carrying nothing at "/path"
    And the host was sent POST to "/api/agents/1/machines/dev-2/unattended" 1 times
    And the page raised 1 success notice
    And no dialog is open

  Scenario: Controls menu: the tool rows by their tokens, a zone draws no Install OS and a machine on UTM draws none
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-tools fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/machines/web-1"
    And I click "Zone controls"
    Then the Controls menu offers "tool-take"
    And the Controls menu offers no "tool-install"
