Feature: host-arc

  Scenario: ARC: the section behind zfs, a host that lists none draws no section and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws the "boot-environments" section
    And the manage page draws no "arc-configuration" section
    And the host was not sent GET to "/api/agents/1/system/zfs/arc/config"

  Scenario: ARC: the status and the sliders from the configuration, Validate and Apply each one request, the reboot warning raised beside the success, Reset behind the typed confirmation, the configuration read again after every write
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws the "arc-configuration" section
    And the manage page draws the "arc-status" panel
    And the manage page notes "arc-constraints"
    And I see "auto-calculated"
    And the manage page draws the "arc-memory" panel
    And the manage page draws the "arc-performance" panel
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 1 times
    And the manage page's "arc-validate" action is held
    And the manage page's "arc-apply" action is held
    When I slide the manage field "arc-max-gb" to "8"
    And I press the manage page's "arc-validate" action
    Then the host was sent POST to "/api/agents/3/system/zfs/arc/validate" carrying "arc_max_gb" as "8"
    And the manage page notes "arc-validation"
    And the page raised 1 success notice
    When I choose "runtime" in the manage field "apply-method"
    And I press the manage page's "arc-apply" action
    Then the host was sent PUT to "/api/agents/3/system/zfs/arc/config" carrying "apply_method" as "runtime"
    And the host was sent PUT to "/api/agents/3/system/zfs/arc/config" carrying "prefetch_disable" as "false"
    And the page raised 2 success notices
    And the page raised 1 warning notice
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 2 times
    When I press the manage page's "arc-reset" action
    Then the "arc-reset" dialog is open
    When I confirm the open dialog with "reset"
    Then the host was sent POST to "/api/agents/3/system/zfs/arc/reset" carrying "apply_method" as "persistent"
    And the page raised 3 success notices
    And the host was sent GET to "/api/agents/3/system/zfs/arc/config" 3 times

  Scenario: ARC: Refresh reads the configuration again
    Given the host answers the hosts fixture
    And the host answers the hosts-arc fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the host was sent GET to "/api/agents/3/system/zfs/arc/config" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/zfs/arc/config" 2 times
