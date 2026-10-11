Feature: box facts

  Scenario: Facts: a viewer who manages the box edits a fact, adds a disk row and removes a CD-ROM row in place on the card, the save carrying the facts block alone and the card redrawn from the answer
    Given the host answers the box-facts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/STARTcloud/debian12-server"
    Then I see "4 GB"
    And I see "boot · 32G · sata"
    And I see "install.iso"
    When I click "Edit facts"
    And I fill "CPUs" with "8"
    And I click "Add disk"
    And I fill the last "disk" row's "Name" with "data"
    And I fill the last "disk" row's "Size" with "20G"
    And I click "Remove CD-ROM"
    And I click "Save facts"
    Then the host was sent PUT to "/api/organization/STARTcloud/box/debian12-server" carrying only "metadata"
    And the host was sent PUT to "/api/organization/STARTcloud/box/debian12-server" whose "metadata" carries "cpus" as "8"
    And the host was sent PUT to "/api/organization/STARTcloud/box/debian12-server" whose "metadata" carries "username" as "startcloud"
    And the host was sent PUT to "/api/organization/STARTcloud/box/debian12-server" whose "metadata" lists "disks" as "boot · 32G · sata, data · 20G"
    And the host was sent PUT to "/api/organization/STARTcloud/box/debian12-server" whose "metadata" lacks "cdroms"
    And I see "Facts saved"
    And I see "8 GB"
    And I see "data · 20G"
    And I do not see "install.iso"

  Scenario: Facts: a visitor signed out reads the card with no pencil
    Given the host answers the box-facts fixture
    When I open "/STARTcloud/debian12-server"
    Then I see "4 GB"
    And no facts pencil draws
