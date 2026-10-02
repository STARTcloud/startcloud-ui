Feature: table widths

  Scenario: A checksum column nobody sized caps its cell at 14rem and truncates the hash
    Given the host answers the table-widths fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    When I open "/STARTcloud/hcl-domino/2.0.0/virtualbox"
    Then I see "hcl-domino-2.0.0.tar.gz"
    And the "checksum" cell of the first row is not sized
    And the "checksum" cell of the first row is at most 240 wide
    And the "checksum" cell of the first row truncates its text

  Scenario: A checksum column the person sized fills the width they gave it and shows that much of the hash
    Given the host answers the table-widths fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"access_token\":\"t\"}"
    And the browser holds "table_prefs_STARTcloud_hcl-domino_2.0.0_virtualbox" as "{\"widths\":{\"checksum\":480}}"
    When I open "/STARTcloud/hcl-domino/2.0.0/virtualbox"
    Then I see "hcl-domino-2.0.0.tar.gz"
    And the "checksum" cell of the first row is sized
    And the "checksum" cell of the first row is at least 420 wide
    And the "checksum" cell of the first row shows at least 400 of its text
