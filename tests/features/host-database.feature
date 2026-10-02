Feature: host-database

  Scenario: Database: the section on every host, its totals and the databases over the one table
    Given the host answers the hosts fixture
    And the host answers the hosts-database fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws the "database" section
    And the "databases" table of the manage page lists 1 rows
    And the manage page notes "database-totals"
    And the host was sent GET to "/api/agents/1/database/stats" 1 times

  Scenario: Database: Vacuum, Analyze and Cleanup each one request and one notice, the vacuum naming the space reclaimed, the statistics read again
    Given the host answers the hosts fixture
    And the host answers the hosts-database fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the "databases" table of the manage page lists 2 rows
    And the "databases" table of the manage page draws the "size" column
    And I see "62.0 MB"
    And the host was sent GET to "/api/agents/3/database/stats" 1 times
    When I press the manage page's "database-vacuum" action
    Then the host was sent POST to "/api/agents/3/database/vacuum" 1 times
    And the page raised 1 success notice
    And the page raised 1 info notice
    And the host was sent GET to "/api/agents/3/database/stats" 2 times
    When I press the manage page's "database-analyze" action
    Then the host was sent POST to "/api/agents/3/database/analyze" 1 times
    When I press the manage page's "database-cleanup" action
    Then the host was sent POST to "/api/agents/3/database/cleanup" 1 times
    And the page raised 3 success notices
    And the host was sent GET to "/api/agents/3/database/stats" 4 times

  Scenario: Database: a row's Explore opens its tables under the table read once, Browse opens the row browser paged by fifty with the order the agent validates
    Given the host answers the hosts fixture
    And the host answers the hosts-database fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "database-explore" on the row "monitoring" of the "databases" table of the manage page
    Then the manage page draws the "database-tables" panel
    And the host was sent GET to "/api/agents/3/database/monitoring/tables" 1 times
    And the "database-tables" table of the manage page lists 5 rows
    When I press "database-browse" on the row "cpu_stats" of the "database-tables" table of the manage page
    Then the "database-rows" dialog is open
    And the host was sent GET to "/api/agents/3/database/monitoring/tables/cpu_stats/rows" 1 times
    And the open dialog lists 50 rows
    And I see "1–50 of 120"
    When I press the open dialog's "database-next" action
    Then the host was sent GET to "/api/agents/3/database/monitoring/tables/cpu_stats/rows" 2 times
    When I choose "value" in the field "db-browse-orderby"
    Then the host was sent GET to "/api/agents/3/database/monitoring/tables/cpu_stats/rows" 3 times
    When I press the open dialog's "database-order" action
    Then the host was sent GET to "/api/agents/3/database/monitoring/tables/cpu_stats/rows" 4 times
    When I press "Escape"
    Then no dialog is open
    When I press "database-explore" on the row "monitoring" of the "databases" table of the manage page
    Then the manage page draws no "database-tables" panel
