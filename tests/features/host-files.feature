Feature: host files

  Scenario: Files: the File manager page behind file-browser, the root listing is read once and the action bar names the path
    Given the host answers the hosts fixture
    And the host answers the hosts-files fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    And the browser records its requests
    When I open "/hosts/1/files"
    Then the section page "files" draws
    And the host row "file-manager" is the active one
    And the section page draws the "file-manager" panel
    And the file manager draws the path "/"
    And the section page draws the "file-manager-actions" panel
    And the host was sent GET to "/api/agents/1/filesystem" 1 times
    And the host was asked "/api/agents/1/filesystem" with "path" as "/"
    And the host was asked "/api/agents/1/filesystem" with "show_hidden" as "false"
    And the file manager holds "archive-selection" back
    And the section page offers "archive-directory"

  Scenario: Files: a host whose row lists no file-browser draws no Files group, the not-available stub on the route, and is asked for no listing
    Given the host answers the hosts fixture
    And the host answers the hosts-artifacts fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/files"
    Then the section page draws the not-available stub
    And the host column draws no "files" group
    And the host was not sent GET to "/api/agents/1/filesystem"

  Scenario: Files: a write one request and one notice, Archive directory names every file of the directory and the format and reads the listing again
    Given the host answers the hosts fixture
    And the host answers the hosts-files fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"admin\",\"access_token\":\"t\"}"
    When I open "/hosts/1/files"
    And I press the section page's "archive-directory" action
    Then the "archive-create" dialog is open
    And the open dialog notes "archive-sources"
    And the field "archive-name" reads "archive.tar.gz"
    When I type "" into the field "archive-name"
    And I send the open dialog
    Then the open dialog notes "problem"
    And the host was not sent POST to "/api/agents/1/filesystem/archive/create"
    When I type "backup.tar.gz" into the field "archive-name"
    And I choose "zip" in the field "archive-format"
    Then the field "archive-name" reads "backup.zip"
    When I send the open dialog
    Then the host was sent POST to "/api/agents/1/filesystem/archive/create" carrying "zip" at "/format"
    And the host was sent POST to "/api/agents/1/filesystem/archive/create" carrying "/backup.zip" at "/archive_path"
    And the host was sent POST to "/api/agents/1/filesystem/archive/create" carrying "/README.md" at "/sources/0"
    And the host was sent POST to "/api/agents/1/filesystem/archive/create" 1 times
    And the page raised 1 success notice
    And no dialog is open
    And the host was sent GET to "/api/agents/1/filesystem" 2 times

  Scenario: Files: a person who may not manage the host is told an admin is required and nothing is read
    Given the host answers the hosts fixture
    And the host answers the hosts-files fixture
    And the host answers the hosts-member fixture
    And the browser holds "user" as "{\"id\":1,\"username\":\"mark\",\"role\":\"user\",\"access_token\":\"t\"}"
    When I open "/hosts/1/files"
    Then the section page says an admin is required
    And the host was not sent GET to "/api/agents/1/filesystem"
