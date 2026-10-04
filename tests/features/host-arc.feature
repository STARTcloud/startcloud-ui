Feature: host-arc

  Scenario: ARC: the row behind zfs, a host that lists none draws no row, the not-available stub on the route, and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/storage/arc"
    Then the section page draws the not-available stub
    And the host column draws the "boot-environments" row to "/hosts/1/storage/boot-environments"
    And the host column draws no "arc" row
    And the host was not sent GET to "/api/agents/1/system/zfs/arc/config"

  Scenario: ARC: the status and the sliders from the configuration under the statistics, Validate and Apply each one request, the reboot warning raised beside the success, Reset behind the typed confirmation, the configuration read again after every write
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage/arc"
    Then the section page "arc" draws
    And the host row "arc" is the active one
    And the section page draws the "arc-status" panel
    And the section page notes "arc-constraints"
    And I see "auto-calculated"
    And the section page draws the "arc-memory" panel
    And the section page draws the "arc-performance" panel
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 1 times
    And the section page's "arc-validate" action is held
    And the section page's "arc-apply" action is held
    When I slide the section field "arc-max-gb" to "8"
    And I press the section page's "arc-validate" action
    Then the host was sent POST to "/api/agents/3/system/zfs/arc/validate" carrying "arc_max_gb" as "8"
    And the section page notes "arc-validation"
    And the page raised 1 success notice
    When I choose "runtime" in the section field "apply-method"
    And I press the section page's "arc-apply" action
    Then the host was sent PUT to "/api/agents/3/system/zfs/arc/config" carrying "apply_method" as "runtime"
    And the host was sent PUT to "/api/agents/3/system/zfs/arc/config" carrying "prefetch_disable" as "false"
    And the page raised 2 success notices
    And the page raised 1 warning notice
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 2 times
    When I press the section page's "arc-reset" action
    Then the "arc-reset" dialog is open
    When I confirm the open dialog with "reset"
    Then the host was sent POST to "/api/agents/3/system/zfs/arc/reset" carrying "apply_method" as "persistent"
    And the page raised 3 success notices
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 3 times

  Scenario: ARC: the configuration is for an admin alone and Refresh reads it again
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/storage/arc"
    Then the host was sent GET to "/api/agents/3/system/zfs/arc/config" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/zfs/arc/config" 2 times
