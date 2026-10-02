Feature: host recipes and provisioning network

  Scenario: Recipes: the section on a bhyve host that lists `provisioning` alone, the one table from the one read with the default badge
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws the "recipes" section
    And the "recipes" table of the manage page lists 3 rows
    And the "recipes" table of the manage page draws the "steps" column
    And the manage page notes "recipe-default"
    And the row "debian-console-setup" of the "recipes" table of the manage page offers no "default"
    And the row "windows-first-boot" of the "recipes" table of the manage page offers "default"
    And the host was sent GET to "/api/agents/3/provisioning/recipes" 1 times

  Scenario: Recipes: a VirtualBox host that lists `provisioning` draws no recipes section
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws its frame
    And the manage page draws no "recipes" section
    And the host was not sent GET to "/api/agents/1/provisioning/recipes"

  Scenario: Recipes: the family pill reads again with `os_family`
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/manage"
    Then the "recipes" table of the manage page lists 3 rows
    When I press "Control+f"
    And I open the filter panel
    And I toggle the request pill "windows"
    Then the host was asked "/api/agents/3/provisioning/recipes" with "os_family" as "windows"

  Scenario: Recipes: the new recipe dialog refuses a recipe without a step and sends the steps and the variables it was given
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press the manage page's "recipe-new" action
    Then the catalog dialog "recipe-edit" draws
    When I type "alpine-setup" into the field "recipe-name"
    And I submit the catalog dialog "recipe-edit"
    Then the catalog dialog "recipe-edit" says why it cannot be sent
    When I press the open dialog's "recipe-add-step" action
    And I type "echo hello" into the catalog step 1 field "Command to run"
    And I pick "solaris" in the catalog dialog select "recipe-os-family"
    And I type "120" into the field "recipe-timeout"
    And I submit the catalog dialog "recipe-edit"
    Then the host was sent POST to "/api/agents/3/provisioning/recipes" carrying "name" as "alpine-setup"
    And the host was sent POST to "/api/agents/3/provisioning/recipes" carrying "os_family" as "solaris"
    And the host was sent POST to "/api/agents/3/provisioning/recipes" carrying "timeout_seconds" as "120"
    And the catalog dialog "recipe-edit" is gone
    And the host was sent GET to "/api/agents/3/provisioning/recipes" 2 times

  Scenario: Recipes: the edit dialog opens on the recipe's own steps and sends them back in order
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "edit" on the row "debian-console-setup" of the "recipes" table of the manage page
    Then the catalog dialog "recipe-edit" draws 5 steps
    When I submit the catalog dialog "recipe-edit"
    Then the host was sent PUT to "/api/agents/3/provisioning/recipes/r-1" carrying "name" as "debian-console-setup"
    And the host was sent PUT to "/api/agents/3/provisioning/recipes/r-1" carrying "is_default" as "true"

  Scenario: Recipes: Make default sends `is_default` alone and Delete behind the typed confirmation sends the delete
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "default" on the row "windows-first-boot" of the "recipes" table of the manage page
    Then the host was sent PUT to "/api/agents/3/provisioning/recipes/r-2" carrying "is_default" as "true"
    When I press "delete" on the row "windows-first-boot" of the "recipes" table of the manage page
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/recipes/r-2"

  Scenario: Recipes: the test dialog runs a dry run against a machine of the host and draws the resolved steps and the unresolved variables
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "test" on the row "debian-console-setup" of the "recipes" table of the manage page
    Then the catalog dialog "recipe-test" draws
    When I submit the catalog dialog "recipe-test"
    Then the catalog dialog "recipe-test" says why it cannot be sent
    When I pick "db-1" in the catalog dialog select "recipe-test-machine"
    And I submit the catalog dialog "recipe-test"
    Then the host was sent POST to "/api/agents/3/provisioning/recipes/r-1/test" carrying "machine_name" as "db-1"
    And the host was sent POST to "/api/agents/3/provisioning/recipes/r-1/test" carrying "dry_run" as "true"
    And the open dialog draws the panel "recipe-dry-run"
    And I see "domain"

  Scenario: Provisioning network: the panel behind `provisioning`, the status with its components and configuration over the one table, Set up and Tear down queued tasks
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws the "provisioning-network" section
    And the manage page notes "network-not-ready"
    And the "network-components" table of the manage page lists 3 rows
    And the "network-config" table of the manage page lists 4 rows
    When I press the manage page's "network-setup" action
    Then the host was sent POST to "/api/agents/3/provisioning/network/setup"
    When I press the manage page's "network-teardown" action
    And I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/provisioning/network/teardown"

  Scenario: Provisioning network: Edit settings, hyperweaver-ui's door, opens the config engine's page of the agent's machines file on an agent role
    Given the host answers the zones fixture
    And the host answers the zones-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/self/manage"
    Then the manage page draws the "provisioning-network" section
    And the manage page notes "network-not-ready"
    And the host was sent GET to "/api/provisioning/network/status"
    And the manage page offers "network-settings"
    When I press the manage page's "network-settings" action
    Then the path is "/admin/config/machines"

  Scenario: Provisioning network: Edit settings does not draw on the server role, whose config engine over a proxied agent is not there
    Given the host answers the hosts fixture
    And the host answers the hosts-recipes fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws the "provisioning-network" section
    And the manage page notes "network-not-ready"
    And the manage page offers no "network-settings"
