Feature: host templates

  Scenario: Templates: the page behind `templates`, every enabled registry's boxes as cards from the one read each, the installed ones alone when the page opens, and Registries opening the one modal of the box registries
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    Then the section page "templates" draws
    And the host row "templates" is the active one
    And the "box-registry" listing of the section page draws 1 cards
    And the "box-registry" listing of the section page draws the card "debian13" plain
    And the section page notes "held-current"
    And the host was sent GET to "/api/agents/1/templates" 1 times
    And the host was sent GET to "/api/agents/1/templates/sources" 1 times
    And the host was sent GET to "/api/agents/1/templates/remote/boxvault" 1 times
    And the host was sent GET to "/api/agents/1/templates/remote/mirror" 1 times
    When I press the section page's "template-sources" action
    Then the catalog dialog "template-sources" draws
    And the open dialog lists 2 rows
    And the catalog source "boxvault" offers no "source-default"
    And the catalog source "mirror" offers "source-default"

  Scenario: Templates: Add flips the panel to the boxes the host lacks, Install on one sends the newest version and its first architecture on the box's registry, the Installed pill off greys the missing boxes, and the table is the toggle
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    Then the "box-registry" listing of the section page draws 1 cards
    When I press the section page's "catalog-add" action
    Then the section page heading reads "Add"
    And the "box-registry" listing of the section page draws 1 cards
    And the "box-registry" listing of the section page draws the card "ubuntu2404" plain
    When I press "catalog-install" on the card "ubuntu2404" of the "box-registry" listing
    Then the host was sent POST to "/api/agents/1/templates/pull" carrying "box_name" as "ubuntu2404"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "organization" as "startcloud"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "version" as "24.04.2"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "architecture" as "amd64"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "source_name" as "boxvault"
    And the page raised 1 success notice
    When I press the section page's "catalog-add" action
    Then the "box-registry" listing of the section page draws the card "debian13" plain
    When I switch the "box-registry" listing of the section page to "table"
    Then the "box-registry" listing of the section page draws the table
    And the "box-registry" table of the section page draws the "deploy" column
    And the "box-registry" table of the section page draws the "status" column
    When I switch the "box-registry" listing of the section page to "cards"
    And I press "/"
    And I open the filter panel
    And I toggle the filter pill "Installed"
    Then the "box-registry" listing of the section page draws 2 cards
    And the "box-registry" listing of the section page greys the card "ubuntu2404"

  Scenario: Templates: the chevron of a held box opens Move and Delete for each held version, Move sending the new root as a queued task and Delete waiting behind the typed confirmation
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I open the menu of the card "debian13" of the "box-registry" listing
    Then the open menu offers "template-move"
    And the open menu offers "template-delete"
    And the open menu offers no "held-update"
    When I press the menu entry "template-move"
    Then the catalog dialog "template-move" draws
    When I type "/rpool/templates" into the field "template-move-path"
    And I submit the catalog dialog "template-move"
    Then the host was sent POST to "/api/agents/1/templates/tpl-1/move" carrying "target_path" as "/rpool/templates"
    And the catalog dialog "template-move" is gone
    When I open the menu of the card "debian13" of the "box-registry" listing
    And I press the menu entry "template-delete"
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/templates/tpl-1"
    And the host was sent GET to "/api/agents/1/templates" 3 times

  Scenario: Templates: Import opens the pull by name over the default registry's catalog and queues the download
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-import" action
    Then the catalog dialog "template-pull" draws
    When I pick "startcloud/ubuntu2404" in the catalog dialog select "template-pull-catalog"
    And I submit the catalog dialog "template-pull"
    Then the host was sent POST to "/api/agents/1/templates/pull" carrying "box_name" as "ubuntu2404"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "version" as "24.04.2"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "source_name" as "boxvault"
    And the catalog dialog "template-pull" is gone

  Scenario: Templates: Export machine holds a running machine and sends the stopped one with its file name as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-export" action
    Then the catalog dialog "template-export" draws
    And the catalog dialog option "dev-1" of "template-export-machine" is held
    When I pick "dev-2" in the catalog dialog select "template-export-machine"
    And I type "dev-2-golden.box" into the field "template-export-filename"
    And I submit the catalog dialog "template-export"
    Then the host was sent POST to "/api/agents/1/templates/export" carrying "machine_name" as "dev-2"
    And the host was sent POST to "/api/agents/1/templates/export" carrying "filename" as "dev-2-golden.box"

  Scenario: Templates: Publish sends the machine, the registry, the organization, the box and the version
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-publish" action
    And I pick "dev-2" in the catalog dialog select "template-publish-machine"
    And I type "startcloud" into the field "template-publish-org"
    And I type "dev-golden" into the field "template-publish-box"
    And I type "1.0.0" into the field "template-publish-version"
    And I submit the catalog dialog "template-publish"
    Then the host was sent POST to "/api/agents/1/templates/publish" carrying "source_name" as "boxvault"
    And the host was sent POST to "/api/agents/1/templates/publish" carrying "box_name" as "dev-golden"
    And the host was sent POST to "/api/agents/1/templates/publish" carrying "machine_name" as "dev-2"

  Scenario: Templates: a registry is added from the form under the modal's table as one merge patch of the storage file under its id, the default moved off the entry that held it and the rest untouched
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-sources" action
    And I press the open dialog's "source-add" action
    And I submit the catalog dialog "template-source"
    Then the catalog dialog "template-source" says why it cannot be sent
    When I type "vagrant-cloud" into the field "source-name"
    And I type "https://vagrantcloud.com" into the field "source-url"
    And I type "Vagrant Cloud" into the field "source-display-name"
    And I submit the catalog dialog "template-source"
    Then the catalog dialog "template-source" says why it cannot be sent
    And the host was not sent PUT to "/api/agents/1/config/storage"
    When I type "vagrant_cloud" into the field "source-name"
    And I check the field "source-default"
    And I submit the catalog dialog "template-source"
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "https://vagrantcloud.com" at "/template_sources/sources/vagrant_cloud/url"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "Vagrant Cloud" at "/template_sources/sources/vagrant_cloud/display_name"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "true" at "/template_sources/sources/vagrant_cloud/default"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "false" at "/template_sources/sources/boxvault/default"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/mirror"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/vagrant_cloud/auth_token"
    And the host was not sent GET to "/api/agents/1/config/storage"
    And the host was sent GET to "/api/agents/1/templates/sources" 2 times
    And the catalog dialog "template-source" is gone
    And the catalog dialog "template-sources" draws

  Scenario: Templates: a registry's edit opens the form under the table on its id and its display name, sends the entry under the id, and a refused save draws the pointer on its field
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-sources" action
    Then I see "BoxVault"
    When I press the action "source-edit" of the catalog source "boxvault"
    Then the field "source-name" of the catalog dialog "template-source" reads "boxvault"
    And the field "source-display-name" of the catalog dialog "template-source" reads "BoxVault"
    When the host refuses the next PUT to "/api/agents/1/config/storage"
    And I submit the catalog dialog "template-source"
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "BoxVault" at "/template_sources/sources/boxvault/display_name"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "https://boxvault.example.com" at "/template_sources/sources/boxvault/url"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "true" at "/template_sources/sources/boxvault/default"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/BoxVault"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/boxvault/name"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/boxvault/auth_token"
    And the catalog dialog "template-source" marks the field "source-url" invalid

  Scenario: Templates: a registry's toggle and its removal behind the typed confirmation each one merge patch of the storage file, the removal null under its id
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/provisioning/templates"
    And I press the section page's "template-sources" action
    And I press the action "source-toggle" of the catalog source "mirror"
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "false" at "/template_sources/sources/mirror/enabled"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying nothing at "/template_sources/sources/boxvault"
    When I press the action "source-default" of the catalog source "mirror"
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying "true" at "/template_sources/sources/mirror/default"
    And the host was sent PUT to "/api/agents/1/config/storage" carrying "false" at "/template_sources/sources/boxvault/default"
    When I press the action "source-remove" of the catalog source "mirror"
    And I confirm the open dialog
    Then the host was sent PUT to "/api/agents/1/config/storage" carrying null at "/template_sources/sources/mirror"
    And the host was sent PUT to "/api/agents/1/config/storage" 3 times
    And the host was sent GET to "/api/agents/1/templates/sources" 4 times
