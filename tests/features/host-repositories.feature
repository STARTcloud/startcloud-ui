Feature: host-repositories

  Scenario: Repositories: the row behind packages with repositories, a host that lists repositories alone draws no row, the not-available stub on the route, and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-repositories fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/updates/repositories"
    Then the section page draws the not-available stub
    And the host column draws the "boot-environments" row to "/hosts/1/storage/boot-environments"
    And the host column draws no "repositories" row
    And the host column draws no "updates" group
    And the host was not sent GET to "/api/agents/1/system/repositories"

  Scenario: Repositories: the publishers over the one table, Enable and Disable each one request with the list read again
    Given the host answers the hosts fixture
    And the host answers the hosts-repositories fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/repositories"
    Then the section page "repositories" draws
    And the host row "repositories" is the active one
    And the "repositories" table of the section page lists 4 rows
    And the "repositories" table of the section page draws the "type" column
    And the host was sent GET to "/api/agents/3/system/repositories" 1 times
    And the row "ooce" of the "repositories" table of the section page offers "enable"
    And the row "ooce" of the "repositories" table of the section page offers no "disable"
    And the row "extra.omnios" of the "repositories" table of the section page offers "disable"
    When I press "enable" on the row "ooce" of the "repositories" table of the section page
    Then the host was sent POST to "/api/agents/3/system/repositories/ooce/enable" 1 times
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/repositories" 2 times
    When I press "disable" on the row "extra.omnios" of the "repositories" table of the section page
    Then the host was sent POST to "/api/agents/3/system/repositories/extra.omnios/disable" 1 times
    And the page raised 2 success notices

  Scenario: Repositories: the add behind the dialog with the name and the origin required, the edit and the delete behind the typed confirmation, each a queued task
    Given the host answers the hosts fixture
    And the host answers the hosts-repositories fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the window is 1600 wide
    When I open "/hosts/3/updates/repositories"
    And I press the section page's "repository-add" action
    Then the "repository-add" dialog is open
    When I press the open dialog's "submit" action
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/3/system/repositories"
    When I type "test" into the field "repo-publisher-name"
    And I type "https://pkg.example.com/test/" into the field "repo-origin-url"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/repositories" carrying "name" as "test"
    And the host was sent POST to "/api/agents/3/system/repositories" carrying "origin" as "https://pkg.example.com/test/"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/repositories" 2 times
    And no dialog is open
    When I press "edit" on the row "extra.omnios" of the "repositories" table of the section page
    Then the "repository-edit" dialog is open
    And I see "https://pkg.omnios.org/r151054/extra/"
    When I press the open dialog's "submit" action
    Then the host was sent PUT to "/api/agents/3/system/repositories/extra.omnios" carrying "refresh" as "false"
    And no dialog is open
    When I press "delete" on the row "ooce" of the "repositories" table of the section page
    Then the "repository-delete" dialog is open
    When I confirm the open dialog
    Then the host was sent DELETE to "/api/agents/3/system/repositories/ooce" 1 times
    And the page raised 3 success notices
    And the host was sent GET to "/api/agents/3/system/repositories" 4 times

  Scenario: Repositories: Refresh reads the list again
    Given the host answers the hosts fixture
    And the host answers the hosts-repositories fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/updates/repositories"
    Then the host was sent GET to "/api/agents/3/system/repositories" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/repositories" 2 times
