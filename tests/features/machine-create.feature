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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
    And the field "machine-setting-box" reads "startcloud/debian13"

  Scenario: Create wizard: the deep link of the catalog on an agent role, `/?create=machine` with a provisioner and the box of its provider moves to the one serving agent, lands the box on the Box step and picks the family and the version
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the path is "/hosts/self?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    And the "machine-create" dialog is open
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    Then the wizard is on the step "box"
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
    And the field "machine-create-provisioner" reads "startcloud"
    And the field "machine-create-version" reads "0.1.27"
    And the host was sent GET to "/api/provisioning/provisioners/startcloud/versions/0.1.27" 1 times

  Scenario: Create wizard: the deep link of BoxVault wins over the catalog's box_<provider> member when a query carries both
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine&box=startcloud%2Fdebian13&box_version=13.0.0&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox"
    Then the "machine-create" dialog is open
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
    And the field "machine-setting-box" reads "startcloud/debian13"
    And the field "machine-setting-box_version" reads "13.0.0"

  Scenario: Create wizard: the deep link of the catalog on a bhyve host picks box_zone over box_virtualbox
    Given the host answers the zones fixture
    And the host answers the zones-machines fixture
    And the host answers the zones-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self?create=machine&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox&box_zone=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.example.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fzone"
    Then the "machine-create" dialog is open
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I check the field "machine-create-advanced"
    And I send the open dialog
    Then the wizard is on the step "box"
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
    And the field "machine-setting-box" reads "STARTcloud/debian13"
    And the field "machine-setting-box_version" reads "13.1.0"

  Scenario: Create wizard: the deep link on the server role stays on the hosts list with one warning notice while no host offers a create
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    Then I see "Desk"
    And the path is "/?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27"
    And the page raised 1 warning notice
    And no dialog is open

  Scenario: Create wizard: the deep link of the catalog, `?create=machine` with a provisioner picks the family named after its slash and the named version on the Provisioning step and reads the version's manifest once
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.27&provisioner_url=https%3A%2F%2Fcatalog.example.com%2Fstartcloud-0.1.27.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then the "machine-create" dialog is open
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27" 1 times
    And the host was not sent GET to "/api/agents/1/provisioning/catalog/sources"
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "provisioning"
    And the field "machine-create-provisioner" reads "startcloud"
    And the field "machine-create-version" reads "0.1.27"
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    Then the field "machine-create-provisioner" reads "hcl_domino_additional_provisioner"
    And the field "machine-create-version" reads "0.3.0"
    And the field "prov-field-domino_server_name" reads "additional"
    And the open dialog notes no "provisioner-install"
    And the host was sent GET to "/api/agents/1/provisioning/provisioners/hcl_domino_additional_provisioner/versions/0.3.0" 1 times
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" 1 times
    And the host was not sent POST to "/api/agents/1/machines"

  Scenario: Create wizard: the deep link of the catalog, a family no source of the host lists adds the handed catalog as a source on Add source and install, then installs from it
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-uncatalogued fixture
    And the host answers the hosts-events fixture
    And the stream holds the catalog-install frames
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fapi%2Fprivate%2F0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11%2Fcatalog"
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    And I send the open dialog
    Then the wizard's provisioner card reads "add"
    When the host answers the hosts-create-catalogued fixture
    And I press the open dialog's "provisioner-add-source" action
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying "https://provisioner-catalog.example.com/api/private/0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11/catalog" at "/url"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying "oidc" at "/auth"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/sources" carrying "provisioner-catalog.example.com" at "/display_name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "provisioner_catalog_example_com_api_private_0b7c1d52_6f0e_4c0a_9a54_3c1f6f2a9e11_catalog" at "/source_name"
    And the wizard's provisioner card reads "installing"

  Scenario: Create wizard: the deep link of the catalog, a source add the host refuses says the provisioner was not found at its catalog with the agent's word and Retry, and nothing installs
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the host answers the hosts-create-uncatalogued fixture
    And the host answers the hosts-events fixture
    And the host refuses the next POST to "/api/agents/1/provisioning/catalog/sources"
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine&provisioner=acme%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fapi%2Fprivate%2F0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11%2Fcatalog"
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
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
    Then the field "machine-create-provisioner" reads "hcl_domino_additional_provisioner"
    And the field "machine-create-version" reads "0.3.0"
    And the field "prov-field-domino_server_name" reads "additional"
    And the open dialog notes no "provisioner-install"
    When I send the open dialog
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
    And the wizard's image list offers "startcloud/debian13"
    And the wizard's image list offers "startcloud/ubuntu2404"
    When I send the open dialog
    Then the wizard is on the step "system"
    And the open dialog draws the field "machine-setting-os_type"
    And the open dialog draws no field "machine-zones-bootnext"
    When I press the open dialog's "back" action
    Then the wizard is on the step "box"
    When I follow the wizard step "general"
    Then the wizard is on the step "general"

  Scenario: Create wizard: a write one request and one notice, Create on a VirtualBox host sends the spec, closes the wizard, reads the held copies again once and offers the task
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1?create=machine"
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I check the field "machine-create-start-after"
    And I send the open dialog
    Then the wizard is on the step "box"
    When I choose "startcloud/debian13" in the field "machine-setting-box"
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "disks"
    And the open dialog draws the field "machine-disk-boot-size"
    And the open dialog draws no list "filesystems"
    When I type "32G" into the field "machine-disk-boot-size"
    And I send the open dialog
    Then the wizard is on the step "resources"
    When I send the open dialog
    Then the wizard is on the step "network"
    And the host was sent GET to "/api/agents/1/provisioning/bridged-interfaces" 1 times
    And the host was sent GET to "/api/agents/1/network/ip-suggestions" 1 times
    When I send the open dialog
    Then the wizard is on the step "provisioning"
    When I send the open dialog
    Then the wizard is on the step "confirm"
    And the wizard's confirm rows include "startcloud/debian13"
    When I send the open dialog
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I follow the wizard step "general"
    And I send the open dialog
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    And I send the open dialog
    Then the wizard is on the step "system"
    And the open dialog draws the field "machine-zones-hostbridge"
    And the open dialog draws the field "machine-zones-bootnext"
    When I choose "e1000" in the field "machine-zones-netif"
    And I send the open dialog
    Then the wizard is on the step "disks"
    And the open dialog draws the list "filesystems"
    And the host was sent GET to "/api/storage/pools" 2 times
    When I send the open dialog
    And I send the open dialog
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
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
    Then the wizard is on the step "box"
    And the open dialog offers no "browse-boxvault"

  Scenario: Create wizard: the organization on the server role, the wizard opens on the organization a person operates under and sends it as org_uuid
    Given the host answers the hosts fixture
    And the host answers the hosts-machines fixture
    And the host answers the hosts-create fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "activeOrganization" as "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I open "/hosts/1?create=machine"
    Then the field "machine-setting-org" reads "0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11"
    When I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
    And I send the open dialog
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
    And I type "web-3" into the field "machine-setting-hostname"
    And I type "example.com" into the field "machine-setting-domain"
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
