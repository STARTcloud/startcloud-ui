Feature: host templates

  Scenario: Templates: the section behind `templates`, the registries card and the one table from the one read each
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws the "templates" section
    And the catalog card "template-sources" lists 2 registries
    And the manage page notes "source-default"
    And the "templates" table of the manage page lists 3 rows
    And the "templates" table of the manage page draws the "downloaded_at" column
    And the row "windows-server-2025" of the "templates" table of the manage page offers "delete"
    And the host was sent GET to "/api/agents/1/templates" 1 times
    And the host was sent GET to "/api/agents/1/templates/sources" 1 times

  Scenario: Templates: the page's one search narrows the table and the provider pill narrows it again
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the "templates" table of the manage page lists 3 rows
    When I press "Control+f"
    And I search the manage page for "debian"
    Then the "templates" table of the manage page lists 2 rows
    When I search the manage page for ""
    And I open the filter panel
    And I toggle the filter pill "utm"
    Then the "templates" table of the manage page lists 1 rows

  Scenario: Templates: the pull dialog opens on the default registry, reads its catalog, and a picked box fills the fields the pull sends
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press the manage page's "template-pull" action
    Then the catalog dialog "template-pull" draws
    And the host was sent GET to "/api/agents/1/templates/remote/boxvault"
    When I submit the catalog dialog "template-pull"
    Then the catalog dialog "template-pull" says why it cannot be sent
    When I pick "startcloud/ubuntu2404" in the catalog dialog select "template-pull-catalog"
    And I pick "arm64" in the catalog dialog select "template-pull-arch"
    And I submit the catalog dialog "template-pull"
    Then the host was sent POST to "/api/agents/1/templates/pull" carrying "box_name" as "ubuntu2404"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "version" as "24.04.2"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "architecture" as "arm64"
    And the host was sent POST to "/api/agents/1/templates/pull" carrying "source_name" as "boxvault"
    And the catalog dialog "template-pull" is gone

  Scenario: Templates: Export machine holds a running machine and sends the stopped one with its file name as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press the manage page's "template-export" action
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
    When I open "/hosts/1/manage"
    And I press the manage page's "template-publish" action
    And I pick "dev-2" in the catalog dialog select "template-publish-machine"
    And I type "startcloud" into the field "template-publish-org"
    And I type "dev-golden" into the field "template-publish-box"
    And I type "1.0.0" into the field "template-publish-version"
    And I submit the catalog dialog "template-publish"
    Then the host was sent POST to "/api/agents/1/templates/publish" carrying "source_name" as "boxvault"
    And the host was sent POST to "/api/agents/1/templates/publish" carrying "box_name" as "dev-golden"
    And the host was sent POST to "/api/agents/1/templates/publish" carrying "machine_name" as "dev-2"

  Scenario: Templates: Move sends the new storage root and Delete behind the typed confirmation sends the delete, each a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press "move" on the row "13.1.0" of the "templates" table of the manage page
    And I type "/tank/templates" into the field "template-move-path"
    And I submit the catalog dialog "template-move"
    Then the host was sent POST to "/api/agents/1/templates/tpl-1/move" carrying "target_path" as "/tank/templates"
    When I press "delete" on the row "13.0.0" of the "templates" table of the manage page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/1/templates/tpl-2"

  Scenario: Templates: a registry is added as one merge patch of the storage file under its id, the default moved off the entry that held it and the rest untouched
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    And I press the manage page's "source-add" action
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

  Scenario: Templates: a registry's toggle and its removal behind the typed confirmation each one merge patch of the storage file, the removal null under its id
    Given the host answers the hosts fixture
    And the host answers the hosts-templates fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
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
