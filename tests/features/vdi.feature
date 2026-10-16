Feature: vdi health

  Scenario: Fleet page: the panel carries Export with JSON and CSV, Expand all and Collapse all, Reset sort once a sort was chosen, and the page draws no toolbar of its own
    Given the host answers the vdi fixture
    When I open "/"
    Then I see "ACCT-VDI-01"
    And the fleet page draws no toolbar
    And the fleet count reads "3 VMs"
    When I click "Search"
    And I open the filter panel
    Then the filter panel offers the action "export"
    And the filter panel offers the action "expand"
    And the filter panel offers the action "collapse"
    And the filter panel offers no action "reset-sort"
    When I open the filter panel's action "export"
    Then the filter panel's action "export" offers the choice "json"
    And the filter panel's action "export" offers the choice "csv"
    When I press the filter panel's action "expand"
    Then the fleet table draws 3 open rows
    When I press the filter panel's action "collapse"
    Then the fleet table draws 0 open rows
    When I sort the fleet table by "pool"
    Then the filter panel offers the action "reset-sort"
    When I press the filter panel's action "reset-sort"
    Then the filter panel offers no action "reset-sort"

  Scenario: Fleet page: the Swap column reads the pagefile's use, red under pressure, the sixth card counts the VMs under pressure, and the VM's Overview draws the use, the peak and the pages-in rate
    Given the host answers the vdi fixture
    When I open "/"
    Then the swap cell of "ACCT-VDI-01" reads "20%" as "ok"
    And the swap cell of "ENG-VDI-01" reads "95%" as "swap_pressure"
    And the fleet card "Swap pressure" reads "0/2"
    When I open "/vm/i-0a1b2c3d"
    Then I see "812 / 4096 MB (20%)"
    And I see "1536 MB"

  Scenario: Fleet page: the cards keep their press on the filters while the toolbar is gone
    Given the host answers the vdi fixture
    When I open "/"
    And I press the status card "no_user"
    Then the fleet count reads "1 / 3 VM"
    When I press the status card "no_user"
    And I press the pool card "Engineering"
    Then the fleet count reads "1 / 3 VM"

  Scenario: Crumbs: the fleet home reads Fleet alone, a pool narrowed by the route reads Fleet then the pool, and a VM reads Fleet, its pool linking to the fleet narrowed to it, then the hostname
    Given the host answers the vdi fixture
    When I open "/"
    Then the crumbs read "Fleet"
    When I open "/?pool=Accounting"
    Then the crumbs read "Fleet › Accounting"
    And the fleet count reads "2 / 3 VMs"
    When I open "/vm/i-0a1b2c3d"
    Then the crumbs read "Fleet › Accounting › ACCT-VDI-01"
    And the crumb "Accounting" links to "/?pool=Accounting"
    When I follow the crumb "Accounting"
    Then the path is "/?pool=Accounting"

  Scenario: Footer heart: the popover draws the stream's state, reconnecting once the fixture's frames end, and its last event on a host that streams, and the fleet page draws no live line of its own
    Given the host answers the vdi fixture
    And the stream answers the fleet frames
    When I open "/"
    Then I see "ACCT-VDI-01"
    And the fleet page draws no stream line
    When I hover the footer heart
    Then the heart's popover stream reads "reconnecting"
    And the heart's popover names the last event
