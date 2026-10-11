Feature: deploy intents

  Scenario: Install on my agent: the server role with several hosts that list a provisioner registry draws the hand-off banner over the hosts page, and the cards are the pick, a host that cannot take it greyed with its reason
    Given the host answers the deploy-intents-hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then I see "Desk"
    And the path is "/?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the hand-off banner draws for "provisioner"
    When I switch the hosts page to "cards"
    Then the hosts page draws its "cards"
    And the host card "1" is a press to "/hosts/1/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the host card "2" is held
    And the host card "3" is a press to "/hosts/3/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    When I press the host card "1"
    Then the path is "/hosts/1/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the section page "provisioners" draws
    And no hand-off banner draws
    And the provisioner catalog marks "startcloud" with "0.1.28" selected
    And the provisioner catalog offers Install on "startcloud" "0.1.28"
    And the card "startcloud" of the "provisioner-catalog" listing version "0.1.28" creates a machine at "/hosts/1?create=machine&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    When I press Install on "startcloud" "0.1.28" in the provisioner catalog
    Then the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "startcloud" at "/name"
    And the host was sent POST to "/api/agents/1/provisioning/catalog/install" carrying "0.1.28" at "/version"
    And the path is "/hosts/1/provisioning/provisioners"
    And the page raised 1 success notice

  Scenario: Install on my agent: the hosts table is the pick too, the whole row of a host that can take it one press and a held row greyed with its reason
    Given the host answers the deploy-intents-hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28"
    Then the hosts page draws its "table"
    And the hand-off banner draws for "provisioner"
    And the hosts row "Desk" is a press
    And the hosts row "Lab" is held
    And the hosts row "Zones" is a press
    When I press the hosts row "Zones"
    Then the path is "/hosts/3/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28"
    And no hand-off banner draws

  Scenario: Pull as a template: the hosts page is the pick for the hosts that list templates, and the view toggle is kept with the page's prefs
    Given the host answers the deploy-intents-hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser holds "table_prefs_hosts" as "{\"view\":\"cards\"}"
    When I open "/?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com"
    Then the hosts page draws its "cards"
    And the hand-off banner draws for "template"
    And the host card "1" is a press to "/hosts/1/provisioning/templates?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com"
    And the host card "2" is held
    And the host card "3" is a press to "/hosts/3/provisioning/templates?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com"
    When I switch the hosts page to "table"
    Then the hosts page draws its "table"
    And the hosts row "Lab" is held

  Scenario: The one host that can take a hand-off is jumped to straight away, the word and its seed kept
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then the path is "/hosts/3/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fstartcloud&provisioner_version=0.1.28&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the section page "provisioners" draws
    And no hand-off banner draws
    And the provisioner catalog marks "startcloud" with "0.1.28" selected
    And the provisioner catalog offers Install on "startcloud" "0.1.28"

  Scenario: No host can take a hand-off: the banner stays as the notice, the page draws no pick, and its dismiss drops the hand-off from the route
    Given the host answers the hosts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com"
    Then I see "Desk"
    And the hand-off banner draws for "template"
    And the hosts page draws no pick
    And the path is "/?create=template&box=startcloud%2Fdebian13&box_version=13.1.0&box_arch=amd64&box_url=https%3A%2F%2Fboxvault.example.com"
    When I dismiss the hand-off banner
    Then the path is "/"
    And no hand-off banner draws

  Scenario: Install on my agent on an agent role: the dashboard moves the hand-off to the one serving agent's Provisioner catalog page, the handed family's card marked with Install one press away
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the host answers the agent-create-deploy fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/?create=provisioner&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    Then the path is "/hosts/self/provisioning/provisioners?create=provisioner&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json"
    And the section page "provisioners" draws
    And the provisioner catalog marks "hcl_domino_additional_provisioner" with "0.3.0" selected
    And the provisioner catalog offers Install on "hcl_domino_additional_provisioner" "0.3.0"
    And the section page notes no "provisioner-install"
    And the host was sent GET to "/api/provisioning/catalog/sources" 2 times
    When I press Install on "hcl_domino_additional_provisioner" "0.3.0" in the provisioner catalog
    Then the host was sent POST to "/api/provisioning/catalog/install" carrying "hcl_domino_additional_provisioner" at "/name"
    And the path is "/hosts/self/provisioning/provisioners"

  Scenario: Install on my agent on an agent role: a family no source of the host lists draws the Add source and install card over the catalog
    Given the host answers the agent fixture
    And the host answers the agent-machines fixture
    And the host answers the agent-create fixture
    And the host answers the agent-create-deploy fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/provisioning/provisioners?create=provisioner&provisioner=acme%2Facme_portal&provisioner_version=1.4.0&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fapi%2Fprivate%2F0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11%2Fcatalog"
    Then the section page "provisioners" draws
    And the provisioner catalog marks no card
    And the section page notes "provisioner-install"
    And the section page offers "provisioner-add-source"
    And the host was sent GET to "/api/provisioning/catalog/sources" 2 times

  Scenario: Pull as a template: the Templates page lands with the handed box's card marked whatever the panel says, and Install sends the handed version and architecture on the box's registry, dropping the hand-off from the route
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates?create=template&box=startcloud%2Fubuntu2404&box_version=24.04.2&box_arch=arm64&box_url=https%3A%2F%2Fboxvault.example.com"
    Then the section page "templates" draws
    And the card "ubuntu2404" of the "box-registry" listing is marked
    And the "box-registry" listing of the section page draws the card "ubuntu2404" plain
    And the section page notes no "box-source"
    When I press "catalog-install" on the card "ubuntu2404" of the "box-registry" listing
    Then the host was sent POST to "/api/agents/1/templates/pull" carrying "box_name" as "ubuntu2404"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "version" as "24.04.2"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "architecture" as "arm64"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "source_name" as "boxvault"
    And the path is "/hosts/1/provisioning/templates"

  Scenario: Pull as a template: a host that lacks the handed box's registry draws the Add registry card over the listing first, its press writing the registry, then the listing reads it and marks the handed box's card
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates?create=template&box=acme%2Fwindows-server-2025&box_version=2025.1&box_arch=amd64&box_url=https%3A%2F%2Fvagrant.example.com"
    Then the section page "templates" draws
    And the section page notes "box-source"
    And the section page offers "box-source-add"
    When the host answers the deploy-intents-registry fixture
    And I press the section page's "box-source-add" action
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "https://vagrant.example.com" at "/template_sources/sources/vagrant_example_com/url"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "vagrant.example.com" at "/template_sources/sources/vagrant_example_com/display_name"
    And the host was sent GET to "/api/agents/1/templates/sources" 2 times
    And the section page notes no "box-source"
    And the host was sent GET to "/api/agents/1/templates/remote/vagrant_example_com"
    And the card "windows-server-2025" of the "box-registry" listing is marked

  Scenario: Add this catalog as a source: the Provisioners page opens its Sources modal with the form filled, one Save press away, and the sources are read again
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the host answers the deploy-intents-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners?create=source&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.example.com%2Fapi%2Fprivate%2F0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11%2Fcatalog"
    Then the section page "provisioners" draws
    And the catalog dialog "catalog-source" draws
    And the field "catalog-source-display-name" reads "provisioner-catalog.example.com"
    And the field "catalog-source-url" reads "https://provisioner-catalog.example.com/api/private/0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11/catalog"
    And the field "catalog-source-auth" reads "oidc"
    When I submit the catalog dialog "catalog-source"
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/sources" carrying "https://provisioner-catalog.example.com/api/private/0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11/catalog" at "/url"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/sources" carrying "oidc" at "/auth"
    And the host was sent POST to "/api/agents/3/provisioning/catalog/sources" carrying "provisioner-catalog.example.com" at "/display_name"
    And the catalog dialog "catalog-source" is gone
    And the catalog dialog "catalog-sources" draws
    And the path is "/hosts/3/provisioning/provisioners"
    And the host was sent GET to "/api/agents/3/provisioning/catalog/sources" 2 times
    And the page raised 1 success notice

  Scenario: Add source on the person's own Provisioners page opens the same form empty under the Sources modal's table, no hand-off needed
    Given the host answers the hosts fixture
    And the host answers the hosts-installers fixture
    And the host answers the deploy-intents-catalog fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/provisioning/provisioners"
    And I press the section page's "catalog-sources" action
    And I press the open dialog's "catalog-source-add" action
    Then the catalog dialog "catalog-source" draws
    And the field "catalog-source-url" reads ""
    When I submit the catalog dialog "catalog-source"
    Then the catalog dialog "catalog-source" says why it cannot be sent
    And the host was not sent POST to "/api/agents/3/provisioning/catalog/sources"
    When I type "Public catalog" into the field "catalog-source-display-name"
    And I type "https://provisioner-catalog.startcloud.com/catalog.json" into the field "catalog-source-url"
    And I submit the catalog dialog "catalog-source"
    Then the host was sent POST to "/api/agents/3/provisioning/catalog/sources" carrying "none" at "/auth"
    And the catalog dialog "catalog-source" is gone

  Scenario: Add this registry as a source: the Templates page opens its Registries modal with the form filled from the handed URL, and the add is the one merge patch under the registry's id
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates?create=source&box_url=https%3A%2F%2Fvagrantcloud.com"
    Then the section page "templates" draws
    And the catalog dialog "template-source" draws
    And the field "source-name" of the catalog dialog "template-source" reads "vagrantcloud_com"
    And the field "source-display-name" of the catalog dialog "template-source" reads "vagrantcloud.com"
    And the field "source-url" of the catalog dialog "template-source" reads "https://vagrantcloud.com"
    When I submit the catalog dialog "template-source"
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "https://vagrantcloud.com" at "/template_sources/sources/vagrantcloud_com/url"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "vagrantcloud.com" at "/template_sources/sources/vagrantcloud_com/display_name"
    And the catalog dialog "template-source" is gone
    And the path is "/hosts/1/provisioning/templates"
    And the host was sent GET to "/api/agents/1/templates/sources" 2 times
