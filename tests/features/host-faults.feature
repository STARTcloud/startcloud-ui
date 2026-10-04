Feature: host-faults

  Scenario: Faults: the row behind fault-management, a host that lists none draws no row, the not-available stub on the route, and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-faults fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/system/faults"
    Then the section page draws the not-available stub
    And the host column draws the "boot-environments" row to "/hosts/1/storage/boot-environments"
    And the host column draws no "faults" row
    And the host column draws no "system" group
    And the host was not sent GET to "/api/agents/1/system/fault-management/faults"

  Scenario: Faults: the summary and the faults over the one table, the details in a list dialog, acquit and mark repaired each behind the typed confirmation with the faults read again
    Given the host answers the hosts fixture
    And the host answers the hosts-faults fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/faults"
    Then the section page "faults" draws
    And the host row "faults" is the active one
    And the section page draws the "fault-summary" panel
    And the "faults" table of the section page lists 3 rows
    And the "faults" table of the section page draws the "severity" column
    And the host was sent GET to "/api/agents/3/system/fault-management/faults" 1 times
    And the host was sent GET to "/api/agents/3/system/fault-management/config" 1 times
    And the row "ZFS-8000-8A" of the "faults" table of the section page offers "acquit"
    And the row "ZFS-8000-8A" of the "faults" table of the section page offers "repaired"
    And the row "ZFS-8000-8A" of the "faults" table of the section page offers "replaced"
    When I press "details" on the row "ZFS-8000-8A" of the "faults" table of the section page
    Then the "fault-details" dialog is open
    And I see "zfs://pool=tank/vdev=c0t5000C500B2C3D4E8d0"
    And I see "Run zpool status -x"
    When I press "Escape"
    And I press "acquit" on the row "ZFS-8000-8A" of the "faults" table of the section page
    Then the "fault-acquit" dialog is open
    When I confirm the open dialog with "acquit"
    Then the host was sent POST to "/api/agents/3/system/fault-management/actions/acquit" carrying "target" as "e7a1c3d4-9b2f-4c1e-8d3a-5f6e7a8b9c0d"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/fault-management/faults" 2 times
    When I press "repaired" on the row "CPU-8000-4E" of the "faults" table of the section page
    Then the "fault-repaired" dialog is open
    When I confirm the open dialog with "repaired"
    Then the host was sent POST to "/api/agents/3/system/fault-management/actions/repaired" carrying "fmri" as "cpu:///cpuid=3"
    And the page raised 2 success notices

  Scenario: Faults: the fault manager's configuration on the second tab, its status and the modules over the one table read with the page
    Given the host answers the hosts fixture
    And the host answers the hosts-faults fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/faults"
    And I pick the tab "config" of the section page
    Then the section page draws the "fault-manager-status" panel
    And the "fault-modules" table of the section page lists 8 rows
    And the "fault-modules" table of the section page draws the "type" column
    And I see "zfs-diagnosis"
    And the section page draws the "fault-manager-help" panel
    And the host was sent GET to "/api/agents/3/system/fault-management/config" 1 times

  Scenario: Faults: Refresh reads the faults and the modules again
    Given the host answers the hosts fixture
    And the host answers the hosts-faults fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/system/faults"
    Then the host was sent GET to "/api/agents/3/system/fault-management/faults" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/fault-management/faults" 2 times
    And the host was sent GET to "/api/agents/3/system/fault-management/config" 2 times
