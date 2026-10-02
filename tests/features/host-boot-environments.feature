Feature: host-boot-environments

  Scenario: Boot environments: the section behind boot-environments, a host that lists none draws no section and is asked for nothing
    Given the host answers the hosts fixture
    And the host answers the hosts-boot-environments fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/manage"
    Then the manage page draws the "arc-configuration" section
    And the manage page draws no "boot-environments" section
    And the host was not sent GET to "/api/agents/1/system/boot-environments"

  Scenario: Boot environments: the one table with each row's actions by its state, the create behind the dialog with the name required, a queued task and the list read again
    Given the host answers the hosts fixture
    And the host answers the hosts-boot-environments fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the manage page draws the "boot-environments" section
    And the "boot-environments" table of the manage page lists 3 rows
    And the "boot-environments" table of the manage page draws the "status" column
    And the host was sent GET to "/api/agents/3/system/boot-environments" 1 times
    And the row "omnios-r151054" of the "boot-environments" table of the manage page offers "unmount"
    And the row "omnios-r151054" of the "boot-environments" table of the manage page offers no "activate"
    And the row "omnios-r151054" of the "boot-environments" table of the manage page offers no "delete"
    And the row "omnios-r151052" of the "boot-environments" table of the manage page offers "activate"
    And the row "omnios-r151052" of the "boot-environments" table of the manage page offers "mount"
    And the row "omnios-r151052" of the "boot-environments" table of the manage page offers "delete"
    When I press the manage page's "boot-environment-create" action
    Then the "boot-environment-create" dialog is open
    When I press the open dialog's "submit" action
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/3/system/boot-environments"
    When I type "test-2" into the field "be-name"
    And I check the field "be-activate"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/boot-environments" carrying "name" as "test-2"
    And the host was sent POST to "/api/agents/3/system/boot-environments" carrying "activate" as "true"
    And the page raised 1 success notice
    And the host was sent GET to "/api/agents/3/system/boot-environments" 2 times
    And no dialog is open

  Scenario: Boot environments: activate, mount, unmount and delete each behind hyperweaver-ui's confirmation with its options, each one request
    Given the host answers the hosts fixture
    And the host answers the hosts-boot-environments fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    And I press "activate" on the row "omnios-r151052" of the "boot-environments" table of the manage page
    Then the "boot-environment-activate" dialog is open
    And I see "omnios-r151052"
    When I check the field "option-temporary"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/boot-environments/omnios-r151052/activate" carrying "temporary" as "true"
    And no dialog is open
    When I press "mount" on the row "test-be" of the "boot-environments" table of the manage page
    Then the "boot-environment-mount" dialog is open
    When I type "/mnt/test" into the field "mountpoint-input"
    And I choose "rw" in the field "shared-mode-select"
    And I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/boot-environments/test-be/mount" carrying "mountpoint" as "/mnt/test"
    And the host was sent POST to "/api/agents/3/system/boot-environments/test-be/mount" carrying "shared_mode" as "rw"
    When I press "unmount" on the row "omnios-r151054" of the "boot-environments" table of the manage page
    Then the "boot-environment-unmount" dialog is open
    When I press the open dialog's "submit" action
    Then the host was sent POST to "/api/agents/3/system/boot-environments/omnios-r151054/unmount" carrying "force" as "true"
    When I press "delete" on the row "omnios-r151052" of the "boot-environments" table of the manage page
    Then the "boot-environment-delete" dialog is open
    When I press the open dialog's "submit" action
    Then the host was sent DELETE to "/api/agents/3/system/boot-environments/omnios-r151052" 1 times
    And the page raised 4 success notices
    And the host was sent GET to "/api/agents/3/system/boot-environments" 5 times

  Scenario: Boot environments: Refresh reads the list again
    Given the host answers the hosts fixture
    And the host answers the hosts-boot-environments fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/3/manage"
    Then the host was sent GET to "/api/agents/3/system/boot-environments" 1 times
    When I click "Refresh"
    Then the host was sent GET to "/api/agents/3/system/boot-environments" 2 times
