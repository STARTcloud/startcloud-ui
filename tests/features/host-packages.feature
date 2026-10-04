Feature: host packages

  Scenario: Packages: the page behind `packages`, the one table from the one read with the status badges
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/packages"
    Then the section page "packages" draws
    And the host row "packages" is the active one
    And the "packages" table of the section page lists 4 rows
    And the "packages" table of the section page draws the "publisher" column
    And the "packages" table of the section page draws the "status" column
    And the row "pkg:/network/ssh" of the "packages" table of the section page offers "uninstall"
    And the row "pkg:/ooce/runtime/node-22" of the "packages" table of the section page offers no "uninstall"
    And the row "pkg:/extra.omnios/database/postgresql-16" of the "packages" table of the section page offers "install"
    And the host was sent GET to "/api/agents/3/system/packages" 1 times

  Scenario: Packages: the page's one search narrows the table, the publisher pill narrows it again and the show-all pill reads again with `all`
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/updates/packages"
    Then the "packages" table of the section page lists 4 rows
    When I press "Control+k"
    And I search the section page for "ooce"
    Then the "packages" table of the section page lists 1 rows
    When I search the section page for ""
    And I open the filter panel
    And I toggle the filter pill "omnios"
    Then the "packages" table of the section page lists 2 rows
    When I toggle the filter pill "omnios"
    And I toggle the request pill "All Packages"
    Then the host was asked "/api/agents/3/system/packages" with "all" as "true"

  Scenario: Packages: the remote search reads the repository and draws its hits as available packages
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/updates/packages"
    And I type "editor" into the section field "package-search-query"
    And I press the section page's "package-search" action
    Then the host was asked "/api/agents/3/system/packages/search" with "query" as "editor"
    And the section page notes "package-search"
    And the "packages" table of the section page lists 2 rows
    And the row "ooce/text/vim" of the "packages" table of the section page offers "install"
    When I press the section page's "package-search-clear" action
    Then the "packages" table of the section page lists 4 rows

  Scenario: Packages: View details reads the package's info and opens the detail dialog
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/3/updates/packages"
    And I press "details" on the row "pkg:/network/ssh" of the "packages" table of the section page
    Then the catalog dialog "package-details" draws
    And I see "OpenSSH client and server"
    And the host was asked "/api/agents/3/system/packages/info" with "package" as "pkg:/network/ssh"
    And the host was asked "/api/agents/3/system/packages/info" with "remote" as "false"

  Scenario: Packages: Install opens the dialog and sends the package with its options as a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/packages"
    And I press "install" on the row "pkg:/extra.omnios/database/postgresql-16" of the "packages" table of the section page
    Then the catalog dialog "package-install" draws
    When I check the field "package-accept-licenses"
    And I type "be-pg16" into the field "package-be-name"
    And I submit the catalog dialog "package-install"
    Then the host was sent POST to "/api/agents/3/system/packages/install" carrying "accept_licenses" as "true"
    And the host was sent POST to "/api/agents/3/system/packages/install" carrying "be_name" as "be-pg16"
    And the host was sent POST to "/api/agents/3/system/packages/install" carrying "packages" as "pkg:/extra.omnios/database/postgresql-16"
    And the catalog dialog "package-install" is gone
    And the host was sent GET to "/api/agents/3/system/packages" 2 times

  Scenario: Packages: Uninstall offers no license switch and sends the dry run
    Given the host answers the hosts fixture
    And the host answers the hosts-packages fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/packages"
    And I press "uninstall" on the row "pkg:/network/ssh" of the "packages" table of the section page
    Then the catalog dialog "package-uninstall" draws
    And the open dialog draws no field "package-accept-licenses"
    When I check the field "package-dry-run"
    And I submit the catalog dialog "package-uninstall"
    Then the host was sent POST to "/api/agents/3/system/packages/uninstall" carrying "dry_run" as "true"
